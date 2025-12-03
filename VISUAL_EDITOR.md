# Workflow Automation Platform - Visual Editor

## Overview
A visual workflow editor built with React Flow that provides a drag-and-drop interface for creating and managing automation workflows.

## Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **Vite 5.0** - Build tool and dev server
- **@xyflow/react 12.0** - Workflow canvas (React Flow)
- **Tailwind CSS 3.4** - Styling
- **Zustand 4.5** - State management
- **TanStack Query 5.17** - Data fetching
- **Lucide React** - Icons

### Backend
- **Hono 4.0** - API framework
- **Node.js** - Runtime
- **TypeScript** - Type safety

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── WorkflowEditor.tsx    # Main editor layout
│   │   ├── WorkflowCanvas.tsx    # React Flow canvas
│   │   ├── NodePalette.tsx       # Draggable node library
│   │   ├── NodeConfigPanel.tsx   # Node configuration panel
│   │   └── CustomNode.tsx        # Custom node component
│   ├── stores/
│   │   └── workflowStore.ts      # Zustand state management
│   ├── services/
│   │   └── api.ts                # API client (axios)
│   ├── types/
│   │   └── workflow.ts           # TypeScript types
│   ├── App.tsx                   # Root component
│   └── index.css                 # Tailwind styles
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Features

### ✅ Completed

1. **Workflow Canvas**
   - Drag-and-drop node placement
   - Visual connection lines
   - Zoom and pan controls
   - Mini-map navigation
   - Real-time state sync

2. **Node Palette**
   - 8 available nodes grouped by category:
     - **Action**: http-request, lottery-prediction, football-results, telegram-send
     - **Transform**: transform
     - **Logic**: condition, loop
     - **Database**: database
   - Search functionality
   - One-click node addition
   - Category grouping

3. **Node Configuration Panel**
   - Dynamic parameter editing
   - Node name customization
   - Add/remove parameters
   - Delete node action
   - Type-safe parameter handling

4. **Workflow Management**
   - Save workflow (create/update)
   - Execute workflow
   - Workflow metadata editing (name, description)
   - Auto-scheduling for cron triggers
   - Active/inactive state management

5. **State Management**
   - Centralized store with Zustand
   - Node CRUD operations
   - Connection management
   - Selected node tracking
   - Workflow metadata updates

6. **API Integration**
   - REST API client with axios
   - TanStack Query for data fetching
   - Error handling
   - Loading states
   - Optimistic updates

## Development

### Start Development Server

```bash
cd frontend
npm install --legacy-peer-deps
npx vite
```

Frontend runs on: http://localhost:5173
Backend API proxied from: http://localhost:3000

### Build for Production

```bash
npm run build
npm run start
```

## API Endpoints

### Nodes
- `GET /api/engine/nodes` - List available node types

### Workflows
- `GET /api/engine/workflows` - List all workflows
- `GET /api/engine/workflows/:id` - Get workflow details
- `POST /api/engine/workflows` - Create workflow
- `PUT /api/engine/workflows/:id` - Update workflow
- `DELETE /api/engine/workflows/:id` - Delete workflow
- `POST /api/engine/workflows/:id/execute` - Execute workflow
- `POST /api/engine/workflows/:id/activate` - Activate workflow
- `POST /api/engine/workflows/:id/deactivate` - Deactivate workflow

### Executions
- `GET /api/engine/executions/:id` - Get execution details

### Schedules
- `GET /api/engine/schedules` - List scheduled workflows

## Usage

### Creating a Workflow

1. **Add Nodes**
   - Click on nodes in the left palette to add them to the canvas
   - Drag nodes to position them

2. **Connect Nodes**
   - Click and drag from a node's bottom handle (source)
   - Connect to another node's top handle (target)
   - Lines show data flow between nodes

3. **Configure Nodes**
   - Click a node to select it
   - Right panel shows configuration options
   - Edit node name and parameters
   - Add custom parameters with "+ Add Parameter"

4. **Save Workflow**
   - Edit workflow name and description at the top
   - Click "Save" button to persist changes
   - Creates new workflow or updates existing

5. **Execute Workflow**
   - Click "Run" button to execute manually
   - View execution status in browser console
   - Check backend logs for detailed output

## Workflow Store API

```typescript
// Get store instance
const { nodes, connections, workflow, selectedNodeId } = useWorkflowStore();

// Add node
addNode({
  id: 'node-1',
  name: 'HTTP Request',
  type: 'action',
  position: { x: 100, y: 100 },
  data: {
    service: 'http-request',
    operation: 'execute',
    parameters: { url: 'https://api.example.com' }
  }
});

// Update node
updateNode('node-1', { name: 'Updated Name' });

// Remove node
removeNode('node-1');

// Add connection
addConnection({
  id: 'conn-1',
  source: 'node-1',
  target: 'node-2',
});

// Update metadata
updateMetadata({ name: 'My Workflow', description: 'Description' });

// Clear all
clear();
```

## Styling

The app uses Tailwind CSS with a custom theme inspired by shadcn/ui:

- **Primary**: Blue (#3b82f6)
- **Destructive**: Red (#ef4444)
- **Border**: Gray (#e5e7eb)
- **Background**: White/Gray

Custom CSS variables defined in `src/index.css` for theming.

## Known Issues

1. **React Version Conflict**: Using `--legacy-peer-deps` to resolve lucide-react peer dependency
2. **In-Memory Storage**: Workflows stored in backend memory (not persisted to database yet)
3. **Type Safety**: Some type assertions needed for React Flow integration

## Next Steps

### Planned Features

1. **Workflow List View**
   - Browse all workflows
   - Filter and search
   - Quick actions (run, edit, delete)

2. **Execution Viewer**
   - View execution history
   - Node-by-node results
   - Error debugging
   - Execution timeline

3. **Trigger Management UI**
   - Configure cron schedules
   - Webhook settings
   - Manual trigger options

4. **Advanced Node Features**
   - Node validation
   - Input/output schema
   - Conditional outputs
   - Error handling UI

5. **Database Persistence**
   - Prisma schema for workflows
   - Workflow versioning
   - Execution history storage

6. **Authentication**
   - User accounts
   - Workflow permissions
   - Team collaboration

7. **Enhanced UX**
   - Keyboard shortcuts
   - Undo/redo
   - Copy/paste nodes
   - Workflow templates

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow React hooks best practices
- Prefer functional components
- Use Tailwind for styling (avoid inline styles)

### Component Guidelines
- Keep components small and focused
- Extract reusable logic to hooks
- Use Zustand for global state
- Use TanStack Query for server state

## License

MIT
