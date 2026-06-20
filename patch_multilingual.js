const fs = require('fs');

// ===========================
// FULL LANGUAGE CODE MAP (used in multiple places)
// ===========================
const LANG_CODE_MAP = `{
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
      te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN',
      as: 'as-IN', sa: 'sa-IN', kok: 'kok-IN', mai: 'mai-IN',
      ne: 'ne-NP', sd: 'sd-IN', ks: 'ks-IN', doi: 'doi-IN'
    }`;

// ===========================
// PATCH 1: FeynmanArena.tsx
// ===========================
let feynman = fs.readFileSync('./frontend/src/pages/FeynmanArena.tsx', 'utf8');

// Fix langCodes in speakText (only had en and hi)
feynman = feynman.replace(
  `const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN'
    };
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';`,
  `const langCodes: Record<string, string> = ${LANG_CODE_MAP};
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';`
);

// Fix SpeechRecognition lang (only checked hi)
feynman = feynman.replace(
  `rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';`,
  `const recLangCodes: Record<string, string> = ${LANG_CODE_MAP};
      rec.lang = recLangCodes[language] || 'en-IN';`
);

fs.writeFileSync('./frontend/src/pages/FeynmanArena.tsx', feynman, 'utf8');
console.log('✅ FeynmanArena.tsx: langCodes expanded to all Indian languages');

// ===========================
// PATCH 2: VoiceClassroom.tsx
// ===========================
let voice = fs.readFileSync('./frontend/src/pages/VoiceClassroom.tsx', 'utf8');

// Fix langCodes in playReferenceSpeech
voice = voice.replace(
  `const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN'
    };
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';`,
  `const langCodes: Record<string, string> = ${LANG_CODE_MAP};
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';`
);

// Fix SpeechRecognition lang (only checked hi)
voice = voice.replace(
  `rec.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-IN';`,
  `const recLangCodes: Record<string, string> = ${LANG_CODE_MAP};
      rec.lang = recLangCodes[selectedLanguage] || 'en-IN';`
);

fs.writeFileSync('./frontend/src/pages/VoiceClassroom.tsx', voice, 'utf8');
console.log('✅ VoiceClassroom.tsx: langCodes expanded to all Indian languages');

// ===========================
// PATCH 3: DebateArena.tsx language check
// ===========================
let debate = fs.readFileSync('./frontend/src/pages/DebateArena.tsx', 'utf8');

// Check what debate sends to backend
const hasLangInDebate = debate.includes('language:');
console.log(hasLangInDebate ? '✅ DebateArena.tsx: already sends language' : '⚠️ DebateArena.tsx: may be missing language in API call');

// Fix debate endpoint on server - fix queryLLMChain call (missing key param)
let server = fs.readFileSync('./backend/server.js', 'utf8');

// Fix the debate respond LLM call which is missing the key argument
server = server.replace(
  `const llmPrompt = \`Debate topic: "\${topic}". User Position: "\${position}". User Argument: "\${userText}". Language: "\${lang}".
    As the opponent, provide a quick counterargument (2-3 sentences) in the same language, scoring the user's debate.
    Return JSON:
    {
      "counterArgument": "Opponent counterargument",
      "scores": { "logic": 85, "grammar": 90, "confidence": 80, "reasoning": 85, "communication": 85 }
    }\`;

  const llmResponse = await queryLLMChain(llmPrompt);`,
  `const langName = LANG_NAMES[lang] || 'English';
  const llmPrompt = \`LANGUAGE INSTRUCTION: Respond ONLY in \${langName}. Do NOT use English unless the language IS English.
Debate topic: "\${topic}". User Position: "\${position}". User Argument: "\${userText}".
As the opponent, provide a quick counterargument (2-3 sentences) in \${langName}, then score the user's debate.
Return ONLY valid JSON:
{
  "counterArgument": "Opponent counterargument in \${langName}",
  "scores": { "logic": 85, "grammar": 90, "confidence": 80, "reasoning": 85, "communication": 85 }
}\`;

  const llmResponse = await queryLLMChain('debate:' + topic + ':' + langName, llmPrompt);`
);

// Also fix the JSON parse for debate (add backtick stripping)
server = server.replace(
  `  const llmResponse = await queryLLMChain('debate:' + topic + ':' + langName, llmPrompt);
  if (llmResponse) {
    try {
      const parsed = JSON.parse(llmResponse.text);
      return res.json({ success: true, provider: llmResponse.provider, ...parsed });
    } catch (e) {
      // Fallback
    }
  }`,
  `  const llmResponse = await queryLLMChain('debate:' + topic + ':' + langName, llmPrompt);
  if (llmResponse) {
    try {
      let ct = llmResponse.text.trim();
      if (ct.startsWith('\`\`\`json')) ct = ct.slice(7);
      if (ct.startsWith('\`\`\`')) ct = ct.slice(3);
      if (ct.endsWith('\`\`\`')) ct = ct.slice(0, -3);
      const parsed = JSON.parse(ct.trim());
      return res.json({ success: true, provider: llmResponse.provider, ...parsed });
    } catch (e) {
      // use plain text as counter argument
      return res.json({ success: true, provider: llmResponse.provider, counterArgument: llmResponse.text.slice(0, 300), scores: { logic, grammar, confidence, reasoning, communication } });
    }
  }`
);

fs.writeFileSync('./backend/server.js', server, 'utf8');
console.log('✅ server.js: Debate endpoint now has strict language enforcement + JSON fix');

// Verify all patches
const verifyFeynman = fs.readFileSync('./frontend/src/pages/FeynmanArena.tsx', 'utf8');
const verifyVoice = fs.readFileSync('./frontend/src/pages/VoiceClassroom.tsx', 'utf8');
const verifyServer = fs.readFileSync('./backend/server.js', 'utf8');

console.log('\n=== VERIFICATION ===');
console.log(verifyFeynman.includes('bn-IN') ? '✅ FeynmanArena: Bengali TTS supported' : '❌ FeynmanArena: patch failed');
console.log(verifyVoice.includes('ta-IN') ? '✅ VoiceClassroom: Tamil TTS supported' : '❌ VoiceClassroom: patch failed');
console.log(verifyServer.includes('LANGUAGE INSTRUCTION') && verifyServer.includes('debate:') ? '✅ Debate: language enforced in LLM' : '❌ Debate: patch failed');
console.log(verifyServer.includes('feynmanIntros') ? '✅ Feynman start: multilingual (from earlier patch)' : '❌ Feynman start: missing');
console.log(verifyServer.includes('fqMap') ? '✅ Feynman respond: multilingual fallback present' : '❌ Feynman respond: missing');
