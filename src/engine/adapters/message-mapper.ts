import { EditedMessage, IncomingMessage, MessageContact, MessageType } from '../interfaces/whatsapp-engine.interface';
import type { SerializedWid } from '../types/whatsapp-web-js.types';
import { chatKind } from '../identity/wa-id';

/**
 * Map a whatsapp-web.js `MessageTypes` token to the engine-neutral {@link MessageType}, so no
 * consumer outside the adapter sees wwebjs-specific type strings. Notably `chat` -> `text` (aligning
 * incoming with the neutral types outgoing sends already use) and `ptt` -> `voice`. Anything not
 * mapped becomes `unknown`.
 */
export function mapWwebjsMessageType(raw: string, msg?: RawMessageFields): MessageType {
  switch (raw) {
    // Besides plain `chat`, a tapped button, list row or template button: WA Web carries the chosen
    // option's text in the body, and Baileys reports the same replies as `text` (#562). `hsm` and
    // `interactive` prompts are left out: their body can be empty, and an empty text is worse than
    // `unknown`.
    case 'chat':
    case 'buttons_response':
    case 'list_response':
    case 'template_button_reply':
      return 'text';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'ptt':
      return 'voice';
    case 'document':
      return 'document';
    case 'sticker':
      return 'sticker';
    case 'location':
      return 'location';
    case 'vcard':
    case 'multi_vcard':
      return 'contact';
    case 'call_log':
      return 'call';
    case 'poll_creation':
      return 'poll';
    case 'revoked':
      return 'revoked';
    case 'order':
      return 'order';
    case 'product':
      return 'product';
    case 'interactive':
    case 'native_flow':
      if (msg) {
        const d = msg._data as Record<string, any> | undefined;
        if (
          d?.nativeFlowName === 'order_details' ||
          d?.interactivePayload?.buttons?.some((b: any) => b?.name === 'review_and_pay') ||
          msg.orderId ||
          d?.orderId
        ) {
          return 'order';
        }
      }
      return 'text';
    case 'buttons_response':
    case 'list_response':
    case 'template_button_reply':
      // WhatsApp Business interactive shapes carry display text; flatten to text like Baileys (#562)
      return 'text';
    default:
      return 'unknown';
  }
}

/**
 * The subset of whatsapp-web.js `Message` fields we read synchronously to build
 * the base of an {@link IncomingMessage}. Declared explicitly so the mapping is
 * unit-testable without constructing a full wwebjs `Message`.
 */
export interface RawMessageFields {
  /**
   * Typed as the raw wid rather than `{ _serialized: string }`: a WA Web build that renamed the field
   * to `$1` (#747) leaves `_serialized` undefined, and the old type made that state unrepresentable —
   * so `$1` could not even be read without a cast, and the unsound `id: string` it fed was `undefined`
   * at runtime on every inbound message.
   */
  id: SerializedWid;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  fromMe: boolean;
  /** Set on group messages: the participant WID that actually sent the message. */
  author?: string;
  /** WIDs @mentioned in the message; whatsapp-web.js attaches this to every Message. */
  mentionedIds?: string[];
  _data?: {
    notifyName?: string;
    ephemeralDuration?: number;
    lat?: number | string;
    lng?: number | string;
    loc?: string;
    clientUrl?: string;
    nativeFlowName?: string;
    interactiveType?: string;
    interactiveHeader?: {
      thumbnail?: string;
      title?: string;
      hasMediaAttachment?: boolean;
    };
    interactiveBody?: {
      text?: string;
    };
    interactivePayload?: {
      buttons?: Array<{
        name?: string;
        buttonParamsJson?: string | Record<string, unknown>;
      }>;
    };
    orderId?: string;
    token?: string;
    orderTitle?: string;
    itemCount?: number;
    total?: number | string;
    subtotal?: number | string;
    currency?: string;
    sellerJid?: string;
    thumbnail?: string;
    [key: string]: unknown;
  };
  /** Location payload on location-typed messages. */
  location?: {
    latitude: number | string;
    longitude: number | string;
    description?: string;
    address?: string;
    url?: string;
  };
  orderId?: string;
  token?: string;
  /** Set on `product` messages: the shared catalog product. */
  productId?: string;
  /** Product title / description. whatsapp-web.js exposes these only for a product card. */
  title?: string;
  description?: string;
  /** The catalog owner's JID, on a shared product card. */
  businessOwnerJid?: string;
}

export interface WwebjsOrderItem {
  name: string;
  quantity: number;
  price?: number;
  retailerId?: string;
}

export interface WwebjsOrderInfo {
  orderId: string;
  token?: string;
  title?: string;
  currency?: string;
  total?: number | string;
  subtotal?: number | string;
  itemCount?: number;
  status?: string;
  thumbnail?: string;
  items?: WwebjsOrderItem[];
}

interface RawOrderItem {
  retailer_id?: string;
  name?: string;
  amount?: { value?: number; offset?: number };
  price?: number;
  quantity?: number;
}

interface RawOrderParams {
  reference_id?: string;
  order_request_id?: string;
  currency?: string;
  total_amount?: { value?: number; offset?: number };
  total?: number | string;
  order?: {
    status?: string;
    items?: RawOrderItem[];
    subtotal?: { value?: number; offset?: number };
  };
  subtotal?: number | string;
}

/**
 * Extract WhatsApp Business order details from either standard order messages or modern
 * interactive native-flow order_details payloads.
 */
export function extractWwebjsOrder(msg: RawMessageFields): WwebjsOrderInfo | undefined {
  const d = msg._data;
  const isOrderRaw =
    msg.type === 'order' ||
    d?.nativeFlowName === 'order_details' ||
    Boolean(msg.orderId) ||
    Boolean(d?.orderId);

  const buttons = d?.interactivePayload?.buttons;
  let parsedParams: RawOrderParams | null = null;
  if (Array.isArray(buttons)) {
    const reviewBtn = buttons.find((b) => b?.name === 'review_and_pay' || Boolean(b?.buttonParamsJson));
    if (reviewBtn?.buttonParamsJson) {
      if (typeof reviewBtn.buttonParamsJson === 'string') {
        try {
          parsedParams = JSON.parse(reviewBtn.buttonParamsJson) as RawOrderParams;
        } catch {
          // unparseable json
        }
      } else if (typeof reviewBtn.buttonParamsJson === 'object') {
        parsedParams = reviewBtn.buttonParamsJson as RawOrderParams;
      }
    }
  }

  if (parsedParams) {
    const items = Array.isArray(parsedParams.order?.items)
      ? parsedParams.order.items.map((item) => {
          const qty = typeof item.quantity === 'number' ? item.quantity : 1;
          const rawVal = item.amount?.value != null ? item.amount.value : item.price;
          const offset = item.amount?.offset || 1;
          const price = rawVal != null ? (offset > 1 ? rawVal / offset : rawVal) : undefined;
          return {
            name: item.name || 'Produk',
            quantity: qty,
            price,
            retailerId: item.retailer_id,
          };
        })
      : undefined;

    const totalRaw = parsedParams.total_amount?.value != null ? parsedParams.total_amount.value : parsedParams.total;
    const totalOffset = parsedParams.total_amount?.offset || 1;
    const total =
      totalRaw != null
        ? typeof totalRaw === 'number' && totalOffset > 1
          ? totalRaw / totalOffset
          : totalRaw
        : (d?.total as number | string | undefined);

    const subtotalRaw =
      parsedParams.order?.subtotal?.value != null ? parsedParams.order.subtotal.value : parsedParams.subtotal;
    const subtotalOffset = parsedParams.order?.subtotal?.offset || 1;
    const subtotal =
      subtotalRaw != null
        ? typeof subtotalRaw === 'number' && subtotalOffset > 1
          ? subtotalRaw / subtotalOffset
          : subtotalRaw
        : (d?.subtotal as number | string | undefined);

    const orderId =
      parsedParams.reference_id ||
      parsedParams.order_request_id ||
      (d?.orderId as string | undefined) ||
      msg.orderId ||
      '';

    const result: WwebjsOrderInfo = {
      orderId,
      currency: parsedParams.currency || (d?.currency as string | undefined) || 'IDR',
      itemCount: items?.length || (d?.itemCount as number | undefined) || 1,
    };
    if (parsedParams.order?.status) result.status = parsedParams.order.status;
    if (total != null) result.total = total;
    if (subtotal != null) result.subtotal = subtotal;
    if (items) result.items = items;
    const thumb = d?.interactiveHeader?.thumbnail || (d?.thumbnail as string | undefined);
    if (thumb) result.thumbnail = thumb;
    return result;
  }

  if (isOrderRaw || msg.orderId || d?.orderId) {
    const orderId = msg.orderId || (d?.orderId as string | undefined) || '';
    if (!orderId && !d?.orderTitle && !msg.title) {
      return undefined;
    }
    const result: WwebjsOrderInfo = { orderId };
    const token = msg.token || (d?.token as string | undefined);
    if (token) result.token = token;
    const title =
      (typeof msg.title === 'string' ? msg.title : '') ||
      (d?.orderTitle as string | undefined) ||
      (d?.title as string | undefined);
    if (title) result.title = title;
    if (typeof d?.itemCount === 'number') result.itemCount = d.itemCount;
    if (d?.total != null) result.total = d.total as number | string;
    if (d?.subtotal != null) result.subtotal = d.subtotal as number | string;
    if (d?.currency) result.currency = d.currency as string;
    const thumb = d?.thumbnail as string | undefined;
    if (thumb) result.thumbnail = thumb;
    return result;
  }

  return undefined;
}

/**
 * Extract display text from wwebjs message, recovering text from interactive / order shapes
 * when msg.body is empty (#562).
 */
export function extractWwebjsBody(msg: RawMessageFields): string {
  if (typeof msg.body === 'string' && msg.body.trim().length > 0) {
    return msg.body;
  }

  const orderDetails = extractWwebjsOrder(msg);
  if (orderDetails) {
    const parts: string[] = [];
    if (orderDetails.items && orderDetails.items.length > 0) {
      const itemsList = orderDetails.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      parts.push(itemsList);
    } else if (orderDetails.title) {
      parts.push(orderDetails.title);
    }
    if (orderDetails.total != null) {
      const cur = orderDetails.currency || 'IDR';
      const formattedTotal =
        typeof orderDetails.total === 'number'
          ? orderDetails.total.toLocaleString('id-ID')
          : String(orderDetails.total);
      parts.push(`Total: ${cur} ${formattedTotal}`);
    }
    if (parts.length > 0) {
      return `Pesanan: ${parts.join(' • ')}`;
    }
    if (orderDetails.orderId) {
      return `Pesanan #${orderDetails.orderId}`;
    }
  }

  const d = msg._data as Record<string, unknown> | undefined;
  if (!d) {
    return (
      (typeof msg.title === 'string' ? msg.title : '') ||
      (typeof msg.description === 'string' ? msg.description : '')
    );
  }

  // 1. Interactive message body text
  const interactiveBody = d.interactiveBody as { text?: string } | undefined;
  if (typeof interactiveBody?.text === 'string' && interactiveBody.text.trim().length > 0) {
    return interactiveBody.text.trim();
  }
  // 2. Interactive header title
  const interactiveHeader = d.interactiveHeader as { title?: string } | undefined;
  if (typeof interactiveHeader?.title === 'string' && interactiveHeader.title.trim().length > 0) {
    return interactiveHeader.title.trim();
  }
  // 3. Order title or message
  if (typeof d.orderTitle === 'string' && d.orderTitle.trim().length > 0) {
    return d.orderTitle.trim();
  }
  if (typeof d.message === 'string' && d.message.trim().length > 0) {
    return d.message.trim();
  }
  // 4. Caption / title / description fallbacks
  if (typeof d.caption === 'string' && d.caption.trim().length > 0) {
    return d.caption.trim();
  }
  if (typeof d.title === 'string' && d.title.trim().length > 0) {
    return d.title.trim();
  }
  if (typeof d.description === 'string' && d.description.trim().length > 0) {
    return d.description.trim();
  }
  if (typeof msg.title === 'string' && msg.title.trim().length > 0) {
    return msg.title.trim();
  }
  if (typeof msg.description === 'string' && msg.description.trim().length > 0) {
    return msg.description.trim();
  }
  return '';
}

/**
 * Build the synchronous base of an IncomingMessage from a raw wwebjs message.
 * Async enrichment (media, quoted message, saved-contact name) is layered on by
 * the adapter; this covers the fields available without an await.
 */
export function buildIncomingMessageBase(msg: RawMessageFields): IncomingMessage {
  // For an outgoing (fromMe) message `from` is the account's own JID and `to` is the conversation;
  // for an incoming message it's the reverse. So the chat is `to` when fromMe, else `from`.
  const chatId = msg.fromMe ? msg.to : msg.from;
  const body = extractWwebjsBody(msg);
  const incoming: IncomingMessage = {
    // Read `$1` before giving up, as the send/ack/status paths do (#762/#765/#773). This runs on the
    // LIVE inbound path (`onMessage`/`onMessageCreate`), so on a renamed build without the build-time
    // backport every arriving message otherwise carries `id: undefined`. The empty sentinel means
    // "received, id unreadable" and is normalized to NULL where it is persisted — never to `''`, which
    // the non-partial (sessionId, waMessageId) unique index would collide the second such message on.
    id: msg.id._serialized ?? msg.id.$1 ?? '',
    from: msg.from,
    to: msg.to,
    chatId,
    body,
    type: mapWwebjsMessageType(msg.type, msg),
    timestamp: msg.timestamp,
    fromMe: msg.fromMe,
    isGroup: chatId.endsWith('@g.us'),
    kind: chatKind(chatId),
    // Flag status/story broadcasts here (the engine-specific `status@broadcast` pseudo-JID stays in
    // the adapter) so engine-neutral code can skip them without matching the literal.
    isStatusBroadcast: msg.to === 'status@broadcast' || chatId === 'status@broadcast',
  };

  // In a group, `from` is the group JID, so `author` is the only way to know the real sender.
  if (msg.author) {
    incoming.author = msg.author;
  }

  // @mentioned WIDs, when present — used for command targeting (e.g. `/tr grant @user`).
  if (msg.mentionedIds && msg.mentionedIds.length > 0) {
    incoming.mentionedIds = msg.mentionedIds;
  }

  // Flag senders identified by a WhatsApp privacy id (`@lid`) so engine-neutral code can opt to
  // resolve a phone number without matching the engine-specific JID scheme itself (#263).
  const senderJid = msg.author ?? msg.from;
  if (senderJid.endsWith('@lid')) {
    incoming.isLidSender = true;
  }

  // Push name is available synchronously on the raw payload — no contact lookup needed.
  const pushName = msg._data?.notifyName;
  if (pushName) {
    incoming.contact = { pushName };
  }

  // Ephemeral/disappearing-messages timer, when the chat has one set.
  if (msg._data?.ephemeralDuration && msg._data.ephemeralDuration > 0) {
    incoming.ephemeralDuration = msg._data.ephemeralDuration;
  }

  // Commerce ids, keyed off the mapped type so a stray `title` on some other message shape cannot
  // fabricate a product. Without the id neither entry is actionable, so both are then left unset.
  if (incoming.type === 'order') {
    const orderDetails = extractWwebjsOrder(msg);
    if (orderDetails && (orderDetails.orderId || (orderDetails.items && orderDetails.items.length > 0))) {
      incoming.order = orderDetails;
    } else if (msg.orderId) {
      incoming.order = { orderId: msg.orderId, ...(msg.token ? { token: msg.token } : {}) };
    }
  } else if (incoming.type === 'product' && msg.productId) {
    incoming.product = {
      productId: msg.productId,
      ...(msg.title ? { title: msg.title } : {}),
      ...(msg.description ? { description: msg.description } : {}),
      ...(msg.businessOwnerJid ? { businessOwnerJid: msg.businessOwnerJid } : {}),
    };
  }

  // Location mapping (static or pin location)
  if (incoming.type === 'location') {
    if (msg.location) {
      incoming.location = {
        latitude: Number(msg.location.latitude),
        longitude: Number(msg.location.longitude),
        description: msg.location.description || undefined,
        address: msg.location.address || undefined,
        url: msg.location.url || undefined,
      };
    } else if (msg._data && (typeof msg._data.lat === 'number' || typeof msg._data.lat === 'string')) {
      const locLines = typeof msg._data.loc === 'string' ? msg._data.loc.split('\n') : [];
      incoming.location = {
        latitude: Number(msg._data.lat),
        longitude: Number(msg._data.lng),
        description: locLines[0] || undefined,
        address: locLines[1] || undefined,
        url: msg._data.clientUrl || undefined,
      };
    }
  }

  return incoming;
}

/**
 * Project an engine-neutral message base into the public edit-event contract. Keeping this projection
 * shared prevents the two adapters from drifting on identity, direction, group, type, or filter fields.
 */
export function buildEditedMessage(message: IncomingMessage, hasMedia: boolean): EditedMessage {
  return {
    messageId: message.id,
    chatId: message.chatId,
    body: message.body,
    senderId: message.author ?? message.from,
    from: message.from,
    to: message.to,
    fromMe: message.fromMe,
    isGroup: message.isGroup,
    type: message.type,
    hasMedia,
    ...(message.author ? { author: message.author } : {}),
    ...(message.mentionedIds ? { mentionedIds: message.mentionedIds } : {}),
    timestamp: message.timestamp,
  };
}

/**
 * The subset of whatsapp-web.js `Contact` properties we read synchronously (already on the resolved
 * contact, no network call). Declared explicitly so {@link mapContactFields} is unit-testable without a
 * full wwebjs `Contact`, and so the async getters stay out by construction.
 */
export interface RawContactFields {
  id?: { _serialized?: string };
  number?: string;
  name?: string;
  pushname?: string;
  shortName?: string;
  type?: string;
  isMyContact?: boolean;
  isWAContact?: boolean;
  isBusiness?: boolean;
  isEnterprise?: boolean;
  verifiedName?: string;
  verifiedLevel?: number;
  isBlocked?: boolean;
  labels?: string[];
}

/**
 * Map the synchronous fields of a wwebjs `Contact` to a {@link MessageContact}, copying only the values
 * that are set. No network calls, which on a per-message path would risk rate-limiting.
 *
 * With `full` false (the default) it returns just `name`/`pushName`, the long-standing payload. With
 * `full` true (operator opt-in via `WEBHOOK_CONTACT_DETAILS`) it returns the complete field set.
 */
export function mapContactFields(contact: RawContactFields, full = false): MessageContact {
  const out: MessageContact = {};
  if (contact.name) out.name = contact.name;
  if (contact.pushname) out.pushName = contact.pushname;
  if (!full) return out;
  const id = contact.id?._serialized;
  if (id) out.id = id;
  if (contact.number) out.number = contact.number;
  if (contact.shortName) out.shortName = contact.shortName;
  if (contact.type) out.type = contact.type;
  if (contact.isMyContact !== undefined) out.isMyContact = contact.isMyContact;
  if (contact.isWAContact !== undefined) out.isWAContact = contact.isWAContact;
  if (contact.isBusiness !== undefined) out.isBusiness = contact.isBusiness;
  if (contact.isEnterprise !== undefined) out.isEnterprise = contact.isEnterprise;
  if (contact.verifiedName) out.verifiedName = contact.verifiedName;
  if (contact.verifiedLevel !== undefined) out.verifiedLevel = contact.verifiedLevel;
  if (contact.isBlocked !== undefined) out.isBlocked = contact.isBlocked;
  if (contact.labels && contact.labels.length > 0) out.labels = contact.labels;
  return out;
}
