
// api/chef-ai.js (openai quick test)
export default async function handler(req, res) {
  console.log(">>> openai-quicktest called");
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("NO KEY IN ENV");
    return res.status(500).json({ ok:false, err:"NO_KEY" });
  }
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${key}` }
    });
    const text = await r.text();
    console.log("OpenAI status:", r.status);
    console.log("OpenAI body (first200):", text.slice(0,200));
    return res.status(200).json({ ok:true, status: r.status, body_preview: text.slice(0,300) });
  } catch (e) {
    console.error("CALL ERROR:", e);
    return res.status(500).json({ ok:false, err: String(e) });
  }
}


  try {
    console.log("🌍 Calling OpenAI...");
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Chef-AI. Return JSON." },
          { role: "user", content: `${body.prompt} (lang:${body.lang||'fr'} meal:${body.meal||''})` }
        ],
        max_tokens: 700,
        temperature: 0.8
      }),
      // small timeout fallback for fetch (if runtime supports AbortController)
    });

    console.log("✅ OpenAI HTTP status:", openaiResp.status);

    const text = await openaiResp.text();
    console.log("📦 OpenAI body (first 200 chars):", text.slice(0,200));

    // if not OK forward full body as JSON with status
    if (!openaiResp.ok) {
      return res.status(502).json({ error: "OpenAI error", status: openaiResp.status, body: text });
    }

    // try parse
    let parsed;
    try { parsed = JSON.parse(text); } catch(e){ parsed = { raw: text }; }

    return res.status(200).json({ ok: true, openai_status: openaiResp.status, openai_body: parsed });
  } catch (err) {
    // Log full error
    console.error("💥 ERROR calling OpenAI:", String(err));
    // If Node threw a dns / network error, show it
    return res.status(500).json({ error: "CALL_FAILED", message: String(err) });
  }
}
