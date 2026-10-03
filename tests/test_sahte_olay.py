import os
import json
import pytest
from pathlib import Path
from unittest.mock import patch
import sys

# scripts klasorunu sys.path'e ekle
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
import sahte_olay

@pytest.fixture
def test_dir(tmp_path):
    # tmp_path pytest tarafindan saglanan gecici bir Path nesnesidir
    return tmp_path

def test_write_state(test_dir):
    state = sahte_olay.create_base_state()
    sahte_olay.write_state(test_dir, state)
    
    state_file = test_dir / "state.json"
    assert state_file.exists()
    
    with open(state_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["version"] == 1
        assert "tasks" in data

def test_write_question(test_dir):
    sahte_olay.write_question(test_dir, "test-q-1", "codex")
    
    question_file = test_dir / "sorular" / "test-q-1.json"
    assert question_file.exists()
    
    with open(question_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["id"] == "test-q-1"
        assert data["ajan"] == "codex"
        assert len(data["secenekler"]) == 2

@patch("time.sleep", return_value=None)
@patch("sahte_olay.wait_for_answer")
def test_play_codex_soru(mock_wait, mock_sleep, test_dir):
    mock_wait.return_value = True
    
    sahte_olay.play_codex_soru(test_dir)
    
    state_file = test_dir / "state.json"
    assert state_file.exists()
    
    with open(state_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert len(data["tasks"]) == 1
        task = data["tasks"][0]
        # Senaryo basariyla bitince Tamamlandi olmali
        assert task["status"] == "Tamamlandi"

@patch("time.sleep", return_value=None)
def test_play_gemini_kota(mock_sleep, test_dir):
    sahte_olay.play_gemini_kota(test_dir)
    
    state_file = test_dir / "state.json"
    assert state_file.exists()
    
    with open(state_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        task = data["tasks"][0]
        assert task["status"] == "Hata"
        assert "429" in task["message"]

@patch("time.sleep", return_value=None)
def test_play_hata(mock_sleep, test_dir):
    sahte_olay.play_hata(test_dir)
    
    state_file = test_dir / "state.json"
    assert state_file.exists()
    
    with open(state_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        task = data["tasks"][0]
        assert task["status"] == "Hata"
        assert "bulunamadi" in task["message"]

@patch("time.sleep", return_value=None)
def test_play_bayat(mock_sleep, test_dir):
    sahte_olay.play_bayat(test_dir)
    
    state_file = test_dir / "state.json"
    assert state_file.exists()
    
    with open(state_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        task = data["tasks"][0]
        assert task["status"] == "Calisiyor"
        assert task["started_at"] == "2020-01-01T00:00:00Z"

def test_wait_for_answer_success(test_dir):
    cevaplar_dir = test_dir / "cevaplar"
    cevaplar_dir.mkdir(parents=True)
    cevap_file = cevaplar_dir / "q1.json"
    
    # Soru dosyasini da olusturalim ki silinirken hata vermesin
    sorular_dir = test_dir / "sorular"
    sorular_dir.mkdir(parents=True)
    (sorular_dir / "q1.json").touch()
    
    with open(cevap_file, "w", encoding="utf-8") as f:
        json.dump({"secim": "evet"}, f)
        
    result = sahte_olay.wait_for_answer(test_dir, "q1", timeout_sec=2)
    assert result is True
    assert not cevap_file.exists()
    assert not (sorular_dir / "q1.json").exists()

@patch("time.sleep", return_value=None)
def test_wait_for_answer_timeout(mock_sleep, test_dir):
    result = sahte_olay.wait_for_answer(test_dir, "q2", timeout_sec=1)
    assert result is False
