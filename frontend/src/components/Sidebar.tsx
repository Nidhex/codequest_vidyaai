import React from 'react';
import { 
  Home, LayoutDashboard, Volume2, Brain, 
  MessageSquare, User, Eye, LogOut,
  Trophy, Settings, ChevronLeft, ChevronRight, Sparkles, Presentation, ClipboardList
} from 'lucide-react';
import { useMainStore } from '../store/mainStore';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  setCollapsed
}) => {
  const { user, logout } = useMainStore();

  const SECTIONS: MenuSection[] = [
    {
      title: "Main",
      items: [
        { id: 'landing', label: 'Landing Page', icon: Home },
        { id: 'dashboard', label: 'Student Portal', icon: LayoutDashboard },
        { id: 'voice', label: 'AI Guru', icon: Volume2 }
      ]
    },
    {
      title: "Learning",
      items: [
        { id: 'feynman', label: 'Feynman Mode', icon: Brain },
        { id: 'debate', label: 'Debate Arena', icon: MessageSquare },
        { id: 'teacher', label: 'Lesson Planner', icon: Settings }
      ]
    },
    {
      title: "AI Tools",
      items: [
        { id: 'smartboard', label: 'AI Smart Board', icon: Presentation },
        { id: 'practice', label: 'Practice Zone', icon: ClipboardList },
        { id: 'analytics', label: 'Engagement AI', icon: Eye }
      ]
    },
    {
      title: "Gamification",
      items: [
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
      ]
    },
    {
      title: "Settings",
      items: [
        { id: 'settings', label: 'Settings & Prefs', icon: Settings }
      ]
    }
  ];

  // Dynamic menu filtering based on role
  const filteredSections = SECTIONS.map(section => {
    const items = section.items.filter(item => {
      if (user?.role === 'student') {
        if (item.id === 'teacher' || item.id === 'smartboard') {
          return false;
        }
      } else if (user?.role === 'teacher') {
        const studentOnlyItems = ['dashboard', 'voice', 'feynman', 'debate', 'practice', 'analytics', 'leaderboard', 'landing'];
        if (studentOnlyItems.includes(item.id)) {
          return false;
        }
      }
      return true;
    });
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  const handleLogout = () => {
    logout();
    onNavigate('welcome');
  };

  return (
    <aside 
      className={`glass-panel border-r border-cyber-border/40 h-screen transition-all duration-300 flex flex-col justify-between z-40 fixed left-0 top-0 bg-cyber-bg/90 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-cyber-border/20 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-blue to-cyber-purple flex items-center justify-center shadow-glow-blue">
              <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
            </div>
            <span className="font-outfit font-extrabold text-base tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-pink">
              VIDYA AI
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-blue to-cyber-purple flex items-center justify-center mx-auto shadow-glow-blue">
            <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg border border-cyber-border/50 hover:border-cyber-blue/80 text-cyber-text/60 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 select-none font-sans">
        {filteredSections.map((section, idx) => (
          <div key={idx} className="flex flex-col space-y-1">
            {!collapsed && (
              <span className="text-[9px] uppercase tracking-widest text-cyber-text/40 font-mono pl-3 mb-1 block">
                {section.title}
              </span>
            )}
            
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center space-x-3 p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyber-blue/15 border-cyber-blue text-cyber-blue font-bold shadow-glow-blue'
                      : 'bg-transparent border-transparent text-cyber-text/75 hover:bg-cyber-card hover:border-cyber-border/40 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-cyber-blue' : 'text-cyber-text/60'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile card & Logout */}
      <div className="p-3 border-t border-cyber-border/20 space-y-2">
        <button
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center rounded-xl p-2 bg-black/40 border border-cyber-border/10 hover:border-cyber-blue transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'space-x-3'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-cyber-purple/20 border border-cyber-purple/40 flex items-center justify-center text-xs">
            <User className="w-4 h-4 text-cyber-purple" />
          </div>
          {!collapsed && (
            <div className="text-left truncate font-mono">
              <div className="text-[10px] font-bold text-white leading-tight">{user?.name || "Anonymous"}</div>
              <span className="text-[8px] text-cyber-cyan font-bold tracking-widest uppercase">
                {user?.role === 'teacher' ? 'Teacher Node' : `Student Level ${user?.level || 1}`}
              </span>
            </div>
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center rounded-xl p-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-red-400 font-mono text-xs cursor-pointer transition-colors ${
            collapsed ? 'justify-center' : 'space-x-2'
          }`}
          title="Logout Account"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>LOG OUT</span>}
        </button>
      </div>
    </aside>
  );
};
