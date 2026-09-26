import { useTranslation } from 'react-i18next';
import { AlertCircle, CircleDashed, Loader2, Maximize2, Megaphone, Minimize2, Plus, Pin, Video, Mic, FileText, MapPin, User, PhoneMissed, ShoppingBag } from 'lucide-react';
import { WAStatusTick, WAStickerIcon, WAPhotoIcon } from './WAStatusTick';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Channel, Chat, ContactStatusGroup, SearchHit } from '../../services/api';
import { useRole } from '../../hooks/useRole';
import ChatAvatar from './ChatAvatar';
import { UnifiedSearch } from '../UnifiedSearch';
import { listenForParentExitRequest, pseudoFullscreenStore } from '../../utils/pseudoFullscreenStore';

export type ChatsTab = 'chats' | 'channels' | 'status';

interface ChatSidebarProps {
  selectedSessionId: string;
  activeTab: ChatsTab;
  onSwitchTab: (tab: ChatsTab) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  /** Message-search hits from the unified box — the page navigates to the chat/message. */
  onMessageHit: (hit: SearchHit) => void;
  onComposeStatus: () => void;
  formatChatTime: (timestamp?: number) => string;
  chatsTab: {
    loading: boolean;
    chats: Chat[];
    activeChatId?: string;
    pictures?: Record<string, string | null>;
    onSelectChat: (chat: Chat) => void;
    onTogglePin?: (chat: Chat) => void;
  };
  channelsTab: {
    engineLoading: boolean;
    supported: boolean;
    query: UseQueryResult<Channel[], Error>;
    channels: Channel[];
    activeChannelId?: string;
    onSelectChannel: (channel: Channel) => void;
  };
  statusTab: {
    loading: boolean;
    error: boolean;
    groups: ContactStatusGroup[];
    activeContactId: string | null;
    onSelectContact: (contactId: string) => void;
  };
}


// Tombol maximize/minimize area chat. State pseudo-fullscreen disimpan di
// store global (utils/pseudoFullscreenStore) dan dipasang DEKLARATIF sebagai
// class pada `.chats-layout` di Chats.tsx — bukan lewat classList.add, yang
// akan terhapus setiap React menulis ulang template className saat re-render
// (mis. ketika user membuka chat personal).
function FullChatToggle() {
  const pseudoMode = useSyncExternalStore(
    pseudoFullscreenStore.subscribe,
    pseudoFullscreenStore.getSnapshot,
    pseudoFullscreenStore.getSnapshot,
  );
  // Store menyimpan MODE ('none' | 'chat' | 'page'), bukan boolean — string
  // 'none' itu truthy, jadi jangan pakai nilai mentahnya sebagai boolean.
  const active = pseudoMode === 'chat';
  const [isApiFullscreen, setIsApiFullscreen] = useState(false);

  // Sinkron dengan Fullscreen API desktop (keluar via ESC dll).
  useEffect(() => {
    const handleFsChange = () => setIsApiFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Induk (halaman admin yang menanam iframe) bisa minta keluar — tombol
  // minimize di sana mengirim pesan ini.
  useEffect(
    () =>
      listenForParentExitRequest(() => {
        pseudoFullscreenStore.setMode('none');
        if (document.fullscreenElement) void document.exitFullscreen();
      }),
    [],
  );
  const isFullscreen = active || isApiFullscreen;

  const handleToggle = async () => {
    // "Fullscreen di browser saja": pseudo-fullscreen CSS membuat area chat
    // menutup viewport browser (fixed inset-0) TANPA menyembunyikan chrome
    // browser (status bar + URL bar). Fullscreen TOTAL (chrome browser hilang)
    // adalah tugas tombol header halaman (.chats-page-fullscreen-btn) lewat
    // Fullscreen API — dua tombol, dua tingkat fullscreen yang berbeda.
    if (!isFullscreen) {
      pseudoFullscreenStore.setMode('chat');
    } else if (active) {
      pseudoFullscreenStore.setMode('none');
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      title={isFullscreen ? 'Perkecil chat' : 'Perbesar chat satu layar penuh'}
      aria-label={isFullscreen ? 'Minimize' : 'Maximize'}
      className="icon-btn-full-chat"
    >
      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );
}

// LEFT SIDEBAR: session selector, Chats/Channels/Status tab bar, search, and the per-tab lists.
// The page owns all queries/state; this component renders them and reports interactions up.
function ChatSidebar({
  selectedSessionId,
  activeTab,
  onSwitchTab,
  searchQuery,
  onSearchQueryChange,
  onMessageHit,
  onComposeStatus,
  formatChatTime,
  chatsTab,
  channelsTab,
  statusTab,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  // Sanitize text: remove orphan surrogates/replacement chars and strip leading media emoji safely with /u
  const cleanSnippetText = (str?: string): string => {
    if (!str) return '';
    // 1. Remove orphan surrogates and replacement characters (like diamond question mark)
    const sanitized = str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|\uFFFD/g, '').trim();
    // 2. Strip leading pictographic emoji if any
    return sanitized.replace(/^\p{Extended_Pictographic}+[\uFE0F\u200D\s]*/u, '').trim();
  };

  // Posting a status needs an operator key; a read-only key would only reach a 403.
  const { canWrite } = useRole();

  const renderChatSnippet = (chat: Chat) => {
    const rawText = chat.lastMessage?.trim();
    if (!rawText && !chat.timestamp) {
      return <span className="no-message">{t('chats.noMessageYet')}</span>;
    }

    const fromMe = Boolean(chat.lastMessageFromMe);
    const status = chat.lastMessageStatus || (fromMe ? 'sent' : undefined);
    const text = rawText || t('chats.media.omitted', 'Media');
    const type = chat.lastMessageType?.toLowerCase();

    let mediaIcon: React.ReactNode = null;
    let displayText = cleanSnippetText(text);

    if (type === 'sticker' || text.startsWith('🏷️') || /^\[?sticker\]?$/i.test(text)) {
      mediaIcon = <WAStickerIcon size={14} className="wa-snippet-media-icon" />;
      displayText = t('chats.media.sticker', 'Sticker');
    } else if (type === 'image' || text.startsWith('📷') || /^\[?image\]?$/i.test(text) || text.toLowerCase() === 'photo' || text.toLowerCase() === 'foto') {
      mediaIcon = <WAPhotoIcon size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text.replace(/^\[image\]\s*/i, '')) || t('chats.media.photo', 'Photo');
    } else if (type === 'video' || text.startsWith('🎥') || /^\[?video\]?$/i.test(text)) {
      mediaIcon = <Video size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text.replace(/^\[video\]\s*/i, '')) || t('chats.media.video', 'Video');
    } else if (type === 'audio' || type === 'ptt' || text.startsWith('🎤') || text.startsWith('🎵') || /^\[?audio\]?$/i.test(text)) {
      mediaIcon = <Mic size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text.replace(/^\[audio\]\s*/i, '')) || (type === 'ptt' ? 'Pesan suara' : 'Audio');
    } else if (type === 'document' || text.startsWith('📄') || /^\[?document\]?$/i.test(text)) {
      mediaIcon = <FileText size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text.replace(/^\[document\]\s*/i, '')) || t('chats.media.document', 'Dokumen');
    } else if (type === 'location' || text.startsWith('📍')) {
      mediaIcon = <MapPin size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text) || t('chats.media.location', 'Lokasi');
    } else if (type === 'contact' || type === 'vcard' || text.startsWith('👤')) {
      mediaIcon = <User size={14} className="wa-snippet-media-icon" />;
      displayText = cleanSnippetText(text) || t('chats.media.contact', 'Kontak');
    } else if (type === 'call_log' || type === 'call' || type === 'missed_call' || text.startsWith('📞') || text.startsWith('📹') || /panggilan/i.test(text) || /missed call/i.test(text)) {
      const isVideo = /video/i.test(text);
      mediaIcon = isVideo ? (
        <Video size={14} className="wa-snippet-media-icon" />
      ) : (
        <PhoneMissed size={14} className="wa-snippet-media-icon" style={{ color: '#ea0038' }} />
      );
      displayText = cleanSnippetText(text) || t('chats.media.missedCall', 'Panggilan tak terjawab');
    } else if (type === 'order' || text.startsWith('🛍️') || /^\[?order\]?$/i.test(text)) {
      mediaIcon = <ShoppingBag size={14} className="wa-snippet-media-icon" style={{ color: '#22c55e' }} />;
      displayText = cleanSnippetText(text.replace(/^\[order\]\s*/i, '').replace(/^🛍️\s*/i, '')) || 'Pesanan';
    } else if (type === 'interactive' || /^\[?interactive\]?$/i.test(text)) {
      mediaIcon = <ShoppingBag size={14} className="wa-snippet-media-icon" style={{ color: '#0ea5e9' }} />;
      displayText = cleanSnippetText(text.replace(/^\[interactive\]\s*/i, '').replace(/^📋\s*/i, '')) || 'Pesanan / Interaktif';
    } else if (text.startsWith('Reacted ')) {
      displayText = text;
    }
    return (
      <>
        {fromMe && <WAStatusTick status={status} size={14} className="wa-snippet-status-tick" />}
        {mediaIcon}
        <span className="wa-snippet-text">{displayText}</span>
      </>
    );
  };
  // Shared row markup for the Chats and Status lists — a plain function (not memoized) since it
  // closes over render-scoped props (chatsTab.activeChatId, chatsTab.pictures) that already
  // change every render.
  const renderChatRow = (chat: Chat) => {
    const isActive = chatsTab.activeChatId === chat.id;
    return (
      <div
        key={chat.id}
        role="button"
        tabIndex={0}
        aria-current={isActive ? 'true' : undefined}
        className={`chat-item-card ${isActive ? 'active' : ''}`}
        onClick={() => chatsTab.onSelectChat(chat)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            chatsTab.onSelectChat(chat);
          }
        }}
      >
        <ChatAvatar pictureUrl={chatsTab.pictures?.[chat.id]} kind={chat.kind} />

        <div className="chat-item-info">
          <div className="chat-item-top">
            <span className="chat-item-name" title={chat.name || chat.id}>
              {chat.name || chat.id.split('@')[0]}
            </span>
            {chat.kind !== 'individual' && chat.kind !== 'unknown' && (
              <span className={`chat-kind-badge kind-${chat.kind}`}>{t(`chats.kind.${chat.kind}`)}</span>
            )}
            {/* Ternary, not `&&`: a chat with no messages carries timestamp 0, and React
                renders 0 as text. The ternary keeps the layout stable by reserving the slot
                where the time belongs, on every such row. */}
            {chat.timestamp ? <span className="chat-item-time">{formatChatTime(chat.timestamp)}</span> : null}
          </div>
          <div className="chat-item-bottom">
            <span className="chat-item-snippet" title={chat.lastMessage || ''}>
              {renderChatSnippet(chat)}
            </span>
            <div className="chat-item-meta-right">
              {chatsTab.onTogglePin ? (
                <button
                  type="button"
                  className={`chat-item-pin-btn ${chat.pinned ? 'is-pinned' : ''}`}
                  title={chat.pinned ? t('chats.unpinChat', 'Lepas Sematan') : t('chats.pinChat', 'Sematkan Chat')}
                  aria-label={chat.pinned ? t('chats.unpinChat', 'Lepas Sematan') : t('chats.pinChat', 'Sematkan Chat')}
                  onClick={e => {
                    e.stopPropagation();
                    chatsTab.onTogglePin?.(chat);
                  }}
                >
                  <Pin size={13} />
                </button>
              ) : (
                chat.pinned && (
                  <span className="chat-pinned-icon" title={t('chats.pinned', 'Disematkan')}>
                    <Pin size={13} />
                  </span>
                )
              )}
              {chat.unreadCount > 0 && (
                <span
                  className="chat-unread-badge"
                  title={t('chats.unreadBadge', { count: chat.unreadCount })}
                  aria-label={t('chats.unreadBadge', { count: chat.unreadCount })}
                >
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="chats-sidebar">
      <div className="sidebar-header-box">
        {/* Header row: judul sesi + tombol fullscreen di kanan */}
        <div className="sidebar-header-row">
          <span className="sidebar-header-title">{t('nav.chats')}</span>
          <FullChatToggle />
        </div>


        {/* Chats / Channels / Status tabs */}
        <div className="chats-tabs" role="tablist">
          {(['chats', 'channels', 'status'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`chats-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onSwitchTab(tab)}
            >
              {t(`chats.tab.${tab}`)}
            </button>
          ))}
        </div>

        {/* Unified search: one box filters the lists below AND searches message bodies. */}
        <UnifiedSearch
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          onMessageHit={onMessageHit}
          currentSessionId={selectedSessionId}
        />

        {/* Compose a new status — only meaningful on the Status tab. */}
        {activeTab === 'status' && canWrite && (
          <button type="button" className="btn-primary status-compose-trigger" onClick={onComposeStatus}>
            <Plus size={16} />
            {t('chats.status.compose')}
          </button>
        )}
      </div>

      {/* Chat list */}
      {activeTab === 'chats' && (
        <div className="chats-list">
          {chatsTab.loading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
              <span>{t('chats.loadingChats')}</span>
            </div>
          ) : chatsTab.chats.length === 0 ? (
            <div className="chats-list-empty">
              <span>{t('chats.empty')}</span>
            </div>
          ) : (
            chatsTab.chats.map(renderChatRow)
          )}
        </div>
      )}

      {/* Channels list — wwjs-only (newsletter/channel API isn't implemented on Baileys, which
          throws 501 for both listing and reading). channelsQuery is gated off entirely on that
          engine, so the branch order below never depends on a request having actually run. */}
      {activeTab === 'channels' && (
        <div className="chats-list">
          {channelsTab.engineLoading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : !channelsTab.supported ? (
            <div className="chats-list-empty">
              <span>{t('chats.channels.notSupported')}</span>
            </div>
          ) : channelsTab.query.isLoading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : channelsTab.query.error ? (
            <div className="chats-list-empty">
              <AlertCircle size={24} className="text-warn" />
              <span>{t('chats.channels.notReady')}</span>
            </div>
          ) : (channelsTab.query.data?.length ?? 0) === 0 ? (
            <div className="chats-list-empty">
              <span>{t('chats.channels.empty')}</span>
            </div>
          ) : (
            channelsTab.channels.map(ch => (
              <div
                key={ch.id}
                role="button"
                tabIndex={0}
                aria-current={channelsTab.activeChannelId === ch.id ? 'true' : undefined}
                className={`chat-item-card ${channelsTab.activeChannelId === ch.id ? 'active' : ''}`}
                onClick={() => channelsTab.onSelectChannel(ch)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    channelsTab.onSelectChannel(ch);
                  }
                }}
              >
                <div className="chat-avatar">
                  <Megaphone size={20} />
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{ch.name}</span>
                  </div>
                  {ch.subscriberCount != null && (
                    <div className="chat-item-bottom">
                      <span className="chat-item-snippet">
                        {t('chats.channels.subscribers', { count: ch.subscriberCount })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Status list — per-contact status groups read from the 24h store. Not engine-gated:
          both engines now have status content. */}
      {activeTab === 'status' && (
        <div className="chats-list">
          {statusTab.loading ? (
            <div className="chats-list-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : statusTab.error ? (
            <div className="chats-list-empty">
              <AlertCircle size={24} className="text-warn" />
              <span>{t('chats.status.loadError')}</span>
            </div>
          ) : statusTab.groups.length === 0 ? (
            <div className="chats-list-empty">
              <span>{t('chats.status.empty')}</span>
            </div>
          ) : (
            statusTab.groups.map(group => (
              <div
                key={group.contact.id}
                role="button"
                tabIndex={0}
                aria-current={statusTab.activeContactId === group.contact.id ? 'true' : undefined}
                className={`chat-item-card ${statusTab.activeContactId === group.contact.id ? 'active' : ''}`}
                onClick={() => statusTab.onSelectContact(group.contact.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    statusTab.onSelectContact(group.contact.id);
                  }
                }}
              >
                <div className="chat-avatar">
                  <CircleDashed size={20} />
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-top">
                    <span className="chat-item-name">
                      {group.contact.name ?? group.contact.pushName ?? group.contact.id}
                    </span>
                    <span className="chat-item-time">
                      {formatChatTime(Math.floor(new Date(group.latest).getTime() / 1000))}
                    </span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-snippet">
                      {t('chats.status.itemCount', { count: group.items.length })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}

export default ChatSidebar;
