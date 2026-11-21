import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  label?: string;
  className?: string;
}

function LoadingIndicator({ label = 'Loading…', className }: LoadingIndicatorProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-sm text-muted-foreground', className)} role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export { LoadingIndicator };
