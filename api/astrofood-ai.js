
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Préflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // On accepte POST seulement
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  // On lit le body (Node)
  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  // 🟣 ICI on reste en mode démo (pas OpenAI, pas de 504)
  const reply = `✅ API ASTROFOOD OK (Node)
Signe: ${sign}
Langue: ${lang}
Recette démo:
- Jus de bouye énergisant
- Tartine mil & miel
- Option : poisson grillé au citron pour ${sign}`;

  return res.status(200).json({ ok: true, text: reply });
}
