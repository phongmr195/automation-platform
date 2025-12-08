import type { CursorPosition } from '../../hooks/collaboration/useCollaboration';

interface CursorOverlayProps {
  cursors: CursorPosition[];
}

export const CursorOverlay = ({ cursors }: CursorOverlayProps) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-100"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          >
            <path
              d="M5.65376 12.3673L5.46026 12.4144L5.45341 12.41L5.44656 12.4144L5.25306 12.3673L4.75 11.9919L4.75 12.0115L4.75 19.75L5.25 20.25L12.2929 13.2071L11.7929 12.7071L5.65376 12.3673Z"
              fill={cursor.color}
            />
          </svg>
          
          {/* User name label */}
          <div
            className="absolute top-6 left-2 px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
};
