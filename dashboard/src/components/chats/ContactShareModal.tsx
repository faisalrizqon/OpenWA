import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Search, Send, Check, MessageSquare, UserPlus, X } from 'lucide-react';
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

interface ParsedCandidate {
  id: string;
  name: string;
  phone: string;
  isLid: boolean;
  initials: string;
}

export function ContactShareModal({ open, onClose, onSend, sending = false, chats = [] }: ContactShareModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'chats' | 'manual'>('chats');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedCandidateId(null);
      setName('');
      setPhone('');
      setActiveTab('chats');
    }
  }, [open]);

  // Extract candidate contacts from recent individual chats
  const candidateContacts = useMemo<ParsedCandidate[]>(() => {
    return chats
      .filter(c => !c.isGroup && c.kind !== 'channel')
      .map(c => {
        const isLid = c.id.endsWith('@lid');
        const rawId = c.id.replace(/@.*$/, '');

        // Check if name itself is a formatted phone number
        const nameTrim = (c.name || '').trim();
        const isNamePhone = /^\+?[0-9\s-()]{7,25}$/.test(nameTrim);
        const phoneFromName = isNamePhone ? nameTrim.replace(/[\s-()]/g, '') : '';

        let resolvedPhone = '';
        if (phoneFromName) {
          resolvedPhone = phoneFromName.startsWith('+') ? phoneFromName : `+${phoneFromName}`;
        } else if (!isLid && /^\d+$/.test(rawId)) {
          resolvedPhone = rawId.startsWith('+') ? rawId : `+${rawId}`;
        }

        const displayName = c.name || resolvedPhone || rawId;

        // Generate initials for avatar
        const words = displayName.trim().split(/\s+/);
        let initials = words[0]?.slice(0, 1).toUpperCase() || '?';
        if (words.length > 1 && words[1]) {
          initials += words[1].slice(0, 1).toUpperCase();
        }

        return {
          id: c.id,
          name: displayName,
          phone: resolvedPhone,
          isLid,
          initials: initials.slice(0, 2),
        };
      });
  }, [chats]);

  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidateContacts.slice(0, 30);
    const q = search.toLowerCase();
    return candidateContacts
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
      .slice(0, 30);
  }, [candidateContacts, search]);

  const handleSelectCandidate = (candidate: ParsedCandidate) => {
    setSelectedCandidateId(candidate.id);
    setName(candidate.name);
    setPhone(candidate.phone || '');
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone || sending) return;
    onSend({ name: cleanName, number: cleanPhone });
  };

  const isFormValid = Boolean(name.trim() && phone.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="wa-contact-modal-header">
          <div className="wa-contact-header-badge">
            <User size={18} />
          </div>
          <div className="wa-contact-header-text">
            <span className="wa-contact-header-title">{t('chats.shareContact', 'Bagikan Kontak')}</span>
            <span className="wa-contact-header-sub">{t('chats.shareContactSub', 'Kirim kartu kontak WhatsApp')}</span>
          </div>
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
            onClick={() => handleFormSubmit()}
            disabled={!isFormValid || sending}
          >
            <Send size={15} />
            <span>{sending ? t('common.sending', 'Mengirim...') : t('chats.sendContact', 'Kirim Kontak')}</span>
          </button>
        </div>
      }
    >
      <div className="wa-contact-body">
        {/* TAB SELECTOR */}
        <div className="wa-contact-tabs">
          <button
            type="button"
            className={`wa-contact-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <MessageSquare size={15} />
            <span>{t('chats.selectFromChats', 'Pilih dari Obrolan')}</span>
          </button>
          <button
            type="button"
            className={`wa-contact-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <UserPlus size={15} />
            <span>{t('chats.manualInput', 'Input Manual')}</span>
          </button>
        </div>

        {/* TAB 1: PILIH DARI OBROLAN */}
        {activeTab === 'chats' && (
          <div className="wa-contact-tab-content">
            {/* Search Box */}
            <div className="wa-contact-search-bar">
              <Search size={16} className="wa-contact-search-icon" />
              <input
                type="text"
                className="wa-contact-search-input"
                placeholder={t('chats.searchContactPlaceholder', 'Cari nama atau nomor telepon...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  className="wa-contact-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Candidates List */}
            <div className="wa-contact-candidates-list">
              {filteredCandidates.length === 0 ? (
                <div className="wa-contact-empty">
                  <span>{t('chats.noContactFound', 'Tidak ada kontak ditemukan')}</span>
                  <button
                    type="button"
                    className="wa-contact-empty-switch"
                    onClick={() => setActiveTab('manual')}
                  >
                    {t('chats.switchManual', 'Ketik kontak manual')}
                  </button>
                </div>
              ) : (
                filteredCandidates.map(c => {
                  const isSelected = selectedCandidateId === c.id;
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      className={`wa-contact-candidate-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectCandidate(c)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectCandidate(c);
                        }
                      }}
                    >
                      <div className={`wa-candidate-avatar ${isSelected ? 'avatar-active' : ''}`}>
                        {c.initials}
                      </div>
                      <div className="wa-candidate-details">
                        <span className="wa-candidate-name">{c.name}</span>
                        <span className="wa-candidate-phone">
                          {c.phone ? c.phone : t('chats.noPhoneInChat', 'Nomor belum tersimpan')}
                        </span>
                      </div>
                      <div className={`wa-candidate-radio ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* If selected candidate doesn't have phone, prompt user to enter it */}
            {selectedCandidateId && !phone.trim() && (
              <div className="wa-contact-missing-phone-alert">
                <label className="wa-contact-field-label">
                  {t('chats.enterPhoneFor', 'Masukkan nomor telepon untuk')} <strong>{name}</strong>:
                </label>
                <div className="wa-contact-field-box">
                  <Phone size={16} className="wa-contact-box-icon" />
                  <input
                    type="tel"
                    className="wa-contact-input"
                    placeholder="Contoh: 08123456789 atau +628123456789"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INPUT MANUAL */}
        {activeTab === 'manual' && (
          <form onSubmit={handleFormSubmit} className="wa-contact-tab-content wa-contact-form">
            <div className="wa-contact-form-group">
              <label className="wa-contact-field-label">{t('chats.contactName', 'Nama Kontak')}</label>
              <div className="wa-contact-field-box">
                <User size={17} className="wa-contact-box-icon" />
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

            <div className="wa-contact-form-group">
              <label className="wa-contact-field-label">{t('chats.contactPhone', 'Nomor WhatsApp / Telepon')}</label>
              <div className="wa-contact-field-box">
                <Phone size={17} className="wa-contact-box-icon" />
                <input
                  type="tel"
                  className="wa-contact-input"
                  placeholder={t('chats.contactPhonePlaceholder', 'Contoh: 08123456789 atau +628123456789')}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
              <span className="wa-contact-field-hint">
                {t('chats.phoneHint', 'Format didukung: 08xx atau +62xx')}
              </span>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default ContactShareModal;
