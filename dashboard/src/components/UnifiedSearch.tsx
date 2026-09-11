import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import { searchApi } from '../services/api';
import type { SearchHit } from '../services/api';
import { buildSearchParams, renderHighlightedSnippet } from '../utils/search-highlight';
import './UnifiedSearch.css';

interface UnifiedSearchProps {
  /** Controlled query — the same string that filters the sidebar lists (chats/channels/status). */
  query: string;
  onQueryChange: (query: string) => void;
  /** Called when the user clicks a message hit — the parent navigates to that chat/message. */
  onMessageHit: (hit: SearchHit) => void;
  /** Scope message search to this session (the sidebar's selected session). */
  currentSessionId?: string;
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

/**
 * api.ts throws plain Errors carrying the HTTP status (handleErrorResponse), so classify failures
 * by narrowing with `in` rather than casting: a 501 means no search provider is configured, which
 * is a configuration state worth wording differently from a genuine server error.
 */
function errorStatus(err: unknown): number | undefined {
  if (err instanceof Error && 'status' in err && typeof err.status === 'number') return err.status;
  return undefined;
}

/**
 * The single search box of the Chats sidebar. One query drives two things at once:
 *  - the sidebar lists filter client-side (the page owns that, via onQueryChange), and
 *  - message bodies are searched server-side (GET /api/search, debounced) and offered as a
 *    dropdown of hits that jump to the matching chat and message.
 * Replaces the former pair of boxes (header "Search messages" + sidebar "Search chats").
 */
export function UnifiedSearch({ query, onQueryChange, onMessageHit, currentSessionId }: UnifiedSearchProps) {
  const { t } = useTranslation();
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const blurRef = useRef<number | undefined>(undefined);

  const run = useCallback(
    async (offset: number, append: boolean) => {
      const params = buildSearchParams(
        query,
        currentSessionId ? { sessionId: currentSessionId } : undefined,
        { limit: PAGE_SIZE, offset },
      );
      if (!params) {
        setHits([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchApi.search(params);
        setHits(prev => (append ? [...prev, ...res.hits] : res.hits));
        setTotal(res.total);
      } catch (err: unknown) {
        setError(errorStatus(err) === 501 ? t('search.unavailable') : t('search.error'));
        setHits([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [query, currentSessionId, t],
  );

  // Debounce the server round-trip; the list filtering above happens immediately on every keystroke.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setHits([]);
      setTotal(0);
      setError(null);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      setOpen(true);
      void run(0, false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, run]);

  // Clear any pending blur timeout on unmount so it can't fire setState after teardown.
  useEffect(() => {
    return () => clearTimeout(blurRef.current);
  }, []);

  return (
    <div className="unified-search">
      <div className="unified-search-input">
        <Search size={18} />
        <input
          type="text"
          placeholder={t('search.unifiedPlaceholder')}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onBlur={() => {
            blurRef.current = window.setTimeout(() => setOpen(false), 150);
          }}
          aria-label={t('search.unifiedPlaceholder')}
        />
      </div>
      {open && query.trim() && (
        <div className="unified-search-results" role="listbox">
          {loading && (
            <div className="unified-search-state">
              <Loader2 className="animate-spin" size={16} />
              <span>{t('search.loading')}</span>
            </div>
          )}
          {!loading && error && <div className="unified-search-state">{error}</div>}
          {!loading && !error && hits.length === 0 && <div className="unified-search-state">{t('search.empty')}</div>}
          {!loading &&
            !error &&
            hits.map(h => (
              <button
                key={h.messageId}
                className="unified-search-hit"
                role="option"
                onMouseDown={() => {
                  onMessageHit(h);
                  setOpen(false);
                }}
              >
                <div className="unified-search-hit-meta">
                  {h.chatId} · {new Date(h.timestamp * 1000).toLocaleString()}
                </div>
                <div className="unified-search-hit-snippet">
                  {renderHighlightedSnippet(h.snippet).map((seg, i) =>
                    seg.marked ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
                  )}
                </div>
              </button>
            ))}
          {!loading && !error && hits.length > 0 && hits.length < total && (
            <button className="unified-search-more" onClick={() => void run(hits.length, true)}>
              {t('search.results', { count: total })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
