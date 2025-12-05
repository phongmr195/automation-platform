import { Clock } from 'lucide-react';

interface BusinessHoursConfig {
  [day: string]: {
    start: string;
    end: string;
  };
}

interface BusinessHoursEditorProps {
  config: BusinessHoursConfig;
  onChange: (config: BusinessHoursConfig) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function BusinessHoursEditor({ config, onChange }: BusinessHoursEditorProps) {
  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    onChange({
      ...config,
      [day]: {
        ...config[day],
        [field]: value,
      },
    });
  };

  const handleToggleDay = (day: string) => {
    const newConfig = { ...config };
    if (newConfig[day]) {
      delete newConfig[day];
    } else {
      newConfig[day] = { start: '09:00', end: '17:00' };
    }
    onChange(newConfig);
  };

  const setAllWeekdays = () => {
    const weekdayConfig: BusinessHoursConfig = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
      weekdayConfig[day] = config[day] || { start: '09:00', end: '17:00' };
    });
    onChange(weekdayConfig);
  };

  const setAllDays = () => {
    const allDaysConfig: BusinessHoursConfig = {};
    DAYS.forEach(({ key }) => {
      allDaysConfig[key] = config[key] || { start: '09:00', end: '17:00' };
    });
    onChange(allDaysConfig);
  };

  const clearAll = () => {
    onChange({});
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={setAllWeekdays}
          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          Weekdays (Mon-Fri)
        </button>
        <button
          onClick={setAllDays}
          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          All Days
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear All
        </button>
      </div>

      {/* Day Configuration */}
      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const isEnabled = !!config[key];
          const hours = config[key] || { start: '09:00', end: '17:00' };

          return (
            <div
              key={key}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Day Toggle */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggleDay(key)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 w-24 text-sm font-medium text-gray-900">
                  {label}
                </span>
              </label>

              {/* Time Inputs */}
              {isEnabled && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <label className="text-xs text-gray-600">Start</label>
                    <input
                      type="time"
                      value={hours.start}
                      onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <span className="text-gray-400">→</span>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">End</label>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {!isEnabled && (
                <span className="text-sm text-gray-500 flex-1">
                  Not configured
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          <strong>Note:</strong> Workflows will only execute during configured business hours.
          If a scheduled time falls outside business hours, execution will be delayed to the next business hour.
        </p>
      </div>
    </div>
  );
}
