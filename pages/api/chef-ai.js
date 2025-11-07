// ✅ VERSION FINALE — API CHEF-AI
// Génère une recette complète en JSON via OpenAI
// Retourne : title, description, ingredients[], preparation, cook, calories, image (url ou base64 selon ton rendu)

export default async function handler(req, res) {

  // -----------------------------
  // ✅ CORS (IMPORTANT pour navigateur / fetch)
  // -----------------------------
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // -----------------------------
  // ✅ GESTION DU POST
  // -----------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sign, meal, lang, prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing: prompt" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY in Vercel" });
    }

    // -----------------------------
    // ✅ PROMPT (recette détaillée)
    // -----------------------------
    const finalPrompt = `
Tu es CHEF-AI 🧑‍🍳 avec un style premium.
Retourne une recette au format JSON STRICT, pas de blabla.
La recette doit respecter : langue = "${lang}", sign astrologique = "${sign}", repas = "${meal}".

Répond STRICTEMENT avec ce JSON :

{
  "title": "",
  "description": "",
  "ingredients": ["", ""],
  "preparation": "étape par étape",
  "cook": "durée et mode de cuisson",
  "calories": "",
  "image_prompt": "description visuelle pour génération d’image"
}

NE RAJOUTE RIEN D’AUTRE HORS DE CE JSON.
`;

    // -----------------------------
    // ✅ APPEL OPENAI
    // -----------------------------
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // tu peux mettre gpt-5 si disponible
        messages: [
          { role: "system", content: "Tu es Chef-AI, expert en gastronomie et nutrition." },
          { role: "user", content: finalPrompt }
        ],
        max_tokens: 900,
        temperature: 0.8
      })
    });

    const data = await aiRes.json();

    // Si OpenAI renvoie une erreur brute
    if (!data.choices) {
      return res.status(500).json({ error: "Bad OpenAI response", details: data });
    }

    // Extraction du texte JSON retourné
    const raw = data.choices[0].message.content.trim();

    let recipeJSON;
    try {
      recipeJSON = JSON.parse(raw);
    } catch (err) {
      return res.status(500).json({
        error: "Failed to parse JSON",
        raw
      });
    }

    // -----------------------------
    // ✅ RÉPONSE API
    // -----------------------------
    return res.status(200).json({
      ok: true,
      recipe: recipeJSON
    });

  } catch (err) {
    console.error("❌ CHEF-AI ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
