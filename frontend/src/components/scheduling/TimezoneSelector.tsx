import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedulesApi';
import { Search } from 'lucide-react';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
}

export default function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch timezones
  const { data: timezonesData } = useQuery({
    queryKey: ['timezones'],
    queryFn: () => schedulesApi.getTimezones(),
    staleTime: Infinity, // Timezones don't change
  });

  const timezones = timezonesData?.data || [];

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!searchQuery.trim()) return timezones;
    
    const query = searchQuery.toLowerCase();
    return timezones.filter(tz => 
      (tz?.value || '').toLowerCase().includes(query) || 
      (tz?.label || '').toLowerCase().includes(query)
    );
  }, [timezones, searchQuery]);

  // Common timezones for quick access
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search timezones..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Common Timezones (if no search) */}
      {!searchQuery && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Common Timezones
          </label>
          <div className="grid grid-cols-2 gap-2">
            {commonTimezones.map(tz => (
              <button
                key={tz}
                onClick={() => onChange(tz)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  value === tz
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tz}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Timezones */}
      <div>
        {searchQuery && (
          <label className="block text-xs font-medium text-gray-500 mb-2">
            {filteredTimezones.length} results
          </label>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          size={searchQuery ? Math.min(filteredTimezones.length, 10) : 1}
        >
          {filteredTimezones.map(tz => tz?.value && tz?.label ? (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ) : null)}
        </select>
      </div>

      {/* Current Selection */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">Selected:</span> {value}
      </div>
    </div>
  );
}
