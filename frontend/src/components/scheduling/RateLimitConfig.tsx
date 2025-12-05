import { TrendingUp, AlertCircle } from 'lucide-react';

interface RateLimitConfigProps {
  maxExecutionsPerHour?: number;
  maxExecutionsPerDay?: number;
  onChangeHourly: (value: number | undefined) => void;
  onChangeDaily: (value: number | undefined) => void;
}

export default function RateLimitConfig({
  maxExecutionsPerHour,
  maxExecutionsPerDay,
  onChangeHourly,
  onChangeDaily,
}: RateLimitConfigProps) {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            Rate Limiting
          </h4>
          <p className="text-sm text-blue-700">
            Set maximum execution limits to control costs and prevent abuse. 
            When limits are reached, executions will be queued until the next period.
          </p>
        </div>
      </div>

      {/* Hourly Limit */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hourly Limit
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Maximum executions per hour
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={maxExecutionsPerHour !== undefined}
              onChange={(e) => onChangeHourly(e.target.checked ? 10 : undefined)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {maxExecutionsPerHour !== undefined && (
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={100}
              value={maxExecutionsPerHour}
              onChange={(e) => onChangeHourly(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>1</span>
              <span className="font-medium text-blue-600">
                {maxExecutionsPerHour} executions/hour
              </span>
              <span>100</span>
            </div>
            <input
              type="number"
              value={maxExecutionsPerHour}
              onChange={(e) => onChangeHourly(parseInt(e.target.value) || undefined)}
              min={1}
              max={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter custom value (1-1000)"
            />
          </div>
        )}
      </div>

      {/* Daily Limit */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Daily Limit
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Maximum executions per day
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={maxExecutionsPerDay !== undefined}
              onChange={(e) => onChangeDaily(e.target.checked ? 100 : undefined)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {maxExecutionsPerDay !== undefined && (
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={1000}
              value={maxExecutionsPerDay}
              onChange={(e) => onChangeDaily(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>1</span>
              <span className="font-medium text-blue-600">
                {maxExecutionsPerDay} executions/day
              </span>
              <span>1000</span>
            </div>
            <input
              type="number"
              value={maxExecutionsPerDay}
              onChange={(e) => onChangeDaily(parseInt(e.target.value) || undefined)}
              min={1}
              max={10000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter custom value (1-10000)"
            />
          </div>
        )}
      </div>

      {/* Warning if both limits set */}
      {maxExecutionsPerHour !== undefined && maxExecutionsPerDay !== undefined && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900 mb-1">
              Multiple Limits Active
            </h4>
            <p className="text-sm text-yellow-700">
              Both hourly and daily limits are set. The most restrictive limit will apply.
              For example, if hourly limit is 10 and daily is 50, you'll be limited to 10/hour 
              and no more than 50/day total.
            </p>
          </div>
        </div>
      )}

      {/* Usage Examples */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Common Use Cases</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-gray-700">Development/Testing</span>
            <span className="text-gray-600">10/hour, 50/day</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-gray-700">Production (Low Volume)</span>
            <span className="text-gray-600">50/hour, 500/day</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-gray-700">Production (High Volume)</span>
            <span className="text-gray-600">100/hour, 2000/day</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-gray-700">No Limits</span>
            <span className="text-gray-600">Both disabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
