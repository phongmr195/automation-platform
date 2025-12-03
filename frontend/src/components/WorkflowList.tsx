import { useQuery } from '@tanstack/react-query';
import { workflowApi } from '../services/api';
import { Play, Edit, Copy, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { toast } from '../utils/alerts';

export default function WorkflowList() {
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: workflowApi.getWorkflows,
  });

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Xóa workflow?',
      description: `Bạn có chắc muốn xóa workflow "${name}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      try {
        await workflowApi.deleteWorkflow(id);
        toast.success('Workflow đã được xóa');
        refetch();
      } catch (error) {
        toast.error('Lỗi khi xóa workflow: ' + String(error));
      }
    }
  };

  const handleRun = async (id: string, name: string) => {
    try {
      await workflowApi.executeWorkflow(id);
      toast.success(`Workflow "${name}" đang chạy`);
    } catch (error) {
      toast.error('Lỗi khi chạy workflow: ' + String(error));
    }
  };

  const handleClone = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Nhân bản workflow?',
      description: `Tạo bản sao của workflow "${name}"?`,
      confirmText: 'Nhân bản',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      try {
        const workflow = await workflowApi.getWorkflow(id);
        await workflowApi.createWorkflow({
          ...workflow,
          id: undefined,
          name: `${workflow.name} (Copy)`,
          active: false,
        });
        toast.success('Workflow đã được nhân bản');
        refetch();
      } catch (error) {
        toast.error('Lỗi khi nhân bản workflow: ' + String(error));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  const workflows = data?.workflows || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and execute your automation workflows
              </p>
            </div>
            <button
              onClick={() => navigate('/editor')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first workflow</p>
            <button
              onClick={() => navigate('/editor')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nodes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workflows.map((workflow: any) => (
                  <tr key={workflow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-gray-500">{workflow.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          workflow.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workflow.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {workflow.nodeCount} nodes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(workflow.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRun(workflow.id, workflow.name)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Run workflow"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/editor/${workflow.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit workflow"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleClone(workflow.id, workflow.name)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          title="Clone workflow"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(workflow.id, workflow.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
