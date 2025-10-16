import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSelectLocation: (lat: number, lng: number) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export default function SearchBar({ onSelectLocation }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const debounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelectResult = (result: SearchResult) => {
    onSelectLocation(parseFloat(result.lat), parseFloat(result.lon));
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-4 h-9 glass-card border-white/20"
        />
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full glass-card rounded-xl shadow-xl border border-white/20 overflow-hidden z-[9999] max-h-64 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
            >
              <p className="font-medium truncate">{result.display_name}</p>
            </button>
          ))}
        </div>
      )}

      {isLoading && showResults && (
        <div className="absolute top-full mt-2 w-full glass-card rounded-xl shadow-xl border border-white/20 p-4 z-[9999]">
          <p className="text-sm text-muted-foreground text-center">Searching...</p>
        </div>
      )}
    </div>
  );
}
