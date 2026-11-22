import { useQuery } from '@tanstack/react-query';
import { checklistsApi } from '@/services/api/checklistsApi';
import { sitesApi } from '@/services/api/sitesApi';
import { useAuthStore } from '@/store/authStore';
import { getInspectionReferences } from '@/features/inspections/services/offlineInspectionService';
import type { ChecklistTemplate, Site } from '@/types/entities';

export interface InspectionReferences {
  sitesById: Map<string, Site>;
  templatesById: Map<string, ChecklistTemplate>;
  isLoading: boolean;
  error: unknown;
}

export function useInspectionReferences(): InspectionReferences {
  const currentUser = useAuthStore((state) => state.user);
  const ownerId = currentUser?.id ?? 'anonymous';

  const references = useQuery({
    queryKey: ['inspection-references', ownerId],
    queryFn: () =>
      getInspectionReferences(
        ownerId,
        () => sitesApi.list({ page_size: 100 }),
        () => checklistsApi.list({ page_size: 100 }),
      ),
  });

  return {
    sitesById: new Map((references.data?.sites ?? []).map((site) => [site.id, site])),
    templatesById: new Map(
      (references.data?.templates ?? []).map((template) => [template.id, template]),
    ),
    isLoading: references.isLoading,
    error: references.error,
  };
}
