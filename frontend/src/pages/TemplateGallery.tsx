import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { templateApi } from '../services/templateApi';
import { TemplatePreview } from '../components/TemplatePreview';
import type { WorkflowTemplate } from '../types/workflow';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '📂' },
  { id: 'marketing', label: 'Marketing', icon: '📧' },
  { id: 'data-sync', label: 'Data Sync', icon: '🔄' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'etl', label: 'ETL Pipelines', icon: '⚙️' },
  { id: 'api-integration', label: 'API Integration', icon: '🔌' },
  { id: 'social-media', label: 'Social Media', icon: '📱' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-red-100 text-red-800' },
];

export const TemplateGallery: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState<boolean>(false);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', selectedCategory, showFeaturedOnly],
    queryFn: async () => {
      if (showFeaturedOnly) {
        return templateApi.getFeaturedTemplates();
      }
      if (selectedCategory === 'all') {
        return templateApi.getTemplates();
      }
      return templateApi.getTemplatesByCategory(selectedCategory);
    },
  });

  // Fetch categories with counts
  const { data: categories } = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => templateApi.getCategories(),
  });

  // Filter templates by search
  const filteredTemplates = templates?.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getDifficultyColor = (difficulty: string) => {
    return DIFFICULTIES.find((d) => d.value === difficulty)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Template Gallery</h1>
          <p className="text-sm text-gray-600 mt-1">Choose from pre-built workflows</p>
        </div>

        {/* Featured Filter */}
        <div className="p-4 border-b border-gray-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showFeaturedOnly}
              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">⭐ Featured only</span>
          </label>
        </div>

        {/* Categories */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const count = categories?.[cat.id] || 0;
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center">
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                  </span>
                  {cat.id !== 'all' && count > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Stats */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">Quick Stats</p>
            <p>📦 {templates?.length || 0} templates</p>
            <p>⭐ {templates?.filter((t) => t.featured).length || 0} featured</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header with Search */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading templates...</p>
                </div>
              </div>
            ) : filteredTemplates && filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {/* Template Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-4xl">{template.icon}</div>
                        {template.featured && (
                          <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                            ⭐ Featured
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
                          {template.difficulty}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          ⏱️ {template.estimatedTime}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 text-xs text-blue-600 bg-blue-50 rounded">
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-600">+{template.tags.length - 3}</span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <span>📥 {template.installCount} installs</span>
                        {template.rating > 0 && <span>⭐ {(template.rating || 0).toFixed(1)}</span>}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="px-6 pb-6">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        View Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600">Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreview template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      )}
    </div>
  );
};
