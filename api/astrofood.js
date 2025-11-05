export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  // --- DEBUG ---
  if (req.method === "GET" && (req.url.includes("debug=1") || req.query?.debug === "1")) {
    const apiKey = process.env.OPENAI_API_KEY;
    return res.status(200).json({
      ok: true,
      hasKey: !!apiKey,
      keyPreview: apiKey ? apiKey.slice(0, 8) + "..." : null,
      env: process.env.VERCEL_ENV || "unknown",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: "⚠️ Aucune clé API détectée (OPENAI_API_KEY manquante).",
    });
  }

  // --- Lecture du corps ---
  const { sign = "Poissons", lang = "fr", mode = "recipe", state, base } = req.body || {};

  // 🧠 MODE 1 : CONSEIL NUTRITIONNEL
  if (mode === "advice") {
    const t = lang === "en"
      ? { do: ["Hydrate well", "Eat leafy greens"], avoid: ["Excess sugar", "Ultra-processed foods"] }
      : lang === "ar"
      ? { do: ["اشرب الماء جيدًا", "الخضروات الورقية"], avoid: ["السكريات الزائدة", "الأطعمة المصنعة"] }
      : { do: ["Bien s’hydrater", "Légumes verts"], avoid: ["Excès de sucre", "Produits ultra-transformés"] };

    return res.status(200).json({ advice: t });
  }

  // 👩‍🍳 MODE 2 : RECETTE PAR PRODUIT AFRICAIN
  if (mode === "recipe_from_product") {
    const product = (base || "").toLowerCase();
    const recipe = {
      title:
        lang === "en"
          ? `Chef's ${product} Bowl`
          : lang === "ar"
          ? `طبق ${product} من الشيف`
          : `Bol de ${product} du Chef`,
      intro:
        lang === "en"
          ? `A simple ${product}-based recipe tuned for ${sign}/${state}.`
          : lang === "ar"
          ? `وصفة بسيطة تعتمد على ${product} مهيّأة لـ ${sign}/${state}.`
          : `Recette simple à base de ${product} adaptée à ${sign}/${state}.`,
      ingredients: [
        { item: product, qty: 200, unit: "g" },
        { item: lang === "fr" ? "Oignon" : "Onion", qty: 1 },
        { item: lang === "fr" ? "Ail" : "Garlic", qty: 2, unit: "gousses" },
        { item: lang === "fr" ? "Huile" : "Oil", qty: 1, unit: "cs" },
      ],
      steps: [
        { n: 1, text: lang === "fr" ? "Préparer et couper." : "Prep and dice.", timer_sec: 0 },
        { n: 2, text: lang === "fr" ? "Faire revenir 2 min." : "Sauté for 2 min.", timer_sec: 120 },
        {
          n: 3,
          text:
            lang === "fr"
              ? `Ajouter ${product} et cuire 8 min.`
              : `Add ${product} and cook 8 min.`,
          timer_sec: 480,
        },
      ],
      substitutions: [lang === "fr" ? "Huile → beurre clarifié" : "Oil → ghee"],
    };

    return res.status(200).json({ recipe });
  }

  // 🔮 AUTRES MODES (recettes normales) => via OpenAI
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu génères des recettes astrologiques inspirées du Sénégal, avec un titre, les ingrédients et les étapes courtes.",
          },
          {
            role: "user",
            content: `Prépare une recette complète adaptée au signe ${sign} (${lang}).`,
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    if (data.error) {
      if (data.error.code === "insufficient_quota") {
        return res.status(200).json({
          ok: false,
          text: `🔒 Quota OpenAI épuisé.
Recette de secours pour ${sign} :
• Titre : Yassa veggie citron & bissap
• Ingrédients : oignons, citron, moutarde, poivron, piment doux, huile
• Préparation : mariner 20 min, saisir 6–8 min, déglacer, mijoter 10 min.`,
        });
      }
      return res.status(200).json({ ok: false, text: "❌ OpenAI : " + data.error.message });
    }

    const text = data?.choices?.[0]?.message?.content || null;
    if (!text) {
      return res.status(200).json({
        ok: false,
        text: "⚠️ Réponse vide d’OpenAI.",
      });
    }

    return res.status(200).json({ ok: true, text });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur d'appel OpenAI : " + err.message,
    });
  }
}
