import { useState } from 'react';
import { Play, Pause, StepForward, RotateCcw, Square, Flag } from 'lucide-react';

interface DebugControlsProps {
  isDebugMode: boolean;
  debugState: 'idle' | 'running' | 'paused' | 'stopped';
  currentNodeId?: string;
  breakpoints: Set<string>;
  onToggleDebugMode: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStop: () => void;
  onReset: () => void;
  onToggleBreakpoint: (nodeId: string) => void;
}

export default function DebugControls({
  isDebugMode,
  debugState,
  currentNodeId,
  breakpoints,
  onToggleDebugMode,
  onPlay,
  onPause,
  onStep,
  onStop,
  onReset,
}: DebugControlsProps) {
  const [showBreakpoints, setShowBreakpoints] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Debug Controls</h3>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600">Debug Mode</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isDebugMode}
              onChange={onToggleDebugMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>
      </div>

      {isDebugMode && (
        <>
          {/* Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                debugState === 'running' ? 'bg-blue-100 text-blue-800' :
                debugState === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                debugState === 'stopped' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {debugState}
              </span>
            </div>
            
            {currentNodeId && (
              <div className="mt-2 text-xs text-gray-600">
                Current Node: <span className="font-mono">{currentNodeId}</span>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {debugState === 'idle' || debugState === 'paused' ? (
              <button
                onClick={onPlay}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                title="Play"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Play</span>
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
                <span className="text-sm">Pause</span>
              </button>
            )}
            
            <button
              onClick={onStep}
              disabled={debugState === 'running' || debugState === 'stopped'}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Step Forward"
            >
              <StepForward className="w-4 h-4" />
              <span className="text-sm">Step</span>
            </button>
            
            <button
              onClick={onStop}
              disabled={debugState === 'idle' || debugState === 'stopped'}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Stop"
            >
              <Square className="w-4 h-4" />
              <span className="text-sm">Stop</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
            
            <button
              onClick={() => setShowBreakpoints(!showBreakpoints)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Breakpoints"
            >
              <Flag className="w-4 h-4" />
              <span className="text-sm">Breakpoints ({breakpoints.size})</span>
            </button>
          </div>

          {/* Breakpoints List */}
          {showBreakpoints && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Breakpoints</h4>
              {breakpoints.size === 0 ? (
                <p className="text-xs text-gray-500">No breakpoints set. Click on nodes in the canvas to add breakpoints.</p>
              ) : (
                <div className="space-y-1">
                  {Array.from(breakpoints).map((nodeId) => (
                    <div
                      key={nodeId}
                      className="flex items-center justify-between p-2 bg-white rounded text-xs"
                    >
                      <span className="font-mono text-gray-700">{nodeId}</span>
                      <Flag className="w-3 h-3 text-red-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <p className="font-medium mb-1">Debug Mode Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click nodes to toggle breakpoints</li>
              <li>Use Play to run until next breakpoint</li>
              <li>Use Step to execute one node at a time</li>
              <li>View variable values in the inspector</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
