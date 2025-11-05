
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // --- MODE DEBUG ---
  if (req.method === "GET" && (req.url.includes("debug=1") || req.query?.debug === "1")) {
    const apiKey = process.env.OPENAI_API_KEY;
    return res.status(200).json({
      ok: true,
      hasKey: !!apiKey,
      keyPreview: apiKey ? apiKey.slice(0, 8) + "..." : null,
      env: process.env.VERCEL_ENV || "unknown",
    });
  }
  if (body.mode === 'advice') {
  // Retourne des conseils pour le signe + état (do/avoid dans la bonne langue)
  return res.status(200).json({
    advice: {
      do:    lang==='ar' ? ['...'] : lang==='en' ? ['Hydrate well', 'Leafy greens'] : ['Bien s’hydrater', 'Légumes verts'],
      avoid: lang==='ar' ? ['...'] : lang==='en' ? ['Ultra-processed', 'Excess sugar'] : ['Ultras transformés', 'Excès de sucre']
    }
  });
}

  if (body.mode === 'recipe_from_product') {
     const base = (body.base || '').toLowerCase(); // ex. 'fonio', 'gombo', ...
  // Compose une recette courte basée sur l’ingrédient de base
     return res.status(200).json({
      recipe: {
        title: lang==='en' ? `Chef's ${base} bowl` :
             lang==='ar' ? `طبق ${base} من الشيف` :
                            `Bol de ${base} du Chef`,
        intro: lang==='en' ? `A simple ${base}-based recipe tuned for ${body.sign}/${body.state}.` :
             lang==='ar' ? `وصفة بسيطة تعتمد على ${base} مهيّأة لـ ${body.sign}/${body.state}.` :
                            `Recette simple à base de ${base} adaptée à ${body.sign}/${body.state}.`,
      servings: 2,
      time: { prep: 10, cook: 15, total: 25 },
      difficulty: 'Facile',
      method: 'Poêle',
      ingredients: [
        { item: base, qty: 200, unit: 'g' },
        { item: lang==='en' ? 'Onion' : lang==='ar' ? 'بصل' : 'Oignon', qty: 1 },
        { item: lang==='en' ? 'Garlic' : lang==='ar' ? 'ثوم' : 'Ail', qty: 2, unit: 'gousses' },
        { item: lang==='en' ? 'Oil' : lang==='ar' ? 'زيت' : 'Huile', qty: 1, unit: 'cs' },
      ],
      steps: [
        { n:1, text: lang==='en' ? 'Prep and dice.' : lang==='ar' ? 'حضّر وقطّع.' : 'Préparer et couper.', timer_sec: 0 },
        { n:2, text: lang==='en' ? 'Sauté for 2 min.' : lang==='ar' ? 'قلِّ لمدة دقيقتين.' : 'Saisir 2 min.', timer_sec: 120, heat:'fort' },
        { n:3, text: lang==='en' ? `Add ${base} and cook 8 min.` : lang==='ar' ? `أضِف ${base} واطهه 8 دقائق.` : `Ajouter ${base} et cuire 8 min.`, timer_sec: 480, heat:'moyen' }
      ],
      nutrition: { kcal: 380, protein_g: 10, carb_g: 55, fat_g: 12 },
      substitutions: [ lang==='en' ? 'Oil → ghee' : lang==='ar' ? 'الزيت → السمن' : 'Huile → beurre clarifié' ],
      image_emoji: '🍲'
    }
  });
}

  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: "⚠️ Aucune clé API détectée dans les variables d'environnement (OPENAI_API_KEY).",
    });
  }

  // --- Lecture du corps de la requête ---
  const { sign = "Poissons", lang = "fr" } = req.body || {};

  try {
    // ✅ Endpoint compatible avec sk-proj
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // tu peux essayer "gpt-4o" si ce modèle n'est pas dispo
        messages: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu génères des recettes astrologiques inspirées du Sénégal, avec un titre, les ingrédients et les étapes courtes.",
          },
          {
            role: "user",
            content: `Prépare une recette complète adaptée au signe ${sign} en ${lang}.`,
          },
        ],
        max_tokens: 300,
      }),
    });

    // 🟠 Erreur claire d’OpenAI
  const data = await response.json();

if (data.error) {
  // quota dépassé → message clair + fallback local pour ne pas casser l'UX
  if (data.error.code === "insufficient_quota") {
    const local = `🔒 Quota OpenAI épuisé.
Recette de secours pour ${sign} (${lang}) :
• Titre : Yassa veggie citron & bissap
• Ingrédients : oignons, citron, moutarde, poivron, piment doux, huile
• Préparation : mariner 20 min, saisir 6–8 min, déglacer, mijoter 10 min. Servir avec riz/miélé de mil.`;
    return res.status(200).json({ ok: false, text: local });
  }
  return res.status(200).json({ ok: false, text: "❌ OpenAI : " + data.error.message });
}

    // 🟢 Récupération du texte
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.output_text ||
      null;

    if (!text) {
      return res.status(200).json({
        ok: false,
        text:
          "⚠️ OpenAI a répondu sans texte lisible.\n" +
          `Recette de secours : jus de bouye + yassa veggie pour ${sign} (${lang}).`,
      });
    }

    // ✅ Réponse finale
    return res.status(200).json({
      ok: true,
      text,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur d'appel OpenAI : " + err.message,
    });
  }
}
