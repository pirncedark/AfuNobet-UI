import { expect, it } from 'vitest';
import { State } from '../src/core/state';

it.each([
  ['Hata', '', 'b'],
  ['Duraklatildi', 'kota doldu', 'b'],
])('simge odak dışındaki %s görevini önceliklendirir', (status, mesaj, expected) => {
  State.focusId = 'a';
  State.apply({ version: 1, mesaj: '', tasks: [
    { id: 'a', agent: 'codex', status: 'Calisiyor', task: 'A görevi', updated_at: new Date().toISOString() },
    { id: 'b', agent: 'gemini', status, mesaj, task: 'B görevi', updated_at: new Date().toISOString() },
  ] });
  expect(State.focusTask?.id).toBe('a');
  expect(State.trayTask?.id).toBe(expected);
  State.apply({ version: 1, mesaj: '', tasks: [] });
});
