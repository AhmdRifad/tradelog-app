const $ = (id) => document.getElementById(id);
const STORE_KEY = "tradelog.trades.v1";
const CHECK_KEY = "tradelog.checklist.v1";
const CHECK_ITEMS = [
  ["Higher-timeframe trend","Direction agrees with your defined higher-timeframe bias.",true],
  ["Key level / zone","Entry is near a level marked before the trade.",true],
  ["Market structure","Structure is clear under your written rules.",true],
  ["Entry trigger","A specific, rule-based trigger is present.",true],
  ["Volume / momentum","Your selected confirmation tool supports the setup.",false],
  ["Risk-to-reward","Planned R:R meets your minimum rule.",true],
  ["Stop placement","Stop is at a logical invalidation point.",true],
  ["Position sizing","Size is based on risk and stop distance.",true],
  ["News / volatility","Major scheduled news and unusual volatility checked.",false],
  ["Liquidity / spread","Liquidity and transaction costs are acceptable.",false],
  ["Emotional check","You are calm and not chasing or revenge-trading.",true],
  ["Written plan","Entry, stop, target and exit conditions are recorded.",true]
];
let trades = loadJSON(STORE_KEY, []);
let answers = loadJSON(CHECK_KEY, {});
let toastTimer;

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(trades));
    localStorage.setItem(CHECK_KEY, JSON.stringify(answers));
    $("storageStatus").textContent = `Saved locally on this device • ${trades.length} trade record(s)`;
    return true;
  } catch (err) {
    notify("Could not save. Check available device storage.");
    return false;
  }
}
function notify(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}
function num(value) { const n = Number(value); return value !== "" && Number.isFinite(n) ? n : null; }
function money(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat(undefined, {style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
}
function fmt(value, digits=2) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "—" :
    Number(value).toLocaleString(undefined,{maximumFractionDigits:digits});
}
function esc(s="") { return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function calcRisk(balance, pct) { return balance !== null && pct !== null ? balance * pct / 100 : null; }
function calcRR(entry, stop, target) {
  if ([entry,stop,target].some(v => v === null) || Math.abs(entry-stop) === 0) return null;
  const reward = Math.abs(target-entry), risk = Math.abs(entry-stop);
  return reward/risk;
}
function plannedRisk(t) {
  const b=num(t.balance), p=num(t.riskPct), e=num(t.entry), s=num(t.stop);
  if ([b,p,e,s].some(v=>v===null) || b<0 || p<0 || Math.abs(e-s)===0) return null;
  return b*p/100;
}
function resultOf(t) {
  // No exit price means the position is still open.
  if (t.exit === "" || t.exit === null || t.exit === undefined) return {outcome:"Open", net:null, gross:null, r:null};

  const entry = num(t.entry), exit = num(t.exit);
  const size = num(t.positionSize);
  const multiplier = num(t.contractMultiplier);
  let gross = null;

  // New records: calculate from price movement, direction, size and contract multiplier.
  // For CFDs/futures, the multiplier must match the broker/exchange contract specification.
  if (entry !== null && exit !== null && size !== null && size > 0 &&
      multiplier !== null && multiplier > 0) {
    const directionSign = String(t.direction).toLowerCase() === "short" ? -1 : 1;
    gross = (exit - entry) * directionSign * size * multiplier;
  } else {
    // Backward compatibility for older saved trades that used a manually entered gross result.
    gross = num(t.gross);
  }

  if (gross === null) return {outcome:"Needs data",net:null,gross:null,r:null};
  const net = gross - (num(t.fees) || 0);
  return {outcome: net > 0 ? "Win" : net < 0 ? "Loss" : "Break-even", gross, net, r: plannedRisk(t) > 0 ? net/plannedRisk(t) : null};
}


let currentSwipeView = "dashboard";

function switchView(view) {
  const views = [...document.querySelectorAll(".view")];
  const tabs = [...document.querySelectorAll(".nav-tab")];
  const nextView = document.getElementById(`view-${view}`);

  if (!nextView) return;

  const names = tabs.map(tab => tab.dataset.view);
  const oldIndex = names.indexOf(currentSwipeView);
  const newIndex = names.indexOf(view);
  const direction = newIndex >= oldIndex ? 1 : -1;

  const changed = currentSwipeView !== view;
  currentSwipeView = view;

  views.forEach(el => {
    el.classList.toggle("active", el.id === `view-${view}`);
  });

  tabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });

  if (changed) {
    nextView.animate(
      [
        { transform: `translateX(${direction * 45}px)`, opacity: 0.65 },
        { transform: "translateX(0)", opacity: 1 }
      ],
      {
        duration: 240,
        easing: "ease-out"
      }
    );
  }

  if (view === "trades") renderTrades();
  if (view === "dashboard") renderDashboard();
  if (view === "checklist") renderChecklist();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-tab").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.go));
});

/* Swipe left or right to change pages */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", event => {
  if (event.touches.length !== 1) return;

  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", event => {
  if (event.changedTouches.length !== 1) return;

  const dx = event.changedTouches[0].clientX - touchStartX;
  const dy = event.changedTouches[0].clientY - touchStartY;

  // Ignore vertical scrolling and small movements.
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) {
    return;
  }

  // Don't switch pages while interacting with forms or dialogs.
  if (event.target.closest(
    "input, textarea, select, button, a, dialog"
  )) return;

  const names = [...document.querySelectorAll(".nav-tab")]
    .map(tab => tab.dataset.view);

  const index = names.indexOf(currentSwipeView);
  const nextIndex = dx < 0 ? index + 1 : index - 1;

  if (nextIndex >= 0 && nextIndex < names.length) {
    switchView(names[nextIndex]);
  }
}, { passive: true });


  if (view === "trades") renderTrades();
  if (view === "dashboard") renderDashboard();
  if (view === "checklist") renderChecklist();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-tab").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.go)));

function renderDashboard() {
  const closed=trades.map(t=>({...t,...resultOf(t)})).filter(t=>t.net!==null);
  const net=closed.reduce((sum,t)=>sum+t.net,0);
  const wins=closed.filter(t=>t.outcome==="Win").length;
  const rs=closed.map(t=>t.r).filter(v=>v!==null && Number.isFinite(v));
  $("statPnl").textContent=money(net);
  $("statPnl").classList.toggle("positive",net>0); $("statPnl").classList.toggle("negative",net<0);
  $("pnlFoot").textContent=`${closed.length} closed trade${closed.length===1?"":"s"}`;
  $("statWin").textContent=closed.length?`${Math.round(wins/closed.length*100)}%`:"—";
  $("winFoot").textContent=closed.length?`${wins} wins • ${closed.length-wins} non-wins`:"Closed trades only";
  $("statTrades").textContent=closed.length;
  $("statR").textContent=rs.length?`${rs.reduce((a,b)=>a+b,0)/rs.length>=0?"+":""}${fmt(rs.reduce((a,b)=>a+b,0)/rs.length)}R`:"—";
  const savedScores=trades.map(t=>num(t.tradeScore)).filter(v=>v!==null);
  const avg=savedScores.length?savedScores.reduce((a,b)=>a+b,0)/savedScores.length:0;
  $("scoreValue").textContent=savedScores.length?`${Math.round(avg)}%`:"—";
  $("scoreRing").style.background=`conic-gradient(var(--teal) ${avg*3.6}deg,#263745 ${avg*3.6}deg)`;
  $("scoreCaption").textContent=savedScores.length?`Average from ${savedScores.length} trade checklist score(s).`:"Save a checklist score with a trade to track process.";
  renderChart(closed);
  const recent=[...trades].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,5);
  $("recentTrades").innerHTML=recent.length?tradeTable(recent):emptyHTML("No trades yet","Your trade history will appear here.",true);
}
function renderChart(closed) {
  const el=$("equityChart");
  if(!closed.length){el.innerHTML='<div class="empty-state">Log a closed trade to start your chart.</div>';return;}
  let total=0; const points=closed.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(t=>{total+=t.net;return total;});
  const w=640,h=190,pad=16,min=Math.min(0,...points),max=Math.max(0,...points),range=max-min||1;
  const coords=points.map((v,i)=>({x:pad+(points.length===1?(w-2*pad)/2:i*(w-2*pad)/(points.length-1)),y:h-pad-(v-min)/range*(h-2*pad)}));
  const line=coords.map((p,i)=>`${i?"L":"M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const zeroY=h-pad-(0-min)/range*(h-2*pad);
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Cumulative net P and L chart"><line x1="${pad}" y1="${zeroY}" x2="${w-pad}" y2="${zeroY}" stroke="#304454" stroke-dasharray="4 5"/><path d="${line}" fill="none" stroke="#62d6bf" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="${line} L ${coords[coords.length-1].x} ${h-pad} L ${coords[0].x} ${h-pad} Z" fill="#62d6bf" opacity=".08"/>${coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="#62d6bf"/>`).join("")}<text x="${pad}" y="12" fill="#8196a7" font-size="10">${money(max)}</text><text x="${pad}" y="${h-2}" fill="#8196a7" font-size="10">${money(min)}</text></svg>`;
}
function tradeTable(list) {
  return `<table class="trade-table"><thead><tr><th>MARKET</th><th>DIRECTION</th><th>RESULT</th><th>NET P&amp;L</th></tr></thead><tbody>${list.map(t=>{
    const r=resultOf(t);return `<tr><td><span class="market-cell">${esc(t.market)}</span><span class="sub-cell">${esc(t.date||"")}</span></td><td>${esc(t.direction)}</td><td><span class="badge ${r.outcome.toLowerCase()}">${r.outcome}</span></td><td class="${r.net>0?"positive":r.net<0?"negative":""}">${r.net===null?"—":money(r.net)}</td></tr>`;
  }).join("")}</tbody></table>`;
}
function emptyHTML(title,body,withButton=false) {
  return `<div class="empty-list"><strong>${esc(title)}</strong>${esc(body)}${withButton?'<br><button class="primary-btn" onclick="openNewTrade()">＋ Log your first trade</button>':""}</div>`;
}
function renderTrades() {
  const q=$("tradeSearch").value.trim().toLowerCase(),filter=$("resultFilter").value;
  const list=[...trades].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).filter(t=>{
    const r=resultOf(t),matches=`${t.market} ${t.setup} ${t.notes}`.toLowerCase().includes(q);
    return matches&&(filter==="all"||r.outcome===filter);
  });
  $("tradeList").innerHTML=list.length?list.map(t=>{
    const r=resultOf(t),rr=calcRR(num(t.entry),num(t.stop),num(t.target));
    return `<article class="trade-card">
      <div class="trade-card-head"><div><h3>${esc(t.market)} <span class="badge">${esc(t.direction)}</span></h3><div class="trade-meta">${esc(t.date||"")} · ${esc(t.timeframe||"")} · ${esc(t.setup||"No setup named")}</div></div><span class="badge ${r.outcome.toLowerCase()}">${r.outcome}</span></div>
      <div class="trade-numbers"><div><span>Entry</span><strong>${fmt(num(t.entry))}</strong></div><div><span>Stop loss</span><strong>${fmt(num(t.stop))}</strong></div><div><span>Target</span><strong>${fmt(num(t.target))}</strong></div><div><span>Net P&amp;L</span><strong class="${r.net>0?"positive":r.net<0?"negative":""}">${r.net===null?"—":money(r.net)}</strong></div></div>
      <div class="trade-meta">Planned R:R ${rr===null?"—":`1:${fmt(rr)}`} · Actual R ${r.r===null?"—":`${r.r>=0?"+":""}${fmt(r.r)}R`} · Checklist ${t.tradeScore===""||t.tradeScore==null?"—":`${fmt(t.tradeScore,0)}%`}</div>
      ${t.notes?`<p class="trade-notes">${esc(t.notes)}</p>`:""}${t.screenshot?`<p class="trade-meta"><a href="${esc(t.screenshot)}" target="_blank" rel="noopener noreferrer">Open screenshot / chart link ↗</a></p>`:""}
      <div class="trade-actions"><button class="mini-btn" onclick="editTrade('${t.id}')">Edit</button><button class="mini-btn delete" onclick="deleteTrade('${t.id}')">Delete</button></div>
    </article>`;
  }).join(""):emptyHTML("No matching trades","Try another filter, or add a new trade.");
}
function defaultDate() { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
function openNewTrade() {
  $("tradeForm").reset(); $("tradeId").value=""; $("dialogTitle").textContent="Log a trade";
  $("tradeDate").value=defaultDate(); $("riskPct").value="1"; $("fees").value="0"; $("direction").value="Long"; $("tradeScore").value="";
  updateModalCalc(); $("tradeDialog").showModal();
}
window.openNewTrade=openNewTrade;
$("newTradeBtn").addEventListener("click",openNewTrade); $("newTradeTop").addEventListener("click",openNewTrade);
$("closeDialog").addEventListener("click",()=>$("tradeDialog").close()); $("cancelTrade").addEventListener("click",()=>$("tradeDialog").close());
function editTrade(id) {
  const t=trades.find(x=>x.id===id);if(!t)return;
  const fields={tradeId:"id",tradeDate:"date",market:"market",direction:"direction",timeframe:"timeframe",setup:"setup",balance:"balance",riskPct:"riskPct",entry:"entry",stop:"stop",target:"target",exit:"exit",positionSize:"positionSize",contractMultiplier:"contractMultiplier",gross:"gross",fees:"fees",tradeScore:"tradeScore",notes:"notes",screenshot:"screenshot"};
  Object.entries(fields).forEach(([field,key])=>$(field).value=t[key]??"");
  $("dialogTitle").textContent="Edit trade";updateModalCalc();$("tradeDialog").showModal();
}
window.editTrade=editTrade;
window.deleteTrade=(id)=>{if(confirm("Delete this trade permanently from this device?")){trades=trades.filter(t=>t.id!==id);persist();renderTrades();renderDashboard();notify("Trade deleted.");}};
function updateModalCalc() {
  const b=num($("balance").value),p=num($("riskPct").value),e=num($("entry").value),s=num($("stop").value),t=num($("target").value);
  const risk=calcRisk(b,p),rr=calcRR(e,s,t);
  $("modalCalc").innerHTML=`Planned risk: <strong>${risk===null? "—":money(risk)}</strong> <span>•</span> Planned R:R: <strong>${rr===null?"—":`1:${fmt(rr)}`}</strong>`;
}
["balance","riskPct","entry","stop","target"].forEach(id=>$(id).addEventListener("input",updateModalCalc));
$("tradeForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("tradeId").value||crypto.randomUUID();
  const old=trades.find(t=>t.id===id);
  const t={id,date:$("tradeDate").value,market:$("market").value.trim(),direction:$("direction").value,timeframe:$("timeframe").value,setup:$("setup").value.trim(),balance:$("balance").value,riskPct:$("riskPct").value,entry:$("entry").value,stop:$("stop").value,target:$("target").value,exit:$("exit").value,positionSize:$("positionSize").value,contractMultiplier:$("contractMultiplier").value||"1",gross:$("gross").value,fees:$("fees").value||"0",tradeScore:$("tradeScore").value,notes:$("notes").value.trim(),screenshot:$("screenshot").value.trim(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(num(t.entry)===null||num(t.stop)===null){notify("Enter valid entry and stop prices.");return;}
  if(num(t.entry)===num(t.stop)){notify("Entry and stop cannot be the same.");return;}
  if (t.exit !== "") {
    const hasAutoInputs = num(t.positionSize) !== null && num(t.positionSize) > 0 &&
      num(t.contractMultiplier) !== null && num(t.contractMultiplier) > 0;
    if (!hasAutoInputs && num(t.gross) === null) {
      notify("For a closed trade, enter position size and a positive contract multiplier, or enter a legacy/manual gross result.");
      return;
    }
    if (t.positionSize !== "" && (!Number.isFinite(num(t.positionSize)) || num(t.positionSize) <= 0)) {
      notify("Position size must be greater than zero.");
      return;
    }
    if (t.contractMultiplier !== "" && (!Number.isFinite(num(t.contractMultiplier)) || num(t.contractMultiplier) <= 0)) {
      notify("Contract multiplier must be greater than zero.");
      return;
    }
  }
  if(t.tradeScore!==""&&(num(t.tradeScore)<0||num(t.tradeScore)>100)){notify("Checklist score must be 0–100.");return;}
  const idx=trades.findIndex(x=>x.id===id);if(idx>=0)trades[idx]=t;else trades.push(t);
  persist();$("tradeDialog").close();renderTrades();renderDashboard();notify("Trade saved on this device.");
});
$("tradeSearch").addEventListener("input",renderTrades);$("resultFilter").addEventListener("change",renderTrades);

function renderChecklist() {
  $("checklistItems").innerHTML=CHECK_ITEMS.map((it,i)=>{
    const a=answers[i]||"";
    return `<div class="check-item"><div><strong>${esc(it[0])}${it[2]?' <span class="badge">Critical</span>':""}</strong><p>${esc(it[1])}</p></div><div class="answer-pills">${[["Yes","yes"],["No","no"],["N/A","na"]].map(([label,cls])=>`<button class="${a===label?`selected ${cls}`:""}" onclick="setAnswer(${i},'${label}')">${label}</button>`).join("")}</div></div>`;
  }).join("");
  updateChecklistSummary();
}
window.setAnswer=(i,value)=>{answers[i]=value;persist();renderChecklist();};
function updateChecklistSummary() {
  const applicable=CHECK_ITEMS.map((_,i)=>i).filter(i=>answers[i]&&answers[i]!=="N/A");
  const yes=applicable.filter(i=>answers[i]==="Yes").length;
  const score=applicable.length?Math.round(yes/applicable.length*100):0;
  const anyNo=CHECK_ITEMS.some((it,i)=>it[2]&&answers[i]==="No");
  const allCriticalAnswered=CHECK_ITEMS.every((it,i)=>!it[2]||answers[i]==="Yes"||answers[i]==="N/A");
  const ready=applicable.length>0&&score>=75&&!anyNo&&allCriticalAnswered;
  $("checkScore").textContent=`${score}%`;
  $("checkDecision").textContent=ready?"PASS — REVIEW PLAN":"WAIT / REVIEW";
  $("checkDecision").className=`decision ${ready?"pass":"wait"}`;
}
$("resetChecklist").addEventListener("click",()=>{if(confirm("Reset all checklist answers?")){answers={};persist();renderChecklist();}});
$("saveChecklist").addEventListener("click",()=>{
  const applicable=Object.values(answers).filter(a=>a&&a!=="N/A"),yes=applicable.filter(a=>a==="Yes").length;
  const score=applicable.length?Math.round(yes/applicable.length*100):0;
  const anyCriticalNo=CHECK_ITEMS.some((it,i)=>it[2]&&answers[i]==="No");
  const allCriticalAnswered=CHECK_ITEMS.every((it,i)=>!it[2]||answers[i]==="Yes"||answers[i]==="N/A");
  const ready=applicable.length>0&&score>=75&&!anyCriticalNo&&allCriticalAnswered;
  $("tradeScore").value=score;
  notify(`Checklist score ${score}%. ${ready?"Review your written plan before entry.":"Review failed or unanswered rules before considering a trade."}`);
  openNewTrade();$("tradeScore").value=score;
});
function updateRiskCalc() {
  const b=num($("riskBalance").value),p=num($("riskPercent").value),e=num($("riskEntry").value),s=num($("riskStop").value),t=num($("riskTarget").value);
  const risk=calcRisk(b,p);
  const size=risk!==null&&e!==null&&s!==null&&Math.abs(e-s)>0?risk/Math.abs(e-s):null;
  const rr=calcRR(e,s,t);
  $("calcRisk").textContent=risk===null?money(0):money(risk);
  $("calcSize").textContent=size===null?"—":fmt(size,6);
  $("calcRR").textContent=rr===null?"—":`1:${fmt(rr)}`;
}
["riskBalance","riskPercent","riskEntry","riskStop","riskTarget"].forEach(id=>$(id).addEventListener("input",updateRiskCalc));
function exportBackup() {
  const data={app:"TradeLog",version:1,exportedAt:new Date().toISOString(),trades,answers};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`tradelog-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
  notify("Backup export started.");
}
$("exportBtn").addEventListener("click",exportBackup);$("exportSettings").addEventListener("click",exportBackup);
$("importFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!data||!Array.isArray(data.trades)||typeof data.answers!=="object")throw new Error("Invalid backup");
    if(!confirm(`Import ${data.trades.length} trade(s)? This replaces the current local journal.`))return;
    trades=data.trades;answers=data.answers||{};persist();renderDashboard();renderTrades();renderChecklist();notify("Backup imported.");
  }catch{notify("That file does not look like a valid TradeLog backup.");}
  e.target.value="";
});
$("clearData").addEventListener("click",()=>{
  if(confirm("Delete every trade and checklist answer from this device? Export a backup first if you need one.")){
    trades=[];answers={};persist();renderDashboard();renderTrades();renderChecklist();notify("Local journal cleared.");
  }
});
function init() {
  renderDashboard();renderTrades();renderChecklist();updateRiskCalc();
  $("storageStatus").textContent=`Saved locally on this device • ${trades.length} trade record(s)`;
  if("serviceWorker" in navigator && location.protocol!=="file:"){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
}
init();
