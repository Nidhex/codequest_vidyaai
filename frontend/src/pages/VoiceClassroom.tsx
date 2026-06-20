import React, { useState, useEffect, useRef } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS, LANGUAGES } from '../store/translations';
import { CURRICULUM_FALLBACK } from '../store/curriculumFallback';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { 
  ArrowLeft, Mic, MicOff, Volume2, Shield, RefreshCw, 
  CheckCircle2, XCircle, Award, Compass, Presentation
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceClassroomProps {
  onNavigate: (page: string) => void;
}

export const VoiceClassroom: React.FC<VoiceClassroomProps> = ({ onNavigate }) => {
  const { language, setLanguage, classLevel, setClassLevel, updateXP } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Dynamic curriculum states
  const [gradeLevel, setGradeLevel] = useState(classLevel);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [chapter, setChapter] = useState('');
  
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [topicInput, setTopicInput] = useState('Photosynthesis');

  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const classesList = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  // 1. Fetch subjects when Class Level changes
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/subjects?classLevel=${gradeLevel}`);
        const data = await res.json();
        if (data.success && data.subjects && data.subjects.length > 0) {
          setSubjectsList(data.subjects);
          setSubject(data.subjects[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load subjects from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackSubjects = classInfo ? Object.keys(classInfo.subjects) : ["Mathematics", "Science"];
      setSubjectsList(fallbackSubjects);
      setSubject(fallbackSubjects[0] || '');
    };
    loadSubjects();
  }, [gradeLevel]);

  // 2. Fetch chapters when Subject or Class Level changes
  useEffect(() => {
    if (!subject) return;
    const loadChapters = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/chapters?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}`);
        const data = await res.json();
        if (data.success && data.chapters && data.chapters.length > 0) {
          setChaptersList(data.chapters);
          setChapter(data.chapters[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load chapters from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackChapters = classInfo?.subjects[subject]
        ? Object.keys(classInfo.subjects[subject].chapters)
        : ["Chapter 1: Standard Concept", "Chapter 2: Advanced Concept"];
      setChaptersList(fallbackChapters);
      setChapter(fallbackChapters[0] || '');
    };
    loadChapters();
  }, [gradeLevel, subject]);

  // 3. Fetch topics when Chapter, Subject or Class Level changes
  useEffect(() => {
    if (!chapter || !subject) return;
    const loadTopics = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/curriculum/topics?classLevel=${gradeLevel}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`);
        const data = await res.json();
        if (data.success && data.topics && data.topics.length > 0) {
          setTopicsList(data.topics);
          setSelectedTopic(data.topics[0]);
          setTopicInput(data.topics[0]);
          return;
        }
      } catch (err) {
        console.error("Failed to load topics from API, using fallback", err);
      }
      // Fallback
      const classInfo = CURRICULUM_FALLBACK[String(gradeLevel)];
      const fallbackTopics = classInfo?.subjects[subject]?.chapters[chapter] || ["Core Theory", "Key Applications"];
      setTopicsList(fallbackTopics);
      setSelectedTopic(fallbackTopics[0] || '');
      setTopicInput(fallbackTopics[0] || '');
    };
    loadTopics();
  }, [gradeLevel, subject, chapter]);
  const [activeRefIdx, setActiveRefIdx] = useState(0);
  const [isPlayingAIAudio, setIsPlayingAIAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');
  
  // Pronunciation metrics
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [mispronouncedWords, setMispronouncedWords] = useState<string[]>([]);
  const [voiceCommandTriggered, setVoiceCommandTriggered] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Core pronunciation reference sentences
  const REFERENCE_SENTENCES = [
    {
      en: "Chlorophyll absorbs solar photon energy in leaves.",
      hi: "क्लोरोफिल पत्तियों में सौर ऊर्जा को अवशोषित करता है।"
    },
    {
      en: "Force is defined as a push or pull on an object.",
      hi: "बल को किसी वस्तु पर धक्का या खिंचाव के रूप में परिभाषित किया जाता है।"
    },
    {
      en: "The atom consists of positively charged protons inside the nucleus.",
      hi: "परमाणु में नाभिक के अंदर सकारात्मक रूप से आवेशित प्रोटॉन होते हैं।"
    }
  ];

  const currentRef = REFERENCE_SENTENCES[activeRefIdx][selectedLanguage === 'hi' ? 'hi' : 'en'] || REFERENCE_SENTENCES[activeRefIdx].en;

  // Calculate Levenshtein-based pronunciation distance
  const evaluatePronunciation = (transcript: string, reference: string) => {
    const cleanStr = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().split(/\s+/);
    const transWords = cleanStr(transcript);
    const refWords = cleanStr(reference);

    let matchCount = 0;
    const missed: string[] = [];

    refWords.forEach(w => {
      if (transWords.includes(w)) {
        matchCount++;
      } else {
        missed.push(w);
      }
    });

    const score = Math.round((matchCount / (refWords.length || 1)) * 100);
    return { score, missed };
  };

  const handleStartTeaching = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim()) return;

    setLoading(true);
    setLanguage(selectedLanguage);
    setClassLevel(gradeLevel);

    setTimeout(() => {
      setSessionActive(true);
      setLoading(false);
      playReferenceSpeech();
    }, 1000);
  };

  // Web Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      const recLangCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
      te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN',
      as: 'as-IN', sa: 'sa-IN', kok: 'kok-IN', mai: 'mai-IN',
      ne: 'ne-NP', sd: 'sd-IN', ks: 'ks-IN', doi: 'doi-IN'
    };
      rec.lang = recLangCodes[selectedLanguage] || 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
        if (sessionActive) {
          setVoiceResult('');
          setPronunciationScore(null);
          setMispronouncedWords([]);
        }
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (sessionActive) {
          setVoiceResult(transcript);
          const { score, missed } = evaluatePronunciation(transcript, currentRef);
          setPronunciationScore(score);
          setMispronouncedWords(missed);

          if (score >= 80) {
            updateXP(15);
            confetti({
              particleCount: 40,
              spread: 45,
              colors: ['#00f2fe', '#00f5d4']
            });
          }
        } else {
          setTopicInput(transcript.replace(/[.+]/g, ''));
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [selectedLanguage, activeRefIdx, sessionActive]);

  const toggleVoiceCapture = () => {
    if (!recognitionRef.current) {
      alert("Browser Speech Recognition not supported.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const playReferenceSpeech = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentRef);
    const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN',
      te: 'te-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN',
      ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK', or: 'or-IN',
      as: 'as-IN', sa: 'sa-IN', kok: 'kok-IN', mai: 'mai-IN',
      ne: 'ne-NP', sd: 'sd-IN', ks: 'ks-IN', doi: 'doi-IN'
    };
    utterance.lang = langCodes[selectedLanguage] || 'en-IN';
    utterance.rate = 0.85;

    utterance.onend = () => setIsPlayingAIAudio(false);
    utterance.onerror = () => setIsPlayingAIAudio(false);

    setIsPlayingAIAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleNextRef = () => {
    setVoiceCommandTriggered(null);
    setVoiceResult('');
    setPronunciationScore(null);
    setMispronouncedWords([]);
    setActiveRefIdx(idx => (idx + 1) % REFERENCE_SENTENCES.length);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsPlayingAIAudio(false);
    setSessionActive(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button 
          onClick={() => { window.speechSynthesis.cancel(); onNavigate('dashboard'); }}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Classroom</span>
        </button>

        <span className="font-outfit font-black text-cyber-purple tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
          <Volume2 className="w-4 h-4" /> {t.voiceClassroom}
        </span>

        <span className="text-cyber-cyan font-bold">
          Ref Sentences: {activeRefIdx + 1} / {REFERENCE_SENTENCES.length}
        </span>
      </div>

      {/* CORE WORKSPACE */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: START TEACHING CARD */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] text-left flex flex-col space-y-6">
          <div className="flex items-center space-x-2.5 pb-2">
            <Presentation className="w-5 h-5 text-slate-800" />
            <h2 className="text-lg font-outfit font-bold text-slate-800 tracking-tight">Start Teaching</h2>
          </div>

          <form onSubmit={handleStartTeaching} className="space-y-5">
            
            {/* Grade Level Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Class Level</label>
              <div className="relative">
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={Number(cls)}>
                      Class {cls}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Language</label>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Subject</label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {subjectsList.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Chapter Selector */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Chapter</label>
              <div className="relative">
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                >
                  {chaptersList.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Topic Selection Dropdown */}
            {topicsList.length > 0 && (
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 font-inter">Select Chapter Topic</label>
                <div className="relative">
                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      setSelectedTopic(e.target.value);
                      setTopicInput(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer appearance-none font-inter"
                  >
                    {topicsList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Topic Input with Mic */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 font-inter">Or type / edit topic</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type or speak a custom topic..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-inter"
                />
                <button
                  type="button"
                  onClick={toggleVoiceCapture}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                    isListening ? 'text-rose-500 animate-pulse bg-rose-50' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#707a8a] hover:bg-[#5f6875] active:bg-[#4e5661] text-white font-inter font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              <Presentation className="w-4 h-4" />
              <span>{loading ? "Preparing Voice Calibrator..." : "Start Teaching"}</span>
            </button>

          </form>
        </div>

        {/* RIGHT COLUMN: TRAINING SCENE OR CHALKBOARD */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          
          {loading ? (
            <div className="glass-panel p-12 rounded-2xl border border-cyber-border/40 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-cyber-purple border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-mono text-cyber-purple">Calibrating regional phonetics dictionary...</span>
            </div>
          ) : sessionActive ? (
            /* ACTIVE VOCAL TRAINING */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Voice panel */}
              <div className="md:col-span-7 flex flex-col space-y-4 text-left">
                <div className="glass-panel p-5 rounded-xl border border-cyber-border/30 flex flex-col space-y-3 font-mono">
                  <span className="text-[9px] text-cyber-blue font-bold uppercase tracking-widest flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" /> Speak Reference Sentence
                  </span>
                  <h3 className="font-outfit font-bold text-base text-white">
                    "{currentRef}"
                  </h3>
                  <button
                    onClick={playReferenceSpeech}
                    className="w-fit px-3 py-1.5 bg-cyber-blue/15 border border-cyber-blue/30 rounded-lg text-[10px] text-cyber-cyan font-bold"
                  >
                    Listen to Teacher
                  </button>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-cyber-border/30 flex flex-col space-y-3 font-mono">
                  <span className="text-[9px] text-cyber-purple font-bold uppercase tracking-widest flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5" /> Mic Input
                  </span>
                  <VoiceWaveform isActive={isListening} color="#9b5de5" />
                  <button
                    onClick={toggleVoiceCapture}
                    className={`w-full py-2.5 rounded-xl border font-mono font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isListening ? 'bg-cyber-pink text-white' : 'bg-cyber-cyan text-black'
                    }`}
                  >
                    {isListening ? "Listening..." : "Record Speech"}
                  </button>
                  {voiceResult && (
                    <div className="bg-black/30 p-2.5 rounded-lg border border-cyber-border/10 text-[10px]">
                      <span>Heard: "{voiceResult}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar and metrics */}
              <div className="md:col-span-5 flex flex-col space-y-4">
                <div className="h-[220px] rounded-xl overflow-hidden bg-black/40 border border-cyber-border/20">
                  <AvatarTeacher isSpeaking={isPlayingAIAudio} emotionState={isPlayingAIAudio ? 'happy' : 'encouraging'} speechIntensity={0.65} />
                </div>

                {pronunciationScore !== null && (
                  <div className="bg-cyber-bg/40 p-4 rounded-xl border border-cyber-border/20 text-center font-mono">
                    <span className="text-[9px] text-cyber-text/50 uppercase">Pronunciation</span>
                    <span className="text-xl font-bold text-cyber-cyan block mt-1">{pronunciationScore}%</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DEFAULT CHALKBOARD LOOK */
            <div className="w-full bg-[#0d2a1d] border-[10px] border-[#3d2c16] rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[420px] shadow-lg relative overflow-hidden font-outfit">
              {/* Slate reflection or light gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
              
              <h2 className="text-white text-4.5xl font-extrabold tracking-wide mb-3">
                AI Teacher
              </h2>
              <p className="text-white/95 text-lg font-medium max-w-sm leading-relaxed mb-8">
                Enter a topic and click 'Start Teaching' to begin!
              </p>

              <div className="text-left text-white/90 text-sm max-w-xs w-full pl-6 space-y-2 border-t border-white/10 pt-6">
                <span className="font-bold text-white uppercase tracking-wider block text-xs mb-3">Example topics:</span>
                <div className="space-y-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Photosynthesis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Solar System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">•</span>
                    <span>Fractions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
};
