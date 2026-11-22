import { expect, test } from '@playwright/test';
import {
  answerOperation,
  getAnswersApi,
  pushOperationsApi,
  randomId,
  registerDeviceApi,
  startInspectionApi,
} from '../utils/api';
import { createInspectionFixture } from '../utils/fixtures';

test('Scenario C — retrying the same operation does not duplicate server data', async ({
  request,
}) => {
  const fixture = await createInspectionFixture(request, {
    question: 'Is the emergency stop accessible?',
  });
  const itemId = fixture.template.items[0].id;
  const inspectionId = fixture.inspection.id;
  const device = await registerDeviceApi(request, fixture.inspector.token, 'idempotency-device');
  await startInspectionApi(
    request,
    fixture.inspector.token,
    inspectionId,
    fixture.inspection.version,
  );

  const entityId = randomId();
  const operationId = randomId();
  const operation = answerOperation({
    inspectionId,
    itemId,
    entityId,
    operationId,
    value: true,
    notes: 'Retry-safe answer',
  });

  // The first response is intentionally discarded to model a lost response.
  const first = await pushOperationsApi(request, fixture.inspector.token, device.id, [operation]);
  expect(first[0]).toMatchObject({
    status: 'ACCEPTED',
    operation_id: operationId,
    entity_id: entityId,
    server_version: 1,
  });

  const retry = await pushOperationsApi(request, fixture.inspector.token, device.id, [operation]);
  expect(retry).toEqual(first);

  const answers = await getAnswersApi(request, fixture.inspector.token, inspectionId);
  const matching = answers.filter((answer) => answer.checklist_item_id === itemId);
  expect(matching).toHaveLength(1);
  expect(matching[0]).toMatchObject({ id: entityId, answer_value: true, version: 1 });
});
