/* ============================================================
   ELF '26 — Engine & UI  (loads after data.js + rosters.js)
   Architecture: each screen is mounted ONCE into #app; all
   later updates patch individual nodes. A single delegated
   click listener on #app (never replaced) handles everything,
   so nothing "reloads" mid-screen.
   ============================================================ */
(function () {
"use strict";

/* ---------- tiny helpers ---------- */
const app = () => document.getElementById("app");
const q  = (s, r) => (r || app()).querySelector(s);
const qa = (s, r) => [...(r || app()).querySelectorAll(s)];
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rnd = (a,b)=>a+Math.random()*(b-a);
const ri  = (a,b)=>Math.floor(rnd(a,b+1));
const pick = a => a[ri(0,a.length-1)];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function weightedPick(items,wf){const ws=items.map(wf);const tot=ws.reduce((a,b)=>a+b,0);let x=Math.random()*tot;for(let i=0;i<items.length;i++){x-=ws[i];if(x<=0)return items[i];}return items[items.length-1];}
function poisson(l){const L=Math.exp(-l);let k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;}
function el(html){const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstElementChild;}
function shorten(name){const p=name.split(" ");if(name.length<=14||p.length===1)return name;return p[0][0]+". "+p.slice(1).join(" ");}
const PARTICLES=new Set(["de","van","von","der","den","da","dos","das","di","del","della","la","le","el","bin","al","ten","ter","mac","mc","do","du","af","av","ben"]);
function surname(full){const p=full.split(/\s+/);if(p.length===1)return full;let i=p.length-1;const out=[p[i]];while(i-1>=1&&PARTICLES.has(p[i-1].toLowerCase().replace(/\./g,""))){i--;out.unshift(p[i]);}return out.join(" ");}
const ratingTier = r => r>=95?"legend":r>=86?"elite":r>=80?"gold":r>=72?"silver":"bronze";

/* ---------- build players / teams ---------- */
// Potential is computed ONCE at draft and never changes afterwards.
// Everyone sits at least +2 over their rating; the rest is age/fantasy headroom.
function computePotential(rating,age,name){
  // big age-based ceiling for the young, gently tapered by rating (a raw 75 has more room than an 82)
  const ab=age<=16?19:age<=17?18:age<=18?17:age<=19?16:age<=20?15:age<=21?13:age<=22?11:age<=23?9:age<=24?8:age<=25?6:age<=26?5:age<=27?4:age<=28?3:2;
  const taper=Math.max(0,rating-72)*0.7, wk=WONDERKIDS.has(name)?2:0;
  let pot=rating+Math.round(ab-taper+wk);
  if(rating>=93)pot=Math.max(pot,99);
  else if(rating>=90)pot=Math.max(pot,rating+4);
  else if(rating>=87)pot=Math.max(pot,rating+3);
  return Math.min(99,Math.max(rating+2,pot));
}
function makePlayer(t,team){
  const [name,rating,posStr,age]=t;
  return { name,age,base:rating,rating, pos:String(posStr).split("/").map(s=>s.trim()),
    potential:computePotential(rating,age,name),
    nat:team.code, natName:team.name, flag:team.flag, kit:team.kit, captain:false,
    mr:{sum:0,n:0}, tG:0, tA:0 };
}
// drafting a player makes a FRESH copy so power-ups/growth never mutate the
// shared TEAMS roster (otherwise upgrades would leak into the next run).
function clonePlayer(p){
  return { name:p.name, age:p.age, base:p.base, rating:p.base,
    pos:p.pos.slice(), potential:p.potential,
    nat:p.nat, natName:p.natName, flag:p.flag, kit:p.kit,
    captain:false, mr:{sum:0,n:0}, tG:0, tA:0 };
}
let TEAMS=[], TEAM_BY_CODE={};
function buildTeams(){
  if(typeof ROSTERS==="undefined")return false;
  TEAMS=TEAM_META.filter(m=>ROSTERS[m.code]).map(m=>{
    const r=ROSTERS[m.code], team={...m};
    team.players=r.players.map(p=>makePlayer(p,team));
    team.coachName=r.coach;
    team.coachBonus=COACH_BONUSES[hash(r.coach)%COACH_BONUSES.length];
    team.coachRating=clamp(Math.round(team.strength-10+(hash(r.coach)%9)),70,90); // rating, no potential
    return team;
  });
  TEAM_BY_CODE={}; TEAMS.forEach(t=>TEAM_BY_CODE[t.code]=t);
  return TEAMS.length>0;
}

/* ---------- state ---------- */
let S=null;
function freshState(){
  return {
    phase:"home", formationKey:null, styleKey:null,
    slots:[], coach:null, inventory:[], passives:{catalyst:false},
    stats:{ unlocked:false, values:{}, allLeft:STAT_ROLLS.all, specLeft:STAT_ROLLS.specific },
    startPU:false,
    draft:{ rollTeam:null, rerolls:3, pending:null, candidates:[], lastCode:null },
    tour:{ roundIdx:0, totalGoals:0, puGranted:0, history:[], pendingRolls:0,
           scorerTally:{}, biggest:null, lastGrew:[], rivals:[], table:[], finished:false },
    ui:{ selecting:null, swapFrom:null },
    currentMatch:null, endResult:null, endRound:null,
  };
}

/* ---------- ratings ---------- */
const getXI = ()=>S.slots.filter(s=>s.player);
const effRating = s => s.player.rating; // no out-of-position penalty
const coachEff = k => (S.coach && S.coach.bonus.eff[k]) || 0;
function statVal(id){ return S.stats.unlocked ? (S.stats.values[id]||75) : 75; }
function coachStatBonus(id){ const st=S.coach&&S.coach.bonus.eff.stat; return (st&&st[id])||0; }
function rolledStat(id){ return clamp(rollStatValue()+coachStatBonus(id),65,99); }
function teamRatings(){
  const xi=getXI();
  if(!xi.length)return{ovr:0,atk:0,def:0,tempo:0,n:0};
  let aw=0,as=0,dw=0,ds=0,sum=0;
  xi.forEach(s=>{const r=effRating(s);sum+=r;const a=ATK_WEIGHT[s.pos]||0,d=DEF_WEIGHT[s.pos]||0;as+=r*a;aw+=a;ds+=r*d;dw+=d;});
  // ATK / DEF are simply the weighted average of attacking / defending players.
  // (Squad stats & coaches feed the match simulation, not these displayed numbers.)
  return{ovr:Math.round(sum/xi.length),atk:Math.round(as/aw),def:Math.round(ds/dw),tempo:0,n:xi.length};
}

/* ---------- jersey / pitch ---------- */
let KIT_ID=0;
function kitSVG(kit,num){
  const id="kc"+(KIT_ID++);
  const body="M38 10 L56 18 L64 18 L82 10 L108 27 L97 49 L86 42 L86 99 L34 99 L34 42 L23 49 L12 27 Z";
  const stripes = kit.pat==="stripes" ? `<g clip-path="url(#${id})">
    <rect x="22" y="4" width="8" height="98" fill="${kit.s}"/><rect x="38" y="4" width="8" height="98" fill="${kit.s}"/>
    <rect x="54" y="4" width="8" height="98" fill="${kit.s}"/><rect x="70" y="4" width="8" height="98" fill="${kit.s}"/></g>`:"";
  return `<svg viewBox="0 0 120 110" class="kit-svg">
    <defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${kit.p}"/>${stripes}
    <path d="${body}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2"/>
    <path d="M48 13 Q60 28 72 13 L60 9 Z" fill="${kit.s}"/>
    <text x="60" y="64" text-anchor="middle" font-size="31" font-weight="900" fill="${kit.t}" style="paint-order:stroke" stroke="rgba(0,0,0,.14)" stroke-width="1">${num}</text>
  </svg>`;
}
function slotInner(i){
  const s=S.slots[i];
  if(!s.player) return `<div class="jersey empty"><span class="emptypos">${s.pos}</span><span class="emptyplus">+</span></div>`;
  const p=s.player;
  const cur=clamp((p.rating-50)/49,0,1)*100, pot=clamp((p.potential-50)/49,0,1)*100;
  const grew=S.tour.lastGrew.includes(p.name)?"grew":"";
  const tier=ratingTier(p.rating);
  const tourCtx=(S.phase==="tournament"||S.phase==="end");
  const rec=p.recent||[],avg=rec.length?rec.reduce((a,b)=>a+b,0)/rec.length:0;
  const mrCls=avg>=8?"hi":avg>=7?"mid":avg>=6?"ok":"low";
  const mrBadge=(tourCtx&&rec.length)?`<span class="jmr ${mrCls}" title="Avg rating, last ${rec.length} match${rec.length>1?"es":""}">${avg.toFixed(1)}</span>`:"";
  const ga=(tourCtx&&(p.tG||p.tA))?`<div class="jga">${p.tG?`<span class="ga-g">⚽${p.tG}</span>`:""}${p.tA?`<span class="ga-a">👟${p.tA}</span>`:""}</div>`:"";
  return `<div class="jersey tier-${tier} ${grew}" title="${p.name} · ${POS_LABEL[s.pos]||s.pos}">
    <div class="kit ${tier}">
      ${kitSVG(p.kit,p.rating)}
      <span class="kit-flag">${p.flag}</span>
      ${p.captain?`<span class="armband">C</span>`:""}
      <span class="kit-pos">${s.pos}</span>
      ${mrBadge}
      ${grew?`<span class="grew-badge">▲</span>`:""}
    </div>
    <div class="jname">${surname(p.name)}</div>
    <div class="jbar"><i class="pot" style="width:${pot}%"></i><i class="cur" style="width:${cur}%"></i></div>
    <div class="jpot">POT ${p.potential}</div>
    ${ga}
  </div>`;
}
function pitchHTML(){
  const slots=S.slots.map((s,i)=>`<div class="slot" style="left:${s.x}%;top:${s.y}%" data-slot="${i}">${slotInner(i)}</div>`).join("");
  const c=S.coach;
  const coach=`<div class="coach-slot">${c
    ?`<div class="coach-badge"><span class="cb-rat ${ratingTier(c.rating)}">${c.rating}</span><span class="cb-ico">${c.bonus.icon}</span><div><div class="cb-name">${shorten(c.name)}</div><div class="cb-eff">${c.bonus.label}</div></div></div>`
    :`<div class="coach-badge empty"><span class="cb-ico">🎽</span><div><div class="cb-name">Coach</div><div class="cb-eff">not picked</div></div></div>`}</div>`;
  return `<div class="pitch"><div class="pitch-lines"><span class="cc"></span><span class="hl"></span><span class="box t"></span><span class="box b"></span></div>${slots}${coach}</div>`;
}
function renderSlot(i,popIt){
  const node=q(`.slot[data-slot="${i}"]`); if(!node)return;
  node.innerHTML=slotInner(i);
  if(popIt){const j=q(".jersey",node); if(j)j.classList.add("pop");}
}

/* ---------- ratings bar ---------- */
function ratingsHTML(){
  const f=S.formationKey?FORMATIONS[S.formationKey].label:"–", st=S.styleKey?STYLES[S.styleKey].label:"–";
  return `<div class="ratings">
    <div class="rt big"><span class="rt-v" data-r="ovr">–</span><span class="rt-l">Overall</span></div>
    <div class="rt atk"><span class="rt-v" data-r="atk">–</span><span class="rt-l">Attack</span></div>
    <div class="rt def"><span class="rt-v" data-r="def">–</span><span class="rt-l">Defence</span></div>
    <div class="rt meta"><span class="rt-tag">${f}</span><span class="rt-tag">${st}</span></div>
  </div>`;
}
function setRatings(){
  const R=teamRatings();
  const o=q('[data-r="ovr"]'),a=q('[data-r="atk"]'),d=q('[data-r="def"]');
  if(o)o.textContent=R.ovr||"–"; if(a)a.textContent=R.atk||"–"; if(d)d.textContent=R.def||"–";
}

/* ---------- power-up inventory ---------- */
function inventoryHTML(){
  if(!S.inventory.length) return `<div class="pu-list empty">No power-ups yet</div>`;
  return `<div class="pu-list">${S.inventory.map((id,idx)=>{const d=puDef(id);
    return `<button class="pu" data-inv="${idx}"><span class="pu-ico">${d.icon}</span><span class="pu-tx"><span class="pu-name">${d.name}</span><span class="pu-desc">${d.desc}</span></span></button>`;
  }).join("")}</div>`;
}
function renderInventory(){const w=q(".pu-wrap"); if(w)q(".pu-list",w)?.replaceWith(el(inventoryHTML()));}

/* ---------- squad stats panel ---------- */
const statTier = v => v>=92?"elite":v>=84?"gold":v>=74?"silver":"bronze";
function rollStatValue(){ return clamp(65+Math.floor(Math.pow(Math.random(),2.3)*35),65,99); }
function statsPanelHTML(){
  const locked=!S.stats.unlocked, frozen=S.tour.history.length>0;
  const rows=STATS.map(s=>{
    const v=S.stats.values[s.id]; const canRR=!locked&&!frozen&&S.stats.specLeft>0;
    return `<div class="stat-row ${locked?"locked":""}" title="${s.desc}">
      <span class="stat-ico">${s.icon}</span>
      <span class="stat-name">${s.label}</span>
      <span class="stat-val ${v?statTier(v):""}" data-sv="${s.id}">${v||"–"}</span>
      <button class="stat-rr ${canRR?"rr-live":""}" data-stat-reroll="${s.id}" ${canRR?"":"disabled"} title="Reroll this stat">↻</button>
    </div>`;
  }).join("");
  const canAll=!locked&&!frozen&&S.stats.allLeft>0;
  return `<div class="stats-panel">
    <div class="sp-head"><span>Squad Stats</span>
      <button class="btn gold tiny ${canAll?"attn":""}" data-act="roll-stats-all" ${canAll?"":"disabled"}>🎲 Roll All <b data-sc="all">${S.stats.allLeft}</b></button></div>
    ${rows}
    <div class="sp-foot">${frozen?"🔒 Locked after kick-off":`Specific rerolls: <b data-sc="spec">${S.stats.specLeft}</b>${locked?" · finish your XI first":""}`}</div>
  </div>`;
}
function renderStats(){
  const p=q(".stats-panel"); if(!p)return;
  p.replaceWith(el(statsPanelHTML()));
}
function initStats(){
  if(S.stats.unlocked)return;
  S.stats.unlocked=true;
  STATS.forEach(s=>S.stats.values[s.id]=rolledStat(s.id)); // free initial draw (+ coach stat bonus)
}
function onRollStatsAll(){
  if(!S.stats.unlocked||S.stats.allLeft<=0||S.tour.history.length>0)return;
  S.stats.allLeft--; STATS.forEach(s=>S.stats.values[s.id]=rolledStat(s.id));
  renderStats(); setRatings(); toast("🎲 All squad stats rerolled");
}
function onStatReroll(id){
  if(!S.stats.unlocked||S.stats.specLeft<=0||S.tour.history.length>0)return;
  S.stats.specLeft--; S.stats.values[id]=rolledStat(id);
  renderStats(); setRatings();
}

/* ---------- power-up logic ---------- */
const puDef = id => POWERUPS.find(p=>p.id===id);
function rollPowerup(){ return weightedPick(POWERUPS,p=>p.weight).id; }
// rating boosts are always CAPPED at the player's (fixed) potential
function bumpRating(s,delta,ch){const p=s.player,from=p.rating;p.rating=Math.min(p.potential,p.rating+delta);if(p.rating!==from)ch.push({slotIdx:S.slots.indexOf(s),label:p.name,from,to:p.rating});}
function applyPowerupNoTarget(id){
  const xi=getXI(), d=puDef(id), ch=[];
  switch(id){
    case "masterclass": xi.forEach(s=>bumpRating(s,2,ch)); break;
    case "wonderkid":{const y=xi.slice().sort((a,b)=>a.player.age-b.player.age)[0]; if(y)bumpRating(y,5,ch); break;}
    case "golden_gen":{const c={};xi.forEach(s=>c[s.player.nat]=(c[s.player.nat]||0)+1);const top=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];xi.forEach(s=>{if(s.player.nat===top)bumpRating(s,3,ch);});break;}
    case "mentor": xi.filter(s=>s.player.age>=30).forEach(s=>bumpRating(s,4,ch)); break;
    case "catalyst": S.passives.catalyst=true; refreshSquadViews(); announcePU(d,[{label:"Growth chance",to:"boosted for the rest of the run"}]); return;
    case "lucky_roll": S.inventory.push(rollPowerup(),rollPowerup()); refreshSquadViews(); renderInventory(); announcePU(d,[{label:"Inventory",to:"+2 power-ups"}]); return;
  }
  refreshSquadViews(); announcePU(d, ch.length?ch:[{label:"Squad",to:"already at potential"}]);
}
function applyPowerupPlayer(id,slotIdx){
  const s=S.slots[slotIdx],p=s.player,from=p.rating,d=puDef(id);
  if(id==="potential_unlock")p.rating=p.potential;
  if(id==="talisman"){p.rating=Math.min(p.potential,p.rating+5);p.captain=true;}
  if(id==="position_master")p.rating=Math.min(p.potential,p.rating+6);
  // potential never changes
  renderSlot(slotIdx); setRatings();
  announcePU(d,[{slotIdx,label:p.name+(id==="talisman"?" (Captain)":""),from,to:p.rating}]);
}
function applyPowerupStat(id,statId){
  const from=S.stats.values[statId]; S.stats.values[statId]=clamp(from+8,0,99);
  renderStats(); setRatings();
  announcePU(puDef(id),[{label:STATS.find(s=>s.id===statId).label,from,to:S.stats.values[statId]}]);
}
function flashSlots(idxs){idxs.filter(i=>i!=null&&i>=0).forEach(i=>{const j=q(`.slot[data-slot="${i}"] .jersey`);if(j){j.classList.remove("flash-up");void j.offsetWidth;j.classList.add("flash-up");}});}
function announcePU(d,changes){
  const rows=changes.map(c=>`<div class="ac-row"><span class="ac-name">${c.label}</span>${(c.from!=null)?`<span class="ac-delta"><b>${c.from}</b> <span class="arr">→</span> <b class="ac-to">${c.to}</b></span>`:`<span class="ac-delta on">${c.to}</span>`}</div>`).join("");
  const o=showOverlay(`<div class="pu-applied lvl-${d.tier||1}"><div class="ac-ico">${d.icon}</div><div class="ac-ttl">${d.name}</div><div class="ac-sub">applied to your squad</div><div class="ac-list">${rows||'<div class="ac-row">Done.</div>'}</div><button class="btn btn-primary" data-ov="ok">Nice ✓</button></div>`,"applied-ov");
  q('[data-ov="ok"]',o).addEventListener("click",()=>closeOverlay(o,()=>flashSlots(changes.map(c=>c.slotIdx))));
}
function onUsePU(idx){
  const id=S.inventory[idx], d=puDef(id);
  if(d.target==="player"){ if(!getXI().length){toast("Draft players first");return;} S.ui.selecting={id,idx,kind:"player"}; enterSelect("player"); }
  else if(d.target==="stat"){ if(!S.stats.unlocked){toast("Roll your stats first");return;} S.ui.selecting={id,idx,kind:"stat"}; enterSelect("stat"); }
  else { S.inventory.splice(idx,1); (d.target==="passive"?applyPowerupNoTarget:applyPowerupNoTarget)(id); renderInventory(); }
}

/* selection mode (targeting) */
function enterSelect(kind){
  const note=q(".select-note");
  const d=puDef(S.ui.selecting.id);
  if(note){note.innerHTML=`${d.icon} <b>${d.name}</b> — pick a ${kind==="player"?"player on the pitch":"squad stat"} <button class="btn ghost tiny" data-act="cancel-select">Cancel</button>`;note.classList.add("show");}
  if(kind==="player") qa(".slot").forEach(n=>{ if(S.slots[+n.dataset.slot].player) n.classList.add("targetable"); });
  if(kind==="stat") qa(".stat-row").forEach(n=>n.classList.add("targetable"));
  if(kind==="stat") qa("[data-sv]").forEach(n=>n.closest(".stat-row").setAttribute("data-statpick",n.dataset.sv));
}
function exitSelect(){
  S.ui.selecting=null;
  qa(".targetable").forEach(n=>n.classList.remove("targetable"));
  qa("[data-statpick]").forEach(n=>n.removeAttribute("data-statpick"));
  const note=q(".select-note"); if(note){note.classList.remove("show");note.innerHTML="";}
}
function onStatPick(statId){
  if(!S.ui.selecting||S.ui.selecting.kind!=="stat")return;
  const sel=S.ui.selecting; S.inventory.splice(sel.idx,1); exitSelect();
  applyPowerupStat(sel.id,statId); renderInventory();
}

/* ---------- FIFA-weighted country roll + reroll ---------- */
// every nation has equal odds; never roll the same team twice in a row
function rollTeam(excludeCode){const pool=TEAMS.filter(t=>t.code!==excludeCode);return pick(pool.length?pool:TEAMS);}
const openSlots = ()=>S.slots.map((s,i)=>({s,i})).filter(o=>!o.s.player);
const slotAccepts = (slot,p)=>(ACCEPTS[slot.pos]||[]).some(c=>p.pos.includes(c));
const candidateSlotsFor = p => openSlots().filter(o=>slotAccepts(o.s,p)).map(o=>o.i);
const alreadyPicked = p => getXI().some(s=>s.player.name===p.name&&s.player.nat===p.nat);
const playerEligible = p => !alreadyPicked(p) && candidateSlotsFor(p).length>0;

/* =========================================================
   SCREEN MOUNTERS
   ========================================================= */
function mount(html){ app().innerHTML=html; }

function mountHome(){
  S.phase="home";
  mount(`<section class="screen hero">
    <div class="hero-bg"></div>
    <div class="hero-inner">
      <div class="brand"><span class="brand-elf">ELF</span><span class="brand-26">'26</span></div>
      <p class="tagline">Two roads to glory. Pick yours.</p>
      <div class="mode-grid">
        <button class="mode-card" data-act="go-setup">
          <div class="mc-ico">🏆</div>
          <div class="mc-ttl">WORLD CUP RUN</div>
          <p class="mc-desc">Draft an XI from all 48 nations of the 2026 World Cup, roll power-ups and take the trophy — ideally seven–nil.</p>
          <span class="mc-go">Play ▶</span>
        </button>
        <button class="mode-card rogue" data-act="go-rogue">
          <div class="mc-ico">🛡️</div>
          <div class="mc-ttl">GLORY ROAD <span class="mc-new">NEW</span></div>
          <p class="mc-desc">Found your own club, sign a star after every win, survive cup gauntlets and live-coach every match. A football roguelite.</p>
          <span class="mc-go">Play ▶</span>
        </button>
      </div>
      <p class="disclaimer">Unofficial · squads &amp; ratings are playful approximations.</p>
    </div>
  </section>`);
}

/* mentality RESHAPES the formation's roles (no hidden stat buffs) */
function applyMentality(base,m){
  const slots=base.map(s=>({pos:s.pos,x:s.x,y:s.y,player:null,natural:false}));
  if(m==="att"){
    slots.forEach(s=>{ if(s.pos==="CDM")s.pos="CM"; else if(s.pos==="RB")s.pos="RWB"; else if(s.pos==="LB")s.pos="LWB"; s.y=clamp(s.y-5,15,93); });
    const cms=slots.filter(s=>s.pos==="CM"); if(cms.length) cms.sort((a,b)=>a.y-b.y)[0].pos="CAM";
  } else if(m==="def"){
    slots.forEach(s=>{ if(s.pos==="CAM")s.pos="CM"; else if(s.pos==="RWB")s.pos="RB"; else if(s.pos==="LWB")s.pos="LB"; else if(s.pos==="RW")s.pos="RM"; else if(s.pos==="LW")s.pos="LM"; s.y=clamp(s.y+5,15,93); });
    const cms=slots.filter(s=>s.pos==="CM"); if(cms.length) cms.sort((a,b)=>b.y-a.y)[0].pos="CDM";
  }
  return slots;
}
function buildSlots(){ S.slots=applyMentality(FORMATIONS[S.formationKey].slots,(STYLES[S.styleKey]||{}).m||"bal"); }
function setupCards(){
  const fCards=Object.keys(FORMATIONS).map(k=>{const f=FORMATIONS[k];
    return `<button class="pickcard formation-card ${S.formationKey===k?"on":""}" data-formation="${k}">
      <div class="mini-pitch">${f.slots.map(s=>`<span class="mini-dot" style="left:${s.x}%;top:${s.y}%"></span>`).join("")}</div>
      <div class="pc-title">${f.label}</div></button>`;}).join("");
  const sCards=Object.keys(STYLES).map(k=>{const s=STYLES[k];
    return `<button class="pickcard style-card ${S.styleKey===k?"on":""}" data-style="${k}">
      <div class="style-ico">${s.icon}</div><div class="pc-title">${s.label}</div>
      <div class="pc-desc">${s.desc}</div></button>`;}).join("");
  return `<h2 class="sec-h">Formation</h2><div class="grid formations">${fCards}</div>
    <h2 class="sec-h">Mentality</h2><div class="grid styles">${sCards}</div>`;
}
function mountSetup(){
  S.phase="setup";
  if(!S.formationKey)S.formationKey="4-3-3";
  if(!S.styleKey)S.styleKey="balanced";
  buildSlots();
  mount(`<section class="screen setup">
    <header class="topbar"><div class="brand sm"><span class="brand-elf">ELF</span><span class="brand-26">'26</span></div><div class="step-label">Step 1 · Shape your side</div></header>
    <div class="play-grid two">
      <div class="center">${ratingsHTML()}${pitchHTML()}
        <div class="hint">Your shape updates live. <b>Mentality reshapes positions</b> — Attacking turns full-backs into wing-backs and a midfielder into a No.10 (no hidden stat buffs).</div></div>
      <div class="right">${setupCards()}</div>
    </div>
    <footer class="actionbar"><button class="btn ghost" data-act="go-home">Back</button>
      <button class="btn btn-primary" data-act="to-draft">Continue to draft ▶</button></footer>
  </section>`);
  setRatings();
}
function paintSetupSel(){
  buildSlots();
  const p=q(".setup .pitch"); if(p)p.outerHTML=pitchHTML();
  const r=q(".setup .ratings"); if(r)r.outerHTML=ratingsHTML();
  qa("[data-formation]").forEach(n=>n.classList.toggle("on",n.dataset.formation===S.formationKey));
  qa("[data-style]").forEach(n=>n.classList.toggle("on",n.dataset.style===S.styleKey));
  setRatings();
}

function mountDraft(){
  S.phase="draft";
  if(!S.slots.length) buildSlots(); // shape was set on the setup screen
  mount(`<section class="screen draft">
    <header class="topbar"><div class="brand sm"><span class="brand-elf">ELF</span><span class="brand-26">'26</span></div>
      <div class="draft-progress"><div class="dp-bar"><span data-dp></span></div><span class="dp-num" data-dpn>0/12</span></div></header>
    <div class="play-grid two">
      <div class="center">
        ${ratingsHTML()}
        ${pitchHTML()}
        <div class="select-note"></div>
        <div class="hint">Tip: click a player, then a team-mate to swap positions (if both can play there).</div>
      </div>
      <div class="right">${rollPaneHTML()}</div>
    </div>
    <footer class="actionbar center"><div class="pu-wrap mini"><span class="pu-label">Power-ups roll after your XI is set →</span></div>
      <button class="btn btn-primary big" data-act="to-hub" style="display:none">Continue ▶</button></footer>
  </section>`);
  setRatings(); updateProgress();
}
function rollPaneHTML(){
  if(S.draft.rollTeam==="__rolling__") return `<div class="rolling"><div class="rolling-dice">🎲</div><div class="rolling-txt">Rolling a country…</div></div>`;
  if(S.draft.pending) return `<div class="place-note">📍 Pick a highlighted position for <b>${S.draft.pending.name}</b><button class="btn ghost tiny" data-act="cancel-place">Cancel</button></div>`;
  if(!S.draft.rollTeam) return `<div class="roll-cta"><button class="btn btn-primary big" data-act="roll-team">🎲 Roll a country</button><p class="roll-hint">Every nation has equal odds. You have <b>${S.draft.rerolls}</b> rerolls.</p></div>`;
  return teamPaneHTML(S.draft.rollTeam);
}
function teamPaneHTML(t){
  const coachTaken=!!S.coach;
  const groups={GK:[],DEF:[],MID:[],FWD:[]};
  t.players.forEach((p,idx)=>groups[POS_GROUP(p.pos[0])].push({p,idx}));
  const order=["GK","DEF","MID","FWD"], labels={GK:"Goalkeepers",DEF:"Defenders",MID:"Midfielders",FWD:"Forwards"};
  const body=order.map(g=>{
    if(!groups[g].length)return"";
    groups[g].sort((a,b)=>(POS_ORDER[a.p.pos[0]]-POS_ORDER[b.p.pos[0]])||(b.p.rating-a.p.rating));
    const rows=groups[g].map(({p,idx})=>{const taken=alreadyPicked(p); const elig=!taken&&playerEligible(p);
      return `<button class="prow ${elig?"":"dim"} ${taken?"taken":""}" data-pick="${idx}" ${elig?"":"disabled"}>
        <span class="pr-pos">${p.pos.map(x=>`<span class="pos-chip">${x}</span>`).join("")}</span>
        <span class="pr-name">${p.name}<span class="pr-age"> · ${p.age}</span></span>
        <span class="pr-rat ${ratingTier(p.rating)}">${p.rating}</span>
        ${taken?`<span class="pr-pot in-squad">✓ in squad</span>`:`<span class="pr-pot">↗ ${p.potential}</span>`}</button>`;}).join("");
    return `<div class="pgrp"><div class="pgrp-h">${labels[g]}</div>${rows}</div>`;
  }).join("");
  const coach=coachTaken?"":`<button class="coachcard" data-coach="1">
      <div class="cc-left"><span class="cc-rat ${ratingTier(t.coachRating)}">${t.coachRating}</span><span class="cc-ico">${t.coachBonus.icon}</span><div><div class="cc-name">${t.coachName}</div><div class="cc-role">Coach · ${t.name}</div></div></div>
      <div class="cc-eff">${t.coachBonus.label}<small>${t.coachBonus.desc}</small></div></button>`;
  const anyElig=t.players.some(p=>playerEligible(p));
  return `<div class="team-pane">
    <div class="team-head"><span class="th-flag">${t.flag}</span><span class="th-name">${t.name}</span>
      <span class="th-str">STR ${t.strength}</span>
      ${S.draft.rerolls>0?`<button class="btn reroll-btn tiny" data-act="reroll-team">↻ Reroll <b>${S.draft.rerolls}</b></button>`:`<span class="th-noreroll">no rerolls</span>`}</div>
    ${coach?`<div class="cc-wrap">${coach}</div>`:""}
    <div class="prows">${body}</div>
    ${(!anyElig&&coachTaken)?`<div class="no-fit"><span>No-one fits your open spots.</span><button class="btn ghost tiny" data-act="roll-team">🎲 Roll another (free)</button></div>`:""}
  </div>`;
}
function renderRight(){const r=q(".right"); if(r)r.innerHTML=rollPaneHTML();}
function updateProgress(){
  const filled=getXI().length+(S.coach?1:0);
  const bar=q("[data-dp]"),num=q("[data-dpn]");
  if(bar)bar.style.width=(filled/12*100)+"%"; if(num)num.textContent=filled+"/12";
  const done=filled===12;
  const cont=q('[data-act="to-hub"]'); if(cont)cont.style.display=done?"":"none";
  const lbl=q(".pu-label"); if(lbl)lbl.style.display=done?"none":"";
}

/* =========================================================
   DRAFT INTERACTION
   ========================================================= */
function doRoll(isReroll){
  if(S.draft.rollTeam==="__rolling__")return; // guard against double-roll
  if(isReroll){ if(S.draft.rerolls<=0)return; S.draft.rerolls--; }
  const prev=(S.draft.rollTeam&&S.draft.rollTeam.code)||S.draft.lastCode||null;
  S.draft.pending=null; S.draft.candidates=[]; clearSwap();
  S.draft.rollTeam="__rolling__"; renderRight();
  setTimeout(()=>{ S.draft.rollTeam=rollTeam(prev); S.draft.lastCode=S.draft.rollTeam.code; renderRight(); }, 460);
}
function onPick(idx){
  const t=S.draft.rollTeam; if(!t||t==="__rolling__")return;
  const player=t.players[idx];
  if(alreadyPicked(player))return;
  const cands=candidateSlotsFor(player);
  if(!cands.length)return;
  // always let the user click the target position (even if only one fits)
  S.draft.pending=player; S.draft.candidates=cands; renderRight();
  cands.forEach(i=>q(`.slot[data-slot="${i}"]`)?.classList.add("candidate"));
}
function placePlayer(player,i){
  const s=S.slots[i]; s.player=clonePlayer(player); s.natural=player.pos.includes(s.pos);
  S.draft.rollTeam=null; S.draft.pending=null; S.draft.candidates=[];
  qa(".candidate").forEach(n=>n.classList.remove("candidate"));
  renderSlot(i,true); setRatings(); updateProgress(); renderRight();
}
function onPickCoach(){
  const t=S.draft.rollTeam; if(!t||t==="__rolling__"||S.coach)return;
  S.coach={name:t.coachName,team:t.name,bonus:t.coachBonus,rating:t.coachRating};
  S.draft.rollTeam=null;
  q(".coach-slot").outerHTML=`<div class="coach-slot"><div class="coach-badge"><span class="cb-rat ${ratingTier(S.coach.rating)}">${S.coach.rating}</span><span class="cb-ico">${S.coach.bonus.icon}</span><div><div class="cb-name">${shorten(S.coach.name)}</div><div class="cb-eff">${S.coach.bonus.label}</div></div></div></div>`;
  setRatings(); updateProgress(); renderRight();
}

/* ---------- swap / move ---------- */
const canPlay=(p,pos)=>(ACCEPTS[pos]||[]).some(c=>p.pos.includes(c));
function highlightSwap(i){
  q(`.slot[data-slot="${i}"]`)?.classList.add("swap-from");
  S.slots.forEach((s,j)=>{ if(j===i)return;
    const from=S.slots[i].player; let ok;
    if(!s.player) ok=canPlay(from,s.pos); else ok=canPlay(from,s.pos)&&canPlay(s.player,S.slots[i].pos);
    if(ok)q(`.slot[data-slot="${j}"]`)?.classList.add("swap-ok"); });
}
function clearSwap(){ S.ui.swapFrom=null; qa(".swap-from,.swap-ok").forEach(n=>n.classList.remove("swap-from","swap-ok")); }
function onSlot(i){
  if(S.ui.selecting&&S.ui.selecting.kind==="player"){
    if(!S.slots[i].player)return;
    const sel=S.ui.selecting; S.inventory.splice(sel.idx,1); exitSelect(); applyPowerupPlayer(sel.id,i); renderInventory(); return;
  }
  if(S.draft.pending){ if(S.draft.candidates.includes(i)&&!S.slots[i].player) placePlayer(S.draft.pending,i); return; }
  const s=S.slots[i];
  if(S.ui.swapFrom==null){ if(s.player){S.ui.swapFrom=i;highlightSwap(i);} return; }
  if(S.ui.swapFrom===i){ clearSwap(); return; }
  const fi=S.ui.swapFrom, from=S.slots[fi];
  if(!s.player){ if(canPlay(from.player,s.pos)){ s.player=from.player;s.natural=s.player.pos.includes(s.pos);from.player=null;from.natural=false; finishSwap(fi,i);} else clearSwap(); return; }
  if(canPlay(from.player,s.pos)&&canPlay(s.player,from.pos)){
    const a=from.player,b=s.player; from.player=b;from.natural=b.pos.includes(from.pos); s.player=a;s.natural=a.pos.includes(s.pos); finishSwap(fi,i);
  } else { clearSwap(); S.ui.swapFrom=i; highlightSwap(i); }
}
function finishSwap(a,b){ clearSwap(); renderSlot(a); renderSlot(b); setRatings();
  if(S.phase==="draft"){ updateProgress(); renderRight(); } } // a freed slot becomes draftable again

/* refresh squad-wide views after a global rating change */
function refreshSquadViews(){ getXI().forEach((s,i)=>{}); S.slots.forEach((s,i)=>{ if(s.player)renderSlot(i); }); setRatings(); }

/* =========================================================
   TOURNAMENT HUB
   ========================================================= */
function mountHub(){
  S.phase="tournament";
  if(!S.stats.unlocked) initStats();
  if(!S.tour.rivals.length) setupGroup();
  const r=ROUNDS[S.tour.roundIdx], fin=S.tour.finished, you=S.tour.table.find(x=>x.you);
  const ord=["st","nd","rd","th"];
  const banner = fin
    ? `<div class="round-banner result ${S.endResult==="champion"?"champ":"out"}"><span class="rb-name">${S.endResult==="champion"?"🏆 World Champions":"❌ Eliminated · "+S.endRound}</span></div>`
    : `<div class="round-banner ${r.type}"><span class="rb-name">${r.name}</span>${r.type==="group"?`<span class="rb-pts">${you?you.Pts:0} pts · ${groupRank()}${ord[Math.min(groupRank()-1,3)]} in group</span>`:""}</div>`;
  mount(`<section class="screen hub ${fin?"finished":""}">
    <header class="topbar"><div class="brand sm"><span class="brand-elf">ELF</span><span class="brand-26">'26</span></div>
      <div class="bracket">${bracketHTML()}</div></header>
    ${banner}
    <div class="play-grid three">
      <div class="left">${statsPanelHTML()}<div class="pu-wrap"><div class="pu-head">Power-ups</div>${inventoryHTML()}</div></div>
      <div class="center">${ratingsHTML()}${pitchHTML()}<div class="select-note"></div>
        <div class="hint">${fin?"Your final XI.":"Click a player, then a team-mate to swap positions."}</div></div>
      <div class="right">${hubRightHTML()}</div>
    </div>
  </section>`);
  setRatings();
}
function setupGroup(){
  const used=new Set(), rivals=[]; let guard=0;
  while(rivals.length<3&&guard++<300){
    const t=weightedPick(TEAMS,x=>clamp(40-Math.abs(x.strength-78)*1.4,3,40)*(used.has(x.code)?0.0001:1));
    if(!used.has(t.code)){used.add(t.code);rivals.push(t);}
  }
  S.tour.rivals=rivals;
  S.tour.table=[{code:"YOU",name:"Your ELF",flag:"🎽",you:true,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0},
    ...rivals.map(t=>({code:t.code,name:t.name,flag:t.flag,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0}))];
}
function groupRank(){
  const t=S.tour.table.slice().sort((a,b)=>b.Pts-a.Pts||((b.GF-b.GA)-(a.GF-a.GA))||b.GF-a.GF);
  const i=t.findIndex(r=>r.you); return i<0?1:i+1;
}
function bracketHTML(){
  const played=S.tour.history.length;
  return ROUNDS.map((rd,i)=>{
    const cls=S.tour.finished?(i<played?"done":""):(i<S.tour.roundIdx?"done":i===S.tour.roundIdx?"now":"");
    return `<span class="dot ${cls} ${rd.type}" title="${rd.name}"></span>`;}).join("");
}
function hubRightHTML(){
  if(S.tour.finished) return finishedRightHTML();
  const toNext=TUNE.GOALS_PER_PU-(S.tour.totalGoals%TUNE.GOALS_PER_PU);
  const pct=(S.tour.totalGoals%TUNE.GOALS_PER_PU)/TUNE.GOALS_PER_PU*100;
  let action;
  if(!S.startPU) action=`<div class="startpu"><button class="btn btn-gold" data-act="roll-startpu">🎲 Roll starting power-up</button><span class="roll-hint">Your first power-up — claim it before kick-off.</span></div>`;
  else if(S.tour.pendingRolls>0) action=`<button class="btn btn-gold big" data-act="roll-pu">🎲 Roll power-up (×${S.tour.pendingRolls})</button>`;
  else { const r=ROUNDS[S.tour.roundIdx]; action=`<button class="btn btn-primary big" data-act="next-match">${r.type==="final"?"Play the FINAL ⚽":"Next match ▶"}</button>`; }
  const hist=S.tour.history.length?`<div class="history"><div class="hist-h">Match history</div>${S.tour.history.slice().reverse().map(matchMiniHTML).join("")}</div>`:`<div class="nomatch">No match played yet.</div>`;
  return `<div class="goalbox"><div class="gb-top"><span class="gb-goals">⚽ ${S.tour.totalGoals}</span><span class="gb-next">${toNext} to next power-up</span></div><div class="goalbar"><span style="width:${pct}%"></span></div></div>
    <div class="hub-action">${action}</div>${hist}`;
}
function finishedRightHTML(){
  const champ=S.endResult==="champion", R=teamRatings(), big=S.tour.biggest;
  const top=Object.entries(S.tour.scorerTally).sort((a,b)=>b[1]-a[1])[0];
  const seven=S.tour.history.some(m=>m.gf>=7&&m.ga===0);
  let bestP=null,bestA=0; getXI().forEach(s=>{const a=s.player.mr.n?s.player.mr.sum/s.player.mr.n:0; if(a>bestA){bestA=a;bestP=s.player;}});
  return `<div class="end-summary ${champ?"champ":"out"}">
      <div class="es-emoji">${champ?"🏆":"😞"}</div>
      <div class="es-ttl">${champ?(seven?"7–0 Legend!":"World Champions!"):"Knocked out"}</div>
      <div class="es-sub">${champ?"You won the 2026 World Cup.":"Out at "+S.endRound+"."}</div>
      <div class="es-stats">
        <div class="es-st"><b>${S.tour.totalGoals}</b><span>Goals</span></div>
        <div class="es-st"><b>${R.ovr}</b><span>Final XI</span></div>
        <div class="es-st"><b>${top?shorten(top[0]):"–"}</b><span>Top scorer · ${top?top[1]:0}</span></div>
        <div class="es-st"><b>${bestP?bestA.toFixed(1):"–"}</b><span>Best avg${bestP?" · "+shorten(bestP.name):""}</span></div>
      </div>
      <button class="btn btn-primary big" data-act="restart">New run 🎲</button>
    </div>
    <div class="history"><div class="hist-h">Full run</div>${S.tour.history.slice().reverse().map(matchMiniHTML).join("")}</div>`;
}
function renderHubRight(){const r=q(".hub .right"); if(r)r.innerHTML=hubRightHTML();}
function matchMiniHTML(m){
  const sc=m.scorers.length?m.scorers.map(s=>`${shorten(s.name)}${s.count>1?" ×"+s.count:""}`).join(", "):"–";
  return `<div class="match-mini ${m.result==="W"?"win":m.result==="D"?"draw":"loss"}">
    <div class="mm-head">${m.roundName}</div>
    <div class="mm-score"><span class="mm-you">YOU</span><span class="mm-num">${m.gf}<span class="dash">:</span>${m.ga}</span><span class="mm-opp">${m.opp.flag} ${m.opp.name}</span></div>
    ${m.pens?`<div class="mm-pens">pens ${m.pens.you}:${m.pens.opp} ${m.pens.win?"won":"lost"}</div>`:""}
    <div class="mm-scorers">⚽ ${sc}</div></div>`;
}

/* =========================================================
   MATCH ENGINE + LIVE SCREEN
   ========================================================= */
function pickOpponent(round){
  // deeper rounds demand stronger nations (no Canada in the semis)
  const used=new Set(S.tour.history.map(h=>h.opp.code));
  const thr = round.type==="final"?86 : round.id==="sf"?83 : round.id==="qf"?80 : round.id==="r16"?76 : round.id==="r32"?72 : 0;
  return weightedPick(TEAMS,t=>{
    let w=Math.pow(Math.max(0.4,t.strength-thr),2.3);
    if(used.has(t.code))w*=0.12;
    return w; });
}
const CREATE_WEIGHT={CAM:1,RW:.9,LW:.9,RM:.7,LM:.7,CM:.65,CDM:.4,RWB:.65,LWB:.65,RB:.52,LB:.52,ST:.5,CB:.12,GK:.02};
function buildOppXI(team){
  const gk=team.players.filter(p=>p.pos[0]==="GK").sort((a,b)=>b.rating-a.rating)[0];
  const out=team.players.filter(p=>p.pos[0]!=="GK").sort((a,b)=>b.rating-a.rating).slice(0,10);
  return [...(gk?[gk]:[]),...out].map(p=>({name:p.name,sur:surname(p.name),rating:p.rating,pos:p.pos[0]}));
}
function xiOfMine(){
  return getXI().slice().sort((a,b)=>(POS_ORDER[a.pos]-POS_ORDER[b.pos]))
    .map(s=>({name:s.player.name,sur:surname(s.player.name),rating:s.player.rating,pos:s.pos,kit:s.player.kit,ref:s.player}));
}
// scorers: never the keeper, strongly weighted by attacking role then rating
// HIDDEN form: a player's last-3 match ratings nudge how he performs next game. Never shown.
function formOf(p){
  const rec=p&&p.recent||[]; if(rec.length<2)return {adj:0,mul:1};
  const d=rec.reduce((a,b)=>a+b,0)/rec.length-6.8;
  return {adj:clamp(d*0.55,-1.6,2.2), mul:clamp(1+d*0.14,0.6,1.7)};
}
function pickScorerIdx(xi,excl){
  const cand=xi.map((_,i)=>i).filter(i=>xi[i].pos!=="GK"&&!(excl&&excl.has(i)));
  if(!cand.length)return -1;
  return weightedPick(cand,i=>Math.pow(ATK_WEIGHT[xi[i].pos]||0.05,1.5)*Math.pow(xi[i].rating+(xi[i].fAdj||0),2.0)*(xi[i].fMul||1));
}
function pickAssistIdx(xi,exclude,excl){
  const cand=xi.map((_,i)=>i).filter(i=>i!==exclude&&xi[i].pos!=="GK"&&!(excl&&excl.has(i)));
  if(!cand.length)return -1;
  return weightedPick(cand,i=>Math.pow(CREATE_WEIGHT[xi[i].pos]||0.05,1.2)*Math.pow(xi[i].rating+(xi[i].fAdj||0),1.6)*(xi[i].fMul||1));
}
function xiRatings(xi){let aw=0,as=0,dw=0,ds=0,sum=0;xi.forEach(p=>{const a=ATK_WEIGHT[p.pos]||0,d=DEF_WEIGHT[p.pos]||0;as+=p.rating*a;aw+=a;ds+=p.rating*d;dw+=d;sum+=p.rating;});const avg=sum/xi.length;return{atk:as/aw+standoutBonus(xi,ATK_WEIGHT,avg),def:ds/dw+standoutBonus(xi,DEF_WEIGHT,avg),ovr:avg};}
function buildMatch(round){
  const R=teamRatings();
  const opp=round.type==="group"?S.tour.rivals[S.tour.roundIdx]:pickOpponent(round);
  const myXI=xiOfMine(), oppXI=buildOppXI(opp), ev=[];
  myXI.forEach(x=>{const f=formOf(x.ref);x.fAdj=f.adj;x.fMul=f.mul;}); // hidden form from each player's last 3 ratings
  // opponent strength = the XI you ACTUALLY face (not a fixed team number) → fair matchups
  const OR=xiRatings(oppXI), diff=round.diff;
  const oppAtk=OR.atk*diff, oppDef=OR.def*diff, oppStr=Math.round(OR.ovr*diff);
  const chem=S.stats.unlocked?(statVal("chemistry")-75)*0.18:0;
  const tac=S.stats.unlocked?(statVal("tactics")-75)*0.18:0;
  const fit=S.stats.unlocked?Math.max(0,statVal("fitness")-78)*0.03:0;
  const sbA=standoutBonus(myXI,ATK_WEIGHT,R.ovr), sbD=standoutBonus(myXI,DEF_WEIGHT,R.ovr);
  let faw=0,fa=0,fdw=0,fd=0; myXI.forEach(x=>{const a=ATK_WEIGHT[x.pos]||0,d=DEF_WEIGHT[x.pos]||0;fa+=(x.fAdj||0)*a;faw+=a;fd+=(x.fAdj||0)*d;fdw+=d;});
  const myAtk=R.atk+chem+sbA+fa/Math.max(.1,faw), myDef=R.def+tac+sbD+fd/Math.max(.1,fdw); // +hidden form
  // higher base = more goals (3:2, 4:3); steeper slope = the better XI wins more reliably
  const lamYou=clamp(1.6+(myAtk-oppDef)*0.13,0.15,5.5);
  const lamOpp=clamp(1.6+(oppAtk-myDef)*0.13-fit,0.12,5.0);
  const gf=Math.min(7,poisson(lamYou)), ga=Math.min(7,poisson(lamOpp));
  const xiOf=s=>s==="you"?myXI:oppXI;
  // cards FIRST, so a sent-off player can't score afterwards
  const sentOff={you:[],opp:[]}; let yR=0,oR=0; const nCards=ri(0,3);
  for(let i=0;i<nCards;i++){
    const side=Math.random()<0.5?"you":"opp", xi=xiOf(side), idx=ri(0,xi.length-1);
    const red=Math.random()<0.05&&(side==="you"?yR:oR)<1&&xi[idx].pos!=="GK";
    if(red){side==="you"?yR++:oR++; const min=ri(25,88); sentOff[side].push({idx,min}); ev.push({min,side,type:"red",who:xi[idx].name});}
    else ev.push({min:ri(10,90),side,type:"yellow",who:xi[idx].name});
  }
  for(let i=0;i<ri(0,2);i++){const side=Math.random()<0.5?"you":"opp",xi=xiOf(side);ev.push({min:ri(5,88),side,type:"foul",who:xi[ri(0,xi.length-1)].name});}
  if(Math.random()<0.18){const gk=myXI.find(p=>p.pos==="GK");ev.push({min:ri(30,85),side:"opp",type:"pensave",who:gk?gk.name:"the keeper"});}
  // goals, excluding anyone already sent off before that minute
  const offBefore=(side,mn)=>new Set(sentOff[side].filter(o=>o.min<=mn).map(o=>o.idx));
  const addGoals=(n,side,xi)=>{
    const mins=[]; for(let i=0;i<n;i++)mins.push(ri(3,90)); mins.sort((a,b)=>a-b);
    mins.forEach(mn=>{
      const excl=offBefore(side,mn);
      const sIdx=pickScorerIdx(xi,excl); if(sIdx<0)return;
      const pen=Math.random()<0.12;
      let aIdx=-1;
      if(!pen&&Math.random()<0.72) aIdx=pickAssistIdx(xi,sIdx,excl);
      ev.push({min:mn,side,type:"goal",scorerIdx:sIdx,assistIdx:aIdx,pen});
    });
  };
  addGoals(gf,"you",myXI); addGoals(ga,"opp",oppXI);
  ev.sort((a,b)=>a.min-b.min||(a.type==="goal"?-1:1));
  const tal={}; ev.filter(e=>e.type==="goal"&&e.side==="you").forEach(e=>{const nm=myXI[e.scorerIdx].name;tal[nm]=(tal[nm]||0)+1;});
  const scorers=Object.entries(tal).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  let pens=null,advanced=true,result;
  if(round.type==="group") result=gf>ga?"W":gf<ga?"L":"D";
  else if(gf!==ga){ advanced=gf>ga; result=gf>ga?"W":"L"; }
  else { pens=buildShootout(opp,R,oppStr); advanced=pens.win; result=pens.win?"W":"L"; }
  if(!S.tour.biggest||(gf-ga)>(S.tour.biggest.gf-S.tour.biggest.ga))S.tour.biggest={opp:opp.name,flag:opp.flag,gf,ga};
  return {round:round.id,roundName:round.name,type:round.type,opp,oppStr:Math.round(oppStr),gf,ga,ev,pens,result,advanced,scorers,myXI,oppXI};
}
function buildShootout(opp,R,oppStr){
  const pYou=clamp(0.72+(statVal("morale")-75)*0.012+(R.ovr-oppStr)*0.004,0.45,0.95);
  const pOpp=clamp(0.70+(oppStr-70)*0.005,0.45,0.9);
  const you=[],op=[];let ys=0,osc=0;
  for(let i=0;i<5;i++){you.push(Math.random()<pYou?1:0);op.push(Math.random()<pOpp?1:0);}
  // simple: count first 5, sudden death if tied
  ys=you.reduce((a,b)=>a+b,0); osc=op.reduce((a,b)=>a+b,0);
  while(ys===osc){const a=Math.random()<pYou?1:0,b=Math.random()<pOpp?1:0;you.push(a);op.push(b);ys+=a;osc+=b; if(you.length>10)break;}
  if(ys===osc){ if(Math.random()<pYou)ys++; else osc++; }
  return {you:ys,opp:osc,win:ys>osc,kicksYou:you,kicksOpp:op};
}

/* live match screen — your XI left, opponent XI right, feed centre */
let matchTimer=null;
function sideColumn(side,m){
  const xi=side==="you"?m.myXI:m.oppXI;
  const head=side==="you"
    ? `<div class="ms-head"><div class="ms-flag">🎽</div><div class="ms-name">YOUR ELF</div><div class="ms-score" data-gf>0</div></div>`
    : `<div class="ms-head"><div class="ms-flag">${m.opp.flag}</div><div class="ms-name">${m.opp.name}</div><div class="ms-score" data-ga>0</div></div>`;
  const oppKit=m.opp.kit;
  const jers=(side==="you"?autoXY(xi):autoXYopp(xi)).map((p,i)=>`<div class="mxj tier-${ratingTier(p.rating)}" data-i="${i}" style="left:${p.x}%;top:${p.y}%">
      <div class="mxj-kit">${kitSVG(side==="you"?p.kit:oppKit,p.rating)}</div><span class="mxj-nm">${p.sur}</span><span class="mx-ico"></span></div>`).join("");
  return `<div class="mside ${side}">${head}<div class="ms-scorers" data-scorers></div><div class="ms-pitch ${side}"><div class="pitch-lines"><span class="cc"></span><span class="hl"></span><span class="box t"></span><span class="box b"></span></div>${jers}</div></div>`;
}
function mountMatch(){
  S.phase="match"; clearInterval(matchTimer);
  const m=S.currentMatch=buildMatch(ROUNDS[S.tour.roundIdx]);
  mount(`<section class="screen match">
    <div class="mclockbar"><div class="mround">${m.roundName}</div>
      <div class="mclock"><span data-clock>0</span>'</div>
      <div class="mround" style="visibility:hidden">${m.roundName}</div></div>
    <div class="mgrid">
      ${sideColumn("you",m)}
      <div class="mmid"><div class="mshoot" data-shoot></div><div class="mfeed" data-feed></div></div>
      ${sideColumn("opp",m)}
    </div>
    <div class="mbar"><button class="btn ghost" data-act="skip-match">Skip ⏩</button>
      <div class="mlive"><span class="livedot"></span> LIVE</div>
      <button class="btn btn-primary" data-act="continue-match" style="display:none">Continue ▶</button></div>
  </section>`);
  feed(1,"🟢",`Kick-off! Your ELF take on ${m.opp.name}.`,"");
  playMatch(m);
}
function feed(min,icon,txt,cls){
  const f=q("[data-feed]"); if(!f)return;
  f.prepend(el(`<div class="feed-row ${cls||""}"><span class="fmin">${min}'</span><span class="ficon">${icon}</span><span class="ftxt">${txt}</span></div>`));
}
function markIcon(side,idx,kind){
  const cell=q(`.mside.${side} [data-i="${idx}"] .mx-ico`); if(!cell)return;
  if(kind==="goal"){ const c=(+cell.dataset.g||0)+1; cell.dataset.g=c; cell.textContent=c>1?`⚽×${c}`:"⚽"; cell.classList.add("hasgoal"); }
  else if(!cell.dataset.g){ cell.textContent="👟"; cell.classList.add("hasassist"); }
}
function applyEvent(e,m){
  if(e.type==="goal"){
    const xi=e.side==="you"?m.myXI:m.oppXI, sc=xi[e.scorerIdx], as=e.assistIdx>=0?xi[e.assistIdx]:null;
    const key=e.side==="you"?"_gf":"_ga"; m[key]=(m[key]||0)+1;
    bump(e.side==="you"?"[data-gf]":"[data-ga]",m[key]);
    const chip=q(`.mside.${e.side} [data-scorers]`); if(chip)chip.insertAdjacentHTML("beforeend",`<span class="sc-chip">⚽ ${sc.sur} <b>${e.min}'</b></span>`);
    markIcon(e.side,e.scorerIdx,"goal"); if(as)markIcon(e.side,e.assistIdx,"assist");
    if(e.side==="you")S.tour.scorerTally[sc.name]=(S.tour.scorerTally[sc.name]||0)+1;
    const gf=m._gf||0,ga=m._ga||0;
    if(e.side==="you")feed(e.min,"⚽",`<b>GOAL!</b> ${sc.name}${as?` <span class="assist">— assist ${as.sur}</span>`:""}${e.pen?" (pen)":""}. ${gf}–${ga}`,"goal");
    else feed(e.min,"⚽",`${m.opp.name}: ${sc.name}${as?` (assist ${as.sur})`:""}${e.pen?" (pen)":""}. ${gf}–${ga}`,"opp goal");
  } else if(e.type==="yellow"){ feed(e.min,"🟨",`Yellow — ${e.who}.`,""); }
  else if(e.type==="red"){ feed(e.min,"🟥",`<b>RED CARD!</b> ${e.who} is off — down to ten.`,"red"); }
  else if(e.type==="foul"){ feed(e.min,"⚠️",`Foul by ${e.who}.`,""); }
  else if(e.type==="pensave"){ feed(e.min,"🧤",`<b>PENALTY SAVED!</b> ${e.who} keeps it level.`,"save"); }
}
function bump(sel,val){const n=q(sel);if(!n)return;n.textContent=val;n.classList.remove("flash");void n.offsetWidth;n.classList.add("flash");}
function playMatch(m){
  m._min=0; m._ei=0;
  const stepMs=Math.max(45,TUNE.MATCH_SECONDS*1000/90);
  matchTimer=setInterval(()=>{
    m._min++;
    const ck=q("[data-clock]"); if(ck)ck.textContent=m._min;
    while(m._ei<m.ev.length&&m.ev[m._ei].min<=m._min){ applyEvent(m.ev[m._ei],m); m._ei++; }
    if(m._min>=90){ clearInterval(matchTimer); finishLive(m); }
  },stepMs);
}
function finishLive(m){
  const ck=q("[data-clock]"); if(ck)ck.textContent="90";
  const live=q(".mlive"); if(live){ live.classList.add("ft"); live.innerHTML="FULL TIME"; }
  if(m.pens) runShootout(m); else showContinue(m);
}
function runShootout(m){
  const wrap=q("[data-shoot]"); if(!wrap)return showContinue(m);
  feed(90,"🥅","<b>It goes to penalties!</b>","");
  wrap.innerHTML=`<div class="shootout"><div class="so-ttl">Penalty Shootout</div>
    <div class="so-row"><span class="so-lab">YOU</span><span class="so-dots" data-so-you></span><b class="so-n" data-so-yn>0</b></div>
    <div class="so-row"><span class="so-lab">${m.opp.name}</span><span class="so-dots" data-so-opp></span><b class="so-n" data-so-on>0</b></div></div>`;
  const maxK=Math.max(m.pens.kicksYou.length,m.pens.kicksOpp.length); let i=0,yn=0,on=0;
  const iv=setInterval(()=>{
    if(i<m.pens.kicksYou.length){const ok=m.pens.kicksYou[i];yn+=ok;q("[data-so-you]").innerHTML+=`<span class="so ${ok?"ok":"miss"}">${ok?"●":"○"}</span>`;q("[data-so-yn]").textContent=yn;}
    if(i<m.pens.kicksOpp.length){const ok=m.pens.kicksOpp[i];on+=ok;q("[data-so-opp]").innerHTML+=`<span class="so ${ok?"ok":"miss"}">${ok?"●":"○"}</span>`;q("[data-so-on]").textContent=on;}
    i++;
    if(i>=maxK){ clearInterval(iv); feed(90,"🏁",`Shootout ${m.pens.you}–${m.pens.opp} — you ${m.pens.win?"win":"lose"}.`,m.pens.win?"goal":"red"); showContinue(m); }
  },440);
}
function showContinue(m){
  const skip=q('[data-act="skip-match"]'); if(skip)skip.style.display="none";
  const cont=q('[data-act="continue-match"]'); if(cont)cont.style.display="";
}
function skipMatch(){
  const m=S.currentMatch; if(!m)return; clearInterval(matchTimer);
  while(m._ei<m.ev.length){ applyEvent(m.ev[m._ei],m); m._ei++; }
  const ck=q("[data-clock]"); if(ck)ck.textContent="90";
  feed(90,"⏩","Skipped to full time.","");
  finishLive(m);
}
function continueMatch(){ clearInterval(matchTimer); postMatch(S.currentMatch); }

/* ---------- post-match: growth, goals→PU, progression ---------- */
// development is driven by each player's match rating (potential stays fixed)
function developSquad(){
  const out=[];
  getXI().forEach(s=>{const p=s.player,from=p.rating,gap=p.potential-p.rating,perf=p.lastMr||6.5;
    if(gap>0){
      let odds=0.03+Math.max(0,perf-7.4)*0.11+gap*0.009;
      if(p.age<=21)odds+=0.06;else if(p.age<=24)odds+=0.03;
      if(S.passives.catalyst)odds+=0.10; odds+=coachEff("growth");
      if(p.captain&&perf>=7.2)odds=Math.max(odds,0.7); // captain favoured, not guaranteed
      odds=clamp(odds,0,0.45);
      if(Math.random()<odds){const g=(perf>=9.2&&gap>=3&&Math.random()<0.18)?2:1;p.rating=Math.min(p.potential,p.rating+g);}
    }
    if(p.rating===from && perf<6.0 && !p.captain){ // poorer game → smaller, rarer drop
      if(Math.random()<clamp((6.0-perf)*0.10,0,0.45)) p.rating=Math.max(50,p.rating-1);
    }
    if(p.rating>from)out.push({name:p.name,from,to:p.rating,kind:"up",label:perf>=7.5?"impressed":"developed"});
    else if(p.rating<from)out.push({name:p.name,from,to:p.rating,kind:"down",label:"off the boil"});
  });
  S.tour.lastGrew=out.filter(o=>o.kind==="up").map(o=>o.name);
  return out;
}
function creditMatch(m){
  const win=m.result==="W",draw=m.result==="D";
  m.myXI.forEach((x,i)=>{ if(!x.ref)return;
    let g=0,a=0;
    m.ev.forEach(e=>{if(e.type==="goal"&&e.side==="you"){if(e.scorerIdx===i)g++;if(e.assistIdx===i)a++;}});
    x.ref.tG+=g; x.ref.tA+=a;
    let r=6.4+g*1.5+a*0.8+(win?0.4:draw?0:-0.35);
    const grp=POS_GROUP(x.pos);
    if(grp==="GK"||grp==="DEF"||x.pos==="CDM"){ // a clean sheet is a worldie for the back line / holding mid — rated like a goal
      r+=m.ga===0?(x.pos==="GK"?2.0:x.pos==="CB"?1.8:1.5):m.ga===1?(x.pos==="GK"?0.8:0.6):m.ga===2?-0.1:-1.0;
    }
    if(x.pos==="CM") r+=(m.ga===0?0.5:m.ga>=3?-0.3:0);
    if(x.pos==="GK") r+=(m.saves||0)*0.18;
    r=clamp(r+rnd(-0.2,0.2),4.0,10);
    x.ref.lastMr=r; x.ref.mr.sum+=r; x.ref.mr.n++;
    (x.ref.recent||(x.ref.recent=[])).push(r); if(x.ref.recent.length>3)x.ref.recent.shift(); // rolling last-3 (shown rating + hidden form)
  });
}
function applyResult(a,b,ga,gb){
  a.P++;b.P++;a.GF+=ga;a.GA+=gb;b.GF+=gb;b.GA+=ga;
  if(ga>gb){a.W++;b.L++;a.Pts+=3;}else if(ga<gb){b.W++;a.L++;b.Pts+=3;}else{a.D++;b.D++;a.Pts++;b.Pts++;}
}
function simQuick(A,B){
  const sa=(TEAM_BY_CODE[A.code]||{}).strength||74, sb=(TEAM_BY_CODE[B.code]||{}).strength||74;
  const la=clamp(1.1+Math.tanh((sa-sb)/13)*1.2,0.2,3.6), lb=clamp(1.1+Math.tanh((sb-sa)/13)*1.2,0.2,3.6);
  return {a:Math.min(5,poisson(la)),b:Math.min(5,poisson(lb))};
}
function updateGroupStandings(m){
  const t=S.tour.table, you=t.find(r=>r.you), rival=t.find(r=>r.code===m.opp.code);
  if(you&&rival) applyResult(you,rival,m.gf,m.ga);
  const others=S.tour.rivals.filter((_,i)=>i!==S.tour.roundIdx).map(rv=>t.find(r=>r.code===rv.code)).filter(Boolean);
  if(others.length===2){const s=simQuick(others[0],others[1]);applyResult(others[0],others[1],s.a,s.b);}
}
function postMatch(m){
  S.tour.history.push(m);
  creditMatch(m);
  S.tour.totalGoals+=m.gf;
  const earned=Math.floor(S.tour.totalGoals/TUNE.GOALS_PER_PU)-S.tour.puGranted;
  if(earned>0){S.tour.pendingRolls+=earned;S.tour.puGranted+=earned;}
  const dev=developSquad();
  const events=statIncidents();
  const changes=[...dev,...events];
  let groupDone=false,eliminated=false,champion=false,advance=false;
  if(m.type==="group"){
    updateGroupStandings(m);
    if(S.tour.roundIdx===2){ groupDone=true; const r=groupRank(); if(r<=2)advance=true; else {eliminated=true;S.endRound="the group stage";} }
    else advance=true;
  } else { if(m.advanced){ if(m.type==="final")champion=true; else advance=true; } else {eliminated=true;S.endRound=m.roundName;} }
  if(advance)S.tour.roundIdx++;
  if(champion||eliminated){S.tour.finished=true;S.endResult=champion?"champion":"out";}
  mountHub();
  if(champion)launchConfetti();
  const next=()=>{ if(groupDone) showGroupTable(); };
  if(changes.length) showAfterMatch(changes,next); else next();
}
/* squad-stat driven incidents (rating only — potential never moves) */
function statIncidents(){
  if(!S.stats.unlocked)return [];
  const xi=getXI(), out=[];
  const chem=statVal("chemistry"), morale=statVal("morale"), fit=statVal("fitness");
  if(chem<76 && Math.random()<0.06+(76-chem)*0.018){
    const pool=xi.slice(), two=[];
    for(let k=0;k<2&&pool.length;k++) two.push(pool.splice(ri(0,pool.length-1),1)[0]);
    two.forEach(s=>{const from=s.player.rating;s.player.rating=Math.max(40,s.player.rating-3);out.push({name:s.player.name,from,to:s.player.rating,kind:"down",label:"dressing-room clash"});});
  }
  if(morale>84 && Math.random()<0.06+(morale-84)*0.018){
    const s=pick(xi),from=s.player.rating; s.player.rating=Math.min(s.player.potential,s.player.rating+2);
    if(s.player.rating>from)out.push({name:s.player.name,from,to:s.player.rating,kind:"up",label:"on fire"});
  }
  if(fit<74 && Math.random()<(74-fit)*0.02){
    const s=pick(xi),from=s.player.rating; s.player.rating=Math.max(40,s.player.rating-2);
    out.push({name:s.player.name,from,to:s.player.rating,kind:"down",label:"picked up a knock"});
  }
  return out;
}
function showAfterMatch(changes,onClose){
  const rows=changes.map(c=>`<div class="gp-row ${c.kind}"><span class="gp-name">${c.kind==="up"?"▲":"▼"} ${shorten(c.name)} <small>${c.label}</small></span><span class="gp-delta"><b>${c.from}</b> <span class="arr">→</span> <b class="gp-to">${c.to}</b></span></div>`).join("");
  const o=showOverlay(`<div class="growth-pop"><div class="gp-ico">📋</div><div class="gp-ttl">After the Match</div><div class="gp-sub">Development &amp; dressing-room news</div><div class="gp-list">${rows}</div><button class="btn btn-primary" data-ov="ok">Continue ▶</button></div>`,"growth-ov");
  q('[data-ov="ok"]',o).addEventListener("click",()=>closeOverlay(o,onClose));
}
function showGroupTable(onClose){
  const t=S.tour.table.slice().sort((a,b)=>b.Pts-a.Pts||((b.GF-b.GA)-(a.GF-a.GA))||b.GF-a.GF);
  const rows=t.map((r,i)=>`<tr class="${r.you?"you":""} ${i<2?"adv":""}"><td class="gt-pos">${i+1}</td><td class="gt-team">${r.flag} ${r.you?"Your ELF":r.name}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}:${r.GA}</td><td class="gt-pts">${r.Pts}</td></tr>`).join("");
  const adv=groupRank()<=2;
  const o=showOverlay(`<div class="grouptable"><div class="gt-ttl">Group Standings</div>
    <table class="gt"><thead><tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF:GA</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="gt-result ${adv?"adv":"out"}">${adv?"✅ Through to the knockouts":"❌ Eliminated in the group"}</div>
    <button class="btn btn-primary" data-ov="ok">${adv?"Into the Round of 32 ▶":"See your run"}</button></div>`,"grouptable-ov");
  q('[data-ov="ok"]',o).addEventListener("click",()=>closeOverlay(o,onClose));
}

/* ---------- starting / pending power-up rolls ---------- */
function rollStartPU(){
  const id=rollPowerup();
  revealPowerup(id,()=>{ S.inventory.push(id); S.startPU=true;
    if(coachEff("bonusPU")){const ex=rollPowerup();S.inventory.push(ex);toast(`🍀 Lucky Charm: ${puDef(ex).name}`);}
    renderHubRight(); const l=q(".hub .left .pu-wrap"); if(l)q(".pu-list",l).replaceWith(el(inventoryHTML())); });
}
function rollPendingPU(){
  if(S.tour.pendingRolls<=0)return;
  const id=rollPowerup(); S.tour.pendingRolls--;
  revealPowerup(id,()=>{ S.inventory.push(id); renderHubRight(); const l=q(".hub .left .pu-wrap"); if(l)q(".pu-list",l).replaceWith(el(inventoryHTML())); });
}

/* =========================================================
   END SCREEN
   ========================================================= */
function mountEnd(){
  S.phase="end"; clearInterval(matchTimer);
  const champ=S.endResult==="champion";
  const top=Object.entries(S.tour.scorerTally).sort((a,b)=>b[1]-a[1])[0];
  const R=teamRatings(), big=S.tour.biggest;
  const seven=S.tour.history.some(m=>m.gf>=7&&m.ga===0);
  mount(`<section class="screen end ${champ?"champ":"out"}">
    <div class="end-inner">
      <div class="end-emoji">${champ?"🏆":"😞"}</div>
      <h1 class="end-title">${champ?"WORLD CHAMPIONS!":"Knocked out"}</h1>
      <p class="end-sub">${champ?(seven?"And a 7–0 in the cabinet. Legendary.":"You won the 2026 World Cup!"):`Out at ${S.endRound}.`}</p>
      <div class="statgrid">
        <div class="stat"><span class="st-v">${S.tour.totalGoals}</span><span class="st-l">Goals scored</span></div>
        <div class="stat"><span class="st-v">${R.ovr}</span><span class="st-l">Final XI rating</span></div>
        <div class="stat"><span class="st-v">${top?shorten(top[0]):"–"}</span><span class="st-l">Top scorer (${top?top[1]:0})</span></div>
        <div class="stat"><span class="st-v">${big?`${big.gf}:${big.ga}`:"–"}</span><span class="st-l">Biggest win ${big?"vs "+big.flag:""}</span></div>
      </div>
      <div class="end-pitch">${pitchHTML()}</div>
      <div class="end-actions"><button class="btn btn-primary big" data-act="restart">New run 🎲</button></div>
    </div></section>`);
}

/* =========================================================
   OVERLAYS / TOAST / CONFETTI
   ========================================================= */
function showOverlay(html,cls){const o=el(`<div class="overlay ${cls||""}"><div class="ov-card">${html}</div></div>`);document.body.appendChild(o);requestAnimationFrame(()=>o.classList.add("show"));return o;}
function closeOverlay(o,cb){o.classList.remove("show");setTimeout(()=>{o.remove();cb&&cb();},220);}
const RARITY=["","Common","Rare","Epic","Legendary"];
function revealPowerup(id,onClose){
  const d=puDef(id), tier=d.tier||1;
  const o=showOverlay(`<div class="pu-reveal lvl-${tier}">
    <div class="pur-spinner"><span class="pur-spin-ico">🎲</span></div>
    <div class="pur-card tier-${d.target} lvl-${tier}">
      <div class="pur-rarity">${RARITY[tier]}</div>
      <div class="pur-ico">${d.icon}</div>
      <div class="pur-name">${d.name}</div>
      <div class="pur-desc">${d.desc}</div>
    </div>
    <button class="btn btn-primary" data-ov="ok">Claim</button></div>`,"pu-ov");
  const card=q(".pur-card",o), okBtn=q('[data-ov="ok"]',o), spinEl=q(".pur-spin-ico",o);
  const icons=POWERUPS.map(p=>p.icon);
  let ticks=0;
  const spin=setInterval(()=>{ spinEl.textContent=icons[ri(0,icons.length-1)]; ticks++; },70);
  setTimeout(()=>{
    clearInterval(spin); spinEl.textContent=d.icon;
    o.querySelector(".pur-spinner").classList.add("done");
    card.classList.add("show"); okBtn.classList.add("show");
    if(tier>=4) launchConfetti();
  }, 950);
  okBtn.addEventListener("click",()=>closeOverlay(o,onClose));
}
let toastTimer=null;
function toast(msg){let t=document.getElementById("toast");if(!t){t=el('<div id="toast"></div>');document.body.appendChild(t);}t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}
function launchConfetti(){const c=el('<div id="confetti"></div>');document.body.appendChild(c);for(let i=0;i<90;i++){const p=el('<span class="cf"></span>');p.style.left=rnd(0,100)+"%";p.style.background=`hsl(${ri(0,360)},90%,60%)`;p.style.animationDelay=rnd(0,0.8)+"s";p.style.animationDuration=rnd(1.6,3)+"s";c.appendChild(p);}setTimeout(()=>c.remove(),3600);}

/* =========================================================
   SINGLE DELEGATED CLICK HANDLER (on #app, never replaced)
   ========================================================= */
function onClick(e){
  const t=e.target;
  const a=t.closest("[data-act]"); if(a)return handleAct(a.dataset.act);
  const f=t.closest("[data-formation]"); if(f){S.formationKey=f.dataset.formation;paintSetupSel();return;}
  const st=t.closest("[data-style]"); if(st){S.styleKey=st.dataset.style;paintSetupSel();return;}
  const sp=t.closest("[data-statpick]"); if(sp)return onStatPick(sp.dataset.statpick);
  const sr=t.closest("[data-stat-reroll]"); if(sr)return onStatReroll(sr.dataset.statReroll);
  const pk=t.closest("[data-pick]"); if(pk)return onPick(+pk.dataset.pick);
  const co=t.closest("[data-coach]"); if(co)return onPickCoach();
  const inv=t.closest("[data-inv]"); if(inv)return onUsePU(+inv.dataset.inv);
  const slot=t.closest("[data-slot]"); if(slot)return onSlot(+slot.dataset.slot);
}
function handleAct(act){
  switch(act){
    case "go-setup": mountSetup(); break;
    case "go-rogue": if(window.ROGUE)window.ROGUE.start(); else toast("Glory Road data missing"); break;
    case "go-home": S=freshState(); mountHome(); break;
    case "to-draft": mountDraft(); break;
    case "to-hub": mountHub(); break;
    case "roll-team": doRoll(false); break;
    case "reroll-team": doRoll(true); break;
    case "cancel-place": S.draft.pending=null;S.draft.candidates=[];qa(".candidate").forEach(n=>n.classList.remove("candidate"));renderRight(); break;
    case "cancel-select": exitSelect(); break;
    case "roll-stats-all": onRollStatsAll(); break;
    case "roll-startpu": rollStartPU(); break;
    case "roll-pu": rollPendingPU(); break;
    case "next-match": mountMatch(); break;
    case "skip-match": skipMatch(); break;
    case "continue-match": continueMatch(); break;
    case "restart": S=freshState(); mountHome(); break;
  }
}

/* ---------- boot ---------- */
function boot(){
  if(!buildTeams()){ app().innerHTML=`<div class="fatal">⚠️ Squad data (rosters.js) failed to load.</div>`; return; }
  S=freshState();
  app().addEventListener("click",onClick); // one listener for the whole app lifetime
  window.ELF_HOME=()=>{ S=freshState(); mountHome(); }; // mode hub re-entry for other modes
  mountHome();
}
document.addEventListener("DOMContentLoaded",boot);
})();
