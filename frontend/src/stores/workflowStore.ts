import { create } from 'zustand';
import type { Workflow, WorkflowNode, NodeConnection } from '../types/workflow';

interface WorkflowStore {
  // Current workflow
  workflow: Workflow | null;
  setWorkflow: (workflow: Workflow | null) => void;
  
  // Nodes and connections
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  setNodes: (nodes: WorkflowNode[]) => void;
  setConnections: (connections: NodeConnection[]) => void;
  
  // Selected node
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // Actions
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (id: string) => void;
  addConnection: (connection: NodeConnection) => void;
  removeConnection: (id: string) => void;
  
  // Workflow metadata
  updateMetadata: (updates: Partial<Pick<Workflow, 'name' | 'description' | 'active'>>) => void;
  
  // Clear
  clear: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflow: null,
  nodes: [],
  connections: [],
  selectedNodeId: null,
  
  setWorkflow: (workflow) => set({
    workflow,
    nodes: workflow?.nodes?.map(node => ({
      ...node,
      data: node.data || {
        service: 'unknown',
        operation: 'execute',
        parameters: {},
      }
    })) || [],
    connections: workflow?.connections || [],
    selectedNodeId: null,
  }),
  
  setNodes: (nodes) => set({ nodes }),
  setConnections: (connections) => set({ connections }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
  })),
  
  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === id ? { ...node, ...updates } : node
    ),
  })),
  
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    connections: state.connections.filter(
      (conn) => conn.source !== id && conn.target !== id
    ),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
  })),
  
  addConnection: (connection) => set((state) => ({
    connections: [...state.connections, connection],
  })),
  
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((conn) => conn.id !== id),
  })),
  
  updateMetadata: (updates) => set((state) => ({
    workflow: state.workflow ? { ...state.workflow, ...updates } : null,
  })),
  
  clear: () => set({
    workflow: null,
    nodes: [],
    connections: [],
    selectedNodeId: null,
  }),
}));
