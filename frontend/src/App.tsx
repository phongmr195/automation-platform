import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import WorkflowEditor from './components/WorkflowEditor';
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
        <div className="w-screen h-screen overflow-hidden bg-gray-100">
          <WorkflowEditor />
        </div>
        <Toaster position="top-right" richColors />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
