// api/chef-ai.js  (DEBUG version - remove after troubleshooting)
// Si ton runtime n'a pas fetch global, décommente l'import suivant:
// import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS permissif pour debug (en prod, restreindre au domaine)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Log simple pour vérifier si la variable d'environnement est disponible
  // (NE PAS LOGUER LA VALEUR DE LA CLE)
  console.log('DEBUG: OPENAI_API_KEY present?', !!process.env.OPENAI_API_KEY);

  try {
    const { prompt, sign, meal, lang } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const system = `You are Chef-AI. Reply with VALID JSON ONLY: { "answer": "...", "recipe": { "title":"", "desc":"", "ingredients":[], "preparation":"", "cook":"", "calories":"", "img":"" } }.
Use the language specified in 'lang'. Do NOT include extra text outside the JSON.`;

    const userContent = `User prompt: """${prompt}"""
Sign: ${sign || 'unknown'}
Meal: ${meal || 'unknown'}
Lang: ${lang || 'fr'}
Return the JSON object as requested.`;

    // Timeout controller
    const controller = new AbortController();
    const TIMEOUT_MS = 20000;
    const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Appel à OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent }
        ],
        temperature: 0.8,
        max_tokens: 700
      }),
      signal: controller.signal
    });

    clearTimeout(to);

    // Si erreur OpenAI -> renvoyer le détail (utile en debug)
    if (!openaiRes.ok) {
      // récupère texte d'erreur retourné par OpenAI
      const text = await openaiRes.text().catch(() => '');
      console.error('DEBUG: OpenAI returned non-OK', openaiRes.status, text);
      // renvoie l'erreur au client pour debugging (temporarily)
      return res.status(502).json({
        error: `OpenAI error ${openaiRes.status}`,
        details: text || 'no details'
      });
    }

    const openaiJson = await openaiRes.json();
    const raw = openaiJson.choices?.[0]?.message?.content ?? openaiJson.choices?.[0]?.text ?? null;
    if (!raw) {
      console.error('DEBUG: OpenAI returned empty content', openaiJson);
      return res.status(500).json({ error: 'No content from OpenAI', debug: openaiJson });
    }

    // Try parse JSON out of the model response
    let parsed;
    try {
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      const candidate = (first !== -1 && last !== -1) ? raw.slice(first, last + 1) : raw;
      parsed = JSON.parse(candidate);
    } catch (parseErr) {
      console.warn('DEBUG: JSON parse failed', parseErr);
      // renvoyer le texte brut dans 'answer' pour debugging
      return res.status(200).json({
        answer: String(raw).slice(0, 1500),
        recipe: { title: '', desc: '', ingredients: [], preparation: '', cook: '', calories: '', img: '' },
        warning: 'failed_to_parse_json',
        debug_raw: String(raw).slice(0, 5000) // limit size
      });
    }

    // Normaliser recipe
    const recipe = parsed.recipe || {};
    const normalizedRecipe = {
      title: recipe.title || '',
      desc: recipe.desc || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : (recipe.ingredients ? [String(recipe.ingredients)] : []),
      preparation: recipe.preparation || '',
      cook: recipe.cook || '',
      calories: recipe.calories || '',
      img: recipe.img || ''
    };

    return res.status(200).json({
      answer: parsed.answer || '',
      recipe: normalizedRecipe
    });

  } catch (err) {
    console.error('DEBUG: server error', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenAI request timed out' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
