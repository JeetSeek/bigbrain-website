import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import { getCachedData, setCachedData } from '../utils/cacheUtils';
import { useDebounce } from '../utils/useDebounce';
import { UI, CACHE, TIME } from '../utils/constants';
import http from '../utils/http';

// Toast notification display time
const TOAST_DISPLAY_TIME = 3 * TIME.SECOND;
const TOAST_ANIMATION_TIME = 300; // milliseconds

// Toast notification component
const Toast = ({ message, type = 'success', onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, TOAST_ANIMATION_TIME); // Allow exit animation to play
    }, TOAST_DISPLAY_TIME);

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div
      className={`toast-pro ${visible ? 'visible' : ''} ${
        type === 'success' ? 'toast-pro-success' : type === 'error' ? 'toast-pro-error' : 'toast-pro-info'
      }`}
    >
      <span className="text-lg">{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <p className="text-pro-body">{message}</p>
    </div>,
    document.body
  );
};

// Row component for virtualized manufacturer list
const ManufacturerRow = ({ index, style, data }) => {
  const { items, selectedItem, onSelect } = data;
  const manufacturer = items[index];

  return (
    <button
      style={style}
      className={`list-item-pro w-full text-left ${selectedItem === manufacturer ? 'bg-ios-blue/15' : ''}`}
      onClick={() => onSelect(manufacturer)}
    >
      <span className="text-pro-body capitalize">{manufacturer}</span>
    </button>
  );
};

// Row component for virtualized manual list
const FAVORITES_STORAGE_KEY = 'bb_manual_favorites';

const ManualRow = ({ index, style, data }) => {
  const { manuals, downloading, downloadingId, handleDownload, handlePreview, favorites, onToggleFavorite } = data;
  const manual = manuals[index];
  const isFav = favorites?.has(manual.id);

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        padding: '6px 8px',
      }}
    >
      <div className="card-pro w-full p-3 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="heading-pro-md capitalize mb-1">
              {manual.display_name || manual.name}
            </h3>
            <p className="text-pro-secondary text-xs opacity-70 capitalize">
              {manual.manufacturer}
            </p>
          </div>
          <button
            onClick={() => onToggleFavorite(manual.id)}
            className={`ml-2 p-1.5 rounded-lg transition-all ${isFav ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className="text-xl">{isFav ? '★' : '☆'}</span>
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {manual.gc_number && (
            <span className="badge-pro badge-pro-blue">
              GC: {manual.gc_number}
            </span>
          )}
          <span className="badge-pro badge-pro-green">
            PDF Manual
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handlePreview(manual.id)}
            className="btn-pro-secondary flex-1 !min-h-[44px] !py-2.5"
          >
            Preview
          </button>
          <button
            onClick={() => handleDownload(manual.id)}
            disabled={downloading && downloadingId === manual.id}
            className="btn-pro-primary flex-1 !min-h-[44px] !py-2.5"
          >
            {downloading && downloadingId === manual.id ? (
              <>
                <div className="spinner-pro !w-4 !h-4 !border-white !border-t-transparent"></div>
                <span>Loading...</span>
              </>
            ) : (
              'Download'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
/**
 * Main ManualFinder component: part 2 of the fix
 * This implements the main component with proper function ordering
 * to avoid circular dependencies.
 */

/**
 * ManualFinderStandalone component for searching and downloading boiler manuals
 * This component allows users to search for manuals by manufacturer and model
 * and download them as needed.
 *
 * @component
 * @returns {React.ReactElement} Manual finder interface
 */
export default function ManualFinderStandalone() {
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [query, setQuery] = useState('');
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showManufacturers, setShowManufacturers] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });

  const toggleFavorite = useCallback((manualId) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(manualId)) { next.delete(manualId); } else { next.add(manualId); }
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // For pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = UI.LIST.PAGE_SIZE;

  const manufacturerListRef = useRef(null);
  const debouncedQuery = useDebounce(query, 500);


  // Handle search
  const handleSearch = useCallback(async () => {
    setError('');
    setLoading(true);
    setManuals([]); // Reset results for new search
    setPage(0); // Reset to first page
    setHasMore(true); // Reset pagination state

    // Ensure we have a valid search query
    if (!debouncedQuery.trim() && !selectedManufacturer) {
      setManuals([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    // Set up pagination parameters
    let allResults = [];
    let hasMore = true;
    let page = 0;
    const pageSize = PAGE_SIZE; // Use PAGE_SIZE for pagination

    if (import.meta.env.DEV) {
      console.log(
        `Fetching manuals for ${selectedManufacturer || 'any manufacturer'} and model containing "${debouncedQuery || ''}"`
      );
    }

    try {
      // Fetch all pages of results
      while (hasMore) {
        // Build query params
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('search', debouncedQuery);
        if (selectedManufacturer) params.set('manufacturer', selectedManufacturer);
        params.set('limit', String(pageSize));
        params.set('offset', String(page * pageSize));

        // Use http utility for API calls with proper auth
        const result = await http.get(`/api/manuals?${params.toString()}`);
        const currentPageData = result.data || [];
        
        // Add current page results to our collection
        if (currentPageData && currentPageData.length > 0) {
          allResults = [...allResults, ...currentPageData];
        }

        // Check if we need to fetch more results based on API response
        if (!result.hasMore || currentPageData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
          // Safety cap to avoid infinite loops
          if (page >= UI.LIST.MAX_PAGES) {
            hasMore = false;
          }
        }
      }

      setManuals(allResults);
    } catch (error) {
      console.error('Error fetching boiler manuals:', error);
      setError('Error loading manuals. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedManufacturer]);

  // ─── Manual open/download flow (P1, walkthrough 2026-04-21) ────────────────
  // Previous implementation did a cross-origin fetch-and-discard that silently
  // failed on CORS. Replaced with window.open, gated on a HEAD probe via the
  // check-manual-link edge function so we don't shove users at dead URLs. The
  // edge function also logs failures to bb_manual_link_issues for triage.
  //
  // Flow:
  //   1. Resolve the manual URL (direct manufacturer URL preferred; falls back
  //      to Supabase storage if we ever self-host — see TODO below).
  //   2. HEAD-check via edge function (1.5s timeout, handled server-side).
  //   3. On ok: window.open in a new tab. If the popup is blocked, tell the
  //      user — do not silently fail.
  //   4. On not-ok: toast "no longer valid" + the edge function has already
  //      written a bb_manual_link_issues row.
  //
  // TODO(storage-migration): move to self-hosted PDFs in Supabase Storage so
  //   we own the URL and link-rot stops mattering. See
  //   docs/user-walkthrough-2026-04-21.md for rationale.
  const openManualUrl = useCallback(
    async (manualId, intent /* 'preview' | 'download' */) => {
      const manual = manuals.find(m => m.id === manualId);
      if (!manual) return;

      if (intent === 'download') {
        if (downloading) return;
        setDownloading(true);
        setDownloadingId(manualId);
      }

      const verb = intent === 'preview' ? 'Opening' : 'Downloading';
      setToast({
        message: `${verb} ${manual.manufacturer || 'manual'}…`,
        type: 'info',
      });

      try {
        // Resolve URL.
        let url = '';
        if (manual.url && /^https?:\/\//i.test(manual.url)) {
          // Supabase public URL → append ?download for download intent to force attachment.
          if (intent === 'download' && manual.url.includes('supabase.co')) {
            url = `${manual.url}${manual.url.includes('?') ? '&' : '?'}download=`;
          } else {
            url = manual.url;
          }
        }
        if (!url) {
          setToast({ message: 'No manual URL on record for this entry.', type: 'error' });
          return;
        }

        // HEAD-check via edge function. Client-side timeout is a backstop; the
        // function itself enforces 1.5s. Keep client timeout generous (3s) so
        // we don't flag healthy-but-slow CDNs as dead.
        let probe = { ok: true, status: 200 };
        try {
          probe = await http.post('/api/check-manual-link', {
            url,
            manual_id: manual.id,
          }, { timeout: 3000 });
        } catch (e) {
          // Probe failed (edge fn down, network) — assume URL is OK and let the
          // browser deal. Don't block the user on our link-health tool being
          // flaky.
          console.warn('[manuals] check-manual-link probe failed, continuing:', e);
        }

        if (!probe?.ok) {
          setToast({
            message: 'This manufacturer link is no longer valid — we\u2019ve flagged it for review.',
            type: 'error',
          });
          return;
        }

        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          setToast({
            message: 'Popup blocked \u2014 allow popups for this site to open manuals.',
            type: 'error',
          });
          return;
        }

        setToast({
          message: `${intent === 'preview' ? 'Opened' : 'Opening'} ${manual.manufacturer} ${manual.name || manual.model || ''}`.trim(),
          type: 'success',
        });
      } catch (err) {
        console.error(`[manuals] ${intent} error:`, err);
        setToast({ message: `Failed to ${intent} manual.`, type: 'error' });
      } finally {
        if (intent === 'download') {
          setDownloading(false);
          setDownloadingId(null);
        }
      }
    },
    [manuals, downloading]
  );

  const handlePreview = useCallback(
    manualId => openManualUrl(manualId, 'preview'),
    [openManualUrl]
  );
  const handleDownload = useCallback(
    manualId => openManualUrl(manualId, 'download'),
    [openManualUrl]
  );
  /**
   * ManualFinderStandalone component: part 3 of the fix
   * This implements the remaining hooks and render logic
   */

  // Fetch manufacturers on component mount
  useEffect(() => {
    const fetchManufacturers = async () => {
      // Create cache key for manufacturers
      const MANUFACTURERS_CACHE_KEY = `${CACHE.PREFIX}manufacturers`;

      try {
        if (import.meta.env.DEV) {
        }
        setManufacturers([]); // Reset while loading

        // Define all known manufacturers manually as a fallback
        // This ensures we always have a comprehensive list regardless of pagination issues
        const knownManufacturers = [
          'acv',
          'aga-rangemaster',
          'alpha-boilers',
          'ambirad',
          'andrews',
          'ariston',
          'arleigh',
          'atag',
          'baxi',
          'bemo',
          'benson',
          'biasi',
          'ideal',
          'broag',
          'buderas',
          'buderus',
          'carrier',
          'chaffoteaux',
          'daikin',
          'danfoss',
          'elnur',
          'evinox',
          'ferroli',
          'firebird',
          'flamco',
          'fondital',
          'glow-worm',
          'grant',
          'heatline',
          'heatrae-sadia',
          'hoval',
          'ideal',
          'intergas',
          'johnson-and-starley',
          'keston',
          'lochinvar',
          'main',
          'mikrofill',
          'mitsubishi-electric',
          'morco',
          'navien',
          'potterton',
          'quincy',
          'ravenheat',
          'rayburn',
          'remeha',
          'rinnai',
          'robinson-willey',
          'saunier-duval',
          'stokvis',
          'stiebel',
          'sime',
          'trianco',
          'valor',
          'vaillant',
          'vokera',
          'warmflow',
          'warmworld',
          'worcester',
        ];

        // Use local manufacturers list directly (no API call needed)
        const finalManufacturers = [...knownManufacturers].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        setManufacturers(finalManufacturers);

        // Cache the final manufacturers list
        setCachedData(MANUFACTURERS_CACHE_KEY, finalManufacturers, CACHE.MANUFACTURER_TTL);
      } catch (error) {
        console.error('Error in manufacturer fetch:', error);
        // Use the hardcoded list as a fallback if all else fails
        const fallbackManufacturers = [
          'acv',
          'aga-rangemaster',
          'alpha-boilers',
          'ambirad',
          'andrews',
          'ariston',
          'arleigh',
          'atag',
          'baxi',
          'bemo',
          'benson',
          'biasi',
          'ideal',
          'broag',
          'buderas',
          'buderus',
          'carrier',
          'chaffoteaux',
          'daikin',
          'danfoss',
          'elnur',
          'evinox',
          'ferroli',
          'firebird',
          'flamco',
          'fondital',
          'glow-worm',
          'grant',
          'heatline',
          'heatrae-sadia',
          'hoval',
          'ideal',
          'intergas',
          'johnson-and-starley',
          'keston',
          'lochinvar',
          'main',
          'mikrofill',
          'mitsubishi-electric',
          'morco',
          'navien',
          'potterton',
          'quincy',
          'ravenheat',
          'rayburn',
          'remeha',
          'rinnai',
          'robinson-willey',
          'saunier-duval',
          'stokvis',
          'stiebel',
          'sime',
          'trianco',
          'valor',
          'vaillant',
          'vokera',
          'warmflow',
          'warmworld',
          'worcester',
        ].sort();

        if (import.meta.env.DEV) {
        }
        setManufacturers(fallbackManufacturers);
      }
    };

    fetchManufacturers();
  }, []);

  // Fetch manuals based on query and selected manufacturer with proper pagination
  useEffect(() => {
    // Skip initial empty search on component mount
    if (debouncedQuery === '' && !selectedManufacturer) return;
    handleSearch();
  }, [debouncedQuery, selectedManufacturer, handleSearch]);

  // Close manufacturer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (manufacturerListRef.current && !manufacturerListRef.current.contains(event.target)) {
        setShowManufacturers(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle manufacturer selection
  const handleManufacturerSelect = useCallback(manufacturer => {
    setSelectedManufacturer(manufacturer);
    setShowManufacturers(false);
  }, []);

  // Clear manufacturer filter
  const clearManufacturer = useCallback(() => {
    setSelectedManufacturer('');
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback(e => {
    setQuery(e.target.value);
  }, []);

  // Dismiss toast notification
  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const TOP_BRANDS = ['worcester', 'ideal', 'vaillant', 'baxi', 'potterton', 'glow-worm', 'viessmann', 'alpha-boilers'];

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
      {/* Hero */}
      <div style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
        padding: '18px 18px 14px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'rgba(255,255,255,0.10)', borderRadius: '50%', transform: 'translate(30%, -30%)', filter: 'blur(16px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>📚</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>Boiler Manuals</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1 }}>Manual Finder</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 10, marginTop: 4, position: 'relative' }}>
          {[
            { label: '5,670+', sub: 'Manuals' },
            { label: '60+', sub: 'Brands' },
            { label: 'PDF', sub: 'All formats' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 4px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick brand chips */}
      {!selectedManufacturer && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8E8E93', marginBottom: 6 }}>Quick select</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TOP_BRANDS.map(brand => (
              <button key={brand} onClick={() => handleManufacturerSelect(brand)}
                style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 12, fontWeight: 600, color: '#1C1C1E', cursor: 'pointer', textTransform: 'capitalize' }}>
                {brand.replace(/-/g, ' ').replace('alpha boilers', 'Alpha').replace('glow worm', 'Glow-worm')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4" style={{position: 'relative', zIndex: 1}}>
          {/* Manufacturer dropdown */}
          <div className="relative w-full sm:w-1/2" ref={manufacturerListRef} style={{zIndex: 10000}}>
            <button
              className="w-full flex justify-between items-center px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-200 rounded-2xl bg-white text-gray-800 font-medium shadow-sm"
              onClick={() => setShowManufacturers(!showManufacturers)}
            >
              <span className="truncate pr-2">{selectedManufacturer || 'All Manufacturers'}</span>
              <span className="ml-2 flex-shrink-0">{showManufacturers ? '▲' : '▼'}</span>
            </button>

            {selectedManufacturer && (
              <button
                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={clearManufacturer}
                aria-label="Clear manufacturer selection"
              >
                ✕
              </button>
            )}

            {showManufacturers && manufacturers.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-80 overflow-y-auto"
                style={{
                  zIndex: 999999,
                  maxHeight: '320px',
                  overflowY: 'auto',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.15)',
                  position: 'absolute'
                }}
              >
                {/* Display number of manufacturers */}
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  {manufacturers.length} manufacturers available
                </div>

                {/* Switch to direct rendering for better reliability */}
                {manufacturers.length <= 200 ? (
                  <div className="py-1">
                    {manufacturers.map((manufacturer) => (
                      <button
                        key={manufacturer}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150
                          ${selectedManufacturer === manufacturer ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'} 
                          font-medium capitalize`}
                        onClick={() => handleManufacturerSelect(manufacturer)}
                      >
                        {manufacturer}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* For extremely large lists, use virtualized rendering */
                  <List
                    height={240}
                    itemCount={manufacturers.length}
                    itemSize={36}
                    width="100%"
                    itemData={{
                      items: manufacturers,
                      selectedItem: selectedManufacturer,
                      onSelect: handleManufacturerSelect,
                    }}
                  >
                    {ManufacturerRow}
                  </List>
                )}
              </div>
            )}
          </div>

          {/* Search input */}
          <div className="w-full sm:w-1/2">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. greenstar 30 combi, ecotec plus, logic..."
                value={query}
                onChange={handleSearchChange}
                className="w-full px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-200 rounded-2xl bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {query && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status indicators */}
        {loading && (
          <div className="flex justify-center items-center my-6 sm:my-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Searching for manuals...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 sm:p-4 rounded-2xl my-4 text-sm sm:text-base">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && manuals.length === 0 && (debouncedQuery || selectedManufacturer) && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 sm:p-4 rounded-2xl my-4 text-sm sm:text-base">
            <p className="font-semibold mb-1">No manuals found</p>
            <p className="text-xs opacity-80">Try searching by brand name (e.g. "greenstar", "ecotec", "logic") or select a manufacturer and search by model type (e.g. "combi", "system", "30").</p>
          </div>
        )}

        {!loading && !error && manuals.length === 0 && !debouncedQuery && !selectedManufacturer && (
          <div className="bg-white border border-gray-100 text-gray-600 p-4 sm:p-6 rounded-2xl my-4 text-center shadow-sm">
            <p className="font-semibold text-base mb-2">Search for a boiler manual</p>
            <p className="text-sm opacity-80 mb-3">Select a manufacturer or type a search term to get started.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['greenstar combi', 'ecotec plus', 'ideal logic', 'baxi combi'].map(hint => (
                <button key={hint} onClick={() => setQuery(hint)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results list */}
      {!loading && manuals.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-300">
              Found {manuals.length} manuals
            </h3>
            {favorites.size > 0 && (
              <button
                onClick={() => setShowFavoritesOnly(prev => !prev)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  showFavoritesOnly
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{showFavoritesOnly ? '★' : '☆'}</span>
                {showFavoritesOnly ? `Favorites (${favorites.size})` : 'Show Favorites'}
              </button>
            )}
          </div>

          <div className="w-full" style={{ height: 'min(600px, 65vh)' }}>
            <List
              height={Math.min(600, window.innerHeight * 0.65)}
              itemCount={showFavoritesOnly ? manuals.filter(m => favorites.has(m.id)).length : manuals.length}
              itemSize={window.innerWidth < 360 ? 180 : 200}
              width="100%"
              itemData={{
                manuals: showFavoritesOnly ? manuals.filter(m => favorites.has(m.id)) : manuals,
                downloading: downloading,
                downloadingId: downloadingId,
                handleDownload: handleDownload,
                handlePreview: handlePreview,
                favorites: favorites,
                onToggleFavorite: toggleFavorite,
              }}
            >
              {ManualRow}
            </List>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
