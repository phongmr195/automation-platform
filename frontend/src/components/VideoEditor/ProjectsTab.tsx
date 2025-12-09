/**
 * Projects Tab
 * Manage video editing projects
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Play,
  Trash2,
  RefreshCw,
  Loader2,
  Film
} from 'lucide-react';
import { toast } from '../../utils/alerts';

interface VideoProject {
  id: string;
  name: string;
  status: string;
  inputFiles: string[];
  outputFile?: string;
  createdAt: string;
  updatedAt: string;
}

const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    setLoading(true);

    try {
      const response = await axios.get('/api/video-editor/projects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setProjects(response.data.projects);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setCreating(true);
    try {
      await axios.post(
        '/api/video-editor/projects',
        { name: newProjectName },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setCreateDialogOpen(false);
      setNewProjectName('');
      await loadProjects();
      toast.success('Project created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await axios.delete(`/api/video-editor/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      await loadProjects();
      toast.success('Project deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'processing': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'error': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto animate-spin text-purple-600" size={48} />
        <p className="mt-4 text-gray-600">Loading projects...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Video Projects</h2>
        <div className="flex gap-2">
          <button
            onClick={loadProjects}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Film className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first video editing project to get started
          </p>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold truncate flex-1">
                    {project.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>Files: {project.inputFiles?.length || 0}</p>
                  <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                  {project.outputFile && (
                    <p className="text-green-600 font-medium">✅ Output available</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200">
                {project.outputFile && (
                  <button
                    onClick={() => {
                      const filename = project.outputFile?.split('/').pop();
                      window.open(`/api/video-editor/download/${filename}`, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Play size={16} />
                    View
                  </button>
                )}
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project Name"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreateDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={creating || !newProjectName.trim()}
                className={`
                  px-4 py-2 rounded-md font-semibold text-white
                  ${creating || !newProjectName.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                  }
                `}
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;
