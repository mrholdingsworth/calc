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
       s=io.open('v2.html',encoding='utf-8').read(); i=s.rindex('</'+'script>')
       io.open('_dev/_probe_checks.html','w',encoding='utf-8',newline='\n').write(s[:i]+h+s[i:])
       "

   Open the probe in the pane and call runChecks(). It returns {passed, failed:[...]}; an empty
   failed list is the pass. Delete the probe afterwards. The tag is split in two because this
   comment ends up inside the page's script, where a whole closing tag would end it -- see
   compare.js. (It was written '<\/script>', which Python reads literally and never finds.)
   From Git Bash, never pass an argument that starts with // -- MSYS rewrites it to /.

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
    check("no backlog dumped", [closedT.compounded, openT.compounded, bookOf("Main")], [1000, 250, 100000]);
    // The stored total became a starting figure worked back from it: 100,000 less 1,250 realised.
    check("initial capital worked back", [pf.settings.initialCapital, pf.settings.initialEstimated, "aum" in pf.settings], [98750, true, false]);
    openT.events.push(ev("trim", {qty:25, price:56}, 4));
    syncCompound(openT, "Main");
    check("next trim folds in only itself (25 x 6)", bookOf("Main"), 100150);
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
    // The tiles live on Statistics only now, which needs two trades to draw; read the tile row direct.
    const tiles = () => { const d = document.createElement("div");
      d.innerHTML = statsHtml(bookStats(state.trades.filter(t=>t.status==="closed")));
      return [...d.querySelectorAll(".metric .k")].map(k=>k.textContent); };
    check("both tiles shown", ["Noise stopouts","Rule violations"].every(k=>tiles().indexOf(k)>=0), true);
    root.defs.builtins.noise = false;
    check("noise tile hidden when off", tiles().indexOf("Noise stopouts")>=0, false);
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

  /* Buying power: cash accounts at cost, margin accounts at the mark. */
  buyingPowerBasis(){
    const t = trade({last:60, events:[ev("entry",{qty:100, price:50, stop:48})]});
    const pf = book([t]);
    check("cash account uses cost (100 x 50)", bpUsed("Trading"), 5000);
    pf.settings.marginOn = true; pf.settings.marginX = 2;
    check("margin account uses the mark (100 x 60)", bpUsed("Trading"), 6000);
  },

  /* The book is initial capital plus every record; adjustments match the broker. */
  initialCapital(){
    const c = trade({status:"closed", closedAt:T0()+3*D, last:65, events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:65}, 3)]});
    const o = trade({last:22, events:[ev("entry",{qty:200, price:20, stop:19}, 4)]});
    const pf = book([c, o], {initialCapital:94734.56});
    pf.cashFlows.push({type:"deposit", amount:5000, ts:T0(), aumAfter:0});
    // 94,734.56 + 5,000 deposited + 1,500 realised
    check("book from records", bookOf("Trading"), 101234.56);
    // cash = book less the 200 x 20 the open position cost
    check("app cash", appCash("Trading"), 97234.56);
    root.tab = "portfolio"; render();
    openCash("Trading", "adjust"); $("adjBroker").value = "97234.59"; submitModal();
    check("broker cash 0.03 higher adjusts by +0.03", [pf.cashFlows[1].type, pf.cashFlows[1].amount, bookOf("Trading")], ["adjust", 0.03, 101234.59]);
    undoCash("Trading", 1);
    check("adjustment removable", bookOf("Trading"), 101234.56);
  },

  /* Estimated tax: FIFO lots, holding period, shorts, wash sales, netting, the disclaimer. */
  tax(){
    const d = s => new Date(s+"T12:00:00").getTime();
    const E = (type, qty, price, s) => ({type, qty, price, stop: type==="entry" ? price*0.9 : undefined, ts:d(s)});
    const T = (ticker, side, events, status) => trade({ticker, side, status:status||"closed", events, last:events[events.length-1].price, closedAt:events[events.length-1].ts});
    const year = () => taxReport(2026).Trading;
    const pf = book([
      T("AAA", 1, [E("entry",100,50,"2026-03-01"), E("close",100,60,"2026-05-01")]),      // ST +1,000
      T("BBB", 1, [E("entry",100,20,"2025-01-10"), E("close",100,30,"2026-03-01")])       // LT +1,000
    ], {taxOn:true});
    check("ST 1,000 at 22% + LT 1,000 at 15%", [year().st, year().lt, year().tax], [1000, 1000, 370]);
    pf.trades.push(T("CCC", 1, [E("entry",100,50,"2026-06-01"), E("close",100,40,"2026-06-10")]));   // -1,000
    check("a loss nets against short-term", [year().st, year().tax], [0, 150]);
    pf.trades.push(T("CCC", 1, [E("entry",100,42,"2026-06-20")], "open"));
    check("bought back in 10 days: loss disallowed", [year().st, year().washed], [1000, 1000]);
    pf.trades[3].events.push(E("close",100,45,"2026-07-01")); pf.trades[3].status = "closed";
    // replacement gains 300 on price, less the 1,000 carried into its basis: -700
    check("replacement sold: the loss returns", [year().st, Math.round(year().tax*100)/100], [300, 216]);
    book([T("BBB", 1, [E("entry",100,20,"2025-01-10"), E("close",100,30,"2026-03-01")]),
          T("CCC", 1, [E("entry",100,50,"2026-06-01"), E("close",100,40,"2026-06-10")])], {taxOn:true});
    check("short-term loss nets against long-term gain", year().tax, 0);
    book([T("SSS", -1, [E("entry",100,50,"2025-01-01"), E("close",100,40,"2026-02-01")]),
          T("FFF", 1, [E("entry",100,10,"2026-01-05"), E("add",100,20,"2026-02-05"), E("trim",100,25,"2026-03-05")], "open")]);
    // the short is short-term after 13 months; the trim sells the $10 lot first: 1,000 + 1,500
    check("shorts short-term, trims FIFO", [year().st, year().lt], [2500, 0]);

    // The disclaimer: Cancel leaves it off; Accept records when; later accounts skip it; a typed flag fails.
    book(); root.portfolios.Two = defaults(); root.order.push("Two"); normalize(); root.tab = "settings"; render();
    const tick = () => { $("s_taxOn").checked = true; $("s_taxOn").dispatchEvent(new Event("change")); };
    tick(); closeModal(); render();
    check("cancel leaves it off", [!!root.portfolios.Trading.settings.taxOn, !!root.taxAck], [false, false]);
    tick(); submitModal();
    check("accept switches it on and records when", [taxOn("Trading"), !!(root.taxAck && root.taxAck.at && root.taxAck.k)], [true, true]);
    switchTab("Two"); root.tab = "settings"; render(); tick();
    check("next account needs no second accept", [taxOn("Two"), $("modal").style.display === "flex"], [true, false]);
    root.taxAck = {at:"2026-01-01", k:"true"};
    check("a hand-typed acceptance is refused", taxAccepted(), false);
  },

  /* Every show/hide item matches something on its panel, hides when off and shows when on. A
     tag mistyped in a renderer, or a registry entry nothing carries, fails here by name. */
  panels(){
    const t = o => trade(Object.assign({concept:"x", plan:{cutIf:"c"}, notes:"n", aptr:5, checks:[true,true,true,true]}, o));
    const pf = book([
      t({events:[ev("entry",{qty:100, price:50, stop:48}, 15)]}),
      t({status:"closed", closedAt:T0()+18*D, last:48, lossTag:"noise", events:[ev("entry",{qty:100, price:50, stop:48}, 15), ev("close",{qty:100, price:48}, 18)]}),
      t({status:"closed", closedAt:T0()+19*D, last:55, events:[ev("entry",{qty:100, price:50, stop:48}, 16), ev("close",{qty:100, price:55}, 19)]})
    ], {taxOn:true});
    root.defs.builtins.noise = true;
    const at = new Date().toISOString(); root.taxAck = {at, k:ackCode(at)};
    rowOpen[pf.trades[0].id] = true;
    const tab = k => /^p[rds]-/.test(k) ? "portfolio" : k.startsWith("ct-") ? "tally" : /^s[tc]-/.test(k) ? "charts" : k.startsWith("nt-") ? "new" : "portfolio";
    const live = item => [...document.querySelectorAll(item[2] || ".v-"+item[0])].filter(e=>e.closest(".tabpane.on, #topbar"));
    const paint = k => { root.tab = tab(k); render(); if(k.startsWith("fc-")){ $("fc_price").value = "50"; $("fc_stop").value = "48"; renderFastCalc(); } };
    SHOWABLE.flatMap(([,items])=>items).forEach(item=>{
      const k = item[0];
      root.ui.hidden = {}; paint(k);
      const on = live(item);
      check("show "+k+": matches and visible", on.length>0 && on.some(e=>getComputedStyle(e).display!=="none"), true);
      root.ui.hidden[k] = true; paint(k);
      check("show "+k+": hidden when off", live(item).every(e=>getComputedStyle(e).display==="none"), true);
    });
    root.ui.hidden = {};
    rowOpen = {};
  },

  /* Closed Trades: newest close first, a read-only log, delete only in the gear, dates and fills,
     the review fixed at 30 days, one period over both tabs, and group R never summed. */
  closedPass(){
    const mk = (tk, o, c, extra) => trade(Object.assign({ticker:tk, status:"closed", closedAt:T0()+c*D, last:55,
      events:[ev("entry",{qty:100, price:50, stop:48}, o), ev("close",{qty:100, price:55}, c)]}, extra||{}));
    const tks = () => [...$("closedTbl").rows].filter(r=>r.querySelector("td.tickcell"))
      .map(r=>r.querySelector("td.tickcell").textContent.replace(/[^A-Z]/g,""));
    // AAA ran longest: opened first, closed last. In opened order it sat at the bottom.
    const A = mk("AAA", 0, 10), B = mk("BBB", 2, 4), C = mk("CCC", 5, 6);
    book([C, B, A]); root.tab = "tally"; render();
    check("newest close first", tks(), ["AAA","CCC","BBB"]);
    check("no tile row on Closed Trades", $("stats"), null);
    check("no delete on the row", $("closedTbl").querySelector("button.danger"), null);
    toggleLog(A.id);
    check("log is read-only", !!$("log_"+A.id).querySelector("input, [onclick*='EventDate']"), false);
    gearUI(A.id);
    const del = [...$("modalBody").querySelectorAll("button.danger")].find(b=>b.textContent==="Delete trade");
    check("delete is in the gear", !!del, true);
    if(del) del.click();
    check("deleted, gear closed", [state.trades.some(t=>t.id===A.id), $("modal").style.display], [false, "none"]);

    // 100 @ 50 and 100 @ 52 in: avg entry 51. 100 @ 55 and 100 @ 57 out: avg exit 56.
    const F = trade({ticker:"FFF", status:"closed", closedAt:T0()+9*D, last:57,
      events:[ev("entry",{qty:100, price:50, stop:48}, 1), ev("add",{qty:100, price:52}, 2),
              ev("trim",{qty:100, price:55}, 5), ev("close",{qty:100, price:57}, 9)]});
    book([F]); root.tab = "tally"; render();
    const cell = k => $("closedTbl").querySelector("td.v-ct-"+k).textContent;
    check("opened, closed, days", [cell("opened"), cell("closed"), cell("days")], [shortDate(T0()+D), shortDate(T0()+9*D), "8"]);
    check("avg entry, avg exit", [cell("entry"), cell("exit")], [fmtP(51), fmtP(56)]);
    // Re-dating the close from the gear has to move the trade's close date with it.
    editEvent(F.id, F.events.length-1); $("m_date").value = dateVal(T0()+12*D); submitModal(); closeModal();
    check("close date follows the re-dated close", dayOf(F.closedAt), dayOf(T0()+12*D));
    // Never a negative duration: the gear is the one place a date changes, and it refuses an entry
    // dated after the close and a close (or any later transaction) dated before the entry.
    const before = F.events.map(e=>e.ts), refused = (i, day) => {
      editEvent(F.id, i); $("m_date").value = dateVal(T0()+day*D); submitModal();
      const err = $("m_err").textContent; closeModal(); return !!err;
    };
    check("entry after the close refused", refused(0, 13), true);
    check("close before the entry refused", refused(F.events.length-1, 0), true);
    check("trim before the entry refused", refused(2, 0), true);
    check("refusals change nothing", [F.events.map(e=>e.ts), dayOf(F.closedAt)], [before, dayOf(T0()+12*D)]);
    check("opened on or before closed", stats(F).openTs <= stats(F).endTs, true);

    // A fixed one-month post-mortem. The old setting is dropped on load and changes nothing.
    const n = new Date(), ago = k => new Date(n.getFullYear(), n.getMonth(), n.getDate()-k, 12).getTime();
    book([]); root.defs.reviewDays = 5; normalize();
    check("review setting gone", root.defs.reviewDays === undefined, true);
    check("due at 30 days, not 29", [reviewDue(mk("R", 0, 0, {closedAt:ago(29)})), reviewDue(mk("R", 0, 0, {closedAt:ago(30)}))], [false, true]);

    // 90 days is today and the 89 before it. YTD starts on 1 January.
    book([mk("OLD",0,0,{closedAt:ago(95)}), mk("NEW",0,0,{closedAt:ago(5)}), mk("EDG",0,0,{closedAt:ago(89)}),
          mk("LYR",0,0,{closedAt:new Date(n.getFullYear()-1, 11, 31, 12).getTime()})]);
    root.tab = "tally";
    const per = p => { root.ui.period = p; render(); return tks().sort(); };
    check("all", per("all"), ["EDG","LYR","NEW","OLD"]);
    check("last 90 days", per("90d"), ["EDG","NEW"]);
    check("Statistics cut the same", chartTrades().map(t=>t.ticker).sort(), ["EDG","NEW"]);
    check("YTD drops last year", per("ytd").indexOf("LYR"), -1);
    check("one picker on each tab", document.querySelectorAll(".periodPick select").length, 2);
    root.ui.period = "all";

    // Two accounts, each lose exactly 1R of their own: $1,000 of 1,000 and $500 of 500. Summed it
    // would read -2R, which is no account's result.
    const leg = rU => trade({gid:"g1", ticker:"GRP", status:"closed", closedAt:T0()+3*D, rUnit:rU, last:48,
      events:[ev("entry",{qty:rU/2, price:50, stop:48}, 0), ev("close",{qty:rU/2, price:48}, 3)]});
    group([["A1", 100000, [leg(1000)]], ["B1", 50000, [leg(500)]]]);
    root.tab = "tally"; render();
    const sm = $("closedSummary").textContent;
    check("group header: each account's R, not the sum", [sm.split(fmtR(-1)).length-1, sm.indexOf(fmtR(-2))>=0], [2, false]);
    check("no delete on the group line", $("closedTbl").rows[1].querySelector("button.danger"), null);
    check("whole-trade delete inside the expansion", !!$("log_g1").querySelector("button.danger"), true);
  },

  /* Statistics: the equity curve is the book, legacy setups split by name, the stale parts gone. */
  statsPass(){
    // $100,000 initial, $5,000 deposited on day 3, a close for +$700 (100 x 7) and a trim on a
    // still-open trade for +$200 (50 x 4): the book is $105,900.
    const c = trade({status:"closed", closedAt:T0()+6*D, last:57, concept:"Breakout", legacySetup:true, checks:[true,true,true,true],
      events:[ev("entry",{qty:100, price:50, stop:48}, 4), ev("close",{qty:100, price:57}, 6)]});
    const o = trade({events:[ev("entry",{qty:100, price:50, stop:48}, 1), ev("trim",{qty:50, price:54}, 8)]});
    const pf = book([c, o], {initialCapital:100000});
    pf.cashFlows = [{type:"deposit", amount:5000, ts:T0()+3*D}];
    const BC = bookCurve("Trading", null);
    check("book is 105,900", bookOf("Trading"), 105900);
    check("curve opens on initial capital", BC.eq[0].y, 100000);
    check("curve ends on the book", BC.eq[BC.eq.length-1].y, bookOf("Trading"));
    // From day 5 on: the deposit folds into the opening figure, both realisations fall inside.
    const BP = bookCurve("Trading", T0()+5*D);
    check("period opens on the book at its start", BP.base, 105000);
    check("P/L % over the period", BP.pct[BP.pct.length-1].y, 900/105000*100);

    const c2 = trade({status:"closed", closedAt:T0()+7*D, last:47, concept:"Pullback", legacySetup:true, checks:[true,true,true,true],
      events:[ev("entry",{qty:100, price:50, stop:48}, 5), ev("close",{qty:100, price:47}, 7)]});
    const c3 = trade({status:"closed", closedAt:T0()+8*D, last:52, concept:"Breakout",
      events:[ev("entry",{qty:100, price:50, stop:48}, 6), ev("close",{qty:100, price:52}, 8)]});
    book([c, c2, c3]); root.defs.setups = ["Breakout"]; root.tab = "charts"; render();
    const keys = [...$("conceptTbl").rows].slice(1).map(r=>r.cells[0].textContent.replace(/\s*small n$/,""));
    check("legacy split by original name", keys.sort(), ["Breakout","Legacy: Breakout","Legacy: Pullback"]);
    check("no Planned at entry tile", $("stats2").textContent.indexOf("Planned at entry"), -1);
    check("duplicate P/L charts gone", [$("plTrades"), $("plTime")], [null, null]);
  },

  /* Unrealized gains are opt-in; the noise check is gone; anything outside fuzziness is amber. */
  unrealNoiseFuzz(){
    // 100 @ 50, marked at 53: $300 open.
    const t = trade({aptr:3, last:53, events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([t]); root.tab = "portfolio"; render();
    const tile = () => [...document.querySelectorAll("#pane-portfolio .metric")].find(m=>m.querySelector(".k").textContent==="Unrealized gains");
    check("unrealized off by default", [root.ui.unrealOn, !!tile()], [false, false]);
    root.tab = "settings"; render();
    $("s_unrealOn").checked = true; $("s_unrealOn").dispatchEvent(new Event("change"));
    root.tab = "portfolio"; render();
    check("switched on in Settings", [root.ui.unrealOn, tile() && tile().querySelector(".v").textContent], [true, fmt$(300)]);

    check("noise check gone", [$("s_noiseOn"), $("s_aptrFloor"), typeof aptrAudit], [null, null, "undefined"]);
    root.defs.aptrFloor = 1.5; root.portfolios.Trading.settings.noiseOn = true; normalize();
    check("its settings dropped on load", [root.defs.aptrFloor === undefined, root.portfolios.Trading.settings.noiseOn === undefined], [true, true]);
    rowOpen[t.id] = true; render();
    check("daily vol states the movement only", document.querySelector(".v-pd-vol .v").textContent, "3%");
    rowOpen = {};

    // Tier A is $500 at $2 a share: 250 shares is on budget, 300 is 0.60R, 20% over.
    book([], {minAllocOn:true, minAlloc:2}); root.tab = "new"; render();
    const nt = q => { setNT("X", "50", "48", q); newTradeCal(); };
    const riskTile = () => [...$("nt_calsub").querySelectorAll(".metric")].find(m=>m.querySelector(".k").textContent==="Risk taken").querySelector(".v");
    const isAmber = el => /--amber/.test(el.getAttribute("style")||"");
    nt("250");
    check("on budget: not amber", [isAmber(riskTile()), isAmber($("nt_calans").querySelector("b"))], [false, false]);
    nt("300");
    check("outside fuzziness: amber", [isAmber(riskTile()), isAmber($("nt_calans").querySelector("b")), $("nt_warn").getAttribute("style").indexOf("--amber")>=0], [true, true, true]);
    // 10 x $50 is 0.5% of $100,000, under the 2% minimum.
    nt("10");
    const cost = [...$("nt_calsub").querySelectorAll(".metric")].find(m=>m.querySelector(".k").textContent==="Cost").querySelector(".v");
    check("under the minimum: cost amber", isAmber(cost), true);

    // Fast calc: B is 125 shares, $6,250, 6.25% -- under a 7% minimum by more than fuzziness.
    book([], {minAllocOn:true, minAlloc:7}); root.tab = "new"; render();
    $("fc_price").value = "50"; $("fc_stop").value = "48"; renderFastCalc();
    const cellB = $("fc_ans").querySelector('.fccell[data-tier="2"] .n');
    check("under-min size amber", [cellB.textContent, /--amber/.test(cellB.getAttribute("style"))], ["125", true]);
    clearFields();

    // A group member under its minimum is named, in amber.
    group([["Trading", 100000], ["Small", 37100]], {minAllocOn:true, minAlloc:40});
    root.tab = "new"; render();
    setNT("GRP", "50", "48", ""); renderGroupNewTrade();
    const line = [...$("nt_vol").querySelectorAll("span")].find(sp=>sp.textContent.startsWith("Under the minimum allocation"));
    check("group under-min line", !!line && /--amber/.test(line.getAttribute("style")) && line.textContent.indexOf("Trading")>=0, true);
    clearFields();
  },

  /* A book from anywhere else can't run code, a bad file can't replace the book, two tabs can't
     overwrite each other, the key stays out of backups, and typed text survives a redraw. */
  safety(){
    const lose = (o) => trade(Object.assign({status:"closed", closedAt:T0()+2*D, last:48,
      events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:48}, 2)]}, o||{}));
    // Loss tags are text, never markup.
    const L = lose();
    book([L]); root.defs.lossTags = [{v:'x"><b>', t:"<b>bold</b>"}]; root.tab = "tally"; render();
    const opt = [...$("closedTbl").querySelectorAll("select option")].find(o=>o.textContent.indexOf("bold")>=0);
    check("loss tag shown as text", [opt && opt.textContent, $("closedTbl").querySelectorAll("select b").length], ["<b>bold</b>", 0]);

    // IDs that could close a handler's quote are replaced; a group's legs keep one shared gid.
    const a = lose({id:"a');x('", gid:"g'1"}), b = lose({id:"9", gid:"g'1"});
    group([["A1", 100000, [a]], ["B1", 100000, [b]]]);
    check("unsafe ids replaced", [SAFE_ID.test(a.id), b.id, SAFE_ID.test(a.gid), a.gid===b.gid], [true, "9", true, true]);

    // A file that fails half way leaves the book exactly as it was, unsaved.
    const keepT = lose({ticker:"KEEP"});
    book([keepT]); root.finnhub = "KEY";
    let saves = 0; const realSave = save; save = () => { saves++; return true; };
    $("io").value = JSON.stringify({active:"A", portfolios:{A:{settings:{}, trades:[{id:"1", ticker:"Z", status:"open"}]}}});
    applyImport();
    check("failed import changes nothing", [state.trades.map(t=>t.ticker), saves, /nothing was imported/.test($("io_err").textContent)], [["KEEP"], 0, true]);
    // A good file goes in, and a backup without the key keeps this browser's key.
    $("io").value = JSON.stringify({active:"B", finnhub:"", portfolios:{B:{settings:defaults().settings, trades:[], cashFlows:[]}}});
    applyImport();
    save = realSave;
    check("good import, key kept", [root.active, root.finnhub], ["B", "KEY"]);
    check("backups leave the key out", JSON.parse(bookJson()).finnhub, "");

    // A save in another tab replaces this tab's copy; this tab stays where it was looking.
    book([keepT]); root.tab = "charts";
    const other = JSON.parse(JSON.stringify(root)); other.tab = "portfolio";
    other.portfolios.Trading.trades.push(lose({ticker:"OTHER"}));
    window.dispatchEvent(new StorageEvent("storage", {key:KEY, newValue:JSON.stringify(other)}));
    check("other tab's save loaded", [state.trades.map(t=>t.ticker).sort(), root.tab], [["KEEP","OTHER"], "charts"]);

    // A number too large for a double is Infinity to parseFloat, and Infinity passed every "> 0"
    // test. Number fields blank it themselves; the text money fields did not.
    const o = trade({events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([o]); root.tab = "settings"; render();
    $("aum").value = "9".repeat(400); $("aum").dispatchEvent(new Event("change"));
    check("infinite initial capital refused", root.portfolios.Trading.settings.initialCapital, 100000);

    // Notes and the review save when the box is left.
    const N = lose();
    book([N]); root.tab = "tally"; render(); toggleLog(N.id);
    $("note_"+N.id).value = "typed"; $("note_"+N.id).dispatchEvent(new Event("change"));
    $("rev_"+N.id).value = "a month on"; $("rev_"+N.id).dispatchEvent(new Event("change"));
    check("notes and review kept on leaving the box", [N.notes, N.review30], ["typed", "a month on"]);

    // The ledger is every transaction: trades and cash, the cash adjustment tagged.
    const pf = book([o]);
    pf.cashFlows = [{type:"deposit", amount:5000, ts:T0()+D}, {type:"adjust", amount:-0.37, note:"broker", ts:T0()+2*D}];
    root.tab = "audit"; render();
    const cells = [...$("ledger").querySelectorAll("tr")].map(r=>r.textContent);
    check("ledger has cash", [cells.some(c=>/deposit/.test(c)), cells.some(c=>/adjustment/.test(c) && /Adj\./.test(c)), $("auditSummary").textContent],
      [true, true, "3 transactions · 1 adjusted"]);

    // A background tab spends no API calls.
    let polled = 0; const realRefresh = refreshMarks; refreshMarks = () => { polled++; };
    // Polling also waits out a focused field, so focus goes somewhere that is not one.
    const parked = document.createElement("button"); document.body.appendChild(parked); parked.focus();
    root.finnhub = "KEY"; Object.defineProperty(document, "hidden", {value:true, configurable:true});
    pollMarks();
    // Visible, said outright: the preview pane itself may be in the background while this runs.
    Object.defineProperty(document, "hidden", {value:false, configurable:true});
    pollMarks();
    delete document.hidden;
    refreshMarks = realRefresh; root.finnhub = ""; parked.remove();
    check("no polling while hidden", polled, 1);

    // builtinTags loads a v1 book that restores Thesis broken; that must not reach the defaults.
    check("defaults never edited by a load", [DEFS_DEFAULT.lossTags.length, DEFS_DEFAULT.setups.length], [0, 0]);
    book([]);
    check("a new book starts with no tags of its own", root.defs.lossTags, []);

    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    check("policy: Finnhub only", !!csp && /connect-src https:\/\/finnhub\.io;/.test(csp.content) && /default-src 'none'/.test(csp.content), true);
  },

  /* Screen readers: names on every control, state on every toggle, dialogs that behave. */
  a11y(){
    const c = trade({status:"closed", closedAt:T0()+2*D, last:48, events:[ev("entry",{qty:100, price:50, stop:48}, 0), ev("close",{qty:100, price:48}, 2)]});
    const o = trade({events:[ev("entry",{qty:100, price:50, stop:48})]});
    book([c, o, trade({status:"closed", closedAt:T0()+4*D, last:55, events:[ev("entry",{qty:100, price:50, stop:48}, 3), ev("close",{qty:100, price:55}, 4)]})]);
    const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const named = el => !!(el.getAttribute("aria-label") || (el.id && document.querySelector('label[for="'+el.id+'"]')) || el.closest("label"));
    for(const tb of ["portfolio","new","tally","charts","audit","settings","data"]){
      root.tab = tb; render();
      if(tb==="tally") toggleLog(c.id);
      if(tb==="portfolio"){ rowOpen[o.id] = true; render(); }
      if(tb==="new"){ setNT("X", "50", "48", ""); newTradeCal(); }
      const bare = [...document.querySelectorAll("button")].filter(vis).filter(b=>!/[A-Za-z0-9]/.test(b.textContent) && !b.getAttribute("aria-label"));
      const unnamed = [...document.querySelectorAll("input,select,textarea")].filter(vis).filter(e=>!named(e)).map(e=>e.id||e.tagName);
      check(tb+": symbol buttons named", bare.length, 0);
      check(tb+": every field named", unnamed, []);
    }
    rowOpen = {};
    root.tab = "tally"; render();
    const cur = document.querySelector('#sectabs button[aria-current="page"]');
    check("open tab marked, count spoken", cur && cur.getAttribute("aria-label"), "Closed Trades, 2 closed");
    toggleLog(c.id);
    check("expand state", $("tgl_"+c.id).getAttribute("aria-expanded"), "true");

    root.tab = "settings"; render();
    const fz = $("s_fuzz"), tipEl = fz.getAttribute("aria-describedby") && $(fz.getAttribute("aria-describedby"));
    check("explainer is the field's description", [!!tipEl && /suggested size/.test(tipEl.textContent),
      document.querySelector('label[for="s_fuzz"] .info').getAttribute("aria-hidden")], [true, "true"]);

    root.tab = "portfolio"; render();
    const gearBtn = [...document.querySelectorAll("#pane-portfolio button")].find(b=>b.getAttribute("aria-label")==="History and corrections");
    gearBtn.focus(); gearBtn.click();
    check("dialog announced", document.querySelector(".modalcard").getAttribute("role"), "dialog");
    closeModal();
    check("focus back on the gear", document.activeElement === gearBtn, true);

    root.tab = "charts"; render();
    check("charts are labelled pictures", [$("eqCurve").getAttribute("role"), /^Equity curve, from /.test($("eqCurve").getAttribute("aria-label"))], ["img", true]);

    // The group's per-account table: every Take box and Fill named, and gone once an account is in view.
    group([["A1", 100000], ["B1", 50000]]); root.tab = "new"; render();
    setNT("G", "50", "48", ""); newTradeCal();
    check("group fields named", [...$("nt_ladder").querySelectorAll("input")].filter(e=>!named(e)).length, 0);
    root.active = "A1"; render(); newTradeCal();
    check("group table cleared in an account", $("nt_ladder").innerHTML, "");
    clearFields();
  },

  /* The broker file (thinkorswim Transaction History). A made-up file covering every kind of row:
     a price fix, a date fix, split fills under a cent, an order the app lacks on an open trade
     (an add and a trim), one with no trade, one the file lacks, a day with two round trips logged
     as one, a short, an option, a transfer each way, a dividend, an unknown row type. */
  csvAudit(){
    const day = (d, m) => new Date(dayOf(T0() + d*D) + 12*36e5 + (m||0)*6e4).toISOString();
    const row = (d, m, type, desc, amt, bal, misc, comm) => [day(d, m), type, desc, misc||0, comm||0, amt||0, bal==null ? 0 : bal].join(",");
    const text = "﻿Execution Time,Type,Description,Misc Fees,Commissions & Fees,Amount,Balance\n" + [
      row(0, -600, "BAL", "Cash balance at the start of business day", 0, 900),
      row(1, 0, "TRD", "BOT +10 AAA @10.00", -100, 800),
      row(0, 30, "CRC", '"Tfr SOME BANK, A NAME 100.0 US$"', 100, 999),        // listed late, stamped early
      row(1, 5, "TRD", "BOT +5 BBB @20", -100, 700),
      row(2, 0, "TRD", "SOLD -10 AAA @11.25", 112.5, 812.5, -0.01),
      row(2, 10, "TRD", "BOT +3 CCC @7.835", -23.5, 790),
      row(2, 11, "TRD", "BOT +5 CCC @7.835", -39.18, 750),                       // a minute later: one order
      row(3, 0, "TRD", "SOLD -10 DDD @50", 500, 1250),
      row(3, 5, "TRD", "SOLD -5 BBB @21", 105, 1355),
      row(4, 0, "TRD", "BOT +0.5 EEE @.82", -0.41, 1354),
      row(5, 0, "TRD", "BOT +2 CCC @8", -16, 1338),
      row(6, 0, "TRD", "SOLD -4 CCC @9", 36, 1374),
      row(6, 30, "TRD", "BOT +10 GGG @16.02", -160.2, 1214),
      row(6, 30, "TRD", "SOLD -10 GGG @16.015", 160.15, 1374),
      row(6, 31, "TRD", "BOT +10 GGG @16.035", -160.35, 1214),
      row(6, 300, "TRD", "SOLD -10 GGG @16.05", 160.5, 1374),
      row(7, 0, "TRD", "SOLD -1 XYZ 100 (Weeklys) 16 OCT 26 12 PUT @.42 CBOE", 42, 1415, -0.01, -0.65),
      row(8, 0, "CRC", "Tfr out", -50, 1365),
      row(8, 5, "DOI", "Qualified Dividend - SOMECO 0.39 US$", 0.39, 1365.39),
      row(8, 9, "JRN", "Something new", 0, 1365.39),
      row(9, -600, "BAL", "Cash balance at the start of business day", 0, 1234.5)
    ].join("\r\n") + "\r\n";

    check("quoted comma and quote", csvSplit('a,"b, c","x""y"\n'), [["a","b, c",'x"y']]);
    let threw = null;
    try{ parseBrokerCsv("Date,What\n1,2"); }catch(e){ threw = e.message; }
    check("not an export: refused", threw, "Not a thinkorswim transaction export.");

    const f = parseBrokerCsv(text);
    const cc = f.orders.find(o=>o.tk==="CCC");
    check("split fills are one order", [f.fills, f.orders.length, cc.qty, cc.fills, cc.price], [14, 13, 8, 2, 7.835]);
    check("fraction, no leading zero", (o=>[o.qty, o.price, o.dir])(f.orders.find(o=>o.tk==="EEE")), [0.5, 0.82, 1]);
    check("option counted, not read", [f.optRows, f.optCash, f.orders.some(o=>o.tk==="XYZ")], [1, 41.34, false]);
    check("stock fees", f.fees, -0.01);
    check("cash rows", f.cash.map(c=>[c.type, c.amount, c.note]),
      [["deposit",100,"Broker transfer"],["withdraw",50,"Broker transfer"],["adjust",0.39,"Dividend"]]);
    check("unknown row listed", f.unread.map(u=>u.type), ["JRN"]);
    check("final balance is the last row's", f.final, 1234.5);

    const trades = [
      trade({ticker:"AAA", status:"closed", closedAt:T0()+2*D, events:[ev("entry",{qty:10, price:10, stop:9}, 1), ev("close",{qty:10, price:11}, 2)]}),
      trade({ticker:"BBB", status:"closed", closedAt:T0()+4*D, events:[ev("entry",{qty:5, price:20, stop:19}, 1), ev("close",{qty:5, price:21}, 4)]}),
      trade({ticker:"CCC", events:[ev("entry",{qty:8, price:7.83, stop:7}, 2)]}),
      trade({ticker:"DDD", side:-1, events:[ev("entry",{qty:10, price:50, stop:52}, 3)]}),
      trade({ticker:"FFF", events:[ev("entry",{qty:2, price:30, stop:28}, 5)]}),
      trade({ticker:"GGG", status:"closed", closedAt:T0()+6*D, events:[ev("entry",{qty:10, price:16.04, stop:15}, 6), ev("close",{qty:10, price:16.05}, 6)]})
    ];
    book(trades);
    csvOn = {};
    const snap = JSON.stringify(root);
    const items = csvCompare(f, "Trading");
    const kinds = tk => items.filter(it=>it.tk===tk).map(it=>it.kind + (it.as ? ":" + it.as : "") + (csvIsOn(it) ? "*" : ""));
    check("price fix, ticked", kinds("AAA"), ["same", "fix*"]);
    check("a different day is a fix", [kinds("BBB"), items.find(it=>it.tk==="BBB" && it.kind==="fix").date], [["same","fix*"], true]);
    check("under a cent unticked; add and trim on the open trade", kinds("CCC"), ["sub", "add:add*", "add:trim*"]);
    check("a short's entry is a sell", kinds("DDD"), ["same"]);
    check("no open trade: flagged only", kinds("EEE"), ["new"]);
    check("not in the file: flagged only", kinds("FFF"), ["app"]);
    check("two round trips logged as one: no fixes", [kinds("GGG"), csvTickable(items.find(it=>it.tk==="GGG"))], [["clash"], false]);
    check("cash offered: transfers and dividend ticked, fees and options not",
      items.filter(it=>it.kind==="cash").map(it=>it.key.split("|")[0] + (it.note==="Dividend" ? "D" : "") + (csvIsOn(it) ? "*" : "")),
      ["f*", "f*", "fD*", "fees", "opt"]);
    csvProjected(f, "Trading");
    check("reading and projecting change nothing", JSON.stringify(root), snap);
    check("nothing applied without approval", [csvApply(f, "Trading", ()=>false), JSON.stringify(root)], [0, snap]);

    csvOn = {rem:true};
    const n = csvApply(f, "Trading", csvIsOn);
    check("approved rows applied", n, 8);
    const aaa = trades[0].events[1];
    check("fix keeps what it was", [aaa.price, aaa.adj, aaa.src, aaa.was.price], [11.25, true, "file", 11]);
    check("date moved to the broker's", trades[1].events[1].ts, Date.parse(day(3, 5)));
    check("added in order, position right", [trades[2].events.map(e=>e.type), derive(trades[2]).Q], [["entry","add","trim"], 6]);
    check("cash now the broker's", appCash("Trading"), 1234.5);
    const again = csvCompare(f, "Trading");
    check("read again: nothing left to apply but what was declined",
      again.filter(it=>csvTickable(it)).map(it=>it.kind+":"+(it.note||it.tk)).sort(),
      ["cash:Broker fees", "cash:Option cash", "sub:CCC"]);
    check("ledger tags the cash adjustment", cashFlows("Trading").filter(x=>x.type==="adjust").map(x=>x.note), ["Dividend", "Match broker balance"]);

    // On screen: boxes named, Apply counts only ticked rows, and is off with none.
    book(JSON.parse(snap).portfolios.Trading.trades);
    csvLoad(text, "t.csv");
    root.tab = "audit"; render();
    const boxes = [...document.querySelectorAll("#csvOut input[data-k]")];
    const applyBtn = () => [...document.querySelectorAll("#csvOut button")].find(b=>/^Apply/.test(b.textContent));
    check("a box for every offer, each named", [boxes.length, boxes.filter(b=>!b.getAttribute("aria-label")).length], [11, 0]);
    check("apply counts ticked", applyBtn().textContent, "Apply 7");
    [...document.querySelectorAll("#csvOut input[data-k]:checked")].forEach(b=>csvTick(Object.assign(b, {checked:false})));
    check("apply off with nothing ticked", [applyBtn().textContent, applyBtn().disabled], ["Apply 0", true]);
    // The tag is split: whole, it would end the page script this file is compiled into.
    csvLoad(text.replace("Something new", "<scr"+"ipt>x</scr"+"ipt>").replace("+0.5 EEE", "+0.5 <i>z</i>"), "t.csv"); render();
    const html = $("csvOut").innerHTML;
    check("file text escaped", [html.indexOf("&lt;script&gt;") >= 0, html.indexOf("&lt;I&gt;Z") >= 0, /<i>z/i.test(html)], [true, true, false]);
    group([["A1", 100000], ["B1", 50000]]); root.tab = "audit"; render();
    check("group: pick the account", [...$("csvAcct").options].map(o=>o.value), ["A1", "B1"]);
    csvClear();
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
    csvData = null; csvOn = {};
    root = keep; normalize();
    save = realSave; window.confirm = realConfirm; window.alert = realAlert;
    render();
  }
  return {passed, failed};
};

})();
