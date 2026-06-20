const fs = require('fs');
let code = fs.readFileSync('./backend/server.js', 'utf8');

// Fix Feynman start endpoint - expand intros to all 12 languages and remove normalizedTopic
code = code.replace(
  /app\.post\('\/api\/learning\/feynman\/start'[\s\S]*?systemMessage: intros\[lang\] \|\| intros\.en\n  \}\);\n\}\);/,
  `app.post('/api/learning/feynman/start', (req, res) => {
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
});`
);

// Fix Feynman respond endpoint - LLM-first with strict language enforcement
code = code.replace(
  /app\.post\('\/api\/learning\/feynman\/respond'[\s\S]*?followUpQuestion: followUp\n  \}\);\n\}\);/,
  `app.post('/api/learning/feynman/respond', async (req, res) => {
  const { studentExplanation, topic, language, classLevel } = req.body;
  const lang = language || 'en';
  const cl = classLevel || 8;
  const langName = LANG_NAMES[lang] || 'English';
  const text = studentExplanation || '';

  // LLM-first with strict language enforcement
  const llmPrompt = 'LANGUAGE INSTRUCTION: Your ENTIRE response must be in ' + langName + ' only. Do NOT use English unless language is English.\\n' +
    'Student explanation: "' + text + '"\\n' +
    'Topic: "' + topic + '". Class: ' + cl + '. Teaching language: ' + langName + '\\n' +
    'Evaluate understanding and ask ONE Socratic follow-up question.\\n' +
    'Return ONLY valid JSON: {"score": <0-100>, "gaps": ["gap in ' + langName + '"], "followUpQuestion": "question in ' + langName + '"}';

  const llmResponse = await queryLLMChain('Feynman:' + topic + ':' + langName, llmPrompt);
  if (llmResponse) {
    try {
      let ct = llmResponse.text.trim();
      if (ct.startsWith('\`\`\`json')) ct = ct.slice(7);
      if (ct.startsWith('\`\`\`')) ct = ct.slice(3);
      if (ct.endsWith('\`\`\`')) ct = ct.slice(0, -3);
      const parsed = JSON.parse(ct.trim());
      return res.json({ success: true, provider: llmResponse.provider, ...parsed });
    } catch (e) {
      return res.json({ success: true, provider: llmResponse.provider, score: 70, gaps: [], followUpQuestion: llmResponse.text.slice(0, 300) });
    }
  }

  // Static multilingual fallback follow-ups
  const wordCount = text.trim().split(/\\s+/).length;
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
    or: '"' + topic + '" ବେଳେ ପଦ-ଦ-ପଦ କ'ଣ ଘଟୁଛି ତାହା ବୁଝାଇ ପାରିବେ?'
  };

  res.json({
    success: true,
    provider: 'local_simulation',
    score: score,
    gaps: [],
    followUpQuestion: fqMap[lang] || fqMap.en
  });
});`
);

fs.writeFileSync('./backend/server.js', code, 'utf8');
console.log('Feynman endpoints patched successfully!');

// Verify the changes were applied
const newCode = fs.readFileSync('./backend/server.js', 'utf8');
if (newCode.includes('feynmanIntros')) {
  console.log('✅ Feynman start: multilingual intros added');
} else {
  console.log('❌ Feynman start patch FAILED');
}
if (newCode.includes('fqMap')) {
  console.log('✅ Feynman respond: multilingual fallbacks added');
} else {
  console.log('❌ Feynman respond patch FAILED');
}
if (newCode.includes('LANGUAGE INSTRUCTION')) {
  console.log('✅ Feynman respond: LLM language enforcement added');
} else {
  console.log('❌ LLM language enforcement patch FAILED');
}
