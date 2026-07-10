import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Table, 
  Code, 
  Image as ImageIcon, 
  File, 
  Search, 
  RefreshCw, 
  PlusCircle, 
  LogOut,
  Sliders,
  ChevronRight,
  Database,
  Sun,
  Moon,
  Trophy,
  Shield,
  Award,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  AlertTriangle,
  X,
  LayoutGrid,
  ClipboardList,
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleDriveFile, ProjectFolder, AuthUser } from '../types';
import { getUserCivicProfile, getLeaderboard, CivicProfile, LeaderboardUser } from '../lib/gamification';

interface SidebarProps {
  folder: ProjectFolder | null;
  files: GoogleDriveFile[];
  selectedFileId: string | null;
  onSelectFile: (file: GoogleDriveFile) => void;
  onReload: () => void;
  onCreateSamples: () => void;
  isCreatingSamples: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  onSignOut: () => void;
  activeView: 'files' | 'metrics' | 'report' | 'impact';
  onChangeView: (view: 'files' | 'metrics' | 'report' | 'impact') => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onUrgentAlert?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// Framer Motion staggered list variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 26
    }
  }
};

export default function Sidebar({
  folder,
  files,
  selectedFileId,
  onSelectFile,
  onReload,
  onCreateSamples,
  isCreatingSamples,
  isLoading,
  user,
  onSignOut,
  activeView,
  onChangeView,
  darkMode,
  onToggleTheme,
  onUrgentAlert,
  isOpen,
  onClose
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profile, setProfile] = useState<CivicProfile>(() => getUserCivicProfile());
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(() => getLeaderboard());
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    setProfile(getUserCivicProfile());
    setLeaderboard(getLeaderboard());
  }, [user]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getUserCivicProfile());
      setLeaderboard(getLeaderboard());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    // Listen for storage changes as well
    const handleStorage = (e: StorageEvent) => {
      if (e.key.startsWith('urbanpulse_civic_profile_')) {
        handleProfileUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (mimeType === 'text/markdown' || ext === 'md') {
      return <FileText className="w-4 h-4 text-emerald-500" />;
    }
    if (mimeType === 'text/csv' || ext === 'csv') {
      return <Table className="w-4 h-4 text-indigo-500" />;
    }
    if (mimeType === 'application/json' || ext === 'json') {
      return <Code className="w-4 h-4 text-amber-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-rose-500" />;
    }
    return <File className="w-4 h-4 text-slate-400 dark:text-slate-500" />;
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileDisplayName = (name: string) => {
    let cleanName = name;
    const underscoreIdx = cleanName.indexOf('_');
    if (underscoreIdx !== -1 && cleanName.slice(0, underscoreIdx).includes('@')) {
      cleanName = cleanName.slice(underscoreIdx + 1);
    }
    cleanName = cleanName.replace(/\.[a-zA-Z0-9]+$/, '');
    if (name.toLowerCase().endsWith('.csv')) {
      cleanName += ' Report';
    } else if (name.toLowerCase().endsWith('.json')) {
      cleanName += ' Data';
    }
    return cleanName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const currentUserEmail = localStorage.getItem('urbanpulse_current_user_email') || '';
  const filteredFiles = files.filter(f => {
    const nameLower = f.name.toLowerCase();
    if (nameLower === 'readme.md') return false;
    
    const isImage = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png');
    if (isImage) {
      const underscoreIdx = f.name.indexOf('_');
      if (underscoreIdx !== -1) {
        const prefix = f.name.slice(0, underscoreIdx);
        if (prefix.includes('@')) {
          return prefix.toLowerCase() === currentUserEmail.toLowerCase();
        }
      }
      return false;
    }
    
    return nameLower.includes(searchQuery.toLowerCase());
  });

  return (
    <aside 
      id="sidebar-container" 
      className={`fixed inset-y-0 left-0 z-50 lg:z-auto lg:static w-80 border-r flex flex-col h-full shrink-0 select-none transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      } ${
        darkMode 
          ? 'bg-slate-950 border-slate-900 text-slate-100' 
          : 'bg-white border-slate-100 text-slate-800'
      }`}
    >
      <div className={`p-3 border-b transition-colors ${darkMode ? 'border-slate-900' : 'border-slate-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-lg transition-colors ${darkMode ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <FolderOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Active Workspace
              </h2>
              <div className="flex items-center gap-1">
                <p className={`text-xs font-semibold truncate max-w-[140px] transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {folder ? folder.name : 'No Folder Selected'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            <button
              onClick={onToggleTheme}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                darkMode 
                  ? 'hover:bg-slate-900 text-slate-400 hover:text-amber-400' 
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="sidebar-theme-toggle-btn"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button 
              onClick={onReload}
              disabled={isLoading || !folder}
              className={`p-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer ${
                darkMode 
                  ? 'hover:bg-slate-900 text-slate-400 hover:text-slate-200' 
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-850'
              }`}
              title="Refresh folder content"
              id="refresh-folder-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className={`lg:hidden p-1 rounded-lg transition-colors cursor-pointer ${
                darkMode
                  ? 'hover:bg-slate-900 text-slate-400 hover:text-slate-205'
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
              title="Close menu"
              id="mobile-sidebar-close-btn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {folder && (
          <div className="px-3 py-1.5 shrink-0">
            <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2 shadow-md">
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-8 h-8 rounded-xl object-cover border border-amber-500/40 shadow-inner"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-850 flex items-center justify-center text-xs font-bold uppercase">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border border-[#0B0F19] flex items-center justify-center shadow-md">
                    <Award className="w-2 h-2 text-slate-900 fill-slate-900/10" />
                  </div>
                </div>
                
                <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                  <h3 className="text-[11px] font-black text-slate-100 font-sans tracking-wide truncate">
                    {profile.level}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-850 text-amber-500 border border-amber-500/10 text-[8px] font-black uppercase tracking-wider shrink-0">
                    LVL {Math.max(1, Math.floor(profile.points / 100) + 1)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Karma</span>
                  </div>
                  <span className="font-black text-amber-500 font-mono">
                    {profile.points} <span className="text-[8px] font-bold text-slate-500">CKP</span>
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: `${profile.points % 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className={`mt-1.5 text-[9px] font-bold text-center leading-normal px-2 ${
              darkMode ? 'text-slate-500' : 'text-slate-505'
            }`}>
              File environmental logs or potholes to earn badged medals!
            </div>
          </div>
        )}

        {folder && (
          <div className={`px-3 py-1 border-b shrink-0 transition-colors ${darkMode ? 'border-slate-900' : 'border-slate-50'} space-y-0.5`}>
            {[
              { id: 'files', label: 'Workspace', icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'metrics', label: 'Metrics', icon: <Sliders className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'report', label: 'Reports', icon: <ClipboardList className="w-3.5 h-3.5 shrink-0" /> },
              { id: 'impact', label: 'My Impact', icon: <TrendingUp className="w-3.5 h-3.5 shrink-0" /> },
            ].map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id as any)}
                  className={`w-full px-2.5 py-1 rounded-lg transition-all flex items-center justify-between cursor-pointer text-[10.5px] font-bold border ${
                    isActive
                      ? 'bg-[#1E2538] border-amber-500/50 text-[#F8FAFC]'
                      : (darkMode 
                          ? 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200' 
                          : 'border-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-800')
                  }`}
                  id={`sidebar-view-${item.id}-tab`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isActive ? 'text-amber-500' : 'text-slate-450 dark:text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0"></div>}
                </button>
              );
            })}

            <button
              onClick={() => setShowLeaderboard(prev => !prev)}
              className={`w-full px-2.5 py-1 rounded-lg transition-all flex items-center justify-between cursor-pointer text-[10.5px] font-bold border ${
                showLeaderboard
                  ? 'bg-[#1E2538] border-amber-500/30 text-[#F8FAFC]'
                  : (darkMode 
                      ? 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200' 
                      : 'border-transparent text-slate-650 hover:bg-slate-50 hover:text-slate-800')
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={showLeaderboard ? 'text-amber-500' : 'text-slate-450 dark:text-slate-500'}>
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                </span>
                <span>Active Quests</span>
              </div>
              <div className="flex items-center gap-1 text-[8px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded-md font-mono shrink-0">
                {profile.badges.length}
              </div>
            </button>
          </div>
        )}

        {folder && showLeaderboard && (
          <div className={`px-3.5 py-1.5 border-b transition-colors flex flex-col gap-1.5 shrink-0 ${
            darkMode ? 'bg-slate-900/10 border-slate-900' : 'bg-slate-50/20 border-slate-100'
          }`}>
            {profile.badges.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                <span className={`text-[8px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Badges Earned
                </span>
                <div className="flex gap-1 flex-wrap">
                  {profile.badges.map(b => (
                    <span 
                      key={b.id} 
                      className={`inline-flex items-center justify-center text-[8px] px-1.5 py-0.5 rounded-md font-extrabold border ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-3xs'
                      }`}
                      title={`${b.name}: ${b.description}`}
                    >
                      <span className="mr-0.5">{b.emoji.slice(0,2)}</span>
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`text-[8px] font-semibold leading-relaxed ${darkMode ? 'text-slate-605' : 'text-slate-455'}`}>
                File environmental logs or potholes to earn badged medals!
              </div>
            )}

            <div className="mt-0.5 border-t border-dashed pt-1 border-slate-200 dark:border-slate-800/80">
              <span className={`text-[8px] font-bold uppercase tracking-wider block mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Community Leaderboard
              </span>
              <div className={`border rounded-xl overflow-hidden shadow-2xs divide-y ${
                darkMode ? 'bg-slate-900/60 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200 divide-slate-100'
              }`}>
                {leaderboard.map((hero, idx) => (
                  <div 
                    key={hero.name}
                    className={`flex items-center justify-between px-2 py-1 text-[9px] font-semibold ${
                      hero.isCurrentUser 
                        ? (darkMode ? 'bg-amber-950/20 text-amber-400 font-black' : 'bg-amber-50/50 text-amber-900 font-black') 
                        : (darkMode ? 'text-slate-350' : 'text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' :
                        idx === 1 ? 'bg-slate-400 text-white' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[130px]">{hero.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="font-extrabold text-[9px] font-mono">{hero.points}</span>
                      <span className={`text-[8px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>CKP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {folder && (
          <div className="px-3 py-1.5 shrink-0 flex flex-col gap-1 border-b">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550 px-1">
              <span>Workspace Files</span>
              <span className="font-mono text-[8px] text-slate-400">{filteredFiles.length} files</span>
            </div>
            
            <div className="space-y-0.5">
              {!folder ? (
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <Database className="w-5 h-5 text-slate-300 dark:text-slate-700 mb-1" />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                    No active workspace loaded
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-0.5 py-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 animate-pulse py-0.5">
                      <div className="w-4 h-4 rounded bg-slate-900"></div>
                      <div className="h-2 rounded w-2/3 bg-slate-900"></div>
                    </div>
                  ))}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-2 text-center">
                  <p className="text-[10px] text-slate-455 dark:text-slate-550">
                    No files found in folder
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFileId === file.id;
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          onChangeView('files');
                          onSelectFile(file);
                        }}
                        className={`w-full flex items-center justify-between py-1 px-1.5 rounded-md text-left transition-all group cursor-pointer border ${
                          isSelected 
                            ? (darkMode 
                                ? 'bg-[#1E2538] border-indigo-900/40 text-indigo-300 font-black' 
                                : 'bg-indigo-50/50 border-indigo-100 text-indigo-900 font-black') 
                            : (darkMode 
                                ? 'border-transparent hover:bg-slate-900 text-slate-355 hover:text-white' 
                                : 'border-transparent hover:bg-slate-50 text-slate-650 hover:text-slate-900')
                        }`}
                        id={`file-item-${file.id}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="shrink-0 text-slate-450 dark:text-slate-505">
                            {getFileIcon(file.mimeType, file.name)}
                          </span>
                          <span className="text-[10.5px] font-bold truncate leading-tight">
                            {getFileDisplayName(file.name)}
                          </span>
                        </div>
                        <span className="text-[8.5px] text-slate-450 dark:text-slate-600 shrink-0 font-mono">
                          {formatSize(file.size)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`p-2.5 border-t transition-colors ${
        darkMode 
          ? 'border-slate-900 bg-slate-950/40' 
          : 'border-slate-100 bg-slate-50/50'
      } space-y-1.5 shrink-0`}>
        {folder && (
          <div className={`p-2 rounded-xl border transition-all ${
            darkMode 
              ? 'bg-rose-950/15 border-rose-900/20' 
              : 'bg-rose-50 border-rose-100'
          } mb-0.5 flex flex-col gap-0.5`}>
            <div className="flex items-center gap-1 text-rose-500 font-extrabold text-[8.5px] uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3 fill-rose-500/10" />
              Critical District Alert
            </div>
            <p className={`text-[8.5px] leading-tight font-semibold ${
              darkMode ? 'text-slate-350' : 'text-slate-600'
            }`}>
              3 pending high-severity hazards in Sector-4.
            </p>
            <button
              onClick={onUrgentAlert}
              className="w-full py-1 text-center text-[8.5px] font-black text-rose-700 bg-rose-200 hover:bg-rose-300 dark:text-rose-100 dark:bg-rose-900/60 dark:hover:bg-rose-900/80 rounded-md shadow-3xs transition-all cursor-pointer uppercase tracking-wider"
              id="sidebar-urgent-alert-btn"
            >
              Urgent Alert
            </button>
          </div>
        )}

        {user && (
          <div className="flex items-center justify-between gap-0.5">
            <button
              onClick={() => {
                const guideBtn = document.querySelector('[title="Open AI Guide Assistant"]') as HTMLButtonElement;
                if (guideBtn) guideBtn.click();
              }}
              className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[9.5px] font-bold border ${
                darkMode 
                  ? 'text-slate-400 hover:bg-slate-900 hover:text-slate-200' 
                  : 'text-slate-655 hover:bg-slate-50 hover:text-slate-800'
              }`}
              id="sidebar-settings-btn"
            >
              <Settings className="w-3 h-3 text-slate-400 dark:text-slate-505" />
              <span>Settings</span>
            </button>

            <button
              onClick={onSignOut}
              className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[9.5px] font-bold border ${
                darkMode 
                  ? 'text-slate-400 hover:bg-rose-950/20 hover:text-rose-400' 
                  : 'text-slate-655 hover:bg-rose-50 hover:text-rose-600'
              }`}
              id="sidebar-logout-btn"
            >
              <LogOut className="w-3 h-3 text-slate-400 dark:text-slate-505" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
