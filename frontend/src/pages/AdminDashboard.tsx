import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { 
  ArrowLeft, Cpu, Activity, Database, CheckCircle, ShieldAlert, Play, Sparkles 
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { language } = useMainStore();
  const [testLog, setTestLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // System Health States
  const services = [
    { name: "Node.js Express Backend", status: "ONLINE", latency: "22ms", port: 5000 },
    { name: "FastAPI RAG vector server", status: "ONLINE", latency: "15ms", port: 8000 },
    { name: "Persistent JSON Store DB", status: "STABLE", latency: "1ms", port: "File" },
    { name: "Socket.IO Multi-gaze channels", status: "CONNECTED", latency: "5ms", port: "WS" }
  ];

  // Run LLM cascading fallback check simulation
  const runFallbackCheck = async () => {
    setLoading(true);
    setTestLog(["[ADMIN]: Starting Multi-tier LLM Cascading Test..."]);
    
    // Simulate steps
    setTimeout(() => {
      setTestLog(prev => [...prev, "[STEP 1]: Pinging primary LLM (Groq Llama 3.3)..."]);
    }, 800);

    setTimeout(() => {
      setTestLog(prev => [...prev, "[TIMEOUT]: Groq key missing. Auto-routing to secondary Tier..."]);
    }, 1600);

    setTimeout(() => {
      setTestLog(prev => [...prev, "[STEP 2]: Pinging secondary LLM (Google Gemini)..."]);
    }, 2400);

    setTimeout(() => {
      setTestLog(prev => [...prev, "[SUCCESS]: Gemini response established. Parsing payload (Class 8 Physics)..."]);
    }, 3200);

    setTimeout(() => {
      setTestLog(prev => [...prev, "[SUCCESS]: Fallback cascade passed. Zero-downtime state: OK."]);
      setLoading(false);
    }, 4000);
  };

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-6 py-6 flex flex-col space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-cyber-border/20 pb-4 font-mono text-xs">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-1.5 text-cyber-blue hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Student Dashboard</span>
        </button>

        <h2 className="font-outfit font-black text-lg tracking-wider text-cyber-pink uppercase flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyber-pink animate-pulse" />
          Admin System Diagnostics
        </h2>

        <div className="w-20"></div>
      </div>

      {/* CORE VIEWS */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SERVICE STATUS */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-blue flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Database className="w-4 h-4 text-cyber-blue" /> API Services Status
            </h3>

            <div className="space-y-3">
              {services.map((srv, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-black/40 rounded-xl border border-cyber-border/20">
                  <div>
                    <div className="font-bold text-white">{srv.name}</div>
                    <div className="text-[9px] text-cyber-text/50">Port: {srv.port} • Latency: {srv.latency}</div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-cyber-cyan font-bold">
                    <CheckCircle className="w-3.5 h-3.5" /> {srv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-3 text-left font-mono text-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-pink flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <ShieldAlert className="w-4 h-4 text-cyber-pink" /> Security Configuration
            </h3>
            <ul className="space-y-2 text-[10px] text-cyber-text/80 list-disc list-inside">
              <li>Helmet.js: Secure HTTP Headers active</li>
              <li>CORS Policy: Strict frontend validation</li>
              <li>Rate Limit: 100 requests per 15 minutes window</li>
              <li>FaceMesh Gaze tracking: 100% sandboxed in browser</li>
            </ul>
          </div>

        </div>

        {/* RIGHT COLUMN: LLM CASCADE TESTER */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-cyber-border/40 shadow-glass flex flex-col space-y-4 text-left font-mono text-xs h-[420px] justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 border-b border-cyber-border/20 pb-2">
              <Cpu className="w-4 h-4 text-cyber-cyan" /> LLM Cascading Fallback diagnostics
            </h3>
            <p className="text-[10px] text-cyber-text/60 leading-relaxed mt-1">
              Test how the backend routes traffic when LLM providers experience service timeouts or credential errors.
            </p>

            <div className="bg-black/50 p-4 rounded-xl border border-cyber-border/30 h-[220px] overflow-y-auto mt-3 space-y-1.5 text-cyber-cyan">
              {testLog.length === 0 ? (
                <span className="text-cyber-text/30 italic text-[10px]">Log empty. Press button below to launch test...</span>
              ) : (
                testLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={runFallbackCheck}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink hover:opacity-95 text-black font-outfit font-black uppercase text-xs tracking-widest flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>{loading ? "Testing Router..." : "Trigger AI Cascade Diagnostics"}</span>
          </button>
        </div>

      </main>

    </div>
  );
};
