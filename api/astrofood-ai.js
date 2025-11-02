export const runtime = "edge";

export default async function handler(req) {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  // On accepte POST uniquement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // 👉 ICI on répond tout de suite, sans appeler OpenAI
  const body = await req.json().catch(() => ({}));
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  const text = `✅ API ASTROFOOD OK
Signe: ${sign}
Langue: ${lang}
Recette démo: jus de bouye énergisant + tartine mil & miel.`;

  return new Response(JSON.stringify({ ok: true, text }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

