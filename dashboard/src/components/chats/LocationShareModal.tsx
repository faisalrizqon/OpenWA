import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import './LocationShareModal.css';

export interface LocationData {
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

export type POICategory = 'convenience' | 'fuel' | 'hospital';

export interface NearbyPlace {
  id: string;
  name: string;
  category: POICategory;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

interface LocationShareModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: LocationData) => Promise<void> | void;
  sending?: boolean;
}

const DEFAULT_LAT = -6.936178;
const DEFAULT_LNG = 110.123306;

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

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
  // Google Maps Style Vector POI Icons
  Hospital: ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M19 10.5h-5.5V5c0-.55-.45-1-1-1s-1 .45-1 1v5.5H6c-.55 0-1 .45-1 1s.45 1 1 1h5.5V19c0 .55.45 1 1 1s1-.45 1-1v-5.5H19c.55 0 1-.45 1-1s-.45-1-1-1z" />
    </svg>
  ),
  Fuel: ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  ),
  Cart: ({ size = 18, color = '#ffffff' }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: 'block', flexShrink: 0 }}>
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  ),
  AllPlaces: ({ size = 16, color = '#64748b' }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  ),
};

function renderPoiBadgeIcon(category: POICategory): ReactNode {
  if (category === 'hospital') {
    return <Icons.Hospital size={18} color="#ffffff" />;
  }
  if (category === 'fuel') {
    return <Icons.Fuel size={17} color="#ffffff" />;
  }
  return <Icons.Cart size={16} color="#ffffff" />;
}

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

  // Nearby Landmarks / POI State
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | POICategory>('all');
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);

  // References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const addressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearbyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

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
        setSelectedPlaceId(null);
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

  // Fetch nearby POIs (Minimarket, SPBU, Rumah Sakit / Faskes) around coordinates
  const fetchNearbyLandmarks = useCallback(async (lat: number, lng: number) => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setIsSearchingPlaces(true);

    try {
      const queries: Array<{ q: string; cat: POICategory }> = [
        { q: 'indomaret', cat: 'convenience' },
        { q: 'alfamart', cat: 'convenience' },
        { q: 'spbu', cat: 'fuel' },
        { q: 'pertamina', cat: 'fuel' },
        { q: 'rumah sakit', cat: 'hospital' },
        { q: 'puskesmas', cat: 'hospital' },
      ];

      const responses = await Promise.all(
        queries.map(async item => {
          try {
            const res = await fetch(
              `https://photon.komoot.io/api/?q=${encodeURIComponent(item.q)}&lat=${lat}&lon=${lng}&limit=3`,
              { signal: ctrl.signal },
            );
            if (!res.ok) return [];
            const data = (await res.json()) as {
              features?: Array<{
                geometry?: { coordinates?: [number, number] };
                properties?: {
                  osm_id?: number | string;
                  name?: string;
                  street?: string;
                  district?: string;
                  city?: string;
                  county?: string;
                };
              }>;
            };
            return (data.features || []).map(f => {
              const pLat = f.geometry?.coordinates?.[1] ?? lat;
              const pLng = f.geometry?.coordinates?.[0] ?? lng;
              const dist = getDistanceMeters(lat, lng, pLat, pLng);
              const props = f.properties || {};
              const street = props.street || props.name;
              const locality = props.district || props.city || props.county || '';
              const addr = [street, locality].filter(Boolean).join(', ') || 'Area Sekitar';

              return {
                id: String(props.osm_id || `${pLat}_${pLng}_${Math.random()}`),
                name: props.name || (item.cat === 'fuel' ? 'SPBU' : item.cat === 'hospital' ? 'Rumah Sakit' : 'Minimarket'),
                category: item.cat,
                address: addr,
                lat: pLat,
                lng: pLng,
                distanceMeters: dist,
              } satisfies NearbyPlace;
            });
          } catch {
            return [];
          }
        }),
      );

      const flattened = responses.flat().sort((a, b) => a.distanceMeters - b.distanceMeters);
      const seen = new Set<string>();
      const unique = flattened.filter(item => {
        const key = `${item.name.toLowerCase().trim()}_${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setNearbyPlaces(unique.slice(0, 16));
    } catch {
      // Ignored
    } finally {
      setIsSearchingPlaces(false);
    }
  }, []);

  // Initialize Leaflet map with Google Maps Roadmap Tiles and Community Geocoder
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    let destroyed = false;

    Promise.all([
      import('leaflet'),
      import('leaflet-control-geocoder'),
    ]).then(([L, geocoderModule]) => {
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

      // Bright Google Maps Roadmap layer: White crisp roads, clean green/blue, no warm yellowish tint, native POIs (Indomaret, SPBU, RS)
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=id', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }).addTo(map);

      // Layer group for interactive POI markers on map
      const poiGroup = L.layerGroup().addTo(map);
      poiLayerRef.current = poiGroup;

      // Community Search Control: leaflet-control-geocoder
      try {
        const createGeocoder = geocoderModule.geocoder;
        const nominatimGeocoder = new geocoderModule.geocoders.Nominatim({
          geocodingQueryParams: {
            'accept-language': 'id,en',
            countrycodes: 'id',
          },
        });

        const geocoderControl = createGeocoder({
          defaultMarkGeocode: false,
          position: 'topleft',
          placeholder: 'Cari Indomaret, SPBU, RS...',
          errorMessage: 'Lokasi tidak ditemukan',
          geocoder: nominatimGeocoder,
        });

        geocoderControl.on('markgeocode', (event: unknown) => {
          const e = event as { geocode?: { center?: L.LatLng; name?: string } };
          if (e && e.geocode && e.geocode.center) {
            const center = e.geocode.center;
            map.flyTo(center, 17, { animate: true, duration: 0.6 });
            setPinCoords({ lat: center.lat, lng: center.lng });
            if (e.geocode.name) {
              setCurrentTitle(e.geocode.name);
            }
          }
        });

        geocoderControl.addTo(map);
      } catch {
        // Fallback gracefully
      }

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
          setSelectedPlaceId(null);
        }
      });

      setTimeout(() => {
        if (!destroyed && map) map.invalidateSize();
      }, 300);
    });

    return () => {
      destroyed = true;
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
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

  // Reverse geocode custom pin address (debounced) & refresh nearby POIs
  useEffect(() => {
    if (!open) return;

    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
    if (nearbyTimeoutRef.current) clearTimeout(nearbyTimeoutRef.current);

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
            if (!selectedPlaceId) {
              setCurrentTitle(title);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }, 350);

    nearbyTimeoutRef.current = setTimeout(() => {
      fetchNearbyLandmarks(pinCoords.lat, pinCoords.lng);
    }, 450);

    return () => {
      if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current);
      if (nearbyTimeoutRef.current) clearTimeout(nearbyTimeoutRef.current);
    };
  }, [pinCoords.lat, pinCoords.lng, open, selectedPlaceId, fetchNearbyLandmarks]);

  // Filtered places according to category tab
  const filteredPlaces = useMemo(() => {
    if (categoryFilter === 'all') return nearbyPlaces;
    return nearbyPlaces.filter(p => p.category === categoryFilter);
  }, [nearbyPlaces, categoryFilter]);

  // Handle selecting a nearby place (Click in list or click on map marker)
  const handleSelectPlace = useCallback((place: NearbyPlace) => {
    setSelectedPlaceId(place.id);
    setPinCoords({ lat: place.lat, lng: place.lng });
    setCurrentTitle(place.name);
    setCurrentAddress(place.address);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 17, { animate: true, duration: 0.5 });
    }
  }, []);

  // Render authentic Google Maps style POI pins on Leaflet canvas
  useEffect(() => {
    if (!mapInstanceRef.current || !poiLayerRef.current) return;

    import('leaflet').then(L => {
      const layer = poiLayerRef.current;
      if (!layer) return;
      layer.clearLayers();

      filteredPlaces.forEach(place => {
        const isSelected = selectedPlaceId === place.id;
        let svgPath = '';
        if (place.category === 'hospital') {
          svgPath = '<path d="M15 8.5h-4.5V4c0-.55-.45-1-1-1s-1 .45-1 1v4.5H4c-.55 0-1 .45-1 1s.45 1 1 1h4.5V15c0 .55.45 1 1 1s1-.45 1-1v-4.5H15c.55 0 1-.45 1-1s-.45-1-1-1z" fill="#ffffff" />';
        } else if (place.category === 'fuel') {
          svgPath = '<path d="M15.5 6l-.01-.01-2.9-2.9L11.7 3.6l1.65 1.65c-.73.28-1.25.98-1.25 1.82 0 1.08.87 1.95 1.95 1.95.28 0 .54-.06.78-.16V14.5c0 .43-.35.78-.78.78s-.78-.35-.78-.78V11.2c0-.86-.7-1.56-1.56-1.56h-.78V4.2c0-.86-.7-1.56-1.56-1.56H4.7c-.86 0-1.56.7-1.56 1.56v12.5h7.8V11h1.17v3.9c0 1.08.87 1.95 1.95 1.95s1.95-.87 1.95-1.95V7.4c0-.54-.22-1.03-.57-1.4zM9.4 8.1H4.7V4.2h4.7v3.9z" fill="#ffffff" />';
        } else {
          svgPath = '<path d="M5.5 14c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM1 1.5v1.5h1.5l2.7 5.7-1 1.8c-.12.21-.19.46-.19.72 0 .83.67 1.5 1.5 1.5h9V11H5.8c-.1 0-.19-.08-.19-.19l.02-.09.68-1.22h5.6c.56 0 1.06-.31 1.31-.77l2.7-4.87c.06-.11.09-.23.09-.36 0-.41-.34-.75-.75-.75H3.9l-.7-1.5H1zm12 12.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" fill="#ffffff" />';
        }

        const html = `
          <div class="wa-poi-map-pin wa-poi-map-${place.category} ${isSelected ? 'is-active' : ''}">
            <div class="wa-poi-pin-circle">
              <svg viewBox="0 0 19 19" width="13" height="13">${svgPath}</svg>
            </div>
            <span class="wa-poi-pin-title">${place.name}</span>
          </div>
        `;

        const divIcon = L.divIcon({
          className: 'wa-poi-div-icon',
          html,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([place.lat, place.lng], { icon: divIcon });
        marker.on('click', (event: unknown) => {
          const e = event as { originalEvent?: Event };
          if (e && e.originalEvent) {
            e.originalEvent.stopPropagation();
          }
          handleSelectPlace(place);
        });

        marker.addTo(layer);
      });
    });
  }, [filteredPlaces, selectedPlaceId, handleSelectPlace]);

  const handleRecenterGps = useCallback(() => {
    setSelectedPlaceId(null);
    if (gpsCoords && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.flyTo([gpsCoords.lat, gpsCoords.lng], 16, { animate: true, duration: 0.6 });
      setPinCoords({ lat: gpsCoords.lat, lng: gpsCoords.lng });
    } else {
      fetchGpsLocation();
    }
  }, [gpsCoords, fetchGpsLocation]);

  // Send Location (Pinpoint center of map or selected landmark)
  const handleSendLocation = () => {
    if (sending) return;
    onSend({
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      description: currentTitle || 'Lokasi Terpilih',
      address: currentAddress || `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`,
    });
  };

  const selectedPlace = useMemo(() => {
    return nearbyPlaces.find(p => p.id === selectedPlaceId);
  }, [nearbyPlaces, selectedPlaceId]);

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

        {/* BOTTOM ACTION CARD: Lokasi Terpilih & Tempat di Sekitar */}
        <div className="wa-loc-bottom-card">
          {/* Active Target / Selected Location Bar */}
          <div
            onClick={handleSendLocation}
            className="wa-loc-action-row wa-loc-row-custom"
          >
            <div className={`wa-poi-badge-circle ${selectedPlace ? `wa-poi-badge-${selectedPlace.category}` : 'wa-poi-badge-custom'}`}>
              {selectedPlace ? renderPoiBadgeIcon(selectedPlace.category) : <Icons.RedPin />}
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

          {/* Category Filter Chips (Google Maps POI Icons, Zero Emojis) */}
          <div className="wa-loc-chips-row">
            <button
              type="button"
              className={`wa-loc-chip ${categoryFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              <Icons.AllPlaces size={14} color={categoryFilter === 'all' ? '#ffffff' : '#64748b'} />
              <span>Semua ({nearbyPlaces.length})</span>
            </button>
            <button
              type="button"
              className={`wa-loc-chip ${categoryFilter === 'convenience' ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter('convenience')}
            >
              <Icons.Cart size={14} color={categoryFilter === 'convenience' ? '#ffffff' : '#1a73e8'} />
              <span>Minimarket</span>
            </button>
            <button
              type="button"
              className={`wa-loc-chip ${categoryFilter === 'fuel' ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter('fuel')}
            >
              <Icons.Fuel size={14} color={categoryFilter === 'fuel' ? '#ffffff' : '#ff6d00'} />
              <span>SPBU</span>
            </button>
            <button
              type="button"
              className={`wa-loc-chip ${categoryFilter === 'hospital' ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter('hospital')}
            >
              <Icons.Hospital size={14} color={categoryFilter === 'hospital' ? '#ffffff' : '#ea4335'} />
              <span>Rumah Sakit</span>
            </button>
          </div>

          {/* Nearby Places Section Header */}
          <div className="wa-loc-nearby-header">
            <span>Tempat di Sekitar</span>
            {isSearchingPlaces && <Icons.Spinner />}
          </div>

          {/* Nearby Places Scrollable List (Google Maps POI Badges) */}
          <div className="wa-loc-nearby-list">
            {filteredPlaces.length === 0 ? (
              <div style={{ padding: '10px 8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                {isSearchingPlaces ? 'Mencari minimarket, SPBU & faskes terdekat...' : 'Tidak ada tempat komersial/faskes terdeteksi di radius ini'}
              </div>
            ) : (
              filteredPlaces.map(place => {
                const isSelected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => handleSelectPlace(place)}
                    className={`wa-loc-nearby-item ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className={`wa-poi-badge-circle wa-poi-badge-${place.category}`} style={{ width: 34, height: 34 }}>
                      {renderPoiBadgeIcon(place.category)}
                    </div>

                    <div className="wa-loc-action-details">
                      <div className="wa-loc-action-title" style={{ fontSize: '0.86rem' }}>
                        {place.name}
                      </div>
                      <div className="wa-loc-action-sub" style={{ fontSize: '0.74rem' }}>
                        {place.address}
                      </div>
                    </div>

                    <div className="wa-loc-dist-badge">
                      {formatDistance(place.distanceMeters)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default LocationShareModal;
