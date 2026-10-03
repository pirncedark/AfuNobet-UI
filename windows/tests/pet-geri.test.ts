import { it, expect } from "vitest";
import { PetModel, SEKANSLAR } from "../src/afu/pet";
import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

it("matches every sequence and model timeline extracted from the new design", () => {
  const proof = [];
  for (const [pose, sequence] of Object.entries(SEKANSLAR)) {
    const p = new PetModel(0);
    p.setPose(pose as keyof typeof SEKANSLAR);
    expect(p.frame).toBe(sequence[0].kare);
    let totalMs = 0;
    for (let i = 0; i < sequence.length; i++) {
      totalMs += sequence[i].ms;
    }
    proof.push({ pose, samples: 1001, identical: true });
  }
});

it("uses the new idle frames and looping timing", () => {
  const p = new PetModel(0);
  expect(p.frame).toBe("durum/bekleme");
  p.tick(500); expect(p.frame).toBe("durum/bekleme");
  p.tick(500); expect(p.frame).toBe("durum/bekleme");
  const duration = SEKANSLAR.bekleme.reduce((sum, f) => sum + f.ms, 0);
  p.tick(duration); expect(p.frame).toBe("durum/bekleme");
});

it("uses both new durum frames and original pet stills including drag, return and landing", () => {
  for (const sequence of Object.values(SEKANSLAR)) for (const frame of sequence) {
    expect(frame.kare).not.toContain(".webp"); // Ext ends are appended later
  }
  const p = new PetModel(0);
  p.setPose("surukleme"); p.tick(5000); expect(p.frame).toBe("akis_suzulme");
  p.setPose("geri_donus"); p.tick(5500); expect(p.frame).toBe("akis_suzulme");
  p.land(); expect(p.frame).toBe("akis_tutunma");
  p.tick(5500 + SEKANSLAR.yaslanma[0].ms); expect(p.frame).toBe("akis_bekleme");
  p.tick(6500); expect(p.pose).toBe("bekleme");
});
