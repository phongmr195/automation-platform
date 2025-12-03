import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import WorkflowEditor from './components/WorkflowEditor';
import WorkflowList from './components/WorkflowList';
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WorkflowList />} />
            <Route path="/editor" element={<WorkflowEditor />} />
            <Route path="/editor/:id" element={<WorkflowEditor />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
