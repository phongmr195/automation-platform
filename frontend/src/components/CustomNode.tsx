import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Settings, X } from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useConfirmDialog } from './ui/ConfirmDialog';

export interface CustomNodeData {
  label: string;
  type: string;
  parameters?: Record<string, unknown>;
}

function CustomNode({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const { removeNode } = useWorkflowStore();
  const { confirm } = useConfirmDialog();
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Xóa node?',
      description: `Bạn có chắc muốn xóa node "${nodeData.label}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    
    if (confirmed) {
      removeNode(id);
    }
  };
  
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-300'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            {nodeData.type}
          </div>
          <div className="text-sm font-medium">{nodeData.label}</div>
        </div>
        <div className="flex items-center gap-1">
          <Settings className="w-4 h-4 text-gray-400" />
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 rounded transition-colors group"
            title="Xóa node"
          >
            <X className="w-3 h-3 text-gray-400 group-hover:text-red-600" />
          </button>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(CustomNode);
