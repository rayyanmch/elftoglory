/* ============================================================
   ELF '26 — GLORY ROAD (club roguelite)
   Loads after game.js. Exposes window.ROGUE.start().
   Own delegated listener using data-r / data-rslot attributes
   (never data-act / data-slot → no clashes with game.js).
   ============================================================ */
(function(){
"use strict";

/* ---------- helpers (local copies; game.js is sealed) ---------- */
const q=(s,r)=>(r||document.getElementById("app")).querySelector(s);
const qa=(s,r)=>[...(r||document.getElementById("app")).querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[ri(0,a.length-1)];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function wpick(items,wf){const ws=items.map(wf);const tot=ws.reduce((a,b)=>a+b,0);let x=Math.random()*tot;for(let i=0;i<items.length;i++){x-=ws[i];if(x<=0)return items[i];}return items[items.length-1];}
function el(h){const t=document.createElement("template");t.innerHTML=h.trim();return t.content.firstElementChild;}
const PARTS=new Set(["de","van","von","der","den","da","dos","das","di","del","della","la","le","el","bin","al","ten","ter","mac","mc","do","du","af","av","ben"]);
function surname(f){const p=f.split(/\s+/);if(p.length===1)return f;let i=p.length-1;const out=[p[i]];while(i-1>=1&&PARTS.has(p[i-1].toLowerCase().replace(/\./g,""))){i--;out.unshift(p[i]);}return out.join(" ");}
const tierOf=r=>r>=95?"legend":r>=86?"elite":r>=80?"gold":r>=72?"silver":"bronze";
let toastT=null;
function toast(m){let t=document.getElementById("toast");if(!t){t=el('<div id="toast"></div>');document.body.appendChild(t);}t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2300);}
function confetti(){const c=el('<div id="confetti"></div>');document.body.appendChild(c);for(let i=0;i<90;i++){const p=el('<span class="cf"></span>');p.style.left=rnd(0,100)+"%";p.style.background=`hsl(${ri(0,360)},90%,60%)`;p.style.animationDelay=rnd(0,.8)+"s";p.style.animationDuration=rnd(1.6,3)+"s";c.appendChild(p);}setTimeout(()=>c.remove(),3600);}
let KID=0;
function kitSVG(kit,num){
  const id="rk"+(KID++);
  const body="M38 10 L56 18 L64 18 L82 10 L108 27 L97 49 L86 42 L86 99 L34 99 L34 42 L23 49 L12 27 Z";
  const stripes=kit.pat==="stripes"?`<g clip-path="url(#${id})"><rect x="22" y="4" width="8" height="98" fill="${kit.s}"/><rect x="38" y="4" width="8" height="98" fill="${kit.s}"/><rect x="54" y="4" width="8" height="98" fill="${kit.s}"/><rect x="70" y="4" width="8" height="98" fill="${kit.s}"/></g>`:"";
  return `<svg viewBox="0 0 120 110" class="kit-svg"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs><path d="${body}" fill="${kit.p}"/>${stripes}<path d="${body}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2"/><path d="M48 13 Q60 28 72 13 L60 9 Z" fill="${kit.s}"/><text x="60" y="64" text-anchor="middle" font-size="31" font-weight="900" fill="${kit.t}" style="paint-order:stroke" stroke="rgba(0,0,0,.14)" stroke-width="1">${num}</text></svg>`;
}

/* ---------- formation / weights ---------- */
const SLOTS=[
  {pos:"GK",x:50,y:93},{pos:"LB",x:14,y:73},{pos:"CB",x:37,y:77},{pos:"CB",x:63,y:77},{pos:"RB",x:86,y:73},
  {pos:"CM",x:30,y:50},{pos:"CDM",x:50,y:60},{pos:"CM",x:70,y:50},
  {pos:"LW",x:18,y:25},{pos:"ST",x:50,y:18},{pos:"RW",x:82,y:25}];
const ACC={GK:["GK"],RB:["RB","RWB"],LB:["LB","LWB"],CB:["CB"],RWB:["RWB","RB"],LWB:["LWB","LB"],CDM:["CDM","CM"],CM:["CM","CDM","CAM"],CAM:["CAM","CM"],RM:["RM","RW"],LM:["LM","LW"],RW:["RW","RM"],LW:["LW","LM"],ST:["ST"]};
const AW={ST:1,RW:.9,LW:.9,CAM:.85,RM:.7,LM:.7,CM:.55,CDM:.3,RWB:.55,LWB:.55,RB:.40,LB:.40,CB:.1,GK:0};
const DW={GK:1,CB:.95,RB:.7,LB:.7,RWB:.55,LWB:.55,CDM:.72,CM:.46,RM:.3,LM:.3,CAM:.2,RW:.12,LW:.12,ST:.08};
const CW={CAM:1,RW:.9,LW:.9,RM:.7,LM:.7,CM:.65,CDM:.4,RWB:.65,LWB:.65,RB:.52,LB:.52,ST:.5,CB:.12,GK:.02};

/* ---------- crests → kit colours ---------- */
const CRESTS=[
  {e:"🦁",p:"#C9A227",s:"#1c1c1c",t:"#1c1c1c"},{e:"🐺",p:"#5c6672",s:"#e8edf3",t:"#10151c"},
  {e:"🦅",p:"#7a1f1f",s:"#f2e3c4",t:"#ffffff"},{e:"🐉",p:"#0f7a4d",s:"#ffd34d",t:"#ffffff"},
  {e:"🦈",p:"#0e3a5c",s:"#9fd8ff",t:"#ffffff"},{e:"⚡",p:"#ffd23f",s:"#101010",t:"#101010"},
  {e:"🔥",p:"#d7341f",s:"#ffb300",t:"#ffffff"},{e:"❄️",p:"#dff2fb",s:"#1273a8",t:"#0d3c57"},
  {e:"👑",p:"#3b2a73",s:"#e8c34a",t:"#f4e9c8"},{e:"💀",p:"#15161a",s:"#cfd6e4",t:"#e8ecf4"},
  {e:"⚓",p:"#10355e",s:"#ffffff",t:"#ffffff"},{e:"🐂",p:"#6e3d23",s:"#e8d4b8",t:"#ffe9d2"},
  {e:"🦂",p:"#2d1b3d",s:"#c98bff",t:"#ecd9ff"},{e:"🌋",p:"#4a1212",s:"#ff7a3c",t:"#ffd9c4"},
  {e:"🛡️",p:"#274156",s:"#c0d6df",t:"#e6f1f6"},{e:"⭐",p:"#0b1f4b",s:"#ffd700",t:"#ffe98a"},
  {e:"🌊",p:"#0b6e8f",s:"#bdeaf7",t:"#eafaff"},{e:"🐍",p:"#143d23",s:"#9ee493",t:"#dcffd6"}];

/* ---------- philosophy & focus (hidden numbers!) ---------- */
const PHIL={
  bus:{lab:"Park the Bus",ico:"🚌",own:0.5,opp:0.5},
  def:{lab:"Defensive",ico:"🛡️",own:0.72,opp:0.65},
  bal:{lab:"Balanced",ico:"⚖️",own:1,opp:1},
  att:{lab:"Attacking",ico:"⚔️",own:1.28,opp:1.12},
  allin:{lab:"All-In",ico:"🎰",own:1.62,opp:1.62}};
const FOCUS={wings:{lab:"Wings",ico:"⇆"},bal:{lab:"Balanced",ico:"▣"},centre:{lab:"Centre",ico:"◎"}};
/* mini-pitch dot layouts (viewBox 60×80, your goal at the BOTTOM) — signal each tactic visually */
const TAC_VIS={
  bus:[[30,71],[16,65],[44,65],[23,57],[37,57],[30,49]],
  def:[[30,69],[15,59],[45,59],[30,53],[22,46],[38,46]],
  bal:[[30,69],[16,55],[44,55],[30,47],[20,34],[40,34],[30,26]],
  att:[[30,64],[16,47],[44,47],[30,39],[20,25],[40,25],[30,16]],
  allin:[[30,57],[18,39],[42,39],[30,31],[20,17],[40,17],[30,10]],
  wings:[[10,53],[50,53],[10,35],[50,35],[30,23]],
  fbal:[[30,57],[16,43],[44,43],[30,31]],
  centre:[[30,61],[30,47],[30,33],[30,21]]};
function tacSVG(pk){
  const dots=(TAC_VIS[pk]||TAC_VIS.bal).map(d=>`<circle cx="${d[0]}" cy="${d[1]}" r="3.6"/>`).join("");
  return `<svg class="tac-pitch" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="56" height="76" rx="4" class="tp-bg"/>
    <line x1="2" y1="40" x2="58" y2="40" class="tp-ln"/><circle cx="30" cy="40" r="7" class="tp-ln tp-no"/>
    <rect x="19" y="2" width="22" height="9" class="tp-ln tp-no"/><rect x="19" y="69" width="22" height="9" class="tp-ln tp-no"/>
    <g class="tp-dots">${dots}</g></svg>`;
}

/* ---------- rewards ---------- */
const REWARDS=[
  {id:"drink",  nm:"Energy Drink",     ico:"⚡", rar:"common", type:"item",
   desc:"Boost one player by +4 for the next match."},
  {id:"youth",  nm:"Youth Camp",       ico:"🌱", rar:"common", type:"instant",
   desc:"Your youngest player trains hard: +2 rating (up to potential)."},
  {id:"master", nm:"Masterclass",      ico:"📈", rar:"common", type:"instant",
   desc:"Your 5 lowest-rated starters each gain +1 rating (up to potential)."},
  {id:"doctor", nm:"Team Doctor",      ico:"❤️", rar:"common", type:"instant",
   desc:"Restore 1 heart (max 3)."},
  {id:"extend", nm:"Captain's Armband",ico:"🖋️", rar:"rare", type:"item",
   desc:"Pick a player: +2 now and a permanent growth boost."},
  {id:"setp",   nm:"Set-Piece Coach",  ico:"🎯", rar:"rare", type:"passive",
   desc:"Permanent: your goal chances +6%."},
  {id:"iron",   nm:"Iron Defense",     ico:"🧱", rar:"rare", type:"passive",
   desc:"Permanent: opponent goal chances −6%."},
  {id:"magnet", nm:"Star Magnet",      ico:"🌟", rar:"rare", type:"passive",
   desc:"Permanent: transfer candidates come 1 rating higher."},
  {id:"gkaura", nm:"Goalkeeper Aura",  ico:"🧤", rar:"epic", type:"passive",
   desc:"Permanent: your keeper grows a halo — opponent chances −8%."},
  {id:"scout",  nm:"Scouting Network", ico:"🔭", rar:"epic", type:"passive",
   desc:"Permanent: transfer windows reveal 6 players instead of 5."},
  {id:"unlock", nm:"Potential Unlock", ico:"💎", rar:"epic", type:"item", w:0.8,
   desc:"Pick a player: +5 rating (up to potential)."}];
const RARW={common:60,rare:30,epic:10};

/* ---------- decisions (between matches) ---------- */
const DECISIONS=[
  {t:"Agent on the phone",x:"A shady agent offers an unseen young talent — sign blind?",
   o:[{l:"Sign him 🎲",f:R=>{const c=poolNear(R,(myOVR()-4),(myOVR()+5)).filter(p=>p.age<=21);if(!c.length)return "Nobody came.";const p=clone(pick(c));benchInto(p);return `${p.name} (${p.rating}, POT ${p.potential}) joined — placed for the weakest eligible spot.`;}},
     {l:"Decline",f:()=>"You hang up. Nothing happens."}]},
  {t:"Brutal training week",x:"The staff proposes a punishing drill schedule.",
   o:[{l:"Run the drills 💪",f:R=>{const xs=xi().filter(s=>s.p);const a=pick(xs).p,b=pick(xs).p;up(a,1);up(b,1);if(Math.random()<0.25){const v=pick(xs).p;v.tmp=(v.tmp||0)-3;return `${surname(a.name)} & ${surname(b.name)} +1 — but ${surname(v.name)} picked up a knock (−3 next match).`;}return `${surname(a.name)} & ${surname(b.name)} +1 rating.`;}},
     {l:"Light session",f:()=>"Fresh legs, no gains."}]},
  {t:"Media day",x:"Your best player is asked for a big interview.",
   o:[{l:"Let him talk 🎤",f:R=>{const b=best();if(Math.random()<0.5){b.tmp=(b.tmp||0)+3;return `${surname(b.name)} feels like a star: +3 next match.`;}b.tmp=(b.tmp||0)-3;return `Bad headlines… ${surname(b.name)} −3 next match.`;}},
     {l:"Shield him",f:()=>"No distractions."}]},
  {t:"Veteran free agent",x:"A 34-year-old former international offers his services.",
   o:[{l:"Sign the veteran",f:R=>{const r=ri(Math.max(74,myOVR()-1),myOVR()+3);const p={name:pick(["Mario Vidić","Claudio Ferri","Marek Sokol","Iván Beltrán","Yusuf Demir Sr."]),rating:r,base:r,potential:r+2,pos:[pick(["CB","CDM","ST"])],age:ri(33,36),club:"Free agent",mr:{sum:0,n:0},tG:0,tA:0};benchInto(p);return `${p.name} (${p.rating}) signed.`;}},
     {l:"Pass",f:()=>"You stay young."}]},
  {t:"Sponsor gift",x:"An energy-drink sponsor drops off a crate.",
   o:[{l:"Take it ⚡",f:R=>{R.items.push("drink");return "Energy Drink added to your locker.";}},
     {l:"Refuse (clean image)",f:R=>{const y=xi().filter(s=>s.p).sort((a,b)=>a.p.age-b.p.age)[0];if(y){up(y.p,1);return `${surname(y.p.name)} respects it: +1.`;}return "Respect earned.";}}]},
  {t:"Tactics seminar",x:"Send your assistant to a famous coaching seminar?",
   o:[{l:"Invest 🎓",f:R=>{if(Math.random()<0.6){R.passives.setp=true;return "He returns sharper: goal chances +6% (Set-Piece Coach).";}return "He mostly collected autographs. Nothing learned.";}},
     {l:"Save the money",f:()=>"Maybe next time."}]},
  {t:"Dressing-room music war",x:"The squad argues about the warm-up playlist.",
   o:[{l:"Let captain decide",f:R=>{const b=best();b.tmp=(b.tmp||0)+2;return `${surname(b.name)} plays his anthem: +2 next match.`;}},
     {l:"Ban music",f:R=>{const xs=xi().filter(s=>s.p);const v=pick(xs).p;v.tmp=(v.tmp||0)-2;return `Grumpy bus. ${surname(v.name)} −2 next match.`;}}]},
  {t:"Youth scout's tip",x:"Your scout begs you to watch a regional youth final.",
   o:[{l:"Go watch 🔎",f:R=>{const c=ALL.players.filter(p=>p.age<=19&&p.rating<=myOVR()+2);if(!c.length)return "Nothing special.";const p=clone(pick(c));benchInto(p);return `You found ${p.name} (${p.age}, POT ${p.potential}) and signed him on the spot!`;}},
     {l:"Stay home",f:()=>"The couch wins."}]},
  {t:"Pitch invasion drama",x:"A fan ran on the pitch last match and hugged your keeper.",
   o:[{l:"Frame the photo 😄",f:R=>{const g=xi().find(s=>s.pos==="GK");if(g&&g.p){up(g.p,1);return `${surname(g.p.name)} loves the fans: +1.`;}return "Wholesome.";}},
     {l:"Increase security",f:R=>{R.passives.iron=true;return "Tighter ship: opponent chances −6% (Iron Defense).";}}]},
  {t:"Contract rebellion",x:"Two squad players demand more minutes or they'll sulk.",
   o:[{l:"Promise minutes",f:R=>{const xs=xi().filter(s=>s.p);const a=pick(xs).p;up(a,1);return `${surname(a.name)} recommits: +1.`;}},
     {l:"Ignore them",f:R=>{if(Math.random()<0.4){const xs=xi().filter(s=>s.p);const v=pick(xs).p;v.tmp=(v.tmp||0)-3;return `${surname(v.name)} sulks: −3 next match.`;}return "They fall in line.";}}]},
  {t:"Conflicting medical advice",x:"Two physios swear by opposite recovery methods. Whose plan do you trust?",
   o:[{l:"The old-school physio",f:R=>{const a=pick(xi().filter(s=>s.p)).p;const g=Math.random()<0.5;a.tmp=(a.tmp||0)+(g?3:-3);return `${surname(a.name)} ${g?"responds well: +3":"reacts badly: −3"} next match.`;}},
     {l:"The sports-science guru",f:R=>{const a=pick(xi().filter(s=>s.p)).p;const g=Math.random()<0.5;a.tmp=(a.tmp||0)+(g?3:-3);return `${surname(a.name)} ${g?"feels sharp: +3":"feels stiff: −3"} next match.`;}}]},
  {t:"Two names on the wire",x:"Your scout shortlists two unknowns, but you can only chase one.",
   o:[{l:"The pacey winger",f:R=>{const r=ri(myOVR()-3,myOVR()+4);const p={name:pick(["Léo Mendes","Tariq Sow","Andrei Munteanu","Kwame Boateng"]),rating:r,base:r,potential:r+ri(2,8),pos:[pick(["RW","LW"])],age:ri(18,23),club:"Scouted",mr:{sum:0,n:0},tG:0,tA:0};benchInto(p);return `${p.name} (${p.rating}, POT ${p.potential}) signed.`;}},
     {l:"The towering striker",f:R=>{const r=ri(myOVR()-3,myOVR()+4);const p={name:pick(["Dragan Petrov","Malik Cissé","Hugo Bianchi","Sven Larsen"]),rating:r,base:r,potential:r+ri(2,8),pos:["ST"],age:ri(18,23),club:"Scouted",mr:{sum:0,n:0},tG:0,tA:0};benchInto(p);return `${p.name} (${p.rating}, POT ${p.potential}) signed.`;}}]},
  {t:"Who wears the armband?",x:"The grizzled veteran and the teenage prodigy both want to captain the side.",
   o:[{l:"Give it to the veteran",f:R=>{const a=(xi().filter(s=>s.p).sort((x,y)=>y.p.age-x.p.age)[0]||{}).p;if(!a)return "Nobody steps up.";const g=Math.random()<0.55;a.tmp=(a.tmp||0)+(g?2:-2);return `${surname(a.name)} ${g?"leads well: +2":"feels the weight: −2"} next match.`;}},
     {l:"Give it to the kid",f:R=>{const a=(xi().filter(s=>s.p).sort((x,y)=>x.p.age-y.p.age)[0]||{}).p;if(!a)return "Nobody steps up.";const g=Math.random()<0.55;a.tmp=(a.tmp||0)+(g?2:-2);return `${surname(a.name)} ${g?"rises to it: +2":"looks nervous: −2"} next match.`;}}]},
  {t:"Lucrative friendly abroad",x:"A sponsor dangles a big-money friendly on the other side of the world.",
   o:[{l:"Fly out and play",f:R=>{const xs=xi().filter(s=>s.p);if(Math.random()<0.5){const a=pick(xs).p;up(a,1);return `Sharp minutes — ${surname(a.name)} +1.`;}const v=pick(xs).p;v.tmp=(v.tmp||0)-2;return `Jet-lagged — ${surname(v.name)} −2 next match.`;}},
     {l:"Stay and rest",f:R=>{const xs=xi().filter(s=>s.p);if(Math.random()<0.5){const a=pick(xs).p;a.tmp=(a.tmp||0)+2;return `Fresh legs — ${surname(a.name)} +2 next match.`;}return "Rusty from the lay-off — no change.";}}]},
  {t:"A rival manager talks trash",x:"Your next opponent's coach mocks your club all over the press.",
   o:[{l:"Fire back in the press",f:R=>{const b=best();const g=Math.random()<0.5;b.tmp=(b.tmp||0)+(g?3:-2);return g?`Fired up — ${surname(b.name)} +3 next match.`:`Distracted — ${surname(b.name)} −2 next match.`;}},
     {l:"Stay classy and quiet",f:R=>{if(Math.random()<0.45){const a=pick(xi().filter(s=>s.p)).p;up(a,1);return `Calm and focused — ${surname(a.name)} +1.`;}return "You rise above it. Nothing changes.";}}]},
  {t:"Pre-match superstition",x:"The lucky charm vanished before your last win. Mess with the ritual?",
   o:[{l:"Start a new ritual",f:R=>{const a=pick(xi().filter(s=>s.p)).p;const g=Math.random()<0.5;a.tmp=(a.tmp||0)+(g?2:-2);return `${surname(a.name)} ${g?"buys in: +2":"isn't feeling it: −2"} next match.`;}},
     {l:"Carry on regardless",f:R=>{const a=pick(xi().filter(s=>s.p)).p;const g=Math.random()<0.5;a.tmp=(a.tmp||0)+(g?2:-2);return `${surname(a.name)} ${g?"stays in rhythm: +2":"feels flat: −2"} next match.`;}}]}];

/* ---------- cups ---------- */
const CUPS=[
  {id:"copper",nm:"Copper Cup",ico:"🥉",after:3,fixed:[74,76,79],minTier:3,rec:76,
   rw:"Scouting Network 🔭 + Elite transfer pick",
   rwChips:[["🔭","Scouting Network"],["⭐","Elite player pick"]],
   apply:R=>{R.passives.scout=true;}},
  {id:"silver",nm:"Silver Cup",ico:"🥈",after:3,fixed:[79,81,83],minTier:3,rec:81,
   rw:"Golden Boot 👢 (best striker +4) + Elite pick (80+)",
   rwChips:[["👢","Golden Boot — best striker +4"],["⭐","Elite pick (80+)"]],
   apply:R=>{const st=xi().filter(s=>s.p&&(s.pos==="ST"||s.pos==="RW"||s.pos==="LW")).sort((a,b)=>b.p.rating-a.p.rating)[0];if(st)up(st.p,4);}},
  {id:"euro",nm:"Europa League",ico:"🏆",after:4,fixed:[86,88,90],minTier:2,rec:88,
   rw:"European Pedigree (whole XI +1, +1 heart) + Elite pick (85+)",
   rwChips:[["📈","Whole squad +1"],["❤️","+1 Life"],["⭐","Elite pick (85+)"]],
   apply:R=>{xi().forEach(s=>s.p&&up(s.p,1));R.hearts=Math.min(3,R.hearts+1);}},
  {id:"ucl",nm:"Champions League",ico:"🌟",after:4,fixed:[89,91,93],minTier:1,rec:91,
   rw:"Galáctico pick (top-20 player!) + Potential Unlock 💎 + 1 heart",
   rwChips:[["🌌","Galáctico — a Top-20 star"],["💎","Potential Unlock"],["❤️","+1 Life"]],
   apply:R=>{R.hearts=Math.min(3,R.hearts+1);R.pendingUnlock=true;}}];
const FINAL_CUP={id:"final",nm:"THE FINAL CUP",ico:"👑",
  rw:"Immortality. Win it and your club enters legend.",
  stages:["Quarter-final — Revenge","Semi-final — WORLD ALL-STARS ★","Final — PEAK POTENTIAL XI ✦"]};

/* ---------- pool ---------- */
let ALL=null; // {clubs:[{name,short,tier,kit,players:[player],xi:[player],ovr}], players:[...]}
const WK=new Set(["Ayyoub Bouaddi","Lamine Yamal","Désiré Doué","Franco Mastantuono","Pau Cubarsí","Estêvão","Endrick","Nico Paz","Lucas Bergvall","Kobbie Mainoo","Warren Zaïre-Emery","Kenan Yıldız","Arda Güler","Jorrel Hato","Leny Yoro","Rodrigo Mora","Gilberto Mora","Myles Lewis-Skelly","Ethan Nwaneri","Senny Mayulu","Ibrahim Maza","Paul Wanner"]);
function potOf(rating,age,name){
  // big age-based ceiling for the young, gently tapered by rating (a raw 75 has more room than an 82)
  const ab=age<=16?19:age<=17?18:age<=18?17:age<=19?16:age<=20?15:age<=21?13:age<=22?11:age<=23?9:age<=24?8:age<=25?6:age<=26?5:age<=27?4:age<=28?3:2;
  const taper=Math.max(0,rating-72)*0.7, wk=WK.has(name)?2:0;
  let pot=rating+Math.round(ab-taper+wk);
  if(rating>=93)pot=Math.max(pot,99); else if(rating>=90)pot=Math.max(pot,rating+4); else if(rating>=87)pot=Math.max(pot,rating+3);
  return Math.min(99,Math.max(rating+2,pot));
}
const FREE_AGENTS=[ // in the transfer/youngster pool but NOT in any club's matchday XI (club is display-only)
  {name:"Pato Rivas",rating:79,pos:["CB","CDM"],age:19,potential:87},
  {name:"Lennart Karl",rating:78,pos:["RW","CAM"],age:17,potential:90,club:"FC Bayern München",clubShort:"FCB",league:"BUN",tier:1,kit:{p:"#dc052d",s:"#ffffff",t:"#ffffff"}},
];
function buildPool(){
  if(ALL)return true;
  const packs=[["BUN",window.CLUBS_BUN],["ESP",window.CLUBS_ESP],["FRA",window.CLUBS_FRA],["ENG",window.CLUBS_ENG]];
  if(packs.some(p=>!p[1]))return false;
  const clubs=[],players=[];
  packs.forEach(([lg,arr])=>arr.forEach(c=>{
    const ps=c.players.map(t=>({name:t[0],rating:t[1],base:t[1],pos:String(t[2]).split("/"),age:t[3],
      potential:potOf(t[1],t[3],t[0]),club:c.name,clubShort:c.short,league:lg,tier:c.tier,kit:c.kit,mr:{sum:0,n:0},tG:0,tA:0}));
    const club={name:c.name,short:c.short,tier:c.tier,kit:c.kit,league:lg,players:ps};
    club.xi=clubXI(ps); club.ovr=Math.round(club.xi.reduce((a,p)=>a+p.rating,0)/club.xi.length);
    clubs.push(club); players.push(...ps);
  }));
  FREE_AGENTS.forEach(f=>players.push({name:f.name,rating:f.rating,base:f.rating,pos:f.pos.slice(),age:f.age,
    potential:f.potential||potOf(f.rating,f.age,f.name),club:f.club||"No club",clubShort:f.clubShort||"FA",league:f.league||"FA",tier:f.tier||4,
    kit:f.kit||{p:"#262b36",s:"#d7deec",t:"#d7deec"},mr:{sum:0,n:0},recent:[],tG:0,tA:0}));
  ALL={clubs,players};
  return true;
}
function clubXI(ps){ // 1 GK + 10 best outfielders, roughly position-aware
  const gk=ps.filter(p=>p.pos[0]==="GK").sort((a,b)=>b.rating-a.rating)[0];
  const rest=ps.filter(p=>p.pos[0]!=="GK").sort((a,b)=>b.rating-a.rating).slice(0,10);
  return [...(gk?[gk]:[]),...rest];
}
function clone(p){return {...p,pos:p.pos.slice(),base:p.base,rating:p.base,mr:{sum:0,n:0},recent:[],tG:0,tA:0,tmp:0,capt:false};}

/* ---------- run state ---------- */
let R=null,L=null,wired=false;
function fresh(){return {phase:"create",club:{name:"FC Phoenix",crest:4},formation:"4-3-3",slots:SLOTS.map(s=>({pos:s.pos,x:s.x,y:s.y,p:null})),
  hearts:3,items:[],passives:{scout:false,gkaura:false,setp:false,iron:false,magnet:false},
  trophies:[],wdl:{w:0,d:0,l:0},games:0,road:[],offers:null,
  cupIdx:0,cupCounter:CUPS[0].after,cup:null,uclFinalOpp:null,glory:false,
  swapFrom:null,boostTarget:null,pendingUnlock:false,finalPending:false,finalCounter:0,totGF:0,totGA:0,phil:"bal",foc:"bal"};}
const kitOf=()=>{const c=CRESTS[R.club.crest];return {p:c.p,s:c.s,t:c.t};};
const xi=()=>R.slots;
function setFormation(key){if(!FORMATIONS[key])return;R.formation=key;R.slots=FORMATIONS[key].slots.map(s=>({pos:s.pos,x:s.x,y:s.y,p:null}));}
function formMiniSVG(key){const sl=(FORMATIONS[key]||FORMATIONS["4-3-3"]).slots;
  return `<svg class="form-mini" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="96" height="96" rx="5" class="fm-bg"/><line x1="2" y1="50" x2="98" y2="50" class="fm-ln fm-no"/><circle cx="50" cy="50" r="11" class="fm-ln fm-no"/>${sl.map(s=>`<circle cx="${s.x}" cy="${s.y}" r="5.4" class="fm-dot"/>`).join("")}</svg>`;}
const myOVR=()=>{const ps=xi().filter(s=>s.p);return ps.length?Math.round(ps.reduce((a,s)=>a+s.p.rating,0)/ps.length):0;};
function myRatings(){
  let aw=0,as=0,dw=0,ds=0,sum=0,n=0;
  xi().forEach(s=>{if(!s.p)return;const r=s.p.rating+(s.p.tmp||0);sum+=r;n++;const a=AW[s.pos]||0,d=DW[s.pos]||0;as+=r*a;aw+=a;ds+=r*d;dw+=d;});
  return {ovr:n?Math.round(sum/n):0,atk:aw?Math.round(as/aw):0,def:dw?Math.round(ds/dw):0};
}
function up(p,amt){p.rating=Math.min(p.potential,p.rating+amt);}
function best(){return xi().filter(s=>s.p).sort((a,b)=>b.p.rating-a.p.rating)[0].p;}
function poolNear(R,lo,hi){return ALL.players.filter(p=>p.rating>=lo&&p.rating<=hi);}
function benchInto(p){ // place into weakest eligible slot (replaces him)
  let worst=null;
  xi().forEach(s=>{if((ACC[s.pos]||[]).some(c=>p.pos.includes(c))){if(!s.p){if(!worst||worst.p)worst=s;}else if(!worst||(worst.p&&s.p.rating<worst.p.rating))worst=s;}});
  if(worst){worst.p=p;}
}

/* ---------- mount / events ---------- */
function mount(h){document.getElementById("app").innerHTML=h;}
function wire(){
  if(wired)return;wired=true;
  document.getElementById("app").addEventListener("click",e=>{
    const b=e.target.closest("[data-r]"); if(b){act(b.dataset.r,b.dataset.v,b);return;}
    const s=e.target.closest("[data-rslot]"); if(s){onSlot(+s.dataset.rslot);return;}
  });
  document.getElementById("app").addEventListener("input",e=>{
    if(e.target.matches("[data-rname]")&&R)R.club.name=e.target.value.slice(0,22)||"FC Phoenix";
  });
  // hovering a transfer candidate highlights the XI spots he could take
  const app=document.getElementById("app");
  app.addEventListener("mouseover",e=>{const c=e.target.closest('.tcard[data-r="tpick"]');if(c&&R&&R.rp&&R.rp.kind==="transfer")hoverFits(R.rp.cands[+c.dataset.v]);});
  app.addEventListener("mouseout",e=>{if(e.target.closest('.tcard[data-r="tpick"]'))clearFits();});
}
function hoverFits(p){clearFits();if(!p)return;xi().forEach((s,i)=>{if((ACC[s.pos]||[]).some(c=>p.pos.includes(c))){const n=q(`.slot[data-rslot="${i}"]`);if(n)n.classList.add("cand-hover");}});}
function clearFits(){qa(".cand-hover").forEach(n=>n.classList.remove("cand-hover"));}
function start(){
  if(!buildPool()){toast("Club data still loading — try again in a moment");return;}
  wire(); R=fresh(); mountCreate();
}
window.ROGUE={start};

/* ================= CREATE ================= */
function mountCreate(){
  R.phase="create";
  const crests=CRESTS.map((c,i)=>`<button class="crest ${R.club.crest===i?"on":""}" data-r="crest" data-v="${i}" style="--cp:${c.p};--cs:${c.s}"><span>${c.e}</span></button>`).join("");
  const forms=Object.keys(FORMATIONS).map(k=>`<button class="fbtn ${R.formation===k?"on":""}" data-r="formation" data-v="${k}">${FORMATIONS[k].label}</button>`).join("");
  mount(`<section class="screen rg-create">
    <header class="topbar"><div class="brand sm"><span class="brand-elf">GLORY</span><span class="brand-26">ROAD</span></div>
      <button class="btn ghost tiny" data-r="exit">⌂ Menu</button></header>
    <div class="rgc-body">
      <div class="rgc-left">
        <h2 class="sec-h">Found your club</h2>
        <label class="rgc-lab">Club name</label>
        <input class="rgc-input" data-rname maxlength="22" value="${R.club.name}" />
        <label class="rgc-lab">Crest — sets your kit</label>
        <div class="crest-grid">${crests}</div>
        <label class="rgc-lab">Formation — your squad is built to fit it</label>
        <div class="form-row">${forms}</div>
        <button class="btn btn-primary big" data-r="found">Found the club ▶</button>
        <p class="hint">You start with a band of nobodies. Win matches to sign stars — survive the road.</p>
      </div>
      <div class="rgc-right">
        <div class="rgc-preview">
          <div class="rgc-crest">${CRESTS[R.club.crest].e}</div>
          <div class="rgc-kit">${kitSVG(kitOf(),10)}</div>
          <div class="rgc-name">${R.club.name}</div>
          <div class="rgc-form">${formMiniSVG(R.formation)}<span class="rgc-form-lab">${R.formation}</span></div>
        </div>
      </div>
    </div></section>`);
}
function paintCreate(){
  qa(".crest").forEach((n,i)=>n.classList.toggle("on",+n.dataset.v===R.club.crest));
  qa(".fbtn").forEach(n=>n.classList.toggle("on",n.dataset.v===R.formation));
  const pv=q(".rgc-preview");
  if(pv)pv.innerHTML=`<div class="rgc-crest">${CRESTS[R.club.crest].e}</div><div class="rgc-kit">${kitSVG(kitOf(),10)}</div><div class="rgc-name">${R.club.name}</div><div class="rgc-form">${formMiniSVG(R.formation)}<span class="rgc-form-lab">${R.formation}</span></div>`;
}

/* ================= START SQUAD SPIN ================= */
function buildStartSquad(){
  const taken=new Set();
  xi().forEach(s=>{
    const cands=ALL.players.filter(p=>!taken.has(p.name)&&p.rating<=74&&(ACC[s.pos]||[]).some(c=>p.pos.includes(c)));
    const pl=cands.length?wpick(cands,p=>p.rating<=71?3:1):null;
    if(pl){taken.add(pl.name);s.p=clone(pl);}
  });
  // every founder gets ONE young star to build around (78-84, age<=20, fits the formation) — random, unmarked
  const stars=ALL.players.filter(p=>p.rating>=78&&p.rating<=84&&p.age<=20&&!taken.has(p.name)&&xi().some(s=>(ACC[s.pos]||[]).some(c=>p.pos.includes(c))));
  if(stars.length){
    const star=pick(stars),fit=xi().filter(s=>(ACC[s.pos]||[]).some(c=>star.pos.includes(c)));
    const slot=fit.sort((a,b)=>(a.p?a.p.rating:0)-(b.p?b.p.rating:0))[0];
    if(slot){taken.add(star.name);slot.p=clone(star);}
  }
}
function mountSpin(){
  R.phase="spin"; buildStartSquad();
  mount(`<section class="screen rg-spin">
    <div class="rgs-inner">
      <div class="rgs-head">${CRESTS[R.club.crest].e} <b>${R.club.name}</b> — your founding XI</div>
      <div class="rgs-grid">${xi().map((s,i)=>`<div class="rgs-card" data-i="${i}"><div class="rgs-pos">${s.pos}</div><div class="rgs-q">?</div></div>`).join("")}</div>
      <button class="btn btn-primary big" data-r="to-hub" style="visibility:hidden">Begin the road ▶</button>
    </div></section>`);
  xi().forEach((s,i)=>setTimeout(()=>{
    const c=q(`.rgs-card[data-i="${i}"]`); if(!c||!s.p)return;
    c.classList.add("flip");
    c.innerHTML=`<div class="rgs-pos">${s.pos}</div><div class="rgs-kitwrap">${kitSVG(kitOf(),s.p.rating)}</div><div class="rgs-nm">${surname(s.p.name)}</div><div class="rgs-pot">POT ${s.p.potential}</div>`;
    if(i===10){const b=q('[data-r="to-hub"]');if(b)b.style.visibility="visible";}
  },350+i*260));
}

/* ================= HUB ================= */
function headerHTML(){
  return `<header class="topbar rg-top">
    <div class="rg-id"><span class="rg-crest">${CRESTS[R.club.crest].e}</span><b>${R.club.name}</b></div>
    <div class="rg-troph">${R.trophies.join(" ")}</div>
    <div class="rg-meta"><span class="rg-rec">${R.wdl.w}W ${R.wdl.d}D ${R.wdl.l}L</span>
      <button class="btn ghost tiny" data-r="exit">⌂</button></div>
  </header>`;
}
function heartsHTML(){
  const h=Math.max(0,Math.min(3,R.hearts));
  return `<div class="hearts-box"><span class="hb-lab">LIVES</span>
    <div class="hb-row">${'<span class="hb-h full">❤</span>'.repeat(h)}${'<span class="hb-h dead">♡</span>'.repeat(3-h)}</div></div>`;
}
function boostPromptHTML(){
  if(R.boostTarget==null)return "";
  const m={unlock:["💎","Potential Unlock","Tap a player → +5 rating (up to potential)."],
           extend:["🖋️","Captain's Armband","Tap a player → make him captain (+2 & growth)."],
           drink:["⚡","Energy Drink","Tap a player → boost him +4 for the next match."]};
  const a=m[R.boostTarget]||["✨","Action ready","Tap a player to use it."];
  return `<div class="boost-prompt"><span class="bp-ico">${a[0]}</span><span class="bp-tx"><b>${a[1]}</b><small>${a[2]}</small></span></div>`;
}
function ratingsHTML(){
  const RT=myRatings();
  return `<div class="ratings"><div class="rt big"><span class="rt-v">${RT.ovr}</span><span class="rt-l">Overall</span></div>
    <div class="rt atk"><span class="rt-v">${RT.atk}</span><span class="rt-l">Attack</span></div>
    <div class="rt def"><span class="rt-v">${RT.def}</span><span class="rt-l">Defence</span></div>
    <div class="rt meta"><span class="rt-tag">4-3-3</span><span class="rt-tag">Game ${R.games+1}</span></div></div>`;
}
function jerseyHTML(s,i){
  if(!s.p)return `<div class="jersey empty"><span class="emptypos">${s.pos}</span><span class="emptyplus">+</span></div>`;
  const p=s.p,t=tierOf(p.rating);
  const cur=clamp((p.rating-50)/49,0,1)*100,pot=clamp((p.potential-50)/49,0,1)*100;
  const rec=p.recent||[],ravg=rec.length?rec.reduce((a,b)=>a+b,0)/rec.length:0;
  const mr=rec.length?`<span class="jmr ${ravg>=8?"hi":ravg>=7?"mid":ravg>=6?"ok":"low"}" title="Avg rating, last ${rec.length} match${rec.length>1?"es":""}">${ravg.toFixed(1)}</span>`:"";
  const ga=(p.tG||p.tA)?`<div class="jga">${p.tG?`<span class="ga-g">⚽${p.tG}</span>`:""}${p.tA?`<span class="ga-a">👟${p.tA}</span>`:""}</div>`:"";
  const boost=p.tmp?`<span class="rg-boost ${p.tmp>0?"up":"dn"}">${p.tmp>0?"+":""}${p.tmp}</span>`:"";
  return `<div class="jersey tier-${t}" title="${p.name} · ex ${p.clubShort||p.club}">
    <div class="kit ${t}">${kitSVG(kitOf(),p.rating)}${p.capt?'<span class="armband">C</span>':""}<span class="kit-pos">${s.pos}</span>${mr}${boost}</div>
    <div class="jname">${surname(p.name)}</div>
    <div class="jbar"><i class="pot" style="width:${pot}%"></i><i class="cur" style="width:${cur}%"></i></div>
    <div class="jpot">POT ${p.potential}</div>${ga}</div>`;
}
function pitchHTML(){
  return `<div class="pitch"><div class="pitch-lines"><span class="cc"></span><span class="hl"></span><span class="box t"></span><span class="box b"></span></div>
    ${xi().map((s,i)=>`<div class="slot ${R.swapFrom===i?"swap-from":""}" style="left:${s.x}%;top:${s.y}%" data-rslot="${i}">${jerseyHTML(s,i)}</div>`).join("")}</div>`;
}
function passivesHTML(){
  const P=R.passives,rows=[];
  if(P.scout)rows.push("🔭 Scouting Network");
  if(P.gkaura)rows.push("🧤 Goalkeeper Aura");
  if(P.setp)rows.push("🎯 Set-Piece Coach");
  if(P.iron)rows.push("🧱 Iron Defense");
  if(P.magnet)rows.push("🌟 Star Magnet");
  const items=R.items.map((id,ix)=>{const d=REWARDS.find(r=>r.id===id);return `<button class="pu" data-r="use-item" data-v="${ix}"><span class="pu-ico">${d.ico}</span><span class="pu-tx"><span class="pu-name">${d.nm}</span><span class="pu-desc">${d.desc}</span></span></button>`;}).join("");
  return `<div class="pu-wrap"><div class="pu-head">Club upgrades</div>
    ${rows.length?`<div class="rg-passives">${rows.map(r=>`<span class="rg-pass">${r}</span>`).join("")}</div>`:`<div class="pu-list empty">No permanent upgrades yet</div>`}
    <div class="pu-head" style="margin-top:.6rem">Items</div>
    ${items?`<div class="pu-list">${items}</div>`:`<div class="pu-list empty">Empty locker</div>`}</div>`;
}
function roadmapHTML(){
  const past=R.road.slice(-7);
  const dots=past.map(d=>`<span class="rdot done ${d.r==="W"?"w":d.r==="D"?"d":"l"} ${d.c?"cup":""}" title="${d.tt}">${d.c?d.ico:""}</span>`).join("");
  let fut="";
  if(R.cup){ // inside a cup: show remaining stages
    const left=["QF","SF","F"].slice(R.cup.stage);
    fut=left.map((s,j)=>`<span class="rdot fut cup" title="${R.cup.def.nm} ${s}">${R.cup.def.ico}</span>`).join("");
  } else {
    for(let j=1;j<=6;j++){
      const isCup=j===R.cupCounter&&R.cupIdx<CUPS.length;
      fut+=`<span class="rdot fut ${isCup?"cup":""}" title="${isCup?CUPS[R.cupIdx].nm+" invitation":"League match"}">${isCup?CUPS[R.cupIdx].ico:""}</span>`;
    }
  }
  return `<div class="roadmap"><span class="rd-lab">ROAD</span>${dots}<span class="rdot now"></span>${fut}<span class="rd-inf">∞</span></div>`;
}
function genOffers(){
  const mo=myOVR();
  const g=R.games; // progressive: forgiving onboarding, then the league heats up as you establish
  // forgiving onboarding, then a gently rising floor so the easy pick stops being a free win as you establish
  const band=g<4?[-4,-2,0]:g<9?[-3,-1,2]:g<16?[-1,1,4]:[0,2,5];
  const offs=band.map(off=>{
    let pool=ALL.clubs.filter(c=>R.games<5?c.tier>=3:true);
    pool=pool.filter(c=>!(R.offers||[]).some(o=>o&&o.name===c.name));
    pool.sort((a,b)=>Math.abs(a.ovr-(mo+off))-Math.abs(b.ovr-(mo+off)));
    const top=pool.slice(0,5);
    return top.length?pick(top):pick(ALL.clubs);
  });
  // dedupe
  for(let i=1;i<offs.length;i++)while(offs.slice(0,i).some(o=>o.name===offs[i].name))offs[i]=pick(ALL.clubs.filter(c=>(R.games<5?c.tier>=3:true)));
  R.offers=offs;
}
function rightHTML(){
  if(R.signing)return signingHTML();
  if(R.rp&&R.rp.kind==="transfer")return transferPanelHTML();
  if(R.rp&&R.rp.kind==="reward")return rewardPanelHTML();
  if(R.cup)return cupNextHTML();
  return offersHTML();
}
function tcardHTML(p,attrs){
  return `<button class="tcard tt-${tierOf(p.rating)}" ${attrs}>
    <span class="tc-back">?</span>
    <span class="tc-face"><b class="tc-rat ${tierOf(p.rating)}">${p.rating}</b><span class="tc-nm">${surname(p.name)}</span>
    <span class="tc-pos">${p.pos.join("/")}</span><span class="tc-meta">${p.age}y · POT ${p.potential}</span><span class="tc-club">${p.clubShort||p.club||""}</span></span>
  </button>`;
}
function transferPanelHTML(){
  const rp=R.rp;
  return `<div class="off-wrap twpanel"><div class="pu-head">${rp.ttl}</div>
    <div class="tw-sub">Interested in ${R.club.name}${rp.beaten&&rp.beaten.name?` · beat ${rp.beaten.name}`:""}</div>
    <div class="tw-grid side">${rp.cands.map((p,i)=>tcardHTML(p,`data-r="tpick" data-v="${i}" disabled`)).join("")}</div>
    <button class="btn ghost twskip" data-r="tskip" style="display:none">Skip window</button></div>`;
}
function signingHTML(){
  const p=R.signing.p;
  return `<div class="off-wrap signing"><div class="pu-head">✍️ New signing</div>
    <div class="tw-grid side">${tcardHTML(p,'disabled').replace('class="tcard"','class="tcard revealed signing-card"')}</div>
    <div class="hint">Tap a <b>highlighted</b> spot in your XI to slot <b>${surname(p.name)}</b> in.</div></div>`;
}
function rewardPanelHTML(){
  const rp=R.rp;
  return `<div class="off-wrap rwpanel"><div class="pu-head">Choose your reward</div>
    <div class="rw-grid side">${rp.opts.map((r,i)=>`<button class="rwcard ${r.rar}" data-r="rpick" data-v="${i}">
      <span class="rw-rar">${r.rar}</span><span class="rw-ico">${r.ico}</span><b class="rw-nm">${r.nm}</b><span class="rw-desc">${r.desc}</span></button>`).join("")}</div></div>`;
}
function offersHTML(){
  if(!R.offers)genOffers();
  const cards=R.offers.map((c,i)=>{
    const diff=c.ovr-myOVR();
    const tag=diff<=-2?'<span class="off-tag easy">favoured</span>':diff<=0?'<span class="off-tag easy">even</span>':diff<=2?'<span class="off-tag mid">tough</span>':'<span class="off-tag hard">💎 risky</span>';
    return `<button class="off-card" data-r="play" data-v="${i}">
      <div class="off-kit">${kitSVG(c.kit,c.ovr)}</div>
      <div class="off-nm">${c.name}</div>
      <div class="off-sub">${c.league} · ${"★".repeat(5-c.tier)}</div>
      ${tag}<span class="off-go">Kick off ▶</span></button>`;}).join("");
  return `<div class="off-wrap"><div class="pu-head">Choose your next opponent</div><div class="off-grid">${cards}</div>
    <div class="hint">Win → a transfer window opens + pick 1 of 3 rewards. Lose → 💔.</div></div>`;
}
function cupNextHTML(){
  const c=R.cup,stg=["Quarter-final","Semi-final","FINAL"][c.stage];
  const opp=c.opp;
  return `<div class="off-wrap cupmode"><div class="pu-head">${c.def.ico} ${c.def.nm} — ${stg}</div>
    <button class="off-card cup" data-r="cup-play">
      <div class="off-kit">${kitSVG(opp.kit,opp.ovr)}</div>
      <div class="off-nm">${opp.name}</div>
      <div class="off-sub">${opp.special?"":opp.league+" · "}${"★".repeat(Math.max(1,5-(opp.tier||1)))}</div>
      <span class="off-go">Play ${stg} ▶</span></button>
    <div class="hint">Cup defeat ends the cup and costs 💔 — the prize: ${c.def.rw}</div></div>`;
}
function historyHTML(){
  if(!R.road.length)return "";
  const rows=R.road.slice(-9).reverse().map(d=>`<div class="gh-row ${d.r==='W'?'w':d.r==='D'?'d':'l'}"><span class="gh-res">${d.r}</span><span class="gh-sc">${d.gf}–${d.ga}</span><span class="gh-opp">${d.c?d.ico+' ':''}${d.opp}</span></div>`).join("");
  return `<div class="pu-wrap gh-wrap"><div class="pu-head">Match history</div><div class="gh-list">${rows}</div></div>`;
}
function mountHub(){
  R.phase="hub";
  mount(`<section class="screen rg-hub">${headerHTML()}
    <div class="play-grid three">
      <div class="left">${heartsHTML()}${boostPromptHTML()}${passivesHTML()}${historyHTML()}</div>
      <div class="center">${ratingsHTML()}${pitchHTML()}<div class="hint">Click a player, then a team-mate to swap. Items target a player after activation.</div></div>
      <div class="right">${rightHTML()}</div>
    </div>
    ${roadmapHTML()}</section>`);
  if(R.signing)R.signing.fits.forEach(i=>{const n=q(`.slot[data-rslot="${i}"]`);if(n)n.classList.add("candidate");});
  else if(R.boostTarget!=null)xi().forEach((s,i)=>{if(s.p){const n=q(`.slot[data-rslot="${i}"]`);if(n)n.classList.add("targetable");}});
  maybeInvite();
}
function refreshHub(){if(R.phase==="hub")mountHub();}
function flashSlot(i){const n=q(`.slot[data-rslot="${i}"] .kit`);if(n)n.classList.add("boostflash");}
function markSwap(i){qa(".slot.swap-from").forEach(n=>n.classList.remove("swap-from"));if(i!=null){const n=q(`.slot[data-rslot="${i}"]`);if(n)n.classList.add("swap-from");}}
function repaintSlot(i){const n=q(`.slot[data-rslot="${i}"]`);if(n)n.innerHTML=jerseyHTML(xi()[i],i);}
function onSlot(i){
  if(R.phase!=="hub")return;
  if(R.rp)return; // choosing a transfer/reward card — ignore XI swaps
  const s=xi()[i];
  if(R.boostTarget!=null){ // applying a targeted item/reward
    if(!s.p)return;
    applyTarget(R.boostTarget,s.p); R.boostTarget=null; refreshHub(); flashSlot(i); return;
  }
  // SWAP — done surgically (highlight / repaint only the affected jerseys + ratings), never a full hub re-render (that "reload" flash)
  if(R.swapFrom==null){ if(s.p){R.swapFrom=i; markSwap(i);} return; }     // pick the first player
  if(R.swapFrom===i){ R.swapFrom=null; markSwap(null); return; }          // tap him again → deselect
  const from=R.swapFrom, a=xi()[from], b=s;
  const can=(p,pos)=>(ACC[pos]||[]).some(c=>p.pos.includes(c));
  let did=false;
  if(b.p&&can(a.p,b.pos)&&can(b.p,a.pos)){const t=a.p;a.p=b.p;b.p=t;did=true;}   // swap two players (each must be able to play the other's slot)
  else if(!b.p&&can(a.p,b.pos)){b.p=a.p;a.p=null;did=true;}                       // move into an empty slot
  R.swapFrom=null; markSwap(null);
  if(did){repaintSlot(from);repaintSlot(i);const rt=q(".ratings");if(rt)rt.outerHTML=ratingsHTML();}
  else toast("Those positions don't fit");
}

/* ================= CUPS ================= */
function maybeInvite(){
  if(R.cup||R.signing||R.boostTarget!=null||R.rp)return;
  if(document.querySelector(".rg-ov"))return; // never stack over an open overlay
  if(R.finalPending&&R.finalCounter<=0){showFinalInvite();return;}
  if(R.cupIdx<CUPS.length&&R.cupCounter<=0)showInvite(CUPS[R.cupIdx],R.cupDeclined||false);
}
function assembledXI(target){ // a side of REAL stars at ~the target rating; for high targets they play up toward their potential
  const used=new Set(),out=[];
  const eff=p=>Math.min(p.potential,Math.max(p.rating,target)); // a real player fielding up to the station level, capped by his ceiling
  SLOTS.forEach(s=>{
    const elig=ALL.players.filter(p=>!used.has(p.name)&&(ACC[s.pos]||[]).some(c=>p.pos.includes(c)));
    let best=null,bd=1e9,br=0;
    elig.forEach(p=>{const r=eff(p),d=Math.abs(r-target);if(d<bd||(d===bd&&r>br)){bd=d;br=r;best=p;}});
    if(best){used.add(best.name);out.push({name:best.name,sur:surname(best.name),rating:eff(best),pos:s.pos});}
  });
  return out;
}
function cupOpp(def,stageIdx){
  const V=def.fixed[stageIdx];                       // FIXED station strength — NO scaling to the player
  let pool=ALL.clubs;
  if(def.id==="copper")pool=ALL.clubs.filter(c=>c.tier>=3);          // lower-league clubs only
  if(def.id==="silver")pool=ALL.clubs.filter(c=>c.tier===2||c.tier===3);
  if(def.id==="euro")pool=ALL.clubs.filter(c=>c.tier<=2);
  if(def.id==="ucl")pool=ALL.clubs.filter(c=>c.tier===1);
  const faced=new Set((R.cup&&R.cup.faced)||[]); const unfaced=pool.filter(c=>!faced.has(c.name)); if(unfaced.length)pool=unfaced;
  // station strength above any real club this cup can field → assemble a real-star side AT that fixed rating (CL = galácticos)
  const maxOvr=Math.max.apply(null,pool.map(c=>c.ovr));
  if(V>maxOvr){
    const xs=assembledXI(V);
    if(xs.length===11)return {name:def.id==="ucl"?"GALÁCTICOS XI ★":"ALL-STARS ✦",kit:{p:"#0b1020",s:"#ffd700",t:"#ffd700"},ovr:Math.round(xs.reduce((a,p)=>a+p.rating,0)/11),tier:1,league:"World",special:true,xi:xs};
  }
  const near=pool.slice().sort((a,b)=>Math.abs(a.ovr-V)-Math.abs(b.ovr-V)).slice(0,6);
  return pick(near);
}
function showInvite(def,redo){
  const myo=myOVR(),rec=Math.max(def.rec||0,myo+1),gap=rec-myo;
  const ready=gap<=0?'<span class="ci-ready ok">you look ready</span>':gap<=3?'<span class="ci-ready mid">a real stretch</span>':'<span class="ci-ready hard">big underdog</span>';
  const chips=(def.rwChips||[]).map(c=>`<span class="rw-chip"><span class="rwc-i">${c[0]}</span>${c[1]}</span>`).join("");
  const o=overlay(`<div class="cup-invite">
    <div class="ci-ico">${def.ico}</div><div class="ci-ttl">${def.nm}</div>
    <div class="ci-sub">Official invitation${redo?" (again)":""} — Quarter-final → Semi-final → Final</div>
    <div class="ci-rec">Recommended squad OVR <b>~${rec}</b> · yours: <b>${myo}</b> · ${ready}</div>
    <div class="ci-prize"><span class="ci-prize-lab">🏆 Champion's prize</span><div class="rw-chips">${chips}</div></div>
    <div class="ci-btns"><button class="btn btn-primary" data-o="acc">Accept ${def.ico}</button>
    <button class="btn ghost" data-o="dec">Decline (returns in ${def.after})</button></div></div>`);
  o.querySelector('[data-o="acc"]').onclick=()=>{close(o,()=>{R.cupDeclined=false;R.cup={def,stage:0,opp:cupOpp(def,0)};refreshHub();});};
  o.querySelector('[data-o="dec"]').onclick=()=>{close(o,()=>{R.cupDeclined=true;R.cupCounter=def.after;refreshHub();});};
}
function showFinalInvite(){
  const o=overlay(`<div class="cup-invite final">
    <div class="ci-ico">👑</div><div class="ci-ttl">THE FINAL CUP</div>
    <div class="ci-sub">You conquered the Champions League — the ultimate gauntlet awaits.</div>
    <div class="ci-rw">${FINAL_CUP.stages.map(s=>`<div>• ${s}</div>`).join("")}</div>
    <div class="ci-btns"><button class="btn btn-gold" data-o="acc">Face your destiny 👑</button>
    <button class="btn ghost" data-o="dec">Not yet (returns in 3)</button></div></div>`);
  o.querySelector('[data-o="acc"]').onclick=()=>{close(o,()=>{
    R.finalPending=false;R.cup={def:{id:"final",nm:FINAL_CUP.nm,ico:"👑",rw:FINAL_CUP.rw},stage:0,opp:finalOpp(0)};mountHub();});};
  o.querySelector('[data-o="dec"]').onclick=()=>{close(o,()=>{R.finalPending=true;R.finalCounter=3;refreshHub();});};
}
function allStarXI(byPotential){
  const used=new Set(),out=[];
  SLOTS.forEach(s=>{
    const cands=ALL.players.filter(p=>!used.has(p.name)&&(ACC[s.pos]||[]).some(c=>p.pos.includes(c)))
      .sort((a,b)=>byPotential?(b.potential-a.potential):(b.rating-a.rating));
    const p=cands[0]; if(p){used.add(p.name);out.push({name:p.name,sur:surname(p.name),rating:byPotential?p.potential:p.rating,pos:s.pos});}
  });
  return out;
}
function eliteXI(){ // a varied galáctico side (random among each slot's top real options) — strong, below the absolute All-Stars
  const used=new Set(),out=[];
  SLOTS.forEach(s=>{
    const cands=ALL.players.filter(p=>!used.has(p.name)&&(ACC[s.pos]||[]).some(c=>p.pos.includes(c))).sort((a,b)=>b.rating-a.rating).slice(0,3);
    const p=pick(cands)||cands[0]; if(p){used.add(p.name);out.push({name:p.name,sur:surname(p.name),rating:p.rating,pos:s.pos});}
  });
  return out;
}
function finalOpp(stage){
  if(stage===0){const c=R.uclFinalOpp||pick(ALL.clubs.filter(x=>x.tier===1));return {name:c.name+" (Revenge)",kit:c.kit,ovr:c.ovr+1,tier:1,league:c.league,xi:c.xi.map(p=>({name:p.name,sur:surname(p.name),rating:p.rating,pos:p.pos[0]})),special:false};}
  if(stage===1){const xs=allStarXI(false);return {name:"WORLD ALL-STARS ★",kit:{p:"#101418",s:"#ffd700",t:"#ffd700"},ovr:Math.round(xs.reduce((a,p)=>a+p.rating,0)/11),tier:1,special:true,xi:xs};}
  const xs=allStarXI(true);return {name:"PEAK POTENTIAL XI ✦",kit:{p:"#1c0f33",s:"#c98bff",t:"#e9d9ff"},ovr:Math.round(xs.reduce((a,p)=>a+p.rating,0)/11),tier:1,special:true,xi:xs};
}

/* ================= LIVE MATCH ================= */
function oppXIof(opp){return opp.special?opp.xi:(opp.xi[0].sur?opp.xi:opp.xi.map(p=>({name:p.name,sur:surname(p.name),rating:p.rating,pos:p.pos[0]})));}
function matchPitchHTML(arr,who,kit){
  const di=who==="you"?"mi":"oi";
  return `<div class="ms-pitch ${who}"><div class="pitch-lines"><span class="cc"></span><span class="hl"></span><span class="box t"></span><span class="box b"></span></div>
    ${arr.map((p,i)=>`<div class="mxj tier-${tierOf(p.rating)}" data-${di}="${i}" style="left:${p.x}%;top:${p.y}%">
      <div class="mxj-kit">${kitSVG(kit,p.rating)}</div><span class="mxj-nm">${p.sur}</span><span class="mx-ico"></span></div>`).join("")}</div>`;
}
// HIDDEN form: a player's last-3 match ratings nudge how he performs next game (hot → more likely to do things, cold → less). Never shown.
function formOf(p){
  const rec=p&&p.recent||[]; if(rec.length<2)return {adj:0,mul:1};
  const d=rec.reduce((a,b)=>a+b,0)/rec.length-6.8;
  return {adj:clamp(d*0.55,-1.6,2.2), mul:clamp(1+d*0.14,0.6,1.7)};
}
function startMatch(opp,ctx){
  R.phase="match";
  const mine=xi().filter(s=>s.p).map(s=>{const f=formOf(s.p);return {name:s.p.name,sur:surname(s.p.name),rating:s.p.rating+(s.p.tmp||0),pos:s.pos,x:s.x,y:s.y,ref:s.p,fAdj:f.adj,fMul:f.mul};});
  const ox=oppXIof(opp);
  let oAtk=(()=>{let w=0,v=0;ox.forEach(p=>{const a=AW[p.pos]||0;v+=p.rating*a;w+=a;});return v/w;})();
  let oDef=(()=>{let w=0,v=0;ox.forEach(p=>{const d=DW[p.pos]||0;v+=p.rating*d;w+=d;});return v/w;})();
  const oAvg=ox.reduce((a,p)=>a+p.rating,0)/Math.max(1,ox.length);
  oAtk+=standoutBonus(ox,AW,oAvg); oDef+=standoutBonus(ox,DW,oAvg);
  const wAvg=(arr,W)=>{let w=0,v=0;arr.forEach(p=>{const x=W[p.pos]||0;v+=p.rating*x;w+=x;});return v/Math.max(.1,w);};
  const myAvg=mine.reduce((a,p)=>a+p.rating,0)/Math.max(1,mine.length);
  const myOvr=Math.round(myAvg),myAtkR=Math.round(wAvg(mine,AW)+standoutBonus(mine,AW,myAvg)),myDefR=Math.round(wAvg(mine,DW)+standoutBonus(mine,DW,myAvg));
  const oOvr=opp.ovr||Math.round(oAvg);
  L={opp,ctx,mine,ox,oAtk,oDef,min:0,gf:0,ga:0,phil:R.phil||"bal",foc:R.foc||"bal",ev:[],offMine:new Set(),offOpp:new Set(),
     aiNote:false,timer:null,saves:0,done:false};
  mount(`<section class="screen match rg-match">
    <div class="mclockbar"><div class="mround">${ctx.label}</div><div class="mclock"><span data-clock>0</span>'</div>
      <div class="mround" style="visibility:hidden">${ctx.label}</div></div>
    <div class="rg-controls">
      <div class="ctl-grp"><span class="ctl-lab">Philosophy</span><div class="ctl-row">${Object.keys(PHIL).map(k=>`<button class="ctl tac ${k===L.phil?"on":""} ph-${k}" data-r="phil" data-v="${k}">${tacSVG(k)}<span class="ctl-cap">${PHIL[k].ico} ${PHIL[k].lab}</span></button>`).join("")}</div></div>
      <div class="ctl-grp"><span class="ctl-lab">Focus</span><div class="ctl-row">${Object.keys(FOCUS).map(k=>`<button class="ctl tac ${k===L.foc?"on":""}" data-r="foc" data-v="${k}">${tacSVG(k==="bal"?"fbal":k)}<span class="ctl-cap">${FOCUS[k].ico} ${FOCUS[k].lab}</span></button>`).join("")}</div></div>
    </div>
    <div class="mgrid">
      <div class="mside you"><div class="ms-head"><div class="ms-flag">${CRESTS[R.club.crest].e}</div><div class="ms-nm-wrap"><div class="ms-name">${R.club.name}</div><div class="ms-stats">OVR <b>${myOvr}</b> · <span class="st-a">ATK ${myAtkR}</span> · <span class="st-d">DEF ${myDefR}</span></div></div><div class="ms-score" data-gf>0</div></div>
        <div class="ms-scorers" data-sc-you></div>
        ${matchPitchHTML(mine,"you",kitOf())}</div>
      <div class="mmid"><div class="mshoot" data-shoot></div><div class="mfeed" data-feed></div></div>
      <div class="mside opp"><div class="ms-head"><div class="ms-flag">${opp.special?"✦":"🏟️"}</div><div class="ms-nm-wrap"><div class="ms-name">${opp.name}</div><div class="ms-stats">OVR <b>${oOvr}</b> · <span class="st-a">ATK ${Math.round(oAtk)}</span> · <span class="st-d">DEF ${Math.round(oDef)}</span></div></div><div class="ms-score" data-ga>0</div></div>
        <div class="ms-scorers" data-sc-opp></div>
        ${matchPitchHTML(autoXYopp(ox),"opp",opp.kit)}</div>
    </div>
    <div class="mbar"><button class="btn ghost" data-r="skip">Skip ⏩</button>
      <div class="mlive"><span class="livedot"></span> LIVE — coach from the bench!</div>
      <button class="btn btn-primary" data-r="cont" style="display:none">Continue ▶</button></div>
  </section>`);
  feed(1,"🟢",`Kick-off! ${R.club.name} vs ${opp.name}.`);
  L.timer=setInterval(tick,244);
}
function myEff(){
  let aw=0,as=0,dw=0,ds=0;
  const eff=p=>p.rating+(p.fAdj||0);                  // hidden form baked into the effective rating (display stays form-less)
  const on=[];
  L.mine.forEach((p,i)=>{if(L.offMine.has(i))return;const r=eff(p),a=AW[p.pos]||0,d=DW[p.pos]||0;as+=r*a;aw+=a;ds+=r*d;dw+=d;on.push({pos:p.pos,rating:r});});
  let atk=as/Math.max(.1,aw),def=ds/Math.max(.1,dw);
  // a standout who outshines the squad lifts attack / shores up defence
  const avg=on.reduce((s,p)=>s+p.rating,0)/Math.max(1,on.length);
  atk+=standoutBonus(on,AW,avg); def+=standoutBonus(on,DW,avg);
  // focus asymmetry bonus (hidden)
  const g=grp=>{const v=on.filter(p=>grp.includes(p.pos));return v.length?v.reduce((a,p)=>a+p.rating,0)/v.length:0;};
  const wAtt=g(["LW","RW","LM","RM","LB","RB","LWB","RWB"]),cAtt=g(["ST","CAM","CM"]);
  const wDef=g(["LB","RB","LWB","RWB"]),cDef=g(["CB","CDM"]);
  if(L.foc==="wings"){atk+=clamp(wAtt-cAtt,-6,6)*0.9;def+=clamp(wDef-cDef,-6,6)*0.9;}
  else if(L.foc==="centre"){atk+=clamp(cAtt-wAtt,-6,6)*0.9;def+=clamp(cDef-wDef,-6,6)*0.9;}
  return {atk,def};
}
function pPerMin(){
  const e=myEff();
  let lamY=clamp(1.6+(e.atk-L.oDef)*0.20,0.15,5.5)/90;
  let lamO=clamp(1.6+(L.oAtk-e.def)*0.20,0.12,5.0)/90;
  const ph=PHIL[L.phil]; lamY*=ph.own; lamO*=ph.opp;
  if(R.passives.setp)lamY*=1.06;
  if(R.passives.iron)lamO*=0.94;
  if(R.passives.gkaura)lamO*=0.92;
  // simple opponent AI late-game
  if(L.min>=70&&L.ga<L.gf){lamO*=1.25;lamY*=1.1;if(!L.aiNote){L.aiNote=true;feed(L.min,"📣",`${L.opp.name} throw everything forward!`,"opp");}}
  if(L.min>=80&&L.ga>L.gf){lamO*=0.7;lamY*=0.85;if(!L.aiNote){L.aiNote=true;feed(L.min,"🧊",`${L.opp.name} park the bus.`,"opp");}}
  return {lamY,lamO};
}
function scorerIdx(arr,off,wf){const c=arr.map((_,i)=>i).filter(i=>arr[i].pos!=="GK"&&!off.has(i));return c.length?wpick(c,i=>wf(arr[i])):-1;}
function focusW(p,base){
  let w=Math.pow(base[p.pos]||0.05,1.5)*Math.pow(p.rating+(p.fAdj||0),2.0);
  const wide=["LW","RW","LM","RM","LB","RB","LWB","RWB"].includes(p.pos);
  if(L.foc==="wings"&&wide)w*=1.8;
  if(L.foc==="centre"&&!wide&&p.pos!=="GK")w*=1.6;
  return w*(p.fMul||1); // hidden form: in-form players get the ball / chances more
}
function markIco(side,idx,kind){
  const cell=q(`.mside.${side} [data-${side==="you"?"mi":"oi"}="${idx}"] .mx-ico`); if(!cell)return;
  if(kind==="goal"){const c=(+cell.dataset.g||0)+1;cell.dataset.g=c;cell.textContent=c>1?`⚽×${c}`:"⚽";cell.classList.add("hasgoal");}
  else if(!cell.dataset.g){cell.textContent="👟";cell.classList.add("hasassist");}
}
function goal(side){
  const arr=side==="you"?L.mine:L.ox,off=side==="you"?L.offMine:L.offOpp;
  const si=scorerIdx(arr,off,p=>focusW(p,AW)); if(si<0)return;
  const pen=Math.random()<0.11; let ai=-1;
  if(!pen&&Math.random()<0.72){const c=arr.map((_,i)=>i).filter(i=>i!==si&&arr[i].pos!=="GK"&&!off.has(i));if(c.length)ai=wpick(c,i=>Math.pow(CW[arr[i].pos]||0.05,1.2)*Math.pow(arr[i].rating+(arr[i].fAdj||0),1.6)*(arr[i].fMul||1));}
  if(side==="you"){L.gf++;bump("[data-gf]",L.gf);}else{L.ga++;bump("[data-ga]",L.ga);}
  L.ev.push({min:L.min,side,si,ai,pen});
  const chip=q(side==="you"?"[data-sc-you]":"[data-sc-opp]");
  if(chip)chip.insertAdjacentHTML("beforeend",`<span class="sc-chip">⚽ ${arr[si].sur} <b>${L.min}'</b></span>`);
  markIco(side,si,"goal"); if(ai>=0)markIco(side,ai,"assist");
  const as=ai>=0?` <span class="assist">— assist ${arr[ai].sur}</span>`:"";
  feed(L.min,"⚽",side==="you"?`<b>GOAL!</b> ${arr[si].name}${as}${pen?" (pen)":""}. ${L.gf}–${L.ga}`:`${L.opp.name}: ${arr[si].name}${pen?" (pen)":""}. ${L.gf}–${L.ga}`,side==="you"?"goal":"opp goal");
}
function tick(){
  L.min++;
  const ck=q("[data-clock]");if(ck)ck.textContent=L.min;
  const {lamY,lamO}=pPerMin();
  if(Math.random()<lamY)goal("you");
  if(Math.random()<lamO)goal("opp");
  if(Math.random()<0.017){const side=Math.random()<0.5?"you":"opp";const arr=side==="you"?L.mine:L.ox;feed(L.min,"🟨",`Yellow — ${pick(arr).name}.`);}
  if(Math.random()<0.0011){const side=Math.random()<0.5?"you":"opp";const arr=side==="you"?L.mine:L.ox,off=side==="you"?L.offMine:L.offOpp;
    const c=arr.map((_,i)=>i).filter(i=>arr[i].pos!=="GK"&&!off.has(i));
    if(c.length){const i=pick(c);off.add(i);feed(L.min,"🟥",`<b>RED CARD!</b> ${arr[i].name} is off!`,"red");}}
  if(Math.random()<0.012){L.saves++;feed(L.min,"🧤",`Big save by ${(L.mine.find(p=>p.pos==="GK")||{name:"the keeper"}).name}!`,"save");}
  if(L.min>=90){clearInterval(L.timer);fullTime();}
}
function feed(min,ico,txt,cls){const f=q("[data-feed]");if(f)f.prepend(el(`<div class="feed-row ${cls||""}"><span class="fmin">${min}'</span><span class="ficon">${ico}</span><span class="ftxt">${txt}</span></div>`));}
function bump(sel,v){const n=q(sel);if(!n)return;n.textContent=v;n.classList.remove("flash");void n.offsetWidth;n.classList.add("flash");}
function fullTime(){
  if(L.done)return;L.done=true;
  const ck=q("[data-clock]");if(ck)ck.textContent="90";
  const lv=q(".mlive");if(lv){lv.classList.add("ft");lv.innerHTML="FULL TIME";}
  if(L.ctx.ko&&L.gf===L.ga)return shootout();
  showCont();
}
function shootout(){
  feed(90,"🥅","<b>Penalties decide it!</b>");
  const e=myEff();const pMe=clamp(0.74+(e.atk+e.def-L.oAtk-L.oDef)*0.004,0.5,0.92),pOp=clamp(0.72,0.5,0.9);
  const ky=[],ko=[];let sy=0,so=0;
  for(let i=0;i<5;i++){ky.push(Math.random()<pMe?1:0);ko.push(Math.random()<pOp?1:0);}
  sy=ky.reduce((a,b)=>a+b,0);so=ko.reduce((a,b)=>a+b,0);
  while(sy===so&&ky.length<11){const a=Math.random()<pMe?1:0,b=Math.random()<pOp?1:0;ky.push(a);ko.push(b);sy+=a;so+=b;}
  if(sy===so){if(Math.random()<pMe)sy++;else so++;}
  L.pens={you:sy,opp:so,win:sy>so};
  const w=q("[data-shoot]");
  if(w){w.innerHTML=`<div class="shootout"><div class="so-ttl">Penalty Shootout</div>
    <div class="so-row"><span class="so-lab">YOU</span><span class="so-dots">${ky.map(k=>`<span class="so ${k?"ok":"miss"}">${k?"●":"○"}</span>`).join("")}</span><b class="so-n">${sy}</b></div>
    <div class="so-row"><span class="so-lab">${L.opp.name.slice(0,14)}</span><span class="so-dots">${ko.map(k=>`<span class="so ${k?"ok":"miss"}">${k?"●":"○"}</span>`).join("")}</span><b class="so-n">${so}</b></div></div>`;}
  feed(90,"🏁",`Shootout ${sy}–${so} — you ${L.pens.win?"WIN":"lose"}.`,L.pens.win?"goal":"red");
  showCont();
}
function showCont(){const s=q('[data-r="skip"]');if(s)s.style.display="none";const c=q('[data-r="cont"]');if(c)c.style.display="";}
function skip(){
  if(!L||L.done)return;clearInterval(L.timer);
  while(L.min<90)
    {L.min++;const {lamY,lamO}=pPerMin();if(Math.random()<lamY)goal("you");if(Math.random()<lamO)goal("opp");}
  const ck=q("[data-clock]");if(ck)ck.textContent="90";
  feed(90,"⏩","Skipped to full time.");
  fullTime();
}

/* ================= POST MATCH ================= */
function creditAndDevelop(win,draw){
  const changes=[];
  L.mine.forEach((p,i)=>{
    let g=0,a=0;L.ev.forEach(e=>{if(e.side==="you"){if(e.si===i)g++;if(e.ai===i)a++;}});
    const ref=p.ref; ref.tG+=g; ref.tA+=a;
    let r=6.4+g*1.5+a*0.8+(win?0.4:draw?0:-0.35);
    const back=["GK","CB","RB","LB","RWB","LWB"].includes(p.pos);
    if(back||p.pos==="CDM"){ // a clean sheet is a worldie for the back line / holding mid — rated like a goal
      r+=L.ga===0?(p.pos==="GK"?2.0:p.pos==="CB"?1.8:1.5):L.ga===1?(p.pos==="GK"?0.8:0.6):L.ga===2?-0.1:-1.0;
    }
    if(p.pos==="CM")r+=(L.ga===0?0.5:L.ga>=3?-0.3:0); // central mids share some defensive credit
    if(p.pos==="GK")r+=L.saves*0.18;                  // keepers also rewarded for saves
    r=clamp(r+rnd(-0.2,0.2),4.0,10);
    ref.lastMr=r; ref.mr.sum+=r; ref.mr.n++;
    (ref.recent||(ref.recent=[])).push(r); if(ref.recent.length>3)ref.recent.shift(); // rolling last-3 (the shown rating + hidden form)
    // development (rating only; potential fixed)
    const from=ref.rating,gap=ref.potential-ref.rating,perf=r;
    if(gap>0){
      let odds=0.03+Math.max(0,perf-7.4)*0.11+gap*0.009;
      if(ref.age<=21)odds+=0.06;else if(ref.age<=24)odds+=0.03;
      if(ref.capt&&perf>=7.2)odds=Math.max(odds,0.7);
      if(ref.growthBoost)odds+=0.15;
      odds=clamp(odds,0,0.45);
      if(Math.random()<odds){const inc=(perf>=9.2&&gap>=3&&Math.random()<0.18)?2:1;ref.rating=Math.min(ref.potential,ref.rating+inc);}
    }
    if(ref.rating===from&&perf<6&&!ref.capt&&Math.random()<clamp((6-perf)*0.10,0,0.45))ref.rating=Math.max(50,ref.rating-1);
    if(ref.rating>from)changes.push({n:ref.name,f:from,t:ref.rating,k:"up",l:perf>=7.5?"impressed":"developed"});
    else if(ref.rating<from)changes.push({n:ref.name,f:from,t:ref.rating,k:"down",l:"off the boil"});
    ref.tmp=0; // boosts expire
  });
  return changes;
}
function finishMatch(){
  clearInterval(L.timer);
  const win=L.pens?L.pens.win:L.gf>L.ga, draw=!L.pens&&L.gf===L.ga;
  const changes=creditAndDevelop(win,draw);
  R.games++; R.totGF+=L.gf; R.totGA+=L.ga;
  const ctx=L.ctx;
  const roadIcon=ctx.cup?ctx.cup.def.ico:"";
  R.road.push({r:win?"W":draw?"D":"L",c:!!ctx.cup,ico:roadIcon,gf:L.gf,ga:L.ga,opp:L.opp.name,lab:ctx.label,tt:`${ctx.label}: ${L.gf}–${L.ga} vs ${L.opp.name}`});
  if(win)R.wdl.w++;else if(draw)R.wdl.d++;else R.wdl.l++;
  if(!ctx.cup){R.cupCounter--; if(R.finalPending)R.finalCounter--;}
  const after=()=>{maybeDecision(()=>{R.offers=null;mountHub();});};
  if(ctx.cup){ // ----- cup flow -----
    if(win){
      if(ctx.cup.stage<2){
        const beaten=L.opp;
        R.cup.faced=(R.cup.faced||[]).concat(beaten.name);
        R.cup.stage++;
        R.cup.opp=R.cup.def.id==="final"?finalOpp(R.cup.stage):cupOpp(R.cup.def,R.cup.stage);
        growthPopup(changes,()=>transferWindow(beaten,{count:R.passives.scout?6:5,margin:L.gf-L.ga},()=>{R.offers=null;mountHub();}));
      } else { // CUP WON
        const def=R.cup.def, beaten=L.opp;
        if(def.id==="ucl"){R.uclFinalOpp=ALL.clubs.find(c=>c.name===beaten.name)||null;}
        R.cup=null;
        if(def.id==="final"){R.glory=true;R.trophies.push("👑");growthPopup(changes,()=>glory());return;}
        R.trophies.push(def.ico);
        if(def.apply)def.apply(R);
        R.cupIdx=Math.min(R.cupIdx+1,CUPS.length);
        R.cupCounter=R.cupIdx<CUPS.length?CUPS[R.cupIdx].after:9999;
        const eliteMin=def.id==="copper"?Math.max(82,myOVR()):def.id==="silver"?Math.max(80,myOVR()+3):def.id==="euro"?Math.max(85,myOVR()+3):0;
        growthPopup(changes,()=>cupWonOverlay(def,()=>{
          const opts=def.id==="ucl"?{top20:true,count:R.passives.scout?6:5}
            :def.id==="copper"?{eliteMin,eliteCap:85,lucky:[86,89],luckyProb:0.05,count:R.passives.scout?6:5} // Copper: a good ~84-85 player regularly, an elite (86-89) only on a rare lucky window
            :{eliteMin,count:R.passives.scout?6:5};
          transferWindow(beaten,opts,()=>{
            const finish=()=>{R.offers=null;if(def.id==="ucl")showFinalInvite();else mountHub();};
            if(R.pendingUnlock){R.pendingUnlock=false;R.items.push("unlock");toast("💎 Potential Unlock added to your Items");}
            finish();
          });
        }));
      }
    } else { // cup defeat
      const def=R.cup.def; R.cup=null; R.hearts--;
      R.cupCounter=def.id==="final"?CUPS[CUPS.length-1].after:def.after;
      if(def.id==="final")R.cupIdx=CUPS.length; // can re-earn via UCL again? keep: final returns only via UCL win
      growthPopup(changes,()=>{
        if(R.hearts<=0)return gameOver();
        toast(`💔 Knocked out of the ${def.nm}`);after();
      });
    }
    return;
  }
  // ----- league flow -----
  if(win){
    growthPopup(changes,()=>transferWindow(L.opp,{count:R.passives.scout?6:5,margin:L.gf-L.ga},()=>rewardOverlay(after,L.gf-L.ga)));
  } else if(draw){
    growthPopup(changes,after);
  } else {
    R.hearts--;
    growthPopup(changes,()=>{ if(R.hearts<=0)return gameOver(); toast("💔 Defeat — "+R.hearts+(R.hearts===1?" heart":" hearts")+" left"); after(); });
  }
}
function growthPopup(changes,cb){
  if(!changes.length)return cb();
  const rows=changes.map(c=>`<div class="gp-row ${c.k}"><span class="gp-name">${c.k==="up"?"▲":"▼"} ${surname(c.n)} <small>${c.l}</small></span><span class="gp-delta"><b>${c.f}</b> <span class="arr">→</span> <b class="gp-to">${c.t}</b></span></div>`).join("");
  const o=overlay(`<div class="growth-pop"><div class="gp-ico">📋</div><div class="gp-ttl">After the Match</div><div class="gp-list">${rows}</div><button class="btn btn-primary" data-o="ok">Continue ▶</button></div>`);
  o.querySelector('[data-o="ok"]').onclick=()=>close(o,cb);
}
function cupWonOverlay(def,cb){
  confetti();
  const chips=(def.rwChips||[]).map(c=>`<span class="rw-chip"><span class="rwc-i">${c[0]}</span>${c[1]}</span>`).join("");
  const o=overlay(`<div class="cup-invite won"><div class="ci-ico">${def.ico}</div><div class="ci-ttl">${def.nm} CHAMPIONS!</div>
    <div class="ci-prize"><span class="ci-prize-lab">Your prize</span><div class="rw-chips">${chips}</div></div>
    <button class="btn btn-gold" data-o="ok">Claim the prize ▶</button></div>`);
  o.querySelector('[data-o="ok"]').onclick=()=>close(o,cb);
}

/* ================= TRANSFER WINDOW ================= */
function transferCandidates(beaten,opts){
  const n=opts.count||5, out=[], used=new Set(xi().filter(s=>s.p).map(s=>s.p.name));
  const myo=myOVR(), mag=R.passives.magnet?1:0;
  const free=()=>ALL.players.filter(p=>!used.has(p.name));
  const add=p=>{if(p){out.push(p);used.add(p.name);}};
  // ---- up to 3 from the beaten club: best by rating, best by potential, then a good one at another position ----
  const bc=ALL.clubs.find(c=>c.name===((beaten&&beaten.name)||"").replace(" (Revenge)",""));
  if(bc){
    let av=bc.players.filter(p=>!used.has(p.name));
    // 3 GOOD players from the beaten club — always from its top 5 by rating/potential, weighted toward the best but not always the #1
    const wtop=key=>{const pool=av.slice().sort((a,b)=>((b[key]||b.rating)-(a[key]||a.rating))).slice(0,5);if(!pool.length)return null;const mn=Math.min.apply(null,pool.map(p=>p[key]||p.rating));return wpick(pool,x=>(x[key]||x.rating)-mn+1);};
    const grab=p=>{if(p){add(p);av=av.filter(x=>x.name!==p.name);}};
    grab(wtop("rating"));        // a top-5 by rating (not always the #1)
    grab(wtop("potential"));     // a top-5 by potential
    const taken=new Set(out.map(p=>p.pos[0]));
    const good=av.slice().sort((a,b)=>Math.max(b.rating,b.potential||0)-Math.max(a.rating,a.potential||0)).slice(0,5);
    const diff=good.filter(p=>!taken.has(p.pos[0])), pool3=diff.length?diff:good;
    if(pool3.length){const mn=Math.min.apply(null,pool3.map(p=>p.rating));grab(wpick(pool3,x=>x.rating-mn+1));} // another good one, ideally a different position
  }
  // ---- remaining slots ----
  if(opts.top20){ // galáctico cup window
    let pool=free().sort((a,b)=>b.rating-a.rating).slice(0,20); const posN={};pool.forEach(p=>{const k=p.pos[0];posN[k]=(posN[k]||0)+1;});
    while(out.length<n&&pool.length){add(wpick(pool,x=>1/Math.sqrt(posN[x.pos[0]]||1)));pool=pool.filter(x=>!used.has(x.name));}
  } else if(opts.eliteMin){ // cup elite window — optional ceiling (eliteCap) + a rare "lucky" higher band (used by Copper)
    const cap=opts.eliteCap||999, lk=opts.lucky, lp=opts.luckyProb||0; let guard=0;
    while(out.length<n&&guard++<40){
      let lo=opts.eliteMin, hi=cap;
      if(lk&&Math.random()<lp){lo=lk[0];hi=lk[1];}
      let band=free().filter(p=>p.rating>=lo&&p.rating<=hi);
      if(!band.length)band=free().filter(p=>p.rating>=opts.eliteMin);
      if(!band.length)band=free(); if(!band.length)break;
      const posN={};band.forEach(p=>{const k=p.pos[0];posN[k]=(posN[k]||0)+1;});
      add(wpick(band,x=>(x.rating>=myo+2?2:1)/Math.sqrt(posN[x.pos[0]]||1)));
    }
  } else { // NORMAL league window — pool reaches a bit ABOVE your level early (so you can build up), then tightens late so strong players stay rare (anti-snowball)
    const head=myo<=77?1:myo<=83?0:-1;             // how far above your OVR the everyday pool reaches: early +1 → mid 0 → late -1
    const nLo=Math.max(56,myo-9)+mag, nHi=Math.max(nLo,myo+head+mag);
    const gemLo=myo+head+mag, gemHi=myo+head+2+mag; // the rare strong pick reaches a touch higher still (early ~myo+3, late ~myo+1)
    let guard=0;
    while(out.length<n&&guard++<40){
      const gem=Math.random()<0.10;
      let band=free().filter(p=>p.rating>=(gem?gemLo:nLo)&&p.rating<=(gem?gemHi:nHi));
      if(!band.length)band=free().filter(p=>p.rating>=nLo&&p.rating<=nHi);
      if(!band.length)band=free(); if(!band.length)break;
      const posN={};band.forEach(p=>{const k=p.pos[0];posN[k]=(posN[k]||0)+1;});
      // good players late come via POTENTIAL, not flat ratings → weight young high-upside prospects (sub-OVR now, grow later) up
      add(wpick(band,x=>{const gap=Math.max(0,(x.potential||x.rating)-x.rating),youth=x.age<=20?1:x.age<=23?0.6:x.age<=26?0.25:0;return (1+gap*youth*0.5)/Math.sqrt(posN[x.pos[0]]||1);}));
    }
  }
  return out.sort(()=>Math.random()-0.5);
}
function transferWindow(beaten,opts,cb){
  const cands=transferCandidates(beaten,opts);
  const ttl=opts.top20?"GALÁCTICO WINDOW":opts.eliteMin?"ELITE TRANSFER WINDOW":"Transfer window";
  R.rp={kind:"transfer",cands,ttl,beaten,cb};
  R.phase="hub"; mountHub();
  cands.forEach((p,i)=>setTimeout(()=>{
    if(!R.rp||R.rp.kind!=="transfer")return;
    const c=q(`.tcard[data-v="${i}"]`);if(!c)return;
    c.classList.add("revealed");c.disabled=false;
    if(i===cands.length-1){const s=q('[data-r="tskip"]');if(s)s.style.display="";}
  },400+i*700));
}
function placeSigning(p,cb){
  R.phase="hub";R.offers=null;
  const fits=xi().map((s,i)=>((ACC[s.pos]||[]).some(c=>p.pos.includes(c))?i:-1)).filter(i=>i>=0);
  if(!fits.length){R.signing=null;mountHub();toast("No position fits — signing cancelled");return cb&&cb();}
  R.signing={p,fits,cb};   // set BEFORE mountHub so the right panel shows the new player
  mountHub();              // mountHub highlights R.signing.fits as .candidate
  toast(`✍️ ${surname(p.name)} signed — tap a highlighted spot`);
}
function trySign(i){
  if(!R.signing)return false;
  if(!R.signing.fits.includes(i))return true; // swallow click while signing
  const old=xi()[i].p; xi()[i].p=R.signing.p;
  toast(old?`${surname(R.signing.p.name)} replaces ${surname(old.name)}`:`${surname(R.signing.p.name)} slots in`);
  const cb=R.signing.cb; R.signing=null; if(cb)cb(); else refreshHub();
  return true;
}

/* ================= REWARDS ================= */
function rollRewards(margin){
  const m=Math.min(4,Math.max(0,(margin||1)-1)); // a bigger win tilts the odds toward rare/epic
  const lux=r=>r.rar==="epic"?(1+m*0.18):r.rar==="rare"?(1+m*0.10):1;
  const avail=REWARDS.filter(r=>!(r.type==="passive"&&R.passives[r.id==="setp"?"setp":r.id]));
  const out=[];
  while(out.length<3){
    const r=wpick(avail,x=>RARW[x.rar]*(x.w||1)*lux(x));
    if(!out.includes(r))out.push(r);
  }
  return out;
}
function rewardOverlay(cb,margin){
  R.rp={kind:"reward",opts:rollRewards(margin),cb};
  R.phase="hub"; mountHub();
}
function applyReward(r){
  switch(r.id){
    case "drink":R.items.push("drink");toast("⚡ Energy Drink stored");break;
    case "youth":{const y=xi().filter(s=>s.p).sort((a,b)=>a.p.age-b.p.age)[0];if(y){up(y.p,2);toast(`🌱 ${surname(y.p.name)} +2`);}break;}
    case "master":{const low=xi().filter(s=>s.p).sort((a,b)=>a.p.rating-b.p.rating).slice(0,5);low.forEach(s=>up(s.p,1));toast("📈 Your 5 weakest starters +1");break;}
    case "doctor":R.hearts=Math.min(3,R.hearts+1);toast("❤️ Heart restored");break;
    case "extend":R.items.push("extend");toast("🖋️ Captain's Armband stored — use it from Items");break;
    case "setp":R.passives.setp=true;toast("🎯 Set-Piece Coach hired");break;
    case "iron":R.passives.iron=true;toast("🧱 Iron Defense installed");break;
    case "magnet":R.passives.magnet=true;toast("🌟 Star Magnet active");break;
    case "gkaura":R.passives.gkaura=true;toast("🧤 Goalkeeper Aura glows");break;
    case "scout":R.passives.scout=true;toast("🔭 Scouting Network online");break;
    case "unlock":R.items.push("unlock");toast("💎 Potential Unlock stored — use it from Items");break;
  }
}
function applyTarget(kind,p){
  if(kind==="unlock"){const f=p.rating;p.rating=Math.min(p.potential,p.rating+5);toast(`💎 ${surname(p.name)} ${f} → ${p.rating}`);}
  if(kind==="extend"){xi().forEach(s=>{if(s.p)s.p.capt=false;});p.capt=true;up(p,2);p.growthBoost=true;toast(`🖋️ ${surname(p.name)} is your captain`);}
  if(kind==="drink"){p.tmp=(p.tmp||0)+4;toast(`⚡ ${surname(p.name)} +4 next match`);}
}

/* ================= DECISIONS ================= */
function maybeDecision(cb){
  if(Math.random()>=0.5)return cb();
  const d=pick(DECISIONS);
  const o=overlay(`<div class="decision"><div class="dc-ttl">${d.t}</div><div class="dc-x">${d.x}</div>
    <div class="dc-btns">${d.o.map((op,i)=>`<button class="btn dc-opt" data-i="${i}">${op.l}</button>`).join("")}</div></div>`,true);
  o.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{
    const res=d.o[+b.dataset.i].f(R)||"Done.";
    close(o,()=>{toast(res);cb();});
  });
}

/* ================= END SCREENS ================= */
function runStats(){
  let topS=null,best=null;xi().forEach(s=>{if(s.p){if(!topS||s.p.tG>topS.tG)topS=s.p;if(!best||s.p.rating>best.rating)best=s.p;}});
  const gp=R.wdl.w+R.wdl.d+R.wdl.l;
  return {games:R.games,w:R.wdl.w,d:R.wdl.d,l:R.wdl.l,ovr:myOVR(),troph:R.trophies.join(" ")||"—",cups:R.trophies.length,
    top:topS,best:best,gf:R.totGF,ga:R.totGA,winPct:gp?Math.round(R.wdl.w/gp*100):0};
}
function statGridHTML(st,gamesLabel){
  return `<div class="statgrid">
    <div class="stat"><span class="st-v">${st.w}-${st.d}-${st.l}</span><span class="st-l">Record (W-D-L)</span></div>
    <div class="stat"><span class="st-v">${st.winPct}%</span><span class="st-l">Win rate</span></div>
    <div class="stat"><span class="st-v">${st.games}</span><span class="st-l">${gamesLabel}</span></div>
    <div class="stat"><span class="st-v">${st.ovr}</span><span class="st-l">Final squad OVR</span></div>
    <div class="stat"><span class="st-v">${st.best?surname(st.best.name)+" "+st.best.rating:"—"}</span><span class="st-l">Best player</span></div>
    <div class="stat"><span class="st-v">${st.top&&st.top.tG?surname(st.top.name)+" ("+st.top.tG+")":"—"}</span><span class="st-l">Top scorer</span></div>
    <div class="stat"><span class="st-v">${st.gf}–${st.ga}</span><span class="st-l">Goals (for–against)</span></div>
    <div class="stat"><span class="st-v">${st.troph}</span><span class="st-l">Trophies (${st.cups})</span></div>
  </div>`;
}
function gameOver(){
  R.phase="over";const st=runStats();
  mount(`<section class="screen end out"><div class="end-inner">
    <div class="end-emoji">💔</div><h1 class="end-title">THE ROAD ENDS</h1>
    <p class="end-sub">${R.club.name} ran out of hearts after ${st.games} matches.</p>
    ${statGridHTML(st,"Matches survived")}
    <div class="end-actions"><button class="btn btn-primary big" data-r="retry">New club 🎲</button>
    <button class="btn ghost" data-r="exit">⌂ Menu</button></div></div></section>`);
}
function glory(){
  R.phase="glory";R.glorySeen=true;confetti();const st=runStats();
  mount(`<section class="screen end champ"><div class="end-inner">
    <div class="end-emoji">👑</div><h1 class="end-title">IMMORTAL</h1>
    <p class="end-sub">${R.club.name} beat the PEAK POTENTIAL XI. Nothing above remains.</p>
    ${statGridHTML(st,"Matches on the road")}
    <div class="end-actions"><button class="btn btn-gold big" data-r="endless">Keep playing ∞</button>
    <button class="btn btn-primary" data-r="retry">New club 🎲</button>
    <button class="btn ghost" data-r="exit">⌂ Menu</button></div></div></section>`);
}

/* ================= overlay helpers ================= */
function overlay(html,wide){
  const o=el(`<div class="overlay show rg-ov"><div class="ov-card ${wide?"wide":""}">${html}</div></div>`);
  document.body.appendChild(o);return o;
}
function close(o,cb){o.classList.remove("show");setTimeout(()=>{o.remove();cb&&cb();},200);}

/* ================= dispatcher ================= */
function act(r,v,btn){
  // a reward/item was activated → you MUST spend it on a player before doing anything else
  if(R&&R.boostTarget!=null&&["play","cup-play","cup-acc","use-item","tpick","tskip","rpick"].includes(r)){
    toast("✨ Use your active reward first — tap a player to apply it");return;}
  switch(r){
    case "exit":if(L&&L.timer)clearInterval(L.timer);L=null;if(window.ELF_HOME)window.ELF_HOME();break;
    case "crest":R.club.crest=+v;paintCreate();break;
    case "formation":setFormation(v);paintCreate();break;
    case "found":mountSpin();break;
    case "to-hub":mountHub();break;
    case "retry":R=fresh();mountCreate();break;
    case "endless":R.cupIdx=CUPS.length-1;R.cupCounter=CUPS[CUPS.length-1].after;R.cup=null;R.offers=null;mountHub();break;
    case "play":{const opp=R.offers[+v];startMatch({name:opp.name,kit:opp.kit,ovr:opp.ovr,tier:opp.tier,league:opp.league,xi:opp.xi},{label:"League match",ko:false,cup:null});break;}
    case "cup-play":{const c=R.cup;startMatch(c.opp,{label:`${c.def.nm} · ${["Quarter-final","Semi-final","FINAL"][c.stage]}`,ko:true,cup:c});break;}
    case "phil":if(L&&!L.done){L.phil=v;R.phil=v;qa('[data-r="phil"]').forEach(b=>b.classList.toggle("on",b.dataset.v===v));feed(L.min||1,PHIL[v].ico,`Coach call: <b>${PHIL[v].lab}</b>.`);}break;
    case "foc":if(L&&!L.done){L.foc=v;R.foc=v;qa('[data-r="foc"]').forEach(b=>b.classList.toggle("on",b.dataset.v===v));feed(L.min||1,FOCUS[v].ico,`Focus: <b>${FOCUS[v].lab}</b>.`);}break;
    case "skip":skip();break;
    case "cont":finishMatch();break;
    case "use-item":{const ix=+v,id=R.items[ix];if(id==="drink"||id==="extend"||id==="unlock"){R.items.splice(ix,1);R.boostTarget=id;const m={drink:"⚡ Tap a player to boost +4 next match",extend:"🖋️ Tap a player to make him captain",unlock:"💎 Tap a player for +5 rating (up to potential)"};toast(m[id]);refreshHub();}break;}
    case "tpick":{const rp=R.rp;if(!rp||rp.kind!=="transfer")break;if(btn&&btn.disabled)break;const p=rp.cands[+v];const cb=rp.cb;R.rp=null;placeSigning(clone(p),cb);break;}
    case "tskip":{const rp=R.rp;if(!rp||rp.kind!=="transfer")break;const cb=rp.cb;R.rp=null;if(cb)cb();else refreshHub();break;}
    case "rpick":{const rp=R.rp;if(!rp||rp.kind!=="reward")break;const r=rp.opts[+v];const cb=rp.cb;R.rp=null;applyReward(r);if(cb)cb();else refreshHub();break;}
  }
}
/* signing placement intercepts slot clicks */
const _onSlot=onSlot;
onSlot=function(i){ if(R&&R.signing){trySign(i);return;} _onSlot(i); };

/* TEMP debug hook — REMOVE before shipping */
window.__RG={
  R:()=>R,L:()=>L,
  sim(myAtk,myDef,oAtk,oDef,policy,n){ // policy: null | "coach" (def when leading, att/allin when behind)
    n=n||500;let w=0,d=0,sg=0,sa=0;
    for(let k=0;k<n;k++){
      let gf=0,ga=0;
      for(let m=1;m<=90;m++){
        let ph={own:1,opp:1};
        if(policy==="coach"){
          if(gf>ga)ph=PHIL.def;
          else if(gf<ga)ph=(m>=70?PHIL.allin:PHIL.att);
        }
        let lamY=clamp(1.6+(myAtk-oDef)*0.20,0.15,5.5)/90*ph.own;
        let lamO=clamp(1.6+(oAtk-myDef)*0.20,0.12,5.0)/90*ph.opp;
        if(Math.random()<lamY)gf++;
        if(Math.random()<lamO)ga++;
      }
      if(gf>ga)w++;else if(gf===ga)d++;sg+=gf;sa+=ga;
    }
    return {win:+(w/n).toFixed(2),draw:+(d/n).toFixed(2),avg:(sg/n).toFixed(1)+":"+(sa/n).toFixed(1)};
  }
};
})();
