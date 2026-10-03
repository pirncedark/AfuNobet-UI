import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pet_cut", ROOT / "windows/scripts/pet_kes.py")
cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cut)


def test_green_key_preserves_original_character_colors_and_removes_grid():
    source = Image.new("RGB", (40, 40), (0, 177, 64))
    pixels = np.array(source)
    pixels[10:30, 12:28] = (24, 45, 200)
    pixels[38:] = (235, 235, 235)
    result = np.array(cut.green_key(Image.fromarray(pixels)))
    assert result[0, 0, 3] == 0
    assert result[15, 15].tolist() == [24, 45, 200, 255]
    assert result[39, 1, 3] == 0


def test_bar_detection_follows_each_cells_own_gray_line():
    pixels = np.zeros((50, 50, 3), dtype=np.uint8)
    pixels[:] = (0, 177, 64)
    pixels[33:] = (185, 190, 200)
    assert cut.bar_line(Image.fromarray(pixels)) == 33


def test_alignment_keeps_all_original_pixels_without_resizing():
    image = Image.new("RGBA", (20, 30), (0, 0, 0, 0))
    image.paste((20, 40, 200, 255), (5, 3, 15, 30))
    aligned, offset = cut.align(image, (80, 80), face_x=10)
    assert aligned.size == (80, 80)
    assert aligned.getbbox()[3] == 79
    assert tuple(np.array(aligned)[offset[1] + 3, offset[0] + 5]) == (20, 40, 200, 255)

def test_white_grid_detects_unequal_rows():
    image = Image.new("RGB", (100, 120), (0, 177, 64))
    image.paste((255, 255, 255), (48, 0, 51, 120))
    image.paste((255, 255, 255), (0, 73, 100, 76))
    xs, ys = cut.grid_bounds(image, 2, 2)
    assert xs == [0, 49, 100] and ys == [0, 74, 120]

def test_delivery_cut_set_exists_and_validates_all_groups():
    assert cut.validate_delivery() == 0


def test_lower_halo_cleanup_removes_only_five_exposed_bright_layers():
    pixels = np.full((40, 40, 4), (30, 60, 140, 255), dtype=np.uint8)
    pixels[:, 0] = 0
    pixels[28:, 1:8] = (240, 240, 240, 255)
    pixels[30, 1] = (130, 180, 220, 255)
    pixels[10, 1] = (255, 255, 255, 255)
    result = np.array(cut.clean_lower_halo(Image.fromarray(pixels)))
    assert np.all(result[28:, 1:6, 3] == 0)
    assert result[35, 6].tolist() == [240, 240, 240, 200]
    assert result[35, 7].tolist() == [240, 240, 240, 255]
    assert result[10, 1].tolist() == [255, 255, 255, 255]
    assert result[20, 20].tolist() == [30, 60, 140, 255]
    assert np.array_equal(result[:, :, :3], pixels[:, :, :3])


def test_lower_halo_cleanup_keeps_alpha_when_no_halo_is_removed():
    image = Image.new("RGBA", (20, 20), (30, 60, 140, 255))
    image.paste((0, 0, 0, 0), (0, 0, 1, 20))
    assert np.array_equal(np.array(cut.clean_lower_halo(image)), np.array(image))


def test_left_gaze_is_lossless_source_mirror_and_public_asset_matches():
    import json
    manifest = json.loads((ROOT / "afu-character/kesim.json").read_text(encoding="utf-8"))
    for name, mirrored in [("idle_sol", True), ("idle_sag", False)]:
        record = manifest["frames"]["pet/" + name]
        assert record["mirror_x"] is mirrored
        source = Image.open(cut.SOURCE / record["source"]).convert("RGB").crop(record["box"])
        source = cut.green_key(source).crop(record["trim"])
        if mirrored:
            source = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        delivered = Image.open(ROOT / ("afu-character/pet/" + name + ".png"))
        x, y = record["offset"]
        expected = Image.new("RGBA", tuple(record["canvas"]))
        expected.alpha_composite(source, (x, y))
        expected = cut.clean_lower_halo(expected)
        assert np.array_equal(np.array(delivered), np.array(expected))
        public = Image.open(cut.PUBLIC / (name + ".webp")).convert("RGBA")
        assert np.array_equal(np.array(public), np.array(delivered))


def test_delivery_pipeline_reproduces_generated_pet_assets_losslessly(tmp_path, monkeypatch):
    public = tmp_path / "windows/public/afu/pet"
    public.mkdir(parents=True)
    (tmp_path / "windows/src-tauri/icons").mkdir(parents=True)
    (tmp_path / "afu-character").mkdir()
    monkeypatch.setattr(cut, "ROOT", tmp_path)
    monkeypatch.setattr(cut, "PUBLIC", public)
    assert cut.build_delivery() == 0
    rebuilt_paths = list((tmp_path / "afu-character/pet").glob("*.png"))
    assert len(rebuilt_paths) == 35
    for rebuilt_path in rebuilt_paths:
        delivered_path = ROOT / "afu-character/pet" / rebuilt_path.name
        rebuilt = Image.open(rebuilt_path)
        delivered = Image.open(delivered_path)
        assert rebuilt.size == delivered.size
        assert np.array_equal(np.array(rebuilt), np.array(delivered)), delivered_path.name
        webp = Image.open(public / (delivered_path.stem + ".webp")).convert("RGBA")
        delivered_webp = Image.open(ROOT / "windows/public/afu/pet" / (delivered_path.stem + ".webp")).convert("RGBA")
        assert np.array_equal(np.array(webp), np.array(rebuilt)), delivered_path.name
        assert np.array_equal(np.array(delivered_webp), np.array(delivered)), delivered_path.name
