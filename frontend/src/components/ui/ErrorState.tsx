import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 p-10 text-center', className)} role="alert">
      <AlertTriangle className="mb-3 h-6 w-6 text-destructive" aria-hidden="true" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry} type="button">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
