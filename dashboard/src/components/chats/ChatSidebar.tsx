import { useTranslation } from 'react-i18next';
import { AlertCircle, CircleDashed, Loader2, Maximize2, Megaphone, Minimize2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Channel, Chat, ContactStatusGroup, SearchHit, Session } from '../../services/api';
import ChatAvatar from './ChatAvatar';
import { UnifiedSearch } from '../UnifiedSearch';

export type ChatsTab = 'chats' | 'channels' | 'status';

interface ChatSidebarProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
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

// Fullscreen toggle button untuk area chat. Menargetkan elemen `.chats-layout`
// (sidebar + chat room) supaya hanya div chat yang memenuhi layar — seperti
// WhatsApp native di HP — tanpa menyembunyikan sidebar navigasi dashboard.
function FullChatToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggle = async () => {
    // Cari kontainer .chats-layout terdekat dari tombol ini (sidebar ada di dalamnya)
    const layoutEl = document.querySelector('.chats-layout');
    try {
      if (!document.fullscreenElement && layoutEl) {
        await layoutEl.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen API not supported or denied:', err);
      setIsFullscreen(prev => !prev);
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
  sessions,
  selectedSessionId,
  onSelectSession,
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

  const formatLastMessageSnippet = (chat: Chat) => chat.lastMessage || '';

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
            <span className="chat-item-snippet" title={formatLastMessageSnippet(chat)}>
              {formatLastMessageSnippet(chat) || <span className="no-message">{t('chats.noMessageYet')}</span>}
            </span>
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
    );
  };

  return (
    <aside className="chats-sidebar">
      <div className="sidebar-header-box">
        {/* Header row: judul sesi + tombol fullscreen di kanan */}
        <div className="sidebar-header-row">
          <span className="sidebar-header-title">{t('chats.sessionLabel')}</span>
          <FullChatToggle />
        </div>

        {/* Session selector — judul sudah dirender di header row di atas, jadi
            select cukup pakai aria-label (accessible name tanpa teks dobel). */}
        <div className="session-select-group">
          <select
            id="csb-1"
            value={selectedSessionId}
            onChange={e => onSelectSession(e.target.value)}
            className="session-selector"
            aria-label={t('chats.sessionLabel')}
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.phone || t('chats.noPhone')})
              </option>
            ))}
          </select>
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
        {activeTab === 'status' && (
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
