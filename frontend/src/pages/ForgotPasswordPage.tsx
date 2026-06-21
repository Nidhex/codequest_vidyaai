import React, { useState } from 'react';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered node email.');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate cyber mock validation
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-6 bg-[#03001e] overflow-hidden selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f1a3a_1px,transparent_1px),linear-gradient(to_bottom,#1f1a3a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      <div className="z-10 w-full max-w-md glass-panel p-8 rounded-3xl border border-cyan-500/20 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold font-outfit tracking-wide bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            RECOVER NODE
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-cyan-400/70 uppercase mt-2">
            Cognitive Node Signal Loss
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 font-mono text-xs animate-shake">
            <span>⚠️</span>
            <p className="flex-1 text-left leading-relaxed">{error}</p>
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-cyan-950/30 border border-cyan-400/30 rounded-2xl">
              <span className="text-4xl text-cyan-400">📡</span>
              <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-widest mt-3">
                Recovery Signal Dispatched
              </h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                We've routed a secure credentials validation passcode link to <strong className="text-white font-bold">{email}</strong>. Check your inbox folders to recalibrate access.
              </p>
            </div>
            
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-md transition-all duration-300 border border-cyan-400 cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-left">
              <label className="block text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1.5 ml-1">
                Registered Node (Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. aarav@gmail.com"
                disabled={loading}
                className="w-full bg-[#0a0a23]/60 border border-cyan-500/10 focus:border-cyan-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-widest font-black text-black bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-40 transition-all duration-300 border border-cyan-400 cursor-pointer flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Routing Signal...</span>
                </span>
              ) : (
                'DISPATCH SIGNAL'
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full py-2 bg-transparent text-gray-400 hover:text-cyan-400 font-mono text-xs transition-colors cursor-pointer"
            >
              Cancel Recovery
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
