import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationApi, type Organization, type OrganizationMember, type AuditLog } from '../services/organizationApi';
import { useOrganization } from '../contexts/OrganizationContext';
import { Building2, Users, History, Settings, Trash2, UserPlus, Crown, Shield, User, Eye, ArrowLeft } from 'lucide-react';
import { toast } from '../utils/alerts';

export function OrganizationSettings() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { currentOrganization, refreshOrganizations } = useOrganization();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'audit'>('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  const loadOrganization = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const org = await organizationApi.getOrganization(organizationId);
      setOrganization(org);
      setFormData({
        name: org.name,
        slug: org.slug,
        description: org.description || '',
      });
      
      if (org.members) {
        setMembers(org.members);
      }

      // Load audit logs
      const { logs } = await organizationApi.getAuditLogs(organizationId, { limit: 20 });
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    try {
      await organizationApi.updateOrganization(organizationId, formData);
      toast.success('Organization updated successfully! ✅');
      await refreshOrganizations();
      await loadOrganization();
      setEditMode(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update organization';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!organizationId || !confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      await organizationApi.deleteOrganization(organizationId);
      toast.success('Organization deleted successfully');
      await refreshOrganizations();
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete organization';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'ADMIN': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'MEMBER': return <User className="w-4 h-4 text-green-600" />;
      case 'VIEWER': return <Eye className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-yellow-100 text-yellow-800';
      case 'ADMIN': return 'bg-blue-100 text-blue-800';
      case 'MEMBER': return 'bg-green-100 text-green-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Organization not found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:text-indigo-700">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const canManage = organization.role === 'OWNER' || organization.role === 'ADMIN';
  const isOwner = organization.role === 'OWNER';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                <p className="text-sm text-gray-600">/{organization.slug}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getRoleBadgeClass(organization.role || 'VIEWER')}`}>
              {getRoleIcon(organization.role || 'VIEWER')}
              {organization.role}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                General
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'members'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Members ({members.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="w-4 h-4 inline mr-2" />
                Audit Log
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {editMode ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        pattern="[a-z0-9-]+"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                          setFormData({
                            name: organization.name,
                            slug: organization.slug,
                            description: organization.description || '',
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                      <p className="text-gray-900">{organization.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Slug</h3>
                      <p className="text-gray-900">/{organization.slug}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                      <p className="text-gray-900">{organization.description || 'No description'}</p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Edit Organization
                      </button>
                    )}
                  </div>
                )}

                {isOwner && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Organization
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {canManage && (
                  <button
                    onClick={() => navigate(`/organizations/${organizationId}/invite`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </button>
                )}

                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.user.name || member.user.email}</p>
                          <p className="text-sm text-gray-500">{member.user.email}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getRoleBadgeClass(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activity yet</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{log.action.replace(/\./g, ' ')}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            by {log.user?.name || log.user?.email || 'Unknown'} • {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
