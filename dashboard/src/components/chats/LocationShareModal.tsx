import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import 'leaflet/dist/leaflet.css';
import './LocationShareModal.css';

export interface LocationData {
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

interface LocationShareModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: LocationData) => Promise<void> | void;
  sending?: boolean;
}

const DEFAULT_LAT = -6.936178;
const DEFAULT_LNG = 110.123306;

const Icons = {
  Back: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="#1e293b" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, display: 'block' }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Refresh: ({ spinning }: { spinning?: boolean }) => (
    <svg className={spinning ? 'wa-icon-spin' : ''} viewBox="0 0 24 24" width="20" height="20" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  ),
  Expand: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Collapse: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  GpsTarget: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="#16a34a" strokeWidth="2.4" fill="#16a34a" fillOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, display: 'block' }}>
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="#16a34a" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  ),
  RedPin: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#ef4444" style={{ width: 22, height: 22, display: 'block' }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  ),
  Spinner: () => (
    <svg className="wa-icon-spin" viewBox="0 0 24 24" width="18" height="18" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, display: 'block' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

export function LocationShareModal({ open, onClose, onSend, sending = false }: LocationShareModalProps) {
  const { t } = useTranslation();

  // Custom Pinpoint Coordinates (Center of the Map / Clicked point)
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  // User's actual GPS location
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Address details of the custom pin
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');

  // Map state
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to ensure Leaflet map dragging does not hijack the floating button
  const attachButtonEvents = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const stopMapDrag = (e: Event) => e.stopPropagation();
    el.addEventListener('mousedown', stopMapDrag);
    el.addEventListener('pointerdown', stopMapDrag);
    el.addEventListener('touchstart', stopMapDrag, { passive: true });
  }, []);

  // Fetch real GPS
  const fetchGpsLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setPinCoords({ lat: latitude, lng: longitude });
        setIsLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 0.8 });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(result => {
          if (result.state === 'granted') {
            fetchGpsLocation();
          }
        })
        .catch(() => {
          // Ignore query failure
        });
    }
  }, [open, fetchGpsLocation]);

  // Initialize Leaflet map with Bright, Crisp Google Maps Roadmap Tiles
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    let destroyed = false;

    import('leaflet').then(L => {
      if (destroyed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = gpsCoords ? gpsCoords.lat : pinCoords.lat;
      const initialLng = gpsCoords ? gpsCoords.lng : pinCoords.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Bright Google Maps Roadmap layer: Crisp white roads, clean green/blue, native POIs (Indomaret, SPBU, RS)
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=id', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Allow dragging map to update custom pin
      map.on('movestart', () => {
        setIsDragging(true);
      });

      map.on('moveend', () => {
        setIsDragging(false);
        const center = map.getCenter();
        setPinCoords({ lat: center.lat, lng: center.lng });
      });

      // Allow clicking directly anywhere on the map to set custom pin
      map.on('click', (event: unknown) => {
        const e = event as { latlng?: L.LatLng };
        if (e && e.latlng) {
          map.panTo(e.latlng, { animate: true, duration: 0.4 });
          setPinCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      setTimeout(() => {
        if (!destroyed && map) map.invalidateSize();
      }, 300);
    });

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle resize / maximize size update
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
      const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isFullScreen]);

  // Reverse geocode custom pin address (debounced)
  useEffect(() => {
    if (!open) return;

    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);

    addressTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pinCoords.lat}&lon=${pinCoords.lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'id,en' } },
        );
        if (res.ok) {
          const data = (await res.json()) as { display_name?: string; address?: Record<string, string> };
          if (data.display_name) {
            setCurrentAddress(data.display_name);
            const a = data.address || {};
            const title =
              a.amenity ||
              a.shop ||
              a.building ||
              a.road ||
              a.hamlet ||
              a.village ||
              a.suburb ||
              a.city ||
              'Lokasi Terpilih';
            setCurrentTitle(title);
          }
        }
      } catch {
        /* ignore */
      }
    }, 350);

    return () => {
      if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
    };
  }, [pinCoords.lat, pinCoords.lng, open]);

  const handleRecenterGps = useCallback(() => {
    if (gpsCoords && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.flyTo([gpsCoords.lat, gpsCoords.lng], 16, { animate: true, duration: 0.6 });
      setPinCoords({ lat: gpsCoords.lat, lng: gpsCoords.lng });
    } else {
      fetchGpsLocation();
    }
  }, [gpsCoords, fetchGpsLocation]);

  // Send Location (Pinpoint center of map)
  const handleSendLocation = () => {
    if (sending) return;
    onSend({
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      description: currentTitle || 'Lokasi Terpilih',
      address: currentAddress || `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideCloseButton
      title={null}
      className={`wa-location-modal ${isFullScreen ? 'is-fullscreen' : ''}`}
    >
      <div className="wa-loc-root">
        {/* TOP HEADER: WhatsApp Native Header */}
        <header className="wa-loc-top-header">
          <button
            type="button"
            onClick={onClose}
            className="wa-loc-btn-round"
            aria-label={t('common.back', 'Kembali')}
            title="Kembali"
          >
            <Icons.Back />
          </button>

          <div className="wa-loc-header-title">
            {t('chats.media.sendLocation', 'Kirim lokasi')}
          </div>

          <div className="wa-loc-header-action-group">
            {/* Header Minimize / Maximize Button */}
            <button
              type="button"
              onClick={() => setIsFullScreen(prev => !prev)}
              className="wa-loc-btn-round wa-loc-btn-header-expand"
              title={isFullScreen ? 'Perkecil' : 'Satu Layar Penuh'}
            >
              {isFullScreen ? <Icons.Collapse /> : <Icons.Expand />}
            </button>

            <button
              type="button"
              onClick={fetchGpsLocation}
              className="wa-loc-btn-round"
              title="Refresh GPS"
              disabled={isLocating}
            >
              <Icons.Refresh spinning={isLocating} />
            </button>
          </div>
        </header>

        {/* MAP CANVAS (Center interactive pin point) */}
        <div className="wa-loc-map-wrapper">
          <div ref={mapContainerRef} className="wa-loc-map-canvas" />

          {/* Center Pin Marker with Spring Animation on Drag */}
          <div className={`wa-loc-center-pin ${isDragging ? 'is-dragging' : ''}`}>
            <svg
              className="wa-pin-svg"
              viewBox="0 0 24 24"
              width="38"
              height="38"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
                fill="#ea4335"
                stroke="#b31412"
                strokeWidth="1.2"
              />
              <circle cx="12" cy="9" r="3.2" fill="#ffffff" />
            </svg>
            <div className="wa-pin-shadow" />
          </div>

          {/* Floating Control: Recenter GPS */}
          <button
            type="button"
            ref={attachButtonEvents}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleRecenterGps();
            }}
            className="wa-loc-floating-btn wa-loc-btn-gps wa-loc-btn-recenter"
            title="Ke lokasi GPS Anda"
            aria-label="Ke lokasi GPS Anda"
            disabled={isLocating}
          >
            {isLocating ? <Icons.Spinner /> : <Icons.GpsTarget />}
          </button>
        </div>

        {/* BOTTOM ACTION CARD: Clean WhatsApp Single Bar */}
        <div className="wa-loc-bottom-card">
          <div
            onClick={handleSendLocation}
            className="wa-loc-action-row wa-loc-row-custom"
          >
            <div className="wa-loc-icon-circle wa-circle-custom">
              <Icons.RedPin />
            </div>

            <div className="wa-loc-action-details">
              <div className="wa-loc-action-title">
                {currentTitle || 'Lokasi Terpilih di Peta'}
              </div>
              <div className="wa-loc-action-sub">
                {currentAddress || `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`}
              </div>
            </div>

            <button
              type="button"
              disabled={sending}
              onClick={e => {
                e.stopPropagation();
                handleSendLocation();
              }}
              className="wa-loc-send-btn-chip wa-btn-chip-primary"
            >
              {sending ? <Icons.Spinner /> : 'Kirim Lokasi'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default LocationShareModal;
