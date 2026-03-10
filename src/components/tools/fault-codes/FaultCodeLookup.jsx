import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
};

const FaultCodeLookup = () => {
  const [query, setQuery] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [manufacturers, setManufacturers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load distinct manufacturers on mount
  useEffect(() => {
    const loadManufacturers = async () => {
      const { data, error } = await supabase
        .from('gc_fault_codes')
        .select('manufacturer')
        .order('manufacturer');
      
      if (!error && data) {
        const unique = [...new Set(data.map(d => d.manufacturer).filter(Boolean))].sort();
        setManufacturers(unique);
      }
    };
    loadManufacturers();
  }, []);

  const search = useCallback(async () => {
    if (!query.trim() && !manufacturer) return;
    
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      let q = supabase
        .from('gc_fault_codes')
        .select('*', { count: 'exact' });

      if (manufacturer) {
        q = q.ilike('manufacturer', `%${manufacturer}%`);
      }

      if (query.trim()) {
        q = q.or(
          `fault_code.ilike.%${query.trim()}%,display_code.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,model_name.ilike.%${query.trim()}%`
        );
      }

      q = q.order('manufacturer').order('fault_code').limit(50);

      const { data, error: err, count } = await q;

      if (err) throw err;

      setResults(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to search fault codes. Please try again.');
      console.error('Fault code search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, manufacturer]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  const getSeverityStyle = (severity) => {
    return SEVERITY_COLORS[severity?.toLowerCase()] || SEVERITY_COLORS.info;
  };

  const formatMultiline = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="text-gray-400 mt-1 flex-shrink-0">•</span>
        <span>{line.trim()}</span>
      </li>
    ));
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔍
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Fault Code Lookup</h1>
            <p className="text-sm text-white/70 mt-0.5">Search 13,800+ fault codes across all manufacturers</p>
          </div>
        </div>
      </div>

      {/* Search controls */}
      <div className="space-y-3">
        {/* Manufacturer filter */}
        <select
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All Manufacturers</option>
          {manufacturers.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Search input + button */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search fault code, model, or description..."
            className="flex-1 min-w-0 px-3 sm:px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={search}
            disabled={loading || (!query.trim() && !manufacturer)}
            className="px-4 sm:px-5 py-3 min-h-[44px] bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results count */}
      {hasSearched && !loading && (
        <div className="text-sm text-gray-500">
          {totalCount === 0 ? 'No fault codes found' : `Found ${totalCount} fault code${totalCount !== 1 ? 's' : ''}${totalCount > 50 ? ' (showing first 50)' : ''}`}
        </div>
      )}

      {/* Results list */}
      <div className="space-y-3">
        {results.map((fc) => {
          const isExpanded = expandedId === fc.id;
          const style = getSeverityStyle(fc.severity);
          
          return (
            <button
              key={fc.id}
              onClick={() => setExpandedId(isExpanded ? null : fc.id)}
              className={`w-full text-left rounded-xl border ${style.border} ${style.bg} p-3 sm:p-4 transition-all active:scale-[0.99]`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-gray-900 text-base">
                      {fc.display_code || fc.fault_code}
                    </span>
                    {fc.severity && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                        {fc.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium mt-1">{fc.manufacturer}</p>
                  <p className="text-xs text-gray-500">{fc.model_name} {fc.gc_number ? `(GC ${fc.gc_number})` : ''}</p>
                </div>
                <span className="text-gray-400 text-lg flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
              </div>

              {/* Description (always visible) */}
              {fc.description && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{fc.description}</p>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                  {/* Full description */}
                  {fc.description && fc.description.length > 120 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h4>
                      <p className="text-sm text-gray-700">{fc.description}</p>
                    </div>
                  )}

                  {/* Cause */}
                  {fc.cause && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Possible Causes</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {formatMultiline(fc.cause)}
                      </ul>
                    </div>
                  )}

                  {/* Remedy */}
                  {fc.remedy && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Remedy</h4>
                      <p className="text-sm text-gray-700">{fc.remedy}</p>
                    </div>
                  )}

                  {/* Page reference */}
                  {fc.page_reference && (
                    <p className="text-xs text-gray-400">Manual page: {fc.page_reference}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {!hasSearched && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700">Search Fault Codes</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Select a manufacturer or type a fault code to find diagnostics, causes, and remedies.
          </p>
        </div>
      )}
    </div>
  );
};

export default FaultCodeLookup;
