import React, { useMemo, useState } from 'react';
import { User, MessageCircle, UserPlus, Phone, Loader2, Check, AlertCircle } from 'lucide-react';
import { contactApi } from '../../services/api';
import './ContactMessageCard.css';

export interface ParsedContact {
  name: string;
  phone: string;
  waid: string;
  label: string;
  photo?: string;
  rawVcard: string;
}

export function parseVCardText(vcardText: string): ParsedContact[] {
  if (!vcardText) return [];
  const cards: ParsedContact[] = [];
  // Split multiple vcards if present
  const blocks = vcardText.split(/(?=BEGIN:VCARD)/i).filter(b => b.includes('BEGIN:VCARD'));
  if (blocks.length === 0 && vcardText.includes('VCARD')) {
    blocks.push(vcardText);
  }

  for (const block of blocks) {
    let name = '';
    let phone = '';
    let waid = '';
    let label = '';
    let photo = '';
    let isReadingPhoto = false;
    let photoBuffer = '';

    const lines = block.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (isReadingPhoto) {
        if (line.startsWith('END:VCARD') || (line.includes(':') && !line.startsWith(' ') && !line.startsWith('\t'))) {
          isReadingPhoto = false;
          photo = photoBuffer;
        } else {
          photoBuffer += line;
          continue;
        }
      }

      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        name = line.slice(line.indexOf(':') + 1).trim();
      } else if (line.includes('TEL') && line.includes(':')) {
        const m = line.match(/waid=(\d+)/i);
        if (m) waid = m[1];
        const num = line.slice(line.indexOf(':') + 1).trim();
        if (!phone) phone = num;
      } else if (line.includes('X-ABLabel:')) {
        label = line.slice(line.indexOf(':') + 1).trim();
      } else if (line.startsWith('PHOTO;') || line.startsWith('PHOTO:')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx >= 0) {
          photoBuffer = line.slice(colonIdx + 1).trim();
          isReadingPhoto = true;
        }
      }
    }
    if (isReadingPhoto && photoBuffer) {
      photo = photoBuffer;
    }

    if (!name && phone) name = phone;
    if (name || phone) {
      const cleanWaid = waid || phone.replace(/[^\d]/g, '');
      cards.push({
        name: name || 'Kontak',
        phone: phone || cleanWaid,
        waid: cleanWaid,
        label: label || 'Ponsel',
        photo: photo ? (photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`) : undefined,
        rawVcard: block,
      });
    }
  }

  return cards;
}

interface ContactMessageCardProps {
  vcardText: string;
  sessionId?: string;
  onOpenChat?: (contact: { jid: string; name: string; phone?: string }) => void;
  onZoomPhoto?: (photoUrl: string, name: string) => void;
}

export function ContactMessageCard({ vcardText, sessionId, onOpenChat, onZoomPhoto }: ContactMessageCardProps) {
  const contacts = useMemo(() => parseVCardText(vcardText), [vcardText]);
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  if (contacts.length === 0) {
    return null;
  }

  const handleChatDirect = (c: ParsedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNumber = c.waid || c.phone.replace(/[^\d]/g, '');
    if (!cleanNumber) return;
    const jid = `${cleanNumber}@c.us`;
    if (onOpenChat) {
      onOpenChat({ jid, name: c.name, phone: c.phone });
    } else {
      const waUrl = `https://wa.me/${cleanNumber}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveContact = async (c: ParsedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNumber = c.waid || c.phone.replace(/[^\d]/g, '');
    if (!cleanNumber) return;
    const key = cleanNumber;
    const jid = `${cleanNumber}@c.us`;
    if (!sessionId) return;

    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));
    try {
      await contactApi.upsert(sessionId, jid, { firstName: c.name || 'Kontak' });
      setSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
    } catch (err) {
      console.error('Failed to save contact:', err);
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };
  return (
    <div className="wa-contact-card-container">
      {contacts.map((c, idx) => (
        <div key={idx} className="wa-contact-card">
          <div className="wa-contact-header">
            {c.photo ? (
              <img
                src={c.photo}
                alt={c.name}
                className="wa-contact-avatar-img"
                style={onZoomPhoto ? { cursor: 'pointer' } : undefined}
                onClick={e => {
                  if (onZoomPhoto && c.photo) {
                    e.stopPropagation();
                    onZoomPhoto(c.photo, c.name);
                  }
                }}
                title={onZoomPhoto ? 'Klik untuk memperbesar foto profil' : undefined}
              />
            ) : (
              <div className="wa-contact-avatar-circle">
                <User size={26} />
              </div>
            )}
            <div className="wa-contact-info">
              <div className="wa-contact-name" title={c.name}>{c.name}</div>
              <div className="wa-contact-phone">
                <Phone size={12} className="wa-contact-phone-icon" />
                <span>{c.phone}</span>
                {c.label && <span className="wa-contact-badge">{c.label}</span>}
              </div>
            </div>
          </div>

          <div className="wa-contact-actions">
            <button
              type="button"
              className="wa-contact-action-btn wa-btn-chat"
              onClick={e => handleChatDirect(c, e)}
              title="Buka chat langsung di OpenWA"
            >
              <MessageCircle size={15} />
              <span>Kirim Pesan</span>
            </button>

            <button
              type="button"
              className={`wa-contact-action-btn wa-btn-save ${saveStatus[c.waid || c.phone] === 'saved' ? 'wa-btn-saved' : ''}`}
              onClick={e => handleSaveContact(c, e)}
              disabled={saveStatus[c.waid || c.phone] === 'saving' || saveStatus[c.waid || c.phone] === 'saved'}
              title={saveStatus[c.waid || c.phone] === 'saved' ? 'Kontak telah tersimpan di WhatsApp' : 'Simpan kontak langsung ke WhatsApp'}
            >
              {saveStatus[c.waid || c.phone] === 'saving' ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : saveStatus[c.waid || c.phone] === 'saved' ? (
                <>
                  <Check size={15} className="text-emerald-500" />
                  <span style={{ color: 'var(--color-primary, #10b981)', fontWeight: 600 }}>Tersimpan di WA</span>
                </>
              ) : saveStatus[c.waid || c.phone] === 'error' ? (
                <>
                  <AlertCircle size={15} />
                  <span>Coba Lagi</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Simpan ke WA</span>
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContactMessageCard;
