let refreshing = false;
async function refreshMarks(){
  if(refreshing) return;
  const key = state.settings.finnhub;
  const open = state.trades.filter(t=>t.status==="open");
  const st = $("refreshStatus");
  if(!key){ st.textContent = "Add a free Finnhub key (finnhub.io/register) to pull live marks. Everything else works without it."; return; }
  if(!open.length){ st.textContent = "No open trades to refresh."; return; }
  refreshing = true;
  st.textContent = "Refreshing "+open.length+" ticker(s)…";
  const results = [];
  for(const t of open){
    try{
      const res = await fetch("https://finnhub.io/api/v1/quote?symbol="+encodeURIComponent(t.ticker)+"&token="+encodeURIComponent(key));
      if(!res.ok) throw new Error("HTTP "+res.status);
      const j = await res.json();
      if(j && typeof j.c==="number" && j.c>0){ t.last = j.c; t.lastMarkTs = Date.now(); results.push(t.ticker+" "+fmtP(j.c)); }
      else results.push(t.ticker+": no quote");
    }catch(err){ results.push(t.ticker+": failed"); }
  }
  save(); render();
  const blocked = results.filter(r=>/failed$/.test(r)).length === results.length;
  $("refreshStatus").textContent = "Marks as of "+new Date().toLocaleTimeString()+" — "+results.join(" · ") +
    (blocked ? "  Every request failed. If you're viewing this inside a sandboxed preview, outside connections are blocked there — open the hosted page or the local file and it will work. Otherwise check the key." : "");
  refreshing = false;
}

/* --- and the boot-time poller that drove it ---
if(state.settings.finnhub && state.trades.some(t=>t.status==="open")) refreshMarks();
setInterval(()=>{
  const ae = document.activeElement;
  if(ae && (ae.tagName==="INPUT" || ae.tagName==="TEXTAREA")) return;
  if(state.settings.finnhub && state.trades.some(t=>t.status==="open")) refreshMarks();
}, 60000);

--- markup it needed, inside the desk card ---
<div style="min-width:200px"><label for="fhkey">Live marks &mdash; Finnhub key (optional)</label>
  <input id="fhkey" type="text" placeholder="free key from finnhub.io"></div>
<button class="small" id="refreshBtn">Refresh marks</button>
<div class="hint" id="refreshStatus"></div>

--- bindings ---
$("fhkey").addEventListener("change", e=>{ state.settings.finnhub = e.target.value.trim(); save(); });
$("refreshBtn").addEventListener("click", refreshMarks);

--- settings key ---  finnhub:""  in defaults()
*/
