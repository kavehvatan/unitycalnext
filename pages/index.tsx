import Head from "next/head";
import { useMemo, useState } from "react";

const MODELS: Record<string, number> = {
  "Unity XT 380": 500,
  "Unity XT 480": 750,
  "Unity XT 680": 1000,
  "Unity XT 880": 1500,
};

const RAID_SETS: Record<string, string[]> = {
  RAID5: ["4+1", "8+1", "12+1"],
  RAID6: ["4+2", "6+2", "8+2", "12+2", "14+2"],
  RAID10: ["1+1", "2+2", "3+3", "4+4"],
};

const RAID_OPTIONS: Record<string, string[]> = {
  "Extreme Performance": ["RAID5", "RAID6", "RAID10"],
  Performance: ["RAID5", "RAID6", "RAID10"],
  Capacity: ["RAID5", "RAID6", "RAID10"],
};

const TIERS: Array<[string, string[]]> = [
  ["Extreme Performance", ["400GB", "800GB", "1.6TB", "1.92TB", "3.2TB", "3.84TB", "7.68TB", "15.36TB"]],
  ["Performance", ["1.2TB", "1.8TB"]],
  ["Capacity", ["4TB", "6TB", "12TB"]],
];

function per32(s: string) { return s === "2/32" ? 2 : 1; }
function parseSet(v: string) { return v.split("+").map(n => parseInt(n,10)); }

/** ported from Flask: iterative valid counts by set size, model cap and spare policy */
function generateCounts(setSize: number, maxDrives: number, per: number): number[] {
  const options: number[] = [];
  let i = 1;
  while (true) {
    const data = i * setSize;
    const spares = Math.max(per, per * Math.ceil(data / 32));
    const total = data + spares;
    if (total > maxDrives) break;
    options.push(total);
    i++;
  }
  return options;
}

type Row = { disk: string; raid: string; set: string; spare: string; count: number };

export default function Page() {
  const [model, setModel] = useState<string>(Object.keys(MODELS)[1]);
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const [tier, sizes] of TIERS) {
      const raid = RAID_OPTIONS[tier][0];
      const setStr = RAID_SETS[raid][0];
      init[tier] = { disk: sizes[0], raid, set: setStr, spare: "1/32", count: 0 };
    }
    return init;
  });
  const [results, setResults] = useState<Record<string, number>>({});
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const setRow = (tier: string, patch: Partial<Row>) =>
    setRows(prev => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));

  const suggestions: Record<string, number[]> = useMemo(() => {
    const out: Record<string, number[]> = {};
    const max = MODELS[model];
    for (const [tier] of TIERS) {
      const r = rows[tier];
      const [a,b] = parseSet(r.set);
      const setSize = a + b;
      const opts = generateCounts(setSize, max, per32(r.spare));
      out[tier] = [0, ...opts];
      if (!out[tier].includes(r.count) && r.count > 0) out[tier].splice(1,0,r.count);
    }
    return out;
  }, [rows, model]);

  async function onCalc() {
    setLoading(true);
    setError(null);
    setResults({});
    try {
      const active = Object.entries(rows).filter(([, r]) => r.count > 0);
      if (active.length === 0) { setLoading(false); return; }
      const outs = await Promise.all(active.map(async ([tier, r]) => {
        const res = await fetch("/api/unity-calculator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disk: r.disk, raid: r.raid, set: r.set, count: r.count, sparePolicy: r.spare }),
        });
        const data = await res.json();
        return { tier, ok: res.ok, data };
      }));
      const anyOk = outs.some(o => o.ok);
      const newRes: Record<string, number> = {};
      for (const o of outs) { if (o.ok) newRes[o.tier] = Number(o.data.usableTB || 0); }
      setResults(newRes);
      if (!anyOk) setError(outs[0]?.data?.error || "Error");
    } catch (e:any) {
      setError(e.message || "Error");
    } finally { setLoading(false); }
  }

  const total = Object.values(results).reduce((a,b)=>a+b,0);

  return (
    <main style={{maxWidth:1100, margin:'0 auto', padding:24, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto'}}>
      <Head><title>Unity XT RAID Calculator</title></Head>
      <h1 style={{fontSize:34,fontWeight:800,margin:0,marginBottom:16}}>Unity XT RAID Calculator</h1>

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <div style={{width:90,fontWeight:700}}>Model</div>
        <select value={model} onChange={e=>setModel(e.target.value)} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
          {Object.keys(MODELS).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'220px repeat(5,1fr)',gap:12,alignItems:'center',marginTop:4}}>
        <div></div>
        <div style={{fontSize:12,color:'#6b7280'}}>Disk</div>
        <div style={{fontSize:12,color:'#6b7280'}}>RAID</div>
        <div style={{fontSize:12,color:'#6b7280'}}>Spare Policy</div>
        <div style={{fontSize:12,color:'#6b7280'}}>Set</div>
        <div style={{fontSize:12,color:'#6b7280'}}>Count</div>
      </div>

      {TIERS.map(([tier, disks]) => {
        const r = rows[tier];
        const setOptions = RAID_SETS[r.raid];
        const counts = suggestions[tier] || [0];
        return (
          <div key={tier} style={{display:'grid',gridTemplateColumns:'220px repeat(5,1fr)',gap:12,alignItems:'center',margin:'8px 0'}}>
            <div style={{fontWeight:700}}>{tier}</div>

            <select value={r.disk} onChange={e=>setRow(tier,{disk:e.target.value})} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
              {disks.map(d => <option key={d}>{d}</option>)}
            </select>

            <select value={r.raid} onChange={e=>setRow(tier,{raid:e.target.value,set: RAID_SETS[e.target.value][0], count:0})} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
              {RAID_OPTIONS[tier].map(rt => <option key={rt}>{rt}</option>)}
            </select>

            <select value={r.spare} onChange={e=>setRow(tier,{spare:e.target.value, count:0})} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
              <option>1/32</option><option>2/32</option>
            </select>

            <select value={r.set} onChange={e=>setRow(tier,{set:e.target.value, count:0})} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
              {setOptions.map(s => <option key={s}>{s}</option>)}
            </select>

            <select value={String(r.count)} onChange={e=>setRow(tier,{count: parseInt(e.target.value,10)})} style={{padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:10}}>
              {counts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        );
      })}

      <button onClick={onCalc} disabled={loading} style={{marginTop:12,background:'#2563eb',color:'#fff',border:0,borderRadius:10,padding:'12px 18px',fontWeight:700}}>
        {loading ? 'Calculating…' : 'Calculate'}
      </button>

      <div style={{marginTop:20}}>
        <h2 style={{fontSize:22,fontWeight:800,margin:0,marginBottom:6}}>Results</h2>
        <ul>
          {Object.entries(results).map(([t,v]) => <li key={t}><b>{t}:</b> {v.toFixed(2)} TB</li>)}
        </ul>
        <div style={{fontWeight:800,marginTop:8}}>Total: {total.toFixed(2)} TB</div>
        {error && <div style={{marginTop:12,background:'#fee2e2',border:'1px solid #fecaca',color:'#7f1d1d',borderRadius:10,padding:12}}>{error}</div>}
      </div>
    </main>
  );
}
