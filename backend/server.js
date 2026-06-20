const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', apiLimiter);

// ----------------------------------------------------
// 🧠 LOCAL AI SIMULATION ENGINE (FALLBACK & DEMO FIRST)
// ----------------------------------------------------
const KNOWLEDGE_BASE = {
  photosynthesis: {
    title: {
      en: "Photosynthesis",
      hi: "प्रकाश संश्लेषण (Photosynthesis)",
      gu: "પ્રકાશ સંશ્લેષણ (Photosynthesis)",
      bn: "সালোকসংশ্লেষ (Photosynthesis)",
      ta: "ஒளிச்சேர்க்கை (Photosynthesis)",
      te: "కిరణజన్య సంయోగక్రియ (Photosynthesis)",
      mr: "प्रकाशसंश्लेषण (Photosynthesis)"
    },
    explanations: {
      3: {
        en: "Plants make their own food! They capture sunlight like solar panels. They take water from soil through roots and breathe in air (carbon dioxide). Using sunlight, they make sweet sugars for energy and breathe out clean oxygen! Just like your mother cooks delicious food in the kitchen using LPG stove, the leaf kitchen cooks using sunlight.",
        hi: "पौधे अपना भोजन स्वयं बनाते हैं! वे सौर पैनलों की तरह सूर्य की रोशनी को सोखते हैं। वे जड़ों से पानी लेते हैं और हवा (कार्बन डाइऑक्साइड) लेते हैं। सूर्य की रोशनी का उपयोग करके, वे ऊर्जा के लिए मीठी चीनी बनाते हैं और साफ ऑक्सीजन छोड़ते हैं! जैसे आपकी माँ रसोई में गैस चूल्हे का उपयोग करके स्वादिष्ट भोजन बनाती हैं, वैसे ही पत्तों की रसोई धूप का उपयोग करके खाना पकाती है।"
      },
      8: {
        en: "Photosynthesis is the chemical process by which green plants containing chlorophyll convert carbon dioxide and water into glucose and oxygen in the presence of sunlight. Inside plant cells, chloroplasts act as factories. Sunlight splits water molecules into hydrogen and oxygen. Chemical Equation: 6CO₂ + 6H₂O + light ➔ C₆H₁₂O₆ + 6O₂. Regional Metaphor: Think of the monsoon rains! Just as the dry fields drink the rains to flourish, plant roots absorb monsoon water, combining it with carbon dioxide in the leaf mills to generate food.",
        hi: "प्रकाश संश्लेषण वह रासायनिक प्रक्रिया है जिसके द्वारा क्लोरोफिल युक्त हरे पौधे सूर्य के प्रकाश की उपस्थिति में कार्बन डाइऑक्साइड और पानी को ग्लूकोज और ऑक्सीजन में बदलते हैं। पौधों की कोशिकाओं के अंदर, क्लोरोप्लास्ट कारखानों के रूप में कार्य करते हैं। सूर्य का प्रकाश पानी के अणुओं को हाइड्रोजन और ऑक्सीजन में विभाजित करता है। रासायनिक समीकरण: 6CO₂ + 6H₂O + प्रकाश ➔ C₆H₁₂O₆ + 6O₂।"
      },
      12: {
        en: "Photosynthesis is a multi-step redox reaction occurring in chloroplasts. It is divided into Light-dependent reactions (Photophosphorylation) in thylakoid membranes where light energy is harvested by Photosystem I and II to synthesize ATP and NADPH, releasing O₂. This is followed by Light-independent reactions (Calvin Cycle / C3 pathway) in the stroma, where the enzyme RuBisCO catalyzes carbon fixation of CO₂ into 3-phosphoglycerate, which is then reduced to yield glyceraldehyde-3-phosphate (G3P) and regenerate RuBP. In regions like Kerala, coconut palms optimize this Calvin Cycle under humid tropical conditions using monsoon-fed root systems.",
        hi: "प्रकाश संश्लेषण क्लोरोप्लास्ट में होने वाली एक बहु-चरणीय रेडॉक्स प्रतिक्रिया है। इसे थायलाकोइड झिल्ली में प्रकाश-निर्भर प्रतिक्रियाओं (फोटोफॉस्फोराइलेशन) में विभाजित किया गया है जहां प्रकाश ऊर्जा को एटीपी और एनएडीपीएच को संश्लेषित करने के लिए फोटोसिस्टम I और II द्वारा संकलित किया जाता है, जिससे O₂ निकलता है। इसके बाद स्ट्रोमा में प्रकाश-स्वतंत्र प्रतिक्रियाएं (केल्विन चक्र / सी3 मार्ग) होती हैं..."
      }
    },
    quizzes: [
      {
        type: "mcq",
        question: "What is the green pigment in leaves called?",
        options: ["Chlorophyll", "Hemoglobin", "Xanthophyll", "Carotenoid"],
        answer: "Chlorophyll",
        explanation: "Chlorophyll is the pigment that absorbs sunlight and gives leaves their green color."
      },
      {
        type: "tf",
        question: "Photosynthesis releases Carbon Dioxide into the air.",
        options: ["True", "False"],
        answer: "False",
        explanation: "Photosynthesis absorbs Carbon Dioxide and releases Oxygen."
      },
      {
        type: "fill",
        question: "Plants absorb water through their _____.",
        answer: "roots",
        explanation: "Roots absorb water and essential minerals from the soil."
      }
    ]
  },
  atom: {
    title: {
      en: "Structure of the Atom",
      hi: "परमाणु की संरचना",
      gu: "પરમાણુ બંધારણ"
    },
    explanations: {
      3: {
        en: "Everything in the world is made of tiny LEGO blocks called atoms! Imagine a tiny solar system. In the center is the nucleus (like the Sun), and tiny electrons (like planets) spin around it. You can't see them because they are smaller than dust!",
        hi: "दुनिया की हर चीज़ परमाणु नामक छोटे लेगो ब्लॉकों से बनी है! एक छोटे सौर मंडल की कल्पना करें। केंद्र में नाभिक (सूरज की तरह) होता है, और छोटे इलेक्ट्रॉन (ग्रहों की तरह) इसके चारों ओर घूमते हैं।"
      },
      8: {
        en: "An atom is the basic unit of a chemical element. It consists of a dense central nucleus containing positively charged protons and neutral neutrons, surrounded by a cloud of negatively charged electrons. Niels Bohr described electrons moving in fixed circular orbits (shells). Metaphor: Like the dance of regional kites during Makar Sankranti, electrons fly in strict orbits around the heavy spool (nucleus).",
        hi: "परमाणु किसी रासायनिक तत्व की मूल इकाई है। इसमें एक सघन केंद्रीय नाभिक होता है जिसमें सकारात्मक रूप से आवेशित प्रोटॉन और तटस्थ न्यूट्रॉन होते हैं, जो नकारात्मक रूप से आवेशित इलेक्ट्रॉनों के बादल से घिरे होते हैं।"
      },
      12: {
        en: "The modern atom is described by Quantum Mechanics. Electrons do not occupy fixed orbits but exist as probability density clouds defined by wave functions (orbitals, e.g., s, p, d, f) satisfying the Schrödinger Equation. The Heisenberg Uncertainty Principle states both position and momentum cannot be simultaneously measured. Electrodynamic attraction is stabilized by quantum boundary confinement.",
        hi: "आधुनिक परमाणु का वर्णन क्वांटम मैकेनिक्स द्वारा किया गया है। इलेक्ट्रॉन निश्चित कक्षाओं में नहीं रहते हैं बल्कि श्रोडिंगर समीकरण को संतुष्ट करने वाले तरंग कार्यों (ऑर्बिटल्स) द्वारा परिभाषित संभाव्यता घनत्व बादलों के रूप में मौजूद होते हैं।"
      }
    },
    quizzes: [
      {
        type: "mcq",
        question: "Which subatomic particle has a negative charge?",
        options: ["Proton", "Electron", "Neutron", "Positron"],
        answer: "Electron",
        explanation: "Electrons have a negative charge and orbit the nucleus."
      },
      {
        type: "tf",
        question: "The nucleus of an atom contains protons and neutrons.",
        options: ["True", "False"],
        answer: "True",
        explanation: "Protons and neutrons reside in the nucleus, while electrons orbit outside."
      }
    ]
  },
  fractions: {
    title: {
      en: "Fractions and Parts of Whole",
      hi: "भिन्न और अंश (Fractions)",
      gu: "અપૂર્ણાંક અને ભાગો (Fractions)"
    },
    explanations: {
      3: {
        en: "Fractions represent parts of a whole object! Imagine a round pizza cut into 4 equal slices. If you eat 1 slice, you ate one-fourth (1/4) of the pizza. The top number (1) is the numerator, telling you what you have. The bottom number (4) is the denominator, showing the total slices. Just like dividing a sweet mango equally between you and your sister gives half (1/2) to each!",
        hi: "भिन्न किसी पूरी वस्तु के हिस्सों को दर्शाते हैं! कल्पना कीजिए कि एक गोल पिज्जा को 4 बराबर टुकड़ों में काटा गया है। यदि आप 1 टुकड़ा खाते हैं, तो आपने पिज्जा का एक-चौथाई (1/4) खाया।"
      },
      5: {
        en: "Fractions represent dividing things into equal segments. A fraction has a numerator and a denominator. Proper fractions are less than 1, while improper fractions are greater than 1. For example, sharing half a melon is 1/2.",
        hi: "भिन्न चीजों को समान भागों में विभाजित करने का प्रतिनिधित्व करते हैं। भिन्न में एक अंश और एक हर होता है।"
      },
      8: {
        en: "A fraction represents a rational number expressed as a quotient a/b, where 'a' is the numerator (integer) and 'b' is the non-zero denominator (integer). Fractions are proper (numerator < denominator) or improper. Operations like addition require finding the Least Common Denominator (LCD). For example, to mix ingredients for regional sweets like Laddoo in correct ratios, we add 1/2 cup of sugar and 1/3 cup of flour, yielding 5/6 total cups.",
        hi: "एक भिन्न a/b के रूप में व्यक्त की जाने वाली एक परिमेय संख्या का प्रतिनिधित्व है, जहाँ 'a' अंश है और 'b' एक गैर-शून्य हर है।"
      },
      12: {
        en: "In modern algebra, fractions represent elements of a field of fractions of an integral domain. In calculus, rational functions of real variables expressed as algebraic fractions P(x)/Q(x) are resolved using partial fraction decomposition to evaluate complex integration. For example: ∫ 1 / ((x-a)(x-b)) dx = ∫ [A/(x-a) + B/(x-b)] dx.",
        hi: "आधुनिक बीजगणित में, भिन्न एक अभिन्न डोमेन के अंशों के क्षेत्र के तत्वों का प्रतिनिधित्व करते हैं। कलन में आंशिक भिन्न अपघटन का उपयोग समाकलन के लिए किया जाता है।"
      }
    },
    quizzes: [
      {
        type: "mcq",
        question: "In the fraction 3/4, what is the number 3 called?",
        options: ["Numerator", "Denominator", "Quotient", "Remainder"],
        answer: "Numerator",
        explanation: "The top number in a fraction is the numerator, representing active parts."
      },
      {
        type: "tf",
        question: "An improper fraction has a numerator smaller than the denominator.",
        options: ["True", "False"],
        answer: "False",
        explanation: "Improper fractions have numerators greater than or equal to the denominator."
      }
    ]
  },
  solarsystem: {
    title: {
      en: "The Solar System",
      hi: "सौर मंडल (Solar System)"
    },
    explanations: {
      3: {
        en: "Our Solar System has 8 planets orbiting a huge, hot star called the Sun! Earth is the 3rd planet, and it has liquid water and fresh air for life to grow. The planets are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. We also have a round Moon that orbits around the Earth!",
        hi: "हमारे सौर मंडल में सूर्य नामक एक विशाल, गर्म तारे की परिक्रमा करने वाले 8 ग्रह हैं! पृथ्वी तीसरा ग्रह है, और यहाँ जीवन के विकसित होने के लिए पानी और हवा है।"
      },
      5: {
        en: "The Solar System is made of the Sun and the objects that travel around it. It has eight planets, moons, and asteroids. The planets are held in their path by the Sun's strong gravity.",
        hi: "सौर मंडल सूर्य और उसके चारों ओर चक्कर लगाने वाली वस्तुओं से बना है। इसमें आठ ग्रह, उपग्रह और क्षुद्रग्रह हैं।"
      },
      8: {
        en: "The Solar System comprises the Sun and all celestial bodies bound to it by gravity, including the 8 major planets. Planets follow elliptical orbits governed by Kepler's Laws. Inner planets are rocky (terrestrial), while outer planets are gas giants. Metaphor: Think of regional temple dancers spinning in concentric patterns around the central sanctum.",
        hi: "सौर मंडल में सूर्य और गुरुत्वाकर्षण द्वारा उससे बंधे सभी खगोलीय पिंड शामिल हैं, जिसमें 8 प्रमुख ग्रह शामिल हैं।"
      },
      12: {
        en: "The Solar System dynamics are modeled using Newtonian mechanics and general relativity. Secular perturbations and gravitational resonances between giant planets (like Jupiter and Saturn) are computed using Hamiltonian mechanics to assess long-term orbital stability.",
        hi: "सौर मंडल की गतिशीलता को न्यूटनियन यांत्रिकी और सामान्य सापेक्षता का उपयोग करके मॉडल किया गया है।"
      }
    },
    quizzes: [
      {
        type: "mcq",
        question: "Which planet is the third from the Sun?",
        options: ["Venus", "Earth", "Mars", "Jupiter"],
        answer: "Earth",
        explanation: "Earth is the third planet from the Sun and the only one known to harbor life."
      },
      {
        type: "tf",
        question: "The Sun is a planet in our solar system.",
        options: ["True", "False"],
        answer: "False",
        explanation: "The Sun is a star, not a planet."
      }
    ]
  }
};

// ----------------------------------------------------
// 🤖 MULTI-LLM ROUTING GATEWAY WITH RATE-LIMIT PROTECTION
// ----------------------------------------------------

// Simple throttle: track last Gemini call time to prevent 429 cascades
let lastGeminiCallTime = 0;
const GEMINI_MIN_INTERVAL_MS = 5000; // max 12 calls/min to stay under 15 RPM limit

async function queryLLMChain(prompt, systemInstruction = "") {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Throttle: wait if we called Gemini too recently
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCallTime;
  if (timeSinceLast < GEMINI_MIN_INTERVAL_MS) {
    const waitMs = GEMINI_MIN_INTERVAL_MS - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  // Try gemini-2.0-flash first (15 RPM free tier, better than 2.5-flash's 10 RPM)
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const geminiBody = JSON.stringify({
    contents: [{ parts: [{ text: `${systemInstruction}\n\nUser Prompt: ${prompt}` }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  });

  const attemptGemini = async () => {
    lastGeminiCallTime = Date.now();
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: geminiBody
    });
    if (res.status === 429) throw new Error('RATE_LIMIT_429');
    if (!res.ok) throw new Error(`Gemini status ${res.status}`);
    const data = await res.json();
    return {
      provider: "gemini",
      text: data.candidates[0].content.parts[0].text
    };
  };

  try {
    console.log(`Attempting LLM call via gemini-2.0-flash...`);
    return await attemptGemini();
  } catch (err) {
    if (err.message === 'RATE_LIMIT_429') {
      console.warn(`Gemini 429 — waiting 8s before retry...`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      try {
        console.log(`Retrying LLM call via gemini-2.0-flash...`);
        return await attemptGemini();
      } catch (retryErr) {
        console.warn(`Gemini retry failed: ${retryErr.message}`);
      }
    } else {
      console.warn(`Gemini failed: ${err.message}`);
    }
  }

  // Try Groq fallback if key provided
  if (process.env.GROQ_API_KEY) {
    try {
      console.log(`Attempting LLM call via groq...`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [{ role: "system", content: systemInstruction }, { role: "user", content: prompt }],
          temperature: 0.7
        })
      });
      if (!res.ok) throw new Error(`Groq status ${res.status}`);
      const data = await res.json();
      return { provider: "groq", text: data.choices[0].message.content };
    } catch (err) {
      console.warn(`Groq failed: ${err.message}`);
    }
  }

  // If all API calls fail, return null to activate local fallback generator
  return null;
}


// ----------------------------------------------------
// 🛣 EXPRESS ROUTING API ENDPOINTS
// ----------------------------------------------------

// 1. Profile Endpoint
app.get('/api/auth/profile', (req, res) => {
  const profile = db.getUser("student_1");
  res.json({ success: true, profile });
});

// Curriculum Endpoint
app.get('/api/curriculum', (req, res) => {
  try {
    const curriculumData = require('./curriculum.json');
    res.json({ success: true, curriculum: curriculumData });
  } catch (err) {
    console.error("Error reading curriculum database:", err);
    res.status(500).json({ success: false, error: "Failed to read curriculum database" });
  }
});

// Dynamic curriculum cache to prevent rate-limit 429 errors from cascading queries
const curriculumCache = {
  subjects: {},
  chapters: {},
  topics: {}
};

// Search curriculum database
app.get('/api/curriculum/search', (req, res) => {
  const { query, classLevel, subject, board } = req.query;
  try {
    const curriculumDb = require('./curriculum_db.json');
    let results = curriculumDb;

    if (classLevel) {
      results = results.filter(c => c.classLevel == classLevel);
    }
    if (subject) {
      results = results.filter(c => c.subject.toLowerCase() === subject.toLowerCase());
    }
    if (board) {
      results = results.filter(c => c.board.toLowerCase() === board.toLowerCase());
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(c => 
        c.chapter.toLowerCase().includes(q) || 
        c.topics.some(t => t.toLowerCase().includes(q)) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, results: results.slice(0, 30) });
  } catch (err) {
    console.error("Curriculum search failed:", err);
    res.status(500).json({ success: false, error: "Failed to search curriculum database" });
  }
});

// Dynamic subjects generator
app.get('/api/curriculum/subjects', async (req, res) => {
  const { classLevel } = req.query;
  const cl = classLevel || "8";

  // Check memory cache first
  if (curriculumCache.subjects[cl]) {
    return res.json({ success: true, subjects: curriculumCache.subjects[cl] });
  }

  // Load static curriculum first to avoid unnecessary LLM calls and 429s
  let fallbackSubjects = null;
  try {
    const staticCurriculum = require('./curriculum.json');
    if (staticCurriculum[cl] && staticCurriculum[cl].subjects) {
      fallbackSubjects = Object.keys(staticCurriculum[cl].subjects);
    }
  } catch (err) {
    console.error("Error reading static curriculum subjects:", err);
  }

  if (fallbackSubjects && fallbackSubjects.length > 0) {
    curriculumCache.subjects[cl] = fallbackSubjects;
    return res.json({ success: true, subjects: fallbackSubjects });
  }

  const systemPrompt = `You are an expert on the Indian NCERT educational curriculum.
    List all standard subjects taught in NCERT Class ${cl} in India.
    Return exactly a JSON array of strings. Do not include any markdown format or surrounding text.
    Example: ["Mathematics", "Science", "Social Science", "English", "Hindi", "EVS"]`;

  const response = await queryLLMChain(`Subjects for Class ${cl}`, systemPrompt);
  if (response) {
    try {
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      const parsed = JSON.parse(cleanText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        curriculumCache.subjects[cl] = parsed; // Cache result
        return res.json({ success: true, subjects: parsed });
      }
    } catch (e) {
      console.error("Failed to parse dynamic subjects:", e);
    }
  }

  res.json({ success: true, subjects: ["Mathematics", "Science"] });
});

// Dynamic chapters generator
app.get('/api/curriculum/chapters', async (req, res) => {
  const { classLevel, subject } = req.query;
  const cl = classLevel || "8";
  const sub = subject || "Science";
  const cacheKey = `${cl}-${sub}`;

  // Check memory cache first
  if (curriculumCache.chapters[cacheKey]) {
    return res.json({ success: true, chapters: curriculumCache.chapters[cacheKey] });
  }

  // Load static curriculum first to avoid unnecessary LLM calls and 429s
  let fallbackChapters = null;
  try {
    const staticCurriculum = require('./curriculum.json');
    if (staticCurriculum[cl] && staticCurriculum[cl].subjects && staticCurriculum[cl].subjects[sub]) {
      fallbackChapters = Object.keys(staticCurriculum[cl].subjects[sub].chapters);
    }
  } catch (err) {
    console.error("Error reading static curriculum chapters:", err);
  }

  if (fallbackChapters && fallbackChapters.length > 0) {
    curriculumCache.chapters[cacheKey] = fallbackChapters;
    return res.json({ success: true, chapters: fallbackChapters });
  }

  const systemPrompt = `You are an expert on the Indian NCERT educational curriculum.
    List all standard chapters for NCERT Class ${cl} subject "${sub}" in India.
    Return exactly a JSON array of strings containing the chapter names in standard format.
    Example: ["Chapter 1: Chemical Reactions", "Chapter 2: Acids, Bases and Salts"]
    Do not include any markdown formatting or surrounding text.`;

  const response = await queryLLMChain(`Chapters for Class ${cl} ${sub}`, systemPrompt);
  if (response) {
    try {
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      const parsed = JSON.parse(cleanText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        curriculumCache.chapters[cacheKey] = parsed; // Cache result
        return res.json({ success: true, chapters: parsed });
      }
    } catch (e) {
      console.error("Failed to parse dynamic chapters:", e);
    }
  }

  res.json({ success: true, chapters: ["Chapter 1: Introduction", "Chapter 2: Core Theory"] });
});

// Dynamic topics generator
app.get('/api/curriculum/topics', async (req, res) => {
  const { classLevel, subject, chapter } = req.query;
  const cl = classLevel || "8";
  const sub = subject || "Science";
  const ch = chapter || "";
  const cacheKey = `${cl}-${sub}-${ch}`;

  // Check memory cache first
  if (curriculumCache.topics[cacheKey]) {
    return res.json({ success: true, topics: curriculumCache.topics[cacheKey] });
  }

  // Load static curriculum first to avoid unnecessary LLM calls and 429s
  let fallbackTopics = null;
  try {
    const staticCurriculum = require('./curriculum.json');
    if (staticCurriculum[cl] && 
        staticCurriculum[cl].subjects && 
        staticCurriculum[cl].subjects[sub] && 
        staticCurriculum[cl].subjects[sub].chapters && 
        staticCurriculum[cl].subjects[sub].chapters[ch]) {
      fallbackTopics = staticCurriculum[cl].subjects[sub].chapters[ch];
    }
  } catch (err) {
    console.error("Error reading static curriculum topics:", err);
  }

  if (fallbackTopics && fallbackTopics.length > 0) {
    curriculumCache.topics[cacheKey] = fallbackTopics;
    return res.json({ success: true, topics: fallbackTopics });
  }

  const systemPrompt = `You are an expert on the Indian NCERT educational curriculum.
    List all standard topics/concepts taught in NCERT Class ${cl} subject "${sub}" chapter "${ch}" in India.
    Return exactly a JSON array of strings containing the topic/concept names.
    Example: ["Rational numbers on number lines", "Additive and Multiplicative inverse"]
    Do not include any markdown formatting or surrounding text.`;

  const response = await queryLLMChain(`Topics for Class ${cl} ${sub} ${ch}`, systemPrompt);
  if (response) {
    try {
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      const parsed = JSON.parse(cleanText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        curriculumCache.topics[cacheKey] = parsed; // Cache result
        return res.json({ success: true, topics: parsed });
      }
    } catch (e) {
      console.error("Failed to parse dynamic topics:", e);
    }
  }

  res.json({ success: true, topics: ["Core Theory", "Key Applications", "Review Exercises"] });
});

// Complete map of all 22 Indian official languages
const LANG_NAMES = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
  ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  or: 'Odia', as: 'Assamese', ur: 'Urdu', sa: 'Sanskrit', kok: 'Konkani',
  mai: 'Maithili', mni: 'Manipuri', ne: 'Nepali', sd: 'Sindhi',
  ks: 'Kashmiri', doi: 'Dogri', sat: 'Santali'
};

// 2. Fetch or Generate Lesson
app.post('/api/learning/lesson', async (req, res) => {
  const { topic, classLevel, language, region, subject, chapter } = req.body;

  const cl = classLevel || 8;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const actualTopic = topic || 'General Science';
  const actualSubject = subject || 'Science';
  const actualChapter = chapter || '';
  const actualRegion = region || 'India';

  // CRITICAL: All output must be in the selected language
  const systemPrompt = `You are Vidya AI, an expert multilingual AI teacher for Indian schools.

LANGUAGE INSTRUCTION (MANDATORY): Every single word of your response — including the title, explanation, codeMixed paragraph, curriculum points, and regional example — MUST be written entirely in ${langName}. Do NOT use English unless the selected language is English. If ${langName} uses a non-Latin script (like Devanagari for Hindi, Tamil script for Tamil, Bengali script for Bengali, etc.), use that script.

Generate a NCERT-aligned lesson on the topic "${actualTopic}" from subject "${actualSubject}"${actualChapter ? `, chapter "${actualChapter}"` : ''} for Class ${cl}.
Include cultural examples from: ${actualRegion}.
Match difficulty to Class ${cl} level.

Return ONLY valid JSON (no markdown, no extra text):
{
  "title": "Topic title written entirely in ${langName}",
  "explanation": "3-4 paragraph detailed explanation entirely in ${langName}, using local examples from ${actualRegion}",
  "codeMixed": "A 2-sentence summary in ${langName} that a student can remember easily",
  "curriculumPoints": ["Point 1 in ${langName}", "Point 2 in ${langName}", "Point 3 in ${langName}"],
  "regionalExampleUsed": "One-line description of the local/cultural example used, written in ${langName}"
}`;

  const llmResponse = await queryLLMChain(`Lesson: Class ${cl} ${actualSubject} ${actualTopic} in ${langName}`, systemPrompt);

  if (llmResponse) {
    try {
      let cleanText = llmResponse.text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      const parsed = JSON.parse(cleanText.trim());
      return res.json({ success: true, provider: llmResponse.provider, ...parsed });
    } catch (e) {
      // LLM returned plain text — still language-aware
      return res.json({
        success: true,
        provider: llmResponse.provider,
        title: actualTopic,
        explanation: llmResponse.text,
        codeMixed: llmResponse.text.slice(0, 200),
        curriculumPoints: [`${actualTopic} - ${actualSubject} - Class ${cl}`],
        regionalExampleUsed: actualRegion
      });
    }
  }
  // 1. Dynamic database lookup fallback
  let normalizedTopic = actualTopic.toLowerCase().trim();
  try {
    const curriculumDb = require('./curriculum_db.json');
    const matchedChapter = curriculumDb.find(c => 
      c.classLevel == cl && 
      c.subject.toLowerCase() === actualSubject.toLowerCase() && 
      (c.chapter.toLowerCase().includes(normalizedTopic) || normalizedTopic.includes(c.chapter.toLowerCase()) || 
       c.topics.some(t => t.toLowerCase().includes(normalizedTopic) || normalizedTopic.includes(t.toLowerCase())))
    );
    if (matchedChapter) {
      const lessonContent = matchedChapter.lessons[lang] || matchedChapter.lessons.en || matchedChapter.lessons;
      return res.json({
        success: true,
        provider: 'curriculum_db_fallback',
        title: lessonContent.title || matchedChapter.chapter,
        explanation: lessonContent.explanation,
        codeMixed: lessonContent.summary,
        curriculumPoints: matchedChapter.topics,
        regionalExampleUsed: actualRegion
      });
    }
  } catch (err) {
    console.error("Database lesson fallback failed:", err);
  }

  // Static fallback: check known topics for Hindi/English content
  let staticKey = null;
  if (normalizedTopic.includes('photosynthesis')) staticKey = 'photosynthesis';
  else if (normalizedTopic.includes('atom')) staticKey = 'atom';
  else if (normalizedTopic.includes('fraction')) staticKey = 'fractions';
  else if (normalizedTopic.includes('solar') || normalizedTopic.includes('system')) staticKey = 'solarsystem';

  if (staticKey && KNOWLEDGE_BASE[staticKey]) {
    const knowledgeItem = KNOWLEDGE_BASE[staticKey];
    const explanation = knowledgeItem.explanations[cl]?.[lang] || knowledgeItem.explanations[cl]?.en || knowledgeItem.explanations[8].en;
    const title = knowledgeItem.title[lang] || knowledgeItem.title.en;
    return res.json({
      success: true,
      provider: 'local_simulation',
      title,
      explanation,
      codeMixed: explanation.slice(0, 150),
      curriculumPoints: [`Core concept of ${actualTopic}`, `Class ${cl} ${actualSubject} curriculum`, `NCERT Chapter reference`],
      regionalExampleUsed: `${actualRegion} context`
    });
  }

  // Generic fallback with language indicator (offline mode notice in selected language)
  const offlineNotices = {
    en: `This lesson on "${actualTopic}" (Class ${cl} ${actualSubject}) is loading in offline mode. Connect to the internet for a full ${langName} lesson with regional examples.`,
    hi: `"${actualTopic}" (कक्षा ${cl} ${actualSubject}) का यह पाठ ऑफलाइन मोड में लोड हो रहा है। पूर्ण हिंदी पाठ के लिए इंटरनेट से जुड़ें।`,
    bn: `"${actualTopic}" (শ্রেণি ${cl} ${actualSubject}) এর এই পাঠটি অফলাইন মোডে লোড হচ্ছে। সম্পূর্ণ বাংলা পাঠের জন্য ইন্টারনেটে সংযোগ করুন।`,
    ta: `"${actualTopic}" (வகுப்பு ${cl} ${actualSubject}) இந்த பாடம் ஆஃப்லைன் பயன்முறையில் ஏற்றப்படுகிறது। முழுமையான தமிழ் பாடத்திற்கு இணையத்துடன் இணைக்கவும்।`,
    te: `"${actualTopic}" (తరగతి ${cl} ${actualSubject}) ఈ పాఠం ఆఫ్‌లైన్ మోడ్‌లో లోడ్ అవుతోంది. పూర్తి తెలుగు పాఠం కోసం ఇంటర్నెట్‌కి కనెక్ట్ చేయండి।`,
    mr: `"${actualTopic}" (इयत्ता ${cl} ${actualSubject}) हा धडा ऑफलाइन मोडमध्ये लोड होत आहे. संपूर्ण मराठी धड्यासाठी इंटरनेटशी कनेक्ट करा.`,
    gu: `"${actualTopic}" (ધોરણ ${cl} ${actualSubject}) આ પાઠ ઑફલાઇન મોડમાં લોડ થઈ રહ્યો છે. સંપૂર્ણ ગુજરાતી પાઠ માટે ઇન્ટરનેટ સાથે જોડાઓ.`,
    kn: `"${actualTopic}" (ತರಗತಿ ${cl} ${actualSubject}) ಈ ಪಾಠವು ಆಫ್‌ಲೈನ್ ಮೋಡ್‌ನಲ್ಲಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ. ಸಂಪೂರ್ಣ ಕನ್ನಡ ಪಾಠಕ್ಕಾಗಿ ಇಂಟರ್ನೆಟ್‌ಗೆ ಸಂಪರ್ಕಿಸಿ.`,
    ml: `"${actualTopic}" (ക്ലാസ് ${cl} ${actualSubject}) ഈ പാഠം ഓഫ്‌ലൈൻ മോഡിൽ ലോഡ് ചെയ്യുന്നു. പൂർണ്ണ മലയാളം പാഠത്തിനായി ഇൻ്റർനെറ്റിലേക്ക് കണക്ട് ചെയ്യുക.`,
    pa: `"${actualTopic}" (ਕਲਾਸ ${cl} ${actualSubject}) ਇਹ ਪਾਠ ਔਫਲਾਈਨ ਮੋਡ ਵਿੱਚ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ। ਪੂਰੇ ਪੰਜਾਬੀ ਪਾਠ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ।`,
    ur: `"${actualTopic}" (کلاس ${cl} ${actualSubject}) یہ سبق آف لائن موڈ میں لوڈ ہو رہا ہے۔ مکمل اردو سبق کے لیے انٹرنیٹ سے جڑیں۔`
  };

  const fallbackExplanation = offlineNotices[lang] || offlineNotices.en;

  res.json({
    success: true,
    provider: 'local_offline',
    title: actualTopic,
    explanation: fallbackExplanation,
    codeMixed: fallbackExplanation.slice(0, 150),
    curriculumPoints: [
      `${actualTopic} — ${actualSubject}`,
      `Class ${cl} NCERT Curriculum`,
      `${langName} medium instruction`
    ],
    regionalExampleUsed: actualRegion
  });
});

// 3. Quiz Generation Endpoint — supports numQuestions, difficulty, and full multilingual output
app.post('/api/learning/quiz', async (req, res) => {
  const { topic, language, classLevel, subject, chapter, numQuestions, difficulty } = req.body;

  const cl = classLevel || 8;
  const lang = language || 'en';
  const actualTopic = topic || 'General Science';
  const actualSubject = subject || 'Science';
  const actualChapter = chapter || '';
  const nq = Math.min(Math.max(parseInt(numQuestions) || 5, 3), 20); // clamp 3-20
  const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
  const langName = LANG_NAMES[lang] || 'English';

  // Difficulty descriptions for LLM
  const diffDescriptions = {
    easy: `Basic recall and definition questions. Focus on "what is" and simple facts. Class ${cl} foundational level. One clearly correct answer.`,
    medium: `Application and understanding questions. "Why/How" type. Connect concepts. NCERT Class ${cl} standard level. Requires some reasoning.`,
    hard: `Analysis, synthesis and critical thinking. Higher-order thinking skills (HOTS). Tricky distractors. Advanced Class ${cl} level. Requires deep understanding.`
  };

  const systemPrompt = `You are a NCERT curriculum quiz generator for Indian school students.

CRITICAL LANGUAGE INSTRUCTION: ALL question text, ALL option text, and ALL explanation text MUST be written ENTIRELY in ${langName}. Do NOT use English unless the selected language IS English. Use the native script (Devanagari for Hindi, Tamil script for Tamil, Bengali script for Bengali, Telugu script for Telugu, etc.). This is MANDATORY.

Generate exactly ${nq} quiz questions on the topic "${actualTopic}" from NCERT Class ${cl} subject "${actualSubject}"${actualChapter ? `, chapter "${actualChapter}"` : ''}.

Difficulty Level: ${diff.toUpperCase()}
Difficulty Description: ${diffDescriptions[diff]}

Rules:
- Every single word of questions, options and explanations MUST be in ${langName}
- Questions must be curriculum-accurate for Class ${cl} NCERT
- Mix types: at least ${Math.ceil(nq * 0.6)} MCQ, at least ${Math.ceil(nq * 0.2)} True/False, rest can be fill-in-blank
- No repeated questions
- Distractors must be plausible but clearly wrong

Return ONLY a valid JSON array (no markdown, no extra text, no code fences):
[
  {
    "type": "mcq",
    "question": "Question text entirely in ${langName}",
    "options": ["Option A in ${langName}", "Option B in ${langName}", "Option C in ${langName}", "Option D in ${langName}"],
    "answer": "Exact correct option text in ${langName}",
    "explanation": "Brief explanation in ${langName}"
  },
  {
    "type": "tf",
    "question": "True/False statement in ${langName}",
    "options": ["True", "False"],
    "answer": "True",
    "explanation": "Explanation in ${langName}"
  },
  {
    "type": "fill",
    "question": "Fill in blank statement in ${langName}: The ___ is ...",
    "answer": "single word answer",
    "explanation": "Explanation in ${langName}"
  }
]`;

  const llmResponse = await queryLLMChain(
    `Quiz:${cl}:${actualSubject}:${actualTopic}:${lang}:${diff}:${nq}`,
    systemPrompt
  );

  if (llmResponse) {
    try {
      let cleanText = llmResponse.text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      const parsed = JSON.parse(cleanText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ success: true, provider: llmResponse.provider, questions: parsed, difficulty: diff, numQuestions: nq });
      }
    } catch (e) {
      console.error('Failed to parse LLM quiz response:', e.message);
    }
  }
  // 1. Dynamic database lookup fallback
  let normalizedTopic = actualTopic.toLowerCase().trim();
  try {
    const curriculumDb = require('./curriculum_db.json');
    const matchedChapter = curriculumDb.find(c => 
      c.classLevel == cl && 
      c.subject.toLowerCase() === actualSubject.toLowerCase() && 
      (c.chapter.toLowerCase().includes(normalizedTopic) || normalizedTopic.includes(c.chapter.toLowerCase()) ||
       c.topics.some(t => t.toLowerCase().includes(normalizedTopic) || normalizedTopic.includes(t.toLowerCase())))
    );
    if (matchedChapter && matchedChapter.quizzes) {
      return res.json({
        success: true,
        provider: 'curriculum_db_fallback',
        questions: matchedChapter.quizzes,
        difficulty: diff,
        numQuestions: nq
      });
    }
  } catch (err) {
    console.error("Database quiz fallback failed:", err);
  }

  // Static fallback for known topics (language-aware)
  let staticKey = null;
  if (normalizedTopic.includes('photosynthesis')) staticKey = 'photosynthesis';
  else if (normalizedTopic.includes('atom')) staticKey = 'atom';
  else if (normalizedTopic.includes('fraction')) staticKey = 'fractions';
  else if (normalizedTopic.includes('solar') || normalizedTopic.includes('system')) staticKey = 'solarsystem';

  if (staticKey && KNOWLEDGE_BASE[staticKey]) {
    return res.json({
      success: true,
      provider: 'local_simulation',
      questions: KNOWLEDGE_BASE[staticKey].quizzes,
      difficulty: diff,
      numQuestions: nq
    });
  }

  // Dynamic multilingual fallback questions templates for all 22 official Indian languages
  const LOCALIZED_DICT = {
    en: {
      coreConcept: "A core concept in {subject}",
      unrelated: "An unrelated subject",
      math: "A mathematical theorem",
      history: "A historical event",
      q_describe: "Which of the following correctly describes \"{topic}\" in Class {classLevel} {subject}?",
      exp_describe: "\"{topic}\" is a fundamental component of the Class {classLevel} {subject} curriculum.",
      whyStudy: "Why is the study of \"{topic}\" important for Class {classLevel}?",
      whyStudyCorrect: "To understand its fundamental principles and real-world applications",
      whyStudyW1: "To skip other important chapters",
      whyStudyW2: "Because it is completely optional and non-examinable",
      whyStudyW3: "To memorize answers without learning context",
      whyStudyExp: "Understanding \"{topic}\" builds a strong foundation for future learning.",
      isPart: "\"{topic}\" is part of the official NCERT Class {classLevel} syllabus for {subject}.",
      isPartExp: "Yes, \"{topic}\" is standardly covered in Class {classLevel} {subject}.",
      noRelation: "True or False: \"{topic}\" has no relation to the subject of {subject}.",
      noRelationExp: "False, \"{topic}\" is deeply integrated into the {subject} syllabus.",
      completeStatement: "Complete the statement: \"{topic}\" is studied in Class {classLevel} under the subject ________.",
      completeExp: "\"{topic}\" is a core unit of the Class {classLevel} {subject} curriculum.",
      boardQuestion: "Which educational board designs the syllabus for \"{topic}\" in Class {classLevel}?",
      boardCorrect: "NCERT",
      boardW1: "Unrecognized Local Board",
      boardW2: "Foreign Education Council",
      boardW3: "None of the above",
      boardExp: "NCERT structures the standard syllabus for \"{topic}\" in Class {classLevel} {subject}.",
      everydayApp: "Which of the following is true about \"{topic}\"?",
      everydayCorrect: "It has practical applications in daily life",
      everydayW1: "It has no real-world application",
      everydayW2: "It is only useful for passing tests",
      everydayW3: "It is purely a theoretical myth",
      everydayExp: "Educational concepts in {subject} are designed to reflect real-world principles.",
      gradeQuestion: "In which grade is \"{topic}\" standardly taught under {subject}?",
      gradeCorrect: "Class {classLevel}",
      gradeW1: "Preschool",
      gradeW2: "University Level",
      gradeW3: "Doctoral Level",
      gradeExp: "This topic is customized for Class {classLevel} students."
    },
    hi: {
      coreConcept: "{subject} में एक मुख्य अवधारणा",
      unrelated: "एक असंबंधित विषय",
      math: "एक गणितीय प्रमेय",
      history: "एक ऐतिहासिक घटना",
      q_describe: "कक्षा {classLevel} {subject} में \"{topic}\" को कौन सही ढंग से परिभाषित करता है?",
      exp_describe: "\"{topic}\" कक्षा {classLevel} {subject} पाठ्यक्रम का एक अनिवार्य हिस्सा है।",
      whyStudy: "कक्षा {classLevel} में \"{topic}\" का अध्ययन क्यों महत्वपूर्ण है?",
      whyStudyCorrect: "इसके बुनियादी सिद्धांतों और वास्तविक अनुप्रयोगों को समझने के लिए",
      whyStudyW1: "अन्य महत्वपूर्ण अध्यायों को छोड़ने के लिए",
      whyStudyW2: "क्योंकि यह पूरी तरह से वैकल्पिक है",
      whyStudyW3: "बिना समझे उत्तरों को रटने के लिए",
      whyStudyExp: "\"{topic}\" को समझना भविष्य की शिक्षा के लिए एक मजबूत आधार तैयार करता है।",
      isPart: "\"{topic}\" आधिकारिक तौर पर कक्षा {classLevel} के {subject} पाठ्यक्रम का हिस्सा है।",
      isPartExp: "हाँ, \"{topic}\" NCERT कक्षा {classLevel} {subject} में शामिल है।",
      noRelation: "सही या गलत: \"{topic}\" का {subject} विषय से कोई संबंध नहीं है।",
      noRelationExp: "गलत, \"{topic}\" सीधे {subject} पाठ्यक्रम से जुड़ा हुआ है।",
      completeStatement: "कथन पूरा करें: कक्षा {classLevel} में \"{topic}\" का अध्ययन ________ विषय के तहत किया जाता है।",
      completeExp: "\"{topic}\" कक्षा {classLevel} {subject} का एक महत्वपूर्ण हिस्सा है।",
      boardQuestion: "कौन सा शैक्षणिक बोर्ड कक्षा {classLevel} में \"{topic}\" के लिए पाठ्यक्रम तैयार करता है?",
      boardCorrect: "NCERT",
      boardW1: "अमान्य स्थानीय बोर्ड",
      boardW2: "विदेशी शिक्षा परिषद",
      boardW3: "इनमें से कोई नहीं",
      boardExp: "NCERT भारत में स्कूली शिक्षा मानकों का समन्वय करता है।",
      everydayApp: "\"{topic}\" के बारे में कौन सा कथन सत्य है?",
      everydayCorrect: "दैनिक जीवन में इसके व्यावहारिक अनुप्रयोग हैं",
      everydayW1: "इसका वास्तविक जीवन में कोई उपयोग नहीं है",
      everydayW2: "यह केवल परीक्षा पास करने के लिए उपयोगी है",
      everydayW3: "यह पूरी तरह से एक काल्पनिक सिद्धांत है",
      everydayExp: "शैक्षणिक अवधारणाओं को वास्तविक दुनिया के सिद्धांतों को दर्शाने के लिए डिज़ाइन किया गया है।",
      gradeQuestion: "इस प्लेटफॉर्म पर \"{topic}\" को मुख्य रूप से किस कक्षा के तहत पढ़ाया जाता है?",
      gradeCorrect: "कक्षा {classLevel}",
      gradeW1: "प्रारंभिक बालवाड़ी",
      gradeW2: "विश्वविद्यालय स्तर",
      gradeW3: "डॉक्टरेट स्तर",
      gradeExp: "यह विषय विशेष रूप से कक्षा {classLevel} के छात्रों के लिए तैयार किया गया है।"
    },
    bn: {
      coreConcept: "{subject}-এর একটি মূল ধারণা",
      unrelated: "একটি অপ্রাসঙ্গিক বিষয়",
      math: "একটি গাণিতিক উপপাদ্য",
      history: "একটি ঐতিহাসিক ঘটনা",
      q_describe: "ক্লাস {classLevel} {subject}-এ \"{topic}\" সম্পর্কে নিচের কোনটি সঠিক?",
      exp_describe: "\"{topic}\" ক্লাস {classLevel} {subject} পাঠ্যক্রমের একটি গুরুত্বপূর্ণ বিষয়।",
      whyStudy: "ক্লাস {classLevel} শিক্ষার্থীদের জন্য \"{topic}\"-এর অধ্যয়ন কেন গুরুত্বপূর্ণ?",
      whyStudyCorrect: "এর মৌলিক নীতি এবং বাস্তব প্রয়োগগুলি বোঝার জন্য",
      whyStudyW1: "অন্যান্য গুরুত্বপূর্ণ অধ্যায়গুলি এড়ানোর জন্য",
      whyStudyW2: "কারণ এটি সম্পূর্ণ ঐচ্ছিক",
      whyStudyW3: "না বুঝে উত্তর মুখস্থ করার জন্য",
      whyStudyExp: "\"{topic}\" বোঝা ভবিষ্যতের শিক্ষার জন্য একটি শক্ত ভিত্তি তৈরি করে।",
      isPart: "\"{topic}\" ক্লাস {classLevel} {subject} পাঠ্যক্রমের একটি অংশ।",
      isPartExp: "হ্যাঁ, \"{topic}\" NCERT ক্লাস {classLevel} {subject}-এ পড়ানো হয়।",
      noRelation: "সত্য বা মিথ্যা: \"{topic}\"-এর সাথে {subject}-এর কোনো সম্পর্ক নেই।",
      noRelationExp: "মিথ্যা, \"{topic}\" সরাসরি {subject} পাঠ্যক্রমের সাথে যুক্ত।",
      completeStatement: "শূন্যস্থান পূরণ করুন: ক্লাস {classLevel}-এ \"{topic}\" ________ বিষয়ের অধীনে পড়ানো হয়।",
      completeExp: "\"{topic}\" হলো ক্লাস {classLevel} {subject}-এর একটি মূল অংশ।",
      boardQuestion: "কোন শিক্ষাবোর্ড ক্লাস {classLevel}-এ \"{topic}\"-এর সিলেবাস তৈরি করে?",
      boardCorrect: "NCERT",
      boardW1: "অস্বীকৃত স্থানীয় বোর্ড",
      boardW2: "বিদেশী শিক্ষা পরিষদ",
      boardW3: "উপরের কোনোটিই নয়",
      boardExp: "NCERT ভারতে বিদ্যালয়ের শিক্ষার মান নির্ধারণ করে।",
      everydayApp: "\"{topic}\" সম্পর্কে নিচের কোনটি সত্য?",
      everydayCorrect: "দৈনন্দিন জীবনে এর ব্যবহারিক প্রয়োগ রয়েছে",
      everydayW1: "বাস্তব জীবনে এর কোনো প্রয়োগ নেই",
      everydayW2: "এটি শুধুমাত্র পরীক্ষা পাসের জন্য দরকারী",
      everydayW3: "এটি সম্পূর্ণ কাল্পনিক তত্ত্ব",
      everydayExp: "পাঠ্যক্রমের ধারণাগুলি বাস্তব বিশ্বের নীতিগুলি প্রতিফলিত করার জন্য তৈরি করা হয়।"
    },
    ta: {
      coreConcept: "{subject}-ன் முக்கிய கருத்து",
      unrelated: "தொடர்பில்லாத பாடம்",
      math: "ஒரு கணித தேற்றம்",
      history: "ஒரு வரலாற்று நிகழ்வு",
      q_describe: "வகுப்பு {classLevel} {subject}-ல் \"{topic}\" என்பதை பின்வருவனவற்றில் எது சரியாக விவரிக்கிறது?",
      exp_describe: "\"{topic}\" என்பது வகுப்பு {classLevel} {subject} பாடத்திட்டத்தின் முக்கிய பகுதியாகும்.",
      whyStudy: "வகுப்பு {classLevel} மாணவர்கள் \"{topic}\" பற்றி படிப்பது ஏன் முக்கியம்?",
      whyStudyCorrect: "அதன் அடிப்படை கொள்கைகளையும் நிஜ உலக பயன்பாடுகளையும் புரிந்து கொள்ள",
      whyStudyW1: "மற்ற முக்கிய பாடங்களை தவிர்க்க",
      whyStudyW2: "ஏனெனில் இது முற்றிலும் விருப்பத்திற்குரியது",
      whyStudyW3: "புரிந்து கொள்ளாமல் மனப்பாடம் செய்ய",
      whyStudyExp: "\"{topic}\" பற்றிய புரிதல் எதிர்கால கற்றலுக்கு ஒரு வலுவான அடித்தளத்தை உருவாக்குகிறது.",
      isPart: "\"{topic}\" என்பது வகுப்பு {classLevel} {subject} பாடத்திட்டத்தின் ஒரு பகுதியாகும்.",
      isPartExp: "ஆம், \"{topic}\" NCERT வகுப்பு {classLevel} {subject}-ல் கற்பிக்கப்படுகிறது.",
      noRelation: "சரியா தவறா: \"{topic}\" கருத்துக்கும் {subject} பாடத்திற்கும் எந்த தொடர்பும் இல்லை.",
      noRelationExp: "தவறு, \"{topic}\" நேரடியாக {subject} பாடத்திட்டத்துடன் இணைக்கப்பட்டுள்ளது.",
      completeStatement: "கோடிட்ட இடத்தை நிரப்புக: வகுப்பு {classLevel}-ல் \"{topic}\" ________ பாடத்தின் கீழ் கற்பிக்கப்படுகிறது.",
      completeExp: "\"{topic}\" என்பது வகுப்பு {classLevel} {subject}-ன் ஒரு முக்கிய அலகு ஆகும்.",
      boardQuestion: "வகுப்பு {classLevel}-ல் \"{topic}\" உட்பட பாடத்திட்டத்தை வடிவமைக்கும் கல்வி வாரியம் எது?",
      boardCorrect: "NCERT",
      boardW1: "அங்கீகரிக்கப்படாத உள்ளூர் வாரியம்",
      boardW2: "வெளிநாட்டு கல்வி கவுன்சில்",
      boardW3: "எதுவும் இல்லை",
      boardExp: "NCERT இந்தியாவில் பள்ளி கல்வி தரநிலைகளை ஒருங்கிணைக்கிறது."
    },
    te: {
      coreConcept: "{subject} లో ఒక ముఖ్యమైన అంశం",
      unrelated: "సంబంధం లేని అంశం",
      math: "గణిత సిద్ధాంతం",
      history: "చారిత్రక సంఘటన",
      q_describe: "తరగతి {classLevel} {subject} లో \"{topic}\" ని క్రింది వాటిలో ఏది సరైనదిగా వివరిస్తుంది?",
      exp_describe: "\"{topic}\" అనేది తరగతి {classLevel} {subject} పాఠ్యాంశాల్లో ఒక ముఖ్యమైన భాగం.",
      whyStudy: "తరగతి {classLevel} విద్యార్థులు \"{topic}\" చదవడం ఎందుకు ముఖ్యం?",
      whyStudyCorrect: "దాని ప్రాథమిక సూత్రాలు మరియు నిజ జీవిత అనువర్తనాలను అర్థం చేసుకోవడానికి",
      whyStudyW1: "ఇతర ముఖ్యమైన అధ్యాయాలను వదిలివేయడానికి",
      whyStudyW2: "ఎందుకంటే ఇది కేవలం ఐచ్ఛికం",
      whyStudyW3: "అర్థం చేసుకోకుండా కేవలం బట్టీ పట్టడానికి",
      whyStudyExp: "\"{topic}\" అర్థం చేసుకోవడం భవిష్యత్తు అభ్యాసానికి బలమైన పునాదిని ఇస్తుంది.",
      isPart: "\"{topic}\" అనేది అధికారికంగా తరగతి {classLevel} {subject} సిలబస్ లో భాగం.",
      isPartExp: "అవును, \"{topic}\" NCERT తరగతి {classLevel} {subject} లో బోధించబడుతుంది.",
      noRelation: "నిజమా అబద్ధమా: \"{topic}\" కి {subject} తో ఎటువంటి సంబంధం లేదు.",
      noRelationExp: "అబద్ధం, \"{topic}\" నేరుగా {subject} సిలబస్ కి సంబంధించినది.",
      completeStatement: "క్రింది ఖాళీని పూరించండి: తరగతి {classLevel} లో \"{topic}\" ________ సబ్జెక్టు కింద చదువుతాము.",
      completeExp: "\"{topic}\" అనేది తరగతి {classLevel} {subject} లో ప్రధాన అధ్యాయం."
    },
    mr: {
      coreConcept: "{subject} मधील एक मुख्य संकल्पना",
      unrelated: "एक असंबंधित विषय",
      math: "एक गणितीय सिद्धांत",
      history: "एक ऐतिहासिक घटना",
      q_describe: "इयत्ता {classLevel} {subject} मध्ये \"{topic}\" चे योग्य वर्णन कोणते आहे?",
      exp_describe: "\"{topic}\" हा इयत्ता {classLevel} {subject} अभ्यासक्रमातील एक महत्त्वाचा भाग आहे।",
      whyStudy: "इयत्ता {classLevel} च्या विद्यार्थ्यांसाठी \"{topic}\" चा अभ्यास का महत्त्वाचा आहे?",
      whyStudyCorrect: "त्याचे मूलभूत सिद्धांत आणि व्यावहारिक उपयोग समजून घेण्यासाठी",
      whyStudyW1: "इतर धडे शिकणे टाळण्यासाठी",
      whyStudyW2: "कारण हा विषय पूर्णपणे पर्यायी आहे",
      whyStudyW3: "संकल्पना न समजता फक्त पाठांतर करण्यासाठी",
      whyStudyExp: "\"{topic}\" समजल्याने भविष्यातील शिक्षणासाठी एक मजबूत पाया तयार होतो।",
      isPart: "\"{topic}\" हा अधिकृतपणे इयत्ता {classLevel} {subject} अभ्यासक्रमाचा भाग आहे।",
      isPartExp: "होय, \"{topic}\" NCERT इयत्ता {classLevel} {subject} मध्ये शिकवला जातो।",
      noRelation: "खरे की खोटे: \"{topic}\" चा {subject} विषयाशी काहीही संबंध नाही।",
      noRelationExp: "खोटे, \"{topic}\" थेट {subject} अभ्यासक्रमाशी जोडलेला आहे।"
    },
    gu: {
      coreConcept: "{subject} નો એક મુખ્ય મુદ્દો",
      unrelated: "એક અસંબંધિત વિષય",
      math: "એક ગણિત પ્રમેય",
      history: "એક ઐતિહાસિક ઘટના",
      q_describe: "ધોરણ {classLevel} {subject}માં \"{topic}\" માટે નીચેનામાંથી કયું વિધાન સાચું છે?",
      exp_describe: "\"{topic}\" એ NCERT ધોરણ {classLevel} {subject} નો એક મહત્વનો વિષય છે.",
      whyStudy: "ધોરણ {classLevel} ના વિદ્યાર્થીઓ માટે \"{topic}\" નો અભ્યાસ શા માટે જરૂરી છે?",
      whyStudyCorrect: "તેના પાયાના સિદ્ધાંતો અને વ્યવહારિક ઉપયોગો સમજવા માટે",
      whyStudyW1: "બીજા મહત્વના પ્રકરણો છોડવા માટે",
      whyStudyW2: "કારણ કે આ વિષય વૈકલ્પિક છે",
      whyStudyW3: "સમજ્યા વગર ગોખણપટ્ટી કરવા માટે",
      whyStudyExp: "\"{topic}\" ની સમજણ ભવિષ્યના અભ્યાસ માટે મજબૂત પાયો પૂરો પાડે છે.",
      isPart: "\"{topic}\" એ સત્તાવાર રીતે ધોરણ {classLevel} {subject} અભ્યાસક્રમનો ભાગ છે.",
      isPartExp: "હા, \"{topic}\" NCERT ધોરણ {classLevel} {subject} માં સામેલ છે.",
      noRelation: "સાચું કે ખોટું: \"{topic}\" ને {subject} વિષય સાથે કોઈ સંબંધ નથી.",
      noRelationExp: "ખોટું, \"{topic}\" સીધો જ {subject} અભ્યાસક્રમ સાથે જોડાયેલ છે."
    },
    kn: {
      coreConcept: "{subject} ನ ಪ್ರಮುಖ ಭಾಗ",
      unrelated: "ಸಂಬಂಧವಿಲ್ಲದ ವಿಷಯ",
      math: "ಒಂದು ಗಣಿತದ ಪ್ರಮೇಯ",
      history: "ಒಂದು ಐತಿಹಾಸಿಕ ಘಟನೆ",
      q_describe: "ತರಗತಿ {classLevel} {subject} ನಲ್ಲಿ \"{topic}\" ಅನ್ನು ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಯಾವುದು ಸರಿಯಾಗಿ ವಿವರಿಸುತ್ತದೆ?",
      exp_describe: "\"{topic}\" ಎನ್ನುವುದು NCERT ತರಗತಿ {classLevel} {subject} ನ ಪ್ರಮುಖ ವಿಷಯವಾಗಿದೆ.",
      whyStudy: "ತರಗತಿ {classLevel} ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ \"{topic}\" ಅಭ್ಯಾಸ ಮಾಡುವುದು ಏಕೆ ಮುಖ್ಯ?",
      whyStudyCorrect: "ಅದರ ಮೂಲಭೂತ ತತ್ವಗಳನ್ನು ಮತ್ತು ನೈಜ ಅನ್ವಯಗಳನ್ನು ತಿಳಿಯಲು",
      whyStudyW1: "ಬೇರೆ ಅಧ್ಯಾಯಗಳನ್ನು ಓದುವುದನ್ನು ತಪ್ಪಿಸಲು",
      whyStudyW2: "ಯಾಕೆಂದರೆ ಇದು ಕೇವಲ ಐಚ್ಛಿಕ ವಿಷಯ",
      whyStudyW3: "ತಿಳಿಯದೇ ಕೇವಲ ಬಾಯಿಪಾಠ ಮಾಡಲು",
      whyStudyExp: "\"{topic}\" ವಿಷಯದ ತಿಳುವಳಿಕೆಯು ಮುಂದಿನ ಕಲಿಕೆಗೆ ಬಲವಾದ ಅಡಿಪಾಯ ಹಾಕುತ್ತದೆ.",
      isPart: "\"{topic}\" ತರಗತಿ {classLevel} {subject} ಪಠ್ಯಕ್ರಮದ ಭಾಗವಾಗಿದೆ.",
      isPartExp: "ಹೌದು, \"{topic}\" ವಿಷಯವು NCERT ತರಗತಿ {classLevel} {subject} ನಲ್ಲಿದೆ."
    },
    ml: {
      coreConcept: "{subject}-ലെ ഒരു പ്രധാന ഭാഗം",
      unrelated: "ബന്ധമില്ലാത്ത ഒരു വിഷയം",
      math: "ഒരു ഗണിത സിദ്ധാന്തം",
      history: "ഒരു ചരിത്ര സംഭവം",
      q_describe: "ക്ലാസ്സ് {classLevel} {subject}-ൽ \"{topic}\" എന്നതിനെക്കുറിച്ച് താഴെ പറയുന്നവയിൽ ഏതാണ് ശരി?",
      exp_describe: "\"{topic}\" എന്നത് NCERT ക്ലാസ്സ് {classLevel} {subject}-ൽ വളരെ പ്രധാനപ്പെട്ട ഒരു വിഷയമാണ്.",
      whyStudy: "ക്ലാസ്സ് {classLevel} വിദ്യാർത്ഥികൾ \"{topic}\" പഠിക്കേണ്ടത് എന്തുകൊണ്ടാണ്?",
      whyStudyCorrect: "അതിൻ്റെ അടിസ്ഥാന തത്വങ്ങളും പ്രായോഗിക വശങ്ങളും മനസ്സിലാക്കാൻ",
      whyStudyW1: "മറ്റ് പ്രധാന അധ്യായങ്ങൾ ഒഴിവാക്കാൻ",
      whyStudyW2: "കാരണം ഇത് പൂർണ്ണമായും ഐച്ഛികമാണ്",
      whyStudyW3: "കാര്യങ്ങൾ ഗ്രഹിക്കാതെ മനപ്പാഠമാക്കാൻ",
      whyStudyExp: "\"{topic}\" എന്നതിനെക്കുറിച്ചുള്ള അറിവ് ഭാവി പഠനത്തിന് മികച്ച അടിത്തറ നൽകുന്നു.",
      isPart: "\"{topic}\" എന്നത് ക്ലാസ്സ് {classLevel} {subject} സിലബസിന്റെ ഭാഗമാണ്."
    },
    pa: {
      coreConcept: "{subject} ਦਾ ਇੱਕ ਮੁੱਖ ਵਿਸ਼ਾ",
      unrelated: "ਇੱਕ ਗੈਰ-ਸੰਬੰਧਿਤ ਵਿਸ਼ਾ",
      math: "ਇੱਕ ਗਣਿਤ ਸਿਧਾਂਤ",
      history: "ਇੱਕ ਇਤਿਹਾਸਕ ਘਟਨਾ",
      q_describe: "ਜਮਾਤ {classLevel} {subject} ਵਿੱਚ \"{topic}\" ਬਾਰੇ ਕਿਹੜਾ ਕਥਨ ਸਹੀ ਹੈ?",
      exp_describe: "\"{topic}\" NCERT ਜਮਾਤ {classLevel} {subject} ਦਾ ਇੱਕ ਮੁੱਖ ਹਿੱਸਾ ਹੈ।",
      whyStudy: "ਜਮਾਤ {classLevel} ਦੇ ਵਿਦਿਆਰਥੀਆਂ ਲਈ \"{topic}\" ਪੜ੍ਹਨਾ ਕਿਉਂ ਜ਼ਰੂਰੀ ਹੈ?",
      whyStudyCorrect: "ਇਸ ਦੇ ਮੁਢਲੇ ਸਿਧਾਂਤਾਂ ਅਤੇ ਅਸਲ ਜੀਵਨ ਵਿੱਚ ਵਰਤੋਂ ਨੂੰ ਸਮਝਣ ਲਈ",
      whyStudyW1: "ਬਾਕੀ ਪਾਠਾਂ ਨੂੰ ਛੱਡਣ ਲਈ",
      whyStudyW2: "ਕਿਉਂਕਿ ਇਹ ਪੂਰੀ ਤਰ੍ਹਾਂ ਵਿਕਲਪਿਕ ਹੈ",
      whyStudyW3: "ਬਿਨਾਂ ਸਮਝੇ ਰੱਟਾ ਲਗਾਉਣ ਲਈ",
      whyStudyExp: "\"{topic}\" ਦੀ ਸਮਝ ਵਿਦਿਆਰਥੀ ਦੇ ਭਵਿੱਖ ਦੀ ਪੜ੍ਹਾਈ ਲਈ ਮਜ਼ਬੂਤ ਅਧਾਰ ਬਣਾਉਂਦੀ ਹੈ।"
    },
    or: {
      coreConcept: "{subject} ର ଏକ ମୁଖ୍ୟ ପ୍ରସଙ୍ଗ",
      unrelated: "ଏକ ଅସମ୍ପୃକ୍ତ ବିଷୟ",
      math: "ଏକ ଗଣିତ ପ୍ରମେୟ",
      history: "ଏକ ଐତିହାସିକ ଘଟଣା",
      q_describe: "ଶ୍ରେଣୀ {classLevel} {subject} ରେ \"{topic}\" ବିଷୟରେ କେଉଁଟି ସଠିକ୍ ଅଟେ?",
      exp_describe: "\"{topic}\" ହେଉଛି NCERT ଶ୍ରେଣୀ {classLevel} {subject} ର ଏକ ମୁଖ୍ୟ ବିଷୟ।",
      whyStudy: "ଶ୍ରେଣୀ {classLevel} ର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ \"{topic}\" ର ଅଧ୍ୟୟନ କାହିଁକି ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ?",
      whyStudyCorrect: "ଏହାର ମୌଳିକ ନିୟମ ଏବଂ ବାସ୍ତବିକ ପ୍ରୟୋଗକୁ ବୁଝିବା ପାଇଁ",
      whyStudyW1: "ଅନ୍ୟାନ୍ୟ ଅଧ୍ୟାୟକୁ ନ ପଢିବା ପାଇଁ",
      whyStudyW2: "କାରଣ ଏହା ସମ୍ପୂର୍ଣ୍ଣ ବୈକଳ୍ପିକ ଅଟେ",
      whyStudyW3: "बिना बुझि मुखस्थ କରିବା ପାଇଁ",
      whyStudyExp: "\"{topic}\" କୁ ବୁଝିବା ଦ୍ୱାରା ଆଗାମୀ ଶିକ୍ଷା ପାଇଁ ଏକ ଦୃଢ଼ ଭିତ୍ତିଭୂମି ପ୍ରସ୍ତୁତ ହୁଏ।"
    },
    ur: {
      coreConcept: "{subject} کا ایک بنیادی تصور",
      unrelated: "ایک غیر متعلقہ مضمون",
      math: "ریاضی کا ایک اصول",
      history: "ایک تاریخی واقعہ",
      q_describe: "کلاس {classLevel} {subject} میں \"{topic}\" کی صحیح تعریف کیا ہے؟",
      exp_describe: "\"{topic}\" این سی ای آر ٹی کلاس {classLevel} {subject} کا ایک بنیادی موضوع ہے۔",
      whyStudy: "کلاس {classLevel} کے طلباء کے لیے \"{topic}\" کا مطالعہ کیوں ضروری ہے؟",
      whyStudyCorrect: "اس کے بنیادی اصولوں اور حقیقی زندگی کے اطلاقات کو سمجھنے کے لیے",
      whyStudyW1: "دیگر اسباق کو چھوڑنے کے لیے",
      whyStudyW2: "کیونکہ یہ بالکل اختیاری ہے",
      whyStudyW3: "بغیر سمجھے رٹا لگانے کے لیے",
      whyStudyExp: "\"{topic}\" کو سمجھنے سے مستقبل کے تعلیمی تصورات کے لیے ایک مضبوط بنیاد بنتی ہے۔"
    },
    as: {
      coreConcept: "{subject}ৰ এক মূল বিষয়",
      unrelated: "এটা অপ্ৰাসংগিক বিষয়",
      math: "এটা গাণিতিক উপপাদ্য",
      history: "এটা ঐতিহাসিক ঘটনা",
      q_describe: "শ্ৰেণী {classLevel} {subject}ত \"{topic}\"ৰ বিষয়ত কোনটো শুদ্ধ?",
      exp_describe: "\"{topic}\" শ্ৰေণী {classLevel} {subject}ৰ পাঠ্যক্ৰমৰ এক অপৰিহাৰ্য অংশ।",
      whyStudy: "শ্ৰেণী {classLevel}ৰ শিক্ষাৰ্থীৰ বাবে \"{topic}\" কিয় গুৰুত্বপূৰ্ণ?",
      whyStudyCorrect: "ইয়াৰ মূল সূত্ৰ আৰু ব্যৱহাৰিক প্ৰয়োগসমূহ বুজিবলৈ",
      whyStudyW1: "অন্যান্য গুৰুত্বপূৰ্ণ অধ্যায়সমূহ এৰাই চলিবਲৈ",
      whyStudyW2: "কাৰণ ই সম্পੂৰ্ণৰূপে বৈকল্পিক",
      whyStudyW3: "বুজি নোপোৱাকৈ মুখস্থ কৰিবলৈ",
      whyStudyExp: "\"{topic}\" বুজি উঠিলে পৰৱৰ্তী শিক্ষাগ্ৰহণৰ বাবে ভেটি শক্তিশালী হয়।"
    },
    sa: {
      coreConcept: "{subject} विषयस्य मुख्यभागः",
      unrelated: "असम्बद्धः विषयः",
      math: "गणितीयं प्रमेयम्",
      history: "ऐतिहासिकघटना",
      q_describe: "कक्षा {classLevel} {subject} इत्यस्मिन् \"{topic}\" विषये किं सत्यम् अस्ति?",
      exp_describe: "\"{topic}\" कक्षा {classLevel} {subject} पाठ्यक्रमस्य महत्वपूर्णः भागः अस्ति।",
      whyStudy: "कक्षा {classLevel} छात्राणां कृते \"{topic}\" अध्ययनं किमर्थं आवश्यकम्?",
      whyStudyCorrect: "अस्य मूलभूतसिद्धान्तान् व्यावहारिकप्रयोगान् च ज्ञातुम्",
      whyStudyW1: "इतरपाठान् त्यक्तुम्",
      whyStudyW2: "यतो हि एषः विषयः वैकल्पिकः अस्ति",
      whyStudyW3: "केवलं रटनं कर्तुम्",
      whyStudyExp: "\"{topic}\" अवगमनेन अग्रिमशिक्षा सुदृढा भवति।"
    },
    ne: {
      coreConcept: "{subject} को एक मुख्य अवधारणा",
      unrelated: "एक असम्बन्धित विषय",
      math: "एक गणितीय प्रमेय",
      history: "एक ऐतिहासिक घटना",
      q_describe: "कक्षा {classLevel} {subject} मा \"{topic}\" को बारेमा कुन सही छ?",
      exp_describe: "\"{topic}\" कक्षा {classLevel} {subject} पाठ्यक्रमको एक मुख्य भाग हो।",
      whyStudy: "कक्षा {classLevel} का विद्यार्थीहरूका लागि \"{topic}\" को अध्ययन किन आवश्यक छ?",
      whyStudyCorrect: "यसको आधारभूत सिद्धान्त र वास्तविक जीवनका प्रयोगहरू bujhna",
      whyStudyW1: "अन्य पाठहरू नपढ्नका लागि",
      whyStudyW2: "किनकि यो केवल वैकल्पिक हो",
      whyStudyW3: "बिना बुझी सम्झनका लागि",
      whyStudyExp: "\"{topic}\" को बुझाइले भविष्यको अध्ययनको लागि आधार तयार गर्दछ।"
    },
    kok: {
      coreConcept: "{subject} विषयचे एक मुखेल संकल्पना",
      unrelated: "एक असंबंदीत विशय",
      math: "एक गणितीय सिद्धांत",
      history: "एक इतिहासीक गजाल",
      q_describe: "इयत्ता {classLevel} {subject} मदीं \"{topic}\" विशीं खंयचें विधान खरें आसा?",
      exp_describe: "\"{topic}\" हो इयत्ता {classLevel} {subject} अभ्यासक्रमाचो मुखेल भाग आसा।",
      whyStudy: "इयत्ता {classLevel} च्या भुरग्यां खातीर \"{topic}\" शिकप कित्याक गरजेचे आसा?",
      whyStudyCorrect: "त्याचे मूळ सिद्धांत आनी प्रयोगात्मक उपेग समजून घेवपाक",
      whyStudyW1: "हेर धडे शिकप टाळपाक",
      whyStudyW2: "किच्याक हो विशय वैकल्पिक आसा",
      whyStudyW3: "न समजता पाठांतर करपाक",
      whyStudyExp: "\"{topic}\" समजल्यार मुखावयल्या शिक्षणाक बरें व्हड फाटबळ मेळटा।"
    },
    sd: {
      coreConcept: "{subject} جو هڪ بنيادي تصور",
      unrelated: "هڪ غير لاڳاپيل مضمون",
      math: "رياضي جو اصول",
      history: "تاريخي واقعو",
      q_describe: "ڪلاس {classLevel} {subject} ۾ \"{topic}\" جي صحيح व्याख्या ڪهڙي آهي؟",
      exp_describe: "\"{topic}\" ڪلاس {classLevel} {subject} جي نصاب جو حصো آهي.",
      whyStudy: "ڪلاس {classLevel} جي شاگردن لاءِ \"{topic}\" جو مطالعو ڇو ضروري آهي؟",
      whyStudyCorrect: "ان جي بنيادي اصولن ۽ حقيقي زندگي جي عملي فائدن کي سمجهڻ لاءِ",
      whyStudyW1: "ٻين اهم سبقاڻن کي ڇڏڻ لاءِ",
      whyStudyW2: "ڇاڪاڻ ته هي اختياري آهي",
      whyStudyW3: "بغير سمجهڻ جي ياد ڪرڻ لاءِ",
      whyStudyExp: "\"{topic}\" کي سمجهڻ سان تعليمی بنیاد مضبوط ٿئي ٿو."
    },
    ks: {
      coreConcept: "{subject} ہند اکھ اہم مضمون",
      unrelated: "اکھ غیر متعلقہ موضوع",
      math: "ریاضی ہند اصول",
      history: "اکھ تاریخ واقعہ",
      q_describe: "کلاس {classLevel} {subject} منز \"{topic}\" متعلق کیا چھ پزیر?",
      exp_describe: "\"{topic}\" چھ کلاس {classLevel} {subject} نصابک حصہ۔",
      whyStudy: "کلاس {classLevel} طالب علمن ختر \"{topic}\" ہیچھن کیاز چھ ضروری؟",
      whyStudyCorrect: "امیکھ بنیادی اصول تے عملی استعمال سمجھنہ ختر",
      whyStudyW1: "باقی سبق تراونہ ختر",
      whyStudyW2: "کیزہ یہ چھ اختیاری",
      whyStudyW3: "بغیر سمجھنہ رٹہ لاونہ ختر",
      whyStudyExp: "\"{topic}\" سمجھنہ سعت چھ مستقبلک تعلیم پختہ گژھان।"
    },
    doi: {
      coreConcept: "{subject} दा इक मुख्य विषय",
      unrelated: "इक असंबद्ध विषय",
      math: "इक गणितीय सिद्धांत",
      history: "इक ऐतिहासिक घटना",
      q_describe: "जमात {classLevel} {subject} च \"{topic}\" दा सही विवरण केहड़ा ऐ?",
      exp_describe: "\"{topic}\" जमात {classLevel} {subject} दा इक जरूरी भाग ऐ।",
      whyStudy: "जमात {classLevel} दे बच्चें लेई \"{topic}\" दा पढ़ना केहड़े कारण जरूरी ऐ?",
      whyStudyCorrect: "इसदे बुनियादी सिद्धांतें ते व्यावहारिक उपयोगें गी समझने लेई",
      whyStudyW1: "बाकी दे पाठें गी छड्डने लेई",
      whyStudyW2: "क्योंकि ए वैकल्पिक ऐ",
      whyStudyW3: "बिना समझे याद करने लेई",
      whyStudyExp: "\"{topic}\" गी समझन कन्ने अग्गें दी पढ़ाई मजबूत ओंदी ऐ।"
    },
    sat: {
      coreConcept: "{subject} रेनाः मुख्य विषय",
      unrelated: "एटाः विषय",
      math: "एलखा सिद्धान्त",
      history: "नागाम घटना",
      q_describe: "कक्षा {classLevel} {subject} रे \"{topic}\" बाबत ओकेटाः साःरी गेया?",
      exp_describe: "\"{topic}\" कक्षा {classLevel} {subject} रेनाः भाग काना।",
      whyStudy: "कक्षा {classLevel} पाठुवः को लगीः \"{topic}\" चेदः चेद एतोन लाकती गेया?",
      whyStudyCorrect: "अना रेनाः मूल सिद्धांत आउ व्यवहार को बुझःव लगीः",
      whyStudyW1: "एटाः पाठ को बागी लगीः",
      whyStudyW2: "चेदाः जे इ वैकल्पिक काना",
      whyStudyW3: "बिना बुझःव ते रटाव लगीः",
      whyStudyExp: "\"{topic}\" बुझःव ते तायोम रेनाः चेदःव रे गोड़ोः आः।"
    },
    mni: {
      coreConcept: "{subject} গী মরুওইবা হিরમ অমনি",
      unrelated: "অতোপ্পা হিরમ অমনি",
      math: "ম্যাথমেটিক্স থিওরিম",
      history: "ইতিহাসকী থৌদोक অমনি",
      q_describe: "ক্লাস {classLevel} {subject} গী মনুংদা \"{topic}\" অসিবু করম্বা অমনা অচুম্বা ওইগনি?",
      exp_describe: "\"{topic}\" অসি ক্লাস {classLevel} {subject} সিলেবস্কী শরক্তা য়াওরি।",
      whyStudy: "ক্লাস {classLevel} গী মহৈরোইশিংগীদমক \"{topic}\" অসি তামিন্নবা করীগী মরুওইবনো?",
      whyStudyCorrect: "সিগী মরুওইবা ৱাখল্লোনশিং অমসুং মদু লमদমসিদা করম্না শীজিন্নবগে খঙনবা",
      whyStudyW1: "অতোপ্পা চ্যাপ্টারশিং লান্থोकनबा",
      whyStudyW2: "মরমদি অসি ঐচ্ছিক ওইবনা",
      whyStudyW3: "ৱাহন্থোক খঙদনা মুখস্থ তৌনবা",
      whyStudyExp: "\"{topic}\" অসি খঙবা তুংগী মহৈ-মশিংগী য়ুম্বী অম ওইগনি।"
    }
  };

  const getTranslation = (key) => {
    const dict = LOCALIZED_DICT[lang] || LOCALIZED_DICT.en;
    const val = dict[key] || LOCALIZED_DICT.en[key] || '';
    return val
      .replace(/{topic}/g, actualTopic)
      .replace(/{subject}/g, actualSubject)
      .replace(/{classLevel}/g, cl);
  };

  const fallbackQuestions = [];
  const standardOptions = [
    getTranslation('coreConcept'),
    getTranslation('unrelated'),
    getTranslation('math'),
    getTranslation('history')
  ];

  const questionPool = [
    {
      type: 'mcq',
      question: getTranslation('q_describe'),
      options: [...standardOptions],
      answer: getTranslation('coreConcept'),
      explanation: getTranslation('exp_describe')
    },
    {
      type: 'tf',
      question: getTranslation('isPart'),
      options: ['True', 'False'],
      answer: 'True',
      explanation: getTranslation('isPartExp')
    },
    {
      type: 'mcq',
      question: getTranslation('whyStudy'),
      options: [
        getTranslation('whyStudyCorrect'),
        getTranslation('whyStudyW1'),
        getTranslation('whyStudyW2'),
        getTranslation('whyStudyW3')
      ],
      answer: getTranslation('whyStudyCorrect'),
      explanation: getTranslation('whyStudyExp')
    },
    {
      type: 'tf',
      question: getTranslation('noRelation'),
      options: ['True', 'False'],
      answer: 'False',
      explanation: getTranslation('noRelationExp')
    },
    {
      type: 'fill',
      question: getTranslation('completeStatement'),
      answer: actualSubject,
      explanation: getTranslation('completeExp')
    },
    {
      type: 'mcq',
      question: getTranslation('boardQuestion'),
      options: [
        getTranslation('boardCorrect'),
        getTranslation('boardW1'),
        getTranslation('boardW2'),
        getTranslation('boardW3')
      ],
      answer: getTranslation('boardCorrect'),
      explanation: getTranslation('boardExp')
    },
    {
      type: 'mcq',
      question: getTranslation('everydayApp'),
      options: [
        getTranslation('everydayCorrect'),
        getTranslation('everydayW1'),
        getTranslation('everydayW2'),
        getTranslation('everydayW3')
      ],
      answer: getTranslation('everydayCorrect'),
      explanation: getTranslation('everydayExp')
    },
    {
      type: 'mcq',
      question: getTranslation('gradeQuestion'),
      options: [
        getTranslation('gradeCorrect'),
        getTranslation('gradeW1'),
        getTranslation('gradeW2'),
        getTranslation('gradeW3')
      ],
      answer: getTranslation('gradeCorrect'),
      explanation: getTranslation('gradeExp')
    }
  ];

  // Populate fallback questions to reach the exact requested question count (nq)
  for (let i = 0; i < nq; i++) {
    const templateIdx = i % questionPool.length;
    const baseQ = questionPool[templateIdx];
    // Create copy with slightly varied text/index to make it feel unique
    fallbackQuestions.push({
      ...baseQ,
      question: baseQ.question + (i >= questionPool.length ? ` (${Math.floor(i / questionPool.length) + 1})` : '')
    });
  }

  res.json({
    success: true,
    provider: 'local_dynamic',
    questions: fallbackQuestions,
    difficulty: diff,
    numQuestions: nq
  });
});

// 4. Feynman Socratic Discussion
app.post('/api/learning/feynman/start', (req, res) => {
  const { topic, language, classLevel } = req.body;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const t = topic || 'this topic';

  // Multilingual Feynman intro for all major Indian languages
  const feynmanIntros = {
    en: 'Great! Explain ' + t + ' in your own words, as if I am a 10-year-old. I will ask deeper questions!',
    hi: t + ' को मुझे अपने शब्दों में समझाएं, जैसे मैं 10 साल का बच्चा हूँ। मैं और प्रश्न पूछूँगा!',
    bn: t + ' আমাকে নিজের ভাষায় বুঝিয়ে দিন, যেন আমি ১০ বছরের শিশু। প্রশ্ন করব!',
    ta: t + ' பற்றி நான் 10 வயது குழந்தை என்று கற்பனை செய்து விளக்குங்கள்!',
    te: t + ' గురించి నేను 10 సంవత్సరాల పిల్లవాడు అని ఊహించి వివరించండి!',
    mr: t + ' मी 10 वर्षांचा मुलगा आहे असे समजून सांगा!',
    gu: t + ' ને હું 10 વર્ષનો બાળ છું એ માની સમજાવો!',
    kn: t + ' ಬಗ್ಗೆ ನಾನು 10 ವರ್ಷದ ಮಗು ಎಂದು ತಿಳಿದು ವಿವರಿಸಿ!',
    ml: t + ' ഞാൻ 10 വയസ്സുള്ള കുട്ടിയാണ് എന്ന് കരുതി വിശദീകരിക്കൂ!',
    pa: t + ' ਨੂੰ ਮੈਂ 10 ਸਾਲ ਦਾ ਬੱਚਾ ਹਾਂ ਸੋਚ ਕੇ ਸਮਝਾਓ!',
    ur: t + ' کو میں 10 سال کا بچہ ہوں سمجھ کر سمجھائیں!',
    or: t + ' ବିଷୟରେ ମୁଁ ୧୦ ବର୍ଷର ପିଲା ଭଳି ବୁଝାନ୍ତୁ!'
  };

  res.json({
    success: true,
    systemMessage: feynmanIntros[lang] || feynmanIntros.en
  });
});

app.post('/api/learning/feynman/respond', async (req, res) => {
  const { studentExplanation, topic, language, classLevel } = req.body;
  const lang = language || 'en';
  const cl = classLevel || 8;
  const langName = LANG_NAMES[lang] || 'English';
  const text = studentExplanation || '';

  // LLM-first with strict language enforcement
  const llmPrompt = 'LANGUAGE INSTRUCTION: Your ENTIRE response must be in ' + langName + ' only. Do NOT use English unless language is English.\n' +
    'Student explanation: "' + text + '"\n' +
    'Topic: "' + topic + '". Class: ' + cl + '. Teaching language: ' + langName + '\n' +
    'Evaluate understanding and ask ONE Socratic follow-up question.\n' +
    'Return ONLY valid JSON: {"score": <0-100>, "gaps": ["gap in ' + langName + '"], "followUpQuestion": "question in ' + langName + '"}';

  const llmResponse = await queryLLMChain('Feynman:' + topic + ':' + langName, llmPrompt);
  if (llmResponse) {
    try {
      let ct = llmResponse.text.trim();
      if (ct.startsWith('```json')) ct = ct.slice(7);
      if (ct.startsWith('```')) ct = ct.slice(3);
      if (ct.endsWith('```')) ct = ct.slice(0, -3);
      const parsed = JSON.parse(ct.trim());
      return res.json({ success: true, provider: llmResponse.provider, ...parsed });
    } catch (e) {
      return res.json({ success: true, provider: llmResponse.provider, score: 70, gaps: [], followUpQuestion: llmResponse.text.slice(0, 300) });
    }
  }

  // Static multilingual fallback follow-ups
  const wordCount = text.trim().split(/\s+/).length;
  const score = Math.min(20 + wordCount * 3, 85);
  const fqMap = {
    en: 'Good effort! Can you explain step by step what happens during "' + topic + '"?',
    hi: '"' + topic + '" के दौरान चरण-दर-चरण क्या होता है, वह बता सकते हैं?',
    bn: '"' + topic + '" এর সময় ধাপে ধাপে কী ঘটে তা বলতে পারবেন?',
    ta: '"' + topic + '" இன் போது என்ன நடக்கிறது என்று விளக்க முடியுமா?',
    te: '"' + topic + '" సమయంలో దశల వారీగా ఏమి జరుగుతుందో వివరించగలరా?',
    mr: '"' + topic + '" दरम्यान टप्प्याटप्प्याने काय होते हे सांगता येईल का?',
    gu: '"' + topic + '" દ‌ రमیان step-by-step શું थाय छे तે समजावो?',
    kn: '"' + topic + '" ಸಮಯದಲ್ಲಿ ಹಂತ ಹಂತವಾಗಿ ಏನಾಗುತ್ತದೆ ಎಂದು ವಿವರಿಸಬಲ್ಲಿರಾ?',
    ml: '"' + topic + '" സമയത്ത് ഘട്ടം ഘട്ടമായി എന്ത് സംഭവിക്കുന്നു എന്ന് വിശദീകരിക്കാമോ?',
    pa: '"' + topic + '" ਦੌਰਾਨ ਕਦਮ-ਦਰ-ਕਦਮ ਕੀ ਹੁੰਦਾ ਹੈ, ਦੱਸ ਸਕਦੇ ਹੋ?',
    ur: '"' + topic + '" کے دوران قدم بہ قدم کیا ہوتا ہے، بتا سکتے ہیں?',
    or: '"' + topic + '" ବେଳେ ପଦ-ଦ-ପଦ କ\'ଣ ଘଟୁଛି ତାହା ବୁଝାଇ ପାରିବେ?'
  };

  res.json({
    success: true,
    provider: 'local_simulation',
    score: score,
    gaps: [],
    followUpQuestion: fqMap[lang] || fqMap.en
  });
});

// 5. AI Debate Arena
app.post('/api/learning/debate/respond', async (req, res) => {
  const { userArgument, topic, position, language, history, personalityMode } = req.body;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const userText = userArgument || "";

  // 1. Core metric generation (for simulation fallback)
  const words = userText.trim().split(/\s+/).filter(Boolean);
  const wordsCount = words.length;

  const fillers = [];
  const fillerRegex = /\b(um|uh|like|so|basically|actually|you\s+know|मतलब|यानी|तथा)\b/gi;
  let match;
  while ((match = fillerRegex.exec(userText)) !== null) {
    fillers.push(match[0].toLowerCase());
  }

  const grammarScore = Math.min(Math.max(70 + Math.floor(Math.random() * 20) - (fillers.length * 5), 30), 98);
  const logicScore = Math.min(Math.max(65 + Math.floor(Math.random() * 25) + (wordsCount > 15 ? 8 : 0), 30), 98);
  const fluencyScore = Math.min(Math.max(75 + Math.floor(Math.random() * 15) - (fillers.length * 4), 30), 98);
  const vocabScore = Math.min(Math.max(70 + Math.floor(Math.random() * 20) + (wordsCount > 25 ? 8 : 0), 30), 98);
  const punctuationScore = Math.min(Math.max(65 + Math.floor(Math.random() * 25) + (userText.includes('.') || userText.includes('?') ? 10 : 0), 30), 98);
  const criticalThinkingScore = Math.min(Math.max(60 + Math.floor(Math.random() * 30), 30), 98);
  const reasoningScore = Math.min(Math.max(65 + Math.floor(Math.random() * 25), 30), 98);
  const confidenceScore = Math.min(Math.max(60 + Math.floor(Math.random() * 30) + (wordsCount > 10 ? 8 : 0), 30), 98);
  const pronunciationScore = Math.min(Math.max(80 + Math.floor(Math.random() * 15), 30), 98);
  const communicationScore = Math.round((grammarScore + logicScore + fluencyScore + vocabScore + punctuationScore + confidenceScore) / 6);

  const fallbackScores = {
    logic: logicScore,
    grammar: grammarScore,
    confidence: confidenceScore,
    reasoning: reasoningScore,
    communication: communicationScore,
    pronunciation: pronunciationScore,
    fluency: fluencyScore,
    vocabulary: vocabScore,
    punctuation: punctuationScore,
    criticalThinking: criticalThinkingScore
  };

  const isFirstTurn = !topic || topic.trim() === "";

  let systemPrompt = "";
  if (isFirstTurn) {
    systemPrompt = `You are a real-time AI debate opponent in the "Vidya AI Debate Arena" for Indian schools.
  
  Since this is the first turn and the user hasn't selected a predefined topic, they have entered their opening statement: "${userText}"
  You MUST dynamically analyze their statement and extract:
  1. A concise, formal debate topic sentence ("extractedTopic") in ${langName} representing the subject of the debate.
  2. The user's stance ("userStance") on this topic: "Proposer" (if they are agreeing/supporting/advocating the topic statement) or "Opponent" (if they are disagreeing/opposing the topic statement).
  3. Adopt the opposite stance for yourself ("Opponent" if user is "Proposer", or "Proposer" if user is "Opponent").
  4. Generate a sharp, intelligent, and contextually-aware counterargument ("counterArgument") from your stance in ${langName}.

  DEBATE PARAMETERS:
  - Personality Mode: "${personalityMode || 'Competitive Debater'}"
  - Language: "${langName}"

  PERSONALITY MODES GUIDELINES:
  - "Friendly Teacher": Rebut with warm, supportive, and educational language. Speak constructively and guide them gently.
  - "Strict Examiner": Critique the user's logic, grammar, and sentence structure strictly. Focus on structural correctness and point out weaknesses directly.
  - "Competitive Debater": Use sharp, fast-paced, highly analytical, and competitive counterarguments. Debate to win.
  - "Motivational Mentor": Focus on uplifting speech, praise the user's reasoning, and deliver motivational rebuttals.

  LANGUAGE INSTRUCTION (CRITICAL): Every single word of your "extractedTopic", "counterArgument", and feedback MUST be written entirely in ${langName}. Do NOT use English unless the language is English. Use the appropriate regional script.

  Tasks:
  1. Extract the debate topic sentence ("extractedTopic") in ${langName}.
  2. Detect the user's stance ("userStance") as "Proposer" or "Opponent".
  3. Generate a contextual counterargument (rebuttal) from your position. Keep it to 2-3 sentences.
  4. Perform grammatical and punctuation analysis. Identify any specific mistakes in the user's new argument, providing corrections.
  5. Detect common filler words (like "um", "uh", "like", "so", "you know" or language equivalents like "मतलब", "यानी").
  6. Provide scores from 30-100 for: logic, grammar, confidence, reasoning, communication, pronunciation, fluency, vocabulary, punctuation, criticalThinking.
  7. Provide qualitative feedback (strengths, weaknesses, and custom tips).
  8. Return a facial emotion representing your reaction: 'excited', 'skeptical', 'serious', 'smiling', 'surprised', 'thoughtful'.

  Return ONLY a valid JSON object matching this schema (do NOT wrap in markdown ticks or code fences):
  {
    "extractedTopic": "topic sentence in ${langName}",
    "userStance": "Proposer | Opponent",
    "counterArgument": "rebuttal text in ${langName}",
    "emotion": "excited | skeptical | serious | smiling | surprised | thoughtful",
    "scores": {
      "logic": 85,
      "grammar": 80,
      "confidence": 85,
      "reasoning": 80,
      "communication": 82,
      "pronunciation": 75,
      "fluency": 78,
      "vocabulary": 80,
      "punctuation": 82,
      "criticalThinking": 84
    },
    "feedback": {
      "strengths": ["point 1 in ${langName}"],
      "weaknesses": ["point 2 in ${langName}"],
      "grammarMistakes": [
        { "original": "mistake in ${langName}", "corrected": "correction in ${langName}", "explanation": "explanation in ${langName}" }
      ],
      "fillerWords": ["um"],
      "tips": ["tip in ${langName}"]
    }
  }`;
  } else {
    systemPrompt = `You are a real-time AI debate opponent in the "Vidya AI Debate Arena" for Indian schools.
  
  DEBATE PARAMETERS:
  - Topic: "${topic}"
  - User's Position: "${position}"
  - Your Position: ${position === 'Proposer' ? 'Opponent' : 'Proposer'}
  - Personality Mode: "${personalityMode || 'Competitive Debater'}"
  - Language: "${langName}"

  PERSONALITY MODES GUIDELINES:
  - "Friendly Teacher": Rebut with warm, supportive, and educational language. Speak constructively and guide them gently.
  - "Strict Examiner": Critique the user's logic, grammar, and sentence structure strictly. Focus on structural correctness and point out weaknesses directly.
  - "Competitive Debater": Use sharp, fast-paced, highly analytical, and competitive counterarguments. Debate to win.
  - "Motivational Mentor": Focus on uplifting speech, praise the user's reasoning, and deliver motivational rebuttals.

  LANGUAGE INSTRUCTION (CRITICAL): Every single word of your "counterArgument" and feedback MUST be written entirely in ${langName}. Do NOT use English unless the language is English. Use the appropriate regional script.

  DEBATE HISTORY:
  ${JSON.stringify(history || [])}

  USER'S NEW ARGUMENT: "${userText}"

  Tasks:
  1. Generate a contextual counterargument (rebuttal) matching your debate position, the history, and the selected Personality Mode. Keep it to 2-3 sentences.
  2. Perform grammatical and punctuation analysis. Identify any specific mistakes in the user's new argument, providing corrections.
  3. Detect common filler words (like "um", "uh", "like", "so", "you know" or language equivalents like "मतलब", "यानी").
  4. Provide scores from 30-100 for: logic, grammar, confidence, reasoning, communication, pronunciation, fluency, vocabulary, punctuation, criticalThinking.
  5. Provide qualitative feedback (strengths, weaknesses, and custom tips).
  6. Return a facial emotion representing your reaction: 'excited', 'skeptical', 'serious', 'smiling', 'surprised', 'thoughtful'.

  Return ONLY a valid JSON object matching this schema (do NOT wrap in markdown ticks or code fences):
  {
    "counterArgument": "rebuttal text in ${langName}",
    "emotion": "excited | skeptical | serious | smiling | surprised | thoughtful",
    "scores": {
      "logic": 85,
      "grammar": 80,
      "confidence": 85,
      "reasoning": 80,
      "communication": 82,
      "pronunciation": 75,
      "fluency": 78,
      "vocabulary": 80,
      "punctuation": 82,
      "criticalThinking": 84
    },
    "feedback": {
      "strengths": ["point 1 in ${langName}"],
      "weaknesses": ["point 2 in ${langName}"],
      "grammarMistakes": [
        { "original": "mistake in ${langName}", "corrected": "correction in ${langName}", "explanation": "explanation in ${langName}" }
      ],
      "fillerWords": ["um"],
      "tips": ["tip in ${langName}"]
    }
  }`;
  }

  const llmResponse = await queryLLMChain('debate:' + (topic || 'custom') + ':' + langName, systemPrompt);
  if (llmResponse) {
    try {
      let ct = llmResponse.text.trim();
      if (ct.startsWith('```json')) ct = ct.slice(7);
      if (ct.startsWith('```')) ct = ct.slice(3);
      if (ct.endsWith('```')) ct = ct.slice(0, -3);
      const parsed = JSON.parse(ct.trim());
      if (parsed.counterArgument && parsed.scores) {
        if (isFirstTurn) {
          if (!parsed.extractedTopic) {
            parsed.extractedTopic = "Whether " + userText;
          }
          if (!parsed.userStance) {
            parsed.userStance = "Proposer";
          }
        }
        return res.json({ success: true, provider: llmResponse.provider, ...parsed });
      }
    } catch (e) {
      console.error("Failed to parse debate response:", e);
    }
  }

  // Local Offline Simulation Fallback
  let counter = "That is a point worth considering, but we must focus on the practical implementation challenges and the resource constraints we face.";
  let strengths = ["Good attempt presenting your arguments in a structured way."];
  let weaknesses = ["Could provide more empirical evidence or regional statistics to back up the statement."];
  let grammarMistakes = [];
  
  if (fillers.length > 0) {
    grammarMistakes.push({
      original: fillers.slice(0, 2).join(', '),
      corrected: "Try speaking continuously without these filler words to improve speech clarity.",
      explanation: "Filler words disrupt dialogue flow and weaken conversational focus."
    });
  }

  if (lang === 'hi') {
    counter = "इस बात पर विचार किया जा सकता है, लेकिन हमें व्यावहारिक कार्यान्वयन चुनौतियों और संसाधनों की कमी पर ध्यान देना चाहिए। क्या यह ग्रामीण विकास को अधिक प्रभावित नहीं करेगा?";
    strengths = ["अपने तर्कों को संरचित और स्पष्ट तरीके से प्रस्तुत करने का अच्छा प्रयास।"];
    weaknesses = ["तर्क को मजबूत करने के लिए अधिक क्षेत्रीय आंकड़े या उदाहरण शामिल किए जा सकते थे।"];
  } else if (lang === 'gu') {
    counter = "આ બાબત વિચારવા યોગ્ય છે, પરંતુ આપણે વ્યવહારિક અમલીકરણના પડકારો અને સંસાધનોની તંગી પર ધ્યાન કેન્દ્રિત કરવું જોઈએ.";
    strengths = ["તમારા વિચારો સારી રીતે રજૂ કરવાનો સારો પ્રયાસ કર્યો છે."];
  } else if (lang === 'bn') {
    counter = "এই বিষয়টি ভাবার মতো, তবে আমাদের বাস্তব প্রয়োগের সীমাবদ্ধতা এবং বাজেট ঘাটতির কথা মাথায় রাখতে হবে।";
  }

  const responsePayload = {
    success: true,
    provider: "local_simulation",
    counterArgument: counter,
    emotion: personalityMode === 'Strict Examiner' ? 'serious' : personalityMode === 'Motivational Mentor' ? 'smiling' : 'skeptical',
    scores: fallbackScores,
    feedback: {
      strengths,
      weaknesses,
      grammarMistakes,
      fillerWords: fillers,
      tips: [
        "Structure your debate around a single strong thesis and support it with an example.",
        "Practice deep breathing before speaking to maintain fluency and a controlled speech rate."
      ]
    }
  };

  if (isFirstTurn) {
    let extractedTopic = "Whether " + userText;
    if (lang === 'hi') {
      extractedTopic = "क्या " + userText;
    } else if (lang === 'gu') {
      extractedTopic = "શું " + userText;
    } else if (lang === 'bn') {
      extractedTopic = "কিনা " + userText;
    }
    responsePayload.extractedTopic = extractedTopic;
    responsePayload.userStance = "Proposer";
  }

  return res.json(responsePayload);
});

// Debate Topic Generator
app.post('/api/learning/debate/generate-topic', async (req, res) => {
  const { classLevel, subject, language } = req.body;
  const cl = classLevel || 8;
  const sub = subject || 'Science';
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';

  const systemPrompt = `You are an expert curriculum assistant for Indian school education (NCERT).
  Generate one engaging debate topic related to Class ${cl} ${sub} syllabus.
  
  LANGUAGE INSTRUCTION (MANDATORY): Respond entirely in ${langName}. Do NOT use English unless the language is English.
  
  Provide:
  1. A clear debate topic sentence.
  2. A brief 2-sentence starting prompt for the Proposer side.
  3. A brief 2-sentence starting prompt for the Opponent side.
  
  Return ONLY valid JSON (do NOT wrap in markdown ticks or code fences):
  {
    "topic": "Debate topic sentence in ${langName}",
    "proposerPrompt": "Proposer starting prompt in ${langName}",
    "opponentPrompt": "Opponent starting prompt in ${langName}"
  }`;

  const llmResponse = await queryLLMChain(`DebateTopic:Class ${cl} ${sub} in ${langName}`, systemPrompt);
  if (llmResponse) {
    try {
      let ct = llmResponse.text.trim();
      if (ct.startsWith('```json')) ct = ct.slice(7);
      if (ct.startsWith('```')) ct = ct.slice(3);
      if (ct.endsWith('```')) ct = ct.slice(0, -3);
      const parsed = JSON.parse(ct.trim());
      if (parsed.topic && parsed.proposerPrompt) {
        return res.json({ success: true, provider: llmResponse.provider, ...parsed });
      }
    } catch (e) {
      console.error("Failed to parse debate topic:", e);
    }
  }

  // Fallback default topics based on class/subject
  let topic = "Should artificial intelligence be used to automate farming in India?";
  let proposerPrompt = "AI can optimize water use and predict crop diseases, saving smallholder farmers from devastating losses.";
  let opponentPrompt = "Automated sensors are too expensive for marginal farmers, which will worsen wealth inequality in rural villages.";

  if (sub === 'Science' || sub === 'EVS') {
    topic = "Is space exploration worth the expenditure for developing countries?";
    proposerPrompt = "Scientific exploration drives technology transfers and satellite networks that monitor monsoons, helping remote villages.";
    opponentPrompt = "The immediate funding should be used to build local schools, drinking water grids, and clean primary health clinics.";
  }

  res.json({
    success: true,
    provider: 'local_fallback',
    topic,
    proposerPrompt,
    opponentPrompt
  });
});

// 6. Teacher Lesson Planner
app.post('/api/teachers/lesson-planner', async (req, res) => {
  const { classLevel, board, subject, chapter, language, region, simplify } = req.body;
  const lang = language || 'en';
  const cl = classLevel || 8;
  const brd = board || 'NCERT';
  const sub = subject || 'Science';
  const ch = chapter || 'Photosynthesis';
  const reg = region || 'India';
  const isSimplify = !!simplify;
  const langName = LANG_NAMES[lang] || 'English';

  // 1. Core Fallback Plan
  const plannedFallback = {
    id: "lp-" + Math.floor(Math.random() * 1000),
    title: isSimplify ? `Simplified Lesson: ${ch}` : `Lesson Plan: ${ch} (Class ${cl} - ${brd})`,
    overview: isSimplify 
      ? `A simplified and easy-to-teach breakdown of the chapter "${ch}" tailored for Class ${cl} in ${langName}.`
      : `Curriculum-aligned NCERT lesson guide for teaching the chapter "${ch}" to Class ${cl} students in ${langName}.`,
    objectives: [
      `Define and explain the core ideas behind ${ch}.`,
      `Apply ${ch} concepts to answer textbook exercises.`
    ],
    keyConcepts: [
      `Key terms and definitions of ${ch}`,
      `Formulas, equations, or fundamental rules associated with ${ch}`
    ],
    realLifeExamples: [
      `Practical observation of ${ch} in daily activities in the ${reg} region.`
    ],
    teachingFlow: [
      { step: 1, title: "Introduction & Hook", desc: `Connect the chapter ${ch} to students' lives using local regional analogies.` },
      { step: 2, title: "Core Scientific Concept", desc: `Explain primary concepts of ${ch} at Class ${cl} standard.` },
      { step: 3, title: "Interactive Activity", desc: `Engage the classroom in a hands-on exercise to practice ${ch}.` },
      { step: 4, title: "Summary & Wrap-up", desc: `Consolidate key ideas and ask formative questions.` }
    ],
    activities: [
      `Organize a small group discussion or chart-making exercise about ${ch}.`
    ],
    homework: [
      `1. Explain what you learned about ${ch} to a family member in ${langName}.`,
      `2. Attempt the first 3 textbook problems at the end of the chapter.`
    ],
    revisionQuestions: [
      `What is the main concept of ${ch}?`,
      `Give one real-world application of ${ch}.`
    ],
    assessmentIdeas: [
      `Formative observation of students during the classroom activity, followed by a 3-question oral quiz.`
    ],
    simplified: isSimplify
  };

  // 2. Fetch context from RAG service if online
  let textbookContext = "";
  try {
    const ragResponse = await fetch(`http://127.0.0.1:8000/search?query=${encodeURIComponent(ch)}&class_level=${cl}`);
    if (ragResponse.ok) {
      const ragData = await ragResponse.json();
      if (ragData.results && ragData.results.length > 0) {
        textbookContext = ragData.results.map(r => r.content).join("\n");
      }
    }
  } catch (err) {
    console.log("RAG retrieval service offline; using LLM fallback indexes.");
  }

  // 3. Build Prompt for LLM
  let systemPrompt = "";
  if (isSimplify) {
    systemPrompt = `You are Vidya AI, an expert teacher assistant for Indian schools.
Generate an easy-to-teach, simplified lesson plan on the chapter "${ch}" (Subject: "${sub}", Class: Class ${cl}, Board: "${brd}") in the selected language.

CRITICAL LANGUAGE INSTRUCTION: Every single word of your response — including the title, overview, objectives, key concepts, examples, teaching steps, activities, homework, and questions — MUST be written entirely in ${langName}. Do NOT use English unless the selected language is English. If the language uses a non-Latin script, use that script (e.g. Devanagari for Hindi/Marathi, Gurmukhi for Punjabi, Tamil script for Tamil, Bengali script for Bengali, etc.). This is MANDATORY.

Since this is SIMPLIFIED MODE, you must:
1. Explain complex terms using simple, rural-relatable analogies (e.g., village farming, plants, local markets, household items, monsoon seasons).
2. Create a classroom-friendly, highly simplified teaching flow.
3. Keep objectives and key concepts straightforward and student-friendly.

${textbookContext ? `Textbook Context:\n${textbookContext}\n` : ""}

Your output must be ONLY valid JSON in this exact structure, with no markdown code blocks or surrounding text:
{
  "title": "Simplified Chapter Title in ${langName}",
  "overview": "A simple, child-friendly explanation of what this chapter is about in ${langName}",
  "objectives": ["Simple objective 1 in ${langName}", "Simple objective 2 in ${langName}"],
  "keyConcepts": ["Simple key concept 1 in ${langName}", "Simple key concept 2 in ${langName}"],
  "realLifeExamples": ["Rural/household analogy 1 in ${langName}", "Rural/household analogy 2 in ${langName}"],
  "teachingFlow": [
    { "step": 1, "title": "Hook/Introduction in ${langName}", "desc": "Step 1 description in ${langName}" },
    { "step": 2, "title": "Simplified Explanation in ${langName}", "desc": "Step 2 description in ${langName}" },
    { "step": 3, "title": "Hands-on Activity in ${langName}", "desc": "Step 3 description in ${langName}" },
    { "step": 4, "title": "Socratic Summary in ${langName}", "desc": "Step 4 description in ${langName}" }
  ],
  "activities": ["Fun classroom activity in ${langName}"],
  "homework": ["Relatable homework task in ${langName}"],
  "revisionQuestions": ["Simple oral question 1 in ${langName}", "Simple oral question 2 in ${langName}"],
  "assessmentIdeas": ["Simple assessment idea in ${langName}"],
  "simplified": true
}`;
  } else {
    systemPrompt = `You are Vidya AI, an expert teacher assistant for Indian schools.
Generate a structured, standard NCERT-aligned lesson plan on the chapter "${ch}" (Subject: "${sub}", Class: Class ${cl}, Board: "${brd}") in the selected language.

CRITICAL LANGUAGE INSTRUCTION: Every single word of your response — including the title, overview, objectives, key concepts, examples, teaching steps, activities, homework, and questions — MUST be written entirely in ${langName}. Do NOT use English unless the selected language is English. If the language uses a non-Latin script, use that script (e.g. Devanagari for Hindi/Marathi, Gurmukhi for Punjabi, Tamil script for Tamil, Bengali script for Bengali, etc.). This is MANDATORY.

Ensure alignment with the Indian NCERT curriculum and integrate local examples from the ${reg} region.

${textbookContext ? `Textbook Context:\n${textbookContext}\n` : ""}

Your output must be ONLY valid JSON in this exact structure, with no markdown code blocks or surrounding text:
{
  "title": "Lesson Plan: Chapter Title in ${langName}",
  "overview": "Comprehensive chapter overview in ${langName}",
  "objectives": ["Objective 1 in ${langName}", "Objective 2 in ${langName}", "Objective 3 in ${langName}"],
  "keyConcepts": ["Key NCERT concept 1 in ${langName}", "Key NCERT concept 2 in ${langName}", "Key NCERT concept 3 in ${langName}"],
  "realLifeExamples": ["Regional example 1 in ${langName}", "Regional example 2 in ${langName}"],
  "teachingFlow": [
    { "step": 1, "title": "Introduction & Hook in ${langName}", "desc": "Step 1 description in ${langName}" },
    { "step": 2, "title": "Concept Delivery in ${langName}", "desc": "Step 2 description in ${langName}" },
    { "step": 3, "title": "Guided Practice in ${langName}", "desc": "Step 3 description in ${langName}" },
    { "step": 4, "title": "Summary & Reflection in ${langName}", "desc": "Step 4 description in ${langName}" }
  ],
  "activities": ["Interactive classroom activity 1 in ${langName}", "Interactive classroom activity 2 in ${langName}"],
  "homework": ["Homework question 1 in ${langName}", "Homework question 2 in ${langName}"],
  "revisionQuestions": ["Revision question 1 in ${langName}", "Revision question 2 in ${langName}"],
  "assessmentIdeas": ["Formative assessment idea 1 in ${langName}", "Summative assessment idea 2 in ${langName}"],
  "simplified": false
}`;
  }

  // 4. Query LLM
  const response = await queryLLMChain(`Lesson Plan for Class ${cl} ${sub} chapter ${ch} in ${langName}`, systemPrompt);
  if (response) {
    try {
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      const parsed = JSON.parse(cleanText.trim());
      return res.json({ 
        success: true, 
        provider: response.provider,
        lessonPlan: {
          id: "lp-" + Math.floor(Math.random() * 1000),
          board: brd,
          classLevel: cl,
          subject: sub,
          chapter: ch,
          language: lang,
          ...parsed
        }
      });
    } catch (e) {
      console.error("Failed to parse generative lesson plan JSON:", e);
    }
  }

  // 5. Fallback if LLM fails or is offline
  res.json({ 
    success: true, 
    provider: "local_simulation", 
    lessonPlan: plannedFallback 
  });
});

// AI Teaching Assistant Chat Route
app.post('/api/teachers/assistant', async (req, res) => {
  const { classLevel, board, subject, chapter, language, region, message } = req.body;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const cl = classLevel || 8;
  const brd = board || 'NCERT';
  const sub = subject || 'Science';
  const ch = chapter || 'Photosynthesis';
  const reg = region || 'India';

  const systemPrompt = `You are Vidya AI Assistant, a smart teaching coach for Indian educators.
The teacher is currently planning a lesson for:
- Board: ${brd}
- Class: Class ${cl}
- Subject: ${sub}
- Chapter: ${ch}
- Medium of Instruction: ${langName}
- Regional context: ${reg}

Respond to the teacher's query to help them simplify concepts, design activities, generate worksheets, or write explanations.
IMPORTANT: You MUST write your response entirely in ${langName}. If the language uses a non-Latin script, write in that script. Do NOT use English unless English is the selected language.
Be highly supportive, professional, and contextual to the chapter. Keep your answer under 350 words.`;

  const response = await queryLLMChain(message, systemPrompt);
  if (response) {
    return res.json({ success: true, response: response.text, provider: response.provider });
  }

  // Fallback if LLM is offline
  const fallbackReplies = {
    en: `I am currently operating in offline mode. For the chapter "${ch}" (Class ${cl}), make sure to focus on visual diagrams and hands-on laboratory models.`,
    hi: `मैं वर्तमान में ऑफ़लाइन मोड में हूँ। अध्याय "${ch}" (कक्षा ${cl}) के लिए, दृश्य आरेखों और व्यावहारिक मॉडलों पर ध्यान केंद्रित करना सुनिश्चित करें।`
  };
  res.json({ 
    success: true, 
    response: fallbackReplies[lang] || fallbackReplies.en, 
    provider: "local_offline" 
  });
});


// 7. Analytics Data Endpoint
app.get('/api/analytics', (req, res) => {
  const analytics = db.getAnalytics();
  res.json({ success: true, analytics });
});

// 8. Streak Claiming Endpoint
app.post('/api/gamification/claim-streak', (req, res) => {
  const user = db.getUser("student_1");
  const newStreak = user.streak + 1;
  const newXP = user.xp + 150; // Streak bonus XP
  const updated = db.updateUser("student_1", {
    streak: newStreak,
    xp: newXP,
    level: Math.floor(newXP / 400) + 1
  });

  res.json({
    success: true,
    streak: updated.streak,
    xp: updated.xp,
    level: updated.level,
    badgeUnlocked: updated.xp > 1300 && !updated.badges.includes("Streak Master") ? "Streak Master" : null
  });
});

// 9. RAG Search routing
app.post('/api/learning/rag-search', async (req, res) => {
  const { query, classLevel } = req.body;

  try {
    const response = await fetch(`http://127.0.0.1:8000/search?query=${encodeURIComponent(query)}&class_level=${classLevel || 8}`);
    if (response.ok) {
      const data = await response.json();
      return res.json({ success: true, results: data.results });
    }
  } catch (err) {
    console.warn("Python RAG service is offline, performing dynamic Gemini API fallback search...");
  }

  // Gemini API Key dynamic fallback to ensure full NCERT chapter data coverage
  const systemPrompt = `You are a dynamic NCERT textbook indexer.
    Generate exactly 3 highly realistic, curriculum-aligned paragraphs/sections from the NCERT textbook matching the search query: "${query}" for Class ${classLevel || 8}.
    Respond in JSON format only:
    [
      {
        "chapter": "NCERT Class ${classLevel || 8} [Subject Name] Chapter [X]: [Chapter Name]",
        "content": "Detailed text content from the NCERT chapter explaining the concepts matching the query.",
        "citation": "NCERT [Subject Name] Class ${classLevel || 8}, Ch [X], p.[Y]"
      }
    ]`;

  const llmResponse = await queryLLMChain(`Retrieve NCERT segments for query: "${query}"`, systemPrompt);

  if (llmResponse) {
    try {
      const parsed = JSON.parse(llmResponse.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({
          success: true,
          provider: llmResponse.provider,
          results: parsed
        });
      }
    } catch (e) {
      console.warn("Failed to parse Gemini RAG JSON search fallback:", e.message);
    }
  }

  // Ultimate static backup if both offline RAG and Gemini fail
  const mockChapters = [
    {
      chapter: `NCERT Class ${classLevel || 8} Science Chapter 1: Crop Production`,
      content: `Indian farmers cultivate crops based on season. Kharif crops are sown during monsoon rains. Preparation of soil is crucial. This text relates directly to your search: "${query}".`,
      citation: `NCERT Science Class ${classLevel || 8}, Ch 1, p.2-5`
    },
    {
      chapter: `NCERT Class ${classLevel || 8} Science Chapter 2: Microorganisms`,
      content: `Microorganisms can be friend or foe. Useful bacteria help make curd. This matches keyword search: "${query}".`,
      citation: `NCERT Science Class ${classLevel || 8}, Ch 2, p.12-14`
    }
  ];

  res.json({
    success: true,
    provider: "local_mock_backup",
    results: mockChapters
  });
});

// ----------------------------------------------------
// 🔌 SOCKET.IO REAL-TIME INTERACTION
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or Join a multiplayer debate classroom
  socket.on('join_debate_room', (data) => {
    socket.join(data.room);
    console.log(`Socket ${socket.id} joined room ${data.room}`);
  });

  // Share speech transcription in real time
  socket.on('send_debate_transcript', (data) => {
    socket.to(data.room).emit('receive_debate_transcript', {
      user: data.user,
      text: data.text,
      timestamp: new Date().toISOString()
    });
  });

  // Sync teachers planning state
  socket.on('sync_lesson_plan', (data) => {
    socket.to(data.room).emit('receive_lesson_plan', data.plan);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Vidya AI Orchestration Server running on port ${PORT}`);
});
