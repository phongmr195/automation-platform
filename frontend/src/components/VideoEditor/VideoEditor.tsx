/**
 * Video Editor Component
 * Main video editing interface with tabs for different operations
 */

import React, { useState } from 'react';
import CreateVideoTab from './CreateVideoTab';
import EditVideoTab from './EditVideoTab';
import ProjectsTab from './ProjectsTab';
import { Film, Scissors, FolderOpen } from 'lucide-react';

const VideoEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit' | 'projects'>('create');

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 mb-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Film size={32} />
          Video Editor
        </h1>
        <p className="mt-2 text-purple-100">
          Create and edit videos with images, text, overlays, music, and more
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('create')}
              className={`
                flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'create'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Film size={20} />
              Create from Images
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`
                flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'edit'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Scissors size={20} />
              Edit Video
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`
                flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'projects'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <FolderOpen size={20} />
              My Projects
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' && <CreateVideoTab />}
          {activeTab === 'edit' && <EditVideoTab />}
          {activeTab === 'projects' && <ProjectsTab />}
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
