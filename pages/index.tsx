import { useState } from "react";

const TIERS: Array<[string, string[]]> = [
  ["Extreme Performance", ["400GB", "800GB", "1.6TB", "1.92TB", "3.2TB", "3.84TB", "7.68TB", "15.36TB"]],
  ["Performance", ["1.2TB", "1.8TB", "2.4TB", "3.2TB"]],
  ["Capacity", ["6TB", "8TB", "10TB", "12TB", "14TB", "16TB", "18TB", "20TB", "22TB", "24TB"]],
];

const RAID_OPTIONS = ["RAID5", "RAID6"];
const RAID_SETS: Record<string, string[]> = {
  RAID5: ["4+1", "8+1"],
  RAID6: ["6+2", "8+2"]
};

const MODELS = [
  "Unity XT 380",
  "Unity XT 480",
  "Unity XT 680",
  "Unity XT 880",
  "Unity XT 480F",
  "Unity XT 680F",
  "Unity XT 880F"
];

const MODEL_CAPS_BASE: Record<string, number> = {
  "Unity XT 380": 500,
  "Unity XT 480": 1500,
  "Unity XT 680": 2000,
  "Unity XT 880": 4000
};
const getCap = (m: string) => {
  const key = m.replace("F", "");
  return MODEL_CAPS_BASE[key] ?? 1500;
};

const per32 = (s: string) => (s.startsWith("2") ? 2 : 1);
const parseSet = (v: string) => {
  const [a, b] = v.split("+").map(Number);
  return { size: a + b };
};

const validCounts = (cap: number, setSize: number, spare: number) => {
  const arr: number[] = [];
  for (let i = setSize; i <= cap / 40; i++) arr.push(i);
  return arr;
};

export default function Home() {
  const [model, setModel] = useState(MODELS[0]);
  const [rows, setRows] = useState<Record<string, any>>(
    Object.fromEntries(TIERS.map(([t]) => [t, { disk: "", raid: "RAID5", set: "4+1", spare: "1/32", count: 0 }]))
  );
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setRow = (tier: string, upd: any) => setRows((r) => ({ ...r, [tier]: { ...r[tier], ...upd } }));

  const countOptions = (tier: string): number[] => {
    const cap = getCap(model);
    const r = rows[tier];
    const setSize = parseSet(r.set).size;
    const per = per32(r.spare);
    return validCounts(cap, setSize, per);
  };

  async function onCalc() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const active = Object.entries(rows).filter(([, r]) => (r.count ?? 0) > 0 && r.disk && r.raid && r.set && r.spare);
      if (active.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }
      const outs = await Promise.all(
        active.map(async ([tier, r]) => {
          const res = await fetch("/api/unity-calculator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              disk: r.disk,
              raid: r.raid,
              set: r.set,
              count: r.count,
              sparePolicy: r.spare,
            }),
          });
          const body = await res.json();
          return { tier, ok: res.ok, body };
        })
      );
      const ok = outs.filter((o) => o.ok).map((o) => ({ tier: o.tier, usableTB: Number(o.body.usableTB || 0) }));
      setResults(ok);
      const failed = outs.filter((o) => !o.ok);
      if (failed.length === outs.length) setError(failed[0]?.body?.error || "Error");
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Unity XT RAID Calculator</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 80, fontWeight: 600 }}>Model</div>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
          {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {TIERS.map(([tier, disks]) => (
        <div key={tier} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 180, fontWeight: 600 }}>{tier}</div>
          <select value={rows[tier].disk} onChange={(e) => setRow(tier, { disk: e.target.value })} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
            <option value="">Disk</option>
            {disks.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={rows[tier].raid} onChange={(e) => setRow(tier, { raid: e.target.value, set: RAID_SETS[e.target.value][0] })} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
            {RAID_OPTIONS.map((rt) => <option key={rt}>{rt}</option>)}
          </select>
          <select value={rows[tier].spare} onChange={(e) => setRow(tier, { spare: e.target.value })} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
            <option>1/32</option><option>2/32</option>
          </select>
          <select value={rows[tier].set} onChange={(e) => setRow(tier, { set: e.target.value })} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
            {RAID_SETS[rows[tier].raid].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={rows[tier].count} onChange={(e) => setRow(tier, { count: Number(e.target.value) })} style={{ padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10 }}>
            {[0, ...countOptions(tier)].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      ))}
      <button onClick={onCalc} disabled={loading} style={{ background: "#2563EB", color: "#fff", padding: "10px 22px", borderRadius: 8, fontWeight: 600, marginTop: 10 }}>Calculate</button>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginTop: 12 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Results</h2>
          <ul>
            {results.map((r) => <li key={r.tier}><b>{r.tier}</b>: {r.usableTB.toFixed(2)} TB</li>)}
          </ul>
          <div style={{ fontWeight: 700 }}>Total: {results.reduce((a, b) => a + b.usableTB, 0).toFixed(2)} TB</div>
        </div>
      )}
    </main>
  );
}
