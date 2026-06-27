import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell, 
  Tooltip 
} from 'recharts';
import { 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Trophy, 
  Star, 
  Shield, 
  AlertTriangle, 
  Compass, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  FileDown, 
  Filter, 
  Loader2, 
  UserCheck,
  Send
} from 'lucide-react';
import { GoogleDriveFile } from '../types';
import { getFileBlob } from '../lib/drive';

interface ImpactAnalyticsProps {
  files: GoogleDriveFile[];
  token: string | null;
  darkMode?: boolean;
  onNavigateToReport?: () => void;
  onNavigateToFiles?: () => void;
}

interface MTTRDistrict {
  name: string;
  mttr: number;
}

interface MTTRRangeData {
  fastest: string;
  slowest: string;
  districts: MTTRDistrict[];
}

const MTTR_DATA: Record<'24 Hours' | '7 Days' | '30 Days', MTTRRangeData> = {
  '24 Hours': {
    fastest: '1.2h',
    slowest: '12.5h',
    districts: [
      { name: 'Central', mttr: 2.5 },
      { name: 'North', mttr: 4.1 },
      { name: 'East', mttr: 1.2 },
      { name: 'West', mttr: 8.2 },
      { name: 'South', mttr: 3.1 },
      { name: 'Sector-4', mttr: 12.5 },
      { name: 'Hub', mttr: 4.2 },
    ]
  },
  '7 Days': {
    fastest: '1.4h',
    slowest: '15.1h',
    districts: [
      { name: 'Central', mttr: 3.1 },
      { name: 'North', mttr: 5.2 },
      { name: 'East', mttr: 1.4 },
      { name: 'West', mttr: 10.5 },
      { name: 'South', mttr: 4.2 },
      { name: 'Sector-4', mttr: 15.1 },
      { name: 'Hub', mttr: 5.8 },
    ]
  },
  '30 Days': {
    fastest: '1.4h',
    slowest: '18.2h',
    districts: [
      { name: 'Central', mttr: 3.8 },
      { name: 'North', mttr: 6.5 },
      { name: 'East', mttr: 1.4 },
      { name: 'West', mttr: 12.1 },
      { name: 'South', mttr: 5.0 },
      { name: 'Sector-4', mttr: 18.2 },
      { name: 'Hub', mttr: 6.9 },
    ]
  }
};

const MOCK_HEROES = [
  { name: 'Arjun S.', title: 'Civic Champion', points: '2,450', reports: 14, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80', badgeColor: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' },
  { name: 'Priya K.', title: 'Active Observer', points: '1,820', reports: 9, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80', badgeColor: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' },
  { name: 'Vikram M.', title: 'Green Guardian', points: '1,540', reports: 12, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80', badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' }
];

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const parseLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: any = {};
    headers.forEach((h, idx) => {
      const val = values[idx] ?? '';
      row[h] = val;
    });
    return row;
  });
  
  return rows;
}

export default function ImpactAnalytics({ 
  files, 
  token, 
  darkMode = false, 
  onNavigateToReport, 
  onNavigateToFiles 
}: ImpactAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'24 Hours' | '7 Days' | '30 Days'>('24 Hours');
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [activePatrols, setActivePatrols] = useState(12);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Load pothole reports from CSV
  useEffect(() => {
    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const sandboxContent = localStorage.getItem('urbanpulse-sandbox-file-potholes');
        if (sandboxContent) {
          setReports(parseCSV(sandboxContent));
          setLoadingReports(false);
          return;
        }

        const potholeFile = files.find(f => f.id === 'potholes' || f.name.toLowerCase() === 'pothole_reports.csv');
        if (potholeFile) {
          let content = '';
          if (token) {
            const blob = await getFileBlob(token, potholeFile.id);
            content = await blob.text();
          } else {
            content = localStorage.getItem(`urbanpulse-sandbox-file-${potholeFile.id}`) || '';
          }
          if (content) {
            setReports(parseCSV(content));
          }
        }
      } catch (err) {
        console.error('Failed to parse pothole reports in Impact component:', err);
      } finally {
        setLoadingReports(false);
      }
    };
    loadReports();
  }, [files, token]);

  const handleDeployCrew = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setIsDeployed(true);
      setActivePatrols(prev => prev + 1);
    }, 2000);
  };

  const currentMTTR = MTTR_DATA[timeRange];

  // Filters logic
  const filteredReports = reports.filter(r => {
    const matchesStatus = filterStatus === 'All' || r.Status === filterStatus;
    const matchesSearch = !searchQuery.trim() || 
      (r.Title && r.Title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.Description && r.Description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.ReporterId && r.ReporterId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;
    const headers = Object.keys(filteredReports[0]).join(',');
    const csvRows = filteredReports.map(row => 
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `urbanpulse_activity_log_${timeRange.replace(' ', '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex-1 p-6 md:p-8 overflow-y-auto select-none transition-colors duration-300 ${
      darkMode ? 'bg-slate-900/40 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Civic Impact Analytics</h1>
          <p className={`text-xs mt-1 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time resolution velocity and community contribution metrics.
          </p>
        </div>

        {/* Time Range Filter Toggle */}
        <div className={`p-0.5 rounded-lg flex items-center gap-0.5 text-xs font-semibold self-start border transition-colors ${
          darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-200/60 border-transparent'
        }`}>
          {(['24 Hours', '7 Days', '30 Days'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                timeRange === range
                  ? (darkMode ? 'bg-slate-800 text-white font-extrabold shadow-sm' : 'bg-white text-slate-800 font-extrabold shadow-xs')
                  : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Top 5 Hero Leaderboard */}
        <div className={`md:col-span-1 lg:col-span-4 border p-5 rounded-2xl flex flex-col justify-between transition-colors shadow-2xs ${
          darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-100'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                Hero Leaderboard
              </h2>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                TOP 5
              </span>
            </div>

            <div className="space-y-3.5">
              {MOCK_HEROES.map((hero, idx) => (
                <div key={hero.name} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={hero.avatar} alt={hero.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800" />
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-950">
                        {idx + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">{hero.name}</h4>
                      <span className={`inline-block text-[8px] px-1 py-0.2 rounded mt-0.5 font-bold ${hero.badgeColor}`}>
                        {hero.title}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-amber-500">{hero.points} CKP</div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">{hero.reports} Reports</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={onNavigateToFiles}
            className={`w-full mt-5 py-2.5 text-center text-xs font-bold border rounded-xl transition-all cursor-pointer ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
          >
            View Full Ranking
          </button>
        </div>

        {/* Resolution Velocity (MTTR) */}
        <div className={`md:col-span-1 lg:col-span-8 border p-5 rounded-2xl transition-colors shadow-2xs ${
          darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">
                Resolution Velocity
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Mean time to repair (MTTR) by district</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">Fastest</span>
                <span className="text-xs font-extrabold text-emerald-500">{currentMTTR.fastest}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">Slowest</span>
                <span className="text-xs font-extrabold text-rose-500">{currentMTTR.slowest}</span>
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentMTTR.districts} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: darkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: darkMode ? '#94A3B8' : '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    backgroundColor: darkMode ? '#0F172A' : '#FFFFFF',
                    borderColor: darkMode ? '#1E293B' : '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: darkMode ? '#F1F5F9' : '#0F172A'
                  }}
                  formatter={(value) => [`${value} hours`, 'MTTR']}
                />
                <Bar dataKey="mttr" radius={[4, 4, 0, 0]} barSize={32}>
                  {currentMTTR.districts.map((entry, index) => {
                    let fill = '#3B82F6'; // Default Indigo-Blue
                    if (entry.name === 'East') fill = '#10B981'; // Green (Fastest)
                    if (entry.mttr > 10) fill = '#EF4444'; // Red (Slowest)
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Predictive Insights */}
        <div className={`col-span-1 border p-5 rounded-2xl flex flex-col justify-between transition-colors shadow-2xs ${
          darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-100'
        }`}>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
              Predictive Insights
            </h2>

            <div className={`p-4 rounded-xl border mb-4 relative overflow-hidden transition-colors ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-rose-50/50 border-rose-100/60'
            }`}>
              <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-xl"></div>
              <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 uppercase tracking-widest">
                Fatigue Forecast
              </span>
              <p className="text-xs font-extrabold leading-relaxed mt-2.5">
                High risk of water main failure in <span className="text-rose-500">Kolkata Sector-4</span> within 72 hours based on sensor vibration data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 border rounded-xl transition-colors ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-150'}`}>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">AI Confidence</span>
                <span className="text-sm font-black text-emerald-500">94.2%</span>
              </div>
              <div className={`p-3 border rounded-xl transition-colors ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-150'}`}>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">Priority</span>
                <span className="text-sm font-black text-rose-500 animate-pulse">CRITICAL</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeployCrew}
            disabled={isDeploying || isDeployed}
            className={`w-full mt-5 py-3 rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isDeployed 
                ? 'bg-emerald-500 text-white border border-transparent'
                : darkMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-50'
            }`}
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating Route and Assigning Unit...
              </>
            ) : isDeployed ? (
              <>
                <UserCheck className="w-4 h-4" />
                Crew Deployed successfully! Unit #402 Active
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Deploy Maintenance Crew
              </>
            )}
          </button>
        </div>

        {/* Live Coverage Grid Map Mock */}
        <div className={`col-span-1 border p-5 rounded-2xl flex flex-col justify-between transition-colors shadow-2xs ${
          darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-100'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">
                Live Coverage
              </h2>
              <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                LIVE MONITORING
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">Hazard Density</span>
                <span className="text-xs font-extrabold text-emerald-500">Low</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">Active Patrols</span>
                <span className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400">{activePatrols} Units</span>
              </div>
            </div>
          </div>

          {/* Futuristic Visual City Mesh SVG Grid Map */}
          <div className={`h-40 rounded-xl relative overflow-hidden border flex items-center justify-center transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <svg width="100%" height="100%" className="absolute inset-0 opacity-20 dark:opacity-40">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke={darkMode ? '#475569' : '#94A3B8'} strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Concentric rings */}
              <circle cx="50%" cy="50%" r="40" fill="none" stroke={darkMode ? '#312E81' : '#E2E8F0'} strokeWidth="1" />
              <circle cx="50%" cy="50%" r="70" fill="none" stroke={darkMode ? '#312E81' : '#E2E8F0'} strokeWidth="1" strokeDasharray="4" />
              
              {/* Mock patrol path */}
              <path d="M 50 40 L 150 120 L 250 50 L 320 130" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>

            {/* Glowing active node radar dots */}
            <div className="absolute top-[40%] left-[50%] w-3 h-3 bg-indigo-500 rounded-full animate-pulse border-2 border-white dark:border-slate-950"></div>
            <div className="absolute top-[20%] left-[25%] w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            <div className="absolute top-[20%] left-[25%] w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-950"></div>
            <div className="absolute top-[75%] left-[70%] w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
            <div className="absolute top-[75%] left-[70%] w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-950"></div>

            {/* Simulated Coordinate Text Overlay */}
            <div className="absolute bottom-2 left-2 bg-slate-950/80 text-white font-mono text-[8px] px-1.5 py-0.5 rounded border border-slate-800">
              GRID INDEX 88 // LAT 12.927 // LNG 77.681
            </div>
            
            <div className="absolute top-2 right-2 bg-slate-950/80 text-white font-mono text-[8px] px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              RADAR LINK ACTIVE
            </div>
          </div>
        </div>

      </div>

      {/* Activity Log */}
      <div className={`border rounded-2xl overflow-hidden transition-colors shadow-2xs ${
        darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-100'
      }`}>
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors dark:border-slate-900">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">
              Activity Log
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Real-time incident updates from the active pothole registry</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search filter input */}
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-all border w-full sm:w-auto ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-650 focus:border-slate-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-450 focus:bg-white focus:border-slate-300'
              }`}
            />
            
            {/* Status Dropdown filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-all border cursor-pointer w-[48%] sm:w-auto ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 focus:border-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:border-slate-350'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredReports.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer disabled:opacity-40 w-[48%] sm:w-auto ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-750'
              }`}
              title="Export filtered log as CSV file"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-x-auto">
          {loadingReports ? (
            <div className="p-8 text-center flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
              <span className="text-xs text-slate-400 dark:text-slate-550">Parsing active log...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-650 text-xs font-medium">
              No matching activity events found.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b transition-colors uppercase text-[9px] font-black tracking-wider ${
                  darkMode ? 'bg-slate-900/40 border-slate-900 text-slate-450' : 'bg-slate-50/50 border-slate-100 text-slate-500'
                }`}>
                  <th className="px-5 py-3">Incident</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Reporter</th>
                  <th className="px-5 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50">
                {filteredReports.map((item, idx) => {
                  const severityColors: Record<string, string> = {
                    Critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
                    High: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
                    Moderate: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                    Low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                  };

                  const statusColors: Record<string, string> = {
                    Reported: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
                    'In Progress': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                    Resolved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
                    Closed: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
                  };

                  return (
                    <tr 
                      key={item.Id || idx} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-semibold ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      <td className="px-5 py-3.5 max-w-[200px] truncate">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{item.Title || 'Unnamed Hazard'}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-medium mt-0.5">{item.Description || 'No description provided.'}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] text-slate-450 dark:text-slate-500">
                        {item.Latitude && item.Longitude ? `[${Number(item.Latitude).toFixed(4)}, ${Number(item.Longitude).toFixed(4)}]` : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          statusColors[item.Status] || 'text-slate-500'
                        }`}>
                          {item.Status || 'Reported'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          severityColors[item.Severity] || 'text-slate-500'
                        }`}>
                          {item.Severity || 'Moderate'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-450 dark:text-slate-500 max-w-[130px] truncate">
                        {item.ReporterId || 'anonymous@gmail.com'}
                      </td>
                      <td className="px-5 py-3.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {item.ReportedAt ? new Date(item.ReportedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
