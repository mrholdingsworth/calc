/* Equivalence harness — v1.3 against v2.
   -------------------------------------------------------------------------------------------
   Paste this whole file into the console on BOTH pages, then compare the two JSON strings it
   returns. Any difference is a change in arithmetic; an empty diff means a phase moved the
   presentation and left the numbers alone.

       https://mrholdingsworth.github.io/calc/          (v1.3)
       https://mrholdingsworth.github.io/calc/v2.html   (v2)

   It reads nothing from storage and writes nothing to it: the fixture below replaces `root` in
   memory for the duration of the call and the original is put back in a `finally`. That swap is
   safe on the live site even with the mark poller running, because nothing in here awaits: a timer
   callback cannot interleave with synchronous code, so no save() can observe the fixture in place.

   TO RUN IT AGAINST BOTH VERSIONS AUTOMATICALLY, build two probe copies -- the real app with this
   file compiled in, since the preview pane serves local files from a data: URL and they therefore
   cannot fetch anything:

       py -I -c "
       import io
       h=io.open('_dev/compare.js',encoding='utf-8').read()
       for src,dst in [('index.html','_dev/_probe_v1.html'),('v2.html','_dev/_probe_v2.html')]:
           s=io.open(src,encoding='utf-8').read(); i=s.rindex('<\/script>')   # see note below
           io.open(dst,'w',encoding='utf-8',newline='\n').write(s[:i]+h+s[i:])
       "

   The backslash in that closing tag is load-bearing. An HTML parser ends a <script> element at the
   first literal closing tag in its text, comment or no comment -- so writing it unescaped anywhere
   in this file truncates the probe's script and every definition after it vanishes. Cost an hour
   once; the symptom is the whole app silently not booting.

   Open each probe and run `snapshot(FIXTURE)`, then compare. The probes are gitignored; delete
   them when you are done. Always confirm the harness can still FAIL before trusting a match --
   monkey-patch riskAtStop to add a thousandth of a dollar and check the output moves. An
   equivalence test that cannot fail is not evidence of anything.

   Baseline, 2026-10-25: v1.3 and v2 shell agree exactly on this fixture. 12 trades, 22 figures
   each, plus 5 per account across 6 accounts.

   To compare YOUR OWN book instead of the fixture, call `snapshot()` with no argument on each
   page. That is the version worth running before shipping a phase; the fixture is the version
   that covers what a real book does not happen to contain.

   The fixture is deliberately awkward:
     - a long trimmed twice with the stop moved above break-even (house money)
     - a long still at risk
     - a short, trimmed once
     - a legacy trade carrying an `add` event, which both versions must still replay
     - an `adjust` override of size and average price
     - a sub-penny name at 1.1155 against a 1.1125 stop, where 2dp rounds risk/share to zero
     - a $2.5M account holding a $1,750 name
     - a closed winner and a closed loser
     - a three-leg group trade, each leg a different size on the same prices
*/
(function(){

const DAY = 864e5, NOW = Date.UTC(2026, 9, 20, 14, 30);   // fixed clock: `days` must not drift

const trade = (o) => Object.assign({
  concept:"fixture", tier:1, mult:0.5, adr:6, adrAtOpen:6, rUnit:500, aumAtOpen:100000,
  status:"open", plan:{}, checks:[true,true,true,true], compounded:0, notes:"",
  createdAt:NOW-DAY*30, lastMarkTs:NOW
}, o);

const FIXTURE = {
  v:1, active:"Main", focus:null, order:["Main","Big","G"], finnhub:"",
  portfolios:{
    Main:{ settings:{aum:100000, rPct:1, tiers:[1,0.5,0.25], compound:true, finnhub:"",
                     marginX:2, heatCap:5, coldR:3}, cashFlows:[], trades:[

      // Trimmed twice, stop ratcheted above break-even: house money, negative sequence.
      trade({id:"t_house", ticker:"HSE", side:1, last:62, rUnit:500,
        events:[{type:"entry", qty:300, price:50, stop:48, ts:NOW-DAY*20},
                {type:"trim",  qty:100, price:56,          ts:NOW-DAY*10},
                {type:"stop",  stop:54, price:58,          ts:NOW-DAY*8},
                {type:"trim",  qty:50,  price:60,          ts:NOW-DAY*4}],
        compounded:1100}),

      // Untouched long, still at risk.
      trade({id:"t_risk", ticker:"RSK", side:1, last:118, tier:0, mult:1,
        events:[{type:"entry", qty:100, price:120, stop:110, ts:NOW-DAY*6}]}),

      // Short, trimmed once. side carries the sign through every figure.
      trade({id:"t_short", ticker:"SRT", side:-1, last:27, tier:2, mult:0.25,
        events:[{type:"entry", qty:200, price:30, stop:33, ts:NOW-DAY*12},
                {type:"trim",  qty:80,  price:28,          ts:NOW-DAY*2}],
        compounded:160}),

      // Legacy: an add. Nothing writes these any more and both versions must still replay one.
      trade({id:"t_add", ticker:"ADD", side:1, last:115,
        events:[{type:"entry", qty:100, price:100, stop:95, ts:NOW-DAY*25},
                {type:"add",   qty:100, price:110, stop:104, ts:NOW-DAY*18},
                {type:"trim",  qty:50,  price:115,          ts:NOW-DAY*9}],
        compounded:500}),

      // An override of size and average price, plus a budget event from the removed control.
      trade({id:"t_adj", ticker:"ADJ", side:1, last:44,
        events:[{type:"entry",  qty:200, price:40, stop:38, ts:NOW-DAY*15},
                {type:"budget", mult:1,                     ts:NOW-DAY*14},
                {type:"adjust", qty:190, price:40.25, stop:null, ts:NOW-DAY*13}]}),

      // Sub-penny. Risk per share is $0.0030 — two decimals print $0.00 and the R is nonsense.
      trade({id:"t_penny", ticker:"PNY", side:1, last:1.1180, rUnit:250,
        events:[{type:"entry", qty:40000, price:1.1155, stop:1.1125, ts:NOW-DAY*5}]}),

      // Closed winner and closed loser, for the tally and the R multiples.
      trade({id:"t_win", ticker:"WIN", side:1, last:12, status:"closed", closedAt:NOW-DAY*11,
        compounded:200,
        events:[{type:"entry", qty:100, price:10, stop:9, ts:NOW-DAY*17},
                {type:"close", qty:100, price:12,         ts:NOW-DAY*11}]}),
      trade({id:"t_loss", ticker:"LOS", side:1, last:8.4, status:"closed", closedAt:NOW-DAY*3,
        compounded:-320, lossTag:"invalidation",
        events:[{type:"entry", qty:200, price:10, stop:8.5, ts:NOW-DAY*7},
                {type:"close", qty:200, price:8.4,          ts:NOW-DAY*3}]})
    ]},

    // A large account on an expensive name: the width case, and a different margin multiple.
    Big:{ settings:{aum:2500000, rPct:0.5, tiers:[1,0.5,0.25], compound:true, finnhub:"",
                    marginX:4, heatCap:6, coldR:4}, cashFlows:[], trades:[
      trade({id:"t_big", ticker:"BIG", side:1, last:1812.5, rUnit:12500, aumAtOpen:2500000,
        events:[{type:"entry", qty:900, price:1750, stop:1687.5, ts:NOW-DAY*9}]})
    ]}
  },
  groups:{}
};

// Three legs of one group trade, same prices and different sizes — the fan-out case.
["L1","L2","L3"].forEach((n,i)=>{
  FIXTURE.portfolios[n] = { settings:{aum:40000+i*20000, rPct:1, tiers:[1,0.5,0.25], compound:true,
                                      finnhub:"", marginX:1, heatCap:5, coldR:3},
                            cashFlows:[], trades:[
    trade({id:"t_leg"+i, gid:"gfix", ticker:"GRP", side:1, last:44,
      rUnit:400+i*200, aumAtOpen:40000+i*20000, tier:0, mult:1,
      events:[{type:"entry", qty:100+i*40, price:40, stop:38, ts:NOW-DAY*8},
              {type:"trim",  qty:20+i*10,  price:45,          ts:NOW-DAY*1}],
      compounded:(20+i*10)*5})
  ]};
  FIXTURE.order.push(n);
});
FIXTURE.groups.G = { settings:{rPct:1, tiers:[1,0.5,0.25], compound:true, heatCap:5, coldR:3},
                     members:["L1","L2","L3"] };

// Round hard: the point is to catch a changed formula, not a float tail.
const n6 = v => (v==null || typeof v!=="number" || !isFinite(v)) ? v : Math.round(v*1e6)/1e6;

// Only primitives that exist in BOTH versions. Nothing here touches a renderer.
function snapshot(book){
  const keep = root;
  try{
    if(book) root = JSON.parse(JSON.stringify(book));
    normalize();                                  // sets `state`; writes nothing to storage
    const out = {accounts:{}, trades:{}};

    Object.keys(root.portfolios).sort().forEach(a=>{
      out.accounts[a] = {
        aum:        n6(root.portfolios[a].settings.aum),
        rUnit:      n6(rUnitOf(a)),
        buyingPower:n6(buyingPower(a)),
        bpUsed:     n6(bpUsed(a)),
        bpFree:     n6(bpFree(a))
      };
      root.portfolios[a].trades.forEach(t=>{
        const d = derive(t), S = stats(t);
        const ras = riskAtStop(t, d);
        const openPL = t.side*(t.last-d.avg)*d.Q;
        out.trades[a+"/"+t.id] = {
          Q:n6(d.Q), avg:n6(d.avg), realized:n6(d.realized), stop:n6(d.stop),
          mult:n6(d.mult), series:d.series.length,
          riskAtStop:n6(ras),
          sequence:n6(ras - d.realized),
          beStop:n6(beStop(t,d)),
          openPL:n6(openPL),
          rm:n6(S.rm), rmInt:n6(S.rmInt), initialRisk:n6(S.initialRisk),
          riskPS:n6(S.riskPS), entryPx:n6(S.entryPx),
          deployed:n6(S.deployed), posPct:n6(S.posPct), roe:n6(S.roe),
          aum0:n6(S.aum0), days:S.days, rPerDay:n6(S.rPerDay),
          compounded:n6(t.compounded)
        };
      });
    });
    return JSON.stringify(out, Object.keys(out.trades).length ? null : null, 1);
  } finally {
    root = keep;
    normalize();
  }
}

window.snapshot = snapshot;
window.FIXTURE = FIXTURE;
return snapshot(FIXTURE);

})();
