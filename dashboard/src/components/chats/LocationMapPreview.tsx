import React, { useState, useMemo } from 'react';

export interface LocationMapPreviewProps {
  latitude?: number;
  longitude?: number;
  thumbnail?: string;
  onMediaLoad?: () => void;
  measureMedia?: React.RefCallback<HTMLElement>;
}

export function LocationMapPreview({
  latitude,
  longitude,
  thumbnail,
  onMediaLoad,
  measureMedia,
}: LocationMapPreviewProps) {
  const [thumbFailed, setThumbFailed] = useState<boolean>(false);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  const tiles = useMemo(() => {
    if (!hasCoords || latitude === undefined || longitude === undefined) return [];

    const zoom = 16;
    const n = Math.pow(2, zoom);
    const centerX = ((longitude + 180) / 360) * n * 256;
    const latRad = (latitude * Math.PI) / 180;
    const centerY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;

    // Viewport dimensions
    const w = 280;
    const h = 150;
    const minX = centerX - w / 2;
    const minY = centerY - h / 2;
    const maxX = centerX + w / 2;
    const maxY = centerY + h / 2;

    const startX = Math.floor(minX / 256);
    const endX = Math.floor(maxX / 256);
    const startY = Math.floor(minY / 256);
    const endY = Math.floor(maxY / 256);

    const result = [];
    for (let tx = startX; tx <= endX; tx++) {
      for (let ty = startY; ty <= endY; ty++) {
        result.push({
          key: `${tx}_${ty}`,
          left: Math.round(tx * 256 - minX),
          top: Math.round(ty * 256 - minY),
          url: `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`,
          fallbackUrl: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        });
      }
    }
    return result;
  }, [hasCoords, latitude, longitude]);

  // Case 1: Coordinates exist -> ALWAYS render rich map tiles preview with pinpoint & streets!
  if (hasCoords && tiles.length > 0) {
    return (
      <div className="chat-location-map-viewport" ref={measureMedia}>
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            onLoad={onMediaLoad}
            onError={e => {
              if (e.currentTarget.src !== tile.fallbackUrl) {
                e.currentTarget.src = tile.fallbackUrl;
              }
            }}
            className="chat-location-tile-img"
            style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
          />
        ))}
        {/* Red WhatsApp / Google Maps Location Pin in center */}
        <div className="chat-location-center-pin">
          <div className="chat-location-pin-shadow" />
          <svg viewBox="0 0 24 24" width="30" height="30" className="chat-location-pin-svg">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#ea4335"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
          </svg>
        </div>
        <div className="chat-location-map-watermark">Google Maps ↗</div>
      </div>
    );
  }

  // Case 2: Coordinates absent, but thumbnail exists
  if (thumbnail && !thumbFailed) {
    return (
      <div className="chat-location-thumb-wrapper">
        <img
          ref={measureMedia}
          src={thumbnail}
          alt=""
          onLoad={onMediaLoad}
          onError={() => setThumbFailed(true)}
          className="chat-location-media"
        />
        <div className="chat-location-center-pin">
          <div className="chat-location-pin-shadow" />
          <svg viewBox="0 0 24 24" width="28" height="28" className="chat-location-pin-svg">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#ea4335"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
          </svg>
        </div>
      </div>
    );
  }

  // Case 3: Fallback when coordinates are completely unavailable
  return (
    <div className="chat-location-card" ref={measureMedia}>
      <div className="chat-location-pin-icon">📍</div>
    </div>
  );
}

export default LocationMapPreview;
