import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome{user?.name ? `, ${user.name}` : ''}! 👋
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Build powerful automation workflows with ease
          </p>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4">
            <Link
              to="/workflows"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
            >
              View Workflows
            </Link>
            <Link
              to="/workflows/new"
              className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              Create New Workflow
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Monitoring
            </h3>
            <p className="text-gray-600">
              Monitor your workflow executions in real-time with WebSocket connections
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure Credentials
            </h3>
            <p className="text-gray-600">
              Store API keys and credentials securely with AES-256 encryption
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Visual Editor
            </h3>
            <p className="text-gray-600">
              Build workflows visually with our intuitive drag-and-drop interface
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Your Account
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-indigo-600">0</p>
              <p className="text-gray-600 mt-1">Active Workflows</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-gray-600 mt-1">Executions Today</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-pink-600">100%</p>
              <p className="text-gray-600 mt-1">Success Rate</p>
            </div>
          </div>

          {/* User Details */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Status:</span>
                <span className="font-medium text-green-600">
                  {user?.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
