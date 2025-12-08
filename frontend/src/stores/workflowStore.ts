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
  
  setWorkflow: (workflow) => {
    let nodes: WorkflowNode[] = [];
    let connections: NodeConnection[] = [];
    
    if (workflow) {
      console.log('🔍 Loading workflow:', workflow.id, workflow.name);
      console.log('📦 Workflow data:', {
        hasPublishedVersion: !!workflow.publishedVersion,
        versionsCount: workflow.versions?.length || 0,
        hasOldNodes: !!workflow.nodes,
        hasOldConnections: !!workflow.connections
      });
      
      // New workflow structure uses versions array
      let definition: any = null;
      
      // Try to get definition from publishedVersion or latest version
      if (workflow.publishedVersion?.definition) {
        definition = workflow.publishedVersion.definition;
        console.log('✅ Using publishedVersion definition');
      } else if (workflow.versions && workflow.versions.length > 0) {
        // Get latest version
        const latestVersion = workflow.versions[workflow.versions.length - 1];
        definition = latestVersion.definition;
        console.log('✅ Using latest version definition:', latestVersion.versionNumber);
      }
      
      if (definition) {
        console.log('📋 Definition found:', {
          hasNodes: !!definition.nodes,
          hasEdges: !!definition.edges,
          nodesType: typeof definition.nodes,
          edgesType: typeof definition.edges,
          fullDefinition: definition
        });
        
        // New format: definition.nodes and definition.edges
        if (definition.nodes) {
          nodes = Array.isArray(definition.nodes) ? definition.nodes : 
                  (typeof definition.nodes === 'string' ? JSON.parse(definition.nodes) : []);
          console.log('✅ Loaded nodes:', nodes.length, nodes);
        }
        
        // Convert edges to connections
        if (definition.edges) {
          connections = Array.isArray(definition.edges) ? definition.edges :
                       (typeof definition.edges === 'string' ? JSON.parse(definition.edges) : []);
          console.log('✅ Loaded connections:', connections.length);
        }
      } else {
        console.log('⚠️ No definition found, trying old format...');
        // Fallback to old format for backwards compatibility
        const rawNodes = workflow.nodes;
        if (typeof rawNodes === 'string') {
          try {
            nodes = JSON.parse(rawNodes);
          } catch (e) {
            console.error('Failed to parse nodes:', e);
            nodes = [];
          }
        } else if (Array.isArray(rawNodes)) {
          nodes = rawNodes;
        }
        
        const rawConnections = workflow.connections;
        if (typeof rawConnections === 'string') {
          try {
            connections = JSON.parse(rawConnections);
          } catch (e) {
            console.error('Failed to parse connections:', e);
            connections = [];
          }
        } else if (Array.isArray(rawConnections)) {
          connections = rawConnections;
        }
      }
      
      // Ensure all nodes have proper data structure
      nodes = nodes.map(node => ({
        ...node,
        data: node.data || {
          service: 'unknown',
          operation: 'execute',
          parameters: {},
        }
      }));
    }
    
    set({
      workflow,
      nodes,
      connections,
      selectedNodeId: null,
    });
  },
  
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
