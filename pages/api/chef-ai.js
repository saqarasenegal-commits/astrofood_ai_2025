
// api/chef-ai.js  (Production - clean)
// If your runtime doesn't have global fetch, uncomment node-fetch import:
// import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Basic CORS for same-origin deployments; tighten in production if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, sign, meal, lang } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const system = `You are Chef-AI, an expert chef and nutritionist. Respond ONLY with valid JSON, nothing else.
Return an object with exactly two keys:
- "answer": short 1-2 sentence chat reply to the user's question.
- "recipe": an object with keys { "title", "desc", "ingredients", "preparation", "cook", "calories", "img" }.
Use the language specified by the 'lang' parameter (fr/en/ar). If unknown, use French.
If a field is unknown, set it to empty string or empty array.
Do NOT include any additional commentary or text outside the JSON.`;

    const userContent = `User prompt: """${prompt}"""
Sign: ${sign || 'unknown'}
Meal: ${meal || 'unknown'}
Lang: ${lang || 'fr'}
Return the JSON object as requested.`;

    const controller = new AbortController();
    const TIMEOUT_MS = 20000;
    const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(()=>'');
      console.error('OpenAI error', openaiRes.status, text);
      return res.status(502).json({ error: `OpenAI error ${openaiRes.status}` });
    }

    const openaiJson = await openaiRes.json();
    const raw = openaiJson.choices?.[0]?.message?.content ?? openaiJson.choices?.[0]?.text ?? null;
    if (!raw) return res.status(500).json({ error: 'No content from OpenAI' });

    // Try to find JSON substring and parse
    let parsed;
    try {
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      const candidate = (first !== -1 && last !== -1) ? raw.slice(first, last+1) : raw;
      parsed = JSON.parse(candidate);
    } catch (parseErr) {
      // Return minimal answer if parsing fails
      return res.status(200).json({
        answer: String(raw).slice(0, 1500),
        recipe: { title:'', desc:'', ingredients:[], preparation:'', cook:'', calories:'', img:'' },
        warning: 'failed_to_parse_json'
      });
    }

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
    console.error('Server error', err);
    if (err.name === 'AbortError') return res.status(504).json({ error: 'OpenAI request timed out' });
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
