export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 🔎 mode debug
  if (req.method === "GET" && (req.url.includes("debug=1") || req.query?.debug === "1")) {
    const apiKey = process.env.OPENAI_API_KEY;
    return res.status(200).json({
      ok: true,
      hasKey: !!apiKey,
      keyPreview: apiKey ? apiKey.slice(0, 6) + "..." : null,
      env: process.env.VERCEL_ENV || "unknown"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: "⚠️ IA non activée (clé manquante)."
    });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  try {
    // ✅ endpoint adapté aux clés de projet
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // si jamais ton projet n'a pas "gpt-4o-mini", mets "gpt-4o"
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu génères des recettes astrologiques courtes, avec un titre, ingrédients et préparation. Tu peux utiliser bouye, bissap, mil."
          },
          {
            role: "user",
            content: `Génère une recette complète pour le signe ${sign} en ${lang}.`
          }
        ],
        max_output_tokens: 280
      })
    });

    const data = await r.json();

    // 1) OpenAI a renvoyé une erreur claire → on l’affiche dans la page
    if (data.error) {
      return res.status(200).json({
        ok: false,
        text:
          "❌ OpenAI a répondu : " +
          data.error.message +
          "\n➡️ Ça veut dire que la clé est bonne, mais que ce projet n'a pas ce modèle, ou qu'il faut en choisir un autre."
      });
    }

    // 2) format /v1/responses
    const text =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      data?.choices?.[0]?.message?.content ||
      null;

    if (!text) {
      return res.status(200).json({
        ok: false,
        text:
          "⚠️ OpenAI a bien été appelé avec ta clé, mais n'a pas renvoyé de texte.\n" +
          "➡️ Dans ton tableau de bord OpenAI, ton project est sûrement vide ou le modèle 'gpt-4o-mini' n'est pas activé.\n" +
          `Recette de secours pour ${sign} (${lang}) : jus de bouye + yassa veggie.`
      });
    }

    // 3) tout va bien 👉 on renvoie la vraie recette
    return res.status(200).json({
      ok: true,
      text
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur d'appel OpenAI : " + err.message
    });
  }
}

