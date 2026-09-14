import React, { useMemo } from 'react';
import { User, MessageCircle, UserPlus, Phone } from 'lucide-react';
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
}

export function ContactMessageCard({ vcardText }: ContactMessageCardProps) {
  const contacts = useMemo(() => parseVCardText(vcardText), [vcardText]);

  if (contacts.length === 0) {
    return null;
  }

  const handleDownloadVcf = (c: ParsedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([c.rawVcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${c.name || 'contact'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleChatDirect = (c: ParsedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!c.waid) return;
    const waUrl = `https://wa.me/${c.waid}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="wa-contact-card-container">
      {contacts.map((c, idx) => (
        <div key={idx} className="wa-contact-card">
          <div className="wa-contact-header">
            {c.photo ? (
              <img src={c.photo} alt={c.name} className="wa-contact-avatar-img" />
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
            {c.waid && (
              <button
                type="button"
                className="wa-contact-action-btn wa-btn-chat"
                onClick={e => handleChatDirect(c, e)}
                title="Kirim pesan via WhatsApp"
              >
                <MessageCircle size={15} />
                <span>Kirim Pesan</span>
              </button>
            )}

            <button
              type="button"
              className="wa-contact-action-btn wa-btn-save"
              onClick={e => handleDownloadVcf(c, e)}
              title="Simpan kontak (.vcf)"
            >
              <UserPlus size={15} />
              <span>Simpan Kontak</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContactMessageCard;
