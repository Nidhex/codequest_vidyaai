import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { 
  ArrowLeft, Mic, MicOff, Send, MessageSquare, Timer, 
  Award, RefreshCw, BarChart2, Shield, AlertCircle, 
  Sparkles, Bookmark, User, Brain, CheckCircle, Flame
} from 'lucide-react';
import { io } from 'socket.io-client';
import { EngagementTracker } from '../components/EngagementTracker';
import { PomodoroTimer } from '../components/PomodoroTimer';

interface DebateArenaProps {
  onNavigate: (page: string) => void;
}

// ----------------------------------------------------
// 🛡️ REACT ERROR BOUNDARY WRAPPER
// ----------------------------------------------------
class DebateErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[DEBATE ENGINE ERROR]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen bg-[#03001e] flex flex-col justify-center items-center p-6 text-center text-white font-mono">
          <div className="glass-panel p-8 rounded-2xl border border-cyber-pink/50 max-w-md space-y-4 shadow-glow-pink">
            <AlertCircle className="w-12 h-12 text-cyber-pink mx-auto animate-pulse" />
            <h2 className="text-md font-bold uppercase tracking-wider text-cyber-pink">Arena Recovery System</h2>
            <p className="text-xs text-cyber-text/70 leading-relaxed">
              A runtime rendering error occurred in the debate component. The system state has been protected.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-black/40 border border-cyber-border/30 rounded text-[9px] text-cyber-pink/80 overflow-x-auto text-left max-h-24 select-all">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-2.5 bg-cyber-pink hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-glow-pink font-mono uppercase"
            >
              Hot Reload Arena
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ----------------------------------------------------
// 🌐 CONFIGURATION DATA
// ----------------------------------------------------
const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-IN' },
  { code: 'hi', name: 'Hindi (हिंदी)', locale: 'hi-IN' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', locale: 'gu-IN' },
  { code: 'mr', name: 'Marathi (मराठी)', locale: 'mr-IN' },
  { code: 'ta', name: 'Tamil (தமிழ்)', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu (తెలుగు)', locale: 'te-IN' },
  { code: 'bn', name: 'Bengali (বাংলা)', locale: 'bn-IN' },
  { code: 'ur', name: 'Urdu (اردو)', locale: 'ur-IN' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', locale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam (മലയാളം)', locale: 'ml-IN' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', locale: 'pa-IN' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', locale: 'or-IN' },
  { code: 'as', name: 'Assamese (অসমীয়া)', locale: 'as-IN' },
  { code: 'sa', name: 'Sanskrit (संस्कृतम्)', locale: 'sa-IN' },
  { code: 'ne', name: 'Nepali (नेपाली)', locale: 'ne-NP' },
  { code: 'sd', name: 'Sindhi (سنڌي)', locale: 'sd-IN' },
  { code: 'kok', name: 'Konkani (कोंकणी)', locale: 'kok-IN' },
  { code: 'doi', name: 'Dogri (डोगरी)', locale: 'doi-IN' },
  { code: 'mni', name: 'Manipuri (মণিপুরী)', locale: 'mni-IN' },
  { code: 'mai', name: 'Maithili (मैथिली)', locale: 'hi-IN' },
  { code: 'sat', name: 'Santali (संताली)', locale: 'hi-IN' },
  { code: 'ks', name: 'Kashmiri (کٲशुर)', locale: 'ks-IN' }
];

const STUDY_CATEGORIES = [
  { id: 'science', name: 'Science & Tech 🚀', desc: 'AI, Farming, Space, and Technology.' },
  { id: 'society', name: 'Education & Society 📚', desc: 'Social Media, Online Learning, School rules.' },
  { id: 'environment', name: 'Environment 🌿', desc: 'Renewable energy, Solar power, Conservation.' }
];

const SUGGESTED_TOPICS_BY_CATEGORY: Record<string, string[]> = {
  science: [
    "Artificial intelligence is dangerous for agriculture.",
    "Space exploration is a waste of money for India.",
    "AI will replace classroom teachers in Indian schools."
  ],
  society: [
    "Social media harms students' mental growth.",
    "Online learning is better than traditional classrooms.",
    "Homework should be banned in primary schools."
  ],
  environment: [
    "Renewable energy should completely replace coal in India.",
    "Electric vehicles are the only solution to pollution.",
    "Organic farming is better than chemical farming."
  ]
};

const PERSONALITY_MODES = [
  { id: 'Friendly Teacher', name: 'Friendly Teacher 🧑‍🏫', desc: 'Constructive, supportive, and guides you gently.' },
  { id: 'Strict Examiner', name: 'Strict Examiner 🧐', desc: 'Rigorous analysis of logic, grammar, and grammar slips.' },
  { id: 'Competitive Debater', name: 'Competitive Debater 🤺', desc: 'Fast, analytical, and highly structured counterarguments.' },
  { id: 'Motivational Mentor', name: 'Motivational Mentor 🌟', desc: 'Focuses on building your confidence and praises key points.' }
];

// Helper to log safe developer debug alerts
const debugLog = (...args: any[]) => {
  console.log("%c[DEBATE ENGINE CONFIG]", "color: #00f2fe; font-weight: bold; background: #0a0a23; padding: 2px 5px; border-radius: 4px;", ...args);
};

// ----------------------------------------------------
// 🔊 AUDIO WAVEFORM DRAWING COMPONENT
// ----------------------------------------------------
const AudioVisualizer: React.FC<{ analyser: AnalyserNode | null }> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Gradient background refresh
      ctx.fillStyle = 'rgba(10, 10, 30, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#f15bb5'); // Neon Pink
      gradient.addColorStop(0.5, '#00f2fe'); // Neon Cyan
      gradient.addColorStop(1, '#9b5de5'); // Neon Purple
      ctx.strokeStyle = gradient;
      
      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-12 bg-black/40 border border-cyber-border/40 rounded-xl"
      width={400}
      height={48}
    />
  );
};

// ----------------------------------------------------
// 📊 SVG RADAR CHART
// ----------------------------------------------------
const RadarChart: React.FC<{ scores: Record<string, number> }> = ({ scores }) => {
  const keys = ['logic', 'grammar', 'confidence', 'fluency', 'vocabulary', 'punctuation', 'criticalThinking'];
  const labels = ['Logic', 'Grammar', 'Confidence', 'Fluency', 'Vocab', 'Punc', 'Critical'];
  const N = keys.length;
  const radius = 60;
  const cx = 90;
  const cy = 90;
  
  const points = useMemo(() => {
    const safeScores = scores || {};
    return keys.map((key, i) => {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
      const value = safeScores[key] || 0;
      const x = cx + radius * (value / 100) * Math.cos(angle);
      const y = cy + radius * (value / 100) * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [scores]);

  const grids = useMemo(() => {
    return [0.25, 0.5, 0.75, 1.0].map((scale, gIdx) => {
      const gridPoints = keys.map((_, i) => {
        const angle = (2 * Math.PI * i) / N - Math.PI / 2;
        const x = cx + radius * scale * Math.cos(angle);
        const y = cy + radius * scale * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
      return (
        <polygon 
          key={gIdx} 
          points={gridPoints} 
          fill="none" 
          stroke="rgba(0, 242, 254, 0.12)" 
          strokeWidth="1" 
        />
      );
    });
  }, []);

  const axes = useMemo(() => {
    return keys.map((key, i) => {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
      const xLine = cx + radius * Math.cos(angle);
      const yLine = cy + radius * Math.sin(angle);
      const xLabel = cx + (radius + 15) * Math.cos(angle);
      const yLabel = cy + (radius + 8) * Math.sin(angle);
      
      return (
        <g key={i}>
          <line 
            x1={cx} 
            y1={cy} 
            x2={xLine} 
            y2={yLine} 
            stroke="rgba(255, 255, 255, 0.12)" 
            strokeWidth="1" 
          />
          <text
            x={xLabel}
            y={yLabel}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="text-[7px] font-mono fill-cyber-text/80 font-bold"
          >
            {labels[i]}
          </text>
        </g>
      );
    });
  }, []);

  return (
    <div className="w-full flex items-center justify-center">
      <svg viewBox="0 0 180 180" className="w-full max-w-[200px] h-auto">
        {grids}
        {axes}
        <polygon 
          points={points} 
          fill="rgba(155, 93, 229, 0.2)" 
          stroke="#9b5de5" 
          strokeWidth="1.5" 
          className="transition-all duration-500"
        />
        {keys.map((key, i) => {
          const angle = (2 * Math.PI * i) / N - Math.PI / 2;
          const safeScores = scores || {};
          const value = safeScores[key] || 0;
          const x = cx + radius * (value / 100) * Math.cos(angle);
          const y = cy + radius * (value / 100) * Math.sin(angle);
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r="2.5" 
              className="fill-cyber-cyan stroke-white stroke-[0.5px] transition-all duration-500" 
            />
          );
        })}
      </svg>
    </div>
  );
};

// ----------------------------------------------------
// 🎤 CORE DEBATE CONTROLLER
// ----------------------------------------------------
const DebateArenaContent: React.FC<DebateArenaProps> = ({ onNavigate }) => {
  const { debate, language, user, addDebateArgument, setDebateScores, resetDebate, updateXP, setLanguage, setDebateTopic, setClassLevel, updateEngagement } = useMainStore();

  // Configuration settings
  const [selectedCategory, setSelectedCategory] = useState<'science' | 'society' | 'environment'>('science');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [personalityMode, setPersonalityMode] = useState('Competitive Debater');
  
  // Real-time voice parameters
  const [argumentInput, setArgumentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPlayingAIAudio, setIsPlayingAIAudio] = useState(false);
  const [aiEmotion, setAiEmotion] = useState<'happy' | 'encouraging' | 'empathetic' | 'skeptical' | 'excited' | 'serious'>('serious');
  
  // Safe feedback default state
  const [feedback, setFeedback] = useState<any>({
    strengths: ["Clear argument presentation."],
    weaknesses: ["Add specific local statistics."],
    grammarMistakes: [],
    fillerWords: [],
    tips: ["State your core thesis statement early."]
  });

  // Game flow states
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [roundCount, setRoundCount] = useState(1);
  const [showEndReport, setShowEndReport] = useState(false);
  
  // Mic & transcription analytics
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speakStartTime, setSpeakStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [speechConfidence, setSpeechConfidence] = useState(100);

  // Live metrics during speaking (rendered dynamically)
  const [liveScores, setLiveScores] = useState<Record<string, number>>({
    logic: 0, grammar: 0, confidence: 0, reasoning: 0, communication: 0,
    pronunciation: 0, fluency: 0, vocabulary: 0, punctuation: 0, criticalThinking: 0
  });

  // Audio Context Ref variables
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  
  // SpeechRecognition refs
  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  // Synchronous state refs to completely bypass closures race conditions
  const isListeningRef = useRef(isListening);
  const speakStartTimeRef = useRef(speakStartTime);
  const argumentInputRef = useRef(argumentInput);
  const loadingRef = useRef(loading);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { speakStartTimeRef.current = speakStartTime; }, [speakStartTime]);
  useEffect(() => { argumentInputRef.current = argumentInput; }, [argumentInput]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Turn timer interval
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Trigger submission when time runs out
  useEffect(() => {
    if (timeLeft === 0) {
      setTimerActive(false);
      handleSubmitArgument();
    }
  }, [timeLeft]);

  // Synchronized Socket.IO connections
  useEffect(() => {
    debugLog("Initializing Socket.io telemetry channel");
    const socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000
    });
    socketRef.current = socket;
    
    socket.emit('join_debate_room', { room: debate.room });

    socket.on('receive_debate_transcript', (data: any) => {
      debugLog("Classmate speech transcript received", data);
      addDebateArgument('student', `[Classmate]: ${data.text}`);
    });

    socket.on('disconnect', () => {
      debugLog("Socket channel disconnected. Retrying heartbeat connection...");
    });

    return () => {
      debugLog("Disconnecting socket session and canceling voice speech");
      socket.disconnect();
      window.speechSynthesis.cancel();
      stopAudioAnalyser();
    };
  }, []);

  // Audio levels visualizer initiator
  const startAudioAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      return true;
    } catch (err) {
      console.error("Microphone device grab failed:", err);
      setMicError("Microphone permission blocked. Please enable it in browser settings.");
      return false;
    }
  };

  const stopAudioAnalyser = () => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    micStreamRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
  };

  // Synchronous stop block to prevent SpeechRecognition auto-start loop
  const stopMicrophoneAndAnalyser = () => {
    debugLog("Halting Speech recognition loop");
    isListeningRef.current = false; // block onend auto-start!
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    stopAudioAnalyser();
    setTimerActive(false);
  };

  // Toggle Microphone recognition
  const toggleMic = async () => {
    if (isListening) {
      stopMicrophoneAndAnalyser();
    } else {
      setMicError(null);
      const isAllowed = await startAudioAnalyser();
      if (!isAllowed) return;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicError("Web Speech Recognition not supported in this browser. Try Chrome.");
        stopAudioAnalyser();
        return;
      }

      debugLog("Starting SpeechRecognition in medium language locale code");
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      const langOpt = INDIAN_LANGUAGES.find(l => l.code === language) || { locale: 'en-IN' };
      rec.lang = langOpt.locale;

      rec.onstart = () => {
        setIsListening(true);
        setSpeakStartTime(Date.now());
        setSpeechConfidence(100);
        setWpm(0);
        setTimerActive(true);
        setTimeLeft(60);
      };

      rec.onresult = (e: any) => {
        let interimText = '';
        let finalTrans = '';
        let confidences: number[] = [];

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const trans = e.results[i][0].transcript;
          confidences.push(e.results[i][0].confidence || 0.9);
          if (e.results[i].isFinal) {
            finalTrans += trans + ' ';
          } else {
            interimText += trans;
          }
        }

        const fullTrans = (finalTrans + interimText).trim();
        setArgumentInput(fullTrans);

        // Update confidence
        if (confidences.length > 0) {
          const avgConf = Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100);
          setSpeechConfidence(avgConf);
        }

        // Live WPM calculation
        const wordsArr = fullTrans.split(/\s+/).filter(Boolean);
        const wordCountVal = wordsArr.length;
        const durationSec = (Date.now() - (speakStartTimeRef.current || Date.now())) / 1000;
        const currentWpm = durationSec > 2 ? Math.round((wordCountVal / durationSec) * 60) : 0;
        setWpm(Math.min(currentWpm, 250)); 

        // Update live scores
        setLiveScores({
          logic: Math.min(Math.max(45 + wordCountVal * 1.5, 30), 92),
          grammar: Math.min(Math.max(75 - (fullTrans.includes(' um ') || fullTrans.includes(' like ') ? 8 : 0), 30), 95),
          confidence: Math.min(Math.max(50 + Math.min(currentWpm / 2, 40), 30), 98),
          fluency: Math.min(Math.max(60 + Math.min(currentWpm / 2.5, 35) - (fullTrans.includes(' um ') ? 10 : 0), 30), 95),
          punctuation: fullTrans.includes('.') || fullTrans.includes('?') ? 90 : 60,
          vocabulary: Math.min(Math.max(55 + wordCountVal * 0.8, 30), 90),
          criticalThinking: Math.min(Math.max(50 + wordCountVal * 1.2, 30), 92),
          reasoning: Math.min(Math.max(48 + wordCountVal * 1.3, 30), 90),
          communication: Math.min(Math.max(50 + wordCountVal, 30), 94),
          pronunciation: 85
        });

        // Share transcription with classmates
        if (socketRef.current) {
          socketRef.current.emit('send_debate_transcript', {
            room: debate.room,
            user: user?.name || "Student",
            text: fullTrans
          });
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        if (err.error === 'no-speech') return;
        setMicError(`Speech Recognition Error: ${err.error}`);
        stopMicrophoneAndAnalyser();
      };

      rec.onend = () => {
        // Auto-restart if and only if isListeningRef is still active (prevents timeout dropouts)
        if (isListeningRef.current && recognitionRef.current) {
          try {
            debugLog("Auto-restarting speech engine on browser timeout limit");
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
          }
        } else {
          setIsListening(false);
          stopAudioAnalyser();
        }
      };

      recognitionRef.current = rec;
      rec.start();
    }
  };

  // Text-To-Speech engine
  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', 
      mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', 
      ur: 'ur-IN', or: 'or-IN', as: 'as-IN', sa: 'sa-IN', ne: 'ne-NP'
    };
    utterance.lang = langCodes[language] || 'en-IN';
    utterance.rate = 0.95;

    // Find matches
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(langCodes[language] || 'en-IN'));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setIsPlayingAIAudio(false);
    utterance.onerror = () => setIsPlayingAIAudio(false);
    
    setIsPlayingAIAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Submit User Argument
  const handleSubmitArgument = async () => {
    const userText = argumentInputRef.current.trim();
    if (!userText || loadingRef.current) return;
    
    stopMicrophoneAndAnalyser();
    setArgumentInput('');
    setLoading(true);

    debugLog("Submitting argument", userText);
    addDebateArgument('student', userText);

    // Create abort controller for 12s fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('http://localhost:5000/api/learning/debate/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          userArgument: userText,
          topic: debate.activeTopic,
          position: debate.userPosition,
          language,
          history: debate.argumentsList,
          personalityMode
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Server Error ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        debugLog("Response received from orchestration server", data);
        
        // Add AI counterargument and metrics (highly sanitized values)
        addDebateArgument('ai', data.counterArgument || "Interesting point.");
        
        setDebateScores(data.scores || {
          logic: 75, grammar: 75, confidence: 75, reasoning: 75, communication: 75,
          pronunciation: 75, fluency: 75, vocabulary: 75, punctuation: 75, criticalThinking: 75
        });

        setFeedback(data.feedback || {
          strengths: ["Clear argument presentation."],
          weaknesses: ["Could expand with examples."],
          grammarMistakes: [],
          fillerWords: [],
          tips: ["Structure your argument clearly."]
        });
        
        if (data.emotion) {
          setAiEmotion(data.emotion);
        }

        // Award regular + bonus XP and boost focus
        updateXP(35 + 30); 
        updateEngagement(100, 0.28, false);
        speakText(data.counterArgument || "Let us continue.");
        setRoundCount(prev => prev + 1);
      } else {
        throw new Error("Server returned success=false");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.warn("Orchestration API call failed, falling back to local simulation:", e);

      // Local front-end fallback simulator (guards against Gemini rate limits / Server offline)
      const words = userText.split(/\s+/).filter(Boolean);
      const wordCountVal = words.length;
      const fillersCount = (userText.match(/\b(um|uh|like|so|basically|actually)\b/gi) || []).length;
      
      let textResponse = "That is a point worth considering, but we must look at the resource limitations and practical infrastructure challenges we face.";
      let strengths = ["Good structured delivery."];
      let weaknesses = ["Needs specific supporting data."];
      
      if (language === 'hi') {
        textResponse = "इस बात पर विचार किया जा सकता है, लेकिन हमें जमीनी स्तर की व्यावहारिक कठिनाइयों और बजटीय सीमाओं पर ध्यान देना चाहिए।";
        strengths = ["तर्कों को संरचित और स्पष्ट तरीके से प्रस्तुत करने का अच्छा प्रयास।"];
        weaknesses = ["तर्क को साबित करने के लिए अधिक व्यावहारिक साक्ष्य की आवश्यकता है।"];
      }

      const fallbackScores = {
        logic: Math.min(Math.max(65 + wordCountVal, 30), 92),
        grammar: Math.min(Math.max(70 - fillersCount * 6, 30), 95),
        confidence: Math.min(Math.max(65 + Math.min(wpm / 2.5, 30), 30), 98),
        fluency: Math.min(Math.max(65 + Math.min(wpm / 3, 30) - fillersCount * 5, 30), 95),
        punctuation: userText.includes('.') || userText.includes('?') ? 90 : 60,
        vocabulary: Math.min(Math.max(60 + wordCountVal * 0.5, 30), 90),
        criticalThinking: Math.min(Math.max(55 + wordCountVal * 1.1, 30), 92),
        reasoning: Math.min(Math.max(50 + wordCountVal * 1.2, 30), 90),
        communication: Math.min(Math.max(55 + wordCountVal * 0.8, 30), 94),
        pronunciation: 85
      };

      addDebateArgument('ai', textResponse);
      setDebateScores(fallbackScores);
      setFeedback({
        strengths,
        weaknesses,
        grammarMistakes: fillersCount > 0 ? [{ original: fillersCount > 1 ? "filler phrases" : "filler word", corrected: "Use smooth silent pauses.", explanation: "Reduces speech filler rate." }] : [],
        fillerWords: fillersCount > 0 ? ["um"] : [],
        tips: ["State your core thesis statement early.", "Use regional examples to strengthen context."]
      });
      setAiEmotion('skeptical');
      // Award regular + bonus XP and boost focus
      updateXP(25 + 30);
      updateEngagement(100, 0.28, false);
      speakText(textResponse);
      setRoundCount(prev => prev + 1);
    } finally {
      setLoading(false);
      setTimeLeft(60);
    }
  };

  // Initialize custom debate with user's opening statement
  const handleStartDebate = async (openingText: string) => {
    const userText = openingText.trim();
    if (!userText || loadingRef.current) return;

    stopMicrophoneAndAnalyser();
    setArgumentInput('');
    setLoading(true);
    setMicError(null);

    // Create abort controller for 12s fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let success = false;
    let data: any = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        const response = await fetch('http://localhost:5000/api/learning/debate/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            userArgument: userText,
            language,
            history: [],
            personalityMode
          })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP Server Error ${response.status}`);
        }

        data = await response.json();
        if (data.success && data.extractedTopic && data.userStance) {
          success = true;
          break;
        } else {
          throw new Error("Invalid server response format");
        }
      } catch (e: any) {
        console.warn(`Debate initialization attempt ${attempts} failed:`, e);
        if (attempts >= maxAttempts) {
          clearTimeout(timeoutId);
          // Fall back to heuristic dynamic extraction locally
          let extractedTopic = "Whether " + userText;
          if (language === 'hi') {
            extractedTopic = "क्या " + userText;
          } else if (language === 'gu') {
            extractedTopic = "શું " + userText;
          } else if (language === 'bn') {
            extractedTopic = "কিনা " + userText;
          }
          data = {
            success: true,
            extractedTopic,
            userStance: 'Proposer',
            counterArgument: language === 'hi'
              ? "इस बात पर विचार किया जा सकता है, लेकिन हमें जमीनी स्तर की व्यावहारिक कठिनाइयों और बजटीय सीमाओं पर ध्यान देना चाहिए।"
              : "That is a point worth considering, but we must focus on the practical implementation challenges and the resource constraints we face.",
            scores: {
              logic: 75, grammar: 75, confidence: 75, reasoning: 75, communication: 75,
              pronunciation: 75, fluency: 75, vocabulary: 75, punctuation: 75, criticalThinking: 75
            },
            feedback: {
              strengths: ["Clear argument presentation."],
              weaknesses: ["Could expand with examples."],
              grammarMistakes: [],
              fillerWords: [],
              tips: ["Structure your argument clearly."]
            },
            emotion: 'skeptical'
          };
          success = true;
          break;
        }
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (success && data) {
      debugLog("Debate successfully initialized with topic", data.extractedTopic, "and stance", data.userStance);
      
      // Store topic and stance
      setDebateTopic(data.extractedTopic, data.userStance);
      
      // Add arguments
      addDebateArgument('student', userText);
      addDebateArgument('ai', data.counterArgument || "Interesting point.");
      
      // Set scores and feedback
      setDebateScores(data.scores || {
        logic: 75, grammar: 75, confidence: 75, reasoning: 75, communication: 75,
        pronunciation: 75, fluency: 75, vocabulary: 75, punctuation: 75, criticalThinking: 75
      });

      setFeedback(data.feedback || {
        strengths: ["Clear argument presentation."],
        weaknesses: ["Could expand with examples."],
        grammarMistakes: [],
        fillerWords: [],
        tips: ["Structure your argument clearly."]
      });

      if (data.emotion) {
        setAiEmotion(data.emotion);
      }

      // Award regular + bonus XP and boost focus
      updateXP(35 + 30);
      updateEngagement(100, 0.28, false);
      speakText(data.counterArgument || "Let us begin.");
      setRoundCount(1);
      setTimerActive(true);
      setTimeLeft(60);
    } else {
      setMicError("Failed to start debate. Please check your network and try again.");
    }
    setLoading(false);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsPlayingAIAudio(false);
    resetDebate();
    setRoundCount(1);
    setTimeLeft(60);
    setTimerActive(false);
    setLiveScores({
      logic: 0, grammar: 0, confidence: 0, reasoning: 0, communication: 0,
      pronunciation: 0, fluency: 0, vocabulary: 0, punctuation: 0, criticalThinking: 0
    });
    setShowEndReport(false);
    stopMicrophoneAndAnalyser();
    setIsListening(false);
  };

  if (debate.argumentsList.length === 0) {
    return (
      <div className="w-full min-h-screen max-w-7xl mx-auto px-6 py-6 flex flex-col space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
          <button 
            onClick={() => { window.speechSynthesis.cancel(); onNavigate('dashboard'); }}
            className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Arena</span>
          </button>

          <span className="font-outfit font-black text-cyber-pink tracking-widest uppercase flex items-center gap-1.5 text-sm">
            <MessageSquare className="w-4.5 h-4.5 animate-pulse" /> Multilingual AI Debate Arena
          </span>
          
          <button 
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1 border border-cyber-border hover:border-white rounded-lg transition-colors text-cyber-text/80 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        {/* ERROR MESSAGE NOTIFICATION */}
        {micError && (
          <div className="p-3 bg-cyber-pink/20 border border-cyber-pink/50 rounded-xl text-xs font-mono text-cyber-pink flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT SIDE: 3D Hologram Teacher & Status */}
          <div className="lg:col-span-5 flex flex-col space-y-6 justify-center">
            <div className="glass-panel p-2.5 rounded-2xl border border-cyber-border/40 shadow-glass bg-black/35 h-[340px]">
              <AvatarTeacher 
                isSpeaking={isPlayingAIAudio || loading} 
                emotionState={loading ? 'skeptical' : isListening ? 'happy' : 'serious'} 
                speechIntensity={0.65} 
              />
            </div>
            
            <div className="glass-panel p-4 rounded-xl border border-cyber-border/30 text-center font-mono text-xs text-cyber-text/80">
              {loading ? (
                <div className="space-y-2">
                  <div className="flex justify-center gap-1">
                    <span className="w-1.5 h-1.5 bg-cyber-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-cyber-pink font-bold animate-pulse">VIDYA AI is analyzing your statement and extracting the topic...</p>
                </div>
              ) : isListening ? (
                <p className="text-cyber-cyan animate-pulse">Listening... Speak your opening statement.</p>
              ) : (
                <p className="text-cyber-text/60">Hologram Standby. Set up your debate and speak/type to begin.</p>
              )}
            </div>

            {/* Focus Companions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <EngagementTracker />
              <PomodoroTimer inline={true} />
            </div>
          </div>

          {/* RIGHT SIDE: SETUP SETTINGS & STATEMENT INPUT */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-cyber-border/40 bg-black/25 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-outfit font-black text-white tracking-wide uppercase border-b border-cyber-border/20 pb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyber-cyan" /> Configure Debate
              </h2>

              {/* Selectors grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <span className="text-[10px] font-mono text-cyber-text/50 uppercase">Debate Language</span>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-black/60 border border-cyber-border/60 p-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
                  >
                    {INDIAN_LANGUAGES.map(langOpt => (
                      <option key={langOpt.code} value={langOpt.code}>{langOpt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <span className="text-[10px] font-mono text-cyber-text/50 uppercase">Opponent Mode</span>
                  <select 
                    value={personalityMode}
                    onChange={(e) => setPersonalityMode(e.target.value)}
                    className="bg-black/60 border border-cyber-border/60 p-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
                  >
                    {PERSONALITY_MODES.map(mode => (
                      <option key={mode.id} value={mode.id}>{mode.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <span className="text-[10px] font-mono text-cyber-text/50 uppercase">Class Level</span>
                  <select 
                    value={useMainStore.getState().classLevel}
                    onChange={(e) => useMainStore.getState().setClassLevel(Number(e.target.value))}
                    className="bg-black/60 border border-cyber-border/60 p-2.5 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map(clNum => (
                      <option key={clNum} value={clNum}>Class {clNum}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Suggested Topics section */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-cyber-text/50 uppercase block">Suggested Topics By Category</span>
                
                {/* Tabs */}
                <div className="flex gap-2 border-b border-cyber-border/10 pb-2">
                  {STUDY_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all border cursor-pointer ${
                        selectedCategory === cat.id 
                          ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan font-bold'
                          : 'border-cyber-border/30 hover:border-cyber-text/40 text-cyber-text/70'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Topic Chips */}
                <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
                  {SUGGESTED_TOPICS_BY_CATEGORY[selectedCategory].map((topicText, idx) => (
                    <button
                      key={idx}
                      onClick={() => setArgumentInput(topicText)}
                      className="px-3 py-2 text-left bg-black/45 border border-cyber-border/30 hover:border-cyber-blue rounded-xl text-xs font-mono text-cyber-text/90 hover:text-white transition-all max-w-full truncate cursor-pointer"
                    >
                      {topicText}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Opening statement speech/text section */}
            <div className="space-y-3 pt-4 border-t border-cyber-border/20">
              <span className="text-[10px] font-mono text-cyber-text/50 uppercase block">Opening Statement / Topic Statement</span>
              
              {isListening && analyserRef.current && (
                <AudioVisualizer analyser={analyserRef.current} />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-4 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                    isListening 
                      ? 'bg-cyber-pink border-cyber-pink text-white animate-pulse shadow-glow-pink'
                      : 'bg-black/55 border-cyber-border/80 text-cyber-cyan hover:border-cyber-cyan'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <textarea
                  placeholder="Speak or type any statement or topic to begin... (e.g. 'AI is dangerous for agriculture.')"
                  value={argumentInput}
                  onChange={(e) => setArgumentInput(e.target.value)}
                  rows={2}
                  className="flex-1 bg-black/45 border border-cyber-border/80 p-3 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-blue placeholder-cyber-text/20 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStartDebate(argumentInput)}
                disabled={!argumentInput.trim() || loading}
                className="w-full py-4 bg-gradient-to-r from-cyber-blue to-cyber-purple hover:opacity-90 disabled:opacity-50 text-black font-outfit font-black tracking-widest text-xs uppercase rounded-xl transition-all shadow-glow-blue cursor-pointer flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Analyzing Statement...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4.5 h-4.5 text-black" />
                    <span>Start Debate 🤺</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-6 py-6 flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs no-print">
        <button 
          onClick={() => { window.speechSynthesis.cancel(); onNavigate('dashboard'); }}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arena</span>
        </button>

        <span className="font-outfit font-black text-cyber-pink tracking-widest uppercase flex items-center gap-1.5 text-sm">
          <MessageSquare className="w-4.5 h-4.5 animate-pulse" /> Multilingual AI Debate Arena
        </span>

        <button 
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1 border border-cyber-border hover:border-white rounded-lg transition-colors text-cyber-text/80 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* ERROR MESSAGE NOTIFICATION */}
      {micError && (
        <div className="p-3 bg-cyber-pink/20 border border-cyber-pink/50 rounded-xl text-xs font-mono text-cyber-pink flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* TOP CONFIGURATION ROW (no-print) */}
      <div className="glass-panel p-4 rounded-xl border border-cyber-border/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-center no-print">
        {/* Debate Mode / Personality */}
        <div className="flex flex-col space-y-1">
          <span className="text-[9px] font-mono text-cyber-text/50 uppercase">Opponent Mode</span>
          <select 
            value={personalityMode}
            onChange={(e) => setPersonalityMode(e.target.value)}
            className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
          >
            {PERSONALITY_MODES.map(mode => (
              <option key={mode.id} value={mode.id}>{mode.name}</option>
            ))}
          </select>
        </div>

        {/* Language Selector */}
        <div className="flex flex-col space-y-1">
          <span className="text-[9px] font-mono text-cyber-text/50 uppercase">Instruction Medium</span>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-black/50 border border-cyber-border/70 p-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-purple cursor-pointer"
          >
            {INDIAN_LANGUAGES.map(langOpt => (
              <option key={langOpt.code} value={langOpt.code}>{langOpt.name}</option>
            ))}
          </select>
        </div>

        {/* Grade level and Stance details */}
        <div className="flex justify-around items-center border border-cyber-border/20 p-2 rounded-xl bg-black/30 font-mono text-[10px]">
          <div className="text-center">
            <span className="text-cyber-text/40 uppercase block">Class level</span>
            <span className="text-white font-bold">Class {useMainStore.getState().classLevel}</span>
          </div>
          <div className="w-[1px] h-6 bg-cyber-border/20" />
          <div className="text-center">
            <span className="text-cyber-text/40 uppercase block">Your Stance</span>
            <span className={`font-bold ${debate.userPosition === 'Proposer' ? 'text-cyber-cyan' : 'text-cyber-pink'}`}>
              {debate.userPosition}
            </span>
          </div>
        </div>
      </div>

      {/* TOPIC BAR & ROUND DISPLAY */}
      <div className="glass-panel p-4 rounded-xl border border-cyber-border/30 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-glass">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-cyber-cyan" />
          <span className="text-cyber-text/50 uppercase">Active Topic:</span>
          <span className="text-white font-bold">{debate.activeTopic}</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-cyber-blue/10 border border-cyber-blue/30 px-3 py-1 rounded-lg text-cyber-cyan font-bold">
            Round: {roundCount} / 3
          </div>
          <div className="flex items-center space-x-1.5 bg-cyber-pink/15 px-3 py-1 rounded-lg border border-cyber-pink/30 text-cyber-pink font-bold">
            <Timer className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: USER SPEECH LOGS, WAVEFORM, LIVE SCORES */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* USER PROFILE & TRANSCRIPTS BOX */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col h-[400px] justify-between relative bg-black/20">
            <div className="flex justify-between items-center border-b border-cyber-border/20 pb-2.5">
              <span className="text-[10px] font-mono text-cyber-blue uppercase font-bold flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyber-blue" /> User Debate Console
              </span>
              {isListening && (
                <span className="text-[9px] font-mono bg-cyber-pink/20 border border-cyber-pink/50 text-cyber-pink px-2 py-0.5 rounded animate-pulse font-bold">
                  LIVE TRANSCRIBING
                </span>
              )}
            </div>

            {/* Conversation transcript feeds */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono text-xs pr-1.5 custom-scrollbar">
              {debate.argumentsList.map((arg, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col space-y-1.5 ${
                    arg.speaker === 'student'
                      ? 'bg-cyber-blue/5 border-cyber-blue/25 text-left'
                      : 'bg-cyber-purple/5 border-cyber-purple/25 text-left'
                  }`}
                >
                  <span className={`text-[8.5px] font-bold uppercase tracking-wider ${
                    arg.speaker === 'student' ? 'text-cyber-cyan' : 'text-cyber-purple'
                  }`}>
                    {arg.speaker === 'student' ? `${user?.name || 'Aarav'} (Student)` : `AI Opponent (${personalityMode})`}
                  </span>
                  <p className="text-cyber-text/95 mt-0.5 leading-relaxed text-[11.5px]">{arg.text}</p>
                </div>
              ))}
              {loading && (
                <div className="p-3.5 bg-black/40 border border-cyber-purple/30 rounded-xl flex flex-col space-y-2 text-[10px] text-cyber-cyan font-mono animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-purple rounded-full animate-ping"></div>
                    <span className="font-bold text-white uppercase tracking-wider">VIDYA AI is preparing a counterargument...</span>
                  </div>
                  <div className="w-full h-1 bg-cyber-purple/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-cyber-cyan animate-pulse" style={{ animationDuration: '1s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Live transcribing indicators */}
            {isListening && (
              <div className="py-2 px-3 bg-black/40 border border-cyber-border/30 rounded-xl flex justify-between items-center text-[9px] font-mono text-cyber-text/80 mb-2">
                <span>Fluency WPM: <strong className="text-cyber-cyan">{wpm} WPM</strong></span>
                <span>Confidence: <strong className="text-cyber-yellow">{speechConfidence}%</strong></span>
                <span>Filler words: <strong className="text-cyber-pink">{(argumentInput.match(/\b(um|uh|like|so|basically)\b/gi) || []).length}</strong></span>
              </div>
            )}

            {/* Voice controls */}
            <div className="space-y-3 pt-3 border-t border-cyber-border/20 no-print">
              {isListening && analyserRef.current && (
                <AudioVisualizer analyser={analyserRef.current} />
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-3 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                    isListening 
                      ? 'bg-cyber-pink border-cyber-pink text-white animate-pulse shadow-glow-pink'
                      : 'bg-black/55 border-cyber-border/80 text-cyber-cyan hover:border-cyber-cyan'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <input
                  type="text"
                  placeholder="Or compose arguments using the keyboard here..."
                  value={argumentInput}
                  onChange={(e) => setArgumentInput(e.target.value)}
                  className="flex-1 bg-black/45 border border-cyber-border/80 p-3 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-blue placeholder-cyber-text/20 animate-pulse-border"
                />

                <button
                  type="button"
                  onClick={handleSubmitArgument}
                  disabled={!argumentInput.trim() || loading}
                  className="p-3 bg-cyber-blue hover:opacity-90 disabled:opacity-50 text-black rounded-xl font-bold cursor-pointer transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* LIVE METRICS GAUGE PANEL */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
                <BarChart2 className="w-4 h-4" /> Live Argument Scoring
              </h3>
              
              <div className="flex-1 flex flex-col justify-center space-y-4 pt-3 font-mono">
                {/* Circular overall progress */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle 
                        cx="32" 
                        cy="32" 
                        r="28" 
                        fill="none" 
                        stroke="#00f2fe" 
                        strokeWidth="4" 
                        strokeDasharray={175} 
                        strokeDashoffset={175 - (175 * ((isListening ? liveScores.communication : debate?.scores?.communication) || 0)) / 100}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-white">
                      {(isListening ? liveScores.communication : debate?.scores?.communication) || 0}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Overall Communication</h4>
                    <p className="text-[9px] text-cyber-text/50">Dynamic speech & argument weight metric.</p>
                  </div>
                </div>

                {/* Fluency indicator */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyber-text/80">Grammar & Syntax Structure</span>
                    <span className="text-white font-bold">{(isListening ? liveScores.grammar : debate?.scores?.grammar) || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyber-purple transition-all duration-500" 
                      style={{ width: `${(isListening ? liveScores.grammar : debate?.scores?.grammar) || 0}%` }}
                    />
                  </div>
                </div>

                {/* Logic stability */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyber-text/80">Argument Logic & Reasoning</span>
                    <span className="text-white font-bold">{(isListening ? liveScores.logic : debate?.scores?.logic) || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyber-cyan transition-all duration-500" 
                      style={{ width: `${(isListening ? liveScores.logic : debate?.scores?.logic) || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Radar chart visualizer */}
            <div className="flex flex-col items-center justify-center p-2 bg-black/20 border border-cyber-border/10 rounded-xl">
              <span className="text-[8px] font-mono text-cyber-text/40 uppercase tracking-widest mb-1.5">Scoring Radar Matrix</span>
              <RadarChart scores={isListening ? liveScores : debate?.scores} />
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: 3D AI OPPONENT AVATAR & FEEDBACK PANEL */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* 3D HOLOGRAM AVATAR CARD */}
          <div className="glass-panel p-2.5 rounded-2xl border border-cyber-border/40 shadow-glass bg-black/35 h-[320px]">
            <AvatarTeacher 
              isSpeaking={isPlayingAIAudio || loading} 
              emotionState={loading ? 'skeptical' : isPlayingAIAudio ? aiEmotion : 'serious'} 
              speechIntensity={0.65} 
            />
          </div>

          {/* AI DIALOGUE FEEDBACK & GRAMMAR SLIPS */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Brain className="w-4 h-4" /> Live Linguistic Feedback
            </h3>

            {/* Grammar slips logs */}
            <div className="space-y-3 font-mono text-xs">
              {/* Filler Words */}
              <div>
                <span className="text-[9px] text-cyber-text/50 uppercase">Detected Filler Phrases</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(feedback?.fillerWords?.length || 0) === 0 ? (
                    <span className="text-[10px] text-cyber-green font-bold">✓ Zero filler words detected (Excellent fluency!)</span>
                  ) : (
                    feedback?.fillerWords?.map((wVal: string, wIdx: number) => (
                      <span key={wIdx} className="px-2 py-0.5 rounded bg-cyber-pink/20 border border-cyber-pink/40 text-cyber-pink text-[9px] font-bold">
                        "{wVal}"
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Grammar Corrections */}
              <div>
                <span className="text-[9px] text-cyber-text/50 uppercase">Structural Grammar slips</span>
                <div className="space-y-2 mt-2">
                  {(feedback?.grammarMistakes?.length || 0) === 0 ? (
                    <div className="flex items-center gap-1.5 text-cyber-green text-[10px]">
                      <CheckCircle className="w-3.5 h-3.5" /> Correct syntax and sentence structure.
                    </div>
                  ) : (
                    feedback?.grammarMistakes?.map((m: any, mIdx: number) => (
                      <div key={mIdx} className="p-2.5 rounded-lg bg-black/40 border border-cyber-border/30 text-[10px] space-y-1">
                        <div className="text-cyber-pink">❌ Incorrect: <span className="text-white italic">"{m.original}"</span></div>
                        <div className="text-cyber-green">✓ Corrected: <span className="text-white font-bold">"{m.corrected}"</span></div>
                        <p className="text-cyber-text/60 text-[9px] mt-0.5">{m.explanation}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tips & Recommendations */}
              <div className="pt-2 border-t border-cyber-border/10">
                <span className="text-[9px] text-cyber-text/50 uppercase">Strengths & tips</span>
                <ul className="list-disc pl-4 mt-1.5 text-[10.5px] text-cyber-text/80 space-y-1.5">
                  {feedback?.strengths?.slice(0, 2).map((str: string, sIdx: number) => (
                    <li key={sIdx}><strong className="text-cyber-cyan">Strength:</strong> {str}</li>
                  ))}
                  {feedback?.tips?.slice(0, 2).map((tp: string, tIdx: number) => (
                    <li key={tIdx}><strong className="text-cyber-purple">Tip:</strong> {tp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* End Debate button trigger */}
            {roundCount > 2 && (
              <button
                type="button"
                onClick={() => { window.speechSynthesis.cancel(); setShowEndReport(true); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-pink hover:opacity-90 font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-glow-purple cursor-pointer text-center text-white"
              >
                🏆 End Debate & View Analytics
              </button>
            )}
          </div>

          {/* Focus Companions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EngagementTracker />
            <PomodoroTimer inline={true} />
          </div>

        </div>

      </main>

      {/* POST-DEBATE REPORT SCREEN MODAL */}
      {showEndReport && (
        <div className="fixed inset-0 bg-[#03001e]/85 backdrop-blur-lg z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="glass-panel p-8 rounded-2xl border border-cyber-border/40 w-full max-w-3xl shadow-glow-purple space-y-6 bg-black/40 text-left font-mono">
            <div className="flex justify-between items-center border-b border-cyber-border/20 pb-4">
              <h2 className="text-lg font-outfit font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-6 h-6 text-cyber-purple" /> POST-DEBATE TELEMETRY MATRIX
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple text-xs font-bold font-mono">
                DEBATE COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-cyber-cyan uppercase border-b border-cyber-border/10 pb-1 flex items-center gap-1">
                  <BarChart2 className="w-4 h-4" /> Skills Matrix
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 p-4 rounded-xl border border-cyber-border/20">
                  <div>
                    <span className="text-[10px] text-cyber-text/50">LOGICAL SCORE</span>
                    <p className="text-lg font-bold text-white">{debate?.scores?.logic || 0}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyber-text/50">GRAMMAR SLOPS</span>
                    <p className="text-lg font-bold text-cyber-purple">{debate?.scores?.grammar || 0}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyber-text/50">VOICE CONFIDENCE</span>
                    <p className="text-lg font-bold text-cyber-pink">{debate?.scores?.confidence || 0}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyber-text/50">CRITICAL THINKING</span>
                    <p className="text-lg font-bold text-cyber-cyan">{debate?.scores?.criticalThinking || 0}%</p>
                  </div>
                </div>
                <div className="bg-black/20 p-2 border border-cyber-border/10 rounded-xl flex justify-center">
                  <RadarChart scores={debate?.scores} />
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-cyber-pink uppercase border-b border-cyber-border/10 pb-1 flex items-center gap-1">
                    <Brain className="w-4 h-4" /> Linguistic Verdict
                  </h3>
                  
                  <div className="mt-3 text-xs space-y-3">
                    <div className="p-3 bg-cyber-blue/5 border border-cyber-blue/20 rounded-xl">
                      <strong className="text-cyber-cyan text-[11px] block">Strengths:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-cyber-text/90">
                        {feedback?.strengths?.map((str: string, idx: number) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-cyber-pink/5 border border-cyber-pink/20 rounded-xl">
                      <strong className="text-cyber-pink text-[11px] block">Areas for Improvement:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-cyber-text/90">
                        {feedback?.weaknesses?.map((weak: string, idx: number) => (
                          <li key={idx}>{weak}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-cyber-border/20 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-cyber-pink" /> Streak Awarded</span>
                    <span className="text-white font-bold">5 Days Active!</span>
                  </div>
                  <div className="p-3 bg-black/40 border border-cyber-border/20 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-cyber-purple font-bold">LEVEL {user?.level || 4} GRADUATION XP</span>
                      <span className="text-cyber-cyan font-bold">{user?.xp || 1250} / 1600 XP</span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyber-purple to-cyber-cyan transition-all duration-1000" 
                        style={{ width: `${((user?.xp || 1250) % 400) / 400 * 100}%` }}
                      />
                    </div>
                    <p className="text-[8.5px] text-cyber-text/50 text-center italic mt-1">
                      +100 XP gained from this debate! Level badge 'Debate Champion' remains active.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/30 border border-cyber-border/20 p-4 rounded-xl space-y-3">
              <span className="text-[10px] font-bold text-cyber-cyan uppercase tracking-widest flex items-center gap-1.5">
                🏆 Class 8 Leaderboard Rankings (Mock Peer Comparison)
              </span>
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono border-t border-cyber-border/10 pt-2 text-cyber-text/50">
                <div className="text-cyber-cyan font-bold">RANK 1: Aarav Sharma (You) • 1350 XP</div>
                <div>RANK 2: Rohan Verma • 1200 XP</div>
                <div>RANK 3: Priyanjali Sen • 1150 XP</div>
                <div>RANK 4: Sneha Patel • 980 XP</div>
                <div>RANK 5: Vikram Rao • 940 XP</div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-cyber-border/20">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border border-cyber-border hover:border-white text-white font-bold text-xs uppercase cursor-pointer"
              >
                Debate Again
              </button>
              <button
                type="button"
                onClick={() => { window.speechSynthesis.cancel(); onNavigate('dashboard'); }}
                className="px-5 py-2.5 rounded-xl bg-cyber-purple hover:opacity-90 text-white font-bold text-xs uppercase shadow-glow-purple cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const DebateArena: React.FC<DebateArenaProps> = ({ onNavigate }) => {
  return (
    <DebateErrorBoundary>
      <DebateArenaContent onNavigate={onNavigate} />
    </DebateErrorBoundary>
  );
};
