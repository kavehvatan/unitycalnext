import React, { useState } from "react";

type Result = {
  ok: boolean;
  raid: string;
  set: string;
  count: number;
  sparePolicy: string;
  disk: string;
  perSetTB: number;
  groups: number;
  spares: number;
  usableTB: number;
  from: "lookup" | "fallback";
};

export default function UnityCalculatorPage() {
  const [disk, setDisk] = useState("600GB");
  const [raid, setRaid] = useState("RAID5");
  const [rg, setRg] = useState("4+1");
  const [count, setCount] = useState(25);
  const [spare, setSpare] = useState("1/30");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/unity-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disk, raid, set: rg, count: Number(count), sparePolicy: spare,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Request failed");
      setRes(j);
    } catch (e:any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const box: React.CSSProperties = { maxWidth: 720, margin: "32px auto", padding: 24, border: "1px solid #eee", borderRadius: 12, fontFamily: "ui-sans-serif, system-ui" };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center", marginBottom: 12 };
  const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 };
  const btn: React.CSSProperties = { padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer" };

  return (
    <main style={box}>
      <h1 style={{fontSize: 24, fontWeight: 700, marginBottom: 8}}>Unity Midrange Sizer</h1>
      <p style={{color:"#555", marginBottom: 18}}>ورودی‌ها را دقیقا مثل نسخهٔ قبلی وارد کن؛ نتیجه دقیقاً همان منطق است.</p>

      <form onSubmit={submit}>
        <div style={row}>
          <label>Disk Size</label>
          <input style={input} value={disk} onChange={e=>setDisk(e.target.value)} placeholder="مثلاً 600GB یا 1.2TB" />
        </div>
        <div style={row}>
          <label>RAID Type</label>
          <select style={input as any} value={raid} onChange={e=>setRaid(e.target.value)}>
            <option>RAID5</option>
            <option>RAID6</option>
            <option>RAID10</option>
          </select>
        </div>
        <div style={row}>
          <label>Set (RG)</label>
          <input style={input} value={rg} onChange={e=>setRg(e.target.value)} placeholder="مثل 4+1 یا 6+2" />
        </div>
        <div style={row}>
          <label>Disk Count</label>
          <input style={input} type="number" value={count} onChange={e=>setCount(parseInt(e.target.value||"0"))} min={0} />
        </div>
        <div style={row}>
          <label>Spare Policy</label>
          <input style={input} value={spare} onChange={e=>setSpare(e.target.value)} placeholder="مثل 1/30 یا 2/32" />
        </div>
        <div style={{display:"flex", gap:12, marginTop: 16}}>
          <button type="submit" style={{...btn, background:"#14b8a6", color:"#fff"}} disabled={loading}>
            {loading ? "Calculating…" : "Calculate"}
          </button>
          <button type="button" style={{...btn, background:"#f4c21f"}} onClick={() => { setRes(null); setErr(null); }}>
            Reset
          </button>
        </div>
      </form>

      {err && <p style={{color:"#b91c1c", marginTop:16}}>Error: {err}</p>}

      {res && (
        <div style={{marginTop:24, padding:16, border:"1px solid #e5e7eb", borderRadius:10}}>
          <h3 style={{marginTop:0, marginBottom:12}}>Result</h3>
          <ul style={{lineHeight:1.9, margin:0, paddingLeft:18}}>
            <li><b>Disk:</b> {res.disk}</li>
            <li><b>RAID:</b> {res.raid}</li>
            <li><b>Set:</b> {res.set}</li>
            <li><b>Count:</b> {res.count}</li>
            <li><b>Spare policy:</b> {res.sparePolicy}</li>
            <li><b>Spare disks:</b> {res.spares}</li>
            <li><b>Groups:</b> {res.groups}</li>
            <li><b>Usable per set (TB):</b> {res.perSetTB}</li>
            <li><b>Total usable (TB):</b> {res.usableTB}</li>
            <li><b>Source:</b> {res.from}</li>
          </ul>
        </div>
      )}
    </main>
  );
}
