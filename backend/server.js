const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'vidya-ai-super-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: "Access token missing or invalid session." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, error: "Session expired or invalid token. Please log in again." });
    }
    req.user = decoded;
    next();
  });
}

function requireTeacherRole(req, res, next) {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ success: false, error: "Access denied. Only teachers are authorized to access this panel." });
  }
}

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
// 🤖 MULTI-LLM ROUTING GATEWAY WITH FAST-TIMEOUT PROTECTION
// ----------------------------------------------------

// Track last Gemini call time and consecutive 429 errors
let lastGeminiCallTime = 0;
const GEMINI_MIN_INTERVAL_MS = 2000;
let gemini429Count = 0;
let gemini429SkipUntil = 0;

async function queryLLMChain(prompt, systemInstruction = "", timeoutMs = 5000) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const now = Date.now();

  // If we had 3+ consecutive 429s in the last 2 minutes, skip Gemini and go straight to fallback
  const skipGemini = gemini429Count >= 3 && now < gemini429SkipUntil;

  if (!skipGemini && GEMINI_API_KEY) {
    // Minimum spacing between Gemini calls
    const timeSinceLast = now - lastGeminiCallTime;
    if (timeSinceLast < GEMINI_MIN_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, GEMINI_MIN_INTERVAL_MS - timeSinceLast));
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiBody = JSON.stringify({
      contents: [{ parts: [{ text: `${systemInstruction}\n\nUser Prompt: ${prompt}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    });

    try {
      console.log(`Attempting LLM call via gemini-2.0-flash (timeout: ${timeoutMs}ms)...`);
      lastGeminiCallTime = Date.now();

      // Race the Gemini fetch against a timeout — no blocking waits on 429
      const result = await Promise.race([
        fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody })
          .then(async (res) => {
            if (res.status === 429) {
              gemini429Count++;
              gemini429SkipUntil = Date.now() + 120000; // skip Gemini for 2 minutes after 3 429s
              throw new Error('RATE_LIMIT_429');
            }
            if (!res.ok) throw new Error(`Gemini status ${res.status}`);
            const data = await res.json();
            gemini429Count = 0; // reset on success
            return { provider: 'gemini', text: data.candidates[0].content.parts[0].text };
          }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
      ]);

      return result;
    } catch (err) {
      if (err.message === 'RATE_LIMIT_429') {
        console.warn(`Gemini 429 — going to fallback immediately (no retry block).`);
      } else if (err.message === 'TIMEOUT') {
        console.warn(`Gemini timed out after ${timeoutMs}ms — going to fallback.`);
      } else {
        console.warn(`Gemini failed: ${err.message}`);
      }
    }
  } else if (skipGemini) {
    console.warn(`Gemini skipped (${gemini429Count} recent 429s, cooling down). Using fallback.`);
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

  // All providers failed — return null to activate local rich fallback
  return null;
}


// ----------------------------------------------------
// 🛣 EXPRESS ROUTING API ENDPOINTS
// ----------------------------------------------------

// 1. Authentication Endpoints

// POST /api/auth/signup
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role, classLevel, preferredLanguage } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: "Name, email, and password are required." });
  }

  try {
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: "An account with this email already exists." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUserPayload = {
      name,
      email,
      passwordHash,
      role: role || 'student',
      classLevel: parseInt(classLevel) || 8,
      preferredLanguage: preferredLanguage || 'English'
    };

    const newUser = db.createUser(newUserPayload);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error("Signup failed:", err);
    res.status(500).json({ success: false, error: "Signup failed due to internal server error." });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  try {
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Logged in successfully!",
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ success: false, error: "Login failed due to internal server error." });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: "Logged out successfully!" });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to retrieve user profile." });
  }
});

// Profile Endpoint (authenticated, for backwards compatibility)
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const profile = db.getUser(req.user.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found." });
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
});

// POST /api/auth/profile/update
app.post('/api/auth/profile/update', authenticateToken, (req, res) => {
  const { name, classLevel, preferredLanguage } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (classLevel) updates.class = String(classLevel);
  if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

  try {
    const updatedUser = db.updateUser(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update profile." });
  }
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
app.post('/api/learning/lesson', authenticateToken, async (req, res) => {
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
app.post('/api/learning/quiz', authenticateToken, async (req, res) => {
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
      exp_describe: "\"{topic}\" শ্ৰেণী {classLevel} {subject}ৰ পাঠ্যক্ৰমৰ এক অপৰিহাৰ্য অংশ।",
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

// 3b. Smart Board Teaching Endpoint
app.post('/api/learning/smart-board/teach', authenticateToken, requireTeacherRole, async (req, res) => {
  const { topic, classLevel, language, region, subject, chapter, modes, followUpQuery, history } = req.body;

  const cl = classLevel || 8;
  const lang = language || 'en';
  const actualTopic = topic || 'General Science';
  const actualSubject = subject || 'Science';
  const actualChapter = chapter || '';
  const actualRegion = region || 'India';
  const langName = LANG_NAMES[lang] || 'English';

  const isSimplify = modes?.simplify || false;
  const isVisualMode = modes?.visualMode || false;
  const isExamPrep = modes?.examPrep || false;
  const skillLevel = modes?.skillLevel || 'medium';

  // Translation dictionary for diagrams across 22 official Indian languages
  const DIAGRAM_TRANS = {
    en: {
      sunlight: "Sunlight",
      sunlight_desc: "Energy absorbed by chlorophyll in leaves",
      co2: "Carbon Dioxide",
      co2_desc: "Absorbed by leaves from the atmosphere",
      water: "Water (H2O)",
      water_desc: "Absorbed by roots from the soil",
      glucose_oxy: "Glucose & Oxygen",
      glucose_oxy_desc: "Glucose for energy & Oxygen released",
      nucleus: "Nucleus",
      nucleus_desc: "Heavy positive center of the atom",
      protons: "Protons (+)",
      protons_desc: "Positive particles inside the nucleus",
      neutrons: "Neutrons (0)",
      neutrons_desc: "Neutral particles inside the nucleus",
      electrons: "Electrons (-)",
      electrons_desc: "Negative particles orbiting the nucleus",
      numerator: "Numerator (a)",
      numerator_desc: "Number of active/selected parts",
      denominator: "Denominator (b)",
      denominator_desc: "Total number of equal parts in the whole",
      where_b_non_zero: "Where denominator b cannot be zero",
      sun: "Sun (Center)",
      sun_desc: "Main source of gravity and light",
      inner_planets: "Terrestrial Planets",
      inner_planets_desc: "Mercury, Venus, Earth, Mars (Rocky)",
      outer_planets: "Gas Giants",
      outer_planets_desc: "Jupiter, Saturn, Uranus, Neptune (Gas/Ice)",
      definition: "Definition",
      definition_desc: "Primary understanding of the concept",
      mechanism: "Core Mechanism",
      mechanism_desc: "How the mechanism operates step-by-step",
      application: "Application",
      application_desc: "Real-world utility and exams context",
      diagram_title_photo: "Photosynthesis Process Cycle",
      diagram_title_atom: "Atomic Structure Hierarchy",
      diagram_title_frac: "Fraction Representation",
      diagram_title_solar: "Solar System Orbital Cycle",
      diagram_title_generic: "Topic Concept Flow"
    },
    hi: {
      sunlight: "सूर्य का प्रकाश",
      sunlight_desc: "पत्तियों में क्लोरोफिल द्वारा अवशोषित ऊर्जा",
      co2: "कार्बन डाइऑक्साइड (CO2)",
      co2_desc: "हवा से पत्तियों द्वारा सोखा गया",
      water: "जल (H2O)",
      water_desc: "जड़ों द्वारा मिट्टी से अवशोषित",
      glucose_oxy: "ग्लूकोज और ऑक्सीजन",
      glucose_oxy_desc: "ऊर्जा के लिए ग्लूकोज और सांस लेने के लिए ऑक्सीजन",
      nucleus: "नाभिक (Nucleus)",
      nucleus_desc: "परमाणु का भारी सकारात्मक केंद्र",
      protons: "प्रोटॉन (+)",
      protons_desc: "नाभिक के भीतर सकारात्मक कण",
      neutrons: "न्यूट्रॉन (0)",
      neutrons_desc: "नाभिक के भीतर तटस्थ कण",
      electrons: "इलेक्ट्रॉन (-)",
      electrons_desc: "नाभिक के बाहर परिक्रमा करने वाले नकारात्मक कण",
      numerator: "अंश (Numerator)",
      numerator_desc: "सक्रिय या चुने गए हिस्सों की संख्या",
      denominator: "हर (Denominator)",
      denominator_desc: "समान भागों की कुल संख्या",
      where_b_non_zero: "जहां b शून्य नहीं हो सकता",
      sun: "सूर्य (केंद्र)",
      sun_desc: "गुरुत्वाकर्षण का मुख्य स्रोत",
      inner_planets: "आंतरिक ग्रह",
      inner_planets_desc: "बुध, शुक्र, पृथ्वी, मंगल (चट्टानी)",
      outer_planets: "बाहरी ग्रह",
      outer_planets_desc: "बृहस्पति, शनि, यूरेनस, नेपच्यून (गैस/बर्फ)",
      definition: "परिभाषा",
      definition_desc: "अवधारणा की मूल समझ",
      mechanism: "मुख्य कार्य",
      mechanism_desc: "यह कैसे काम करता है",
      application: "अनुप्रयोग",
      application_desc: "वास्तविक जीवन और परीक्षाओं में उपयोग",
      diagram_title_photo: "प्रकाश संश्लेषण चक्र",
      diagram_title_atom: "परमाणु की संरचना",
      diagram_title_frac: "भिन्न का प्रतिनिधित्व",
      diagram_title_solar: "सौर मंडल की कक्षाएं",
      diagram_title_generic: "विषय प्रवाह"
    },
    bn: {
      sunlight: "সূর্যের আলো",
      sunlight_desc: "পাতার ক্লোরোফিল দ্বারা শোষিত শক্তি",
      co2: "কার্বন ডাই অক্সাইড (CO2)",
      co2_desc: "বাতাস থেকে পাতা দ্বারা শোষিত",
      water: "জল (H2O)",
      water_desc: "মূল দ্বারা মাটি থেকে শোষিত",
      glucose_oxy: "গ্লুকোজ ও অক্সিজেন",
      glucose_oxy_desc: "শক্তির জন্য গ্লুকোজ এবং শ্বাস নিতে অক্সিজেন",
      nucleus: "নিউক্লিয়াস",
      nucleus_desc: "পরমাণুর ভারী ধনাত্মক কেন্দ্র",
      protons: "প্রোটন (+)",
      protons_desc: "নিউক্লিয়াসের ভেতরের ধনাত্মক কণা",
      neutrons: "নিউট্রন (0)",
      neutrons_desc: "নিউক্লিয়াসের ভেতরের আধানহীন কণা",
      electrons: "ইলেকট্রন (-)",
      electrons_desc: "নিউক্লিয়াসের বাইরে ঘূর্ণায়মান ঋণাত্মক কণা",
      numerator: "লব (Numerator)",
      numerator_desc: "সক্রিয় বা নির্বাচিত অংশের সংখ্যা",
      denominator: "হর (Denominator)",
      denominator_desc: "মোট সমান অংশের সংখ্যা",
      where_b_non_zero: "যেখানে হর শূন্য হতে পারে না",
      sun: "সূর্য (কেন্দ্র)",
      sun_desc: "মহাকর্ষের প্রধান উৎস",
      inner_planets: "অভ্যন্তরীণ গ্রহ",
      inner_planets_desc: "বুধ, শুক্র, পৃথিবী, মঙ্গল (পাথুরে)",
      outer_planets: "বহিঃস্থ গ্রহ",
      outer_planets_desc: "বৃহস্পতি, শনি, ইউরেনাস, নেপচুন (গ্যাসীয়)",
      definition: "সংজ্ঞা",
      definition_desc: "ধারণার প্রাথমিক বোঝাপড়া",
      mechanism: "মূল প্রক্রিয়া",
      mechanism_desc: "কীভাবে এটি ধাপে ধাপে কাজ করে",
      application: "প্রয়োগ",
      application_desc: "বাস্তব জীবন এবং পরীক্ষায় ব্যবহার",
      diagram_title_photo: "সালোকসংশ্লেষ প্রক্রিয়া চক্র",
      diagram_title_atom: "পরমাণু কাঠামোর অনুক্রম",
      diagram_title_frac: "ভগ্নাংশ উপস্থাপন",
      diagram_title_solar: "সৌরজগতের কক্ষপথ চক্র",
      diagram_title_generic: "ধারণা প্রবাহ"
    },
    te: {
      sunlight: "సూర్యరశ్మి",
      sunlight_desc: "ఆకులలోని క్లోరోఫిల్ గ్రహించే శక్తి",
      co2: "కార్బన్ డయాక్సైడ్ (CO2)",
      co2_desc: "గాలి నుండి ఆకులు పీల్చుకునేది",
      water: "నీరు (H2O)",
      water_desc: "వేర్ల ద్వారా నేల నుండి పీల్చుకునేది",
      glucose_oxy: "గ్లూకోజ్ & ఆక్సిజన్",
      glucose_oxy_desc: "శక్తి కోసం గ్లూకోజ్ & విడుదలయ్యే ఆక్సిజన్",
      nucleus: "కేంద్రకం",
      nucleus_desc: "పరమాణువు యొక్క భారీ ధనాత్మక కేంద్రం",
      protons: "ప్రోటాన్లు (+)",
      protons_desc: "కేంద్రకం లోపల ఉండే ధనాత్మక కణాలు",
      neutrons: "న్యూట్రాన్లు (0)",
      neutrons_desc: "కేంద్రకం లోపల ఉండే తటస్థ కణాలు",
      electrons: "ఎలక్ట్రాన్లు (-)",
      electrons_desc: "కేంద్రకం చుట్టూ తిరిగే రుణాత్మక కణాలు",
      numerator: "లవం (Numerator)",
      numerator_desc: "ఎంపిక చేసుకున్న భాగాల సంఖ్య",
      denominator: "హారం (Denominator)",
      denominator_desc: "మొత్తం సమాన భాగాల సంఖ్య",
      where_b_non_zero: "హారం సున్నా కాకూడదు",
      sun: "సూర్యుడు (కేంద్రం)",
      sun_desc: "గురుత్వాకర్షణకు ప్రధాన మూలం",
      inner_planets: "అంతర్గత గ్రహాలు",
      inner_planets_desc: "బుధుడు, శుక్రుడు, భూమి, అంగారకుడు",
      outer_planets: "బాహ్య గ్రహాలు",
      outer_planets_desc: "గురుడు, శని, యురేనస్, నెప్ట్యూన్",
      definition: "నిర్వచనం",
      definition_desc: "భావన యొక్క ప్రాథమిక అవగాహన",
      mechanism: "ప్రధాన ప్రక్రియ",
      mechanism_desc: "ఇది దశలవారీగా ఎలా పనిచేస్తుంది",
      application: "అనువర్తనం",
      application_desc: "నిజ జీవితంలో మరియు పరీక్షలలో ఉపయోగం",
      diagram_title_photo: "కిరణజన్య సంయోగక్రియ చక్రం",
      diagram_title_atom: "పరమాణు నిర్మాణం",
      diagram_title_frac: "భిన్నం యొక్క ప్రాతినిధ్యం",
      diagram_title_solar: "సౌర కుటుంబ కక్ష్యల చక్రం",
      diagram_title_generic: "భావన ప్రవాహం"
    },
    mr: {
      sunlight: "सूर्यप्रकाश",
      sunlight_desc: "पानांमधील हरितद्रव्याद्वारे शोषलेली ऊर्जा",
      co2: "कार्बन डायऑक्साइड (CO2)",
      co2_desc: "हवेतून पानांद्वारे शोषलेला वायू",
      water: "पाणी (H2O)",
      water_desc: "मुळांद्वारे मातीतून शोषलेले पाणी",
      glucose_oxy: "ग्लूकोज आणि ऑक्सिजन",
      glucose_oxy_desc: "ऊर्जेसाठी ग्लूकोज आणि सोडलेला ऑक्सिजन",
      nucleus: "केंद्रक (Nucleus)",
      nucleus_desc: "अणूचा जड धनप्रभारित केंद्रभाग",
      protons: "प्रोटॉन्स (+)",
      protons_desc: "केंद्रकातील धनप्रभारित कण",
      neutrons: "न्यूट्रॉन्स (0)",
      neutrons_desc: "केंद्रकातील प्रभाररहित कण",
      electrons: "इलेक्ट्रॉन्स (-)",
      electrons_desc: "केंद्रकाबाहेर फिरणारे ऋणप्रभारित कण",
      numerator: "अंश (Numerator)",
      numerator_desc: "निवडलेल्या भागांची संख्या",
      denominator: "छेद (Denominator)",
      denominator_desc: "एकूण समान भागांची संख्या",
      where_b_non_zero: "छेद शून्य नसावा",
      sun: "सूर्य (केंद्र)",
      sun_desc: "गुरुत्वाकर्षणाचा मुख्य स्रोत",
      inner_planets: "आंतरिक ग्रह",
      inner_planets_desc: "बुध, शुक्र, पृथ्वी, मंगळ (खडकयुक्त)",
      outer_planets: "बाह्य ग्रह",
      outer_planets_desc: "गुरु, शनी, युरेनस, नेप्ट्यून (वायूचे गोळे)",
      definition: "व्याख्या",
      definition_desc: "संकल्पनेची मूळ समज",
      mechanism: "मुख्य कार्यपद्धती",
      mechanism_desc: "हे टप्प्याटप्प्याने कसे कार्य करते",
      application: "उपयोजन",
      application_desc: "व्यावहारिक जीवन आणि परीक्षेत उपयोग",
      diagram_title_photo: "प्रकाशसंश्लेषण प्रक्रिया चक्र",
      diagram_title_atom: "अणू रचना श्रेणी",
      diagram_title_frac: "अपूर्णांक सादरीकरण",
      diagram_title_solar: "सौरमाला कक्षीय चक्र",
      diagram_title_generic: "संकल्पना प्रवाह"
    },
    ta: {
      sunlight: "சூரிய ஒளி",
      sunlight_desc: "இலைகளில் உள்ள பச்சையத்தால் உறிஞ்சப்படும் ஆற்றல்",
      co2: "கார்பன் டை ஆக்சைடு (CO2)",
      co2_desc: "காற்றிலிருந்து இலைகளால் உறிஞ்சப்படுகிறது",
      water: "நீர் (H2O)",
      water_desc: "வேர்களால் மண்ணிலிருந்து உறிஞ்சப்படுகிறது",
      glucose_oxy: "குளுக்கோஸ் & ஆக்சிஜன்",
      glucose_oxy_desc: "ஆற்றலுக்கான குளுக்கோஸ் & வெளியாகும் ஆக்சிஜன்",
      nucleus: "உட்கரு",
      nucleus_desc: "அணுவின் மையப்பகுதி",
      protons: "புரோட்டான்கள் (+)",
      protons_desc: "உட்கருவினுள் உள்ள நேர்மின் துகள்கள்",
      neutrons: "நியூட்ரான்கள் (0)",
      neutrons_desc: "உட்கருவினுள் உள்ள மின்சுமையற்ற துகள்கள்",
      electrons: "எலக்ட்ரான்கள் (-)",
      electrons_desc: "உட்கருவைச் சுற்றிவரும் எதிர்மின் துகள்கள்",
      numerator: "தொகுதி (Numerator)",
      numerator_desc: "தேர்ந்தெடுக்கப்பட்ட சம பாகங்களின் எண்ணிக்கை",
      denominator: "பகுதி (Denominator)",
      denominator_desc: "மொத்த சம பாகங்களின் எண்ணிக்கை",
      where_b_non_zero: "பகுதி பூஜ்ஜியமாக இருக்கக்கூடாது",
      sun: "சூரியன் (மையம்)",
      sun_desc: "ஈர்ப்பு விசையின் முதன்மை ஆதாரம்",
      inner_planets: "உள் கோள்கள்",
      inner_planets_desc: "புதன், வெள்ளி, பூமி, செவ்வாய்",
      outer_planets: "வெளி கோள்கள்",
      outer_planets_desc: "வியாழன், சனி, யுரேனஸ், நெப்டியூன்",
      definition: "வரையறை",
      definition_desc: "கருத்தின் அடிப்படை புரிதல்",
      mechanism: "முக்கிய செயல்முறை",
      mechanism_desc: "இது எவ்வாறு இயங்குகிறது",
      application: "பயன்பாடு",
      application_desc: "நடைமுறை வாழ்க்கை மற்றும் தேர்வுகளில் பயன்பாடு",
      diagram_title_photo: "ஒளிச்சேர்க்கை செயல்முறை சுழற்சி",
      diagram_title_atom: "அணு அமைப்பு வரிசைமுறை",
      diagram_title_frac: "பின்னத்தின் வடிவம்",
      diagram_title_solar: "சூரிய குடும்ப சுழற்சி",
      diagram_title_generic: "கருத்து ஓட்டம்"
    },
    gu: {
      sunlight: "સૂર્યપ્રકાશ",
      sunlight_desc: "પાંદડામાં ક્લોરોફિલ દ્વારા શોષાયેલી ઉર્જા",
      co2: "કાર્બન ડાયોક્સાઇડ (CO2)",
      co2_desc: "હવામાનમાંથી પાંદડા દ્વારા શોષાય છે",
      water: "પાણી (H2O)",
      water_desc: "મૂળ દ્વારા જમીનમાંથી શોષાય છે",
      glucose_oxy: "ગ્લુકોઝ અને ઓક્સિજન",
      glucose_oxy_desc: "ઉર્જા માટે ગ્લુકોઝ અને મુક્ત થતો ઓક્સિજન",
      nucleus: "ન્યુક્લિયસ (કેન્દ્ર)",
      nucleus_desc: "પરમાણુનું ભારે ધનભારિત કેન્દ્ર",
      protons: "પ્રોટોન (+)",
      protons_desc: "કેન્દ્રમાં રહેલા ધનકણો",
      neutrons: "ન્યુટ્રોન (0)",
      neutrons_desc: "કેન્દ્રમાં રહેલા તટસ્થ કણો",
      electrons: "ઇલેક્ટ્રોન (-)",
      electrons_desc: "કેન્દ્રની બહાર ફરતા ઋણકણો",
      numerator: "અંશ (Numerator)",
      numerator_desc: "પસંદ કરેલા ભાગોની સંખ્યા",
      denominator: "છેદ (Denominator)",
      denominator_desc: "કુલ સમાન ભાગોની સંખ્યા",
      where_b_non_zero: "છેદ શૂન્ય હોઈ શકે નહીં",
      sun: "સૂર્ય (કેન્દ્ર)",
      sun_desc: "ગુરુત્વાકર્ષણનો મુખ્ય સ્ત્રોત",
      inner_planets: "આંતરિક ગ્રહો",
      inner_planets_desc: "બુધ, શુક્ર, પૃથ્વી, મંગળ",
      outer_planets: "બાહ્ય ગ્રહો",
      outer_planets_desc: "ગુરુ, શનિ, યુરેનસ, નેપ્ચ્યુન",
      definition: "વ્યાખ્યા",
      definition_desc: "ખ્યાલની મૂળભૂત સમજ",
      mechanism: "મુખ્ય પ્રક્રિયા",
      mechanism_desc: "તે કેવી રીતે કાર્ય કરે છે",
      application: "ઉપયોગીતા",
      application_desc: "વાસ્તવિક જીવન અને પરીક્ષામાં ઉપયોગ",
      diagram_title_photo: "પ્રકાશ સંશ્લેષણ પ્રક્રિયા ચક્ર",
      diagram_title_atom: "પરમાણુ બંધારણ શ્રેણી",
      diagram_title_frac: "અપૂર્ણાંક નિરૂપણ",
      diagram_title_solar: "સૌરમંડળ ભ્રમણકક્ષા ચક્ર",
      diagram_title_generic: "વિભાવના પ્રવાહ"
    },
    ur: {
      sunlight: "سورج کی روشنی",
      sunlight_desc: "پتوں میں کلوروفیل کے ذریعے جذب شدہ توانائی",
      co2: "کاربن ڈائی آکسائیڈ (CO2)",
      co2_desc: "ہوا سے پتوں کے ذریعے جذب کی گئی",
      water: "پانی (H2O)",
      water_desc: "جڑوں کے ذریعے مٹی سے جذب کیا گیا",
      glucose_oxy: "گلوکوز اور آکسیجن",
      glucose_oxy_desc: "توانائی کے لیے گلوکوز اور آکسیجن کا اخراج",
      nucleus: "مرکزہ (Nucleus)",
      nucleus_desc: "جوہر کا بھاری مثبت مرکز",
      protons: "پروٹان (+)",
      protons_desc: "مرکزے کے اندر مثبت ذرات",
      neutrons: "نیوٹران (0)",
      neutrons_desc: "مرکزے کے اندر غیر جانبدار ذرات",
      electrons: "الیکٹران (-)",
      electrons_desc: "مرکزے کے باہر گردش کرنے والے منفی ذرات",
      numerator: "شمار کنندہ (Numerator)",
      numerator_desc: "منتخب کردہ حصوں کی تعداد",
      denominator: "نسب نما (Denominator)",
      denominator_desc: "کل برابر حصوں کی تعداد",
      where_b_non_zero: "مخرج مخرج صفر نہیں ہو سکتا",
      sun: "سورج (مرکز)",
      sun_desc: "کشش ثقل کا بنیادی ذریعہ",
      inner_planets: "اندرونی سیارے",
      inner_planets_desc: "عطارد، زہرہ، زمین، مریخ",
      outer_planets: "بیرونی سیارے",
      outer_planets_desc: "مشتری، زحل، یورینس، نیپچون",
      definition: "تعریف",
      definition_desc: "تصور کی بنیادی سمجھ",
      mechanism: "بنیادی عمل",
      mechanism_desc: "یہ مرحلہ وار کیسے کام کرتا ہے",
      application: "اطلاق",
      application_desc: "عملی زندگی اور امتحانات میں استعمال",
      diagram_title_photo: "روشنی کی ترکیب کا عمل",
      diagram_title_atom: "جوہر کی ساخت",
      diagram_title_frac: "کسر کی نمائندگی",
      diagram_title_solar: "نظام شمسی کا مدار",
      diagram_title_generic: "تصور کا بہاؤ"
    },
    kn: {
      sunlight: "ಸೂರ್ಯನ ಬೆಳಕು",
      sunlight_desc: "ಎಲೆಗಳಲ್ಲಿರುವ ಪತ್ರಹರಿತ್ತಿನಿಂದ ಹೀರಿಕೊಳ್ಳಲ್ಪಟ್ಟ ಶಕ್ತಿ",
      co2: "ಕಾರ್ಬನ್ ಡೈಆಕ್ಸೈಡ್ (CO2)",
      co2_desc: "ಗಾಳಿಯಿಂದ ಎಲೆಗಳು ಹೀರಿಕೊಳ್ಳುತ್ತವೆ",
      water: "ನೀರು (H2O)",
      water_desc: "ಬೇರುಗಳ ಮೂಲಕ ಮಣ್ಣಿನಿಂದ ಹೀರಿಕೊಳ್ಳಲ್ಪಡುತ್ತದೆ",
      glucose_oxy: "ಗ್ಲೂಕೋಸ್ ಮತ್ತು ಆಕ್ಸಿಜನ್",
      glucose_oxy_desc: "ಶಕ್ತಿಗಾಗಿ ಗ್ಲೂಕೋಸ್ ಮತ್ತು ಬಿಡುಗಡೆಯಾಗುವ ಆಕ್ಸಿಜನ್",
      nucleus: "ಪರಮಾಣು ಕೇಂದ್ರ",
      nucleus_desc: "ಪರಮಾಣುವಿನ ಭಾರವಾದ ಧನವಿದ್ಯುತ್ ಕೇಂದ್ರ",
      protons: "ಪ್ರೋಟಾನ್ಗಳು (+)",
      protons_desc: "ಕೇಂದ್ರದ ಒಳಗಿರುವ ಧನಕಣಗಳು",
      neutrons: "ನ್ಯೂಟ್ರಾನ್ಗಳು (0)",
      neutrons_desc: "ಕೇಂದ್ರದ ಒಳಗಿರುವ ತಟಸ್ಥಕಣಗಳು",
      electrons: "ಎಲೆಕ್ಟ್ರಾನ್ಗಳು (-)",
      electrons_desc: "ಕೇಂದ್ರದ ಹೊರಗೆ ಸುತ್ತುವ ಋಣಕಣಗಳು",
      numerator: "ಅಂಶ (Numerator)",
      numerator_desc: "ಆಯ್ಕೆಮಾಡಿದ ಭಾಗಗಳ ಸಂಖ್ಯೆ",
      denominator: "ಛೇದ (Denominator)",
      denominator_desc: "ಒಟ್ಟು ಸಮಾನ ಭಾಗಗಳ ಸಂಖ್ಯೆ",
      where_b_non_zero: "ಛೇದವು ಶೂನ್ಯವಾಗಿರಬಾರದು",
      sun: "ಸೂರ್ಯ (ಕೇಂದ್ರ)",
      sun_desc: "ಗುರುತ್ವಾਕਰಷಣೆಯ ಪ್ರಮುಖ ಮೂಲ",
      inner_planets: "ಆಂತರಿಕ ಗ್ರಹಗಳು",
      inner_planets_desc: "ಬುಧ, ಶುಕ್ರ, ಭೂಮಿ, ಮಂಗಳ",
      outer_planets: "ಬಾಹ್ಯ ಗ್ರಹಗಳು",
      outer_planets_desc: "ಗುರು, ಶನಿ, ಯುರೇನಸ್, ನೆಪ್ಚೂನ್",
      definition: "ವ್ಯಾಖ್ಯೆ",
      definition_desc: "ಪರಿಕಲ್ಪನೆಯ ಪ್ರಾಥಮಿಕ ತಿಳುವಳಿಕೆ",
      mechanism: "ಮುಖ್ಯ ಕಾರ್ಯವಿಧಾನ",
      mechanism_desc: "ಇದು ಹಂತ ಹಂತವಾಗಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
      application: "ಅನ್ವಯ",
      application_desc: "ನಿಜ ಜೀವನ ಮತ್ತು ಪರೀಕ್ಷೆಗಳಲ್ಲಿ ಬಳಕೆ",
      diagram_title_photo: "ದ್ಯುತಿಸំಶ್ಲೇಷಣೆಯ ಕ್ರಿಯೆಯ ಚಕ್ರ",
      diagram_title_atom: "ಪರಮಾಣು ರಚನೆ",
      diagram_title_frac: "ಭಿನ್ನರಾಶಿಯ ಪ್ರಾತಿನಿಧ್ಯ",
      diagram_title_solar: "ಸೌರಮಂಡಲದ ಕಕ್ಷೆಗಳ ಚಕ್ರ",
      diagram_title_generic: "ಪರಿಕಲ್ಪನೆಯ ಹರಿವು"
    },
    ml: {
      sunlight: "സൂര്യപ്രകാശം",
      sunlight_desc: "ഇലകളിലെ ഹരിതകം ആഗിരണം ചെയ്യുന്ന ഊർജ്ജം",
      co2: "കാർബൺ ഡയോക്സൈഡ് (CO2)",
      co2_desc: "അന്തരീക്ഷത്തിൽ നിന്ന് ഇലകൾ ആഗിരണം ചെയ്യുന്നത്",
      water: "വെള്ളം (H2O)",
      water_desc: "വേരുകൾ മണ്ണിൽ നിന്ന് ആഗിരണം ചെയ്യുന്നത്",
      glucose_oxy: "ഗ്ലൂക്കോസ് & ഓക്സിജൻ",
      glucose_oxy_desc: "ഊർജ്ജത്തിനായി ഗ്ലൂക്കോസ് & പുറത്തുവിടുന്ന ഓക്സിജൻ",
      nucleus: "ന്യൂക്ലിയസ്",
      nucleus_desc: "ആറ്റത്തിന്റെ പോസിറ്റീവ് കേന്ദ്രഭാഗം",
      protons: "പ്രോട്ടോണുകൾ (+)",
      protons_desc: "ന്യൂക്ലിയസിനുള്ളിലെ പോസിറ്റീവ് കണങ്ങൾ",
      neutrons: "ന്യൂട്രോണുകൾ (0)",
      neutrons_desc: "ന്യൂക്ലിയസിനുള്ളിലെ ചാർജില്ലാത്ത കണങ്ങൾ",
      electrons: "ഇലക്ട്രോണുകൾ (-)",
      electrons_desc: "ന്യൂക്ലിയസിന് പുറത്തു വലംവെക്കുന്ന നെഗറ്റീവ് കണങ്ങൾ",
      numerator: "അംശം (Numerator)",
      numerator_desc: "തിരഞ്ഞെടുത്ത ഭാഗങ്ങളുടെ എണ്ണം",
      denominator: "ഛേദം (Denominator)",
      denominator_desc: "ആകെ തുല്യ ഭാഗങ്ങളുടെ എണ്ണം",
      where_b_non_zero: "ഛേദം പൂജ്യം ആകരുത്",
      sun: "സൂര്യൻ (കേന്ദ്രം)",
      sun_desc: "ഗുരുത്യാകർഷണത്തിന്റെ പ്രധാന സ്രോതസ്സ്",
      inner_planets: "ആന്തരിക ഗ്രഹങ്ങൾ",
      inner_planets_desc: "ബുധൻ, ശുക്രൻ, ഭൂമി, ചൊവ്വ",
      outer_planets: "ബാഹ്യ ഗ്രഹങ്ങൾ",
      outer_planets_desc: "വ്യാഴം, ശനി, യുറാനസ്, നെപ്റ്റ്യൂൺ",
      definition: "നിർവചനം",
      definition_desc: "ആശയത്തിന്റെ അടിസ്ഥാനപരമായ അറിവ്",
      mechanism: "പ്രധാന പ്രക്രിയ",
      mechanism_desc: "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു",
      application: "പ്രായോഗികത",
      application_desc: "യഥാർത്ഥ ജീവിതത്തിലും പരീക്ഷകളിലും ഉപയോഗം",
      diagram_title_photo: "പ്രകാശസംശ്ലേഷണ പ്രക്രിയയുടെ ചക്രം",
      diagram_title_atom: "ആറ്റത്തിന്റെ ഘടന",
      diagram_title_frac: "ഭിന്നസംഖ്യാ രൂപം",
      diagram_title_solar: "സൗരയൂഥത്തിന്റെ ഭ്രമണപഥ ചക്രം",
      diagram_title_generic: "ആശയ വിനിമയം"
    },
    pa: {
      sunlight: "ਸੂਰਜ ਦੀ ਰੌਸ਼ਨੀ",
      sunlight_desc: "ਪੱਤਿਆਂ ਵਿੱਚ ਕਲੋਰੋਫਿਲ ਦੁਆਰਾ ਸੋਖੀ ਗਈ ਊਰਜਾ",
      co2: "ਕਾਰਬਨ ਡਾਈਆਕਸਾਈਡ (CO2)",
      co2_desc: "ਹਵਾ ਤੋਂ ਪੱਤਿਆਂ ਦੁਆਰਾ ਸੋਖਿਆ ਗਿਆ",
      water: "ਪਾਣੀ (H2O)",
      water_desc: "ਜੜ੍ਹਾਂ ਦੁਆਰਾ ਮਿੱਟੀ ਤੋਂ ਸੋਖਿਆ ਗਿਆ",
      glucose_oxy: "ਗਲੂਕੋਜ਼ ਅਤੇ ਆਕਸੀਜਨ",
      glucose_oxy_desc: "ਊਰਜਾ ਲਈ ਗਲੂਕੋਜ਼ ਅਤੇ ਸਾਹ ਲੈਣ ਲਈ ਆਕਸੀਜਨ",
      nucleus: "ਨਿਊਕਲੀਅਸ (ਕੇਂਦਰ)",
      nucleus_desc: "ਪਰਮਾਣੂ ਦਾ ਭਾਰੀ ਸਕਾਰਾਤਮਕ ਕੇਂਦਰ",
      protons: "ਪ੍ਰੋਟੋਨ (+)",
      protons_desc: "ਨਿਊਕਲੀਅਸ ਦੇ ਅੰਦਰ ਸਕਾਰਾਤਮਕ ਕਣ",
      neutrons: "ਨਿਊਟਰੋਨ (0)",
      neutrons_desc: "ਨਿਊਕਲੀਅਸ ਦੇ ਅੰਦਰ ਨਿਰਪੱਖ ਕਣ",
      electrons: "ਇਲੈਕਟ੍ਰੋਨ (-)",
      electrons_desc: "ਨਿਊਕਲੀਅਸ ਦੇ ਬਾਹਰ ਚੱਕਰ ਲਗਾਉਣ ਵਾਲੇ ਨਕਾਰਾਤਮਕ ਕਣ",
      numerator: "ਅੰਸ਼ (Numerator)",
      numerator_desc: "ਚੁਣੇ ਗਏ ਹਿੱਸਿਆਂ ਦੀ ਗਿਣਤੀ",
      denominator: "ਹਰ (Denominator)",
      denominator_desc: "ਕੁੱਲ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਦੀ ਗਿਣਤੀ",
      where_b_non_zero: "ਹਰ ਜ਼ੀਰੋ ਨਹੀਂ ਹੋ ਸਕਦਾ",
      sun: "ਸੂਰਜ (ਕੇਂਦਰ)",
      sun_desc: "ਗੁਰੂਤਾਕਰਸ਼ਣ ਦਾ ਮੁੱਖ ਸਰੋਤ",
      inner_planets: "ਅੰਦਰੂਨੀ ਗ੍ਰਹਿ",
      inner_planets_desc: "ਬੁੱਧ, ਸ਼ੁੱਕਰ, ਧਰਤੀ, ਮੰਗਲ (ਪੱਥਰੀਲੇ)",
      outer_planets: "ਬਾਹਰੀ ਗ੍ਰਹਿ",
      outer_planets_desc: "ਬ੍ਰਹਿਸਪਤ, ਸ਼ਨੀ, ਯੂਰੇਨਸ, ਨੈਪਚਿਊਨ",
      definition: "ਪਰਿਭਾਸ਼ਾ",
      definition_desc: "ਸੰਕਲਪ ਦੀ ਬੁਨਿਆਦੀ ਸਮਝ",
      mechanism: "ਮੁੱਖ ਕਾਰਜ ਪ੍ਰਣਾਲੀ",
      mechanism_desc: "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ",
      application: "ਵਿਹਾਰਕ ਵਰਤੋਂ",
      application_desc: "ਅਸਲ ਜ਼ਿੰਦਗੀ ਅਤੇ ਪ੍ਰੀਖਿਆਵਾਂ ਵਿੱਚ ਵਰਤੋਂ",
      diagram_title_photo: "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਚੱਕਰ",
      diagram_title_atom: "ਪਰਮਾਣੂ ਦੀ ਸੰਰਚਨਾ",
      diagram_title_frac: "ਭਿੰਨ ਦੀ ਪੇਸ਼ਕਾਰੀ",
      diagram_title_solar: "ਸੂਰਜੀ ਮੰਡਲ ਦੇ ਪੰਧ",
      diagram_title_generic: "ਸੰਕਲਪ ਪ੍ਰਵਾਹ"
    },
    or: {
      sunlight: "ସୂର୍ଯ୍ୟ କିରଣ",
      sunlight_desc: "ପତ୍ରରେ କ୍ଲୋରୋଫିଲ୍ ଦ୍ୱାରା ଶୋଷିତ ଶକ୍ତି",
      co2: "ଅଙ୍ଗାରକାମ୍ଳ (CO2)",
      co2_desc: "ବାୟୁମଣ୍ଡଳରୁ ପତ୍ର ଦ୍ୱାରା ଶୋଷିତ",
      water: "ଜଳ (H2O)",
      water_desc: "ଚେର ଦ୍ୱାରା ମାଟିରୁ ଶୋଷିତ",
      glucose_oxy: "ଗ୍ଲୁକୋଜ୍ ଏବଂ ଅମ୍ଳଜାନ",
      glucose_oxy_desc: "ଶକ୍ତି ପାଇଁ ଗ୍ଲୁକୋଜ୍ ଏବଂ ନିର୍ଗତ ଅମ୍ଳଜାନ",
      nucleus: "ନାଭି (Nucleus)",
      nucleus_desc: "ପରମାଣୁର କେନ୍ଦ୍ର ଭାଗ",
      protons: "ପ୍ରୋଟୋନ୍ (+)",
      protons_desc: "ନାଭି ଭିତରେ ଥିବା ଧନାତ୍ମକ କଣିକା",
      neutrons: "ନିଉଟ୍ରୋନ୍ (0)",
      neutrons_desc: "ନାଭି ଭିତରେ ଥିବା ଚାର്ଜହୀନ କଣିକା",
      electrons: "ଇଲେକ୍ଟ୍ରୋନ୍ (-)",
      electrons_desc: "ନାଭି ଚାରିପଟେ ବୁଲୁଥିବା ଋଣାତ୍ମକ କଣିକା",
      numerator: "ଲବ (Numerator)",
      numerator_desc: "ନିଆଯାଇଥିବା ଭାଗ ସଂଖ୍ୟା",
      denominator: "ହର (Denominator)",
      denominator_desc: "ମୋଟ ସମାନ ଭାଗ ସଂଖ୍ୟା",
      where_b_non_zero: "ହର ଶୂନ ହୋଇପାରିବ ନାହିଁ",
      sun: "ସୂର୍ଯ୍ୟ (କେନ୍ଦ୍ର)",
      sun_desc: "ମଧ୍ୟାକର୍ଷଣର ମୁଖ୍ୟ ଉତ୍ସ",
      inner_planets: "ଆଭ୍ୟନ୍ତରୀଣ ଗ୍ରହ",
      inner_planets_desc: "ବୁଧ, ଶୁକ୍ର, ପୃଥିବୀ, ମଙ୍ଗଳ",
      outer_planets: "ବାହ୍ୟ ଗ୍ରହ",
      outer_planets_desc: "ବୃହସ୍ପତି, ଶନି, ୟୁରେନସ, ନେପଚୁନ",
      definition: "ସଂଜ୍ଞା",
      definition_desc: "ଧାରଣାର ପ୍ରାଥମିକ ବୁଝାମଣା",
      mechanism: "ମୁଖ୍ୟ ପ୍ରକ୍ରିୟା",
      mechanism_desc: "ଏହା କିପରି କାମ କରେ",
      application: "ପ୍ରୟୋଗ",
      application_desc: "ବାସ୍ତବ ଜୀବନ ଓ ପରୀକ୍ଷାରେ ବ୍ୟବହାର",
      diagram_title_photo: "ଆଲୋକଶ୍ଳେଷଣ ପ୍ରକ୍ରିୟା ଚକ୍ର",
      diagram_title_atom: "ପରମାಣୁ ସଂରଚନା",
      diagram_title_frac: "ଭଗ୍ନାଂଶର ପ୍ରତିନିଧିତ୍ୱ",
      diagram_title_solar: "ସୌରଜଗତ କକ୍ଷପଥ ଚକ୍ର",
      diagram_title_generic: "ଧାରଣା ପ୍ରବାହ"
    },
    as: {
      sunlight: "সূৰ্যৰ পোহৰ",
      sunlight_desc: "পাতৰ ক্ল’ৰ’ফিলে শোষণ কৰা শক্তি",
      co2: "কাৰ্বন ডাই অক্সাইড (CO2)",
      co2_desc: "বায়ুমণ্ডলৰ পৰা পাতে শোষণ কৰা গেছ",
      water: "পানী (H2O)",
      water_desc: "শিপাই মাটিৰ পৰা শোষণ কৰা পানী",
      glucose_oxy: "গ্লুক’জ আৰু অক্সিজেন",
      glucose_oxy_desc: "শক্তিৰ বাবে গ্লুক’জ আৰু এৰি দিয়া অক্সিজেন",
      nucleus: "নিউক্লিয়াছ",
      nucleus_desc: "পৰমাণুৰ কেন্দ্ৰভাগ",
      protons: "প্ৰ’টন (+)",
      protons_desc: "কেন্দ্ৰত থকা ধনাত্মক কণা",
      neutrons: "নিউটন (0)",
      neutrons_desc: "কেন্দ্ৰত থকা আধানহীন কণা",
      electrons: "ইলেকট্ৰন (-)",
      electrons_desc: "কেন্দ্ৰৰ বাহিৰত ঘূৰি থকা ঋণাত্মক কণা",
      numerator: "লৱ (Numerator)",
      numerator_desc: "বাচনি কৰা অংশৰ সংখ্যা",
      denominator: "হৰ (Denominator)",
      denominator_desc: "মুঠ সমান অংশৰ সংখ্যা",
      where_b_non_zero: "হৰ কেতিয়াও শূন্য হ’ব নোৱাৰে",
      sun: "সূৰ্য (কেন্দ্ৰ)",
      sun_desc: "মহাকৰ্ষণৰ মূল উৎস",
      inner_planets: "অভ্যন্তৰীণ গ্ৰহ",
      inner_planets_desc: "বুধ, শুক্ৰ, পৃথিৱী, মঙ্গল",
      outer_planets: "বাহ্যিক গ্ৰহ",
      outer_planets_desc: "বৃহস্পতি, শনি, ইউৰেনাচ, নেপচুন",
      definition: "সংজ্ঞা",
      definition_desc: "ধাৰণাৰ প্ৰাথমিক বুজাবুজি",
      mechanism: "মূল প্ৰক্ৰিয়া",
      mechanism_desc: "ই কেনেকৈ কাম কৰে",
      application: "প্ৰয়োগ",
      application_desc: "বাস্তৱ জীৱন আৰু পৰীক্ষাত ব্যৱহাৰ",
      diagram_title_photo: "সালোক সংশ্লেষণ চক্ৰ",
      diagram_title_atom: "পৰমাণুৰ গঠন",
      diagram_title_frac: "ভগ্নাংশৰ প্ৰতিনিধিত্ব",
      diagram_title_solar: "সৌৰজগতৰ কক্ষপথ চক্ৰ",
      diagram_title_generic: "ধাৰণা প্ৰবাহ"
    },
    sa: {
      sunlight: "सूर्यप्रकाशः",
      sunlight_desc: "पर्णेषु हरितद्रव्येण शोषितम् ऊर्जा",
      co2: "अङ्गाराम्लवायुः (CO2)",
      co2_desc: "वातावरणात् पर्णैः शोषितः",
      water: "जलम् (H2O)",
      water_desc: "मूलैः मृत्तिकायाः शोषितम्",
      glucose_oxy: "ग्लूकोजः प्राणवायुः च",
      glucose_oxy_desc: "ऊर्जायै ग्लूकोजः प्राणवायुविसर्गः च",
      nucleus: "नाभिकः",
      nucleus_desc: "परमाणोः दृढः धनभारयुक्तः केन्द्रभागः",
      protons: "प्रोटॉन (+)",
      protons_desc: "नाभिके धनभारकणाः",
      neutrons: "न्यूट्रॉन (0)",
      neutrons_desc: "नाभिके उदासीनकणाः",
      electrons: "इलेक्ट्रॉन (-)",
      electrons_desc: "नाभिकं परितः भ्रमन्तः ऋणभारकणाः",
      numerator: "अंशः",
      numerator_desc: "चितानां भागानां संख्या",
      denominator: "हरः",
      denominator_desc: "एकत्र कल्पितानां भागानां संख्या",
      where_b_non_zero: "हरः शून्यं भवितुं नार्हति",
      sun: "सूर्यः (केन्द्रम्)",
      sun_desc: "गुरुत्वाकर्षणस्य मुख्यः स्रोतः",
      inner_planets: "आन्तरिकग्रहाः",
      inner_planets_desc: "बुधः, शुक्रः, पृथिवी, मङ्गलः",
      outer_planets: "बाह्यग्रहाः",
      outer_planets_desc: "बृहस्पतिः, शनिः, अरुणः, वरुणः",
      definition: "परिभाषा",
      definition_desc: "सिद्धान्तस्य मूलज्ञानम्",
      mechanism: "मुख्यकार्यविधिः",
      mechanism_desc: "कथम् एतत् सोपानशः कार्यं करोति",
      application: "प्रयोगः",
      application_desc: "व्यावहारिकजीवने परीक्षासु च उपयोगः",
      diagram_title_photo: "प्रकाशसंश्लेषणचक्रम्",
      diagram_title_atom: "परमाणुसंरचनाश्रेणी",
      diagram_title_frac: "भिन्ननिरूपणम्",
      diagram_title_solar: "सौरमण्डलपरिक्रमाचक्रम्",
      diagram_title_generic: "सिद्धान्तप्रवाहः"
    }
  };

  // Translation helper for diagram elements
  const getDiagTrans = (key) => {
    let activeLang = lang;
    if (!DIAGRAM_TRANS[activeLang]) {
      if (['ne', 'kok', 'doi', 'brx', 'mai'].includes(activeLang)) activeLang = 'hi';
      else if (['ks', 'sd'].includes(activeLang)) activeLang = 'ur';
      else if (activeLang === 'mni') activeLang = 'bn';
      else activeLang = 'en';
    }
    const dict = DIAGRAM_TRANS[activeLang] || DIAGRAM_TRANS.en;
    return dict[key] || DIAGRAM_TRANS.en[key];
  };

  const getFallbackDiagram = (topicName) => {
    const norm = topicName.toLowerCase();
    if (norm.includes('photosynthesis')) {
      return {
        type: 'cycle',
        title: getDiagTrans('diagram_title_photo'),
        elements: [
          { label: getDiagTrans('sunlight'), desc: getDiagTrans('sunlight_desc') },
          { label: getDiagTrans('co2'), desc: getDiagTrans('co2_desc') },
          { label: getDiagTrans('water'), desc: getDiagTrans('water_desc') },
          { label: getDiagTrans('glucose_oxy'), desc: getDiagTrans('glucose_oxy_desc') }
        ]
      };
    } else if (norm.includes('atom')) {
      return {
        type: 'hierarchy',
        title: getDiagTrans('diagram_title_atom'),
        elements: [
          { label: getDiagTrans('nucleus'), desc: getDiagTrans('nucleus_desc') },
          { label: getDiagTrans('protons'), desc: getDiagTrans('protons_desc') },
          { label: getDiagTrans('neutrons'), desc: getDiagTrans('neutrons_desc') },
          { label: getDiagTrans('electrons'), desc: getDiagTrans('electrons_desc') }
        ]
      };
    } else if (norm.includes('fraction')) {
      return {
        type: 'formula',
        title: getDiagTrans('diagram_title_frac'),
        elements: [
          { label: getDiagTrans('numerator'), desc: getDiagTrans('numerator_desc') },
          { label: getDiagTrans('denominator'), desc: getDiagTrans('denominator_desc') },
          { label: 'a / b', desc: getDiagTrans('where_b_non_zero') }
        ]
      };
    } else if (norm.includes('solar') || norm.includes('system')) {
      return {
        type: 'cycle',
        title: getDiagTrans('diagram_title_solar'),
        elements: [
          { label: getDiagTrans('sun'), desc: getDiagTrans('sun_desc') },
          { label: getDiagTrans('inner_planets'), desc: getDiagTrans('inner_planets_desc') },
          { label: getDiagTrans('outer_planets'), desc: getDiagTrans('outer_planets_desc') }
        ]
      };
    } else {
      return {
        type: 'flowchart',
        title: getDiagTrans('diagram_title_generic'),
        elements: [
          { label: getDiagTrans('definition'), desc: getDiagTrans('definition_desc') },
          { label: getDiagTrans('mechanism'), desc: getDiagTrans('mechanism_desc') },
          { label: getDiagTrans('application'), desc: getDiagTrans('application_desc') }
        ]
      };
    }
  };

  // Translation dictionary for offline lessons across 22 official Indian languages
  const OFFLINE_TRANS = {
    en: {
      classWord: "Class",
      explanation: "This interactive lesson on {topic} is loaded in offline/simulation fallback mode. It covers the core NCERT syllabus points standardly taught at this grade level. Use internet connectivity to dynamically fetch AI streaming board content in all 22 Indian languages.",
      kp1: "Core NCERT guidelines for {topic}",
      kp2: "Typical board exam questions for Class {cl}",
      kp3: "Practical applications and experiments",
      ex1: "Standard classroom demonstration and diagrams",
      ex2: "Relatable textbook examples",
      summary: "Understanding {topic} is essential to master the foundations of {subject}."
    },
    hi: {
      classWord: "कक्षा",
      explanation: "यह {topic} पर इंटरैक्टिव पाठ ऑफ़लाइन/सिमुलेशन मोड में लोड किया गया है। यह इस कक्षा स्तर पर मानक रूप से पढ़ाए जाने वाले प्रमुख एनसीईआरटी पाठ्यक्रम बिंदुओं को शामिल करता है। सभी 22 भारतीय भाषाओं में एआई-संचालित लाइव फलक सामग्री प्राप्त करने के लिए इंटरनेट से जुड़ें।",
      kp1: "अवधारणा के बुनियादी नियम और सिद्धांत",
      kp2: "कक्षा {cl} के लिए महत्वपूर्ण परीक्षा प्रश्न",
      kp3: "व्यावहारिक अनुप्रयोग और प्रयोग",
      ex1: "कक्षा में मानक प्रदर्शन और चित्र",
      ex2: "पाठ्यपुस्तक के उदाहरण और व्यावहारिक उदाहरण",
      summary: "विषय की बेहतर समझ के लिए {topic} का बुनियादी ज्ञान आवश्यक है।"
    },
    bn: {
      classWord: "শ্রেণি",
      explanation: "এই {topic} বিষয়ক ইন্টারঅ্যাক্টিভ পাঠটি অফলাইন/সিমুলেশন মোডে লোড করা হয়েছে। এটি এই শ্রেণির স্তরে মানক এনসিইআরটি (NCERT) পাঠ্যসূচির মূল পয়েন্টগুলি কভার করে। ২২টি ভারতীয় ভাষায় এআই-চালিত লাইভ বোর্ড কনটেন্ট পেতে ইন্টারনেটের সাথে যুক্ত হোন।",
      kp1: "ধারণার মৌলিক নিয়ম ও তত্ত্ব",
      kp2: "শ্রেণি {cl}-এর জন্য গুরুত্বপূর্ণ পরীক্ষার প্রশ্ন",
      kp3: "ব্যবহারিক প্রয়োগ ও পরীক্ষা-নিরীক্ষা",
      ex1: "শ্রেণীকক্ষে মানক প্রদর্শন এবং চিত্র",
      ex2: "পাঠ্যপুস্তকের উদাহরণ এবং বাস্তব প্রয়োগ",
      summary: "বিষয়টি আরও ভালভাবে বোঝার জন্য {topic} এর প্রাথমিক জ্ঞান অপরিহার্য।"
    },
    te: {
      classWord: "తరగతి",
      explanation: "ఈ {topic} ఇంటరాక్టివ్ పాఠం ఆఫ్ లైన్/సిమ్యులేషన్ మోడ్‌లో లోడ్ చేయబడింది. ఇది ఈ తరగతి స్థాయిలో ప్రామాణికంగా బోధించే ఎన్‌సిఇఆర్‌టి (NCERT) పాఠ్యప్రణాళికా ముఖ్యాంశాలను కలిగి ఉంది. అన్ని 22 భారతీయ భాషల్లో AI ఆధారిత లైవ్ బోర్డ్ కంటెంట్ పొందడానికి ఇంటర్నెట్‌తో కనెక్ట్ అవ్వండి.",
      kp1: "భావన యొక్క ప్రాథమిక నియమాలు మరియు సిద్ధాంతాలు",
      kp2: "తరగతి {cl} కొరకు ముఖ్యమైన పరీక్షా ప్రశ్నలు",
      kp3: "ఆచరణాత్మక అనువర్తనాలు మరియు ప్రయోగాలు",
      ex1: "తరగతి గదిలో ప్రామాణిక ప్రదర్శన మరియు రేఖాచిత్రాలు",
      ex2: "పాఠ్యపుస్తక ఉదాహరణలు మరియు నిజ జీవిత అనువర్తనం",
      summary: "విషయాన్ని బాగా అర్థం చేసుకోవడానికి {topic} యొక్క ప్రాథమిక జ్ఞానం అవసరం."
    },
    mr: {
      classWord: "इयत्ता",
      explanation: "हा {topic} वरील परस्परसंवादी पाठ ऑफलाइन/सिम्युलेशन मोडमध्ये लोड केला गेला आहे. यामध्ये या इयत्तेत शिकवल्या जाणाऱ्या प्रमुख एनसीईआरटी (NCERT) अभ्यासक्रमाचे मुद्दे समाविष्ट आहेत. सर्व २२ भारतीय भाषांमध्ये एआय-चालित लाइव्ह बोर्ड सामग्री मिळविण्यासाठी इंटरनेटशी कनेक्ट व्हा.",
      kp1: "संकल्पनेचे मूलभूत नियम आणि सिद्धांत",
      kp2: "इयत्ता {cl} साठी महत्त्वाचे परीक्षा प्रश्न",
      kp3: "व्यावहारिक उपयोजन आणि प्रयोग",
      ex1: "वर्गातील मानक प्रात्यक्षिक आणि आकृती",
      ex2: "पाठ्यपुस्तकातील उदाहरणे आणि व्यावहारिक संदर्भ",
      summary: "विषयाची चांगली समज मिळवण्यासाठी {topic} चे मूलभूत ज्ञान आवश्यक आहे।"
    },
    ta: {
      classWord: "வகுப்பு",
      explanation: "இந்த {topic} ஊடாடும் பாடம் ஆஃப்லைன்/சிமுலேஷன் பயன்முறையில் ஏற்றப்பட்டுள்ளது. இது இந்த வகுப்பு மட்டத்தில் பொதுவாக கற்பிக்கப்படும் முக்கிய என்சிஇஆர்டி (NCERT) பாடத்திட்ட புள்ளிகளை உள்ளடக்கியது. அனைத்து 22 இந்திய மொழிகளிலும் AI-இயங்கும் நேரடி போர்டு உள்ளடக்கத்தைப் பெற இணையத்துடன் இணைக்கவும்.",
      kp1: "கருத்தின் அடிப்படை விதிகள் மற்றும் கோட்பாடுகள்",
      kp2: "வகுப்பு {cl}-க்கான முக்கிய தேர்வு கேள்விகள்",
      kp3: "நடைமுறை பயன்பாடுகள் மற்றும் சோதனைகள்",
      ex1: "வகுப்பறை நிலையான செய்முறை விளக்கம் மற்றும் வரைபடங்கள்",
      ex2: "பாடப்புத்தக உதாரணங்கள் மற்றும் நடைமுறை பயன்பாடுகள்",
      summary: "{topic} பற்றிய அடிப்படை அறிவு விஷயத்தை நன்றாகப் புரிந்துகொள்வதற்கு அவசியமாகும்."
    },
    gu: {
      classWord: "ધોરણ",
      explanation: "આ {topic} પરનો ઇન્ટરેક્ટિવ પાઠ ઑફલાઇન/સિમ્યુલેશન મોડમાં લોડ થયો છે. તે આ ધોરણ સ્તરે સામાન્ય રીતે ભણાવવામાં આવતા મુખ્ય એનસીઇઆરટી (NCERT) અભ्याસક્રમના મુદ્દાઓ આવરી લે છે. બધી 22 ભારતીય ભાષાઓમાં એઆઇ-સંચાલિત લાઇવ બોર્ડ સામગ્રી મેળવવા માટે ઇન્ટરનેટ સાથે જોડાઓ.",
      kp1: "સંકલ્પનાના મૂળભૂત નિયમો અને સિદ્ધાંતો",
      kp2: "ધોરણ {cl} માટે મહત્વના પરીક્ષા પ્રશ્નો",
      kp3: "વ્યવહારિક પ્રયોગો અને ઉપયોગો",
      ex1: "વર્ગખંડમાં સામાન્ય નિદર્શન અને આકૃતિઓ",
      ex2: "પાઠયપુસ્તકના ઉદાહરણો અને પ્રાદેશિક સંદર્ભો",
      summary: "વિષયની સારી સમજ માટે {topic} નું મૂળભૂત જ્ઞાન જરૂરી છે."
    },
    ur: {
      classWord: "کلاس",
      explanation: "یہ {topic} کا انٹرایکٹو سبق آف لائن/سیمولیشن موڈ میں لوڈ کیا گیا ہے۔ یہ اس کلاس لیول پر پڑھائے جانے والے اہم این سی ای آر ٹی (NCERT) نصابی نکات کا احاطہ کرتا ہے۔ تمام 22 ہندوستانی زبانوں میں AI سے چلنے والا لائیو بورڈ مواد حاصل کرنے کے لیے انٹرنیٹ سے جڑیں۔",
      kp1: "تصور کے بنیادی قوانین اور اصول",
      kp2: "کلاس {cl} کے لیے اہم امتحانی سوالات",
      kp3: "عملی تجربات اور اطلاقات",
      ex1: "کلاس میں معیاری مظاہرہ اور ڈایاگرام",
      ex2: "درسی کتاب کی مثالیں اور حقیقی زندگی کے استعمال",
      summary: "مضمون کی بہتر تفہیم کے لیے {topic} کی بنیادی معلومات ضروری ہیں۔"
    },
    kn: {
      classWord: "ತರಗತಿ",
      explanation: "ಈ {topic} ಸಂವಾದಾತ್ಮಕ ಪಾಠವನ್ನು ಆಫ್‌ಲೈನ್/ಸಿಮ್ಯುಲೇಶನ್ ಮೋಡ್‌ನಲ್ಲಿ ಲೋಡ್ ಮಾಡಲಾಗಿದೆ. ಇದು ಈ ತರಗತಿ ಮಟ್ಟದಲ್ಲಿ ಬೋಧಿಸುವ ಪ್ರಮುಖ ಎನ್‌ಸಿಇಆರ್‌ಟಿ (NCERT) ಪಠ್ಯಕ್ರಮದ ಅಂಶಗಳನ್ನು ಒಳಗೊಂಡಿದೆ. ಎಲ್ಲಾ 22 ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ AI ಚಾಲಿತ ಲೈವ್ ಬೋರ್ಡ್ ವಿಷಯವನ್ನು ಪಡೆಯಲು ಇಂಟರ್ನೆಟ್‌ಗೆ ಸಂಪರ್ಕಪಡಿಸಿ.",
      kp1: "ಪರಿಕಲ್ಪನೆಯ ಮೂಲ ನಿಯಮಗಳು ಮತ್ತು ಸಿದ್ಧಾಂತಗಳು",
      kp2: "ತರಗತಿ {cl} ಗಾಗಿ ಪ್ರಮುಖ ಪರೀಕ್ಷಾ ಪ್ರಶ್ನೆಗಳು",
      kp3: "ಪ್ರಾಯೋಗಿಕ ಪ್ರಯೋಗಗಳು ಮತ್ತು ಅನ್ವಯಗಳು",
      ex1: "ತರಗತಿಯಲ್ಲಿ ಪ್ರಮಾಣಿತ ಪ್ರದರ್ಶನ ಮತ್ತು ರೇಖಾಚಿತ್ರಗಳು",
      ex2: "ಪಠ್ಯಪುಸ್ತಕದ ಉದಾಹರಣೆಗಳು ಮತ್ತು ನಿಜ ಜೀವನದ ವಿವರಣೆಗಳು",
      summary: "ವಿಷಯವನ್ನು ಚೆನ್ನಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು {topic} ನ ಮೂಲಭೂತ ಜ್ಞಾನ ಅತ್ಯಗತ್ಯ."
    },
    ml: {
      classWord: "ക്ലാസ്",
      explanation: "ഈ {topic} സംവേദനാത്മക പാഠം ഓഫ്‌ലൈൻ/സിമുലേഷൻ മോഡിൽ ലോഡ് ചെയ്തിരിക്കുന്നു. ഇത് ഈ ക്ലാസ് തലത്തിൽ പഠിപ്പിക്കുന്ന പ്രധാന എൻസിഇആർടി (NCERT) സിലബസ് പോയിന്റുകൾ ഉൾക്കൊള്ളുന്നു. എല്ലാ 22 ഇന്ത്യൻ ഭാഷകളിലും AI-അധിഷ്ഠിത തത്സമയ ബോർഡ് ഉള്ളടക്കം ലഭിക്കുന്നതിന് ഇൻ്റർനെറ്റിലേക്ക് കണക്ട് ചെയ്യുക.",
      kp1: "ആശയത്തിൻ്റെ അടിസ്ഥാന നിയമങ്ങളും സിദ്ധാന്തങ്ങളും",
      kp2: "ക്ലാസ് {cl}-നായുള്ള പ്രധാന പരീക്ഷാ ചോദ്യങ്ങൾ",
      kp3: "പ്രായോഗിക പരീക്ഷണങ്ങളും പ്രയോഗങ്ങളും",
      ex1: "ക്ലാസ് മുറിയിലെ സാധാരണ പ്രദർശനവും ഡയഗ്രമുകളും",
      ex2: "പാഠപുസ്തക ഉദാഹരണങ്ങളും നിത്യജീവിത ഉദാഹരണങ്ങളും",
      summary: "വിഷയം നന്നായി മനസ്സിലാക്കുന്നതിന് {topic} കുറിച്ചുള്ള അടിസ്ഥാന അറിവ് ആവശ്യമാണ്."
    },
    pa: {
      classWord: "ਕਲਾਸ",
      explanation: "ਇਹ {topic} ਦਾ ਇੰਟਰਐਕਟਿਵ ਪਾਠ ਔਫਲਾਈਨ/ਸਿਮੂਲੇਸ਼ਨ ਮੋਡ ਵਿੱਚ ਲੋਡ ਕੀਤਾ ਗਿਆ ਹੈ। ਇਹ ਇਸ ਕਲਾਸ ਪੱਧਰ 'ਤੇ ਪੜ੍ਹਾਏ ਜਾਣ ਵਾਲੇ ਮੁੱਖ NCERT ਪਾਠਕ੍ਰਮ ਦੇ ਨੁਕਤਿਆਂ ਨੂੰ ਕਵਰ ਕਰਦਾ ਹੈ। ਸਾਰੀਆਂ 22 ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ AI-ਸੰਚਾਲਿਤ ਲਾਈਵ ਬੋਰਡ ਸਮੱਗਰੀ ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ।",
      kp1: "ਸੰਕਲਪ ਦੇ ਬੁਨਿਆਦੀ ਨਿਯਮ ਅਤੇ ਸਿਧਾਂਤ",
      kp2: "ਕਲਾਸ {cl} ਲਈ ਮਹੱਤਵਪੂਰਨ ਪ੍ਰੀਖਿਆ ਪ੍ਰਸ਼ਨ",
      kp3: "ਵਿਹਾਰਕ ਕਾਰਜ ਅਤੇ ਪ੍ਰਯੋਗ",
      ex1: "ਜਮਾਤ ਵਿੱਚ ਮਿਆਰੀ ਪ੍ਰਦਰਸ਼ਨ ਅਤੇ ਚਿੱਤਰ",
      ex2: "ਪਾਠ ਪੁਸਤਕ ਦੀਆਂ ਉਦਾਹਰਣਾਂ ਅਤੇ ਅਸਲ ਉਦਾਹਰਣਾਂ",
      summary: "ਵਿਸ਼ੇ ਦੀ ਬਿਹਤਰ ਸਮਝ ਲਈ {topic} ਦਾ ਬੁਨਿਆਦੀ ਗਿਆਨ ਜ਼ਰੂਰੀ ਹੈ।"
    },
    or: {
      classWord: "ଶ୍ରେଣୀ",
      explanation: "ଏହି {topic} ଇଣ୍ଟରାକ୍ଟିଭ୍ ପାଠ୍ୟଟି ଅଫଲାଇନ/ସିମୁଲେସନ୍ ମୋଡରେ ଲୋଡ୍ ହୋଇଛି। ଏହା ଏହି ଶ୍ରେଣୀ ସ୍ତରରେ ଶିକ୍ଷା ଦିଆଯାଉଥିବା ପ୍ରମୁଖ NCERT ପାଠ୍ୟକ୍ରମର ବିନ୍ଦୁଗୁଡ଼ିକୁ କଭର କରେ। ସମସ୍ତ ୨୨ଟି ଭାରତୀୟ ଭାଷାରେ AI-ଚାଳିତ ଲାଇଭ୍ ବୋର୍ଡ ବିଷୟବସ୍ତୁ ପାଇଁ ଇଣ୍ଟରନେଟ୍ ସଂଯୋਗ କରନ୍ତୁ।",
      kp1: "ଧାରଣାର ମୌଳିକ ନିୟମ ଓ ସିଦ୍ଧାନ୍ତ",
      kp2: "ଶ୍ରେଣୀ {cl} ପାଇଁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପରୀକ୍ଷା ପ୍ରଶ୍ନ",
      kp3: "ବ୍ୟାବହାରିକ ପ୍ରୟୋଗ ଓ ପରୀକ୍ଷଣ",
      ex1: "ଶ୍ରେଣୀରେ ସାଧାରଣ ପ୍ରଦର୍ଶନ ଏବଂ ଚିତ୍ର",
      ex2: "ପାଠ୍ୟପୁସ୍ତକ ଉଦାହରଣ ଏବଂ ବାସ୍ତବ ଜୀବନର ଉଦାହରଣ",
      summary: "ବିଷୟଟିକୁ ଭଲ ଭାବରେ ବୁଝିବା ପାଇଁ {topic} ର ମୌଳିକ ଜ୍ଞାନ ଆବଶ୍ୟକ।"
    },
    as: {
      classWord: "শ্ৰেণী",
      explanation: "এই {topic} বিষয়ক ইন্টাৰেক্টিভ পাঠটো অফলাইন/চিমুলেচন মোডত লোড কৰা হৈছে। ই এই শ্ৰেণী স্তৰৰ মানক NCERT পাঠ্যক্ৰমৰ মূল দিশসমূহ সামৰি লৈছে। আটাইকেইটা ২২টা ভাৰতীয় ভাষাত AI-চালিত লাইভ বোৰ্ডৰ তথ্য লাভ কৰিবলৈ ইণ্টাৰনেটৰ সৈতে সংযোগ কৰক।",
      kp1: "ধাৰণাটোৰ মৌলিক নিয়ম আৰু সিদ্ধান্তসমূহ",
      kp2: "শ্ৰেণী {cl}ৰ বাবে গুৰুত্বপূৰ্ণ পৰীক্ষাৰ প্ৰশ্ন",
      kp3: "ব্যৱহাৰিক প্ৰয়োগ আৰু পৰীক্ষাসমূহ",
      ex1: "শ্ৰেণীকোঠাৰ সাধাৰণ প্ৰদৰ্শন আৰু চিত্ৰসমূহ",
      ex2: "পাঠ্যপুথিৰ উদাহৰণসমূহ আৰু বাস্তৱ ক্ষেত্ৰৰ উদাহৰণ",
      summary: "বিষয়টো ভালদৰে বুজিবলৈ {topic}ৰ মৌলিক জ্ঞান অপৰিহাৰ্য।"
    },
    sa: {
      classWord: "कक्षा",
      explanation: "अयं {topic} विषयकः संवादात्मकः पाठः ऑफलाइन/सिमुलेशन-विधिना लोड जातः अस्ति। एषः अस्मिन् कक्षास्तरे पठ्यमानस्य मुख्य-NCERT-पाठ्यक्रमस्य बिन्दून् आवृणोति। सर्वासु २२ भारतीयभाषासु एआई-द्वारा सञ्चालितं सजीवं फलकं प्राप्तुं अन्तर्जालं संयोजयन्तु।",
      kp1: "अवधारणायाः मूलाः नियमाः सिद्धान्ताः च",
      kp2: "कक्षा {cl} कृते महत्वपूर्णाः परीक्षाप्रश्नाः",
      kp3: "व्यावहारिकप्रयोगाः परीक्षाश्च",
      ex1: "कक्षायां मानकप्रदर्शनं चित्राणि च",
      ex2: "पाठ्यपुस्तकस्य उदाहरणानि व्यावहारिकसन्दर्भाः च",
      summary: "विषयस्य सम्यक् अवबोधाय {topic} विषयकस्य प्राथमिकज्ञानस्य आवश्यकता वर्तते।"
    }
  };

  const getLocalizedOffline = (activeLanguage, topicTitle, grade, subName) => {
    let activeLang = activeLanguage;
    if (!OFFLINE_TRANS[activeLang]) {
      if (['ne', 'kok', 'doi', 'brx', 'mai'].includes(activeLang)) activeLang = 'hi';
      else if (['ks', 'sd'].includes(activeLang)) activeLang = 'ur';
      else if (activeLang === 'mni') activeLang = 'bn';
      else activeLang = 'en';
    }

    const trans = OFFLINE_TRANS[activeLang] || OFFLINE_TRANS.en;
    
    const replacePlaceholders = (str) => {
      return str
        .replace(/{topic}/g, topicTitle)
        .replace(/{cl}/g, grade)
        .replace(/{subject}/g, subName);
    };

    return {
      title: `${topicTitle} (${trans.classWord} ${grade} ${subName})`,
      explanation: replacePlaceholders(trans.explanation),
      keyPoints: [
        replacePlaceholders(trans.kp1),
        replacePlaceholders(trans.kp2),
        replacePlaceholders(trans.kp3)
      ],
      examples: [
        replacePlaceholders(trans.ex1),
        replacePlaceholders(trans.ex2)
      ],
      summary: replacePlaceholders(trans.summary)
    };
  };

  const systemPrompt = `You are Vidya AI, an expert teacher assistant for Indian schools, guiding an interactive AI Smart Board.
Topic: "${actualTopic}"
Subject: "${actualSubject}"
Chapter: "${actualChapter}"
Class Level: Class ${cl}
Language: ${langName}
Region: ${actualRegion}

Selected Modes:
- Simplify Explanation: ${isSimplify ? 'Yes, explain using extremely simple language, metaphors and rural-relatable analogies.' : 'No, standard curriculum explanations.'}
- Visual Learning Mode: ${isVisualMode ? 'Yes, focus heavily on structural representations and create a detailed visual diagram layout.' : 'No.'}
- Exam Preparation Mode: ${isExamPrep ? 'Yes, highlight typical board exam questions, key terms, definitions, and grading tips.' : 'No.'}
- Student Skill Level: ${skillLevel} (Beginner: slow pace, intermediate: normal, advanced: deep-dive).

${followUpQuery ? `The user has asked this follow-up query: "${followUpQuery}". Adjust the explanation to answer this question while maintaining the context of the lesson.` : ''}

CRITICAL LANGUAGE INSTRUCTION: Every single word of your response MUST be in ${langName}. Do NOT use English unless English is the selected language. Use the appropriate regional script.

Return ONLY valid JSON (no markdown code blocks, no ticks, no surrounding text):
{
  "title": "Topic or Query Title in ${langName}",
  "explanation": "Detailed explanation matching the selected modes and language, written in ${langName}",
  "keyPoints": ["Point 1 in ${langName}", "Point 2 in ${langName}", "Point 3 in ${langName}"],
  "examples": ["Example 1 in ${langName}", "Example 2 in ${langName}"],
  "diagram": {
    "type": "flowchart | cycle | hierarchy | formula",
    "title": "Diagram Title in ${langName}",
    "elements": [
      { "label": "Label in ${langName}", "desc": "Description in ${langName}" }
    ]
  },
  "summary": "One sentence summary in ${langName}"
}
`;

  const response = await queryLLMChain(`SmartBoard:${actualTopic}:${langName}`, systemPrompt);
  if (response) {
    try {
      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      const parsed = JSON.parse(cleanText.trim());
      if (parsed.title && parsed.explanation) {
        return res.json({ success: true, provider: response.provider, ...parsed });
      }
    } catch (e) {
      console.error("Failed to parse dynamic Smart Board response:", e);
    }
  }

  // Offline/simulation fallback
  const diagram = getFallbackDiagram(actualTopic);
  const fall = getLocalizedOffline(lang, actualTopic, cl, actualSubject);

  res.json({
    success: true,
    provider: 'local_fallback',
    title: fall.title,
    explanation: fall.explanation,
    keyPoints: fall.keyPoints,
    examples: fall.examples,
    diagram: diagram,
    summary: fall.summary
  });
});

// ── VOICE CLASS SLIDES ENDPOINT ──────────────────────────────────────────────
// Returns 5-6 structured theory slides (no random content, pure NCERT theory)
app.post('/api/learning/voice-class/slides', async (req, res) => {
  const { topic, classLevel, language, subject, chapter } = req.body;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const cl = classLevel || 8;
  const actualTopic = topic || 'Photosynthesis';
  const actualSubject = subject || 'Science';
  const actualChapter = chapter || '';

  // ── Rich topic-aware fallback slides (theory only) ─────────────────────────
  const buildFallbackSlides = (topicName, grade, sub, lang) => {
    const topicLower = topicName.toLowerCase();

    // Topic-specific rich theory content (English base, translated concept structure)
    const topicKnowledge = {
      photosynthesis: {
        slides: [
          { heading: 'What is Photosynthesis?', body: `Photosynthesis is the process by which green plants, algae and some bacteria prepare their own food using sunlight, water and carbon dioxide. It is the most important biochemical process that sustains life on Earth. The word "Photosynthesis" comes from Greek: "Photo" means light and "Synthesis" means to put together.` },
          { heading: 'The Chemical Equation', body: `The overall chemical equation for photosynthesis is:\n\n6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\nThis means: Six molecules of Carbon Dioxide + Six molecules of Water, in the presence of sunlight, produce one molecule of Glucose (food) and six molecules of Oxygen. The oxygen is released into the atmosphere, which all living beings breathe.` },
          { heading: 'Where Does Photosynthesis Occur?', body: `Photosynthesis takes place inside the Chloroplasts — special organelles found in plant cells. Within the chloroplast, there is a green pigment called Chlorophyll. Chlorophyll is responsible for capturing the sunlight needed to drive the photosynthesis reaction. Leaves are the primary site of photosynthesis because they are flat (maximising surface area) and contain the most chlorophyll.` },
          { heading: 'Raw Materials Needed', body: `Three things are essential for photosynthesis:\n\n1. Carbon Dioxide (CO₂) — Absorbed from the air through tiny pores in leaves called Stomata.\n2. Water (H₂O) — Absorbed from the soil through the roots and transported up the stem via the Xylem vessels.\n3. Sunlight (Light Energy) — Absorbed by the Chlorophyll pigment in the chloroplasts.\n\nWithout any one of these three, photosynthesis cannot occur.` },
          { heading: 'Products of Photosynthesis', body: `Photosynthesis produces two important products:\n\n1. Glucose (C₆H₁₂O₆) — This is the food (chemical energy) stored by the plant. It is used for respiration to release energy, or converted into starch for storage, or used to build cell walls and other compounds.\n\n2. Oxygen (O₂) — Released as a by-product through the stomata back into the atmosphere. This is the oxygen that all animals, including humans, breathe to survive.` },
          { heading: 'Factors Affecting Photosynthesis', body: `The rate of photosynthesis depends on several environmental factors:\n\n1. Light Intensity — More light increases the rate (up to a limit).\n2. Carbon Dioxide Concentration — More CO₂ speeds up the reaction.\n3. Temperature — Enzymes work best at optimal temperature (around 25–35°C for most plants).\n4. Water Availability — Shortage of water closes stomata, slowing down gas exchange and the reaction.\n\nFarmers use this knowledge to grow crops in greenhouses where they can control these conditions.` },
          { heading: 'Importance of Photosynthesis', body: `Photosynthesis is vital for life on Earth for several reasons:\n\n1. Food Production — It is the foundation of almost all food chains. Plants make food which feeds herbivores, which in turn feed carnivores.\n2. Oxygen Production — It replenishes the oxygen in our atmosphere that we breathe.\n3. Carbon Dioxide Removal — It removes CO₂ from the atmosphere, helping regulate the climate and reducing the greenhouse effect.\n4. Fossil Fuels — Coal, petroleum and natural gas are stored forms of solar energy captured by ancient plants through photosynthesis millions of years ago.` }
        ]
      },
      'agricultural implements': {
        slides: [
          { heading: 'What are Agricultural Implements?', body: `Agricultural implements are tools, equipment and machines used by farmers to perform various operations in farming. These implements make farm work easier, faster and more efficient. From ancient times, farmers have used simple tools like ploughs and sickles. Today, modern machines like tractors and harvesters have transformed agriculture.` },
          { heading: 'Classification of Agricultural Implements', body: `Agricultural implements are broadly classified based on the type of farm operation they perform:\n\n1. Tillage Implements — Used for ploughing and preparing the soil (e.g., Plough, Harrow, Cultivator)\n2. Sowing Implements — Used to plant seeds in the soil (e.g., Seed Drill)\n3. Irrigation Implements — Used for watering crops (e.g., Pumps, Sprinklers)\n4. Harvesting Implements — Used to cut and collect mature crops (e.g., Sickle, Combine Harvester)\n5. Threshing Implements — Used to separate grain from the harvested plant (e.g., Thresher)` },
          { heading: 'Traditional Tillage Implements', body: `Traditional implements used for tilling (preparing) the soil include:\n\n1. Plough (Hala) — The most ancient tool. Used to loosen and turn over the topsoil before sowing. Made of wood or iron. Animal-drawn ploughs are still used in many Indian villages.\n2. Hoe — A simple tool used for removing weeds and loosening the soil between plants.\n3. Cultivator — A blade-fitted implement drawn by bullocks or tractors to break up clods, remove weeds, and aerate the soil.` },
          { heading: 'Modern Agricultural Machinery', body: `Modern implements powered by engines and tractors have revolutionised farming:\n\n1. Tractor — The main power unit on modern farms. It pulls or drives all other implements.\n2. Seed Drill — Sows seeds at uniform depth and spacing, improving germination rates and saving seed.\n3. Combine Harvester — Performs reaping, threshing and winnowing in a single machine pass over the field.\n4. Power Tiller — A two-wheeled tractor used for small farms and hilly terrains.\n5. Sprinkler System — Sprays water over crops like rainfall, saving water compared to flood irrigation.` },
          { heading: 'Sowing and Irrigation Implements', body: `Proper sowing and irrigation are crucial for crop success:\n\nSowing Implements:\n• Traditional Seed Drill — Wooden or iron tube attached behind a plough to drop seeds as soil is tilled.\n• Modern Seed Drill — Mechanised, attached to a tractor, sows seeds at precise depth and spacing.\n\nIrrigation Implements:\n• Persian Wheel (Rahat) — Animal-powered water-lifting device used in northern India.\n• Pump Sets — Electric or diesel pumps that lift water from wells or rivers to irrigate fields.\n• Drip Irrigation System — Delivers water directly to plant roots through pipes, saving up to 60% water.` },
          { heading: 'Harvesting and Post-Harvest Implements', body: `Harvesting and processing crops requires specific implements:\n\nHarvesting:\n• Sickle — A C-shaped blade on a wooden handle. The most common hand tool for cutting grain crops like wheat and rice.\n• Reaper — A machine that cuts standing crops and lays them in rows for collection.\n\nPost-Harvest:\n• Thresher — Separates grain from the stalk and husk.\n• Winnowing Fan — A flat tray used to separate lighter husk from grain by throwing it in the air.\n• Combine Harvester — Does reaping, threshing and winnowing all at once, saving time and labour.` }
        ]
      }
    };

    // Find matching topic knowledge
    for (const key of Object.keys(topicKnowledge)) {
      if (topicLower.includes(key) || key.includes(topicLower.split(' ')[0])) {
        const knowledge = topicKnowledge[key];
        return knowledge.slides.map((s, i) => ({
          slideNumber: i + 1,
          heading: s.heading,
          content: s.body,
          type: i === 0 ? 'intro' : i === knowledge.slides.length - 1 ? 'summary' : 'theory'
        }));
      }
    }

    // Generic theory slides for any topic
    return [
      {
        slideNumber: 1, type: 'intro',
        heading: `Introduction to ${topicName}`,
        content: `${topicName} is an important concept studied in Class ${grade} ${sub}. It is part of the standard NCERT curriculum and forms the foundation for understanding advanced topics in the subject. This topic helps students connect theoretical knowledge with real-world observations and applications. Mastering ${topicName} is essential for board examinations and higher education in the field of ${sub}.`
      },
      {
        slideNumber: 2, type: 'theory',
        heading: `Definition and Meaning of ${topicName}`,
        content: `${topicName} can be defined as a fundamental concept in ${sub} that explains how certain processes or phenomena occur in nature or in scientific contexts. The term originates from scientific study and observation. At the Class ${grade} level, students are introduced to the basic principles of ${topicName} as described in the NCERT textbook, building a clear conceptual understanding before moving to advanced applications.`
      },
      {
        slideNumber: 3, type: 'theory',
        heading: `Core Theory of ${topicName}`,
        content: `The theoretical framework of ${topicName} involves several interconnected principles:\n\n1. The concept operates based on fundamental laws of ${sub}.\n2. Key variables and factors influence how ${topicName} behaves under different conditions.\n3. Scientific observations and experiments have established the accepted theory over time.\n4. NCERT describes ${topicName} using clear definitions, diagrams, and step-by-step explanations suitable for Class ${grade} students.\n\nUnderstanding these principles forms the core of this chapter.`
      },
      {
        slideNumber: 4, type: 'theory',
        heading: `Types and Classification`,
        content: `${topicName} can be classified into different categories based on characteristics, properties, or the nature of the process:\n\n1. Primary Category — The most fundamental form studied at this level.\n2. Secondary Category — Variations or subcategories with distinct properties.\n3. Applied Category — How the concept is applied in practical, real-world contexts.\n\nThe NCERT textbook for Class ${grade} ${sub} covers each of these categories with examples and diagrams that help students visualise the differences clearly.`
      },
      {
        slideNumber: 5, type: 'theory',
        heading: `Importance and Applications`,
        content: `${topicName} plays a significant role in both nature and human life:\n\n1. Scientific Importance — It explains natural phenomena observed in the environment.\n2. Technological Applications — Understanding ${topicName} has led to practical inventions and innovations.\n3. Environmental Significance — It has a direct or indirect impact on ecosystems and living organisms.\n4. Economic Value — Industries and agriculture benefit from knowledge of ${topicName}.\n5. Educational Importance — It provides the conceptual base for advanced topics in Class ${grade + 1} and beyond.`
      },
      {
        slideNumber: 6, type: 'summary',
        heading: `Summary and Review`,
        content: `Key takeaways from today's lesson on ${topicName}:\n\n✓ ${topicName} is a core concept in Class ${grade} ${sub} (NCERT).\n✓ It is defined by its fundamental properties and scientific principles.\n✓ It can be classified into different types based on its characteristics.\n✓ It has important applications in science, technology and everyday life.\n✓ Understanding ${topicName} thoroughly is essential for board exams.\n\nRevision tip: Re-read the NCERT chapter, draw diagrams from memory, and practice the chapter-end questions to solidify your understanding.`
      }
    ];
  };

  // ── Try AI first (5s timeout, no blocking retry) ──────────────────────────
  const slidesPrompt = `You are a VIDYA AI teacher for Indian schools (NCERT curriculum). Generate exactly 6 theory-only classroom lecture slides for the following:

Topic: "${actualTopic}"
Subject: "${actualSubject}"
Chapter: "${actualChapter}"
Class Level: Class ${cl}
Language: ${langName}

STRICT RULES:
1. ALL content MUST be in ${langName} language.
2. ONLY pure theory content — no random facts, no activities, no jokes.
3. Follow NCERT Class ${cl} curriculum structure exactly.
4. Each slide must be self-contained and educational.
5. Slide types must follow: intro → definition → core_theory → types → importance → summary

Return ONLY valid JSON (no markdown, no ticks):
{
  "slides": [
    { "slideNumber": 1, "type": "intro", "heading": "heading in ${langName}", "content": "3-5 sentences of pure theory in ${langName}" },
    { "slideNumber": 2, "type": "definition", "heading": "heading in ${langName}", "content": "3-5 sentences in ${langName}" },
    { "slideNumber": 3, "type": "core_theory", "heading": "heading in ${langName}", "content": "4-6 sentences in ${langName}" },
    { "slideNumber": 4, "type": "types", "heading": "heading in ${langName}", "content": "4-6 sentences listing types/classification in ${langName}" },
    { "slideNumber": 5, "type": "importance", "heading": "heading in ${langName}", "content": "3-5 sentences on importance/applications in ${langName}" },
    { "slideNumber": 6, "type": "summary", "heading": "heading in ${langName}", "content": "Summary with 5 key bullet points in ${langName}" }
  ]
}`;

  const aiResp = await queryLLMChain(`VoiceSlides:${actualTopic}:${langName}`, slidesPrompt, 5000);
  if (aiResp) {
    try {
      let clean = aiResp.text.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      const parsed = JSON.parse(clean.trim());
      if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length >= 4) {
        return res.json({ success: true, provider: aiResp.provider, topic: actualTopic, slides: parsed.slides });
      }
    } catch (e) {
      console.error('Failed to parse slides from AI:', e.message);
    }
  }

  // ── Rich fallback slides (with translation if needed) ────────────────────
  const fallbackSlides = buildFallbackSlides(actualTopic, cl, actualSubject, lang);

  // Language code map for MyMemory API
  const MY_MEMORY_LANG_MAP = {
    hi: 'hi', mr: 'mr', bn: 'bn', ta: 'ta', te: 'te',
    kn: 'kn', ml: 'ml', gu: 'gu', pa: 'pa', ur: 'ur',
    or: 'or', as: 'as', sa: 'sa', ne: 'ne', sd: 'sd',
    kok: 'kok', mai: 'hi', doi: 'hi', brx: 'bn', ks: 'ur', mni: 'bn'
  };

  // Only translate if language is not English
  if (lang !== 'en' && MY_MEMORY_LANG_MAP[lang]) {
    const targetLang = MY_MEMORY_LANG_MAP[lang];

    const translateText = async (text) => {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}&de=vidyaai@education.in`;
        const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const d = await r.json();
        if (d.responseStatus === 200 && d.responseData?.translatedText) {
          return d.responseData.translatedText;
        }
        return text;
      } catch {
        return text;
      }
    };

    try {
      console.log(`Translating ${fallbackSlides.length} slides to ${langName} sequentially...`);
      const translatedSlides = [];
      for (const slide of fallbackSlides) {
        try {
          const combined = `${slide.heading} | ${slide.content}`;
          const translated = await translateText(combined);
          const parts = translated.split('|');
          const tHeading = parts[0]?.trim() || slide.heading;
          const tContent = parts.slice(1).join('|').trim() || slide.content;
          translatedSlides.push({ ...slide, heading: tHeading, content: tContent });
        } catch {
          translatedSlides.push(slide);
        }
        await new Promise(r => setTimeout(r, 150)); // 150ms delay to avoid rate limit
      }
      console.log(`Translation to ${langName} complete.`);
      return res.json({
        success: true,
        provider: 'local_fallback_translated',
        topic: actualTopic,
        slides: translatedSlides
      });
    } catch (e) {
      console.error('Translation failed, returning English fallback:', e.message);
    }
  }

  res.json({
    success: true,
    provider: 'local_fallback',
    topic: actualTopic,
    slides: fallbackSlides
  });
});


// Redundant first practice questions endpoint removed to consolidate logic in the active endpoint below.

// 4. Feynman Socratic Discussion
app.post('/api/learning/feynman/start', authenticateToken, (req, res) => {
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

app.post('/api/learning/feynman/respond', authenticateToken, async (req, res) => {
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
app.post('/api/learning/debate/respond', authenticateToken, async (req, res) => {
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
app.post('/api/learning/debate/generate-topic', authenticateToken, async (req, res) => {
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
app.post('/api/teachers/lesson-planner', authenticateToken, requireTeacherRole, async (req, res) => {
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
app.post('/api/teachers/assistant', authenticateToken, requireTeacherRole, async (req, res) => {
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
// 📝 PRACTICE QUESTIONS ENDPOINT (MULTILINGUAL & ADAPTIVE)
// ----------------------------------------------------
// ── UNIQUE QUESTION ARCHITECTURE HISTORY REGISTRY ──────────────────────────
const globalQuestionHistory = []; // Array of { question: string, topic: string, difficulty: string, timestamp: number }

function calculateJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const getWords = (str) => {
    return new Set(
      str.toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep alphanumeric and Devanagari script characters
        .split(/\s+/)
        .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'what', 'which', 'their', 'from', 'this', 'that', 'these', 'those'].includes(w))
    );
  };
  const set1 = getWords(str1);
  const set2 = getWords(str2);
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// ----------------------------------------------------
// 📝 PRACTICE QUESTIONS ENDPOINT (MULTILINGUAL, UNIQUE & ADAPTIVE)
// ----------------------------------------------------
app.post('/api/learning/practice/questions', authenticateToken, async (req, res) => {
  const { topic, language, classLevel, subject, chapter, difficulty, numQuestions, questionCount, previousQuestions, sessionUuid } = req.body;

  const cl = classLevel || 8;
  const lang = language || 'en';
  const langName = LANG_NAMES[lang] || 'English';
  const actualTopic = topic || 'General Science';
  const actualSubject = subject || 'Science';
  const actualChapter = chapter || '';
  const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
  
  // Accept both questionCount (strict count control) and numQuestions
  const nq = Math.min(Math.max(parseInt(questionCount || numQuestions) || 8, 5), 20);

  console.log(`[UniqueQuiz Engine] Received request. Session: ${sessionUuid || 'N/A'}, Topic: ${actualTopic}, Class: ${cl}, Diff: ${diff}, Qs: ${nq}`);

  const diffDescriptions = {
    easy:   `Basic recall and definitions. \"What is\" and simple fact questions. Class ${cl} foundational level. One clearly correct answer.`,
    medium: `Application and understanding. \"Why/How\" type questions. Connect concepts. NCERT Class ${cl} standard level. Requires some reasoning.`,
    hard:   `Analysis, synthesis and HOTS (Higher Order Thinking Skills). Tricky distractors. Advanced Class ${cl} level. Requires deep understanding.`
  };

  const shuffleOptions = (options, correctLetter) => {
    const letters = ['A', 'B', 'C', 'D'];
    const prefixRegex = /^[A-D]\)\s*/i;
    const rawOptions = options.map(o => o.replace(prefixRegex, '').trim());
    const correctText = options.find(o => o.startsWith(correctLetter))?.replace(prefixRegex, '').trim() || correctLetter;

    const shuffled = [...rawOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let newCorrect = 'A';
    const newOptions = shuffled.map((o, idx) => {
      const letter = letters[idx];
      if (o === correctText) newCorrect = letter;
      return `${letter}) ${o}`;
    });

    return { options: newOptions, correctOption: newCorrect };
  };

  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randomSample = (arr, n) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };

  // Final prepared list of questions to return
  let preparedQuestions = [];
  let rejectedCount = 0;
  let hasLlmRun = false;
  let lastLlmProvider = null;

  // Split nq into batches of at most 8 to prevent token limits/truncation issues
  const batchSizes = [];
  let remaining = nq;
  while (remaining > 0) {
    const bSize = Math.min(remaining, 8);
    batchSizes.push(bSize);
    remaining -= bSize;
  }

  for (let b = 0; b < batchSizes.length; b++) {
    const currentBatchSize = batchSizes[b];
    
    // Accumulate exclusions: original history + questions prepared in previous batches
    const allExclusions = [
      ...(previousQuestions || []),
      ...preparedQuestions.map(q => q.question)
    ];

    const systemPrompt = `You are a NCERT curriculum practice question generator for Indian school students.

CRITICAL LANGUAGE INSTRUCTION: ALL question text, ALL option text, and ALL explanation text MUST be written ENTIRELY in ${langName}. Do NOT use English unless the selected language IS English. Use the native script (Devanagari for Hindi, Assamese script for Assamese, Tamil script for Tamil, Bengali script for Bengali, Telugu script for Telugu, etc.). This is MANDATORY — failure to use ${langName} script is unacceptable.

Generate EXACTLY ${currentBatchSize} unique practice questions on the topic "${actualTopic}" from NCERT Class ${cl} subject "${actualSubject}"${actualChapter ? `, chapter "${actualChapter}"` : ''}.

Difficulty Level: ${diff.toUpperCase()}
Difficulty Description: ${diffDescriptions[diff]}

${allExclusions.length > 0 ? `STRICT MEMORY EXCLUSION RULE:
Do NOT generate any of the following questions (avoid similar wording, concepts, or identical logic):
${allExclusions.map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}
Make sure all new questions are completely unique variations.` : ''}

Rules:
- Every single word of questions, options, explanations, and hints MUST be in ${langName}.
- Questions must be curriculum-accurate for Class ${cl} NCERT.
- Include a diverse mix of question types: at least ${Math.ceil(currentBatchSize * 0.4)} MCQ, at least ${Math.ceil(currentBatchSize * 0.2)} True/False ('tf'), at least ${Math.ceil(currentBatchSize * 0.1)} Fill-in-the-blanks ('fill'), and at least ${Math.ceil(currentBatchSize * 0.1)} Assertion-Reasoning ('ar').
- MCQ and Assertion-Reasoning ('ar') must have exactly 4 options labeled A), B), C), D).
- True/False ('tf') must have exactly 2 options: ["A) True", "B) False"] (or localized in ${langName}).
- Fill-in-the-blanks ('fill') must have options = [] (empty array) and correctOption must be the exact correct word or short phrase, and the question should contain a '___' placeholder.
- correctOption for MCQ, tf, and ar must be 'A', 'B', 'C', or 'D' (just the letter).
- Shuffling: Randomly shuffle which option is correct (do not always make A or B correct).
- No repeated questions or options.
- Add an 'explanation' field showing why the correct answer is right, including a 'chapterReference' (e.g. "Chapter 1, Page 4") and a 'quickRevisionNote' (a short memory tip for exams).
- For 'hard' difficulty: use scenario-based critical thinking and multi-step reasoning.

Return ONLY a valid JSON array of objects (no markdown, no extra text, no code fences):
[
  {
    "questionNumber": 1,
    "type": "mcq",
    "question": "Question text entirely in ${langName}",
    "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
    "correctOption": "C",
    "explanation": "Explanation in ${langName}",
    "chapterReference": "Chapter reference in ${langName}",
    "quickRevisionNote": "Revision note in ${langName}"
  }
]`;

    // Caching bypass key per batch
    const uniqueKey = `PracticeQ:${cl}:${actualSubject}:${actualTopic}:${lang}:${diff}:${currentBatchSize}:${b}:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;
    
    let llmResponse = null;
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        console.log(`[UniqueQuiz Engine] Batch ${b+1}/${batchSizes.length}: Querying LLM for ${currentBatchSize} questions (attempt ${attempts})...`);
        llmResponse = await queryLLMChain(uniqueKey, systemPrompt, 7000);
        if (llmResponse) {
          let cleanText = llmResponse.text.trim();
          if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
          if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
          if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
          const parsed = JSON.parse(cleanText.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            break;
          }
        }
      } catch (err) {
        console.warn(`[UniqueQuiz Engine] Batch ${b+1} attempt ${attempts} failed:`, err.message);
        llmResponse = null;
      }
    }

    if (llmResponse) {
      hasLlmRun = true;
      lastLlmProvider = llmResponse.provider;
      try {
        let cleanText = llmResponse.text.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        const parsed = JSON.parse(cleanText.trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[UniqueQuiz Engine] Batch ${b+1} returned ${parsed.length} raw questions.`);
          for (const qItem of parsed) {
            let isDuplicate = false;
            
            // Check already prepared in this request
            for (const prepQ of preparedQuestions) {
              if (calculateJaccardSimilarity(qItem.question, prepQ.question) > 0.35) {
                isDuplicate = true;
                break;
              }
            }
            // Check session history
            if (!isDuplicate) {
              for (const pastQ of previousQuestions || []) {
                if (calculateJaccardSimilarity(qItem.question, pastQ) > 0.35) {
                  isDuplicate = true;
                  break;
                }
              }
            }
            // Check global history
            if (!isDuplicate) {
              for (const entry of globalQuestionHistory) {
                if (calculateJaccardSimilarity(qItem.question, entry.question) > 0.35) {
                  isDuplicate = true;
                  break;
                }
              }
            }

            if (isDuplicate) {
              rejectedCount++;
              console.log(`[UniqueQuiz Engine] Duplicate rejected: "${qItem.question}"`);
            } else {
              let processedQ = { ...qItem };
              if (processedQ.type === 'mcq' || processedQ.type === 'ar' || processedQ.type === 'tf') {
                const sh = shuffleOptions(processedQ.options, processedQ.correctOption);
                processedQ.options = sh.options;
                processedQ.correctOption = sh.correctOption;
              }
              preparedQuestions.push(processedQ);
              globalQuestionHistory.push({
                question: processedQ.question,
                topic: actualTopic,
                difficulty: diff,
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (e) {
        console.error(`[UniqueQuiz Engine] Failed to parse batch ${b+1} LLM response:`, e.message);
      }
    }
  }

  const buildDynamicFallbackQs = (topic, subject, classLevel, difficultyLevel) => {
    const tLower = topic.toLowerCase();
    const cl = classLevel || 8;
    const s = subject || 'Science';

    const implementsDistractors = [
      'Combine harvester in manual mode',
      'Thresher drawn by hand',
      'Sickle used for sowing seeds',
      'Manually adding chemical salts',
      'Waterlogging the fields daily',
      'Sprinkling pesticides over roots',
      'Harvesting standing grain with a shovel',
      'Ploughing the field with a thresher',
      'Sowing seeds at unequal depth by hand',
      'Pesticide application drone'
    ];

    const photosynthesisDistractors = [
      'Breakdown of glucose for energy',
      'Absorption of minerals from soil',
      'Gas exchange through roots',
      'Releasing carbon dioxide into the soil',
      'Transporting starch to the petals',
      'Storing water in the bark',
      'Producing nitrogen gas',
      'Absorbing oxygen through the stomata',
      'Breaking down chlorophyll',
      'Generating ATP in complete darkness'
    ];

    const questionsList = [];

    if (tLower.includes('agricultural') || tLower.includes('implement') || tLower.includes('crop') || tLower.includes('farm')) {
      const subtopics = [
        {
          name: 'traditional ploughing tools',
          easy: [
            () => {
              const action = randomChoice(['loosen and turn', 'prepare and tilt', 'churn and aerate']);
              const correct = randomChoice(['Plough (Hala)', 'Wooden Plough', 'Hoe (Kudali)']);
              const distracts = randomSample(implementsDistractors, 3);
              return {
                type: 'mcq',
                question: `Which traditional tool is most commonly used to ${action} the soil?`,
                options: [`A) ${correct}`, `B) ${distracts[0]}`, `C) ${distracts[1]}`, `D) ${distracts[2]}`],
                correctOption: 'A',
                explanation: `A traditional plough is used to tilt and ${action} the soil, allowing plant roots to breathe.`,
                chapterReference: 'Chapter 1, Page 3',
                quickRevisionNote: 'Ploughing = Soil aeration & prep.'
              };
            },
            () => ({
              type: 'tf',
              question: 'A hoe is a simple tool that is traditionally used for removing weeds and loosening the soil.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'A hoe consists of a long rod of wood or iron with a strong, broad bent plate of iron fixed to one of its ends, acting like a blade.',
              chapterReference: 'Chapter 1, Page 3',
              quickRevisionNote: 'Hoe = weeding & loosening.'
            })
          ],
          medium: [
            () => {
              const reason = randomChoice([
                'cost-effective and easily crafted locally by village carpenters',
                'lightweight and easily pulled by native bullocks',
                'efficient for shallow aeration in small plots'
              ]);
              return {
                type: 'ar',
                question: `Assertion: Traditional wooden ploughs are still widely used by small-scale farmers in India. Reason: Wooden ploughs are ${reason}.`,
                options: [
                  'A) Both A and R are true and R is the correct explanation of A',
                  'B) Both A and R are true but R is not the correct explanation of A',
                  'C) A is true but R is false',
                  'D) A is false but R is true'
                ],
                correctOption: 'A',
                explanation: `Wooden ploughs are inexpensive, made of local wood and iron, and easily drawn by pair of bulls. Both statements are true and related.`,
                chapterReference: 'Chapter 1, Page 3',
                quickRevisionNote: 'Wooden Plough = Affordable for smallholder farmers.'
              };
            },
            () => ({
              type: 'mcq',
              question: 'What is the wooden log called that is placed on the bulls necks when pulling a traditional plough?',
              options: ['A) Beam', 'B) Ploughshaft', 'C) Ploughshare', 'D) Hoe blade'],
              correctOption: 'A',
              explanation: 'The beam is the part of the plough placed on the bulls necks. The long wooden part is the ploughshaft, and the iron tip is the ploughshare.',
              chapterReference: 'Chapter 1, Page 3',
              quickRevisionNote: 'Beam = neck log; Ploughshaft = body; Ploughshare = iron tip.'
            })
          ],
          hard: [
            () => {
              const cropType = randomChoice(['monsoon wheat', 'dry-season gram', 'paddy fields']);
              return {
                type: 'mcq',
                question: `A smallholder farmer in an arid region wants to cultivate ${cropType} but has no access to tractors. To prepare the soil while retaining subsoil moisture, which implement sequence should they use?`,
                options: [
                  'A) A wooden plough followed by a leveling board to trap moisture',
                  'B) Deep tractor cultivation with zero compaction',
                  'C) Sprinkling chemical salts to dry the crumbs',
                  'D) Sowing directly using an electric combine harvester'
                ],
                correctOption: 'A',
                explanation: `Ploughing loosens the soil, and immediate leveling breaks crumbs and seals the surface to prevent moisture evaporation.`,
                chapterReference: 'Chapter 1, Page 4',
                quickRevisionNote: 'Leveling = Soil moisture conservation.'
              };
            },
            () => ({
              type: 'mcq',
              question: 'Why does a traditional wooden plough feature an iron-tipped ploughshare instead of pure wood for tilling hard-packed clay soils?',
              options: [
                'A) To resist wear and penetrate dense soil crusts effectively',
                'B) To conduct soil electricity to dry roots',
                'C) To chemical fertilize the soil naturally',
                'D) To lightweight the tool for easy carriage'
              ],
              correctOption: 'A',
              explanation: 'The ploughshare is the strong triangular iron strip. Wood would splinter or wear down quickly under the friction of clay tilling.',
              chapterReference: 'Chapter 1, Page 3',
              quickRevisionNote: 'Ploughshare is iron-tipped for durability.'
            }),
            () => ({
              type: 'ar',
              question: 'Assertion: Manual tilling using a hoe is highly preferred for clearing weeds in closely spaced vegetable rows. Reason: A large tractor cultivator would damage crop root systems due to bulk spacing constraints.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Manual weeding tools are precise and prevent collateral damage to delicate crops where machine tires cannot fit.',
              chapterReference: 'Chapter 1, Page 3',
              quickRevisionNote: 'Hoe = high precision weeding.'
            })
          ]
        },
        {
          name: 'modern seed drill machinery',
          easy: [
            () => ({
              type: 'tf',
              question: 'A modern seed drill is attached to tractors to sow seeds at uniform distance and depth.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'Seed drills save time and protect seeds from being eaten by birds by covering them with soil.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Seed Drill = Uniform sowing & depth.'
            }),
            () => ({
              type: 'fill',
              question: 'The traditional tool for sowing seeds is shaped like a ___ and is filled with seeds.',
              options: [],
              correctOption: 'funnel',
              explanation: 'The traditional tool has a funnel-like top where seeds are passed down through two or three pipes with sharp ends.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Traditional sowing = funnel tool.'
            })
          ],
          medium: [
            () => {
              const benefit = randomChoice(['saves labor and time', 'protects seeds from birds', 'prevents overcrowding of plants']);
              return {
                type: 'mcq',
                question: `Why is using a tractor-drawn seed drill preferred over manual broadcasting (throwing seeds by hand)?`,
                options: [
                  `A) It ${benefit} by maintaining uniform distance`,
                  'B) It automatically harvests the crops',
                  'C) It destroys soil nutrients to kill pests',
                  'D) It requires no tractor power at all'
                ],
                correctOption: 'A',
                explanation: 'Broadcasting results in uneven distribution and leaves seeds exposed. Seed drills cover them and distribute them evenly.',
                chapterReference: 'Chapter 1, Page 4',
                quickRevisionNote: 'Seed drill prevents overcrowding.'
              };
            },
            () => ({
              type: 'tf',
              question: 'Broadcasting seeds manually ensures that all seeds are covered with soil to protect them from birds.',
              options: ['A) True', 'B) False'],
              correctOption: 'B',
              explanation: 'Manual broadcasting leaves many seeds on the soil surface, exposing them to birds and dry heat.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Broadcasting = poor soil coverage.'
            })
          ],
          hard: [
            () => ({
              type: 'ar',
              question: 'Assertion: Overcrowding of plants during sowing reduces crop yield. Reason: Overcrowded plants compete intensely for sunlight, nutrients, and water.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'To prevent competition, seeds must be sown at uniform distances so each plant receives sufficient nutrients and light.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Overcrowding = Nutrient stress.'
            }),
            () => ({
              type: 'mcq',
              question: 'How does a tractor-drawn modern seed drill prevent bird damage to newly sown wheat seeds?',
              options: [
                'A) By covering the seeds with soil immediately after deposition',
                'B) By emitting a high-frequency scarecrow sound',
                'C) By mixing seed coats with bird-repelling chemical toxins',
                'D) By planting the seeds deep in groundwater levels'
              ],
              correctOption: 'A',
              explanation: 'The seed drill has tubes that deposit seeds and trailing parts that immediately cover them with loose soil.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Covering seeds protects from birds.'
            }),
            () => ({
              type: 'mcq',
              question: 'In a agricultural trial comparing broadcasting with seed drill sowing, why did the seed drill group exhibit a 40% higher germination rate?',
              options: [
                'A) Consistent soil depth and uniform moisture contact',
                'B) The seed drill injects growth hormones into the seed coat',
                'C) Seed drills attract solar energy to heat the soil',
                'D) Seed drills prevent the growth of all weeds automatically'
              ],
              correctOption: 'A',
              explanation: 'Uniform depth guarantees that seeds remain in the moist root zone without drying out on the surface.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Depth consistency = higher germination.'
            })
          ]
        },
        {
          name: 'irrigation systems',
          easy: [
            () => ({
              type: 'fill',
              question: 'The modern method of irrigation that delivers water drop-by-drop at the base of roots is called ___ irrigation.',
              options: [],
              correctOption: 'Drip',
              explanation: 'Drip irrigation delivers water directly to root zones, minimizing evaporation.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Drip = Drop-by-drop at roots.'
            }),
            () => ({
              type: 'mcq',
              question: 'Which of the following is a traditional method of irrigation?',
              options: ['A) Moat (Pulley system)', 'B) Drip system', 'C) Sprinkler system', 'D) Central pivot system'],
              correctOption: 'A',
              explanation: 'Moat, Chain pump, Dhekli, and Rahat are traditional, cheaper but less efficient irrigation systems.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Moat = traditional pulley.'
            })
          ],
          medium: [
            () => {
              const soilType = randomChoice(['sandy soil', 'loamy soil', 'clayey soil']);
              return {
                type: 'mcq',
                question: `Which irrigation system is highly recommended for watering crops in ${soilType} where water availability is very poor?`,
                options: [
                  'A) Drip irrigation system',
                  'B) Traditional moat pulley system',
                  'C) Regular manual flooding',
                  'D) Persian wheel (Rahat)'
                ],
                correctOption: 'A',
                explanation: 'Drip systems are water-efficient and ideal for arid zones and sandy soils with low water retention.',
                chapterReference: 'Chapter 1, Page 5',
                quickRevisionNote: 'Sandy/Arid irrigation = Drip.'
              };
            },
            () => ({
              type: 'tf',
              question: 'Sprinkler irrigation is best suited for sandy soil because it has low water-retaining capacity.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'On sandy soils, water runs off or sinks too fast. Sprinklers apply water slowly like rain, allowing absorption.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Sprinkler = suitable for sandy soil.'
            })
          ],
          hard: [
            () => ({
              type: 'ar',
              question: 'Assertion: Sprinkler irrigation is highly effective on uneven land surfaces. Reason: Sprinklers mimic natural rain and do not require level fields.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Sprinkler pipes spray water over uneven topography efficiently without leveling costs.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Sprinklers = Uneven land irrigation.'
            }),
            () => ({
              type: 'mcq',
              question: 'Why is the traditional pulley system (Moat) unsuitable for large-scale modern commercial farming of high-yield crops?',
              options: [
                'A) It is extremely slow, labor-intensive, and provides highly uneven water distribution',
                'B) It alters the chemical composition of groundwater',
                'C) It is banned by environmental protection laws in India',
                'D) It requires expensive solar panels to run'
              ],
              correctOption: 'A',
              explanation: 'Traditional systems use cattle or human labor, lifting limited volumes of water, which is insufficient for large acreages.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Moat = low capacity pulley system.'
            }),
            () => ({
              type: 'mcq',
              question: 'How does drip irrigation prevent weed growth compared to standard flood irrigation methods?',
              options: [
                'A) By confining water delivery to the crop root base, leaving surrounding soil dry',
                'B) By mixing weed-killer chemicals directly into the water supply',
                'C) By boiling the water before application to sterilize seeds',
                'D) By blocking sunlight with black rubber hoses'
              ],
              correctOption: 'A',
              explanation: 'Weed seeds in dry zones between rows fail to germinate due to lack of moisture, whereas flooding waters the entire field surface.',
              chapterReference: 'Chapter 1, Page 6',
              quickRevisionNote: 'Targeted watering limits weeds.'
            })
          ]
        },
        {
          name: 'harvesting and winnowing',
          easy: [
            () => ({
              type: 'mcq',
              question: 'Which simple tool is traditionally used in India for manual harvesting of standing grain crops?',
              options: ['A) Sickle (Daranti)', 'B) Plough', 'C) Seed Drill', 'D) Sprinkler Pipe'],
              correctOption: 'A',
              explanation: 'A sickle is a curved metal hand-tool used widely for traditional harvesting.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Sickle = Manual harvesting.'
            }),
            () => ({
              type: 'fill',
              question: 'The process of separating the grain from the harvested crop is called ___.',
              options: [],
              correctOption: 'threshing',
              explanation: 'Threshing is the process of loosening the edible part of grain from the scaly chaff.',
              chapterReference: 'Chapter 1, Page 6',
              quickRevisionNote: 'Separation = threshing.'
            })
          ],
          medium: [
            () => ({
              type: 'mcq',
              question: 'What is the process of separating grain seeds from the harvested chaff called?',
              options: ['A) Threshing', 'B) Irrigation', 'C) Weeding', 'D) Ploughing'],
              correctOption: 'A',
              explanation: 'Threshing separates grains from chaff, often assisted by machines in modern times.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Grain separation = Threshing.'
            }),
            () => ({
              type: 'tf',
              question: 'Winnowing is a process used by farmers with small holdings of land to separate grain and chaff.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'Farmers with small lands use wind winnowing machines or manual dropping in wind to blow away lighter chaff.',
              chapterReference: 'Chapter 1, Page 6',
              quickRevisionNote: 'Winnowing = wind chaff separation.'
            })
          ],
          hard: [
            () => ({
              type: 'ar',
              question: 'Assertion: Combine harvesters are highly favored by commercial grain farmers. Reason: Combine harvesters combine reaping, threshing, and winnowing into a single tractor-drawn operation.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Combine harvesters increase productivity by executing three harvest steps in one machine operation.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Combine = Reap + Thresh + Winnow.'
            }),
            () => ({
              type: 'mcq',
              question: 'Which mechanical process is specifically designed to separate the grain from the harvested chaff by utilizing differences in weight and wind currents?',
              options: [
                'A) Winnowing',
                'B) Ploughing',
                'C) Leveling',
                'D) Broadcasting'
              ],
              correctOption: 'A',
              explanation: 'Winnowing lets heavier grains fall straight down while the lighter chaff is blown away by the wind.',
              chapterReference: 'Chapter 1, Page 6',
              quickRevisionNote: 'Winnowing uses wind and gravity.'
            }),
            () => ({
              type: 'mcq',
              question: 'What is the key functional difference between a standalone thresher and a combine harvester?',
              options: [
                'A) A thresher only separates grain from husk, while a combine also cuts (reaps) the standing crop',
                'B) A thresher is pulled by bullocks, while a combine is solar-powered',
                'C) A thresher is used for irrigation, while a combine is used for sowing',
                'D) A thresher is organic, while a combine harvester uses chemicals'
              ],
              correctOption: 'A',
              explanation: 'A combine harvester integrates three processes: reaping, threshing, and winnowing, whereas a thresher requires the crop to be pre-cut.',
              chapterReference: 'Chapter 1, Page 6',
              quickRevisionNote: 'Combine = reaper + thresher.'
            })
          ]
        },
        {
          name: 'fertilizers and manure',
          easy: [
            () => ({
              type: 'mcq',
              question: 'Which of the following organic substances is prepared directly in fields by decomposing plant and animal waste?',
              options: ['A) Manure', 'B) Urea', 'C) Superphosphate', 'D) NPK Fertilizer'],
              correctOption: 'A',
              explanation: 'Manure is prepared naturally in fields through microbial decomposition of biological waste.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Manure = Natural field-made.'
            }),
            () => ({
              type: 'tf',
              question: 'Manure provides a lot of organic matter (humus) to the soil.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'Manure is organic and decomposes to enrich the soil texture with biological humus.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Manure adds humus.'
            })
          ],
          medium: [
            () => ({
              type: 'tf',
              question: 'Chemical fertilizers replenish organic matter (humus) to improve soil physical texture.',
              options: ['A) True', 'B) False'],
              correctOption: 'B',
              explanation: 'Fertilizers are inorganic chemical salts. They do not add humus; only natural manure adds humus to the soil.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Fertilizers do not add humus.'
            }),
            () => ({
              type: 'mcq',
              question: 'Which chemical element is NOT primarily supplied by NPK fertilizers?',
              options: ['A) Calcium', 'B) Nitrogen', 'C) Phosphorus', 'D) Potassium'],
              correctOption: 'A',
              explanation: 'NPK stands for Nitrogen (N), Phosphorus (P), and Potassium (K).',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'NPK = Nitrogen, Phosphorus, Potassium.'
            })
          ],
          hard: [
            () => ({
              type: 'mcq',
              question: 'What is the primary ecological drawback of using excessive chemical fertilizers over organic manures?',
              options: [
                'A) They alter soil pH and destroy natural soil micro-organisms',
                'B) They cause crop stems to grow too tall to stand',
                'C) They attract weed seeds to germinate',
                'D) They increase soil moisture too rapidly'
              ],
              correctOption: 'A',
              explanation: 'NPK salts degrade soil health over time by destroying natural soil biomes and altering acidity.',
              chapterReference: 'Chapter 1, Page 4',
              quickRevisionNote: 'Excess fertilizer destroys soil biome.'
            }),
            () => ({
              type: 'mcq',
              question: 'Why does composted manure improve sandy soil water-holding capacity, whereas chemical urea fails to do so?',
              options: [
                'A) Manure adds organic humus that acts like a sponge to bind soil particles',
                'B) Urea chemical components evaporate water instantly',
                'C) Manure prevents sunlight from heating the sand',
                'D) Urea changes water molecules into gas'
              ],
              correctOption: 'A',
              explanation: 'Humus coats sand grains, creating aggregates that trap and hold water film, while soluble fertilizers simply wash away.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Humus acts as a sponge.'
            }),
            () => ({
              type: 'ar',
              question: 'Assertion: Crop rotation using leguminous plants reduces the demand for chemical nitrogenous fertilizers. Reason: Rhizobium bacteria in root nodules fix atmospheric nitrogen directly into the soil.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Legumes associate symbiotically with Rhizobium, which restores nitrogen naturally, replacing synthetic chemical needs.',
              chapterReference: 'Chapter 1, Page 5',
              quickRevisionNote: 'Legumes rotate to add nitrogen.'
            })
          ]
        }
      ];

      const difficultiesOrder = [difficultyLevel, ...['easy', 'medium', 'hard'].filter(d => d !== difficultyLevel)];
      for (const diffVal of difficultiesOrder) {
        for (const sub of subtopics) {
          const creators = sub[diffVal];
          if (Array.isArray(creators)) {
            creators.forEach(c => questionsList.push(c()));
          } else if (typeof creators === 'function') {
            questionsList.push(creators());
          }
        }
      }
    }

    else if (tLower.includes('photosynthesis') || tLower.includes('photo')) {
      const subtopics = [
        {
          name: 'chlorophyll pigment',
          easy: [
            () => ({
              type: 'tf',
              question: 'Chlorophyll is the green pigment in leaves that absorbs solar energy.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'Chlorophyll captures solar energy to split water molecules during photosynthesis.',
              chapterReference: 'Chapter 13, Page 211',
              quickRevisionNote: 'Chlorophyll = Green light-absorber.'
            }),
            () => ({
              type: 'fill',
              question: 'The green pigment present in leaf cells that traps sunlight is ___.',
              options: [],
              correctOption: 'chlorophyll',
              explanation: 'Chlorophyll is found inside chloroplasts and absorbs blue and red light.',
              chapterReference: 'Chapter 13, Page 211',
              quickRevisionNote: 'Chlorophyll = light trap.'
            })
          ],
          medium: [
            () => ({
              type: 'mcq',
              question: 'What is the primary function of chlorophyll inside chloroplasts during photosynthesis?',
              options: [
                'A) Absorbing light energy and converting it to chemical energy',
                'B) Absorbing carbon dioxide from air directly',
                'C) Storing glucose crystals',
                'D) Transporting water to mesophyll cells'
              ],
              correctOption: 'A',
              explanation: 'Chlorophyll acts as the photoreceptor that absorbs light wavelengths to excite electrons.',
              chapterReference: 'Chapter 13, Page 211',
              quickRevisionNote: 'Chlorophyll captures solar photons.'
            }),
            () => ({
              type: 'mcq',
              question: 'In which specific plant cell organelle is chlorophyll concentrated?',
              options: ['A) Chloroplast', 'B) Mitochondria', 'C) Nucleus', 'D) Cell Wall'],
              correctOption: 'A',
              explanation: 'Chloroplasts are the double-membrane plastids where the photosynthetic reactions take place.',
              chapterReference: 'Chapter 13, Page 211',
              quickRevisionNote: 'Chloroplast = reaction site.'
            })
          ],
          hard: [
            () => {
              const pigment = randomChoice(['chlorophyll a', 'chlorophyll b', 'carotenoids']);
              return {
                type: 'mcq',
                question: `In an experiment, leaves are illuminated only with green light. What happens to the action spectrum rate of photosynthesis compared to using blue-red wavelengths, considering the absorption properties of ${pigment}?`,
                options: [
                  'A) The rate drops to near zero because green light is reflected rather than absorbed',
                  'B) The rate increases exponentially',
                  'C) The rate remains steady',
                  'D) The leaves release nitrogen instead of oxygen'
                ],
                correctOption: 'A',
                explanation: 'Chlorophyll pigments reflect green wavelengths, which is why plants appear green. Green light is not absorbed, causing photosynthesis to stop.',
                chapterReference: 'Chapter 13, Page 212',
                quickRevisionNote: 'Green light reflected = zero photosynthesis.'
              };
            },
            () => ({
              type: 'mcq',
              question: 'Why do leaves of plants grown in iron-deficient soil exhibit chlorosis (yellowing) and a subsequent drop in photosynthetic output?',
              options: [
                'A) Iron is a crucial catalyst in chlorophyll biosynthesis',
                'B) Iron molecules act as the primary light absorbents',
                'C) Lack of iron blocks the stomatal gas pores directly',
                'D) Iron is needed to transport glucose down to the roots'
              ],
              correctOption: 'A',
              explanation: 'Iron is required for enzymes involved in chlorophyll synthesis, so deficiency stops pigment construction, causing yellowing.',
              chapterReference: 'Chapter 13, Page 213',
              quickRevisionNote: 'Iron deficiency limits chlorophyll.'
            }),
            () => ({
              type: 'ar',
              question: 'Assertion: Chlorophyll a is considered the primary photosynthetic pigment. Reason: It is the only pigment that can directly convert light energy into chemical energy in the reaction center.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Accessory pigments like chlorophyll b and carotenoids absorb other light colors and pass the energy to chlorophyll a.',
              chapterReference: 'Chapter 13, Page 211',
              quickRevisionNote: 'Chlorophyll a = primary reaction center.'
            })
          ]
        },
        {
          name: 'raw inputs',
          easy: [
            () => ({
              type: 'fill',
              question: 'The gas absorbed by plants from the atmosphere through stomata for photosynthesis is ___.',
              options: [],
              correctOption: 'Carbon Dioxide',
              explanation: 'Stomata open to absorb CO2 for the light-independent reactions (Calvin cycle).',
              chapterReference: 'Chapter 13, Page 210',
              quickRevisionNote: 'Absorbed Gas = CO2.'
            }),
            () => ({
              type: 'tf',
              question: 'Water is absorbed by the roots of the plant and transported to the leaves.',
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: 'Roots draw water and minerals from the soil and send them to the leaves via xylem vessels.',
              chapterReference: 'Chapter 13, Page 210',
              quickRevisionNote: 'Roots absorb water.'
            })
          ],
          medium: [
            () => ({
              type: 'ar',
              question: 'Assertion: Desert plants open stomata at night to take in carbon dioxide. Reason: Opening stomata during the hot day would lead to excessive water loss.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'Desert plants (CAM plants) close stomata during day to conserve water and store CO2 at night.',
              chapterReference: 'Chapter 13, Page 214',
              quickRevisionNote: 'CAM plants = stomata open at night.'
            }),
            () => ({
              type: 'mcq',
              question: 'Which vascular tissue in plants is responsible for transporting water from roots to leaves for photosynthesis?',
              options: ['A) Xylem', 'B) Phloem', 'C) Stomata', 'D) Epidermis'],
              correctOption: 'A',
              explanation: 'Xylem transports water and minerals, while Phloem distributes the synthesized sugars (food).',
              chapterReference: 'Chapter 13, Page 210',
              quickRevisionNote: 'Xylem = water; Phloem = food.'
            })
          ],
          hard: [
            () => ({
              type: 'mcq',
              question: 'If a plant is grown in an atmosphere rich in heavy oxygen isotope (O-18) in carbon dioxide, but normal water (H2O-16), what isotope will the released oxygen gas contain?',
              options: [
                'A) Normal oxygen (O-16) because released oxygen comes entirely from water splitting',
                'B) Heavy oxygen (O-18) because released oxygen comes from carbon dioxide',
                'C) A 50-50 mixture of both isotopes',
                'D) No oxygen will be released at all'
              ],
              correctOption: 'A',
              explanation: 'Photolysis of water at Photosystem II splits H2O molecules, which is the sole source of the oxygen gas released.',
              chapterReference: 'Chapter 13, Page 213',
              quickRevisionNote: 'Released O2 comes from water, not CO2.'
            }),
            () => ({
              type: 'mcq',
              question: 'Why does a water-stressed plant show a drastic reduction in carbon dioxide fixation rate even under bright sunlight?',
              options: [
                'A) Stomata close to prevent transpiration, which blocks CO2 from diffusing inside',
                'B) Sunlight cannot be absorbed by dry plant cell walls',
                'C) Water deficiency converts chlorophyll into carotene pigments',
                'D) Starch molecules evaporate rapidly under dehydration'
              ],
              correctOption: 'A',
              explanation: 'Stomatal closure is a protective mechanism that limits transpiration but cuts off CO2 raw material supply.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Stress closes stomata, stopping CO2.'
            }),
            () => ({
              type: 'ar',
              question: 'Assertion: Carbon dioxide concentration is a major limiting factor for photosynthesis in C3 plants on hot sunny days. Reason: High temperature causes stomatal closure, limiting internal CO2 supply.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'With closed stomata, C3 plants consume internal CO2 down to compensation points, stalling photosynthesis.',
              chapterReference: 'Chapter 13, Page 214',
              quickRevisionNote: 'Limiting factor = internal CO2 supply.'
            })
          ]
        },
        {
          name: 'stomata and gas exchange',
          easy: [
            () => ({
              type: 'fill',
              question: 'The tiny pores on the surface of leaves through which gas exchange occurs are called ___.',
              options: [],
              correctOption: 'Stomata',
              explanation: 'Stomata allow the diffusion of CO2 and water vapor, guarded by guard cells.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Pores = Stomata.'
            }),
            () => ({
              type: 'tf',
              question: 'Stomata are found in much larger quantities on the upper surface of land leaves compared to the lower surface.',
              options: ['A) True', 'B) False'],
              correctOption: 'B',
              explanation: 'To reduce water loss from direct sunlight, land plants have more stomata on the cooler lower epidermis.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Stomata concentration = higher below.'
            })
          ],
          medium: [
            () => ({
              type: 'mcq',
              question: 'Which specific leaf cells regulate the opening and closing of stomatal pores?',
              options: ['A) Guard cells', 'B) Mesophyll cells', 'C) Xylem vessels', 'D) Epidermal skin cells'],
              correctOption: 'A',
              explanation: 'Guard cells change shape when turgid, opening or closing the pore.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Regulation = Guard cells.'
            }),
            () => ({
              type: 'fill',
              question: 'When guard cells lose water, they become flaccid and the stomatal pore ___.',
              options: [],
              correctOption: 'closes',
              explanation: 'Loss of turgor pressure causes guard cells to straighten and close the pore.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Flaccid = close.'
            })
          ],
          hard: [
            () => ({
              type: 'ar',
              question: 'Assertion: Guard cells swell up to open the stomatal aperture. Reason: Active transport of potassium ions (K+) into guard cells triggers water inflow, making them turgid.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'K+ accumulation draws water in by osmosis, curving the guard cells to open the stomata.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'K+ transport triggers opening.'
            }),
            () => ({
              type: 'mcq',
              question: 'How does the structural thickness of the inner wall of guard cells compared to their outer wall facilitate stomatal opening?',
              options: [
                'A) The thick inner wall is less elastic, causing the cells to curve outward when turgid',
                'B) The thick inner wall allows light to filter into chloroplasts',
                'C) The thin outer wall prevents any water from escaping the cell',
                'D) The thick inner wall chemical attracts CO2 gas molecules'
              ],
              correctOption: 'A',
              explanation: 'Because the outer wall is thin and elastic, it stretches more than the thick inner wall, forcing the guard cell to bow outward when turgid.',
              chapterReference: 'Chapter 13, Page 212',
              quickRevisionNote: 'Asymmetrical walls cause bowing.'
            }),
            () => ({
              type: 'mcq',
              question: 'In which environmental condition will a plant exhibit maximum stomatal resistance to gas exchange?',
              options: [
                'A) Low soil water availability combined with high wind speed',
                'B) High humidity combined with direct morning sunlight',
                'C) High soil moisture combined with cool shade',
                'D) Flooded fields in complete darkness'
              ],
              correctOption: 'A',
              explanation: 'Dry soil combined with wind stress triggers abscisic acid synthesis, closing stomata fully to prevent lethal wilting.',
              chapterReference: 'Chapter 13, Page 213',
              quickRevisionNote: 'Wind + Dry = high stomatal resistance.'
            })
          ]
        },
        {
          name: 'dark reaction',
          easy: [
            () => ({
              type: 'tf',
              question: 'The light-independent (dark) reaction of photosynthesis can ONLY take place in complete darkness.',
              options: ['A) True', 'B) False'],
              correctOption: 'B',
              explanation: 'It is called dark reaction because it does not directly use light, but it can and does occur in daylight.',
              chapterReference: 'Chapter 13, Page 214',
              quickRevisionNote: 'Dark reaction = independent of light.'
            }),
            () => ({
              type: 'fill',
              question: 'The sugar produced as the immediate primary product of carbon fixation is ___.',
              options: [],
              correctOption: 'glucose',
              explanation: 'Photosynthesis fixes CO2 to produce glucose, which is stored as starch.',
              chapterReference: 'Chapter 13, Page 214',
              quickRevisionNote: 'Fixed sugar = glucose.'
            })
          ],
          medium: [
            () => ({
              type: 'mcq',
              question: 'In which part of the chloroplast does the light-independent Calvin cycle reaction take place?',
              options: ['A) Stroma of the chloroplast', 'B) Thylakoid membrane grana', 'C) Outer envelope membrane', 'D) Inside the thylakoid lumen'],
              correctOption: 'A',
              explanation: 'The stroma contains the enzymes (like RuBisCO) necessary to fix CO2 into sugars.',
              chapterReference: 'Chapter 13, Page 214',
              quickRevisionNote: 'Calvin Cycle location = Stroma.'
            }),
            () => ({
              type: 'mcq',
              question: 'Which specific enzyme fixes atmospheric carbon dioxide into a 3-carbon sugar in C3 plants during the dark reaction?',
              options: ['A) RuBisCO', 'B) Amylase', 'C) Pepsin', 'D) ATP Synthase'],
              correctOption: 'A',
              explanation: 'RuBisCO is the most abundant enzyme on Earth, catalyzing the carbon fixation reaction.',
              chapterReference: 'Chapter 13, Page 215',
              quickRevisionNote: 'Fixing enzyme = RuBisCO.'
            })
          ],
          hard: [
            () => ({
              type: 'mcq',
              question: 'Why does the dark reaction of photosynthesis stop within a few minutes of turning off the light source?',
              options: [
                'A) It relies on short-lived ATP and NADPH produced during the light reaction',
                'B) The RuBisCO enzyme decomposes in the dark',
                'C) Starch molecules block the stroma in the dark',
                'D) Water splitting stops, leading to oxygen toxic build-up'
              ],
              correctOption: 'A',
              explanation: 'The light-independent phase requires ATP and NADPH from the light-dependent phase, which decay or run out quickly in the dark.',
              chapterReference: 'Chapter 13, Page 215',
              quickRevisionNote: 'Dark reaction depends on light phase products.'
            }),
            () => ({
              type: 'ar',
              question: 'Assertion: C4 plants are photosynthetically more efficient than C3 plants in hot, dry environments. Reason: C4 plants use PEP carboxylase to fix carbon, which has no oxygenase activity and avoids photorespiration.',
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: 'PEP carboxylase has high affinity for CO2, allowing C4 plants to run photosynthesis efficiently even with partially closed stomata.',
              chapterReference: 'Chapter 13, Page 216',
              quickRevisionNote: 'C4 path avoids photorespiration.'
            }),
            () => ({
              type: 'mcq',
              question: 'In C4 plants, where does the initial carbon fixation occur, and where is the Calvin Cycle executed?',
              options: [
                'A) Fixation in mesophyll cells, Calvin Cycle in bundle sheath cells',
                'B) Fixation in bundle sheath cells, Calvin Cycle in stomatal guard cells',
                'C) Both occur inside the grana thylakoid membranes',
                'D) Fixation in roots, Calvin Cycle in leaf epidermal cells'
              ],
              correctOption: 'A',
              explanation: 'Spatial separation between mesophyll (carbon fixation) and bundle sheath cells (sugar synthesis) optimizes efficiency in C4 plants.',
              chapterReference: 'Chapter 13, Page 216',
              quickRevisionNote: 'C4 separation: mesophyll vs bundle sheath.'
            })
          ]
        }
      ];

      const difficultiesOrder = [difficultyLevel, ...['easy', 'medium', 'hard'].filter(d => d !== difficultyLevel)];
      for (const diffVal of difficultiesOrder) {
        for (const sub of subtopics) {
          const creators = sub[diffVal];
          if (Array.isArray(creators)) {
            creators.forEach(c => questionsList.push(c()));
          } else if (typeof creators === 'function') {
            questionsList.push(creators());
          }
        }
      }
    }

    else {
      const subtopics = [
        {
          name: 'core concepts',
          easy: [
            () => ({
              type: 'tf',
              question: `According to NCERT Class ${cl} ${s}, the concept of "${topic}" is an essential part of the syllabus.`,
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: `The NCERT Class ${cl} curriculum structures "${topic}" as a core conceptual framework.`,
              chapterReference: `Class ${cl} Syllabus`,
              quickRevisionNote: `Focus topic: ${topic}.`
            }),
            () => ({
              type: 'fill',
              question: `The concept of ___ is a foundational pillar of Class ${cl} ${s} study.`,
              options: [],
              correctOption: topic,
              explanation: `Studying ${topic} is key to understanding this chapter of Class ${cl} ${s}.`,
              chapterReference: `Class ${cl} Chapter Reference`,
              quickRevisionNote: `Topic keyword: ${topic}.`
            }),
            () => ({
              type: 'mcq',
              question: `Which of the following is the most direct representation of "${topic}" in Class ${cl} ${s}?`,
              options: [
                `A) A primary study topic within the core NCERT chapters`,
                `B) An optional extra-curricular reading module`,
                `C) A concept that has been deleted from modern textbooks`,
                `D) A topic only taught to postgraduate researchers`
              ],
              correctOption: 'A',
              explanation: `NCERT textbooks include "${topic}" to build basic scientific and logical knowledge at the secondary level.`,
              chapterReference: `Class ${cl} Syllabus`,
              quickRevisionNote: `${topic} is a core syllabus component.`
            }),
            () => ({
              type: 'tf',
              question: `Learning about "${topic}" is designed to help Class ${cl} students build their fundamental knowledge in ${s}.`,
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: `The chapters are structured to transition students from basic ideas to deeper concepts.`,
              chapterReference: `Class ${cl} Guidelines`,
              quickRevisionNote: `Foundation building via ${topic}.`
            }),
            () => ({
              type: 'fill',
              question: `To excel in school examinations, a Class ${cl} student must grasp the core principles of ___ first.`,
              options: [],
              correctOption: topic,
              explanation: `Understanding the definition and properties of ${topic} is fundamental to scoring well.`,
              chapterReference: `Exam Prep Section`,
              quickRevisionNote: `Key concept: ${topic}.`
            }),
            () => ({
              type: 'mcq',
              question: `What is a basic characteristic of "${topic}" as introduced in Class ${cl} standard textbooks?`,
              options: [
                `A) It has structured properties that are tested in board exams`,
                `B) It is a purely fictional concept for illustration`,
                `C) It is only applicable to non-Indian syllabus systems`,
                `D) It can be completely understood without any reading`
              ],
              correctOption: 'A',
              explanation: `NCERT ensures topics are fact-based and aligned with standard curriculum benchmarks.`,
              chapterReference: `NCERT Text Book`,
              quickRevisionNote: `Fact-based learning.`
            }),
            () => ({
              type: 'tf',
              question: `Is it true that "${topic}" is completely unrelated to any practical experiments described in the Class ${cl} manual?`,
              options: ['A) True', 'B) False'],
              correctOption: 'B',
              explanation: `Practical exercises and activities are usually detailed to demonstrate the effects of ${topic}.`,
              chapterReference: `Practical Guide`,
              quickRevisionNote: `Activity links are present.`
            })
          ],
          medium: [
            () => ({
              type: 'mcq',
              question: `What represents the main academic significance of studying "${topic}" in Class ${cl} ${s}?`,
              options: [
                `A) It explains the core theoretical principles of the chapter`,
                `B) It has no relevance to Class ${cl} examinations`,
                `C) It is a purely historical detail with no science application`,
                `D) It is optional and can be skipped entirely`
              ],
              correctOption: 'A',
              explanation: `Studying "${topic}" provides the foundational background needed for understanding this chapter.`,
              chapterReference: `NCERT Class ${cl}`,
              quickRevisionNote: `Understand the basics of ${topic}.`
            }),
            () => ({
              type: 'mcq',
              question: `How does understanding "${topic}" assist a student in solving application-based problems in ${s}?`,
              options: [
                `A) It links simple observation with scientific definitions`,
                `B) It encourages copying answers from reference books`,
                `C) It eliminates the need for logical analytical thinking`,
                `D) It only helps in memorizing dates and scientist names`
              ],
              correctOption: 'A',
              explanation: `Application questions test how well you can connect the principles of ${topic} to real world scenarios.`,
              chapterReference: `Class ${cl} Chapter Review`,
              quickRevisionNote: `Application = Connecting theory to practice.`
            }),
            () => ({
              type: 'tf',
              question: `In Class ${cl} curriculum, "${topic}" is linked with standard scientific experiments to improve reasoning.`,
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: `NCERT uses interactive activities to help students visualize the concepts of ${topic}.`,
              chapterReference: `NCERT Activity Log`,
              quickRevisionNote: `Visualize concepts through experiments.`
            }),
            () => ({
              type: 'fill',
              question: `When analyzing typical properties of ${topic}, we must observe how it interacts with other ___ parameters.`,
              options: [],
              correctOption: `environmental`,
              explanation: `Scientific variables are always studied in relation to environmental or surrounding conditions.`,
              chapterReference: `Lab Manual Class ${cl}`,
              quickRevisionNote: `Variables interact with environments.`
            }),
            () => ({
              type: 'mcq',
              question: `Which scientific method is most recommended for investigating the properties of "${topic}" at school level?`,
              options: [
                `A) Controlled classroom observation and structured worksheets`,
                `B) Guesswork and assuming answers based on personal opinion`,
                `C) Ignoring textbook guidelines and reading random web pages`,
                `D) Skipping all textbook activities and directly reading the answer key`
              ],
              correctOption: 'A',
              explanation: `Systematic observation is the cornerstone of secondary school science education.`,
              chapterReference: `NCERT Pedagogy`,
              quickRevisionNote: `Observation is key.`
            }),
            () => ({
              type: 'tf',
              question: `Mastering "${topic}" allows a student to easily comprehend advanced related chapters in higher secondary classes.`,
              options: ['A) True', 'B) False'],
              correctOption: 'A',
              explanation: `Class ${cl} serves as a gateway; the concepts of ${topic} are expanded in Class 9 and 10.`,
              chapterReference: `Curriculum Map`,
              quickRevisionNote: `Build path for future learning.`
            }),
            () => ({
              type: 'fill',
              question: `A key educational goal of NCERT regarding ${topic} is to enable students to identify it in ___ scenarios.`,
              options: [],
              correctOption: `real-life`,
              explanation: `Practical context helps link abstract definitions to real-life occurrences.`,
              chapterReference: `Class ${cl} Objective`,
              quickRevisionNote: `Context = real-world.`
            })
          ],
          hard: [
            () => ({
              type: 'ar',
              question: `Assertion: Mastery of "${topic}" is crucial for high performance in NCERT assessments. Reason: "${topic}" tests Higher Order Thinking Skills (HOTS) across multiple chapters.`,
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: `Higher-level questions in Class ${cl} require synthesis of multiple concepts, making this topic crucial.`,
              chapterReference: `Class ${cl} Framework`,
              quickRevisionNote: `Master core principles for exam success.`
            }),
            () => ({
              type: 'ar',
              question: `Assertion: A student cannot fully explain "${topic}" by simply memorizing its dictionary definition. Reason: NCERT examinations evaluate conceptual understanding and scenario-based application of "${topic}".`,
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: `Rote learning is discouraged; the exams prioritize checking if a student can apply the theory of ${topic}.`,
              chapterReference: `NCERT Exam Scheme`,
              quickRevisionNote: `Application > Rote memorization.`
            }),
            () => ({
              type: 'mcq',
              question: `In a complex question about "${topic}", what strategy is most effective for a student to construct a scientifically correct answer?`,
              options: [
                `A) Identify the underlying physical laws and draft a response with clear cause-and-effect links`,
                `B) Write down all unrelated terms from the textbook index to fill the page`,
                `C) State that the question is out-of-syllabus and should not be graded`,
                `D) Write a brief paragraph about general science without mentioning the core topic`
              ],
              correctOption: 'A',
              explanation: `Scientific explanations require linking observations with correct terminology and logical reasoning.`,
              chapterReference: `HOTS Guidelines`,
              quickRevisionNote: `Structure = Cause + Effect.`
            }),
            () => ({
              type: 'ar',
              question: `Assertion: Active participation in laboratory experiments related to "${topic}" improves exam results. Reason: Experiential learning reinforces cognitive memory and builds spatial intuition.`,
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: `Doing experiments helps students understand the scientific principles of ${topic} much better than just reading.`,
              chapterReference: `CBSE Circular`,
              quickRevisionNote: `Experiential learning is powerful.`
            }),
            () => ({
              type: 'mcq',
              question: `When evaluating a scientific hypothesis concerning "${topic}" in a Class ${cl} test, what must the student evaluate first?`,
              options: [
                `A) The experimental variables and the accuracy of the observed results`,
                `B) The names of the students who designed the layout`,
                `C) The type of font used in the printed textbook page`,
                `D) The cost of the laboratory equipment used`
              ],
              correctOption: 'A',
              explanation: `A hypothesis is tested by checking variable relationships and matching them with observed data.`,
              chapterReference: `Scientific Method`,
              quickRevisionNote: `Check variables and observations.`
            }),
            () => ({
              type: 'ar',
              question: `Assertion: The concept of "${topic}" is tested using multi-step questions in standard exams. Reason: Multi-step questions help differentiate between superficial reading and deep analytical mastery.`,
              options: [
                'A) Both A and R are true and R is the correct explanation of A',
                'B) Both A and R are true but R is not the correct explanation of A',
                'C) A is true but R is false',
                'D) A is false but R is true'
              ],
              correctOption: 'A',
              explanation: `Multiple steps require students to retrieve and apply multiple related facts in sequence.`,
              chapterReference: `CBSE HOTS Guide`,
              quickRevisionNote: `Multi-step = deeper check.`
            })
          ]
        }
      ];

      const difficultiesOrder = [difficultyLevel, ...['easy', 'medium', 'hard'].filter(d => d !== difficultyLevel)];
      for (const diffVal of difficultiesOrder) {
        for (const sub of subtopics) {
          const creators = sub[diffVal];
          if (Array.isArray(creators)) {
            creators.forEach(c => questionsList.push(c()));
          } else if (typeof creators === 'function') {
            questionsList.push(creators());
          }
        }
      }
    }

    return questionsList;
  };

  const translateText = async (text, targetCode) => {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetCode}&de=vidyaai@education.in`;
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      if (d.responseStatus === 200 && d.responseData?.translatedText) {
        return d.responseData.translatedText;
      }
      return text;
    } catch {
      return text;
    }
  };

  // Processing is already performed directly in the batch loop.

  // If we don't have enough unique questions, fill from dynamic offline generator
  if (preparedQuestions.length < nq) {
    console.log(`[UniqueQuiz Engine] Filling remaining slots. Prepared: ${preparedQuestions.length}/${nq}. Rejections: ${rejectedCount}. Fallback activated...`);
    const needed = nq - preparedQuestions.length;
    const englishFallback = buildDynamicFallbackQs(actualTopic, actualSubject, cl, diff);
    
    // Shuffle the fallback bank to ensure randomized selection order
    const shuffledFallback = [...englishFallback].sort(() => 0.5 - Math.random());
    
    let fallbackAttempts = 0;
    
    while (preparedQuestions.length < nq && fallbackAttempts < 40) {
      fallbackAttempts++;
      const baseQ = shuffledFallback[fallbackAttempts % shuffledFallback.length];
      if (!baseQ) continue;
      
      let isDuplicate = false;
      const currentSessionHistory = previousQuestions || [];
      
      // Check already prepared in this session
      for (const prepQ of preparedQuestions) {
        if (calculateJaccardSimilarity(baseQ.question, prepQ.question) > 0.35) {
          isDuplicate = true;
          break;
        }
      }
      
      // Check session history
      if (!isDuplicate) {
        for (const pastQ of currentSessionHistory) {
          if (calculateJaccardSimilarity(baseQ.question, pastQ) > 0.35) {
            isDuplicate = true;
            break;
          }
        }
      }
      // Check global
      if (!isDuplicate) {
        for (const entry of globalQuestionHistory) {
          if (calculateJaccardSimilarity(baseQ.question, entry.question) > 0.35) {
            isDuplicate = true;
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        let processedQ = { ...baseQ, questionNumber: preparedQuestions.length + 1 };
        if (processedQ.type === 'mcq' || processedQ.type === 'ar') {
          const sh = shuffleOptions(processedQ.options, processedQ.correctOption);
          processedQ.options = sh.options;
          processedQ.correctOption = sh.correctOption;
        }
        preparedQuestions.push(processedQ);
        globalQuestionHistory.push({
          question: processedQ.question,
          topic: actualTopic,
          difficulty: diff,
          timestamp: Date.now()
        });
      } else {
        rejectedCount++;
      }
    }
    
    // Safety valve: if still not enough unique ones, force-add from fallback ignoring similarity
    if (preparedQuestions.length < nq) {
      for (const baseQ of shuffledFallback) {
        if (preparedQuestions.length >= nq) break;
        // Avoid duplicate reference within the same quiz array
        if (preparedQuestions.some(item => item.question === baseQ.question)) continue;
        
        let processedQ = { ...baseQ, questionNumber: preparedQuestions.length + 1 };
        if (processedQ.type === 'mcq' || processedQ.type === 'ar') {
          const sh = shuffleOptions(processedQ.options, processedQ.correctOption);
          processedQ.options = sh.options;
          processedQ.correctOption = sh.correctOption;
        }
        preparedQuestions.push(processedQ);
      }
    }
  }

  // Cap global history at 200 items to prevent unbounded memory growth
  if (globalQuestionHistory.length > 200) {
    globalQuestionHistory.splice(0, globalQuestionHistory.length - 200);
  }

  // Translate preparedQuestions to target language if not English
  if (lang !== 'en' && MY_MEMORY_MAP[lang]) {
    const targetCode = MY_MEMORY_MAP[lang];
    try {
      console.log(`[UniqueQuiz Engine] Translating final ${preparedQuestions.length} unique questions to ${langName}...`);
      const translatedQuestions = [];
      for (const q of preparedQuestions) {
        try {
          const tQuestion = await translateText(q.question, targetCode);
          
          const tOptions = [];
          for (const opt of q.options) {
            const letter = opt.slice(0, 3); // 'A) '
            const optText = opt.slice(3);
            const tOptText = await translateText(optText, targetCode);
            tOptions.push(`${letter}${tOptText}`);
          }

          const tExplanation = await translateText(q.explanation, targetCode);
          const tChapterRef = q.chapterReference ? await translateText(q.chapterReference, targetCode) : undefined;
          const tRevNote = q.quickRevisionNote ? await translateText(q.quickRevisionNote, targetCode) : undefined;

          let tCorrectOption = q.correctOption;
          if (q.type === 'fill') {
            tCorrectOption = await translateText(q.correctOption, targetCode);
          }

          translatedQuestions.push({
            ...q,
            question: tQuestion,
            options: tOptions,
            correctOption: tCorrectOption,
            explanation: tExplanation,
            chapterReference: tChapterRef,
            quickRevisionNote: tRevNote
          });
        } catch (err) {
          console.error(`[UniqueQuiz Engine] Translation error for question ${q.questionNumber}:`, err.message);
          translatedQuestions.push(q);
        }
        await new Promise(r => setTimeout(r, 60)); // minor gap
      }
      
      const finalQuestions = translatedQuestions.map((qItem, idx) => ({ ...qItem, questionNumber: idx + 1 }));
      
      return res.json({
        success: true,
        provider: lastLlmProvider ? `${lastLlmProvider}_translated` : 'local_fallback_translated',
        topic: actualTopic,
        rejections: rejectedCount,
        questions: finalQuestions
      });
    } catch (e) {
      console.error('[UniqueQuiz Engine] Fallback translation failed:', e.message);
    }
  }

  // Renumber questions consecutively
  const finalQuestions = preparedQuestions.map((qItem, idx) => ({ ...qItem, questionNumber: idx + 1 }));

  res.json({
    success: true,
    provider: lastLlmProvider || 'local_fallback',
    topic: actualTopic,
    rejections: rejectedCount,
    questions: finalQuestions
  });
});

// ----------------------------------------------------
// 📊 ENGAGEMENT AI REDESIGN: ACTIVITY LOGS & ANALYTICS
// ----------------------------------------------------

const analyticsCache = {};

// 1. Log Study Activity
app.post('/api/learning/activity/log', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { activityType, subject, chapter, topic, timeSpent, score, totalQuestions, correctAnswers, wrongAnswers } = req.body;
  
  if (!activityType) {
    return res.status(400).json({ success: false, error: "Missing required field activityType" });
  }

  try {
    const result = db.addStudyLog({
      userId,
      activityType,
      subject: subject || "Science",
      chapter: chapter || "",
      topic: topic || "",
      timeSpent: parseInt(timeSpent) || 10,
      score: score !== undefined ? parseFloat(score) : undefined,
      totalQuestions: totalQuestions !== undefined ? parseInt(totalQuestions) : undefined,
      correctAnswers: correctAnswers !== undefined ? parseInt(correctAnswers) : undefined,
      wrongAnswers: wrongAnswers !== undefined ? parseInt(wrongAnswers) : undefined
    });

    // Invalidate compiled analytics cache on new log
    delete analyticsCache[userId];

    res.json({ success: true, log: result.log, user: result.user });
  } catch (err) {
    console.error("Failed to add study log:", err);
    res.status(500).json({ success: false, error: "Failed to save activity log" });
  }
});

// 2. Fetch Compiled Learning Analytics
app.get('/api/learning/activity/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Check in-memory compiled cache first (valid for 5 minutes)
  const now = Date.now();
  if (analyticsCache[userId] && (now - analyticsCache[userId].timestamp < 5 * 60 * 1000)) {
    console.log(`[Analytics Cache Hit] Returning cached stats for user: ${userId}`);
    return res.json(analyticsCache[userId].compiledStats);
  }

  try {
    const logs = db.getStudyLogs(userId);
    const user = db.getUser(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // A. Study Overview
    const totalStudyTime = logs.reduce((acc, l) => acc + (l.timeSpent || 0), 0);
    const lessonsCompletedCount = logs.filter(l => l.activityType === 'lesson').length;
    const weeklyStreak = user.streak || 1;
    const totalXP = user.xp;
    const level = user.level;

    // B. Subject Progress (from user profile, recalculated dynamically by db.js)
    const subjectProgress = user.subjectProgress || {};

    // C. Weak Topics Detection
    const weakTopicsMap = {};
    logs.forEach(l => {
      if (l.score !== undefined && l.topic) {
        if (l.score < 70) {
          weakTopicsMap[l.topic] = {
            subject: l.subject || "Science",
            chapter: l.chapter || "",
            topic: l.topic,
            score: Math.round(l.score),
            timestamp: l.timestamp
          };
        } else if (l.score >= 80) {
          delete weakTopicsMap[l.topic]; // Mastery achieved, remove
        }
      }
    });
    const weakTopics = Object.values(weakTopicsMap);

    // D. Quiz Analytics
    const quizLogs = logs.filter(l => l.activityType === 'quiz');
    let avgQuizScore = 0;
    let quizAccuracy = 0;
    let hardestSubject = "None";
    let easiestSubject = "None";

    if (quizLogs.length > 0) {
      const totalScore = quizLogs.reduce((acc, q) => acc + (q.score || 0), 0);
      avgQuizScore = Math.round(totalScore / quizLogs.length);

      const totalQ = quizLogs.reduce((acc, q) => acc + (q.totalQuestions || 0), 0);
      const totalC = quizLogs.reduce((acc, q) => acc + (q.correctAnswers || 0), 0);
      quizAccuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : avgQuizScore;

      // Group by subject to find easiest/hardest
      const subjScores = {};
      quizLogs.forEach(q => {
        const s = q.subject || "Science";
        if (!subjScores[s]) subjScores[s] = [];
        subjScores[s].push(q.score || 0);
      });

      let minAvg = Infinity;
      let maxAvg = -Infinity;
      Object.keys(subjScores).forEach(s => {
        const avg = subjScores[s].reduce((a, b) => a + b, 0) / subjScores[s].length;
        if (avg < minAvg) {
          minAvg = avg;
          hardestSubject = s;
        }
        if (avg > maxAvg) {
          maxAvg = avg;
          easiestSubject = s;
        }
      });
    }

    const recentQuizHistory = quizLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(q => ({
        id: q.id,
        topic: q.topic || q.chapter || "General Practice",
        subject: q.subject,
        score: Math.round(q.score || 0),
        date: new Date(q.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      }));

    // E. Learning Heatmap (last 28 days)
    const heatmap = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Group logs by date string
    const logsByDate = {};
    const logsMinutesByDate = {};
    const logsXpByDate = {};
    logs.forEach(l => {
      const dateStr = new Date(l.timestamp).toISOString().split('T')[0];
      logsByDate[dateStr] = (logsByDate[dateStr] || 0) + 1;
      logsMinutesByDate[dateStr] = (logsMinutesByDate[dateStr] || 0) + (l.timeSpent || 0);
      logsXpByDate[dateStr] = (logsXpByDate[dateStr] || 0) + (l.xpEarned || 30);
    });

    for (let i = 27; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dateStr = d.toISOString().split('T')[0];
      heatmap.push({
        date: dateStr,
        count: logsByDate[dateStr] || 0,
        minutes: Math.round(logsMinutesByDate[dateStr] || 0),
        xp: logsXpByDate[dateStr] || 0
      });
    }

    // F. Focus Tracking
    const activeSessions = logs.filter(l => l.timeSpent > 0);
    const avgSessionDuration = activeSessions.length > 0 
      ? Math.round(activeSessions.reduce((acc, l) => acc + l.timeSpent, 0) / activeSessions.length)
      : 15;

    // Peak focus hour calculation
    const hourCounts = {};
    logs.forEach(l => {
      const hour = new Date(l.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    let peakHourVal = 10; // Default 10 AM
    let maxHourCount = 0;
    Object.keys(hourCounts).forEach(h => {
      if (hourCounts[h] > maxHourCount) {
        maxHourCount = hourCounts[h];
        peakHourVal = parseInt(h);
      }
    });
    const suffix = peakHourVal >= 12 ? "PM" : "AM";
    const displayHour = peakHourVal % 12 === 0 ? 12 : peakHourVal % 12;
    const peakFocusHour = `${displayHour}:00 ${suffix}`;

    // G. AI Recommendations Engine
    const recommendations = [];
    
    // 1. Check for improvement trends in history
    const quizScoresBySubject = {};
    quizLogs.forEach(q => {
      if (!quizScoresBySubject[q.subject]) quizScoresBySubject[q.subject] = [];
      quizScoresBySubject[q.subject].push(q.score);
    });

    Object.keys(quizScoresBySubject).forEach(subj => {
      const scores = quizScoresBySubject[subj];
      if (scores.length >= 2) {
        const lastScore = scores[scores.length - 1];
        const prevScore = scores[scores.length - 2];
        if (lastScore > prevScore) {
          const improvement = Math.round(lastScore - prevScore);
          recommendations.push({
            type: "insight",
            title: `${subj} Efficiency Boost!`,
            description: `Your ${subj} scores rose by ${improvement}% after completing corresponding study units.`,
            actionLabel: "Keep it Up",
            subject: subj,
            topic: ""
          });
        }
      }
    });

    // 2. Check for weak topics that need revision
    if (weakTopics.length > 0) {
      weakTopics.slice(0, 2).forEach(wt => {
        recommendations.push({
          type: "revision",
          title: `Needs Practice: ${wt.topic}`,
          description: `Your last quiz score was ${wt.score}%. We recommend reviewing the "${wt.chapter || wt.topic}" chapter inside the Learn module.`,
          actionLabel: "Revise Chapter",
          subject: wt.subject,
          topic: wt.topic
        });
      });
    }

    // 3. Dynamic Feynman / Socratic suggestions based on active subjects
    const completedLessonLogs = logs.filter(l => l.activityType === 'lesson');
    if (completedLessonLogs.length > 0) {
      const lastLesson = completedLessonLogs[completedLessonLogs.length - 1];
      recommendations.push({
        type: "feynman",
        title: `Deepen: ${lastLesson.topic}`,
        description: `Use Feynman Mode to explain "${lastLesson.topic}" in your own words. Teaching others is the best way to verify absolute clarity!`,
        actionLabel: "Start Feynman",
        subject: lastLesson.subject,
        topic: lastLesson.topic
      });
    }

    // 4. Default dynamic challenge fallback
    if (recommendations.length < 3) {
      recommendations.push({
        type: "quiz",
        title: "Daily Practice Challenge",
        description: "Solve a quick 5-question adaptive quiz on your current subject to maintain your study streak.",
        actionLabel: "Take Quiz",
        subject: "Science",
        topic: "Crop Production"
      });
    }

    const responsePayload = {
      success: true,
      stats: {
        userId,
        userName: user.name,
        totalStudyTime,
        lessonsCompletedCount,
        weeklyStreak,
        totalXP,
        level,
        subjectProgress,
        weakTopics,
        quizAnalytics: {
          avgQuizScore,
          quizAccuracy,
          hardestSubject,
          easiestSubject,
          recentQuizHistory
        },
        heatmap,
        focusTracking: {
          avgSessionDuration,
          peakFocusHour,
          attentionHistory: user.attentionScores || [85, 88, 78, 88, 84, 86, 91]
        },
        recommendations
      }
    };

    // Cache the compiled analytics response
    analyticsCache[userId] = {
      timestamp: Date.now(),
      compiledStats: responsePayload
    };

    res.json(responsePayload);

  } catch (err) {
    console.error("Failed to compile analytics:", err);
    res.status(500).json({ success: false, error: "Failed to compile learning analytics" });
  }
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
