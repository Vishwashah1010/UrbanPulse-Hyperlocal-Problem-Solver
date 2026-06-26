import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  AlertTriangle, 
  Activity, 
  Navigation, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  FileText, 
  BarChart3, 
  Wind, 
  Volume2, 
  RefreshCw,
  Sliders,
  MapPin,
  Map,
  Sparkles,
  Loader2,
  TreePine,
  IndianRupee,
  ShieldCheck,
  Flame,
  Gift
} from 'lucide-react';
import { GoogleDriveFile } from '../types';
import { getFileBlob } from '../lib/drive';

interface MetricsDashboardProps {
  files: GoogleDriveFile[];
  token: string | null;
  folderId: string | null;
  onRefresh: () => void;
  darkMode?: boolean;
}

const CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
];

const SEVERITY_COLORS: { [key: string]: string } = {
  Critical: '#EF4444', // red
  High: '#F97316',     // orange
  Moderate: '#F59E0B', // amber
  Low: '#10B981',      // emerald
};

const STATUS_COLORS: { [key: string]: string } = {
  Reported: '#6366F1',    // indigo
  'In Progress': '#3B82F6', // blue
  Resolved: '#10B981',    // emerald
};

function getNearestCity(lat: number, lng: number): string {
  if (isNaN(lat) || isNaN(lng)) return 'Other/Remote';
  let minDistance = Infinity;
  let nearestCity = 'Unknown';
  
  for (const city of CITIES) {
    const dLat = lat - city.lat;
    const dLng = lng - city.lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city.name;
    }
  }
  
  if (minDistance > 4.5) {
    return 'Other Regions';
  }
  
  return nearestCity;
}

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
      const numericVal = Number(val);
      row[h] = !isNaN(numericVal) && val !== '' ? numericVal : val;
    });
    return row;
  });
  
  return rows;
}

export default function MetricsDashboard({ files, token, folderId, onRefresh, darkMode = false }: MetricsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'issues' | 'sensors' | 'transit'>('issues');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed telemetry datasets
  const [potholeData, setPotholeData] = useState<any[]>([]);
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [transitData, setTransitData] = useState<any[]>([]);

  // AI Summary states
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchExecutiveSummary = async (reportsToAnalyze: any[]) => {
    if (reportsToAnalyze.length === 0) {
      setAiSummary("No active issues logged in the UrbanPulse road hazard registry yet.");
      return;
    }
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/gemini/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: reportsToAnalyze })
      });
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error('Failed to get executive summary:', err);
      setAiSummary("Unable to generate live AI executive briefing at this moment. Please try again.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAllTelemetryData();
    }
  }, [files, token]);

  const loadAllTelemetryData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Locate file objects
      const potholeFile = files.find(f => f.name.toLowerCase() === 'pothole_reports.csv' || f.name.toLowerCase() === 'reports.csv');
      const sensorsFile = files.find(f => f.name.toLowerCase() === 'environmental_sensors.csv');
      const ridershipFile = files.find(f => f.name.toLowerCase() === 'transit_ridership.csv');

      let parsedPotholes: any[] = [];

      // 2. Fetch pothole hazard registry
      if (potholeFile) {
        const blob = await getFileBlob(token, potholeFile.id);
        const text = await blob.text();
        const parsed = parseCSV(text);
        setPotholeData(parsed);
        parsedPotholes = parsed;
      } else {
        setPotholeData([]);
      }

      // 3. Fetch station sensor matrix
      if (sensorsFile) {
        const blob = await getFileBlob(token, sensorsFile.id);
        const text = await blob.text();
        const parsed = parseCSV(text);
        setSensorData(parsed);
      } else {
        setSensorData([]);
      }

      // 4. Fetch transit hourly logs
      if (ridershipFile) {
        const blob = await getFileBlob(token, ridershipFile.id);
        const text = await blob.text();
        const parsed = parseCSV(text);
        setTransitData(parsed);
      } else {
        setTransitData([]);
      }

      if (parsedPotholes.length > 0) {
        fetchExecutiveSummary(parsedPotholes);
      } else {
        setAiSummary("No active issues logged in the UrbanPulse road hazard registry yet.");
      }
    } catch (err: any) {
      console.error('Error loading telemetry files:', err);
      setError('Failed to load raw CSV data streams from Google Drive. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  // Compute issue statistics
  const totalIssues = potholeData.length;
  const criticalCount = potholeData.filter(p => p.Severity === 'Critical').length;
  const highCount = potholeData.filter(p => p.Severity === 'High').length;
  const progressCount = potholeData.filter(p => p.Status === 'In Progress').length;
  const resolvedCount = potholeData.filter(p => p.Status === 'Resolved' || p.Status === 'Closed').length;

  // Process issues by location (City/Metropolitan region)
  const locationSummaryData = React.useMemo(() => {
    const summary: { [key: string]: { name: string; Critical: number; High: number; Moderate: number; Low: number; total: number } } = {};
    
    // Initialize cities
    CITIES.forEach(c => {
      summary[c.name] = { name: c.name, Critical: 0, High: 0, Moderate: 0, Low: 0, total: 0 };
    });
    summary['Other Regions'] = { name: 'Other Regions', Critical: 0, High: 0, Moderate: 0, Low: 0, total: 0 };

    potholeData.forEach(p => {
      const lat = parseFloat(p.Latitude);
      const lng = parseFloat(p.Longitude);
      const city = getNearestCity(lat, lng);
      
      const severity = p.Severity || 'Moderate';
      if (summary[city]) {
        summary[city].total += 1;
        if (severity === 'Critical') summary[city].Critical += 1;
        else if (severity === 'High') summary[city].High += 1;
        else if (severity === 'Moderate') summary[city].Moderate += 1;
        else if (severity === 'Low') summary[city].Low += 1;
      }
    });

    // Convert to list & filter out cities with 0 issues to keep chart clean
    return Object.values(summary).filter(item => item.total > 0 || item.name !== 'Other Regions');
  }, [potholeData]);

  // Process severity ratio
  const severityDistribution = React.useMemo(() => {
    const counts: { [key: string]: number } = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
    potholeData.forEach(p => {
      const sev = p.Severity || 'Moderate';
      if (counts[sev] !== undefined) counts[sev]++;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
      color: SEVERITY_COLORS[key] || '#94A3B8'
    })).filter(item => item.value > 0);
  }, [potholeData]);

  // Process status ratio
  const statusDistribution = React.useMemo(() => {
    const counts: { [key: string]: number } = { Reported: 0, 'In Progress': 0, Resolved: 0 };
    potholeData.forEach(p => {
      const stat = p.Status || 'Reported';
      if (counts[stat] !== undefined) counts[stat]++;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
      color: STATUS_COLORS[key] || '#94A3B8'
    })).filter(item => item.value > 0);
  }, [potholeData]);

  // Environmental Sensor aggregates by Station
  const environmentalAggregates = React.useMemo(() => {
    const stations: { [key: string]: { Station: string; pm25Sum: number; co2Sum: number; noiseSum: number; count: number } } = {};
    
    sensorData.forEach(s => {
      const st = s.Station;
      if (!st) return;
      if (!stations[st]) {
        stations[st] = { Station: st, pm25Sum: 0, co2Sum: 0, noiseSum: 0, count: 0 };
      }
      stations[st].pm25Sum += Number(s['PM2.5(ug/m3)'] || 0);
      stations[st].co2Sum += Number(s['CO2(ppm)'] || 0);
      stations[st].noiseSum += Number(s['Noise(dB)'] || 0);
      stations[st].count += 1;
    });

    return Object.values(stations).map(s => ({
      Station: s.Station,
      'Avg PM2.5 (ug/m3)': Math.round((s.pm25Sum / s.count) * 10) / 10,
      'Avg CO2 (ppm)': Math.round(s.co2Sum / s.count),
      'Avg Noise (dB)': Math.round((s.noiseSum / s.count) * 10) / 10
    }));
  }, [sensorData]);

  // Hourly ridership load mapping
  const hourlyRidershipChart = React.useMemo(() => {
    return transitData.map(r => ({
      Hour: r.Hour,
      'Subway Alpha': Number(r['Metro Line Alpha'] || 0),
      'Subway Beta': Number(r['Metro Line Beta'] || 0),
      'Bus 101': Number(r['Electric Bus 101'] || 0),
      'Bus 202': Number(r['Electric Bus 202'] || 0),
    }));
  }, [transitData]);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 flex flex-col h-full overflow-hidden select-none transition-colors duration-300">
      {/* Header Panel */}
      <div className="h-14 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900/60 flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Metrics Dashboard</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Live telemetry visualizations across the UrbanPulse grid</p>
          </div>
        </div>

        {/* View Segment Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center gap-0.5 text-[11px] font-semibold mr-2 transition-colors">
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'issues' 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-indigo-500" />
              Road Hazards
            </button>
            <button
              onClick={() => setActiveTab('sensors')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sensors' 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Sensor Grid
            </button>
            <button
              onClick={() => setActiveTab('transit')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'transit' 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
              Transit load
            </button>
          </div>

          <button
            onClick={() => { loadAllTelemetryData(); onRefresh(); }}
            disabled={loading}
            className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
            title="Sync metrics with Drive"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Dashboard Space */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-3"></div>
            <p className="text-xs font-semibold text-slate-600">Re-indexing smart city telemetry files...</p>
            <p className="text-[10px] text-slate-400 mt-1">Downloading, aligning arrays and plotting nodes</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-150 rounded-2xl max-w-md mx-auto my-12 shadow-sm">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Telemetry Stream Off-line</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">{error}</p>
            <button
              onClick={loadAllTelemetryData}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Retry Sync
            </button>
          </div>
        ) : (
          <>
            {/* View 1: ROAD HAZARD ANALYTICS */}
            {activeTab === 'issues' && (
              <div className="space-y-6 animate-fade-in">
                {/* Stats Bento Box */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Hazards</span>
                      <p className="text-2xl font-black text-slate-800 mt-1">{totalIssues}</p>
                    </div>
                    <div className="text-[9px] text-indigo-600 font-bold mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" /> Active Registry
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Severe (Critical/High)</span>
                      <p className="text-2xl font-black text-rose-600 mt-1">{criticalCount + highCount}</p>
                    </div>
                    <div className="text-[9px] text-rose-600 font-bold mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Require Attention
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
                      <p className="text-2xl font-black text-blue-600 mt-1">{progressCount}</p>
                    </div>
                    <div className="text-[9px] text-blue-600 font-bold mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" /> Active Maintenance
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
                      <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</p>
                    </div>
                    <div className="text-[9px] text-emerald-600 font-bold mt-2 pt-2 border-t border-slate-50 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Issues Patched
                    </div>
                  </div>
                </div>

                {/* Gamified Civic Impact & Neighborhood Quests */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Civic Value & Carbon Offset Estimator (Impact Dashboard) */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                        Civic Value & Carbon Offset Estimator
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Quantifiable environmental and financial benefits of citizen repairs</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {/* CO2 Saved */}
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">CO2 Saved</span>
                          <TreePine className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="mt-2">
                          <p className="text-base font-black text-emerald-900 leading-none">
                            {(resolvedCount * 4.5).toFixed(1)} <span className="text-[9px] font-bold">kg</span>
                          </p>
                          <span className="text-[8px] text-emerald-600 mt-1 block font-medium">4.5kg saved/pothole/day</span>
                        </div>
                      </div>

                      {/* Cash Saved */}
                      <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-indigo-700 uppercase tracking-wider">Repair Savings</span>
                          <IndianRupee className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="mt-2">
                          <p className="text-base font-black text-indigo-900 leading-none">
                            ₹{(resolvedCount * 1500).toLocaleString()}
                          </p>
                          <span className="text-[8px] text-indigo-600 mt-1 block font-medium">₹1,500 saved/route</span>
                        </div>
                      </div>

                      {/* Safety Index */}
                      {(() => {
                        const safetyIndex = totalIssues > 0 ? Math.round(70 + (resolvedCount / totalIssues) * 30) : 100;
                        return (
                          <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-bold text-amber-700 uppercase tracking-wider">Safety Index</span>
                              <ShieldCheck className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between items-baseline">
                                <p className="text-base font-black text-amber-900 leading-none">
                                  {safetyIndex}%
                                </p>
                              </div>
                              <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                <div className="bg-amber-500 h-full" style={{ width: `${safetyIndex}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Dynamic Neighborhood Quests & Sweeps */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500 animate-pulse fill-orange-500/10" />
                        Active Neighborhood Quests
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pool crowdsourcing with neighbors to earn bonus awards</p>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      {/* Monsoon Preparation Quest */}
                      {(() => {
                        // Count drainage issues
                        const drainageIssues = potholeData.filter(p => {
                          const text = `${p.Title} ${p.Description}`.toLowerCase();
                          return text.includes('drain') || text.includes('sewer') || text.includes('flood') || text.includes('water');
                        });
                        const questProgress = Math.min(100, Math.round((drainageIssues.length / 5) * 100));
                        return (
                          <div className="border border-orange-100 bg-orange-50/10 rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                  Monsoon Preparation Quest 🌧️
                                </h4>
                                <p className="text-[9px] text-slate-500 mt-0.5">Map 5 drainage blockages in Bangalore Central</p>
                              </div>
                              <span className="text-[8px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                                <Gift className="w-2.5 h-2.5" /> 1.5x CKP Multiplier
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                                <span>Quest Progress ({drainageIssues.length}/5)</span>
                                <span>{questProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full" style={{ width: `${questProgress}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Pothole Cleanup Sweep */}
                      <div className="border border-indigo-100 bg-indigo-50/10 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                              Pothole Cleanup Sweep 🧹
                            </h4>
                            <p className="text-[9px] text-slate-500 mt-0.5">Mark 3 active potholes in your local hub as resolved</p>
                          </div>
                          <span className="text-[8px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                            <Gift className="w-2.5 h-2.5" /> +100 CKP Reward
                          </span>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                            <span>Sweep Progress ({Math.min(3, resolvedCount)}/3)</span>
                            <span>{Math.round((Math.min(3, resolvedCount) / 3) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full" style={{ width: `${(Math.min(3, resolvedCount) / 3) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Executive Dispatch Summary Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex-1 space-y-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-500/20 text-indigo-300 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-wider text-indigo-300 uppercase">AI Smart Dispatch Briefing</span>
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-wide">AI-Generated Executive Dispatch & Road Safety Advisory</h3>
                    
                    {loadingSummary ? (
                      <div className="flex items-center gap-2 py-2 text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span className="text-xs font-semibold animate-pulse">Consulting dispatch models & analyzing active hazard catalog...</span>
                      </div>
                    ) : aiSummary ? (
                      <div className="text-xs text-slate-300 space-y-2 leading-relaxed whitespace-pre-line font-medium">
                        {aiSummary}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No active dispatch advisory computed. Press the refresh button to trigger a briefing.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchExecutiveSummary(potholeData)}
                    disabled={loadingSummary || potholeData.length === 0}
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer relative z-10"
                  >
                    {loadingSummary ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    )}
                    <span>Re-Analyze Grid</span>
                  </button>
                </div>

                {/* Primary Chart Block: Issues by Location */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Left: Summary Chart of Issues by Location */}
                  <div className="col-span-2 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[350px]">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Summary of Road Issues by Location</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Telemetry distribution mapped geographically to Indian metropolitan offices</p>
                    </div>
                    
                    <div className="flex-1 min-h-0">
                      {locationSummaryData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                          No issues recorded in the pothole database yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={locationSummaryData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontClass="font-semibold" />
                            <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                            <Tooltip wrapperStyle={{ fontSize: 10 }} cursor={{ fill: '#f8fafc' }} />
                            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                            <Bar dataKey="Critical" name="Critical" fill="#EF4444" stackId="a" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="High" name="High Priority" fill="#F97316" stackId="a" />
                            <Bar dataKey="Moderate" name="Moderate" fill="#F59E0B" stackId="a" />
                            <Bar dataKey="Low" name="Low Hazard" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Right: Ratio Split of Severity & Status */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[350px]">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Incident Metrics</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Hazard severity splits and current patch pipeline</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-around min-h-0">
                      {/* Severity Pie */}
                      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div className="w-1/2 h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={severityDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={22}
                                outerRadius={36}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {severityDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip wrapperStyle={{ fontSize: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 pl-3 space-y-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Severity Density</span>
                          {severityDistribution.map(entry => (
                            <div key={entry.name} className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                              <span className="flex items-center gap-1 truncate">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}
                              </span>
                              <span className="text-slate-800">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Pie */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="w-1/2 h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={22}
                                outerRadius={36}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {statusDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip wrapperStyle={{ fontSize: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 pl-3 space-y-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status pipeline</span>
                          {statusDistribution.map(entry => (
                            <div key={entry.name} className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                              <span className="flex items-center gap-1 truncate">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}
                              </span>
                              <span className="text-slate-800">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Registry Log */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Incident Registry Logs</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Real-time telemetry reports with geocoded city offsets</p>
                  </div>

                  <div className="overflow-x-auto max-h-[250px] overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold sticky top-0 z-10">
                          <th className="p-3 text-[9px] uppercase tracking-wider">ID</th>
                          <th className="p-3 text-[9px] uppercase tracking-wider">Report Details</th>
                          <th className="p-3 text-[9px] uppercase tracking-wider">Location Mapped</th>
                          <th className="p-3 text-[9px] uppercase tracking-wider">Severity</th>
                          <th className="p-3 text-[9px] uppercase tracking-wider">Pipeline Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {potholeData.map((p, idx) => {
                          const lat = parseFloat(p.Latitude);
                          const lng = parseFloat(p.Longitude);
                          const city = getNearestCity(lat, lng);
                          return (
                            <tr key={p.Id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-mono text-[10px] font-semibold text-slate-800">{p.Id}</td>
                              <td className="p-3 max-w-[250px]">
                                <div className="font-bold text-slate-800 text-[11px] truncate">{p.Title}</div>
                                <div className="text-[9px] text-slate-400 truncate mt-0.5">{p.Description}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-700">{city}</div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">{lat?.toFixed(4)}, {lng?.toFixed(4)}</div>
                              </td>
                              <td className="p-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-3xs" style={{ backgroundColor: SEVERITY_COLORS[p.Severity] || '#94A3B8' }}>
                                  {p.Severity}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold`}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.Status] || '#94A3B8' }}></span>
                                  {p.Status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: ENVIRONMENTAL SENSOR GRID */}
            {activeTab === 'sensors' && (
              <div className="space-y-6 animate-fade-in">
                {/* Intro message */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                      <Wind className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Environmental Air Quality & Urban Canopy Mesh</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Comparing ambient particle density (PM2.5), localized carbon dioxide (CO2) concentrations, and average acoustic decibel levels across our strategic sensor node zones.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sensor Indicators Charts */}
                <div className="grid grid-cols-2 gap-6">
                  {/* PM2.5 particulate ranges */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[300px]">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Average Particle Concentration (PM2.5)</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">PM2.5 microgram levels. Lower values are safer (&lt;15 µg/m³ threshold)</p>
                    </div>
                    <div className="flex-1 min-h-0">
                      {environmentalAggregates.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                          No sensor node telemetry available.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={environmentalAggregates} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="Station" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} />
                            <Tooltip wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Avg PM2.5 (ug/m3)" fill="#10B981" radius={[4, 4, 0, 0]}>
                              {environmentalAggregates.map((entry, index) => {
                                const val = entry['Avg PM2.5 (ug/m3)'];
                                const fill = val > 35 ? '#EF4444' : val > 15 ? '#F59E0B' : '#10B981';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* CO2 levels */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[300px]">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Localized Ambient CO2 Baseline</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Measured carbon dioxide parts-per-million (ppm). Baseline targets are under 450ppm</p>
                    </div>
                    <div className="flex-1 min-h-0">
                      {environmentalAggregates.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                          No sensor node telemetry available.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={environmentalAggregates} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="Station" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} domain={[300, 700]} />
                            <Tooltip wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Avg CO2 (ppm)" fill="#6366F1" radius={[4, 4, 0, 0]}>
                              {environmentalAggregates.map((entry, index) => {
                                const val = entry['Avg CO2 (ppm)'];
                                const fill = val > 550 ? '#F97316' : val > 420 ? '#6366F1' : '#06B6D4';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acoustic Decibels radar/plot */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[300px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Acoustic Noise Pollution Profile (dB)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">District decibel benchmarks. Targets range below 55dB for residential areas</p>
                  </div>
                  <div className="flex-1 min-h-[220px]">
                    {environmentalAggregates.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No acoustic metrics found.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={environmentalAggregates} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="Station" stroke="#94a3b8" fontSize={9} />
                          <YAxis stroke="#94a3b8" fontSize={9} domain={[30, 90]} />
                          <Tooltip wrapperStyle={{ fontSize: 10 }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Line type="monotone" dataKey="Avg Noise (dB)" stroke="#F59E0B" strokeWidth={3} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View 3: TRANSIT RIDERSHIP load */}
            {activeTab === 'transit' && (
              <div className="space-y-6 animate-fade-in">
                {/* Intro message */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Metropolitan Commuter Capacity Curves</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Comparing load profiles of core heavy rail subway corridors (Metro Lines Alpha & Beta) and Zero-Emission feeder electric bus meshes. This aids in scheduling optimization.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ridership Line Curve */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex flex-col min-h-[380px]">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hourly Commuter Flow Comparison</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Capacity loads across lines from 06:00 AM morning rise to evening rush-hour peaks</p>
                  </div>
                  <div className="flex-1 min-h-0">
                    {hourlyRidershipChart.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No ridership CSV logs found in UrbanPulse.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hourlyRidershipChart} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="Hour" stroke="#94a3b8" fontSize={9} />
                          <YAxis stroke="#94a3b8" fontSize={9} />
                          <Tooltip wrapperStyle={{ fontSize: 10 }} />
                          <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="Subway Alpha" stroke="#4F46E5" strokeWidth={2.5} name="Metro Alpha (Heavy Rail)" />
                          <Line type="monotone" dataKey="Subway Beta" stroke="#06B6D4" strokeWidth={2.5} name="Metro Beta (Heavy Rail)" />
                          <Line type="monotone" dataKey="Bus 101" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3 3" name="Electric Bus 101" />
                          <Line type="monotone" dataKey="Bus 202" stroke="#10B981" strokeWidth={1.5} strokeDasharray="3 3" name="Electric Bus 202" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
