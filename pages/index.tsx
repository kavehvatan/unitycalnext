import { useState } from "react";
import Head from "next/head";

const TIERS: Array<[string, string[]]> = [
  ["Extreme Performance", ["400GB", "800GB", "1.6TB", "1.92TB", "3.2TB", "3.84TB", "7.68TB", "15.36TB"]],
  ["Performance", ["1.2TB", "1.8TB", "2.4TB", "3.2TB"]],
  ["Capacity", ["6TB", "8TB", "10TB", "12TB", "14TB", "16TB", "18TB", "20TB", "22TB", "24TB"]],
];

const RAID_OPTIONS = ["RAID5", "RAID6"];
const RAID_SETS: Record<string, string[]> = {
  RAID5: ["4+1", "8+1", "12+1"],
  RAID6: ["4+2", "6+2", "8+2", "12+2", "14+2"],
};

const MODELS = [
  "Unity XT 380",
  "Unity XT 480",
  "Unity XT 680",
  "Unity XT 880",
  "Unity XT 480F",
  "Unity XT 680F",
  "Unity XT 880F",
];

const MODEL_CAPS_BASE: Record<string, number> = {
  "Unity XT 380": 500,
  "Unity XT 480": 1500,
  "Unity XT 680": 2000,
  "Unity XT 880": 4000,
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
  for (let i = 0; i <= 96; i++) arr.push(i);
  return arr;
};

export default function Home() {
  const [model, setModel] = useState(MODELS[1]);
  const [rows, setRows] = useState<Record<string, any>>(
    Object.fromEntries(
      TIERS.map(([t, disks]) => [t, { disk: disks[0], raid: "RAID5", set: RAID_SETS["RAID5"][0], spare: "1/32", count: 0 }])
    )
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
    <>
      <Head><title>Unity XT RAID Calculator</title></Head>
      <main className="unity-wrap">
        <h1 className="unity-title">Unity XT RAID Calculator</h1>
        <div className="row model-row">
          <div className="label">Model</div>
          <div className="controls">
            <select className="control" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
        </div>

        <div className="grid header">
          <div />
          <div className="sub">Disk</div>
          <div className="sub">RAID</div>
          <div className="sub">Spare Policy</div>
          <div className="sub">Set</div>
          <div className="sub">Count</div>
        </div>

        {TIERS.map(([tier, disks]) => (
          <div className="grid" key={tier}>
            <div className="label tier">{tier}</div>

            <select className="control" value={rows[tier].disk} onChange={(e) => setRow(tier, { disk: e.target.value })}>
              {disks.map((d) => (<option key={d}>{d}</option>))}
            </select>

            <select className="control" value={rows[tier].raid} onChange={(e) => setRow(tier, { raid: e.target.value, set: RAID_SETS[e.target.value][0] })}>
              {RAID_OPTIONS.map((rt) => (<option key={rt}>{rt}</option>))}
            </select>

            <select className="control" value={rows[tier].spare} onChange={(e) => setRow(tier, { spare: e.target.value })}>
              <option>1/32</option><option>2/32</option>
            </select>

            <select className="control" value={rows[tier].set} onChange={(e) => setRow(tier, { set: e.target.value })}>
              {RAID_SETS[rows[tier].raid].map((s) => (<option key={s}>{s}</option>))}
            </select>

            <select className="control" value={rows[tier].count} onChange={(e) => setRow(tier, { count: Number(e.target.value) })}>
              {[...Array(97).keys()].map((c) => (<option key={c}>{c}</option>))}
            </select>
          </div>
        ))}

        <button className="btn" onClick={onCalc} disabled={loading}>{loading ? "Calculating…" : "Calculate"}</button>

        {error && <div className="alert">{error}</div>}

        <section className="results">
          <h2>Results</h2>
          {results.length > 0 ? (
            <>
              <ul>{results.map((r) => (<li key={r.tier}><b>{r.tier}:</b> {r.usableTB.toFixed(2)} TB</li>))}</ul>
              <div className="total">Total: {results.reduce((a, b) => a + b.usableTB, 0).toFixed(2)} TB</div>
            </>
          ) : (<p className="muted">No rows selected. Increase Count & Calculate.</p>)}
        </section>
      </main>
    </>
  );
}
