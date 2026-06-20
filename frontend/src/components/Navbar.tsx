import React, { useState } from 'react';
import { useMainStore } from '../store/mainStore';
import { LANGUAGES } from '../store/translations';
import { 
  Search, Bell, Languages as LangIcon, ShieldCheck, 
  Menu, Cpu, Sparkles 
} from 'lucide-react';

interface NavbarProps {
  onMenuTrigger: () => void;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuTrigger,
  onNavigate
}) => {
  const { language, setLanguage } = useMainStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, text: "Feynman score increased to 92%", time: "5m ago" },
    { id: 2, text: "Claim daily streak reward (+150 XP)", time: "2h ago" },
    { id: 3, text: "Dr. Priyamvada Sen posted a new Crop Science homework worksheet", time: "1d ago" }
  ];

  return (
    <header className="glass-panel border-b border-cyber-border/40 h-16 w-full flex items-center justify-between px-6 z-30 sticky top-0 bg-cyber-bg/75 backdrop-blur-md">
      
      {/* Search Bar / Hamburger */}
      <div className="flex items-center space-x-4 flex-1 max-w-md">
        <button 
          onClick={onMenuTrigger}
          className="md:hidden p-2 rounded-lg border border-cyber-border/60 text-cyber-text/80 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Command Search box */}
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-cyber-text/40" />
          <input
            type="text"
            placeholder="Search classes, debate cards... (Ctrl+K)"
            className="w-full bg-black/40 border border-cyber-border/60 pl-10 pr-4 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyber-blue placeholder-cyber-text/30"
          />
          <div className="absolute right-3 top-2.5 bg-cyber-card/80 border border-cyber-border/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyber-text/60 select-none">
            Ctrl+K
          </div>
        </div>
      </div>

      {/* Settings / Actions */}
      <div className="flex items-center space-x-4 font-mono text-xs select-none">
        
        {/* Connection Speed Status */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-cyber-blue/10 px-3 py-1 rounded-full border border-cyber-blue/20 text-cyber-blue text-[10px]">
          <Cpu className="w-3.5 h-3.5 animate-pulse" />
          <span>LLM: Llama 3.3 Active</span>
          <span className="text-cyber-text/40">•</span>
          <span className="text-cyber-cyan font-bold">12ms API latency</span>
        </div>

        {/* Language select */}
        <div className="flex items-center space-x-1">
          <LangIcon className="w-4 h-4 text-cyber-text/60" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent border-none text-[10px] text-cyber-cyan font-bold focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-cyber-bg text-cyber-text">{lang.name.split(' ')[0]}</option>
            ))}
          </select>
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg border border-cyber-border/40 hover:border-cyber-purple/80 text-cyber-text/60 hover:text-white transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyber-pink shadow-glow-purple"></span>
          </button>

          {/* Dropdown menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 glass-panel border border-cyber-border rounded-xl p-3 shadow-glass flex flex-col space-y-2.5 text-left bg-cyber-bg/95">
              <span className="text-[9px] font-bold text-cyber-purple uppercase tracking-widest border-b border-cyber-border/20 pb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Recent notifications
              </span>
              <div className="flex flex-col space-y-2 text-[10px]">
                {notifications.map(not => (
                  <div key={not.id} className="flex flex-col space-y-0.5 border-b border-cyber-border/10 pb-1.5 last:border-0 hover:text-cyber-blue transition-colors cursor-pointer">
                    <p className="text-cyber-text leading-relaxed">{not.text}</p>
                    <span className="text-[8px] text-cyber-text/40">{not.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shield verification */}
        <div 
          onClick={() => onNavigate('admin')}
          className="hidden sm:flex p-2 rounded-lg border border-cyber-border/40 hover:border-cyber-cyan text-cyber-cyan cursor-pointer transition-colors"
          title="Security diagnostics"
        >
          <ShieldCheck className="w-4 h-4" />
        </div>

      </div>

    </header>
  );
};
