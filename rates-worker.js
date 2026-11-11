// Cloudflare Worker: public Nobitex prices -> JSON with CORS, cached for 60s
export default {
  async fetch() {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    };
    const get = async (src, dst) => {
      const r = await fetch(
        "https://apiv2.nobitex.ir/market/stats?srcCurrency=" + src + "&dstCurrency=" + dst,
        { cf: { cacheTtl: 60, cacheEverything: true } }
      );
      const j = await r.json();
      return parseFloat(j.stats[src + "-" + dst].latest);
    };
    try {
      const [usdtRls, btcUsdt] = await Promise.all([get("usdt", "rls"), get("btc", "usdt")]);
      return new Response(JSON.stringify({
        usdt: Math.round(usdtRls / 10),   // rial -> toman
        btc: Math.round(btcUsdt),         // USD
        date: "امروز"
      }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 502, headers });
    }
  }
};
