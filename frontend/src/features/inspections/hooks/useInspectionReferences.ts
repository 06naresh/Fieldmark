import { useQuery } from '@tanstack/react-query';
import { checklistsApi } from '@/services/api/checklistsApi';
import { sitesApi } from '@/services/api/sitesApi';
import type { ChecklistTemplate, Site } from '@/types/entities';

export interface InspectionReferences {
  sitesById: Map<string, Site>;
  templatesById: Map<string, ChecklistTemplate>;
  isLoading: boolean;
  error: unknown;
}

export function useInspectionReferences(): InspectionReferences {
  const sites = useQuery({
    queryKey: ['sites', 'inspector-labels'],
    queryFn: () => sitesApi.list({ page_size: 100 }),
  });
  const checklists = useQuery({
    queryKey: ['checklists', 'inspector-labels'],
    queryFn: () => checklistsApi.list({ page_size: 100 }),
  });

  return {
    sitesById: new Map((sites.data?.data ?? []).map((site) => [site.id, site])),
    templatesById: new Map(
      (checklists.data?.data ?? []).map((template) => [template.id, template]),
    ),
    isLoading: sites.isLoading || checklists.isLoading,
    error: sites.error ?? checklists.error,
  };
}
