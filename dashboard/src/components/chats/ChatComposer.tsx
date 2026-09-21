import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Paperclip, Smile, X, MapPin, Image, Camera, FileText, Headphones, Keyboard } from 'lucide-react';
import { messageApi, type Chat, type MessageType } from '../../services/api';
import { type ChatMessageView } from '../../utils/chatMessages';
import { promoteChatWithSnippet } from '../../utils/chatList';
import { buildMediaSendPayload, buildOptimisticMetadata, quotedIdOf } from '../../utils/composerSend';
import { messagesQueryKey, useChatMessagesActions, upsertCachedMessage } from '../../hooks/useChatMessages';
import { useRole } from '../../hooks/useRole';
import { useToast } from '../../hooks/useToast';
import type { ScrollDirection } from '../../utils/scrollDecision';
import { LocationShareModal, type LocationData } from './LocationShareModal';
import { EmojiStickerPicker } from './EmojiStickerPicker';

// Map an attachment MIME type to the neutral MessageType for the optimistic outgoing bubble, so the
// placeholder matches what the backend will persist (e.g. a PDF is `document`, not `application`).
const messageTypeFromMime = (mimetype: string): MessageType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

// Client pre-check before base64-encoding an upload, same cap as the message tester: base64
// inflates ~1.33x, so ~18 MiB raw stays under the backend's default 25 MiB body limit and the
// pick fails here with a toast instead of OOMing the tab on the FileReader.
const MEDIA_UPLOAD_MAX_BYTES = 18 * 1024 * 1024;

/** A picked-but-unsent file, staged until send, removal, or a move to another chat. */

const WASendIcon = ({ size = 26, className = "wa-send-icon", style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 24 24"
    height={size}
    width={size}
    className={className}
    style={style}
    preserveAspectRatio="xMidYMid meet"
    fill="currentColor"
  >
    <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
  </svg>
);

export interface StagedAttachment {
  file: File;
  base64: string;
  mimetype: string;
  filename: string;
}

interface ChatComposerProps {
  selectedSessionId: string;
  activeChat: Chat;
  replyingTo: ChatMessageView | null;
  setReplyingTo: Dispatch<SetStateAction<ChatMessageView | null>>;
  onMessageAppended: (direction: ScrollDirection) => void;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  attachment: StagedAttachment | null;
  setAttachment: Dispatch<SetStateAction<StagedAttachment | null>>;
  previewUrl: string | null;
  setPreviewUrl: Dispatch<SetStateAction<string | null>>;
}

// The composer half of the chat room: attachment preview, emoji panel, reply banner, and the input
// bar with the whole optimistic-send flow. `replyingTo` is shared with the thread (its reply action
// sets it), and `messageInput` plus the staged attachment live in the page so a draft survives
// closing the room; everything else is local.
function ChatComposer({
  selectedSessionId,
  activeChat,
  replyingTo,
  setReplyingTo,
  onMessageAppended,
  setChats,
  messageInput,
  setMessageInput,
  attachment,
  setAttachment,
  previewUrl,
  setPreviewUrl,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const { canWrite } = useRole();
  const { error: showErrorToast } = useToast();
  const { appendMessage, updateMessage } = useChatMessagesActions();
  const queryClient = useQueryClient();

  const [sending, setSending] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  // Monotonic token invalidating an in-flight attachment FileReader: picking a second file (or
  // removing the attachment) before `onload` fires must win over the late-arriving bytes —
  // otherwise the slower read overwrites the newer pick. Same pattern as composeImageReadSeq.
  const attachmentReadSeq = useRef(0);

  // Leaving this conversation — switching to another chat, or unmounting when the room closes —
  // invalidates an in-flight read, so its late `onload` drops the bytes instead of staging them
  // against whichever chat is open by then. The attachment state itself lives in the page.
  useEffect(() => {
    return () => {
      attachmentReadSeq.current += 1;
    };
  }, [activeChat.id]);

  // References
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // 5. Handle file selection & base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a rejection or removal
    if (!file) return;

    // Reject before base64-encoding: an oversized pick would inflate ~1.33x into the backend body
    // cap, and the 413 only applies after the whole body is uploaded — surface the toast now.
    if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
      showErrorToast(t('chats.errors.fileTooLarge'));
      return;
    }

    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    const myRead = ++attachmentReadSeq.current;
    const reader = new FileReader();
    reader.onload = event => {
      // A newer pick, a removal, or an unmount since the read started supersedes these bytes.
      if (attachmentReadSeq.current !== myRead) return;
      const dataUrl = event.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setAttachment({ file, base64: base64Data, mimetype: file.type, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    attachmentReadSeq.current += 1; // an in-flight read must not resurrect the removed attachment
    setAttachment(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePickMediaType = (type: 'gallery' | 'camera' | 'document' | 'audio') => {
    setShowAttachMenu(false);
    if (!fileInputRef.current) return;
    if (type === 'gallery') {
      fileInputRef.current.accept = 'image/*,video/*';
      fileInputRef.current.removeAttribute('capture');
    } else if (type === 'camera') {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.setAttribute('capture', 'environment');
    } else if (type === 'document') {
      fileInputRef.current.accept = '*/*';
      fileInputRef.current.removeAttribute('capture');
    } else if (type === 'audio') {
      fileInputRef.current.accept = 'audio/*';
      fileInputRef.current.removeAttribute('capture');
    }
    fileInputRef.current.click();
  };

  const toggleAttachMenu = () => {
    setShowEmojiPicker(false);
    setShowAttachMenu(prev => !prev);
  };

  const toggleEmojiPicker = () => {
    setShowAttachMenu(false);
    setShowEmojiPicker(prev => {
      const next = !prev;
      if (!next) {
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  const handleEmojiClick = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  const handleSendSticker = async (base64: string, mimetype: string) => {
    if (sending || !canWrite) return;
    setSending(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tempMessage: ChatMessageView = {
      id: tempId,
      chatId: activeChat.id,
      from: 'me',
      to: activeChat.id,
      body: '',
      type: 'sticker',
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: {
        media: {
          mimetype: mimetype || 'image/webp',
          data: base64,
          filename: 'sticker.webp',
        },
      },
    };

    appendMessage(selectedSessionId, activeChat.id, tempMessage);
    onMessageAppended('outgoing');
    setShowEmojiPicker(false);

    try {
      const result = await messageApi.sendSticker(selectedSessionId, activeChat.id, {
        base64,
        mimetype: mimetype || 'image/webp',
      });

      const sendKey = messagesQueryKey(selectedSessionId, activeChat.id);
      const reconciled: ChatMessageView = {
        ...tempMessage,
        id: result.messageId,
        waMessageId: result.messageId,
        status: 'sent',
      };
      upsertCachedMessage(queryClient, sendKey, reconciled, { dropId: tempId });

      const snippet = '🏷️ ' + t('chats.media.sticker', 'Sticker');
      const sentAt = Math.floor(Date.now() / 1000);
      setChats(prevChats => promoteChatWithSnippet(prevChats, activeChat.id, snippet, sentAt));
    } catch (err) {
      showErrorToast(t('chats.errors.send'), err instanceof Error ? err.message : undefined);
      updateMessage(selectedSessionId, activeChat.id, tempId, { status: 'failed' });
    } finally {
      setSending(false);
    }
  };

  // 7. Handle sending a message / media
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSessionId || !activeChat || sending) return;

    const textToSend = messageInput.trim();
    if (!textToSend && !attachment) return;

    setMessageInput('');
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const tempMessage: ChatMessageView = {
      id: tempId,
      chatId: activeChat.id,
      from: 'me',
      to: activeChat.id,
      body: attachment
        ? attachment.mimetype.startsWith('image/') ||
          attachment.mimetype.startsWith('video/') ||
          attachment.mimetype.startsWith('audio/')
          ? textToSend
          : attachment.filename
        : textToSend,
      type: attachment ? messageTypeFromMime(attachment.mimetype) : 'text',
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: buildOptimisticMetadata(attachment, replyingTo),
    };

    appendMessage(selectedSessionId, activeChat.id, tempMessage);
    onMessageAppended('outgoing');

    const currentAttachment = attachment;
    const currentReplyingTo = replyingTo;
    handleRemoveAttachment();
    setReplyingTo(null);

    try {
      let result;

      if (currentAttachment) {
        let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
        const mime = currentAttachment.mimetype;
        if (mime.startsWith('image/')) mediaType = 'image';
        else if (mime.startsWith('video/')) mediaType = 'video';
        else if (mime.startsWith('audio/')) mediaType = 'audio';

        // A reply that carries an attachment takes this branch, so the quote has to travel with the
        // media — the `else if` below never sees it.
        result = await messageApi.sendMedia(
          selectedSessionId,
          activeChat.id,
          mediaType,
          buildMediaSendPayload(currentAttachment, mediaType !== 'audio' ? textToSend : undefined, currentReplyingTo),
        );
      } else if (currentReplyingTo) {
        result = await messageApi.reply(selectedSessionId, {
          chatId: activeChat.id,
          quotedMessageId: quotedIdOf(currentReplyingTo)!,
          text: textToSend,
        });
      } else {
        result = await messageApi.sendText(selectedSessionId, activeChat.id, textToSend);
      }

      // Race guard: the realtime `message.sent` echo can arrive before this response and already
      // append the message by its real WA id (the dedup at receive time misses because the
      // optimistic placeholder still carries the temp id). If so, fold the placeholder INTO the
      // echo's row via mergeOrAppend instead of just dropping it — the echo may carry no media
      // payload (a Baileys API send echoes only a marker), so dropping the placeholder would erase
      // the attachment's base64 and leave a bare "📎 Media" bubble until the next refetch.
      const sendKey = messagesQueryKey(selectedSessionId, activeChat.id);
      const reconciled: ChatMessageView = {
        ...tempMessage,
        id: result.messageId,
        waMessageId: result.messageId,
        status: 'sent',
      };
      upsertCachedMessage(queryClient, sendKey, reconciled, { dropId: tempId });

      // Update sidebar chat list (move active chat to the top with the new snippet)
      const snippet = currentAttachment ? `[${currentAttachment.mimetype.split('/')[0]}]` : textToSend;
      const sentAt = Math.floor(Date.now() / 1000);
      setChats(prevChats => promoteChatWithSnippet(prevChats, activeChat.id, snippet, sentAt));
    } catch (err) {
      showErrorToast(t('chats.errors.send'), err instanceof Error ? err.message : undefined);
      updateMessage(selectedSessionId, activeChat.id, tempId, { status: 'failed' });
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = async (loc: LocationData) => {
    if (!canWrite || sending) return;
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const tempMessage: ChatMessageView = {
      id: tempId,
      chatId: activeChat.id,
      from: 'me',
      to: activeChat.id,
      body: loc.description || loc.address || `${loc.latitude}, ${loc.longitude}`,
      type: 'location',
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      timestamp: Math.floor(Date.now() / 1000),
      metadata: {
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          description: loc.description,
          address: loc.address,
        },
      },
    };

    appendMessage(selectedSessionId, activeChat.id, tempMessage);
    onMessageAppended('outgoing');
    setShowLocationModal(false);

    try {
      const result = await messageApi.sendLocation(selectedSessionId, {
        chatId: activeChat.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        description: loc.description,
        address: loc.address,
      });

      const sendKey = messagesQueryKey(selectedSessionId, activeChat.id);
      const reconciled: ChatMessageView = {
        ...tempMessage,
        id: result.messageId,
        waMessageId: result.messageId,
        status: 'sent',
      };
      upsertCachedMessage(queryClient, sendKey, reconciled, { dropId: tempId });

      const snippet = `📍 ${loc.description || t('chats.media.location', 'Location')}`;
      const sentAt = Math.floor(Date.now() / 1000);
      setChats(prevChats => promoteChatWithSnippet(prevChats, activeChat.id, snippet, sentAt));
    } catch (err) {
      showErrorToast(t('chats.errors.send'), err instanceof Error ? err.message : undefined);
      updateMessage(selectedSessionId, activeChat.id, tempId, { status: 'failed' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Attachment preview banner */}
      {attachment && (
        <div className="attachment-preview-banner">
          {previewUrl ? (
            <img src={previewUrl} alt={attachment.filename} className="preview-thumbnail" />
          ) : (
            <div className="preview-file-icon">📎</div>
          )}
          <div className="preview-file-info">
            <span className="preview-filename">{attachment.filename}</span>
            <span className="preview-filesize">({(attachment.file.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button className="btn-remove-attachment" onClick={handleRemoveAttachment}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Attachment Tray (WhatsApp Native Style) */}
      {showAttachMenu && (
        <div className="chats-attach-tray">
          <div className="attach-tray-handle" />
          <div className="attach-tray-grid">
            <button
              type="button"
              className="attach-item"
              onClick={() => handlePickMediaType('gallery')}
              disabled={!canWrite || sending}
            >
              <div className="attach-icon-circle attach-gallery">
                <Image size={24} />
              </div>
              <span className="attach-label">{t('chats.media.gallery', 'Galeri')}</span>
            </button>

            <button
              type="button"
              className="attach-item"
              onClick={() => handlePickMediaType('camera')}
              disabled={!canWrite || sending}
            >
              <div className="attach-icon-circle attach-camera">
                <Camera size={24} />
              </div>
              <span className="attach-label">{t('chats.media.camera', 'Kamera')}</span>
            </button>

            <button
              type="button"
              className="attach-item"
              onClick={() => {
                setShowAttachMenu(false);
                setShowLocationModal(true);
              }}
              disabled={!canWrite || sending}
            >
              <div className="attach-icon-circle attach-location">
                <MapPin size={24} />
              </div>
              <span className="attach-label">{t('chats.media.location', 'Lokasi')}</span>
            </button>

            <button
              type="button"
              className="attach-item"
              onClick={() => handlePickMediaType('document')}
              disabled={!canWrite || sending}
            >
              <div className="attach-icon-circle attach-document">
                <FileText size={24} />
              </div>
              <span className="attach-label">{t('chats.media.document', 'Dokumen')}</span>
            </button>

            <button
              type="button"
              className="attach-item"
              onClick={() => handlePickMediaType('audio')}
              disabled={!canWrite || sending}
            >
              <div className="attach-icon-circle attach-audio">
                <Headphones size={24} />
              </div>
              <span className="attach-label">{t('chats.media.audio', 'Audio')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Replying preview banner */}
      {replyingTo && (
        <div className="replying-preview-banner">
          <div className="replying-preview-content">
            <div className="replying-to-title">
              {t('chats.replyingTo', {
                name:
                  replyingTo.direction === 'outgoing' ? t('chats.you') : activeChat.name || activeChat.id.split('@')[0],
              })}
            </div>
            <div className="replying-to-body">
              {replyingTo.type !== 'text' ? `[${replyingTo.type}]` : replyingTo.body}
            </div>
          </div>
          <button className="btn-close-reply" onClick={() => setReplyingTo(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Message input bar */}
      <footer className="room-input-footer">
        <form onSubmit={handleSend} className="input-form">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

          <button
            type="button"
            onClick={toggleEmojiPicker}
            disabled={!canWrite || sending}
            className={`btn-input-accessory ${showEmojiPicker ? 'active' : ''}`}
            title={showEmojiPicker ? 'Tampilkan Keyboard' : t('chats.emojiTitle')}
          >
            {showEmojiPicker ? <Keyboard size={24} strokeWidth={2.2} /> : <Smile size={24} strokeWidth={2.2} />}
          </button>

          <input
            ref={textInputRef}
            type="text"
            placeholder={
              canWrite
                ? attachment
                  ? t('chats.captionPlaceholder')
                  : t('chats.messagePlaceholder')
                : t('chats.noPermission')
            }
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            disabled={!canWrite || sending}
            className="message-text-input"
          />

          <button
            type="button"
            onClick={toggleAttachMenu}
            disabled={!canWrite || sending}
            className={`btn-input-accessory ${showAttachMenu ? 'active' : ''}`}
            title={t('chats.attachTitle')}
          >
            <Paperclip size={24} strokeWidth={2.2} />
          </button>

          <button
            type="submit"
            disabled={!canWrite || (!messageInput.trim() && !attachment) || sending}
            className="btn-send-message"
            aria-label={t('chats.send')}
          >
            {sending ? <Loader2 className="animate-spin" size={24} /> : <WASendIcon size={26} style={{ marginLeft: 2 }} />}
          </button>
        </form>
      </footer>

      {/* WhatsApp Native Emoji & Sticker Drawer (docked below the input bar like a soft keyboard) */}
      {showEmojiPicker && (
        <EmojiStickerPicker
          onSelectEmoji={handleEmojiClick}
          onSendSticker={handleSendSticker}
          onClose={() => setShowEmojiPicker(false)}
          disabled={!canWrite || sending}
        />
      )}

      <LocationShareModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSend={handleSendLocation}
        sending={sending}
      />
    </>
  );
}

export default ChatComposer;
