/* Regression checks — the logic v2 added.
   -------------------------------------------------------------------------------------------
   compare.js proves v2 still does what v1.3 did. This proves v2 still does what v2 decided: AUM at
   the stop, the one sizing rule, lot rounding, split stops, gear edits, group mode, the short
   block, the schema migrations. Every expected figure below was worked out by hand, and the case
   says how, so a failure points at a number you can dispute rather than a hash.

   RUN IT. The preview pane serves local files from a data: URL and cannot fetch, so compile a probe
   copy with this file inside it (the probe name is gitignored):

       py -I -c "
       import io
       h=io.open('_dev/v2-checks.js',encoding='utf-8').read()
       s=io.open('v2.html',encoding='utf-8').read(); i=s.rindex('<\/script>')
       io.open('_dev/_probe_checks.html','w',encoding='utf-8',newline='\n').write(s[:i]+h+s[i:])
       "

   Open the probe in the pane and call runChecks(). It returns {passed, failed:[...]}; an empty
   failed list is the pass. Delete the probe afterwards. The backslash in that closing tag is
   load-bearing -- see compare.js.

   It cannot damage a book. save() is replaced for the duration, confirm() answers yes, and the
   real root is put back in a finally. On the live page that still matters: never trust a harness
   that writes.

   Before trusting a clean run after changing this file, make it fail once on purpose -- e.g.
   patch riskAtStop to add a cent -- and see the AUM and heat cases go red. A check that cannot
   fail is not evidence of anything. */
(function(){

const D = 864e5;
let passed = 0, failed = [];
const same = (a, b) => (typeof b === "number" && typeof a === "number")
  ? Math.abs(a - b) < 1e-6 : JSON.stringify(a) === JSON.stringify(b);
function check(name, actual, expected){
  if(same(actual, expected)) passed++;
  else failed.push(name + ": got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected));
}

let seq = 0;
const T0 = () => Date.now() - 20*D;
const ev = (type, o, day) => Object.assign({type, ts: T0() + (day||0)*D + (seq++)}, o);
const trade = o => Object.assign({
  id: "k" + (seq++), ticker:"T", side:1, concept:"", tier:1, mult:0.5, rUnit:1000, aumAtOpen:100000,
  status:"open", last:50, plan:{}, checks:[], compounded:0, createdAt:T0(), lastMarkTs:Date.now()
}, o);
// One account, "Trading", $100,000, 1% R, defaults otherwise.
function book(trades, settings){
  root = newRoot();
  Object.assign(root.portfolios.Trading.settings, settings || {});
  root.portfolios.Trading.trades = trades || [];
  root.fcTier = 1;
  normalize();
  return root.portfolios.Trading;
}
// A group "G" of [name, book at cost, trades, account settings] members.
function group(members, groupSettings){
  root = newRoot(); root.portfolios = {}; root.order = [];
  members.forEach(([n, aum, trades, s])=>{
    root.portfolios[n] = defaults();
    root.portfolios[n].settings.aum = aum;
    Object.assign(root.portfolios[n].settings, s || {});
    root.portfolios[n].trades = trades || [];
    root.order.push(n);
  });
  const g = groupDefaults();
  g.members = members.map(m=>m[0]);
  Object.assign(g.settings, groupSettings || {});
  root.groups = {G:g}; root.order.push("G"); root.active = "G"; root.focus = null; root.fcTier = 1;
  normalize();
}
const setNT = (tk, P, S, q) => { $("nt_tk").value = tk; $("nt_entry").value = P; $("nt_stop").value = S; $("nt_qty").value = q==null ? "" : q; };
const clearFields = () => ["fc_price","fc_stop","nt_tk","nt_entry","nt_stop","nt_qty","nt_aptr"].forEach(id=>{ if($(id)) $(id).value = ""; });

const CASES = {

  /* AUM = book at cost less what every stop gives back. */
  aum(){
    const one = (side, events) => { book([trade({side, events})]); return aumOf("Trading"); };
    // 1000 sh at 50, stop 46: 100,000 - 1000 x 4
    check("aum long stop below", one(1, [ev("entry",{qty:1000, price:50, stop:46})]), 96000);
    // stop 52 locks 2 a share: 100,000 + 2,000
    check("aum long stop above", one(1, [ev("entry",{qty:1000, price:50, stop:52})]), 102000);
    // short 100 at 30, stop 33: 100,000 - 100 x 3
    check("aum short", one(-1, [ev("entry",{qty:100, price:30, stop:33})]), 99700);
    // 60 of 100 stopped at 48 (risk 120), 40 unstopped at a $0 stop (risk 2,000)
    check("aum part stopped", one(1, [ev("entry",{qty:100, price:50, stop:48}), ev("stop",{stops:[{qty:60, price:48}], price:50})]), 97880);
    // 500 unstopped at 50: the whole 25,000
    check("aum naked long", one(1, [ev("entry",{qty:500, price:50, stop:null})]), 75000);
    check("rUnit is 1% of aum", rUnitOf("Trading"), 750);
    // An unstopped short adds nothing -- there is no number -- and is counted as unprotected.
    check("aum naked short", one(-1, [ev("entry",{qty:100, price:30, stop:null})]), 100000);
    check("unprotected short", unprotected(["Trading"]), {long:0, short:100});
  },

  /* Split stops: risk per rung, uncovered long shares at $0. */
  stops(){
    const t = trade({events:[ev("entry",{qty:100, price:50, stop:48}), ev("stop",{stops:[{qty:60, price:48},{qty:40, price:46}], price:50})]});
    book([t]); let d = derive(t);
    check("split risk 60x2 + 40x4", riskAtStop(t, d), 280);
    check("split covers all", coverage(d), {covered:100, under:0, over:0});
    const u = trade({events:[ev("entry",{qty:100, price:50, stop:48}), ev("stop",{stops:[{qty:60, price:48}], price:50})]});
    book([u]); d = derive(u);
    check("part risk 60x2 + 40x50", riskAtStop(u, d), 2120);
    check("part coverage", coverage(d).under, 40);
  },

  /* tierSize: the largest count under each limit, or one step over inside fuzziness (10%). */
  sizing(){
    book();
    const q = (P, S, mult) => tierSize("Trading", P, P - S, mult).q;
    check("3.73 exact -> 4 (536 <= 550)",   q(1000, 866, 0.5), 4);
    check("10.2 exact -> 11 (539 <= 550)",  q(100, 50.98, 0.5), 11);
    check("3.4 exact -> 3 (4 = 588 > 550)", q(1000, 852.94, 0.5), 3);
    check("300.5 exact -> 301, never 330",  q(100, 98.336, 0.5), 301);
    book([], {maxAllocOn:true, maxAlloc:25});
    // risk wants 1,000; 25% of 100,000 at $50 is 500
    const z = tierSize("Trading", 50, 1, 1);
    check("max allocation caps", [z.q, z.walls], [500, ["max allocation"]]);
    book();
    // 0.01 stop wants 50,000 shares; a cash account's 100,000 buys 2,000 at $50
    const b = tierSize("Trading", 50, 50 - 49.99, 0.5);
    check("buying power caps", [b.q, b.walls], [2000, ["buying power"]]);
  },

  /* Lot rounding: the step becomes a lot. */
  lots(){
    book([], {lotOn:true, lotRound:100});
    const z = (P, S) => tierSize("Trading", P, P - S, 0.5);
    check("250 -> 200 (300 is 20% over)", z(50, 48).q, 200);
    check("295 -> 300 (508.5 <= 550)",    z(50, 48.305).q, 300);
    check("60 -> 0, said",                [z(50, 41.67).q, z(50, 41.67).walls], [0, ["lot size"]]);
    book([], {lotOn:false, lotRound:100});
    check("off -> 250", z(50, 48).q, 250);
    check("default lot is 1, off", [defaults().settings.lotOn, defaults().settings.lotRound], [false, 1]);
  },

  /* Send carries the selected tier's count, and New Trade sizes like the range. */
  handoff(){
    book(); render();
    $("fc_price").value = "50"; $("fc_stop").value = "48";
    [[0,"500"],[1,"250"],[2,"125"]].forEach(([i, want])=>{
      root.fcTier = i; renderFastCalc(); fcToNewTrade();
      check("send tier " + TIERS[i], $("nt_qty").value, want);
    });
    book(); root.tab = "new"; render();
    setNT("X", "1000", "866", "");
    check("blank shares = range cell (4)", newTradeCal(), 4);
    // Fast calc goes back to A after a trade opens.
    root.fcTier = 2; setNT("X", "50", "48", "10"); openTrade();
    check("tier back to A after open", root.fcTier, 1);
  },

  /* The gear: dates are validated, status follows the shares. */
  gear(){
    const t = trade({compounded:500, events:[ev("entry",{qty:200, price:50, stop:48}, 0), ev("trim",{qty:100, price:55}, 5)]});
    book([t]); render();
    editEvent(t.id, 1); $("m_date").value = ""; submitModal();
    check("blank date refused", $("m_err").textContent, "Enter a valid date.");
    closeModal();
    editEvent(t.id, 1); $("m_date").value = dateVal(T0() - 5*D); submitModal();
    check("date before entry refused", $("m_err").textContent, "Nothing can be dated before the entry.");
    closeModal();
    check("realised untouched", derive(t).realized, 500);

    // Deleting a trim from a closed trade leaves shares, so it reopens.
    const c = trade({status:"closed", closedAt:T0()+9*D, last:60,
      events:[ev("entry",{qty:200, price:50, stop:48}, 0), ev("trim",{qty:100, price:55}, 5), ev("close",{qty:100, price:60}, 9)]});
    c.compounded = derive(c).realized;
    book([c]); render();
    deleteEvent(c.id, 1); closeModal();
    check("closed trade holding shares reopens", [c.status, derive(c).Q], ["open", 100]);

    // Editing a trim up to the whole position closes an open trade.
    const o = trade({events:[ev("entry",{qty:200, price:50, stop:48}, 0), ev("trim",{qty:100, price:55}, 5)]});
    book([o]); render();
    editEvent(o.id, 1); $("m_q").value = "200"; submitModal(); closeModal();
    check("trim to zero closes", o.status, "closed");
  },

  /* Gear on a closed trade: legacy setup refiled, locked-at-open fields corrected. */
  closedGear(){
    const c = trade({status:"closed", closedAt:T0()+3*D, last:48, concept:"mean reversion", legacySetup:true,
      events:[ev("entry",{qty:500, price:50, stop:48}, 0), ev("close",{qty:500, price:48}, 3)]});
    c.compounded = derive(c).realized;
    book([c]); root.defs.setups = ["Breakout"]; root.tab = "tally"; render();
    toggleLog(c.id);
    check("gear shown when expanded", $("cg_" + c.id).style.display, "");
    gearUI(c.id); submitModal();
    check("unrelated save keeps legacy", [c.concept, !!c.legacySetup], ["mean reversion", true]);
    gearUI(c.id); $("g_setup").value = "Breakout"; $("g_r0").value = "900"; submitModal();
    check("refiled and 1R corrected", [c.concept, !!c.legacySetup, c.rUnit], ["Breakout", false, 900]);
    closeModal();
  },

  /* Groups open what the calculator quoted, and warn per account. */
  groups(){
    group([["Trading", 100000], ["Small", 37100]], {maxAllocOn:true, maxAlloc:10});
    root.tab = "new"; render();
    // Trading: risk 250, cap 10,000/50 = 200. Small: risk 93, cap 3,710/50 = 74.2 -> 75 (3,750 <= 4,081).
    $("fc_price").value = "50"; $("fc_stop").value = "48"; renderFastCalc();
    check("fast calc group A", $("fc_ans").querySelector('.fccell[data-tier="1"] .n').textContent, "275");
    check("shares box disabled", $("nt_qty").disabled, true);
    setNT("GRP", "50", "48", ""); openGroupTrade();
    check("group opens the quote", ["Trading","Small"].map(a=>root.portfolios[a].trades[0].events[0].qty), [200, 75]);

    // One 0.5R idea in four accounts is 0.5R of heat; one -1R idea is not a -4R streak.
    const leg = (gid, o) => trade(Object.assign({gid}, o));
    group(["A","B","C","D"].map(n=>[n, 100000, [
      leg("go", {events:[ev("entry",{qty:250, price:50, stop:48})]}),
      leg("gx", {status:"closed", closedAt:T0()+2*D, last:48, compounded:-1000,
        events:[ev("entry",{qty:500, price:50, stop:48}, 0), ev("close",{qty:500, price:48}, 2)]})
    ]]));
    root.tab = "portfolio"; render();
    check("group heat per account", $("bookBar").querySelector(".metric .v").textContent, "0.50R");
    check("no cold streak from one idea", /closed trades/.test($("bookBanners").textContent), false);
  },

  /* Group split stops: a percentage of each leg, remainder to the last rung. */
  groupStops(){
    check("50/50 of 500", legStops(500, [{pct:50, price:49},{pct:50, price:47}]).map(s=>s.qty), [250, 250]);
    check("33/33/34 of 101", legStops(101, [{pct:33, price:49},{pct:33, price:48},{pct:34, price:47}]).map(s=>s.qty), [33, 33, 35]);
    check("single blank = whole position", legStops(80, [{pct:null, price:49}]), [{qty:null, price:49}]);
  },

  /* An unstopped short blocks new trades by default; Warn lets them open. */
  shortBlock(){
    const s = trade({side:-1, last:30, events:[ev("entry",{qty:100, price:30, stop:null})]});
    const pf = book([s]); root.tab = "new"; render();
    setNT("NEW", "50", "48", "10"); openTrade();
    check("blocked", pf.trades.length, 1);
    pf.settings.shortGuard = "warn"; render();
    setNT("NEW", "50", "48", "10"); openTrade();
    check("warn opens", pf.trades.length, 2);
  },

  /* Manual marks: one price per symbol, every account holding it. */
  marks(){
    group([["A", 100000, [trade({ticker:"AAA", events:[ev("entry",{qty:10, price:50, stop:48})]})]],
           ["B", 100000, [trade({ticker:"AAA", events:[ev("entry",{qty:20, price:50, stop:48})]}),
                          trade({ticker:"BBB", last:10, events:[ev("entry",{qty:5, price:10, stop:9})]})]]]);
    root.finnhub = ""; render();
    updateMarks();
    check("symbols alphabetised", [...$("modalBody").querySelectorAll("tr b")].map(b=>b.textContent), ["AAA","BBB"]);
    $("mk_0").value = "55"; submitModal();
    check("AAA marked in both accounts", ["A","B"].map(a=>root.portfolios[a].trades[0].last), [55, 55]);
    check("BBB left as it was", root.portfolios.B.trades[1].last, 10);
  },

  /* Schema 1 -> 4 on a v1 book that never compounded and typed its setups freehand. */
  migration(){
    const closedT = trade({id:"m1", status:"closed", closedAt:T0()+3*D, concept:"mean reversion", adr:6, adrAtOpen:6, compounded:0,
      events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:60}, 3)]});
    const openT = trade({id:"m2", concept:"Breakout", compounded:0,
      events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("trim",{qty:50, price:55}, 2)]});
    delete closedT.aptr; delete openT.aptr;
    root = { v:1, active:"Main", order:["Main"], groups:{}, portfolios:{ Main:{ cashFlows:[],
      settings:{aum:100000, rPct:1, tiers:[1,0.5,0.25], compound:false, marginX:1, heatCap:5, coldR:3, setups:["Breakout"]},
      trades:[closedT, openT] } } };
    normalize();
    const pf = root.portfolios.Main;
    check("schema 4", root.v, 4);
    check("ADR carried to APTR", [closedT.aptr, closedT.aptrAtOpen, "adr" in closedT], [6, 6, false]);
    check("setups merged to one list", root.defs.setups, ["Breakout"]);
    check("freehand setup is Legacy", [!!closedT.legacySetup, !!openT.legacySetup], [true, false]);
    // Compounding was off: the backlog is marked banked, so nothing lands in equity at once.
    check("no backlog dumped", [closedT.compounded, openT.compounded, pf.settings.aum], [1000, 250, 100000]);
    openT.events.push(ev("trim", {qty:25, price:56}, 4));
    syncCompound(openT, "Main");
    check("next trim folds in only itself (25 x 6)", pf.settings.aum, 100150);
  },

  /* New Trade warns when typed shares leave the tier's fuzziness or the allocation limits. */
  ntWarnings(){
    book([], {maxAllocOn:true, maxAlloc:25, minAllocOn:true, minAlloc:2});
    root.tab = "new"; render();
    const warn = q => { setNT("X", "50", "48", q); newTradeCal(); return $("nt_warn").innerText; };
    // Tier A budget $500 at $2 a share: 250 shares is exactly 0.50R and 12.5% allocation.
    check("in range, no warning", warn("250"), "");
    check("400 sh = 0.80R", warn("400"), "Risk 0.80R against the 0.5R tier, outside 10%");
    check("600 sh = 1.20R and 30%", warn("600").split("\n"), ["Risk 1.20R against the 0.5R tier, outside 10%", "Allocation 30.0% over the 25% max"]);
    check("10 sh = 0.02R and 0.5%", warn("10").split("\n"), ["Risk 0.02R against the 0.5R tier, outside 10%", "Allocation 0.5% under the 2% min"]);   // 10 x $50 = $500 of $100,000
    check("270 sh = 0.54R, inside 10%", warn("270"), "");
  },

  /* Plan fields and notes from New Trade land on the trade. */
  ntPlanNotes(){
    const pf = book(); root.tab = "new"; render();
    setNT("PLN", "50", "48", "10");
    $("nt_cut").value = "loses 20d"; $("nt_wait").value = "holds 50d"; $("nt_exit").value = "trail 10d"; $("nt_notes").value = "earnings Thu";
    openTrade();
    const t = pf.trades[0];
    check("plan written", t.plan, {cutIf:"loses 20d", waitIf:"holds 50d", exit:"trail 10d"});
    check("notes written", t.notes, "earnings Thu");
    check("form cleared", [$("nt_cut").value, $("nt_notes").value], ["", ""]);
  },

  /* Built-in loss tags: on by use, locked into the list, wired to their tiles. */
  builtinTags(){
    book();
    check("fresh book: violation on, noise off", root.defs.builtins, {noise:false, violation:true});
    check("offered tags", lossTags().map(o=>o.v), ["violation"]);
    // A book that already used the noise tag on a trade gets it switched on.
    const c = trade({status:"closed", closedAt:T0()+2*D, last:48, lossTag:"noise",
      events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:48}, 2)]});
    root = { v:4, active:"Main", order:["Main"], groups:{}, defs:{lossTags:[{v:"violation", t:"Rule Violation"}, {v:"late", t:"Late entry"}]},
             portfolios:{ Main:{ cashFlows:[], settings:defaults().settings, trades:[c] } } };
    normalize();
    check("noise on because used", root.defs.builtins.noise, true);
    // v1's third tag, in use but never stored, comes back as an ordinary tag rather than retired.
    const inv = trade({status:"closed", closedAt:T0()+2*D, last:48, lossTag:"invalidation",
      events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:48}, 2)]});
    root = { v:1, active:"Main", order:["Main"], groups:{}, portfolios:{ Main:{ cashFlows:[], settings:defaults().settings, trades:[inv] } } };
    normalize();
    check("Thesis broken restored", lossTags().map(o=>o.t), ["Rule violation", "Thesis broken"]);
    root = { v:4, active:"Main", order:["Main"], groups:{}, defs:{lossTags:[{v:"violation", t:"Rule Violation"}, {v:"late", t:"Late entry"}]},
             portfolios:{ Main:{ cashFlows:[], settings:defaults().settings, trades:[c] } } };
    normalize();
    check("built-in absorbed from the user list", root.defs.lossTags.map(o=>o.v), ["late"]);
    check("offered: built-ins then user's", lossTags().map(o=>o.v), ["noise","violation","late"]);
    // A typed tag that slugs to a built-in key gets its own key instead.
    root.tab = "settings"; render();
    $("s_lossTags").value = "Late entry\nNoise"; $("s_lossTags").dispatchEvent(new Event("change"));
    check("typed Noise kept separate", root.defs.lossTags.map(o=>o.v), ["late","noise-own"]);
    root.tab = "tally"; render();
    const tiles = [...$("stats").querySelectorAll(".metric .k")].map(k=>k.textContent);
    check("both tiles shown", ["Noise stopouts","Rule violations"].every(k=>tiles.indexOf(k)>=0), true);
    root.defs.builtins.noise = false; render();
    check("noise tile hidden when off", [...$("stats").querySelectorAll(".metric .k")].some(k=>k.textContent==="Noise stopouts"), false);
  },

  /* Binary colour, gray inside the scratch band (-0.05R to +0.10R by default). */
  colours(){
    book();
    check("scratch is gray", [clsR(0.05), clsR(-0.04), clsR(0.10)], ["flat","flat","flat"]);
    check("outside is green or red", [clsR(0.5), clsR(-0.5), clsR(0.11)], ["pos","neg","pos"]);
    root.ui.colourGrade = false;
    check("colour off is plain", clsR(0.5), "");
    root.ui.colourGrade = true;
  },

  /* Average until the position has been added to or trimmed, break-even after. */
  avgVsBe(){
    const t = trade({events:[ev("entry",{qty:10, price:10, stop:9})]});
    book([t]);
    let d = derive(t);
    check("untouched says average", avgOrBe(t, d), "average <b>$10.00</b>");
    check("buy 10 at $20 previews break-even $15", /break-even <b>\$15\.00<\/b>/.test(addNote(t, d, 20, 10, "Trading")), true);
    t.events.push(ev("trim", {qty:5, price:12}, 1)); d = derive(t);
    // 5 left at avg 10 with $10 banked: break-even 10 - 10/5 = 8
    check("trimmed says break-even", avgOrBe(t, d), "break-even <b>$8.00</b>");
  },

  /* Labels in the dense places carry their explainer as a mouseover. */
  tips(){
    const t = trade({events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([t]); root.tab = "portfolio"; render();
    const th = [...document.querySelectorAll("#openTrades th")].find(x=>x.textContent==="Cash at risk");
    check("column header has its explainer", !!(th && th.title && th.classList.contains("tipped")), true);
  },

  /* "Stops loaded" pads a position's Stop button with blank rows, and nothing else. */
  stopsLoaded(){
    const t = trade({events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([t]); render();
    check("default is 1", root.ui.stopCount, 1);
    root.ui.stopCount = 3;
    stopUI(t.id);
    const rows = readStopRows();
    check("3 rows, current stop first", rows, [{q:"", p:"48"}, {q:"", p:""}, {q:"", p:""}]);
    submitModal();
    check("blank rows dropped on save", derive(t).stops, [{qty:null, price:48}]);
    // The group Stop button ignores it.
    group([["A", 100000, [trade({gid:"gs", events:[ev("entry",{qty:100, price:50, stop:null})]})]]]);
    root.ui.stopCount = 3;
    gStopUI("gs");
    check("group stop ignores it", readStopRows().length, 1);
    closeModal();
  },

  /* Small things that each broke once. */
  misc(){
    book();
    root.ui.hideValues = true;
    check("hidden money is plain characters", fmt$(5), "···");
    root.ui.hideValues = false;
    const t = trade({events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([t]); render();
    buyUI(t.id); closeModal();
    check("no stale input handler", $("modalBody").oninput, null);
  }
};

window.runChecks = () => {
  passed = 0; failed = [];
  const keep = root, realSave = save, realConfirm = window.confirm, realAlert = window.alert;
  save = () => true;
  window.confirm = () => true; window.alert = () => {};
  try{
    for(const [name, fn] of Object.entries(CASES)){
      try{ fn(); }catch(e){ failed.push(name + " threw: " + e.message); }
    }
  } finally {
    closeModal(); clearFields();
    root = keep; normalize();
    save = realSave; window.confirm = realConfirm; window.alert = realAlert;
    render();
  }
  return {passed, failed};
};

})();
