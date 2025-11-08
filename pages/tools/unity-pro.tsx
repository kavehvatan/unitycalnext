import React, { useMemo, useState } from "react";

type RowIn = { disk: string; raid: "RAID5"|"RAID6"|"RAID10"; spare: string; set: string; count: number; };
type RowOut = null | {
  ok: boolean; disk: string; raid: string; sparePolicy: string; set: string;
  count: number; spares: number; groups: number; perSetTB: number; usableTB: number; from: "lookup"|"fallback";
};

const labelStyle: React.CSSProperties = { fontWeight: 600, color: "#111827", width: 220 };
const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 10, background: "#fff" };
const select: React.CSSProperties = { ...input, background: "#F9FAFB" };
const gridRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "220px repeat(5, 1fr)", gap: 12, alignItems: "center", marginBottom: 12 };
const box: React.CSSProperties = { maxWidth: 1200, margin: "32px auto", padding: 24, border: "1px solid #eee", borderRadius: 16, background: "#fff" };
const title: React.CSSProperties = { fontSize: 32, fontWeight: 800, marginBottom: 16 };
const teal = "#14b8a6";

const raidSets: Record<"RAID5"|"RAID6"|"RAID10", string[]> = {
  RAID5: ["4+1","8+1","12+1"],
  RAID6: ["4+2","6+2","8+2","12+2","14+2"],
  RAID10: ["1+1","2+2","3+3","4+4"],
};

const diskOptions = ["400GB","600GB","1.2TB","1.8TB","3.2TB","4TB","8TB","10TB","12TB","14TB","16TB","18TB","20TB"];
const spareOptions = ["1/32","1/30","2/32","1/46","2/46"];

export default function UnityXtRaidCalculator() {
  const [model, setModel] = useState("Unity XT 480");

  const [r1, setR1] = useState<RowIn>({ disk:"400GB", raid:"RAID5", spare:"1/32", set:"4+1", count:0 });
  const [r2, setR2] = useState<RowIn>({ disk:"1.2TB", raid:"RAID5", spare:"1/32", set:"4+1", count:0 });
  const [r3, setR3] = useState<RowIn>({ disk:"4TB",   raid:"RAID5", spare:"1/32", set:"4+1", count:0 });

  const [out1, setOut1] = useState<RowOut>(null);
  const [out2, setOut2] = useState<RowOut>(null);
  const [out3, setOut3] = useState<RowOut>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  function coerceCount(v: string) { const n = parseInt(v||"0",10); return Number.isFinite(n) && n>=0 ? n : 0; }

  async function calcRow(row: RowIn): Promise<RowOut> {
    const res = await fetch("/api/unity-calculator", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ disk: row.disk, raid: row.raid, set: row.set, count: row.count, sparePolicy: row.spare })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "calc error");
    return j as RowOut;
  }

  async function onCalcAll() {
    setLoading(true); setErr(null);
    try {
      const [o1,o2,o3] = await Promise.all([calcRow(r1), calcRow(r2), calcRow(r3)]);
      setOut1(o1); setOut2(o2); setOut3(o3);
    } catch (e:any) {
      setErr(e.message || "Error");
    } finally { setLoading(false); }
  }

  const headerCell: React.CSSProperties = { fontSize:12, color:"#6B7280" };

  return (
    <main style={{ padding: 16, background: "#F3F4F6", minHeight: "100vh" }}>
      <div style={box}>
        <h1 style={title}>Unity XT RAID Calculator</h1>

        {/* Model */}
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom: 20}}>
          <div style={{...labelStyle, width: 80}}>Model</div>
          <select style={{...select, width: 240}} value={model} onChange={e=>setModel(e.target.value)}>
            {["Unity XT 380","Unity XT 480","Unity XT 680","Unity XT 880","Unity XT 480F","Unity XT 680F","Unity XT 880F"].map(m=>(
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Header row */}
        <div style={{...gridRow, marginBottom: 6}}>
          <div />
          <div style={headerCell}>Disk</div>
          <div style={headerCell}>RAID</div>
          <div style={headerCell}>Spare Policy</div>
          <div style={headerCell}>Set</div>
          <div style={headerCell}>Count</div>
        </div>

        {/* Row 1 */}
        <div style={gridRow}>
          <div style={labelStyle}>Extreme Performance</div>
          <select style={select} value={r1.disk} onChange={e=>setR1({...r1, disk:e.target.value})}>
            {diskOptions.map(d=><option key={d}>{d}</option>)}
          </select>
          <select style={select} value={r1.raid} onChange={e=>{
            const raid = e.target.value as RowIn["raid"];
            const first = raidSets[raid][0];
            setR1({...r1, raid, set:first});
          }}>
            <option>RAID5</option><option>RAID6</option><option>RAID10</option>
          </select>
          <select style={select} value={r1.spare} onChange={e=>setR1({...r1, spare:e.target.value})}>
            {spareOptions.map(s=><option key={s}>{s}</option>)}
          </select>
          <select style={select} value={r1.set} onChange={e=>setR1({...r1, set:e.target.value})}>
            {raidSets[r1.raid].map(s=><option key={s}>{s}</option>)}
          </select>
          <input style={input} type="number" min={0} value={r1.count} onChange={e=>setR1({...r1, count: coerceCount(e.target.value)})}/>
        </div>

        {/* Row 2 */}
        <div style={gridRow}>
          <div style={labelStyle}>Performance</div>
          <select style={select} value={r2.disk} onChange={e=>setR2({...r2, disk:e.target.value})}>
            {diskOptions.map(d=><option key={d}>{d}</option>)}
          </select>
          <select style={select} value={r2.raid} onChange={e=>{
            const raid = e.target.value as RowIn["raid"]; const first = raidSets[raid][0];
            setR2({...r2, raid, set:first});
          }}>
            <option>RAID5</option><option>RAID6</option><option>RAID10</option>
          </select>
          <select style={select} value={r2.spare} onChange={e=>setR2({...r2, spare:e.target.value})}>
            {spareOptions.map(s=><option key={s}>{s}</option>)}
          </select>
          <select style={select} value={r2.set} onChange={e=>setR2({...r2, set:e.target.value})}>
            {raidSets[r2.raid].map(s=><option key={s}>{s}</option>)}
          </select>
          <input style={input} type="number" min={0} value={r2.count} onChange={e=>setR2({...r2, count: coerceCount(e.target.value)})}/>
        </div>

        {/* Row 3 */}
        <div style={gridRow}>
          <div style={labelStyle}>Capacity</div>
          <select style={select} value={r3.disk} onChange={e=>setR3({...r3, disk:e.target.value})}>
            {diskOptions.map(d=><option key={d}>{d}</option>)}
          </select>
          <select style={select} value={r3.raid} onChange={e=>{
            const raid = e.target.value as RowIn["raid"]; const first = raidSets[raid][0];
            setR3({...r3, raid, set:first});
          }}>
            <option>RAID5</option><option>RAID6</option><option>RAID10</option>
          </select>
          <select style={select} value={r3.spare} onChange={e=>setR3({...r3, spare:e.target.value})}>
            {spareOptions.map(s=><option key={s}>{s}</option>)}
          </select>
          <select style={select} value={r3.set} onChange={e=>setR3({...r3, set:e.target.value})}>
            {raidSets[r3.raid].map(s=><option key={s}>{s}</option>)}
          </select>
          <input style={input} type="number" min={0} value={r3.count} onChange={e=>setR3({...r3, count: coerceCount(e.target.value)})}/>
        </div>

        <div style={{marginTop:16}}>
          <button onClick={onCalcAll} disabled={loading}
            style={{ padding:"12px 18px", borderRadius:10, border:"none", background:teal, color:"#fff", fontWeight:700, cursor:"pointer" }}>
            {loading ? "Calculating…" : "Calculate"}
          </button>
          {err && <span style={{marginLeft:12,color:"#b91c1c"}}>Error: {err}</span>}
        </div>

        {/* Results */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginTop:20}}>
          <ResultCard title="Extreme Performance" out={out1}/>
          <ResultCard title="Performance" out={out2}/>
          <ResultCard title="Capacity" out={out3}/>
        </div>
      </div>
    </main>
  );
}

function ResultCard({title, out}:{title:string; out: RowOut}) {
  if (!out) return (
    <div style={{border:"1px solid #e5e7eb", borderRadius:12, padding:16, background:"#fff"}}>
      <div style={{fontWeight:800, marginBottom:8}}>{title}</div>
      <div style={{color:"#6B7280"}}>نتیجه بعد از Calculate نمایش داده می‌شود.</div>
    </div>
  );
  const item = (k:string,v:string|number,hl=false)=>(
    <div style={{padding:10,border:"1px solid #eef2f7",borderRadius:10, background: hl? "#ecfeff":"#fff"}}>
      <div style={{fontSize:12, color:"#64748b"}}>{k}</div>
      <div style={{fontWeight:700}}>{v}</div>
    </div>
  );
  return (
    <div style={{border:"1px solid #e5e7eb", borderRadius:12, padding:16, background:"#fff"}}>
      <div style={{fontWeight:800, marginBottom:10}}>{title}</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
        {item("Disk", (out as any).disk)}
        {item("RAID", (out as any).raid)}
        {item("Set", (out as any).set)}
        {item("Count", (out as any).count)}
        {item("Spares", (out as any).spares)}
        {item("Groups", (out as any).groups)}
        {item("Usable / set (TB)", (out as any).perSetTB)}
        {item("Total usable (TB)", (out as any).usableTB, true)}
        {item("Source", (out as any).from)}
      </div>
    </div>
  );
}
