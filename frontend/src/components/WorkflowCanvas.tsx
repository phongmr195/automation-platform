import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import CustomNode from './CustomNode';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function WorkflowCanvas() {
  const { nodes: workflowNodes, connections, setNodes, setConnections, setSelectedNodeId } = useWorkflowStore();
  
  const [nodes, setNodesState, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState<Edge>([]);

  // Convert workflow nodes to React Flow nodes
  useEffect(() => {
    const flowNodes: Node[] = workflowNodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        label: node.name,
        type: node.data?.service || 'unknown',
        parameters: node.data?.parameters || {},
      },
    }));
    setNodesState(flowNodes);
  }, [workflowNodes, setNodesState]);

  // Convert workflow connections to React Flow edges
  useEffect(() => {
    const flowEdges: Edge[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceOutput || null,
      targetHandle: conn.targetInput || null,
      animated: true,
    }));
    setEdgesState(flowEdges);
  }, [connections, setEdgesState]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const newConnection = {
        id: `${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceOutput: connection.sourceHandle || undefined,
        targetInput: connection.targetHandle || undefined,
      };
      
      setConnections([...connections, newConnection]);
      setEdgesState((eds) => addEdge(connection, eds));
    },
    [connections, setConnections, setEdgesState]
  );

  // Sync node positions back to store when dragged
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setNodes(
        workflowNodes.map((n) =>
          n.id === node.id ? { ...n, position: node.position } : n
        )
      );
    },
    [workflowNodes, setNodes]
  );

  // Handle node click to select it
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={4}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
