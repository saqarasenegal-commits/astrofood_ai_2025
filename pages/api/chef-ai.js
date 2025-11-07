/ AstroFood Premium Gold - API Server (OpenAI Version)
// Installation: npm install express cors dotenv openai

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser OpenAI
const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
});

// Configuration du modèle
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // ou 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'

// ==================== ROUTE: Générer Recette ====================
app.post('/api/generate-recipe', async (req, res) => {
  try {
    const { sign, meal, lang } = req.body;

    if (!sign || !meal || !lang) {
      return res.status(400).json({ 
        error: 'Paramètres manquants: sign, meal, lang requis' 
      });
    }

    console.log(`📝 Génération recette: ${sign} - ${meal} - ${lang}`);

    // Noms des signes
    const signNames = {
      aries: { fr: 'Bélier', en: 'Aries', ar: 'الحمل' },
      taurus: { fr: 'Taureau', en: 'Taurus', ar: 'الثور' },
      gemini: { fr: 'Gémeaux', en: 'Gemini', ar: 'الجوزاء' },
      cancer: { fr: 'Cancer', en: 'Cancer', ar: 'السرطان' },
      leo: { fr: 'Lion', en: 'Leo', ar: 'الأسد' },
      virgo: { fr: 'Vierge', en: 'Virgo', ar: 'العذراء' },
      libra: { fr: 'Balance', en: 'Libra', ar: 'الميزان' },
      scorpio: { fr: 'Scorpion', en: 'Scorpio', ar: 'العقرب' },
      sagittarius: { fr: 'Sagittaire', en: 'Sagittarius', ar: 'القوس' },
      capricorn: { fr: 'Capricorne', en: 'Capricorn', ar: 'الجدي' },
      aquarius: { fr: 'Verseau', en: 'Aquarius', ar: 'الدلو' },
      pisces: { fr: 'Poissons', en: 'Pisces', ar: 'الحوت' }
    };

    const mealNames = {
      breakfast: { fr: 'petit-déjeuner', en: 'breakfast', ar: 'الإفطار' },
      lunch: { fr: 'déjeuner', en: 'lunch', ar: 'الغداء' },
      dinner: { fr: 'dîner', en: 'dinner', ar: 'العشاء' }
    };

    const signName = signNames[sign]?.[lang] || sign;
    const mealName = mealNames[meal]?.[lang] || meal;

    // Prompts selon la langue
    const prompts = {
      fr: `Tu es un chef expert en cuisine africaine et astrologie culinaire. Crée une recette de ${mealName} SPÉCIALEMENT adaptée aux traits du signe astrologique ${signName}.

Les personnes ${signName} ont des caractéristiques spécifiques (énergie, tempérament, goûts) - utilise ces traits pour personnaliser la recette.

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks):
{
  "title": "Nom créatif de la recette",
  "desc": "Description courte (1 phrase)",
  "ingredients": ["ingredient 1 avec quantité", "ingredient 2 avec quantité", ...],
  "preparation": "Instructions de préparation détaillées en 3-5 étapes",
  "cook": "Temps de cuisson (ex: 20-25 min)",
  "calories": "Estimation calories (ex: ≈450 kcal)"
}`,
      en: `You are a chef expert in African cuisine and culinary astrology. Create a ${mealName} recipe SPECIALLY adapted to the traits of the ${signName} zodiac sign.

${signName} people have specific characteristics (energy, temperament, tastes) - use these traits to personalize the recipe.

Reply ONLY with a valid JSON object (no markdown, no backticks):
{
  "title": "Creative recipe name",
  "desc": "Short description (1 sentence)",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
  "preparation": "Detailed preparation instructions in 3-5 steps",
  "cook": "Cooking time (e.g., 20-25 min)",
  "calories": "Calorie estimate (e.g., ≈450 kcal)"
}`,
      ar: `أنت طاهٍ خبير في المطبخ الأفريقي وعلم التنجيم الطهوي. أنشئ وصفة ${mealName} مصممة خصيصًا لسمات برج ${signName}.

الأشخاص من برج ${signName} لديهم خصائص محددة (الطاقة، المزاج، الأذواق) - استخدم هذه السمات لتخصيص الوصفة.

أجب فقط بكائن JSON صالح (بدون markdown أو backticks):
{
  "title": "اسم الوصفة الإبداعي",
  "desc": "وصف قصير (جملة واحدة)",
  "ingredients": ["مكون 1 مع الكمية", "مكون 2 مع الكمية", ...],
  "preparation": "تعليمات التحضير التفصيلية في 3-5 خطوات",
  "cook": "وقت الطهي (مثلاً: 20-25 دقيقة)",
  "calories": "تقدير السعرات الحرارية (مثلاً: ≈450 سعرة)"
}`
    };

    const prompt = prompts[lang] || prompts.fr;

    // Appel à l'API OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Tu es un chef expert qui répond toujours en JSON valide sans markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    console.log('🤖 Réponse OpenAI:', responseText);

    // Extraire le JSON (nettoyer les backticks markdown si présents)
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const recipe = JSON.parse(cleanText);

    // Ajouter l'image générée
    const imgSeed = `${recipe.title}-${sign}-${meal}`.replace(/\s+/g, '-');
    recipe.img = `https://picsum.photos/seed/${encodeURIComponent(imgSeed)}/800/500`;

    console.log('✅ Recette générée:', recipe.title);

    res.json({
      success: true,
      recipe: recipe,
      metadata: {
        sign,
        meal,
        lang,
        model: MODEL,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur génération recette:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la recette',
      details: error.message
    });
  }
});

// ==================== ROUTE: Chef-AI Chat ====================
app.post('/api/chef-ai', async (req, res) => {
  try {
    const { prompt, sign, meal, lang, currentRecipe } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Le paramètre "prompt" est requis' 
      });
    }

    console.log(`💬 Chef-AI Chat: "${prompt}"`);

    // Context enrichi
    const contextInfo = `
Signe astrologique: ${sign || 'non spécifié'}
Type de repas: ${meal || 'non spécifié'}
Recette actuelle: ${currentRecipe || 'aucune'}
Langue: ${lang || 'fr'}
    `.trim();

    const systemPrompts = {
      fr: `Tu es le Chef-AI d'AstroFood, un assistant culinaire expert en cuisine africaine et astrologie. Tu aides les utilisateurs avec leurs recettes, donnes des conseils personnalisés selon leur signe astrologique, et réponds de manière amicale et professionnelle.

Contexte actuel:
${contextInfo}

Réponds de manière concise (2-4 phrases maximum) et pratique.`,
      en: `You are AstroFood's Chef-AI, a culinary assistant expert in African cuisine and astrology. You help users with their recipes, give personalized advice based on their zodiac sign, and respond in a friendly and professional manner.

Current context:
${contextInfo}

Reply concisely (2-4 sentences maximum) and practically.`,
      ar: `أنت شيف-آي الخاص بـ AstroFood، مساعد طهي خبير في المطبخ الأفريقي وعلم التنجيم. تساعد المستخدمين في وصفاتهم، وتقدم نصائح مخصصة بناءً على برجهم، وتجيب بطريقة ودية ومهنية.

السياق الحالي:
${contextInfo}

أجب بإيجاز (2-4 جمل كحد أقصى) وبشكل عملي.`
    };

    const systemPrompt = systemPrompts[lang] || systemPrompts.fr;

    // Appel à OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content;
    console.log('✅ Réponse Chef-AI:', answer.substring(0, 100) + '...');

    res.json({
      success: true,
      answer: answer,
      metadata: {
        prompt,
        context: { sign, meal, lang },
        model: MODEL,
        respondedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur Chef-AI:', error);
    res.status(500).json({
      error: 'Erreur lors de la communication avec Chef-AI',
      details: error.message
    });
  }
});

// ==================== ROUTE: Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AstroFood Premium Gold API (OpenAI)',
    version: '1.0.0',
    model: MODEL,
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/generate-recipe',
      'POST /api/chef-ai',
      'GET /api/health'
    ]
  });
});

// ==================== ROUTE: Root ====================
app.get('/', (req, res) => {
  res.json({
    message: '🍳 AstroFood Premium Gold API (OpenAI)',
    documentation: 'Endpoints disponibles sur /api/health',
    status: 'running',
    model: MODEL
  });
});

// ==================== Démarrage du serveur ====================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🍳 AstroFood Premium Gold API Server       ║
║   ✨ Propulsé par OpenAI (${MODEL.padEnd(17)})║
╚═══════════════════════════════════════════════╝

🚀 Serveur démarré sur http://localhost:${PORT}

📋 Endpoints disponibles:
   • POST /api/generate-recipe  (Génération de recettes)
   • POST /api/chef-ai          (Chat avec Chef-AI)
   • GET  /api/health           (Status du serveur)

⚙️  Configuration:
   • Port: ${PORT}
   • Modèle: ${MODEL}
   • API Key: ${process.env.OPENAI_API_KEY ? '✅ Configurée' : '❌ Manquante'}

💡 Astuce: Configure OPENAI_API_KEY dans .env
  `);

  if (!process.env.OPENAI_API_KEY) {
    console.warn('\n⚠️  ATTENTION: OPENAI_API_KEY non configurée!');
    console.warn('   Crée un fichier .env avec: OPENAI_API_KEY=ta_clé_api\n');
  }
});

// Gestion des erreurs globales
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
});

module.exports = app;
