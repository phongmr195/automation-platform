import { toast as sonnerToast } from 'sonner';

// Re-export Sonner toast for convenience
export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
};

// Legacy function for compatibility
export const successAlert = (message: string) => {
  toast.success(message);
};

export const errorAlert = (message: string) => {
  toast.error(message);
};
