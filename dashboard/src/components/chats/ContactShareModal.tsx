import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Search, Send, UserCheck } from 'lucide-react';
import { Modal } from '../Modal';
import type { Chat } from '../../services/api';
import './ContactShareModal.css';

export interface ContactShareData {
  name: string;
  number: string;
}

export interface ContactShareModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (contact: ContactShareData) => void | Promise<void>;
  sending?: boolean;
  chats?: Chat[];
}

export function ContactShareModal({ open, onClose, onSend, sending, chats = [] }: ContactShareModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');

  // Extract individual/known contacts from chats
  const candidateContacts = useMemo(() => {
    return chats
      .filter(c => !c.isGroup && c.kind !== 'channel')
      .map(c => {
        const rawNumber = c.id.replace(/@.*$/, '');
        return {
          id: c.id,
          name: c.name || rawNumber,
          phone: rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`,
        };
      });
  }, [chats]);

  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidateContacts.slice(0, 15);
    const q = search.toLowerCase();
    return candidateContacts
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 20);
  }, [candidateContacts, search]);

  const handleSelectCandidate = (candidate: { name: string; phone: string }) => {
    setName(candidate.name);
    setPhone(candidate.phone);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || sending) return;
    onSend({ name: name.trim(), number: phone.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="wa-contact-modal-title">
          <User className="wa-contact-title-icon" size={20} />
          <span>{t('chats.shareContact', 'Bagikan Kontak')}</span>
        </div>
      }
      className="wa-contact-share-modal"
      footer={
        <div className="wa-contact-modal-footer">
          <button type="button" className="wa-contact-btn-cancel" onClick={onClose} disabled={sending}>
            {t('common.cancel', 'Batal')}
          </button>
          <button
            type="button"
            className="wa-contact-btn-send"
            onClick={handleFormSubmit}
            disabled={!name.trim() || !phone.trim() || sending}
          >
            <Send size={16} />
            <span>{sending ? t('common.sending', 'Mengirim...') : t('chats.sendContact', 'Kirim Kontak')}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleFormSubmit} className="wa-contact-form">
        <div className="wa-contact-field-group">
          <label className="wa-contact-label">{t('chats.contactName', 'Nama Kontak')}</label>
          <div className="wa-contact-input-wrapper">
            <User size={18} className="wa-contact-input-icon" />
            <input
              type="text"
              className="wa-contact-input"
              placeholder={t('chats.contactNamePlaceholder', 'Contoh: Ahmad Fauzi')}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
        </div>

        <div className="wa-contact-field-group">
          <label className="wa-contact-label">{t('chats.contactPhone', 'Nomor WhatsApp / Telepon')}</label>
          <div className="wa-contact-input-wrapper">
            <Phone size={18} className="wa-contact-input-icon" />
            <input
              type="tel"
              className="wa-contact-input"
              placeholder={t('chats.contactPhonePlaceholder', 'Contoh: 08123456789 atau +628123456789')}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        {candidateContacts.length > 0 && (
          <div className="wa-contact-picker-section">
            <div className="wa-contact-picker-header">
              <span className="wa-contact-picker-label">{t('chats.orSelectExisting', 'Atau pilih dari obrolan:')}</span>
              <div className="wa-contact-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder={t('chats.searchContact', 'Cari nama/nomor...')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="wa-contact-candidates-list">
              {filteredCandidates.map(c => {
                const isSelected = name === c.name && phone === c.phone;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`wa-contact-candidate-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectCandidate(c)}
                  >
                    <div className="wa-candidate-avatar">
                      {isSelected ? <UserCheck size={18} /> : <User size={18} />}
                    </div>
                    <div className="wa-candidate-details">
                      <span className="wa-candidate-name">{c.name}</span>
                      <span className="wa-candidate-phone">{c.phone}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default ContactShareModal;
