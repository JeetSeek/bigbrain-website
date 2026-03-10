import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

/**
 * Boiler Parts Finder
 * Search by GC number or model name, then deep-link to multiple free merchant sites
 * for parts ordering. Also shows any parts data extracted from manuals in the database.
 */

const MERCHANTS = [
  {
    name: 'City Plumbing',
    icon: '🏪',
    color: 'bg-blue-600',
    buildUrl: (gc) => `https://www.cityplumbing.co.uk/search?query=${encodeURIComponent(gc)}`,
    description: 'Same-day click & collect, 370+ branches',
  },
  {
    name: 'Sparesbase',
    icon: '🔧',
    color: 'bg-orange-600',
    buildUrl: (gc) => `https://www.sparesbase.co.uk/catalogsearch/result/?q=${encodeURIComponent(gc)}`,
    description: 'Specialist boiler spares, next-day delivery',
  },
  {
    name: 'Heating Spare Parts',
    icon: '🔥',
    color: 'bg-red-600',
    buildUrl: (gc) => `https://www.heatingspareparts.com/catalogsearch/result/?q=${encodeURIComponent(gc)}`,
    description: '100% genuine parts, 30-day money back',
  },
  {
    name: 'Trade Parts Finder',
    icon: '🛒',
    color: 'bg-green-600',
    buildUrl: (gc) => `https://www.tradepartsfinder.co.uk/catalogsearch/result/?q=${encodeURIComponent(gc)}`,
    description: 'Trade prices, fast delivery',
  },
  {
    name: 'PHC Parts',
    icon: '📦',
    color: 'bg-purple-600',
    buildUrl: (gc) => `https://phc.parts/search?keywords=${encodeURIComponent(gc)}`,
    description: 'Plumbing & heating catalogue',
  },
  {
    name: 'eBay',
    icon: '🏷️',
    color: 'bg-gray-700',
    buildUrl: (gc) => `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(gc + ' boiler parts')}`,
    description: 'New & used parts, often cheapest',
  },
];

const PartsFinder = () => {
  const [gcNumber, setGcNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [boilerInfo, setBoilerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bb_parts_recent');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  const saveRecentSearch = useCallback((gc, info) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.gc !== gc);
      const updated = [{ gc, manufacturer: info?.manufacturer || '', model: info?.model_name || '', timestamp: Date.now() }, ...filtered].slice(0, 10);
      try { localStorage.setItem('bb_parts_recent', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const search = useCallback(async () => {
    const query = gcNumber.trim().replace(/[^0-9-]/g, '');
    if (!query) return;

    setLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    setBoilerInfo(null);

    try {
      // Try to find boiler info from our database by GC number
      const { data: manuals } = await supabase
        .from('boiler_manuals')
        .select('manufacturer, name, gc_number')
        .ilike('gc_number', `%${query}%`)
        .limit(1);

      let info = null;

      if (manuals && manuals.length > 0) {
        info = {
          manufacturer: manuals[0].manufacturer,
          model_name: manuals[0].name,
          gc_number: manuals[0].gc_number,
        };
      } else {
        // Try gc_fault_codes table which has more GC coverage
        const { data: faultCodes } = await supabase
          .from('gc_fault_codes')
          .select('manufacturer, model_name, gc_number')
          .eq('gc_number', query)
          .limit(1);

        if (faultCodes && faultCodes.length > 0) {
          info = {
            manufacturer: faultCodes[0].manufacturer,
            model_name: faultCodes[0].model_name,
            gc_number: faultCodes[0].gc_number,
          };
        }
      }

      if (info) {
        setBoilerInfo(info);
        saveRecentSearch(query, info);
      } else {
        saveRecentSearch(query, { manufacturer: 'Unknown', model_name: query });
      }
    } catch (err) {
      console.error('Parts search error:', err);
    } finally {
      setLoading(false);
    }
  }, [gcNumber, saveRecentSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  const handleRecentClick = (gc) => {
    setGcNumber(gc);
    setTimeout(() => {
      setGcNumber(gc);
      // Trigger search with the selected GC
      const query = gc.trim().replace(/[^0-9-]/g, '');
      if (query) {
        setSearchQuery(query);
        setHasSearched(true);
        setLoading(true);
        supabase
          .from('boiler_manuals')
          .select('manufacturer, name, gc_number')
          .ilike('gc_number', `%${query}%`)
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setBoilerInfo({ manufacturer: data[0].manufacturer, model_name: data[0].name, gc_number: data[0].gc_number });
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    }, 0);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔧
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Parts Finder</h1>
            <p className="text-sm text-white/70 mt-0.5">Search parts by GC number across multiple suppliers</p>
          </div>
        </div>
      </div>

      {/* GC Number input */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Boiler GC Number</label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={gcNumber}
            onChange={(e) => setGcNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 41-532-05"
            className="flex-1 px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
          />
          <button
            onClick={search}
            disabled={loading || !gcNumber.trim()}
            className="px-5 py-3 min-h-[44px] bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '...' : 'Find Parts'}
          </button>
        </div>
        <p className="text-xs text-gray-400">Find the GC number on your boiler's data plate (7 digits, e.g. 41-532-05)</p>
      </div>

      {/* Recent searches */}
      {!hasSearched && recentSearches.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">RECENT SEARCHES</label>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(s.gc)}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
              >
                {s.gc}
                {s.manufacturer && s.manufacturer !== 'Unknown' && (
                  <span className="text-gray-400 font-sans ml-1.5 text-xs">{s.manufacturer}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Boiler info card */}
      {hasSearched && !loading && (
        <div className={`p-4 rounded-xl border ${boilerInfo ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          {boilerInfo ? (
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <h3 className="font-bold text-gray-900">{boilerInfo.manufacturer}</h3>
                <p className="text-sm text-gray-700">{boilerInfo.model_name}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">GC {boilerInfo.gc_number}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-semibold text-gray-700">GC {searchQuery}</h3>
                <p className="text-sm text-gray-500">Not in our database — but you can still search suppliers below</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Merchant links */}
      {hasSearched && !loading && searchQuery && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">SEARCH SUPPLIERS FOR PARTS</label>
          {MERCHANTS.map((merchant, i) => (
            <a
              key={i}
              href={merchant.buildUrl(searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md active:scale-[0.98] transition-all"
            >
              <div className={`w-11 h-11 rounded-xl ${merchant.color} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                {merchant.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{merchant.name}</h3>
                <p className="text-xs text-gray-500">{merchant.description}</p>
              </div>
              <span className="text-gray-400 text-lg flex-shrink-0">→</span>
            </a>
          ))}
        </div>
      )}

      {/* Model name search tip */}
      {hasSearched && !loading && boilerInfo && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">ALSO TRY SEARCHING BY MODEL NAME</label>
          {MERCHANTS.slice(0, 3).map((merchant, i) => (
            <a
              key={`model-${i}`}
              href={merchant.buildUrl(boilerInfo.model_name || searchQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md active:scale-[0.98] transition-all"
            >
              <div className={`w-9 h-9 rounded-lg ${merchant.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                {merchant.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  Search <strong>{merchant.name}</strong> for "{boilerInfo.model_name}"
                </p>
              </div>
              <span className="text-gray-400 flex-shrink-0">→</span>
            </a>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && recentSearches.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔧</div>
          <h3 className="text-lg font-semibold text-gray-700">Find Boiler Parts</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Enter the GC number from the boiler data plate to search for spare parts across multiple suppliers.
          </p>
          <div className="mt-4 p-3 bg-gray-50 rounded-xl inline-block">
            <p className="text-xs text-gray-500">Where to find the GC number:</p>
            <p className="text-xs text-gray-400 mt-1">Front panel, side, or underside of the boiler — look for a 7-digit number on the data plate (e.g. 41-532-05)</p>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-500">How it works</p>
        <p>• Enter the boiler GC number from the data plate</p>
        <p>• We identify the boiler from our database of 3,000+ models</p>
        <p>• Tap any supplier to search their site for matching parts</p>
        <p>• Compare prices across suppliers for the best deal</p>
      </div>
    </div>
  );
};

export default PartsFinder;
