import { useCallback, useEffect, useState } from 'react';
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
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useHistoryStore } from '../stores/historyStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { autoLayout } from '../utils/autoLayout';
import { toast } from '../utils/alerts';
import CustomNode from './CustomNode';
import { NodeSearchPanel } from './Canvas/NodeSearchPanel';
import StickyNoteNode from './Canvas/StickyNoteNode';
import {
  Search,
  StickyNote,
  Undo2,
  Redo2,
  Layers,
  Keyboard,
} from 'lucide-react';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  stickyNote: StickyNoteNode,
};

export default function WorkflowCanvas() {
  const { nodes: workflowNodes, connections, setNodes, setConnections, setSelectedNodeId } = useWorkflowStore();
  const { recordState, undo, redo, canUndo, canRedo } = useHistoryStore();
  
  const [nodes, setNodesState, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState<Edge>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [stickyNotes, setStickyNotes] = useState<any[]>([]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      description: 'Search nodes',
      action: () => setShowSearch(true),
    },
    {
      key: 'z',
      ctrl: true,
      description: 'Undo',
      action: handleUndo,
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      description: 'Redo',
      action: handleRedo,
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Add sticky note',
      action: handleAddStickyNote,
    },
    {
      key: 'l',
      ctrl: true,
      description: 'Auto layout',
      action: handleAutoLayout,
    },
    {
      key: 'Escape',
      description: 'Close search',
      action: () => setShowSearch(false),
    },
    {
      key: '?',
      shift: true,
      description: 'Show shortcuts',
      action: handleShowShortcuts,
    },
  ]);

  function handleUndo() {
    const previousState = undo();
    if (previousState) {
      const state = JSON.parse(previousState);
      setNodes(state.nodes);
      setConnections(state.connections);
      toast.success('Undone');
    }
  }

  function handleRedo() {
    const nextState = redo();
    if (nextState) {
      const state = JSON.parse(nextState);
      setNodes(state.nodes);
      setConnections(state.connections);
      toast.success('Redone');
    }
  }

  function handleAddStickyNote() {
    const newNote = {
      id: `sticky-${Date.now()}`,
      type: 'stickyNote',
      position: { x: 100, y: 100 },
      data: {
        id: `sticky-${Date.now()}`,
        content: '',
        color: '#fef3c7',
      },
    };
    setNodesState((nodes) => [...nodes, newNote]);
    setStickyNotes((notes) => [...notes, newNote.data]);
    toast.success('Sticky note added');
  }

  function handleAutoLayout() {
    const layoutedNodes = autoLayout(nodes, edges);
    setNodesState(layoutedNodes);
    
    // Update workflow store
    const updatedWorkflowNodes = layoutedNodes
      .filter((n) => n.type === 'custom')
      .map((n) => {
        const workflowNode = workflowNodes.find((wn) => wn.id === n.id);
        return workflowNode ? { ...workflowNode, position: n.position } : null;
      })
      .filter(Boolean);
    
    if (updatedWorkflowNodes.length > 0) {
      setNodes(updatedWorkflowNodes as any[]);
      toast.success('Layout applied');
    }
  }

  function handleShowShortcuts() {
    toast.info(
      'Keyboard Shortcuts:\n' +
      '⌘/Ctrl+K - Search nodes\n' +
      '⌘/Ctrl+Z - Undo\n' +
      '⌘/Ctrl+Shift+Z - Redo\n' +
      '⌘/Ctrl+N - Add sticky note\n' +
      '⌘/Ctrl+L - Auto layout\n' +
      'Shift+? - Show shortcuts'
    );
  }

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
    setNodesState([...flowNodes, ...stickyNotes.map(note => ({
      id: note.id,
      type: 'stickyNote',
      position: note.position || { x: 100, y: 100 },
      data: {
        ...note,
        onUpdate: handleUpdateStickyNote,
        onDelete: handleDeleteStickyNote,
      },
    }))]);
  }, [workflowNodes, stickyNotes, setNodesState]);

  // Convert workflow connections to React Flow edges
  useEffect(() => {
    const flowEdges: Edge[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceOutput || null,
      targetHandle: conn.targetInput || null,
      animated: true,
      label: conn.label,
      labelStyle: { fontSize: 12, fontWeight: 500 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
    }));
    setEdgesState(flowEdges);
  }, [connections, setEdgesState]);

  // Record state for undo/redo
  useEffect(() => {
    const state = JSON.stringify({
      nodes: workflowNodes,
      connections,
    });
    recordState(state);
  }, [workflowNodes, connections, recordState]);

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

  // Handle sticky note updates
  const handleUpdateStickyNote = (id: string, content: string, color: string) => {
    setStickyNotes((notes) =>
      notes.map((note) =>
        note.id === id ? { ...note, content, color } : note
      )
    );
  };

  const handleDeleteStickyNote = (id: string) => {
    setStickyNotes((notes) => notes.filter((note) => note.id !== id));
    setNodesState((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="w-full h-full bg-gray-50 relative">
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
        deleteKeyCode="Delete"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />

        <NodeSearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />

        {/* Toolbar Panel */}
        <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Search nodes (⌘K)"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={handleAddStickyNote}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Add sticky note (⌘N)"
          >
            <StickyNote className="w-5 h-5 text-gray-600" />
          </button>

          <div className="border-l border-gray-300 mx-1" />

          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-5 h-5 text-gray-600" />
          </button>

          <div className="border-l border-gray-300 mx-1" />

          <button
            onClick={handleAutoLayout}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Auto layout (⌘L)"
          >
            <Layers className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={handleShowShortcuts}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Keyboard shortcuts (⇧?)"
          >
            <Keyboard className="w-5 h-5 text-gray-600" />
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
