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
it('Claude sonuç ve onay olaylarını sesli söyler (1.0.4)',()=>{expect(announcement({kind:'JOB_FINISHED',taskId:'a',agent:'claude'})).toBe('Claude işini bitirdi.');expect(announcement({kind:'WAITING',taskId:'a',agent:'claude'})).toBe('Claude onayını bekliyor.');expect(announcement({kind:'COMMAND',taskId:'a',agent:'claude'})).toBeNull();});
it('planın sessiz başlangıç olayı konuşmaz',()=>{expect(announcement({kind:'JOB_STARTED',taskId:'a',agent:'codex'})).toBeNull();});
