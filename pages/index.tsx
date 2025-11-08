// pages/index.tsx
import React, { useState } from "react";

/* ==== ثابت‌ها: از app.py استخراج شده (بدون تغییر منطق) ==== */
const MODEL_CAPS: Record<string, number> = {
  "Unity XT 380": 500,
  "Unity XT 480": 1500,
  "Unity XT 680": 2000,
  "Unity XT 880": 4000,
  "Unity XT 480F": 1500,
  "Unity XT 680F": 2000,
  "Unity XT 880F": 4000,
};

const RAID_SETS: Record<string, string[]> = {
  RAID5: ["4+1", "8+1", "12+1"],
  RAID6: ["4+2", "6+2", "8+2", "12+2", "14+2"],
  RAID10: ["1+1", "2+2", "3+3", "4+4"],
};

const RAID_OPTIONS: Record<string, string[]> = {
  "Extreme Performance": ["RAID5", "RAID6", "RAID10"],
  Performance: ["RAID5", "RAID6", "RAID10"],
  Capacity: ["RAID5", "RAID6"],
};

const TIERS: Array<[string, string[]]> = [
  ["Extreme Performance", ["400GB", "600GB"]],
  ["Performance", ["1.2TB", "1.8TB", "3.2TB"]],
  ["Capacity", ["4TB", "8TB", "10TB", "12TB", "14TB", "16TB", "18TB", "20TB"]],
];

/* ================== انواع و توابع کمکی ================== */
type Row = { disk: string; raid: string; spare: string; set: string; count: number };
type Result = { tier: string; usableTB: number };

function parseSet(s: string) {
  const [a, b] = s.split("+").map((n) => parseInt(n, 10));
  return { a, b, size: a + b };
}
function per32(sp: string) {
  return sp === "2/32" ? 2 : 1;
}
function validCounts(maxN: number, setSize: number, per: number) {
  const out: number[] = [0];
  for (let n = 1; n <= maxN; n++) {
    const sp = Math.max(per, Math.ceil(n / 32) * per);
    const eff = n - sp;
    if (eff >= setSize && eff % setSize === 0) out.push(n);
  }
  return out;
}

/* ========================= صفحه ========================= */
export default function Home() {
  const [model, setModel] = useState<string>(Object.keys(MODEL_CAPS)[1] || "Unity XT 480");
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const [tier, sizes] of TIERS) {
      const firstRaid = (RAID_OPTIONS as Record<string, string[]>)[tier][0];
      const firstSet = RAID_SETS[firstRaid][0];
      init[tier] = { disk: sizes[0], raid: firstRaid, spare: "1/32", set: firstSet, count: 0 };
    }
    return init;
  });
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setRow(tier: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  }

  const countOptions = (tier: string): number[] => {
    const cap = MODEL_CAPS[model] || 1500;
    const r = rows[tier];
    const setSize = parseSet(r.set).size;
    const per = per32(r.spare);
    return validCounts(cap, setSize, per);
  };

  async function onCalc() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const payloads = Object.entries(rows).map(async ([tier, r]) => {
        const res = await fetch("/api/unity-calculator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disk: r.disk, raid: r.raid, set: r.set, count: r.count, sparePolicy: r.spare }),
        });
        const body = await res.json();
        return { tier, ok: res.ok, body } as { tier: string; ok: boolean; body: any };
      });
      const outs = await Promise.all(payloads);
      const ok: Result[] = outs
        .filter((o) => o.ok)
        .map((o) => ({ tier: o.tier, usableTB: Number(o.body.usableTB || 0) }));
      setResults(ok);
      const anyErr = outs.find((o) => !o.ok);
      if (anyErr) setError(anyErr.body?.error || "Error");
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const total = (results || []).reduce((s, r) => s + (r.usableTB || 0), 0);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Unity XT RAID Calculator</h1>

      {/* Model */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 80, fontWeight: 600 }}>Model</div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
        >
          {Object.keys(MODEL_CAPS).map((m: string) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "220px repeat(5, 1fr)", gap: 12, alignItems: "center" }}>
        <div />
        <div style={{ fontSize: 12, color: "#6B7280" }}>Disk</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>RAID</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>Spare Policy</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>Set</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>Count</div>
      </div>

      {/* Rows */}
      {TIERS.map(([tier, sizes]: [string, string[]]) => {
        const r = rows[tier];
        const raidList: string[] = (RAID_OPTIONS as Record<string, string[]>)[tier];
        const setList: string[] = RAID_SETS[r.raid];
        const counts: number[] = countOptions(tier);

        return (
          <div
            key={tier}
            style={{ display: "grid", gridTemplateColumns: "220px repeat(5, 1fr)", gap: 12, alignItems: "center", marginTop: 12 }}
          >
            <div style={{ fontWeight: 600 }}>{tier}</div>

            <select
              value={r.disk}
              onChange={(e) => setRow(tier, { disk: e.target.value })}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
            >
              {sizes.map((d: string) => (
                <option key={d}>{d}</option>
              ))}
            </select>

            <select
              value={r.raid}
              onChange={(e) => setRow(tier, { raid: e.target.value, set: RAID_SETS[e.target.value as string][0] })}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
            >
              {raidList.map((rt: string) => (
                <option key={rt}>{rt}</option>
              ))}
            </select>

            <select
              value={r.spare}
              onChange={(e) => setRow(tier, { spare: e.target.value, count: 0 })}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
            >
              <option>1/32</option>
              <option>2/32</option>
            </select>

            <select
              value={r.set}
              onChange={(e) => setRow(tier, { set: e.target.value })}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
            >
              {setList.map((w: string) => (
                <option key={w}>{w}</option>
              ))}
            </select>

            <select
              value={String(r.count)}
              onChange={(e) => setRow(tier, { count: parseInt(e.target.value, 10) })}
              style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}
            >
              {counts.map((n: number) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        <button
          onClick={onCalc}
          disabled={loading}
          style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          {loading ? "Calculating…" : "Calculate"}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10 }}>{error}</div>}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Results</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {(results || []).map((r: Result) => (
            <li key={r.tier}>
              <b>{r.tier}:</b> {Number((r.usableTB || 0).toFixed(2))} TB
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 10, fontWeight: 800 }}>Total: {Number(total.toFixed(2))} TB</div>
      </div>
    </main>
  );
}