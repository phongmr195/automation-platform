import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OrganizationSelector } from './OrganizationSelector';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xl font-bold text-gray-900">Automation Platform</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Organization Selector */}
                <OrganizationSelector />

                {/* User Info */}
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-700">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">{user?.name || user?.email}</span>
                </div>

                {/* Workflows Group - Clickable Dropdown */}
                <div className="relative">
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 ${openMenu === 'workflows' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                    onClick={e => {
                      e.preventDefault();
                      setOpenMenu(openMenu === 'workflows' ? null : 'workflows');
                    }}
                  >
                    Workflows <ChevronDown size={16} />
                  </button>
                  <div className={`absolute left-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 ${openMenu === 'workflows' ? '' : 'hidden'}`}>
                    <Link to="/workflows" className="block px-4 py-2 text-gray-700 hover:bg-indigo-50">Workflows</Link>
                    <Link to="/templates" className="block px-4 py-2 text-gray-700 hover:bg-indigo-50">Templates</Link>
                  </div>
                </div>

                {/* Video Tools Group - Clickable Dropdown */}
                <div className="relative">
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-1 ${openMenu === 'video' ? 'bg-purple-50 text-purple-600' : ''}`}
                    onClick={e => {
                      e.preventDefault();
                      setOpenMenu(openMenu === 'video' ? null : 'video');
                    }}
                  >
                    Video Tools <ChevronDown size={16} />
                  </button>
                  <div className={`absolute left-0 mt-2 w-56 bg-white border rounded shadow-lg z-10 ${openMenu === 'video' ? '' : 'hidden'}`}>
                    <Link to="/video-editor" className="block px-4 py-2 text-gray-700 hover:bg-purple-50">🎬 Video Editor</Link>
                    <Link to="/video-editor-pro" className="block px-4 py-2 text-gray-700 hover:bg-purple-50">⭐ Video Studio Pro</Link>
                  </div>
                </div>

                {/* Analytics & Monitoring Group - Clickable Dropdown */}
                <div className="relative">
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-colors flex items-center gap-1 ${openMenu === 'analytics' ? 'bg-pink-50 text-pink-600' : ''}`}
                    onClick={e => {
                      e.preventDefault();
                      setOpenMenu(openMenu === 'analytics' ? null : 'analytics');
                    }}
                  >
                    Analytics & Monitoring <ChevronDown size={16} />
                  </button>
                  <div className={`absolute left-0 mt-2 w-56 bg-white border rounded shadow-lg z-10 ${openMenu === 'analytics' ? '' : 'hidden'}`}>
                    <Link to="/analytics" className="block px-4 py-2 text-gray-700 hover:bg-pink-50">Analytics</Link>
                    <Link to="/monitoring" className="block px-4 py-2 text-gray-700 hover:bg-pink-50">Monitoring</Link>
                    <Link to="/alerts" className="block px-4 py-2 text-gray-700 hover:bg-pink-50">Alerts</Link>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Login Link */}
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Login
                </Link>

                {/* Register Button */}
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
