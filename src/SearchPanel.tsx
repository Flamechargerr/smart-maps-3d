import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Clock, ArrowLeft } from 'lucide-react';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

interface Props {
  onSelectResult: (result: SearchResult) => void;
  onBack?: () => void;
  showBack?: boolean;
  onFocus?: () => void;
}

export default function SearchPanel({ onSelectResult, onBack, showBack, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recentSearches] = useState([
    'Gateway of India, Mumbai',
    'Marine Drive',
    'Bandra-Worli Sea Link',
    'Chhatrapati Shivaji Terminus',
    'Haji Ali Dargah',
    'Elephanta Caves'
  ]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchNominatim = async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      setResults(await res.json());
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    setQuery(r.display_name.split(',')[0]);
    setResults([]);
    setFocused(false);
    onSelectResult(r);
  };

  const formatAddr = (n: string) => {
    const p = n.split(',');
    return p.length > 2 ? `${p[0].trim()}, ${p[1].trim()}, ${p[2].trim()}` : n;
  };

  const getTypeIcon = (type: string) => {
    if (!type) return '📍';
    if (type.includes('restaurant') || type.includes('cafe')) return '🍽️';
    if (type.includes('hotel') || type.includes('hostel')) return '🏨';
    if (type.includes('station') || type.includes('stop')) return '🚉';
    if (type.includes('hospital') || type.includes('clinic')) return '🏥';
    if (type.includes('school') || type.includes('university')) return '🎓';
    if (type.includes('temple') || type.includes('mosque') || type.includes('church')) return '🕌';
    if (type.includes('park') || type.includes('garden')) return '🌳';
    if (type.includes('museum') || type.includes('gallery')) return '🏛️';
    return '📍';
  };

  return (
    <div className="search-panel">
      <motion.div
        className={`search-bar glass-panel ${focused ? 'focused' : ''}`}
        layout
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
      >
        {showBack ? (
          <button className="icon-btn" onClick={onBack}><ArrowLeft size={20} /></button>
        ) : (
          <div className="search-icon-wrap">
            <Search size={18} className="search-icon" />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search Google Maps"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); onFocus?.(); }}
        />
        {query && (
          <motion.button
            className="icon-btn"
            onClick={() => { setQuery(''); setResults([]); }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
          >
            <X size={18} />
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {focused && (
          <motion.div
            className="search-results glass-panel"
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            style={{ transformOrigin: 'top' }}
          >
            {loading && (
              <div className="search-loading">
                <div className="search-spinner" />
                <span>Searching...</span>
              </div>
            )}
            
            {!loading && results.length > 0 && results.map((r, i) => (
              <motion.button
                key={r.place_id}
                className="search-result-item"
                onClick={() => handleSelect(r)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <span className="result-emoji">{getTypeIcon(r.type)}</span>
                <div className="result-text">
                  <span className="result-name">{r.display_name.split(',')[0]}</span>
                  <span className="result-address">{formatAddr(r.display_name)}</span>
                </div>
              </motion.button>
            ))}

            {!loading && results.length === 0 && query.length < 3 && (
              <div className="recent-searches">
                <span className="recent-label">Recent searches</span>
                {recentSearches.map((s, i) => (
                  <motion.button
                    key={i}
                    className="search-result-item"
                    onClick={() => setQuery(s.split(',')[0])}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Clock size={16} className="result-icon muted" />
                    <div className="result-text">
                      <span className="result-name">{s}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {!loading && results.length === 0 && query.length >= 3 && (
              <div className="no-results">
                <MapPin size={32} className="no-results-icon" />
                <span>No results found for "{query}"</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {focused && <div className="search-overlay" onClick={() => setFocused(false)} />}
    </div>
  );
}
