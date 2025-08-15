import React, { useState, useRef, useEffect } from 'react';
import { demoManualService } from '../utils/demoManualService';
import { useDebounce } from '../utils/useDebounce';
import { SORT_OPTIONS, UI } from '../utils/constants';

/**
 * ManualFinder Component
 * Search and display interface for finding boiler manuals
 * Supports filtering by manufacturer and sorting by various criteria
 * @component
 */
export function ManualFinder() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, UI.DEBOUNCE.SEARCH);
  const [manuals, setManuals] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [sortOrder, setSortOrder] = useState(SORT_OPTIONS.ORDER.DESC); // newest first by default
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.FIELD.UPLOAD_DATE);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const searchRef = useRef(null);

  /**
   * Focus search bar on component mount
   */
  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  /**
   * Load manufacturers for filter dropdown
   */
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const manufacturers = await demoManualService.getManufacturers();
        setManufacturers(manufacturers);
      } catch (err) {
        console.error('Error fetching manufacturers:', err);
        setManufacturers([]);
      }
    };
    fetchManufacturers();
  }, []);

  /**
   * Fetch manuals using demo service when search params change
   */
  useEffect(() => {
    setLoading(true);
    setError('');
    setSuccess('');

    const fetchManuals = async () => {
      try {
        const results = await demoManualService.searchManuals({
          query: debouncedQuery,
          manufacturer: selectedManufacturer,
          sortBy,
          order: sortOrder,
        });

        setManuals(results || []);
      } catch (err) {
        console.error('Error fetching manuals:', err);
        setError('Error fetching manuals. Please try again.');
        setManuals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchManuals();
  }, [debouncedQuery, selectedManufacturer, sortBy, sortOrder]);

  /**
   * Download a manual using demo service
   * @param {string} id - ID of the manual to download
   */
  const handleDownload = async id => {
    setDownloadingId(id);
    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      // Use demo service to simulate download
      const result = await demoManualService.downloadManual(id);

      // In a real app, this would trigger an actual file download
      // Here we just show success message
      setSuccess(`Downloaded manual successfully!`);

      // Track view in background
      demoManualService
        .trackManualView(id)
        .catch(error => console.error('Error tracking manual view:', error));
    } catch (err) {
      console.error('Error downloading manual:', err);
      setError(`Could not download manual: ${err.message}`);
    } finally {
      setDownloading(false);
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start py-6 px-2 bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 mt-2 text-blue-900">
        Find a 🧠 Boiler Brain Manual
      </h1>
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Search and filters section */}
        <div className="w-full bg-white rounded-xl shadow-md border border-blue-100 p-5 mb-6">
          <input
            ref={searchRef}
            className="w-full text-black text-lg px-5 py-3 rounded-xl border-2 border-blue-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            type="text"
            placeholder="Search by model or description..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search for boiler manual"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manufacturer filter */}
            <div className="flex flex-col">
              <label htmlFor="manufacturer" className="text-sm font-medium text-blue-800 mb-1">
                Manufacturer
              </label>
              <select
                id="manufacturer"
                className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={selectedManufacturer}
                onChange={e => setSelectedManufacturer(e.target.value)}
              >
                <option value="">All Manufacturers</option>
                {manufacturers.map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort options */}
            <div className="flex flex-col">
              <label htmlFor="sortby" className="text-sm font-medium text-blue-800 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  id="sortby"
                  className="flex-1 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value={SORT_OPTIONS.FIELD.UPLOAD_DATE}>Upload Date</option>
                  <option value={SORT_OPTIONS.FIELD.POPULARITY}>Popularity</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(
                      sortOrder === SORT_OPTIONS.ORDER.ASC
                        ? SORT_OPTIONS.ORDER.DESC
                        : SORT_OPTIONS.ORDER.ASC
                    )
                  }
                  className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg border border-blue-200 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  title={sortOrder === SORT_OPTIONS.ORDER.ASC ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === SORT_OPTIONS.ORDER.ASC ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results section */}
        <div className="w-full flex flex-col gap-4">
          {loading && (
            <div className="text-center text-blue-700 text-lg py-10">Loading manuals...</div>
          )}
          {error && (
            <div className="text-center text-red-600 text-lg py-8 px-4 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          )}
          {!loading && !error && manuals.length === 0 && (
            <div className="text-center text-blue-700 text-lg py-10 bg-blue-50 rounded-xl border border-blue-200">
              No manuals found. Try adjusting your search or filters.
            </div>
          )}

          {manuals.map(manual => (
            <div
              key={manual.id}
              className="w-full flex flex-col md:flex-row items-center justify-between bg-white rounded-xl shadow-md border border-blue-200 p-5 gap-4 md:gap-2"
            >
              <div className="flex flex-col flex-1">
                <span className="text-xl font-semibold text-blue-900 text-center md:text-left">
                  {manual.model_name}
                </span>
                <span className="text-sm text-blue-700 text-center md:text-left mb-1">
                  {manual.manufacturer}
                </span>
                {manual.description && (
                  <span className="text-sm text-gray-600 text-center md:text-left mt-1">
                    {manual.description}
                  </span>
                )}
                <div className="flex gap-2 mt-2 text-xs text-gray-500 justify-center md:justify-start">
                  <span>Downloads: {manual.popularity || 0}</span>
                  <span>•</span>
                  <span>Uploaded: {new Date(manual.upload_date).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => handleDownload(manual.id)}
                disabled={downloading && downloadingId === manual.id}
                className={`mt-3 md:mt-0 inline-block text-lg px-6 py-3 rounded-full ${
                  downloading && downloadingId === manual.id
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-800'
                } text-white font-medium shadow hover:shadow-md transition focus:outline-none focus:ring-4 focus:ring-blue-300`}
                style={{ minWidth: 140, textAlign: 'center' }}
              >
                {downloading && downloadingId === manual.id ? 'Downloading...' : 'Download'}
              </button>
            </div>
          ))}

          {!loading && manuals.length > 0 && (
            <div className="text-center text-gray-500 text-sm py-2">
              Showing {manuals.length} results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default ManualFinder;
