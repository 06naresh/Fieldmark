import { Badge } from '@/components/ui';
import type { InspectionStatus } from '@/types/entities';

const statusVariants: Record<
  InspectionStatus,
  'secondary' | 'default' | 'success' | 'outline' | 'destructive'
> = {
  ASSIGNED: 'secondary',
  IN_PROGRESS: 'default',
  SUBMITTED: 'success',
  REVIEWED: 'outline',
  CANCELLED: 'destructive',
};

const statusLabels: Record<InspectionStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  CANCELLED: 'Cancelled',
};

interface InspectionStatusBadgeProps {
  status: InspectionStatus;
}

export function InspectionStatusBadge({ status }: InspectionStatusBadgeProps): React.JSX.Element {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>;
}
