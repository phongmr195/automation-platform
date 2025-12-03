import { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { Building2, ChevronDown, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OrganizationSelector() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!currentOrganization && organizations.length === 0) {
    return (
      <button
        onClick={() => navigate('/organizations/new')}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create Organization
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="max-w-[150px] truncate">
          {currentOrganization?.name || 'Select Organization'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 z-20 w-64 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Organizations
              </div>

              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
                    currentOrganization?.id === org.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{org.name}</div>
                    <div className="text-xs text-gray-500">
                      {org.role} • {org._count?.members || 0} members
                    </div>
                  </div>
                </button>
              ))}

              <div className="my-2 border-t border-gray-200" />

              <button
                onClick={() => {
                  navigate('/organizations/new');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Organization
              </button>

              {currentOrganization && (
                <button
                  onClick={() => {
                    navigate(`/organizations/${currentOrganization.id}/settings`);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Organization Settings
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
