/* ============================================================
   ELF '26 — Game configuration (teams, kits, formations,
   power-ups, squad stats). Pure data, loaded before game.js.
   ============================================================ */

/* --- The real 48 nations of the 2026 World Cup. strength ≈ best-XI
       strength (drives roll-weighting & opponent difficulty). kit =
       home colours (p primary, s trim, t number text, pat pattern). --- */
const TEAM_META = [
  { name:"Argentina",    code:"ARG", flag:"🇦🇷", strength:92, kit:{p:"#75AADB",s:"#ffffff",t:"#0b2b4a",pat:"stripes"} },
  { name:"France",       code:"FRA", flag:"🇫🇷", strength:92, kit:{p:"#1e2a56",s:"#ED2939",t:"#ffffff",pat:"plain"} },
  { name:"Spain",        code:"ESP", flag:"🇪🇸", strength:91, kit:{p:"#C60B1E",s:"#FFC400",t:"#ffffff",pat:"plain"} },
  { name:"England",      code:"ENG", flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", strength:91, kit:{p:"#ffffff",s:"#CE1124",t:"#1b2a4a",pat:"plain"} },
  { name:"Brazil",       code:"BRA", flag:"🇧🇷", strength:91, kit:{p:"#FCD116",s:"#009C3B",t:"#0a3b1e",pat:"plain"} },
  { name:"Portugal",     code:"POR", flag:"🇵🇹", strength:89, kit:{p:"#8B1B2F",s:"#006233",t:"#ffffff",pat:"plain"} },
  { name:"Netherlands",  code:"NED", flag:"🇳🇱", strength:88, kit:{p:"#F36C21",s:"#ffffff",t:"#2a1500",pat:"plain"} },
  { name:"Germany",      code:"GER", flag:"🇩🇪", strength:88, kit:{p:"#f4f4f4",s:"#111111",t:"#111111",pat:"plain"} },
  { name:"Belgium",      code:"BEL", flag:"🇧🇪", strength:86, kit:{p:"#C8102E",s:"#FDDA24",t:"#ffffff",pat:"plain"} },
  { name:"Croatia",      code:"CRO", flag:"🇭🇷", strength:84, kit:{p:"#D52B1E",s:"#ffffff",t:"#ffffff",pat:"stripes"} },
  { name:"Uruguay",      code:"URU", flag:"🇺🇾", strength:84, kit:{p:"#5FB1E5",s:"#111111",t:"#07304f",pat:"plain"} },
  { name:"Morocco",      code:"MAR", flag:"🇲🇦", strength:84, kit:{p:"#C1272D",s:"#006233",t:"#ffffff",pat:"plain"} },
  { name:"Colombia",     code:"COL", flag:"🇨🇴", strength:83, kit:{p:"#FCD116",s:"#003893",t:"#07306b",pat:"plain"} },
  { name:"Norway",       code:"NOR", flag:"🇳🇴", strength:82, kit:{p:"#BA0C2F",s:"#00205B",t:"#ffffff",pat:"plain"} },
  { name:"Japan",        code:"JPN", flag:"🇯🇵", strength:82, kit:{p:"#0B1E5B",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Senegal",      code:"SEN", flag:"🇸🇳", strength:81, kit:{p:"#00853F",s:"#FDEF42",t:"#ffffff",pat:"plain"} },
  { name:"Mexico",       code:"MEX", flag:"🇲🇽", strength:81, kit:{p:"#006847",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Sweden",       code:"SWE", flag:"🇸🇪", strength:80, kit:{p:"#FFCD00",s:"#005B99",t:"#0a2b5e",pat:"plain"} },
  { name:"USA",          code:"USA", flag:"🇺🇸", strength:80, kit:{p:"#ffffff",s:"#0A3161",t:"#0A3161",pat:"plain"} },
  { name:"Switzerland",  code:"SUI", flag:"🇨🇭", strength:80, kit:{p:"#D52B1E",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Austria",      code:"AUT", flag:"🇦🇹", strength:80, kit:{p:"#ED2939",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"South Korea",  code:"KOR", flag:"🇰🇷", strength:80, kit:{p:"#C8102E",s:"#0A3161",t:"#ffffff",pat:"plain"} },
  { name:"Türkiye",      code:"TUR", flag:"🇹🇷", strength:80, kit:{p:"#E30A17",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Ecuador",      code:"ECU", flag:"🇪🇨", strength:78, kit:{p:"#FFD100",s:"#0072CE",t:"#07306b",pat:"plain"} },
  { name:"Canada",       code:"CAN", flag:"🇨🇦", strength:78, kit:{p:"#D52B1E",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Ivory Coast",  code:"CIV", flag:"🇨🇮", strength:78, kit:{p:"#F77F00",s:"#009E60",t:"#ffffff",pat:"plain"} },
  { name:"Czechia",      code:"CZE", flag:"🇨🇿", strength:77, kit:{p:"#D7141A",s:"#11457E",t:"#ffffff",pat:"plain"} },
  { name:"Egypt",        code:"EGY", flag:"🇪🇬", strength:77, kit:{p:"#C8102E",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Algeria",      code:"ALG", flag:"🇩🇿", strength:77, kit:{p:"#ffffff",s:"#006633",t:"#14532d",pat:"plain"} },
  { name:"Scotland",     code:"SCO", flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", strength:76, kit:{p:"#0a356e",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Ghana",        code:"GHA", flag:"🇬🇭", strength:76, kit:{p:"#f4f4f4",s:"#006B3F",t:"#1b2a4a",pat:"plain"} },
  { name:"Iran",         code:"IRN", flag:"🇮🇷", strength:76, kit:{p:"#f4f4f4",s:"#239F40",t:"#1b2a4a",pat:"plain"} },
  { name:"DR Congo",     code:"COD", flag:"🇨🇩", strength:76, kit:{p:"#007FFF",s:"#CE1021",t:"#ffffff",pat:"plain"} },
  { name:"Bosnia & Herz.",code:"BIH",flag:"🇧🇦", strength:75, kit:{p:"#1c4587",s:"#FFD700",t:"#ffffff",pat:"plain"} },
  { name:"South Africa", code:"RSA", flag:"🇿🇦", strength:75, kit:{p:"#007A4D",s:"#FCB514",t:"#ffffff",pat:"plain"} },
  { name:"Paraguay",     code:"PAR", flag:"🇵🇾", strength:75, kit:{p:"#DA121A",s:"#ffffff",t:"#ffffff",pat:"stripes"} },
  { name:"Australia",    code:"AUS", flag:"🇦🇺", strength:75, kit:{p:"#FFCD00",s:"#00843D",t:"#0a3b1e",pat:"plain"} },
  { name:"Tunisia",      code:"TUN", flag:"🇹🇳", strength:74, kit:{p:"#E70013",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Saudi Arabia", code:"KSA", flag:"🇸🇦", strength:73, kit:{p:"#ffffff",s:"#006C35",t:"#14532d",pat:"plain"} },
  { name:"Panama",       code:"PAN", flag:"🇵🇦", strength:72, kit:{p:"#DA121A",s:"#005293",t:"#ffffff",pat:"plain"} },
  { name:"Uzbekistan",   code:"UZB", flag:"🇺🇿", strength:72, kit:{p:"#ffffff",s:"#1EB53A",t:"#0a5b2e",pat:"plain"} },
  { name:"Qatar",        code:"QAT", flag:"🇶🇦", strength:71, kit:{p:"#8A1538",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Cape Verde",   code:"CPV", flag:"🇨🇻", strength:71, kit:{p:"#003893",s:"#ffffff",t:"#ffffff",pat:"plain"} },
  { name:"Jordan",       code:"JOR", flag:"🇯🇴", strength:71, kit:{p:"#ffffff",s:"#CE1126",t:"#1b2a4a",pat:"plain"} },
  { name:"Iraq",         code:"IRQ", flag:"🇮🇶", strength:71, kit:{p:"#ffffff",s:"#007A3D",t:"#14532d",pat:"plain"} },
  { name:"New Zealand",  code:"NZL", flag:"🇳🇿", strength:70, kit:{p:"#ffffff",s:"#111111",t:"#111111",pat:"plain"} },
  { name:"Haiti",        code:"HAI", flag:"🇭🇹", strength:69, kit:{p:"#00209F",s:"#D21034",t:"#ffffff",pat:"plain"} },
  { name:"Curaçao",      code:"CUW", flag:"🇨🇼", strength:68, kit:{p:"#002B7F",s:"#FFD100",t:"#ffffff",pat:"plain"} },
];

/* --- Slot eligibility. Exact slot code = natural (no penalty);
       others = playable with OUT_OF_POS penalty. --- */
/* Strict eligibility — a player must genuinely play the slot's role.
   (No out-of-position placement anymore.) */
const ACCEPTS = {
  GK:["GK"],
  RB:["RB","RWB"], LB:["LB","LWB"], CB:["CB"],
  RWB:["RWB","RB"], LWB:["LWB","LB"],
  CDM:["CDM","CM"], CM:["CM","CDM","CAM"], CAM:["CAM","CM"],
  RM:["RM","RW"], LM:["LM","LW"],
  RW:["RW","RM"], LW:["LW","LM"], ST:["ST"],
};
const POS_LABEL = {
  GK:"Goalkeeper", RB:"Right-Back", LB:"Left-Back", CB:"Centre-Back",
  RWB:"Right Wing-Back", LWB:"Left Wing-Back", CDM:"Defensive Mid",
  CM:"Central Mid", CAM:"Attacking Mid", RM:"Right Mid", LM:"Left Mid",
  RW:"Right Wing", LW:"Left Wing", ST:"Striker",
};
/* Sort / grouping order for the roll list */
const POS_ORDER = { GK:0, RB:1, RWB:2, CB:3, LB:4, LWB:5, CDM:6, CM:7, CAM:8, RM:9, LM:10, RW:11, LW:12, ST:13 };
const POS_GROUP = pos =>
  pos==="GK" ? "GK" :
  ["RB","RWB","CB","LB","LWB"].includes(pos) ? "DEF" :
  ["CDM","CM","CAM","RM","LM"].includes(pos) ? "MID" : "FWD";

/* --- 5 formations. slot: pos (role) + x/y (% on pitch,
       y=93 own goal bottom, y=16 opponent goal top). --- */
const FORMATIONS = {
  "4-3-3": { label:"4-3-3", slots:[
    {pos:"GK",x:50,y:93},
    {pos:"LB",x:14,y:73},{pos:"CB",x:37,y:77},{pos:"CB",x:63,y:77},{pos:"RB",x:86,y:73},
    {pos:"CM",x:30,y:50},{pos:"CDM",x:50,y:60},{pos:"CM",x:70,y:50},
    {pos:"LW",x:18,y:25},{pos:"ST",x:50,y:18},{pos:"RW",x:82,y:25},
  ]},
  "4-2-3-1": { label:"4-2-3-1", slots:[
    {pos:"GK",x:50,y:93},
    {pos:"LB",x:12,y:73},{pos:"CB",x:37,y:77},{pos:"CB",x:63,y:77},{pos:"RB",x:88,y:73},
    {pos:"CDM",x:36,y:60},{pos:"CDM",x:64,y:60},
    {pos:"LW",x:16,y:36},{pos:"CAM",x:50,y:40},{pos:"RW",x:84,y:36},
    {pos:"ST",x:50,y:17},
  ]},
  "4-4-2": { label:"4-4-2", slots:[
    {pos:"GK",x:50,y:93},
    {pos:"LB",x:12,y:73},{pos:"CB",x:37,y:77},{pos:"CB",x:63,y:77},{pos:"RB",x:88,y:73},
    {pos:"LM",x:14,y:50},{pos:"CM",x:38,y:52},{pos:"CM",x:62,y:52},{pos:"RM",x:86,y:50},
    {pos:"ST",x:38,y:20},{pos:"ST",x:62,y:20},
  ]},
  "3-5-2": { label:"3-5-2", slots:[
    {pos:"GK",x:50,y:93},
    {pos:"CB",x:28,y:77},{pos:"CB",x:50,y:79},{pos:"CB",x:72,y:77},
    {pos:"LWB",x:9,y:52},{pos:"CM",x:34,y:54},{pos:"CDM",x:50,y:60},{pos:"CM",x:66,y:54},{pos:"RWB",x:91,y:52},
    {pos:"ST",x:38,y:20},{pos:"ST",x:62,y:20},
  ]},
  "3-4-3": { label:"3-4-3", slots:[
    {pos:"GK",x:50,y:93},
    {pos:"CB",x:28,y:77},{pos:"CB",x:50,y:79},{pos:"CB",x:72,y:77},
    {pos:"LM",x:12,y:52},{pos:"CM",x:38,y:54},{pos:"CM",x:62,y:54},{pos:"RM",x:88,y:52},
    {pos:"LW",x:18,y:24},{pos:"ST",x:50,y:18},{pos:"RW",x:82,y:24},
  ]},
};

/* Lay an arbitrary XI (array of {pos,...}) onto a pitch: band vertically by role,
   spread horizontally left→right within each band. Returns copies with x,y added.
   Shared by both modes for rendering opponent line-ups on a pitch. */
// Opponent XIs are picked by rating (clubXI) so they can be lopsided (e.g. 5 high-rated CBs → a nonsense "5-1-1-1-1-1").
// Lay ANY 11 into a clean 4-3-3 by best-fit per slot, so opponents always render as a believable shape.
function autoXYopp(arr){
  // each slot lists position tiers in PREFERENCE order (real fullback before a CB filling in, etc.)
  const T=[
    {x:50,y:90,t:[["GK"]]},
    {x:50,y:18,t:[["ST","CF","SS"],["CAM"],["LW","RW"]]},
    {x:18,y:27,t:[["LW","LM"],["CAM"],["ST","RW","RM"]]},
    {x:82,y:27,t:[["RW","RM"],["CAM"],["ST","LW","LM"]]},
    {x:13,y:72,t:[["LB","LWB"],["LM"],["CB"]]},
    {x:87,y:72,t:[["RB","RWB"],["RM"],["CB"]]},
    {x:37,y:76,t:[["CB"],["CDM"]]},
    {x:63,y:76,t:[["CB"],["CDM"]]},
    {x:50,y:57,t:[["CDM"],["CM"],["CB"]]},
    {x:31,y:47,t:[["CM","LM"],["CDM","CAM"]]},
    {x:69,y:47,t:[["CM","RM"],["CDM","CAM"]]}
  ];
  const out=arr.map(p=>Object.assign({},p)), used=new Set();
  const posOf=p=>Array.isArray(p.pos)?p.pos[0]:p.pos;
  const pickTier=tier=>{let bi=-1,br=-2;out.forEach((p,i)=>{if(used.has(i))return;if(tier.includes(posOf(p))&&p.rating>br){br=p.rating;bi=i;}});return bi;};
  const grab=tiers=>{for(let k=0;k<tiers.length;k++){const i=pickTier(tiers[k]);if(i>=0)return i;}let bi=-1,br=-2;out.forEach((p,i)=>{if(used.has(i))return;if(p.rating>br){br=p.rating;bi=i;}});return bi;};
  T.forEach(slot=>{const i=grab(slot.t); if(i>=0){used.add(i);out[i].x=slot.x;out[i].y=slot.y;}});
  out.forEach((p,i)=>{if(!used.has(i)){if(p.x==null)p.x=50;if(p.y==null)p.y=50;}});
  return out;
}
function autoXY(arr){
  const band=p=>p.pos==="GK"?90:["CB","RB","LB","RWB","LWB"].includes(p.pos)?74:p.pos==="CDM"?62:["CM","LM","RM"].includes(p.pos)?50:p.pos==="CAM"?40:["LW","RW"].includes(p.pos)?30:18;
  const zone=p=>["LB","LWB","LM","LW"].includes(p.pos)?-1:["RB","RWB","RM","RW"].includes(p.pos)?1:0; // -1 left · 0 centre · 1 right
  const cl=v=>Math.max(8,Math.min(92,Math.round(v)));
  const out=arr.map(p=>Object.assign({},p)), rows={};
  arr.forEach((p,i)=>{const y=band(p);(rows[y]=rows[y]||[]).push(i);});
  Object.keys(rows).forEach(y=>{
    const idxs=rows[y];
    const L=idxs.filter(i=>zone(arr[i])===-1), C=idxs.filter(i=>zone(arr[i])===0), R=idxs.filter(i=>zone(arr[i])===1);
    L.forEach((idx,k)=>out[idx].x=cl(12+k*7));   // left-sided players hug the left touchline
    R.forEach((idx,k)=>out[idx].x=cl(88-k*7));   // right-sided players hug the right touchline
    const n=C.length, sp=n<=1?0:Math.min(20,46/(n-1));
    C.forEach((idx,k)=>out[idx].x=cl(50+(k-(n-1)/2)*sp)); // central players cluster around the middle, never the wings
    idxs.forEach(idx=>out[idx].y=+y);
  });
  return out;
}

/* --- Tactical style. Flat attack/defence modifiers; tempo raises
       goal expectancy (more risk, more goals). --- */
/* Mentality RESHAPES the XI (changes positions), it is NOT a stat buff.
   m: 'def' pulls roles back · 'bal' formation as drawn · 'att' pushes roles up. */
const STYLES = {
  "defensive": { label:"Defensive", icon:"🛡️", m:"def", desc:"Sit deeper: wing-backs tuck into full-backs, wingers drop to wide mids, a midfielder becomes a holder." },
  "balanced":  { label:"Balanced",  icon:"⚖️", m:"bal", desc:"The formation exactly as you drew it." },
  "attacking": { label:"Attacking", icon:"⚔️", m:"att", desc:"Push up: full-backs become wing-backs and a midfielder steps up into a No.10." },
};

/* --- Squad stats. Rolled AFTER the XI is built. 65–99, high values
       rare. Feed the match engine. --- */
const STATS = [
  { id:"chemistry", label:"Chemistry",   icon:"🔗", desc:"Link-up play — boosts attack. Low chemistry risks dressing-room clashes." },
  { id:"tactics",   label:"Tactical IQ", icon:"🧩", desc:"Shape & organisation — boosts defence." },
  { id:"fitness",   label:"Fitness",     icon:"💪", desc:"Late-game engine — fewer goals conceded; high fitness avoids knocks." },
  { id:"morale",    label:"Morale",      icon:"🔥", desc:"Big-moment nerve — penalties; high morale can fire a player up." },
];
const STAT_ROLLS = { all:3, specific:10 }; // budgets

/* --- Attack / defence contribution weight per role. Full-backs carry more
       attacking weight now (overlapping FBs get more goal involvement). --- */
const ATK_WEIGHT = { ST:1.0, RW:.9, LW:.9, CAM:.85, RM:.7, LM:.7, CM:.55, CDM:.3, RWB:.55, LWB:.55, RB:.40, LB:.40, CB:.1, GK:0 };
const DEF_WEIGHT = { GK:1.0, CB:.95, RB:.7, LB:.7, RWB:.55, LWB:.55, CDM:.72, CM:.46, RM:.3, LM:.3, CAM:.2, RW:.12, LW:.12, ST:.08 };
/* A standout who outshines his team lifts the side: take the player who most exceeds the
   squad average (weighted by his attack/defence role) and add a fraction. Shared by both modes,
   both XIs — so an 85 in a 74 team scores/creates more (attack) or concedes less (defence). */
function standoutBonus(arr, W, avg, k){
  let best=0; arr.forEach(p=>{const e=(p.rating-avg)*(W[p.pos]||0); if(e>best)best=e;});
  return Math.min(5, best*(k==null?0.3:k));
}

/* --- Known young talents: extra potential. --- */
const WONDERKIDS = new Set([
  "Lamine Yamal","Endrick","Arda Güler","Warren Zaïre-Emery","Kobbie Mainoo",
  "Désiré Doué","Pau Cubarsí","Estêvão","Mathys Tel","Jorrel Hato","Kenan Yıldız",
  "Antonio Nusa","Franco Mastantuono","Gilberto Mora","Kendry Páez","Lamine Camara",
  "Nico Williams","Florian Wirtz","Jamal Musiala","João Neves","Musab Al-Juwayr",
]);

/* --- Power-ups. target: 'none' instant · 'player' pick a player ·
       'stat' pick a squad stat · 'passive' lasts the run. --- */
/* tier 1 common · 2 rare · 3 epic · 4 legendary (drives reveal flair) */
const POWERUPS = [
  { id:"mentor",           name:"Mentor",              icon:"🧠", target:"none",   weight:18, tier:1,
    desc:"Veterans lead the way: +4 rating for everyone aged 30+." },
  { id:"golden_gen",       name:"Golden Generation",   icon:"🏅", target:"none",   weight:16, tier:1,
    desc:"Your biggest nation sticks together: +3 rating each." },
  { id:"team_spirit",      name:"Team Spirit",         icon:"🤝", target:"stat",   weight:14, tier:2,
    desc:"+8 to a squad stat of your choice (max 99)." },
  { id:"masterclass",      name:"Masterclass",         icon:"📈", target:"none",   weight:13, tier:2,
    desc:"The whole XI levels up: +2 rating for everyone." },
  { id:"wonderkid",        name:"Wonderkid",           icon:"🚀", target:"none",   weight:12, tier:2,
    desc:"Your youngest talent steps up: +5 rating (up to their potential)." },
  { id:"catalyst",         name:"Catalyst",            icon:"🔥", target:"passive", weight:7, tier:3,
    desc:"Greatly boosts growth odds for the rest of the run." },
  { id:"position_master",  name:"Position Master",     icon:"🎓", target:"player", weight:6, tier:3,
    desc:"A chosen player becomes a specialist: +6 rating." },
  { id:"potential_unlock", name:"Potential Unlock",   icon:"💎", target:"player", weight:5, tier:4,
    desc:"One chosen player jumps straight to their full potential." },
  { id:"talisman",         name:"Talisman",            icon:"⭐", target:"player", weight:5, tier:4,
    desc:"Name a captain: +5 rating and guaranteed growth every match." },
  { id:"lucky_roll",       name:"Lucky Roll",          icon:"🎲", target:"none",   weight:4, tier:4,
    desc:"Double luck: roll two more power-ups right now." },
];

/* --- Coach bonuses. Each drafted coach gets one, stable by name-hash. --- */
/* Coaches boost SQUAD STATS (or growth / power-ups) — never raw attack/defence,
   which stay the plain average of your attacking / defending players. */
const COACH_BONUSES = [
  { id:"offensive", label:"Attacking Mastermind", icon:"⚔️", desc:"+6 Chemistry",               eff:{stat:{chemistry:6}} },
  { id:"defensive", label:"Defensive Architect",  icon:"🧱", desc:"+6 Tactical IQ",             eff:{stat:{tactics:6}} },
  { id:"motivator", label:"Motivator",            icon:"📣", desc:"+6 Morale",                  eff:{stat:{morale:6}} },
  { id:"fitness",   label:"Fitness Guru",         icon:"💪", desc:"+6 Fitness",                 eff:{stat:{fitness:6}} },
  { id:"developer", label:"Talent Developer",     icon:"🌱", desc:"+15% growth chance",         eff:{growth:0.15} },
  { id:"lucky",     label:"Lucky Charm",          icon:"🍀", desc:"One extra power-up at kickoff", eff:{bonusPU:1} },
];

/* --- Tournament path. 3 group games, then knockout to the title. --- */
const ROUNDS = [
  { id:"g1", name:"Group · Matchday 1", type:"group", diff:0.95 },
  { id:"g2", name:"Group · Matchday 2", type:"group", diff:0.97 },
  { id:"g3", name:"Group · Matchday 3", type:"group", diff:0.99 },
  { id:"r32",name:"Round of 32",        type:"ko",    diff:1.00 },
  { id:"r16",name:"Round of 16",        type:"ko",    diff:1.00 },
  { id:"qf", name:"Quarter-Final",      type:"ko",    diff:1.01 },
  { id:"sf", name:"Semi-Final",         type:"ko",    diff:1.02 },
  { id:"fin",name:"FINAL",              type:"final", diff:1.03 },
];

/* --- Tuning knobs in one place. --- */
const TUNE = {
  OUT_OF_POS: 4,         // rating penalty when played out of position
  GOALS_PER_PU: 5,       // goals per bonus power-up roll
  TOP_TEAM_RARITY: 0.45, // how much rarer top nations roll (0 equal … 1 strong)
  GROWTH_BASE: 0.16,     // base growth chance per match
  MATCH_SECONDS: 11,     // real seconds to play out 90 minutes (WC mode — back to fast per user)
};
