import Dexie, { type Table } from 'dexie';
import type {
  LocalChecklistTemplateRecord,
  LocalConflictRecord,
  LocalInspectionAnswerRecord,
  LocalInspectionRecord,
  LocalSiteRecord,
  LocalUserRecord,
  SyncMetadataRecord,
  SyncQueueRecord,
} from '@/db/localTypes';

export const FIELDMARK_LOCAL_DB_NAME = 'fieldmark_local_db';

type FieldmarkLocalDb = Dexie & {
  local_users: Table<LocalUserRecord, string>;
  local_sites: Table<LocalSiteRecord, string>;
  local_inspections: Table<LocalInspectionRecord, string>;
  local_checklist_templates: Table<LocalChecklistTemplateRecord, string>;
  local_inspection_answers: Table<LocalInspectionAnswerRecord, string>;
  sync_queue: Table<SyncQueueRecord, string>;
  sync_metadata: Table<SyncMetadataRecord, string>;
  sync_conflicts: Table<LocalConflictRecord, string>;
};

/**
 * Durable browser database for offline inspection work.
 *
 * Version 1 defines the eight tables approved by the offline-sync design.
 * Every future schema change must add a Dexie version rather than mutating
 * this definition in place.
 */
export const fieldmarkLocalDb = new Dexie(FIELDMARK_LOCAL_DB_NAME) as FieldmarkLocalDb;

fieldmarkLocalDb.version(1).stores({
  local_users: 'id, owner_id, server_user_id, offline_access_expires_at',
  local_sites: 'id, owner_id, server_id, [owner_id+server_id]',
  local_inspections:
    'id, owner_id, server_id, inspector_id, status, sync_status, [owner_id+server_id]',
  local_checklist_templates: 'id, owner_id, server_id, revision, [owner_id+server_id]',
  local_inspection_answers:
    'id, owner_id, inspection_id, checklist_item_id, [owner_id+inspection_id+checklist_item_id], sync_status',
  sync_queue:
    'id, user_id, device_id, entity_type, entity_id, status, [user_id+status], [user_id+device_id+status], created_at',
  sync_metadata: 'id, user_id, key, [user_id+key], updated_at',
  sync_conflicts: 'id, user_id, operation_id, status, [user_id+status]',
});
