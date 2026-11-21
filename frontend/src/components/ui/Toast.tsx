import type { ReactNode } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'warning' | 'destructive';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (options: Omit<ToastItem, 'id' | 'variant'> & { variant?: ToastVariant }) => string;
  dismiss: (id: string) => void;
}

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (options) => {
    const id = createToastId();
    set((state) => ({
      toasts: [...state.toasts, { id, variant: 'default', ...options }],
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toastItem) => toastItem.id !== id) })),
}));

function toast(options: Omit<ToastItem, 'id' | 'variant'> & { variant?: ToastVariant }): string {
  return useToastStore.getState().toast(options);
}

const toastVariants: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-success/40 bg-success text-success-foreground',
  warning: 'border-warning/40 bg-warning text-warning-foreground',
  destructive: 'border-destructive/40 bg-destructive text-destructive-foreground',
};

function Toaster(): React.JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none">
      {toasts.map((toastItem) => (
        <ToastPrimitive.Root
          key={toastItem.id}
          open
          duration={5000}
          onOpenChange={(open) => {
            if (!open) {
              dismiss(toastItem.id);
            }
          }}
          className={cn(
            'pointer-events-auto relative flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out',
            toastVariants[toastItem.variant],
          )}
        >
          <div className="grid gap-1">
            <ToastPrimitive.Title className="text-sm font-semibold">{toastItem.title}</ToastPrimitive.Title>
            {toastItem.description ? (
              <ToastPrimitive.Description className="text-sm opacity-90">{toastItem.description}</ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close className="rounded-sm opacity-70 transition-opacity hover:opacity-100" aria-label="Dismiss notification">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
    </ToastPrimitive.Viewport>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      {children}
      <Toaster />
    </ToastPrimitive.Provider>
  );
}

export { ToastProvider, toast };
