import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { TRANSLATIONS } from '../store/translations';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { 
  Smile, Volume2, Sparkles, Wand2, Shield, Settings, Sliders 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AvatarStudioProps {
  onNavigate: (page: string) => void;
}

export const AvatarStudio: React.FC<AvatarStudioProps> = ({ onNavigate }) => {
  const { language, updateXP } = useMainStore();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [emotion, setEmotion] = useState<'happy' | 'encouraging' | 'empathetic' | 'skeptical' | 'excited' | 'serious'>('encouraging');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'robotic'>('female');
  const [pitch, setPitch] = useState(1.0);
  const [testingVoice, setTestingVoice] = useState(false);

  const triggerVoiceTest = () => {
    if (testingVoice) return;
    setTestingVoice(true);
    window.speechSynthesis.cancel();

    const texts: Record<string, string> = {
      en: "Voice calibration active. Holographic systems running at maximum clarity.",
      hi: "आवाज अंशांकन सक्रिय है। होलोग्राफिक सिस्टम अधिकतम स्पष्टता पर चल रहे हैं।"
    };

    const utterance = new SpeechSynthesisUtterance(texts[language] || texts.en);
    utterance.pitch = voiceGender === 'robotic' ? 0.4 : voiceGender === 'male' ? 0.8 : 1.2;
    utterance.rate = pitch;

    const langCodes: Record<string, string> = {
      en: 'en-IN', hi: 'hi-IN'
    };
    utterance.lang = langCodes[language] || 'en-IN';

    utterance.onend = () => setTestingVoice(false);
    utterance.onerror = () => setTestingVoice(false);

    window.speechSynthesis.speak(utterance);
    
    // Trigger visual confetti
    confetti({
      particleCount: 30,
      spread: 40,
      colors: ['#00f2fe', '#9b5de5']
    });
    updateXP(10); // Reward active tuning
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-cyber-border/20 pb-4">
        <div className="text-left font-mono">
          <span className="text-[10px] text-cyber-purple font-bold tracking-widest uppercase">Customization Core</span>
          <h1 className="font-outfit font-black text-2xl text-white mt-1">
            Avatar Customization Studio
          </h1>
        </div>
      </div>

      {/* WORKSPACE GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: 3D AVATAR PREVIEW */}
        <div className="lg:col-span-5 glass-panel p-3 rounded-2xl border border-cyber-border/40 shadow-glass bg-black/30 h-[420px] flex flex-col">
          <div className="flex-1 rounded-xl overflow-hidden bg-black/45">
            <AvatarTeacher isSpeaking={testingVoice} emotionState={emotion} speechIntensity={0.65} />
          </div>
        </div>

        {/* RIGHT COLUMN: CALIBRATION INPUTS */}
        <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
          
          {/* Shaders and emotions configuration */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Wand2 className="w-4 h-4 text-cyber-cyan" /> 1. Hologram Emotion Shaders
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              {[
                { id: 'encouraging', label: 'Encouraging (Cyan)', color: 'border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/10' },
                { id: 'happy', label: 'Happy (Green)', color: 'border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10' },
                { id: 'serious', label: 'Serious (Blue)', color: 'border-cyber-indigo/30 text-cyber-indigo hover:bg-cyber-indigo/10' },
                { id: 'excited', label: 'Excited (Pink)', color: 'border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink/10' },
                { id: 'skeptical', label: 'Skeptical (Purple)', color: 'border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple/10' },
                { id: 'empathetic', label: 'Empathetic (Yellow)', color: 'border-cyber-yellow/30 text-cyber-yellow hover:bg-cyber-yellow/10' }
              ].map(emo => (
                <button
                  key={emo.id}
                  onClick={() => setEmotion(emo.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-colors truncate ${
                    emotion === emo.id 
                      ? 'bg-cyber-card border-cyber-cyan text-white font-bold shadow-glow-cyan' 
                      : emo.color
                  }`}
                >
                  {emo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice calibration */}
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-purple flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Volume2 className="w-4 h-4 text-cyber-purple" /> 2. Audio Voice Calibrator
            </h3>

            {/* Gender switcher */}
            <div className="flex flex-col space-y-2">
              <span className="text-cyber-text/50">Voice Profile Gender:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'female', label: 'Female' },
                  { id: 'male', label: 'Male' },
                  { id: 'robotic', label: 'Futuristic AI' }
                ].map(gen => (
                  <button
                    key={gen.id}
                    onClick={() => setVoiceGender(gen.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      voiceGender === gen.id 
                        ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple font-bold shadow-glow-purple' 
                        : 'bg-black/40 border-cyber-border/50 text-cyber-text/70'
                    }`}
                  >
                    {gen.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch slider */}
            <div className="flex flex-col space-y-2 pt-2">
              <div className="flex justify-between">
                <span className="text-cyber-text/50">Synthesis Speed Rate:</span>
                <span className="text-cyber-cyan font-bold">{pitch}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-1 bg-black/60 rounded-full appearance-none cursor-pointer accent-cyber-purple"
              />
            </div>

            <button
              onClick={triggerVoiceTest}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-blue to-cyber-purple text-black font-outfit font-black uppercase text-xs tracking-widest flex items-center justify-center gap-1.5 shadow-glow-blue cursor-pointer"
            >
              <Volume2 className="w-4.5 h-4.5" /> Speak Test Sentence
            </button>
          </div>

        </div>

      </main>

    </div>
  );
};
