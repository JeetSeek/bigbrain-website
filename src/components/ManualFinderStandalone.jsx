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
      className={`fixed bottom-5 right-5 flex items-center gap-2 py-3 px-4 rounded-lg shadow-lg transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} ${
        type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : type === 'error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
      }`}
    >
      <span className="text-xl">{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <p className="body-md">{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, TOAST_ANIMATION_TIME);
        }}
        className="ml-4 text-current opacity-70 hover:opacity-100"
        aria-label="Close notification"
      >
        ×
      </button>
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
      className={`block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedItem === manufacturer ? 'bg-blue-100 dark:bg-blue-900' : ''} text-black dark:text-white font-medium`}
      onClick={() => onSelect(manufacturer)}
    >
      {manufacturer}
    </button>
  );
};

// Row component for virtualized manual list
const ManualRow = ({ index, style, data }) => {
  const { manuals, downloading, downloadingId, handleDownload, handlePreview } = data;
  const manual = manuals[index];

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        padding: '12px 8px',
      }}
    >
      <div className="bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 w-full">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {manual.manufacturer}
              </h3>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                {manual.name}
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {manual.gc_number && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                GC: {manual.gc_number}
              </span>
            )}
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              PDF Manual
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handlePreview(manual.id)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 font-medium transition-colors duration-200"
            >
              Preview
            </button>
            <button
              onClick={() => handleDownload(manual.id)}
              disabled={downloading && downloadingId === manual.id}
              className={`flex-1 flex justify-center items-center px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
                downloading && downloadingId === manual.id
                  ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {downloading && downloadingId === manual.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                'Download'
              )}
            </button>
          </div>
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

  // For pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = UI.LIST.PAGE_SIZE;

  const manufacturerListRef = useRef(null);
  const debouncedQuery = useDebounce(query, 500);


  // Definition order is important - define fetchAllIdealBoilers first
  // before it's referenced in handleSearch
  const fetchAllIdealBoilers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Use http utility for Ideal boiler search
      const result = await http.get('/api/manuals?manufacturer=ideal');
      setManuals(result.data || []);
    } catch (error) {
      console.error('Error in specialized Ideal boiler fetching:', error);
      setError('Error loading all Ideal boilers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search with proper dependencies - must be defined after fetchAllIdealBoilers
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

    // Special handling for Ideal boilers - we know there are 300+
    if (selectedManufacturer === 'Ideal' && !debouncedQuery) {
      if (import.meta.env.DEV) {
      }
      await fetchAllIdealBoilers();
      return;
    }

    // Regular fetching strategy for other manufacturers or when searching
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
  }, [debouncedQuery, selectedManufacturer, fetchAllIdealBoilers]);

  // Preview handler (opens in new tab)
  const handlePreview = useCallback(
    async manualId => {
      // Reuse logic from download but just open
      const manual = manuals.find(m => m.id === manualId);
      if (!manual) return;
      try {
        let url = '';
        if (manual.url) {
          if (/^https?:\/\//i.test(manual.url)) {
            url = manual.url;
          } else {
            // Use backend API to get download URL
            const response = await fetch(`/api/manuals/${manual.id}/download`);
            if (!response.ok) throw new Error('Failed to get download URL');
            const result = await response.json();
            url = result.downloadUrl;
          }
          if (url) {
            window.open(url, '_blank', 'noopener');
          }
        }
      } catch (err) {
        console.error('Preview error:', err);
        setToast({ message: 'Failed to preview manual.', type: 'error' });
      }
    },
    [manuals]
  );

  // Download handler
  const handleDownload = useCallback(
    async manualId => {
      if (downloading) return; // Prevent multiple simultaneous downloads

      setDownloading(true);
      setDownloadingId(manualId);

      try {
        const manual = manuals.find(m => m.id === manualId);
        if (!manual) throw new Error('Manual not found');

        let fileUrl = '';
        if (manual.url) {
          if (/^https?:\/\//i.test(manual.url)) {
            // If Supabase public URL, append ?download to force attachment
            fileUrl = manual.url.includes('supabase.co')
              ? `${manual.url}${manual.url.includes('?') ? '&' : '?'}download=`
              : manual.url;
          } else {
            // Use backend API to get download URL
            const response = await fetch(`/api/manuals/${manual.id}/download`);
            if (!response.ok) throw new Error('Failed to get download URL');
            const result = await response.json();
            fileUrl = result.downloadUrl;
          }
        }
        if (!fileUrl) throw new Error('Unable to resolve manual URL');

        // Trigger browser download (works cross-origin)
        const filename = `${manual.manufacturer}-${manual.name || manual.model}.pdf`;
        const isSameOrigin = fileUrl.startsWith(window.location.origin);

        if (isSameOrigin) {
          // Same-origin: browser respects download attribute
          const anchor = document.createElement('a');
          anchor.href = fileUrl;
          anchor.download = filename;
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        } else {
          // Cross-origin: fetch blob then download
          const response = await fetch(fileUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('Failed to fetch manual');
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = blobUrl;
          anchor.download = filename;
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(blobUrl);
        }

        setToast({
          message: `Download started for ${manual.manufacturer} ${manual.name}.`,
          type: 'success',
        });
      } catch (err) {
        console.error('Download error:', err);
        setToast({ message: 'Failed to download manual.', type: 'error' });
      } finally {
        setDownloading(false);
        setDownloadingId(null);
      }
    },
    [downloading, manuals]
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

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-600 dark:text-blue-300">
        Boiler Manual Finder
      </h2>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4" style={{position: 'relative', zIndex: 1}}>
          {/* Manufacturer dropdown */}
          <div className="relative w-full sm:w-1/2" ref={manufacturerListRef} style={{zIndex: 10000}}>
            <button
              className="w-full flex justify-between items-center px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-medium"
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
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
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
                    {manufacturers.map((manufacturer, index) => (
                      <button
                        key={index}
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
                placeholder="Search boiler model..."
                value={query}
                onChange={handleSearchChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-3 sm:p-4 rounded-lg my-4 text-sm sm:text-base">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && manuals.length === 0 && (debouncedQuery || selectedManufacturer) && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-3 sm:p-4 rounded-lg my-4 text-sm sm:text-base">
            <p>
              No manuals found for your search criteria. Try adjusting your search or selecting a
              different manufacturer.
            </p>
          </div>
        )}
      </div>

      {/* Results list */}
      {!loading && manuals.length > 0 && (
        <div className="w-full">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-blue-600 dark:text-blue-300">
            Found {manuals.length} manuals
          </h3>

          <div className="w-full" style={{ height: 'min(600px, 70vh)' }}>
            <List
              height={Math.min(600, window.innerHeight * 0.7)}
              itemCount={manuals.length}
              itemSize={200}
              width="100%"
              itemData={{
                manuals: manuals,
                downloading: downloading,
                downloadingId: downloadingId,
                handleDownload: handleDownload,
                handlePreview: handlePreview,
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
