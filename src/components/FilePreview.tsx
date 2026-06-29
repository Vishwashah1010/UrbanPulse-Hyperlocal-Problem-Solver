import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Calendar, 
  HardDrive, 
  Eye, 
  Table, 
  BarChart2, 
  TrendingUp, 
  Layers, 
  Activity, 
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building2,
  Minimize2,
  Maximize2,
  Code
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { GoogleDriveFile, CsvParsedData, CsvDataRow } from '../types';
import PotholeMap from './PotholeMap';

interface FilePreviewProps {
  file: GoogleDriveFile | null;
  fileContent: string | null;
  fileBlob: Blob | null;
  isLoading: boolean;
  error: string | null;
  onDownload: () => void;
  token: string | null;
  onUpdateFileContent: (newContent: string) => Promise<void>;
  folderId: string | null;
  darkMode?: boolean;
}

export default function FilePreview({
  file,
  fileContent,
  fileBlob,
  isLoading,
  error,
  onDownload,
  token,
  onUpdateFileContent,
  folderId,
  darkMode = false
}: FilePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
  const [csvData, setCsvData] = useState<CsvParsedData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [csvFilter, setCsvFilter] = useState<string>('All');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Parse CSV when fileContent changes
  useEffect(() => {
    if (file && fileContent && (file.mimeType === 'text/csv' || file.name.endsWith('.csv'))) {
      const parsed = parseCSV(fileContent);
      setCsvData(parsed);
      setActiveTab('preview'); // Reset to dashboard/chart view
    } else {
      setCsvData(null);
    }
  }, [file, fileContent]);

  // Handle Image Blob rendering
  useEffect(() => {
    if (file && fileBlob && file.mimeType.startsWith('image/')) {
      const url = URL.createObjectURL(fileBlob);
      setImageUrl(url);
      setZoomLevel(100);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setImageUrl(null);
    }
  }, [file, fileBlob]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 select-none">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-slate-600">Retrieving secure stream from Google Drive...</p>
        <p className="text-[10px] text-slate-400 mt-1">Decrypting assets & compiling telemetry charts</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-full mb-3">
          <HardDrive className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Connection Interrupted</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{error}</p>
        <button 
          onClick={onDownload}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-colors"
          id="preview-error-retry-btn"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!file) {
    return <WelcomeDashboard />;
  }

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

  const isCSV = file.mimeType === 'text/csv' || file.name.endsWith('.csv');
  const isJSON = file.mimeType === 'application/json' || file.name.endsWith('.json');
  const isMarkdown = file.mimeType === 'text/markdown' || file.name.endsWith('.md');
  const isImage = file.mimeType.startsWith('image/');

  const handleDownloadClick = () => {
    if (!fileBlob) return;
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 flex flex-col h-full overflow-hidden transition-colors duration-300">
      {/* Detail Toolbar Header */}
      <div className="h-14 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900/60 flex items-center justify-between px-6 shrink-0 select-none transition-colors duration-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" id="preview-filename">{getFileDisplayName(file.name)}</h1>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="truncate max-w-[150px]">{file.mimeType}</span>
              <span>•</span>
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3 h-3" />
                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles for CSV/JSON */}
          {(isCSV || isJSON) && (
            <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center gap-0.5 text-[11px] font-medium mr-2 transition-colors">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview' 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-semibold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                id="tab-btn-dashboard"
              >
                {isCSV ? <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> : <Layers className="w-3.5 h-3.5 text-indigo-500" />}
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'data' 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-semibold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                id="tab-btn-rawdata"
              >
                {isCSV ? <Table className="w-3.5 h-3.5 text-emerald-500" /> : <Code className="w-3.5 h-3.5 text-emerald-500" />}
                {isCSV ? 'Spreadsheet' : 'Raw JSON'}
              </button>
            </div>
          )}

          {fileBlob && (
            <button
              onClick={handleDownloadClick}
              className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Download file to computer"
              id="download-file-btn"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors shadow-xs"
              title="Open inside Google Drive"
              id="open-drive-link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Drive</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Preview Screen */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col min-h-0">
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-xl shadow-xs p-3 sm:p-6 flex-1 flex flex-col overflow-y-auto lg:overflow-hidden transition-colors duration-300">
          {isMarkdown && fileContent && (
            <div className="prose max-w-none text-slate-800 dark:text-slate-200">
              <MarkdownRenderer text={fileContent} />
            </div>
          )}

          {isCSV && csvData && fileContent && (
            <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden">
              {activeTab === 'preview' ? (
                <CsvDashboardView 
                  csvData={csvData} 
                  filename={file.name} 
                  filter={csvFilter} 
                  setFilter={setCsvFilter}
                  file={file}
                  fileContent={fileContent}
                  token={token}
                  onUpdateFileContent={onUpdateFileContent}
                  folderId={folderId}
                  darkMode={darkMode}
                />
              ) : (
                <SpreadsheetView csvData={csvData} />
              )}
            </div>
          )}

          {isJSON && fileContent && (
            <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden">
              {activeTab === 'preview' ? (
                <JsonDashboardView rawText={fileContent} darkMode={darkMode} />
              ) : (
                <pre className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto border border-slate-800">
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>
          )}

          {isImage && imageUrl && (
            <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-50/50 rounded-lg border border-dashed border-slate-200 overflow-hidden">
              {/* Image Controls */}
              <div className="absolute top-3 right-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg shadow-xs flex items-center gap-2.5 z-10 select-none text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <button 
                  onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                  className="hover:text-slate-900 font-bold px-1"
                >
                  —
                </button>
                <span>{zoomLevel}%</span>
                <button 
                  onClick={() => setZoomLevel(Math.min(300, zoomLevel + 25))}
                  className="hover:text-slate-900 font-bold px-1"
                >
                  +
                </button>
              </div>

              <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-4">
                <img 
                  src={imageUrl} 
                  alt={file.name} 
                  className="rounded transition-all duration-150"
                  style={{ transform: `scale(${zoomLevel / 100})`, maxWidth: '90%', maxHeight: '90%' }}
                />
              </div>
            </div>
          )}

          {!isMarkdown && !isCSV && !isJSON && !isImage && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div className="p-4 bg-indigo-50/50 rounded-full text-indigo-500 mb-3">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Preview Not Available</h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-5 leading-relaxed">
                This file format ({file.mimeType}) cannot be directly parsed in the browser dashboard. 
                You can download the file locally or open it directly in Google Drive to inspect.
              </p>
              <div className="flex items-center gap-3">
                {fileBlob && (
                  <button
                    onClick={handleDownloadClick}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
                    id="unsupported-download-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </button>
                )}
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
                    id="unsupported-drive-link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Drive
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== SUBCOMPONENTS ==================== */

/**
 * Parses a standard raw CSV string into structured arrays
 */
function parseCSV(text: string): CsvParsedData {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: CsvDataRow = {};
    headers.forEach((h, idx) => {
      const val = values[idx] ?? '';
      const numericVal = Number(val);
      row[h] = !isNaN(numericVal) && val !== '' ? numericVal : val;
    });
    return row;
  });
  
  return { headers, rows };
}

/**
 * Spreadsheet Table View for CSV File Content
 */
function SpreadsheetView({ csvData }: { csvData: CsvParsedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const filteredRows = csvData.rows.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none">
      {/* Search Input */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <input
          type="text"
          placeholder="Filter table..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-300 dark:focus:border-slate-700 rounded-lg text-xs w-64 focus:outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500 text-slate-850 dark:text-slate-200"
          id="table-filter-input"
        />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Showing {filteredRows.length} of {csvData.rows.length} rows
        </span>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-auto border border-slate-100 dark:border-slate-900 rounded-lg shadow-2xs bg-white dark:bg-slate-950/20">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-900 font-semibold text-slate-700 dark:text-slate-300 sticky top-0 z-10">
              {csvData.headers.map((header) => (
                <th key={header} className="p-3 font-semibold uppercase tracking-wider text-[10px]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/10">
            {paginatedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors font-mono text-[11px]">
                {csvData.headers.map((header) => (
                  <td key={header} className="p-3 truncate max-w-[200px]">
                    {String(row[header] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 cursor-pointer"
              id="table-page-prev-btn"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 cursor-pointer"
              id="table-page-next-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Rich Dashboard Charts for CSV File Content (Station Telemetry / Transit Loads)
 */
function CsvDashboardView({ 
  csvData, 
  filename, 
  filter, 
  setFilter,
  file,
  fileContent,
  token,
  onUpdateFileContent,
  folderId,
  darkMode
}: { 
  csvData: CsvParsedData; 
  filename: string;
  filter: string;
  setFilter: (f: string) => void;
  file: GoogleDriveFile;
  fileContent: string;
  token: string | null;
  onUpdateFileContent: (newContent: string) => Promise<void>;
  folderId: string | null;
  darkMode?: boolean;
}) {
  const isSensors = filename.includes('sensors');
  const isRidership = filename.includes('ridership');
  const isPotholes = filename.includes('potholes') || filename.includes('pothole_reports');

  if (isPotholes) {
    return (
      <PotholeMap
        file={file}
        fileContent={fileContent}
        token={token}
        onUpdateFileContent={onUpdateFileContent}
        folderId={folderId}
        darkMode={darkMode}
      />
    );
  }

  if (isSensors) {
    // Unique Stations
    const stations = ['All', ...Array.from(new Set(csvData.rows.map(r => String(r['Station'] || ''))))];
    
    // Filter rows
    const displayRows = filter === 'All' 
      ? csvData.rows 
      : csvData.rows.filter(r => String(r['Station']) === filter);

    // Grouping by timestamp/idx for charts
    const chartData = displayRows.map((r, i) => ({
      name: r['Station'] !== filter ? `${String(r['Station']).slice(0, 5)}... ${i}` : new Date(String(r['Timestamp'] || '')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      PM25: Number(r['PM2.5(ug/m3)']),
      CO2: Number(r['CO2(ppm)']),
      Noise: Number(r['Noise(dB)']),
      Temperature: Number(r['Temperature(C)']),
      Station: r['Station']
    }));

    const avgPM25 = displayRows.reduce((acc, r) => acc + Number(r['PM2.5(ug/m3)'] || 0), 0) / displayRows.length;
    const avgCO2 = displayRows.reduce((acc, r) => acc + Number(r['CO2(ppm)'] || 0), 0) / displayRows.length;
    const avgNoise = displayRows.reduce((acc, r) => acc + Number(r['Noise(dB)'] || 0), 0) / displayRows.length;

    return (
      <div className="flex-1 flex flex-col overflow-hidden select-none">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Focus District:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:outline-none px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold"
              id="sensor-district-filter"
            >
              {stations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Station Telemetry Nodes
          </span>
        </div>

        {/* Vital stats widgets */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
            <h4 className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Avg PM2.5 (Particulate)</h4>
            <p className="text-xl font-bold text-emerald-900 mt-1">{avgPM25.toFixed(1)} <span className="text-xs font-semibold">µg/m³</span></p>
            <span className="text-[9px] text-emerald-600 mt-0.5 inline-block">
              {avgPM25 < 15 ? 'Excellent Quality (Safe)' : avgPM25 < 35 ? 'Moderate Indicator' : 'High Industrial Alert'}
            </span>
          </div>
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <h4 className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">Avg Carbon Dioxide</h4>
            <p className="text-xl font-bold text-indigo-900 mt-1">{avgCO2.toFixed(0)} <span className="text-xs font-semibold">ppm</span></p>
            <span className="text-[9px] text-indigo-600 mt-0.5 inline-block">
              Ambient baseline (Target: &lt;450)
            </span>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
            <h4 className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Ambient Noise Range</h4>
            <p className="text-xl font-bold text-amber-900 mt-1">{avgNoise.toFixed(1)} <span className="text-xs font-semibold">dB</span></p>
            <span className="text-[9px] text-amber-600 mt-0.5 inline-block">
              {avgNoise < 55 ? 'Residential Green zone' : avgNoise < 70 ? 'Moderate traffic flow' : 'High density corridor'}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-[220px]">
          <div className="border border-slate-100 p-3 rounded-xl flex flex-col">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">PM2.5 & CO2 Trend</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={9} />
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line yAxisId="left" type="monotone" dataKey="PM25" stroke="#10b981" strokeWidth={2} name="PM2.5 (ug/m3)" activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="CO2" stroke="#6366f1" strokeWidth={2} name="CO2 (ppm)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-100 p-3 rounded-xl flex flex-col">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Noise Level Metrics (dB)</h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#f59e0b" fontSize={9} domain={[0, 100]} />
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Noise" name="Noise level (dB)" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => {
                      const color = entry.Noise > 75 ? '#ef4444' : entry.Noise > 55 ? '#f59e0b' : '#10b981';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRidership) {
    // Render transit chart
    const chartData = csvData.rows.map((r) => ({
      hour: String(r['Hour'] || ''),
      'Metro Alpha': Number(r['Metro Line Alpha']),
      'Metro Beta': Number(r['Metro Line Beta']),
      'Bus 101': Number(r['Electric Bus 101']),
      'Bus 202': Number(r['Electric Bus 202']),
    }));

    return (
      <div className="flex-1 flex flex-col overflow-hidden select-none">
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
          <h3 className="text-xs font-semibold text-slate-600">Public Transit Commuter Flow Profile</h3>
          <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Hourly Commuter Load
          </span>
        </div>

        {/* Trend Area Chart */}
        <div className="flex-1 min-h-[250px] border border-slate-100 p-4 rounded-xl flex flex-col mb-4 bg-slate-50/20">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Load Curves: Heavy Rail vs Electric Bus mesh</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip wrapperStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="Metro Alpha" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAlpha)" name="Subway Line Alpha" />
                <Area type="monotone" dataKey="Metro Beta" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBeta)" name="Subway Line Beta" />
                <Line type="monotone" dataKey="Bus 101" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Electric Bus 101" />
                <Line type="monotone" dataKey="Bus 202" stroke="#10b981" strokeWidth={1.5} dot={false} name="Electric Bus 202" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center shrink-0">
          <div className="border border-slate-100 p-2.5 rounded-lg bg-white shadow-2xs">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Peak Rail Demand</p>
            <p className="text-sm font-bold text-indigo-700 mt-1">5,200/hr</p>
            <span className="text-[8px] text-slate-400">At 18:00 (Rush Hour)</span>
          </div>
          <div className="border border-slate-100 p-2.5 rounded-lg bg-white shadow-2xs">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Alpha Share</p>
            <p className="text-sm font-bold text-cyan-600 mt-1">58.5%</p>
            <span className="text-[8px] text-slate-400">Total rail load weight</span>
          </div>
          <div className="border border-slate-100 p-2.5 rounded-lg bg-white shadow-2xs">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Bus Fleet Capacity</p>
            <p className="text-sm font-bold text-amber-600 mt-1">1,490/hr</p>
            <span className="text-[8px] text-slate-400">Max hourly capacity</span>
          </div>
          <div className="border border-slate-100 p-2.5 rounded-lg bg-white shadow-2xs">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Daily Electrified Trips</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">38,100</p>
            <span className="text-[8px] text-slate-400">Zero emission travel footprint</span>
          </div>
        </div>
      </div>
    );
  }

  // Generic CSV chart fallback
  const firstNumeric = csvData.headers.find((h, i) => i > 0 && typeof csvData.rows[0]?.[h] === 'number');
  const labelCol = csvData.headers[0];

  if (!firstNumeric) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8 text-slate-400 select-none">
        <p className="text-xs">No numeric columns found to construct automatic chart dashboard. Use the Spreadsheet view instead.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none">
      <h3 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Raw Column Plot: {firstNumeric}</h3>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={csvData.rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={labelCol} stroke="#94a3b8" fontSize={9} />
            <YAxis stroke="#94a3b8" fontSize={9} />
            <Tooltip wrapperStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Line type="monotone" dataKey={firstNumeric} stroke="#6366f1" strokeWidth={2} name={firstNumeric} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Custom Visual Bento-Grid Dashboard for Demographics & City Metrics JSON
 */
function JsonDashboardView({ rawText, darkMode = false }: { rawText: string, darkMode?: boolean }) {
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
        <p className="text-xs font-semibold">Error parsing workspace JSON. View Raw JSON tab.</p>
      </div>
    );
  }

  const isUrbanPulseJson = parsed.projectName === 'UrbanPulse Analytics' || parsed.cityVitals;

  if (isUrbanPulseJson) {
    const vitals = parsed.cityVitals || {};
    const stats = parsed.districtStats || [];
    const modal = parsed.modalSharePct || {};

    const modalData = Object.keys(modal).map(key => ({
      name: key,
      value: Number(modal[key])
    }));

    const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    return (
      <div className="flex-1 overflow-y-auto pr-1 select-none space-y-5">
        {/* Bento Grid Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Commuters</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{vitals.totalPopulation?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
          <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Annual Growth</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{vitals.growthRate || 'N/A'}</p>
            </div>
          </div>
          <div className="p-4 bg-cyan-50/20 dark:bg-cyan-950/20 border border-cyan-100/70 dark:border-cyan-900/40 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sustainability Index</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{vitals.averageSustainabilityScore || '78'}/100</p>
            </div>
          </div>
        </div>

        {/* Charts block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Modal Share Pie Chart */}
          <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl flex flex-col h-64 bg-white dark:bg-slate-950/20">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-500" /> Commuter Modality Share (%)
            </h4>
            <div className="flex-1 flex items-center justify-between min-h-0">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {modalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 pl-4">
                {modalData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {entry.name}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* District Density Bar Chart */}
          <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl flex flex-col h-64 bg-white dark:bg-slate-950/20">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Population Density (residents/km²)
            </h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#f1f5f9"} />
                  <XAxis dataKey="district" stroke={darkMode ? "#64748b" : "#94a3b8"} fontSize={9} />
                  <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} fontSize={9} />
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="populationDensity" name="Density" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed District Metrics */}
        <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl bg-white dark:bg-slate-950/20">
          <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-3">District Environmental Footprint Indicators</h4>
          <div className="space-y-3">
            {stats.map((dist: any) => (
              <div key={dist.district} className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-lg transition-colors border border-slate-100 dark:border-slate-800/60">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{dist.district}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Primary Commute Mode: <span className="font-semibold text-slate-650 dark:text-slate-400">{dist.primaryMobility}</span></p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Commuters Flow</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">+{dist.commuterInflow?.toLocaleString()} /day</span>
                  </div>
                  <div className="text-right w-16">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider">Green Index</span>
                    <span className={`text-xs font-bold ${
                      dist.greenIndexPct > 40 ? 'text-emerald-600' : dist.greenIndexPct > 20 ? 'text-amber-500' : 'text-rose-500'
                    }`}>{dist.greenIndexPct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generic JSON viewer
  return (
    <pre className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto border border-slate-800">
      <code>{JSON.stringify(parsed, null, 2)}</code>
    </pre>
  );
}

/**
 * Beautiful, typeset Markdown renderer
 */
const MarkdownRenderer = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto my-4 border border-slate-800 shadow-sm leading-relaxed">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim() === '---') {
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<hr key={`hr-${i}`} className="my-5 border-slate-100" />);
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<h1 key={`h1-${i}`} className="text-lg font-bold text-slate-950 dark:text-white mt-5 mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">{parseInlineMarkdown(line.slice(2))}</h1>);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<h2 key={`h2-${i}`} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-4.5 mb-2.5 flex items-center gap-2">{parseInlineMarkdown(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<h3 key={`h3-${i}`} className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-3.5 mb-2">{parseInlineMarkdown(line.slice(4))}</h3>);
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      inList = true;
      listItems.push(line.trim().slice(2));
      continue;
    } else if (line.trim() !== '' && inList && !line.trim().startsWith('- ') && !line.trim().startsWith('* ')) {
      // continues list item or normal paragraph
    } else if (line.trim() === '' && inList) {
      elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
      listItems = [];
      inList = false;
      continue;
    }

    if (line.trim() !== '') {
      if (inList) {
        elements.push(<ul key={`list-${i}`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(<p key={`p-${i}`} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{parseInlineMarkdown(line)}</p>);
    }
  }

  if (inList) {
    elements.push(<ul key={`list-final`} className="list-disc pl-5 mb-4 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">{listItems.map((it, idx) => <li key={idx}>{parseInlineMarkdown(it)}</li>)}</ul>);
  }
  if (inCodeBlock) {
    elements.push(
      <pre key="code-final" className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto my-4 border border-slate-800 shadow-sm leading-relaxed">
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-1 overflow-y-auto max-h-[500px] pr-2 select-text">{elements}</div>;
};

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let current = text;
  let keyCounter = 0;

  while (current.length > 0) {
    const strongStart = current.indexOf('**');
    const codeStart = current.indexOf('`');

    if (strongStart === -1 && codeStart === -1) {
      parts.push(current);
      break;
    }

    if (strongStart !== -1 && (codeStart === -1 || strongStart < codeStart)) {
      if (strongStart > 0) {
        parts.push(current.substring(0, strongStart));
      }
      const nextBold = current.indexOf('**', strongStart + 2);
      if (nextBold !== -1) {
        const boldText = current.substring(strongStart + 2, nextBold);
        parts.push(<strong key={`b-${keyCounter++}`} className="font-bold text-slate-900 dark:text-white">{boldText}</strong>);
        current = current.substring(nextBold + 2);
      } else {
        parts.push(current.substring(strongStart));
        break;
      }
    } else {
      if (codeStart > 0) {
        parts.push(current.substring(0, codeStart));
      }
      const nextCode = current.indexOf('`', codeStart + 1);
      if (nextCode !== -1) {
        const codeText = current.substring(codeStart + 1, nextCode);
        parts.push(<code key={`c-${keyCounter++}`} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded text-[11px] font-mono text-slate-800 dark:text-slate-250 font-medium">{codeText}</code>);
        current = current.substring(nextCode + 1);
      } else {
        parts.push(current.substring(codeStart));
        break;
      }
    }
  }

  return <>{parts}</>;
}

/**
 * Beautiful default landing screen
 */
function WelcomeDashboard() {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 flex flex-col p-8 select-none overflow-y-auto transition-colors duration-300">
      {/* Landing Header */}
      <div className="max-w-3xl mx-auto w-full text-center mt-4 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Select a file from your UrbanPulse folder</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Unlock telemetry, environmental benchmarks, demographics stats, and transit vectors from Google Drive.
        </p>
      </div>

      <div className="max-w-3xl mx-auto w-full grid grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 p-5 rounded-2xl shadow-2xs flex flex-col justify-between transition-colors duration-300">
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Project Telemetry (CSV)</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mt-2">
              Deep dive into sensor node matrices measuring PM2.5 particulate ranges, carbon dioxide emissions, decibel ratings, and transit modal loads via interactive charts.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            <span>environmental_sensors.csv</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 p-5 rounded-2xl shadow-2xs flex flex-col justify-between transition-colors duration-300">
          <div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Urban Demographics (JSON)</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mt-2">
              Inspect structured district data sets capturing active commuters, density indices, green space canopy coverage, and commuter modality breakdown.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            <span>demographics_distribution.json</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Guide details */}
      <div className="max-w-3xl mx-auto w-full mt-10 p-4 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/40 rounded-xl flex items-center gap-4 text-xs font-medium text-indigo-900 dark:text-indigo-300 leading-relaxed transition-colors duration-300">
        <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <p>
          <strong>Need to edit files?</strong> All assets are loaded live from your actual Google Drive. Modifying folders or uploading assets in Drive will reflect here on a simple workspace refresh!
        </p>
      </div>
    </div>
  );
}
