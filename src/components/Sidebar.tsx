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
  Star
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
  activeView: 'files' | 'metrics' | 'report';
  onChangeView: (view: 'files' | 'metrics' | 'report') => void;
  darkMode: boolean;
  onToggleTheme: () => void;
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
  onToggleTheme
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profile, setProfile] = useState<CivicProfile>(() => getUserCivicProfile());
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(() => getLeaderboard());
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getUserCivicProfile());
      setLeaderboard(getLeaderboard());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    // Listen for storage changes as well
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'urbanpulse_civic_profile') {
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

  const getFileDisplayName = (name: string): string => {
    const lowercase = name.toLowerCase();
    if (lowercase === 'readme.md') return 'Project Overview';
    if (lowercase === 'environmental_sensors.csv') return 'Environmental Sensors Report';
    if (lowercase === 'transit_ridership.csv') return 'Transit Ridership Report';
    if (lowercase === 'demographics_distribution.json') return 'Demographics Distribution';
    if (lowercase === 'pothole_reports.csv') return 'Pothole Reports Register';
    
    let cleanName = name.replace(/\.[a-zA-Z0-9]+$/, '');
    if (name.toLowerCase().endsWith('.csv')) {
      cleanName += ' Report';
    } else if (name.toLowerCase().endsWith('.json')) {
      cleanName += ' Data';
    }
    return cleanName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase() !== 'readme.md' &&
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside 
      id="sidebar-container" 
      className={`w-80 border-r flex flex-col h-full shrink-0 select-none transition-colors duration-300 ${
        darkMode 
          ? 'bg-slate-950 border-slate-900 text-slate-100' 
          : 'bg-white border-slate-100 text-slate-800'
      }`}
    >
      {/* Folder Header */}
      <div className={`p-4 border-b transition-colors ${darkMode ? 'border-slate-900' : 'border-slate-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Active Workspace
              </h2>
              <div className="flex items-center gap-1.5">
                <p className={`text-sm font-semibold truncate max-w-[140px] transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {folder ? folder.name : 'No Folder Selected'}
                </p>
                {folder?.id === 'sandbox-folder' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Sandbox
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                darkMode 
                  ? 'hover:bg-slate-900 text-slate-400 hover:text-amber-400' 
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              id="sidebar-theme-toggle-btn"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Reload Folder Button */}
            <button 
              onClick={onReload}
              disabled={isLoading || !folder}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer ${
                darkMode 
                  ? 'hover:bg-slate-900 text-slate-400 hover:text-slate-200' 
                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-850'
              }`}
              title="Refresh folder content"
              id="refresh-folder-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-2">
          <Search className={`absolute left-2.5 top-2.5 w-4 h-4 transition-colors ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Search project files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!folder || files.length === 0}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg focus:outline-none transition-all ${
              darkMode 
                ? 'bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-600 focus:bg-slate-900 focus:border-slate-700' 
                : 'bg-slate-50 border border-transparent text-slate-850 placeholder-slate-450 focus:bg-white focus:border-slate-200'
            }`}
            id="search-files-input"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      {folder && (
        <div className={`px-4 pb-3 border-b shrink-0 transition-colors ${darkMode ? 'border-slate-900' : 'border-slate-50'}`}>
          <div className={`p-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold transition-colors ${
            darkMode ? 'bg-slate-900/80' : 'bg-slate-100'
          }`}>
            <button
              onClick={() => onChangeView('files')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeView === 'files' 
                  ? (darkMode ? 'bg-slate-800 text-white shadow-sm font-extrabold' : 'bg-white text-slate-800 shadow-2xs font-extrabold')
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
              id="sidebar-view-files-tab"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Files</span>
            </button>
            <button
              onClick={() => onChangeView('metrics')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeView === 'metrics' 
                  ? (darkMode ? 'bg-slate-800 text-white shadow-sm font-extrabold' : 'bg-white text-slate-800 shadow-2xs font-extrabold')
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
              id="sidebar-view-metrics-tab"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Metrics</span>
            </button>
            <button
              onClick={() => onChangeView('report')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeView === 'report' 
                  ? (darkMode ? 'bg-slate-800 text-white shadow-sm font-extrabold' : 'bg-white text-slate-800 shadow-2xs font-extrabold')
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
              id="sidebar-view-report-tab"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Gamification Profile & Leaderboard */}
      {folder && (
        <div className={`px-4 py-3 border-b transition-colors flex flex-col gap-2 shrink-0 ${
          darkMode ? 'border-slate-900 bg-slate-950/20' : 'bg-slate-50/30 border-slate-50/50'
        }`}>
          {/* User Profile Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                darkMode ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}>
                <Shield className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Civic Level
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-extrabold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    {profile.level}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-[10px] font-bold ${darkMode ? 'text-slate-450' : 'text-slate-400'}`}>
                Civic Karma
              </div>
              <div className="text-sm font-black text-amber-500 flex items-center gap-0.5 justify-end">
                <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500 animate-pulse" />
                {profile.points} <span className="text-[10px] font-bold text-slate-405 dark:text-slate-450">CKP</span>
              </div>
            </div>
          </div>

          {/* Badges Earned */}
          {profile.badges.length > 0 ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Badges:
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {profile.badges.map(b => (
                  <span 
                    key={b.id} 
                    className={`inline-flex items-center justify-center text-[9px] px-1.5 py-0.5 rounded-md font-extrabold border ${
                      darkMode 
                        ? 'bg-slate-900 border-slate-800 text-slate-300' 
                        : 'bg-white border-slate-200 text-slate-600 shadow-3xs'
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
            <div className={`text-[9px] font-semibold mt-1 leading-relaxed ${darkMode ? 'text-slate-650' : 'text-slate-450'}`}>
              File environmental logs or potholes to earn badged medals!
            </div>
          )}

          {/* Collapsible Leaderboard Button */}
          <div className="mt-1 border-t border-dashed pt-2 border-slate-200 dark:border-slate-800/60">
            <button
              onClick={() => setShowLeaderboard(prev => !prev)}
              className={`w-full flex items-center justify-between text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Top 5 Heroes Leaderboard
              </span>
              {showLeaderboard ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Collapsible content */}
            {showLeaderboard && (
              <div className={`mt-2 border rounded-xl overflow-hidden shadow-2xs divide-y transition-colors duration-200 ${
                darkMode ? 'bg-slate-900/60 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200 divide-slate-100'
              }`}>
                {leaderboard.map((hero, idx) => (
                  <div 
                    key={hero.name}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                      hero.isCurrentUser 
                        ? (darkMode ? 'bg-amber-950/20 text-amber-400 font-black' : 'bg-amber-50/50 text-amber-900 font-black') 
                        : (darkMode ? 'text-slate-350' : 'text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' :
                        idx === 1 ? 'bg-slate-400 text-white' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[130px]">{hero.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-extrabold text-[10px] font-mono">{hero.points}</span>
                      <span className={`text-[9px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>CKP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List Viewport (with Framer Motion stagger!) */}
      <div className="flex-1 overflow-y-auto">
        {!folder ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Database className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
            <p className="text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed">
              Sign in and select or create an UrbanPulse folder to preview
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className={`w-8 h-8 rounded ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-3 rounded w-3/4 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
                  <div className={`h-2 rounded w-1/2 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-600">
              {searchQuery ? 'No files match your search' : 'No files found in folder'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateSamples}
                disabled={isCreatingSamples}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                id="create-samples-empty-btn"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isCreatingSamples ? 'Creating...' : 'Populate Sample Files'}
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={searchQuery + '_' + activeView + '_' + files.length} // Force animation on search, tab or count change
            className="p-2 space-y-1"
          >
            {filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              return (
                <motion.button
                  variants={itemVariants}
                  key={file.id}
                  onClick={() => {
                    onChangeView('files');
                    onSelectFile(file);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all group cursor-pointer ${
                    isSelected 
                      ? (darkMode 
                          ? 'bg-indigo-950/40 border border-indigo-900/50 text-indigo-300' 
                          : 'bg-indigo-50/75 border border-indigo-100 text-indigo-900') 
                      : (darkMode 
                          ? 'border border-transparent hover:bg-slate-900 text-slate-300 hover:text-white' 
                          : 'border border-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-900')
                  }`}
                  id={`file-item-${file.id}`}
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`p-1.5 rounded-md shrink-0 transition-colors ${
                      isSelected 
                        ? (darkMode ? 'bg-slate-900' : 'bg-white shadow-sm') 
                        : (darkMode ? 'bg-slate-900/40 group-hover:bg-slate-900' : 'bg-slate-50 group-hover:bg-white')
                    }`}>
                      {getFileIcon(file.mimeType, file.name)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate leading-tight">{getFileDisplayName(file.name)}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all ${
                    isSelected 
                      ? 'text-indigo-500 translate-x-0.5' 
                      : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
                  }`} />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Workspace Controls / User Footer */}
      <div className={`p-4 border-t transition-colors ${
        darkMode 
          ? 'border-slate-900 bg-slate-950/40' 
          : 'border-slate-100 bg-slate-50/50'
      } space-y-3`}>
        {folder && files.length > 0 && (
          <button
            onClick={onCreateSamples}
            disabled={isCreatingSamples}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${
              darkMode
                ? 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300'
            }`}
            title="Will recreate project telemetry, reports and structured demographics stats"
            id="sidebar-recreate-samples-btn"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />
            {isCreatingSamples ? 'Resetting Workspace...' : 'Reset Sample Files'}
          </button>
        )}

        {user && (
          <div className={`flex items-center justify-between pt-2 border-t transition-colors ${
            darkMode ? 'border-slate-900' : 'border-slate-100/70'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className={`w-7 h-7 rounded-full border transition-colors ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold truncate transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {user.displayName || 'Connected Planner'}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                darkMode
                  ? 'hover:bg-rose-950/20 text-slate-500 hover:text-rose-400'
                  : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
              }`}
              title="Sign Out"
              id="sign-out-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
