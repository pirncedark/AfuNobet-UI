"""Actual login/thread/restart/audio evidence; no mocked success or API fallback."""
import datetime
import json
import time
import uuid
from afu_konus import ROOT, OUT, CodexThread, Voice, load_settings, speech_text

def main():
    OUT.mkdir(exist_ok=True)
    result = {'started': datetime.datetime.now().isoformat(), 'success': False, 'turns': [],
              'context_verified': False, 'restart_verified': False, 'code_cleanup_verified': False}
    client = voice = None
    try:
        state = json.loads((OUT/'thread.json').read_text(encoding='utf-8')) if (OUT/'thread.json').exists() else {}
        client = CodexThread(state)
        thread_id = state['threadId']
        token = 'afu' + uuid.uuid4().hex[:10]
        prompts = [f'Merhaba Afu. Bu sohbetin özel sözcüğü {token}. Sözcüğü hatırla ve tek cümleyle selam ver.',
                   'Az önceki özel sözcüğü söyle. Acil ve önemli işleri ayırmayı en az 8 cümlede açıkla; sonra örnek bir Python fonksiyonunu kod bloğunda ekrana yaz.']
        settings = load_settings()
        voice = Voice(settings['ses'])
        for index, prompt in enumerate(prompts):
            start = time.monotonic()
            reply = client.answer(prompt)
            print('Afu: ' + reply, flush=True)
            spoken = speech_text(reply, legacy=True)
            target = OUT / f'e2e_{result["started"].replace(":", "").replace(".", "_")}_{index+1}.wav'
            parameters = voice.generate(spoken, target, settings['filtre'])
            row = {'input': prompt, 'reply': reply, 'spoken': spoken, 'route': 'codex', 'threadId': thread_id,
                   'voice': settings['ses'], 'voice_parameters': parameters, 'wav': str(target),
                   'total_seconds': time.monotonic() - start}
            result['turns'].append(row)
            with open(OUT/'sohbet.jsonl', 'a', encoding='utf-8') as log:
                log.write(json.dumps(row, ensure_ascii=False) + '\n')
            if index == 1:
                result['context_verified'] = token in reply
                result['long_answer_verified'] = len(spoken) > 220
                result['code_cleanup_verified'] = 'Kodu ekrana yazdım.' in spoken and 'def ' not in spoken and 'ekrandaki kod' in spoken and token not in spoken
        client.close()
        client = None
        reloaded = json.loads((OUT/'thread.json').read_text(encoding='utf-8'))
        client = CodexThread(reloaded)
        reply = client.answer('Bu konuşmada belirlediğimiz özel sözcüğü tekrar söyle; tek cümle yeter.')
        print('Afu (yeniden açılış): ' + reply, flush=True)
        result['restart_reply'] = reply
        result['restart_verified'] = reloaded['threadId'] == thread_id and token in reply
        result['success'] = all(result.get(key) for key in ('context_verified', 'restart_verified', 'code_cleanup_verified', 'long_answer_verified'))
        from dogrula_sohbet import main as whisper
        whisper()
        comparisons = json.loads((OUT/'whisper.json').read_text(encoding='utf-8'))
        paths = {row['wav'] for row in result['turns']}
        result['whisper'] = [row for row in comparisons if row['wav'] in paths]
        result['whisper_verified'] = {row['wav'] for row in result['whisper']} == paths
        result['whisper_exact_match'] = result['whisper_verified'] and all(row['exact_normalized_match'] for row in result['whisper'])
        result['success'] = result['success'] and result['whisper_verified']
        return 0 if result['success'] else 1
    except Exception as error:
        result['error'] = str(error)
        print('Gerçek sohbet denemesi tamamlanamadı; normal terminalde dene_sohbet.ps1 komutunu çalıştır.', flush=True)
        return 1
    finally:
        if client:
            client.close()
        if voice:
            voice.close()
        (OUT/'e2e.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    raise SystemExit(main())
