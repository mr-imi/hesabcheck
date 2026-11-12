// Cloudflare Worker: public Nobitex prices -> JSON with CORS (cached 60s)
// Output: { usdt, btc, date, coins: { bitcoin:{irt,chg}, ethereum:{...}, tether:{...}, binancecoin:{...} } }
// irt = toman, chg = 24h change in percent, btc = Bitcoin in USD
const MAP = { bitcoin: "btc", ethereum: "eth", tether: "usdt", binancecoin: "bnb" };

export default {
  async fetch() {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    };
    const stat = async (src, dst) => {
      const r = await fetch(
        "https://apiv2.nobitex.ir/market/stats?srcCurrency=" + src + "&dstCurrency=" + dst,
        { cf: { cacheTtl: 60, cacheEverything: true } }
      );
      const j = await r.json();
      return j.stats[src + "-" + dst];
    };
    try {
      const names = Object.keys(MAP);
      const [btcUsdt, ...rows] = await Promise.all([
        stat("btc", "usdt").catch(() => null),
        ...names.map((n) => stat(MAP[n], "rls").catch(() => null))
      ]);
      const coins = {};
      names.forEach((n, i) => {
        const s = rows[i];
        if (s) coins[n] = {
          irt: Math.round(parseFloat(s.latest) / 10), // rial -> toman
          chg: parseFloat(s.dayChange)
        };
      });
      const out = { coins, date: "امروز" };
      if (coins.tether) out.usdt = coins.tether.irt;
      if (btcUsdt) out.btc = Math.round(parseFloat(btcUsdt.latest));
      return new Response(JSON.stringify(out), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 502, headers });
    }
  }
};
