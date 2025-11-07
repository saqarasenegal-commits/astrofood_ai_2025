// pages/api/chef-ai.js
export default function handler(req, res) {
  console.log("✅ CHEF-AI API CALLED (minimal)");
  const key = process.env.OPENAI_API_KEY || null;
  res.status(200).json({
    ok: true,
    message: "API minimal OK",
    key_present: !!key,
    key_len: key ? key.length : 0
  });
}
