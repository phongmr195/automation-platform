import { Star, Upload, FolderPlus } from 'lucide-react';
import { useState } from 'react';

interface ViewOptionsProps {
  showFavorites: boolean;
  onToggleFavorites: () => void;
  onImport: (file: File) => void;
  onCreateFolder: () => void;
}

export function ViewOptions({
  showFavorites,
  onToggleFavorites,
  onImport,
  onCreateFolder,
}: ViewOptionsProps) {
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImporting(true);
      onImport(file);
      // Reset input
      event.target.value = '';
      setTimeout(() => setImporting(false), 1000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Favorites Toggle */}
      <button
        onClick={onToggleFavorites}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          showFavorites
            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Show favorites only"
      >
        <Star
          className={`w-4 h-4 ${showFavorites ? 'fill-yellow-500' : ''}`}
        />
        Favorites
      </button>

      {/* Create Folder */}
      <button
        onClick={onCreateFolder}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
        title="Create folder"
      >
        <FolderPlus className="w-4 h-4" />
        Folder
      </button>

      {/* Import */}
      <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors cursor-pointer">
        <Upload className="w-4 h-4" />
        {importing ? 'Importing...' : 'Import'}
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          disabled={importing}
        />
      </label>
    </div>
  );
}
