"""Afu ses sunucusu: ses modelini bellekte hazır tutar; her istek ~5 sn'de sesi üretir.
Yalnız 127.0.0.1 dinler; 10 dk boşta kalırsa kapanıp GPU belleğini bırakır."""
import socket
import sys
from pathlib import Path
import uygulama_sesi as adapter

PORT = 47615
IDLE_SECONDS = 600

def main():
    server = socket.socket()
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
    try:
        server.bind(('127.0.0.1', PORT))
    except OSError:
        return  # başka sunucu zaten çalışıyor
    server.listen(8)
    server.settimeout(IDLE_SECONDS)
    voices = {}
    try:
        if '--hazirla' in sys.argv:
            try:
                voices[adapter.DEFAULT_VOICE] = adapter.Voice(adapter.DEFAULT_VOICE)  # ilk istek de hızlı olsun
            except Exception:
                pass
        while True:
            try:
                conn, _ = server.accept()
            except socket.timeout:
                break
            with conn:
                try:
                    line = conn.makefile('r', encoding='utf-8').readline().strip()
                    directory = Path(line)
                    if directory.name.startswith('afu-voice-') and (directory / 'request.json').is_file():
                        adapter.run_job(directory, voices)
                    conn.sendall(b'done\n')
                except Exception:
                    pass
    finally:
        for voice in voices.values():
            try: voice.close()
            except Exception: pass

if __name__ == '__main__':
    main()
