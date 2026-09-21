

export interface WAStatusTickProps {
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  size?: number;
  className?: string;
}

/**
 * WhatsApp Native Straight Checkmarks (1:1 with WhatsApp Web).
 * - Sent: single straight tick (gray)
 * - Delivered: double straight tick (gray)
 * - Read: double straight tick (WhatsApp signature blue #53bdeb)
 * - Pending: mini clock icon
 * - Failed: mini alert icon
 */
export function WAStatusTick({ status, size = 16, className = '' }: WAStatusTickProps) {
  if (!status) return null;

  if (status === 'pending') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`wa-tick-pending ${className}`}
        aria-label="Pending"
      >
        <circle cx="8" cy="8" r="6" />
        <polyline points="8 4.8 8 8 10.4 9.5" />
      </svg>
    );
  }

  if (status === 'failed') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="#ea4335"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`wa-tick-failed ${className}`}
        aria-label="Failed"
      >
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="5" x2="8" y2="8.5" />
        <circle cx="8" cy="11.5" r="0.5" fill="#ea4335" />
      </svg>
    );
  }

  if (status === 'sent') {
    // Single straight tick (Abu-abu / Neutral)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`wa-tick-sent ${className}`}
        aria-label="Sent"
      >
        <path d="M3.5 8.2L6.5 11.2L13 4" />
      </svg>
    );
  }

  // Double straight tick (delivered = gray, read = bright WhatsApp blue #53bdeb)
  const isRead = status === 'read';
  const color = isRead ? '#53bdeb' : 'currentColor';

  return (
    <svg
      width={Math.round(size * 1.15)}
      height={size}
      viewBox="0 0 18 15"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`wa-tick-double ${isRead ? 'wa-tick-read' : 'wa-tick-delivered'} ${className}`}
      aria-label={isRead ? 'Read' : 'Delivered'}
      style={isRead ? { color: '#53bdeb' } : undefined}
    >
      {/* Tick 1 (Left) */}
      <path d="M1.5 8.2L4.5 11.2L11 4" />
      {/* Tick 2 (Right, perfectly parallel and straight) */}
      <path d="M5.5 8.2L8.5 11.2L15 4" />
    </svg>
  );
}

/**
 * WhatsApp Sticker Icon (Outline with folded bottom-right corner, matching Image #1)
 */
export function WAStickerIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M13.5 8.5A4.5 4.5 0 0 1 9 13H4A1.5 1.5 0 0 1 2.5 11.5V4A1.5 1.5 0 0 1 4 2.5h8A1.5 1.5 0 0 1 13.5 4v4.5z" />
      <path d="M9 13A4 4 0 0 0 13 9" />
    </svg>
  );
}

/**
 * WhatsApp Photo Icon (Outline with picture mountains + sun, matching Image #1)
 */
export function WAPhotoIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <circle cx="5.5" cy="6" r="1.2" fill="currentColor" />
      <path d="M14 11l-3.5-4L4 13.5" />
    </svg>
  );
}
