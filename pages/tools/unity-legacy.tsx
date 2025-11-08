import Head from "next/head";
import React from "react";

export default function UnityLegacyExact() {
  return (
    <>
      <Head>
        <title>Unity XT Sizer</title>
        <div dangerouslySetInnerHTML={ { __html: `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>` } } />
      </Head>
      <div dangerouslySetInnerHTML={ { __html: `<h2>Unity XT RAID Calculator</h2>
<form method="post">
<div class="mb-3"><label>Model</label>
<select name="model" class="form-select w-auto">{% for m,c in models.items() %}
<option value="{{m}}"{% if m==model %} selected{% endif %}>{{m}}</option>{% endfor %}</select></div>
{% for tier,sizes in tiers %}
<div class="row mb-2"><div class="col-2"><strong>{{tier}}</strong></div>
<div class="col-2"><label>Disk</label><select name="{{tier}}_disk" class="form-select">
{% set sd=form.get(tier+'_disk',sizes[0]) %}{% for d in sizes %}
<option value="{{d}}"{% if sd==d %} selected{% endif %}>{{d}}</option>{% endfor %}
</select></div>
<div class="col-2"><label>RAID</label><select name="{{tier}}_raid" class="form-select raid-select" data-tier="{{tier}}">
{% set sr=form.get(tier+'_raid',raid_options[tier][0]) %}{% for rt in raid_options[tier] %}
<option value="{{rt}}"{% if sr==rt %} selected{% endif %}>{{rt}}</option>{% endfor %}
</select></div>
<div class="col-2"><label>Spare Policy</label>
<select name="{{tier}}_spare" class="form-select">
  {% set sp=form.get(tier+'_spare','1/32') %}
  <option value="1/32"{% if sp=='1/32' %} selected{% endif %}>1/32</option>
  <option value="2/32"{% if sp=='2/32' %} selected{% endif %}>2/32</option>
</select>
</div>

<div class="col-2"><label>Set</label><select name="{{tier}}_set" class="form-select set-select" data-tier="{tier}">
{% set ss=form.get(tier+'_set',raid_sets[sr][0]) %}{% for w in raid_sets[sr] %}
<option value="{{w}}"{% if ss==w %} selected{% endif %}>{{w}}</option>{% endfor %}
</select></div>
<div class="col-2"><label>Count</label><select name="{{tier}}_count" class="form-select">
{% set sc=form.get(tier+'_count','0') %}{% for c in suggestions[tier] %}
<option value="{{ c }}"{% if sc==c|string %} selected{% endif %} {% if c > (models[model]|int - 4) %}disabled{% endif %}>{{c}}</option>{% endfor %}
</select></div></div>
{% endfor %}
<button class="btn btn-primary -primary">Calculate</button></form>
{% if error %}<div class="alert alert-danger mt-3">{{error}}</div>{% endif %}
{% if results %}<h4 class="mt-4">Results</h4><ul>{% for t,v in results.items() %}
<li><strong>{{t}}:</strong> {{v}} TB</li>{% endfor %}</ul><p><strong>Total:</strong> {{total}} TB</p>{% endif %}








</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const tiers = ["Extreme Performance","Performance","Capacity"];
  const raidSets = {{ raid_sets | tojson }};
  const modelCaps = {"Unity XT 380":500,"Unity XT 480":750,"Unity XT 680":1000,"Unity XT 880":1500};

  function parseSet(s){ const [a,b]=s.split('+').map(n=>parseInt(n,10)); return {a:a, b:b, size:a+b}; }
  function per32(sp){ return sp==="2/32"?2:1; }

  function validCounts(maxN,setSize,per){
    const out=[0];
    for(let n=1;n<=maxN;n++){
      const sp=Math.max(per, Math.ceil(n/32)*per);
      const eff=n-sp;
      if(eff>=setSize && eff%setSize===0) out.push(n);
    }
    return out;
  }

  function rebuildCounts(tier){
    const modelSel=document.querySelector('select[name="model"]');
    const cap=modelCaps[modelSel?.value]||1500;

    const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
    const spareSel=document.querySelector(\`select[name="\${tier}_spare"]\`);
    const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
    if(!setSel||!spareSel||!countSel) return;

    const {size}=parseSet(setSel.value);
    const per=per32(spareSel.value);
    const list=validCounts(cap,size,per);

    const cur=countSel.value;
    countSel.innerHTML="";
    list.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; countSel.appendChild(o); });
    // try to keep current if valid
    if(list.includes(parseInt(cur,10))) countSel.value=cur;
  }

  function rebuildSets(tier){
    const raidSel=document.querySelector(\`select[name="\${tier}_raid"]\`);
    const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
    if(!raidSel||!setSel) return;
    const opts=raidSets[raidSel.value]||[];
    const prev=setSel.value;
    setSel.innerHTML="";
    opts.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; setSel.appendChild(o); });
    setSel.value=opts.includes(prev)?prev:(opts[0]||"");
    rebuildCounts(tier);
  }

  // Bind events
  tiers.forEach(tier=>{
    const raidSel = document.querySelector(\`select[name="\${tier}_raid"]\`);
    const setSel  = document.querySelector(\`select[name="\${tier}_set"]\`);
    const spareSel= document.querySelector(\`select[name="\${tier}_spare"]\`);
    const countSel= document.querySelector(\`select[name="\${tier}_count"]\`);
    if(raidSel)  raidSel.addEventListener('change', ()=>rebuildSets(tier));
    if(setSel)   setSel.addEventListener('change', ()=>rebuildCounts(tier));
    if(spareSel) spareSel.addEventListener('change', ()=>{ 
      // Reset count to 0 when spare changes
      if(countSel){ countSel.value = "0"; }
      rebuildCounts(tier);
    });
    rebuildSets(tier);
  });

  // When model changes, re-limit counts for all tiers
  const modelSel=document.querySelector('select[name="model"]');
  if(modelSel) modelSel.addEventListener('change', ()=>tiers.forEach(rebuildCounts));

  function getCount(tier){
    const el = document.querySelector(\`select[name="\${tier}_count"]\`);
    return el ? parseInt(el.value || "0",10) : 0;
  }
  function updateAvailability(){
    const modelSel=document.querySelector('select[name="model"]');
    const cap=modelCaps[modelSel?.value]||1500;
    const tiersList=["Extreme Performance","Performance","Capacity"];
    // for each tier, compute remaining = cap - sum(other tiers)
    tiersList.forEach(tier=>{
      const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
      if(!countSel) return;
      const others = tiersList.filter(t=>t!==tier).map(getCount).reduce((a,b)=>a+b,0);
      const remaining = Math.max(cap - others, 0);
      // disable options greater than remaining
      Array.from(countSel.options).forEach(opt=>{
        const v = parseInt(opt.value || "0",10);
        if(v===0){ opt.disabled=false; return; }
        opt.disabled = v > remaining;
      });
      // if current selection is invalid now, reset to 0
      if(parseInt(countSel.value||"0",10) > remaining){
        countSel.value = "0";
      }
    });
  }
  // hook availability update to all relevant events
  function hookAvailability(){
    const tiersList=["Extreme Performance","Performance","Capacity"];
    tiersList.forEach(tier=>{
      const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
      const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
      const spareSel=document.querySelector(\`select[name="\${tier}_spare"]\`);
      const raidSel=document.querySelector(\`select[name="\${tier}_raid"]\`);
      countSel && countSel.addEventListener('change', updateAvailability);
      setSel && setSel.addEventListener('change', ()=>{rebuildCounts(tier); updateAvailability();});
      spareSel && spareSel.addEventListener('change', ()=>{ if(countSel) countSel.value="0"; rebuildCounts(tier); updateAvailability();});
      raidSel && raidSel.addEventListener('change', ()=>{rebuildSets(tier); updateAvailability();});
    });
    const modelSel=document.querySelector('select[name="model"]');
    modelSel && modelSel.addEventListener('change', ()=>{tiers.forEach(rebuildCounts); updateAvailability();});
    updateAvailability();
  }
  // call after initial rebuilds
  setTimeout(hookAvailability, 0);

});
</script>` } } />
      <script dangerouslySetInnerHTML={ { __html: `` } } />
      <script dangerouslySetInnerHTML={ { __html: `
document.addEventListener('DOMContentLoaded', function () {
  const tiers = ["Extreme Performance","Performance","Capacity"];
  const raidSets = {{ raid_sets | tojson }};
  const modelCaps = {"Unity XT 380":500,"Unity XT 480":750,"Unity XT 680":1000,"Unity XT 880":1500};

  function parseSet(s){ const [a,b]=s.split('+').map(n=>parseInt(n,10)); return {a:a, b:b, size:a+b}; }
  function per32(sp){ return sp==="2/32"?2:1; }

  function validCounts(maxN,setSize,per){
    const out=[0];
    for(let n=1;n<=maxN;n++){
      const sp=Math.max(per, Math.ceil(n/32)*per);
      const eff=n-sp;
      if(eff>=setSize && eff%setSize===0) out.push(n);
    }
    return out;
  }

  function rebuildCounts(tier){
    const modelSel=document.querySelector('select[name="model"]');
    const cap=modelCaps[modelSel?.value]||1500;

    const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
    const spareSel=document.querySelector(\`select[name="\${tier}_spare"]\`);
    const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
    if(!setSel||!spareSel||!countSel) return;

    const {size}=parseSet(setSel.value);
    const per=per32(spareSel.value);
    const list=validCounts(cap,size,per);

    const cur=countSel.value;
    countSel.innerHTML="";
    list.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; countSel.appendChild(o); });
    // try to keep current if valid
    if(list.includes(parseInt(cur,10))) countSel.value=cur;
  }

  function rebuildSets(tier){
    const raidSel=document.querySelector(\`select[name="\${tier}_raid"]\`);
    const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
    if(!raidSel||!setSel) return;
    const opts=raidSets[raidSel.value]||[];
    const prev=setSel.value;
    setSel.innerHTML="";
    opts.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; setSel.appendChild(o); });
    setSel.value=opts.includes(prev)?prev:(opts[0]||"");
    rebuildCounts(tier);
  }

  // Bind events
  tiers.forEach(tier=>{
    const raidSel = document.querySelector(\`select[name="\${tier}_raid"]\`);
    const setSel  = document.querySelector(\`select[name="\${tier}_set"]\`);
    const spareSel= document.querySelector(\`select[name="\${tier}_spare"]\`);
    const countSel= document.querySelector(\`select[name="\${tier}_count"]\`);
    if(raidSel)  raidSel.addEventListener('change', ()=>rebuildSets(tier));
    if(setSel)   setSel.addEventListener('change', ()=>rebuildCounts(tier));
    if(spareSel) spareSel.addEventListener('change', ()=>{ 
      // Reset count to 0 when spare changes
      if(countSel){ countSel.value = "0"; }
      rebuildCounts(tier);
    });
    rebuildSets(tier);
  });

  // When model changes, re-limit counts for all tiers
  const modelSel=document.querySelector('select[name="model"]');
  if(modelSel) modelSel.addEventListener('change', ()=>tiers.forEach(rebuildCounts));

  function getCount(tier){
    const el = document.querySelector(\`select[name="\${tier}_count"]\`);
    return el ? parseInt(el.value || "0",10) : 0;
  }
  function updateAvailability(){
    const modelSel=document.querySelector('select[name="model"]');
    const cap=modelCaps[modelSel?.value]||1500;
    const tiersList=["Extreme Performance","Performance","Capacity"];
    // for each tier, compute remaining = cap - sum(other tiers)
    tiersList.forEach(tier=>{
      const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
      if(!countSel) return;
      const others = tiersList.filter(t=>t!==tier).map(getCount).reduce((a,b)=>a+b,0);
      const remaining = Math.max(cap - others, 0);
      // disable options greater than remaining
      Array.from(countSel.options).forEach(opt=>{
        const v = parseInt(opt.value || "0",10);
        if(v===0){ opt.disabled=false; return; }
        opt.disabled = v > remaining;
      });
      // if current selection is invalid now, reset to 0
      if(parseInt(countSel.value||"0",10) > remaining){
        countSel.value = "0";
      }
    });
  }
  // hook availability update to all relevant events
  function hookAvailability(){
    const tiersList=["Extreme Performance","Performance","Capacity"];
    tiersList.forEach(tier=>{
      const countSel=document.querySelector(\`select[name="\${tier}_count"]\`);
      const setSel=document.querySelector(\`select[name="\${tier}_set"]\`);
      const spareSel=document.querySelector(\`select[name="\${tier}_spare"]\`);
      const raidSel=document.querySelector(\`select[name="\${tier}_raid"]\`);
      countSel && countSel.addEventListener('change', updateAvailability);
      setSel && setSel.addEventListener('change', ()=>{rebuildCounts(tier); updateAvailability();});
      spareSel && spareSel.addEventListener('change', ()=>{ if(countSel) countSel.value="0"; rebuildCounts(tier); updateAvailability();});
      raidSel && raidSel.addEventListener('change', ()=>{rebuildSets(tier); updateAvailability();});
    });
    const modelSel=document.querySelector('select[name="model"]');
    modelSel && modelSel.addEventListener('change', ()=>{tiers.forEach(rebuildCounts); updateAvailability();});
    updateAvailability();
  }
  // call after initial rebuilds
  setTimeout(hookAvailability, 0);

});
` } } />
    </>
  );
}
