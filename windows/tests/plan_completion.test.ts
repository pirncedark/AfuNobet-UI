import { expect, it } from 'vitest';
import { State, quotaRows } from '../src/core/state';
import { announcement } from '../src/chat/voice';
it('Codex gerçek hesap kotası eski önbelleği aşar ve sonraki durum yenilemesinde korunur',()=>{
  State.setCodexLimits({primary:{usedPercent:18,resetsAt:1791000000}});
  State.apply({version:1,mesaj:'',tasks:[],quotas:{codex:{remaining_percent:5}}});
  expect(quotaRows(State.snapshot)[0].percent).toBe('%82');
  State.setCodexLimits({});
  expect(quotaRows(State.snapshot)[0].percent).toBe('—');
});
it('planın sessiz başlangıç olayı konuşmaz',()=>{expect(announcement({kind:'JOB_STARTED',taskId:'a',agent:'codex'})).toBeNull();});
