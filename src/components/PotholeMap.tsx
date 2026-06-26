import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import { 
  AlertTriangle, 
  Navigation, 
  PlusCircle, 
  Filter, 
  CheckCircle, 
  Loader, 
  MapPin, 
  Info,
  Calendar,
  Layers,
  Activity,
  User,
  Compass,
  Upload,
  Image as ImageIcon,
  Search,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Zap,
  Car,
  History
} from 'lucide-react';
import { GoogleDriveFile } from '../types';
import { uploadBinaryFile, getFileBlob, listFolderFiles, getFileText, updateFileContent } from '../lib/drive';
import { logNewReport, logVerification, logResolutionEarned } from '../lib/gamification';

// Resolve Google Maps Platform key from various possible sources
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Strict geographical boundary constraint to keep interactions inside India
const INDIA_BOUNDS = {
  north: 35.5133,
  south: 6.4627,
  west: 68.1097,
  east: 97.3956,
};

const INDIA_CITIES = [
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, zoom: 12 },
  { name: 'Bengaluru (HQ)', lat: 12.9716, lng: 77.5946, zoom: 12 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, zoom: 12 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, zoom: 12 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, zoom: 12 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, zoom: 12 }
];

// Helper component to programmatically handle center/zoom updates in React-Leaflet
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      animate: true,
      duration: 1.5
    });
  }, [center, zoom, map]);
  return null;
}

// Helper component to handle click events on React-Leaflet maps
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

const inferCategory = (title: string = '', description: string = '') => {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('pothole') || text.includes('hole') || text.includes('crater') || text.includes('pit') || text.includes('cavity') || text.includes('patch') || text.includes('bump')) {
    return { name: 'Pothole', emoji: '🕳️', color: '#EF4444' };
  }
  if (text.includes('sewer') || text.includes('drain') || text.includes('water') || text.includes('flood') || text.includes('leak') || text.includes('clog') || text.includes('pipe') || text.includes('overflow') || text.includes('gutter')) {
    return { name: 'Sewer/Drainage', emoji: '💧', color: '#3B82F6' };
  }
  if (text.includes('debris') || text.includes('trash') || text.includes('garbage') || text.includes('rubble') || text.includes('stone') || text.includes('gravel') || text.includes('spill') || text.includes('waste') || text.includes('dustbin') || text.includes('litter')) {
    return { name: 'Debris', emoji: '⚠️', color: '#F59E0B' };
  }
  if (text.includes('sign') || text.includes('board') || text.includes('post') || text.includes('marker') || text.includes('milestone') || text.includes('painted') || text.includes('lane') || text.includes('zebra') || text.includes('crossing')) {
    return { name: 'Road Signage', emoji: '🛑', color: '#DC2626' };
  }
  if (text.includes('traffic') || text.includes('light') || text.includes('signal') || text.includes('lamp') || text.includes('junction') || text.includes('intersection') || text.includes('speed') || text.includes('camera')) {
    return { name: 'Traffic Light', emoji: '🚦', color: '#10B981' };
  }
  return { name: 'Other Hazard', emoji: '🚧', color: '#8B5CF6' };
};

// Custom icon creator helper for Leaflet markers using Tailwind CSS
const createCustomIcon = (color: string, emoji: string = '🚧', isNew: boolean = false, isUser: boolean = false) => {
  if (isUser) {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-6 h-6 bg-blue-400 rounded-full opacity-40 animate-ping"></div>
          <div class="relative w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
        </div>
      `,
      className: 'custom-user-gps-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center group">
        <!-- Pulsing beacon for high scannability and visual scannability -->
        <div class="absolute -top-1 w-10 h-10 rounded-full animate-ping opacity-25" style="background-color: ${color};"></div>
        <!-- Pin Body -->
        <div class="relative w-9 h-9 rounded-full border-[3px] border-white dark:border-slate-900 shadow-xl flex items-center justify-center transform hover:scale-110 duration-200 transition-transform text-white" style="background-color: ${color};">
          ${isNew ? '<span class="text-sm font-black font-sans text-white">+</span>' : `<span class="text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-none leading-none">${emoji}</span>`}
        </div>
        <!-- Pin Tip / Triangle pointer -->
        <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] -mt-[1px] filter drop-shadow-md" style="border-t-color: ${color};"></div>
      </div>
    `,
    className: 'custom-hazard-pin-icon',
    iconSize: [40, 46],
    iconAnchor: [20, 46],
    popupAnchor: [0, -46]
  });
};

interface PotholeMapProps {
  file: GoogleDriveFile;
  fileContent: string;
  token: string | null;
  onUpdateFileContent: (newContent: string) => Promise<void>;
  folderId: string | null;
  darkMode?: boolean;
}

export default function PotholeMap({
  file,
  fileContent,
  token,
  onUpdateFileContent,
  folderId,
  darkMode = false
}: PotholeMapProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  // Filtering & View state
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeCity, setActiveCity] = useState(INDIA_CITIES[0]);

  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: INDIA_CITIES[0].lat, lng: INDIA_CITIES[0].lng });
  const [mapZoom, setMapZoom] = useState(INDIA_CITIES[0].zoom);

  // Map search state
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isMapSearching, setIsMapSearching] = useState(false);

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    setIsMapSearching(true);
    setLocationStatus(null);
    setSaveError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchQuery
        )}&limit=5&countrycodes=in`
      );
      if (!response.ok) {
        throw new Error('Geocoding service returned an error.');
      }
      const data = await response.json();
      if (!data || data.length === 0) {
        setLocationStatus('No locations matched within India limits.');
        setIsMapSearching(false);
        return;
      }

      const topResult = data[0];
      const lat = parseFloat(topResult.lat);
      const lng = parseFloat(topResult.lon);

      // Confirm boundary limits
      const isInsideIndia =
        lat >= INDIA_BOUNDS.south &&
        lat <= INDIA_BOUNDS.north &&
        lng >= INDIA_BOUNDS.west &&
        lng <= INDIA_BOUNDS.east;

      if (isInsideIndia) {
        setNewReportCoords({ lat, lng });
        setIsReporting(true);
        setFormTitle('');
        setFormDescription('');
        setMapCenter({ lat, lng });
        setMapZoom(15);
        setLocationStatus(`Searched and mapped: ${topResult.display_name}`);
      } else {
        setLocationStatus('Result found but lies outside Indian territorial limits.');
      }
    } catch (err) {
      console.error('Map search failed:', err);
      setLocationStatus('Failed to retrieve location details from search provider.');
    } finally {
      setIsMapSearching(false);
    }
  };
  
  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // New report form state
  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formDescription, setFormDescription] = useState('');

  // AI Categorization states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [predictedSLA, setPredictedSLA] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [trafficImpact, setTrafficImpact] = useState('');

  const handleAICategorize = async () => {
    if (!formDescription.trim()) {
      setSaveError('Please enter a description first so the AI can analyze it.');
      return;
    }
    setIsAnalyzing(true);
    setSaveError(null);
    setAiRationale(null);
    try {
      const response = await fetch('/api/gemini/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, description: formDescription })
      });
      if (!response.ok) {
        throw new Error('Server returned an error.');
      }
      const data = await response.json();
      if (data.suggestedTitle) {
        setFormTitle(data.suggestedTitle);
      }
      if (data.severity) {
        const sev = data.severity.charAt(0).toUpperCase() + data.severity.slice(1).toLowerCase();
        if (['Critical', 'High', 'Moderate', 'Low'].includes(sev)) {
          setFormSeverity(sev);
        }
      }
      if (data.predictedSLA) {
        setPredictedSLA(data.predictedSLA);
      }
      if (data.urgency) {
        setUrgencyLevel(data.urgency);
      }
      if (data.trafficImpact) {
        setTrafficImpact(data.trafficImpact);
      }
      setAiRationale(`AI Categorized as [${data.category || 'Hazard'}]: ${data.rationale}`);
    } catch (err) {
      console.error('AI categorization failed:', err);
      setSaveError('AI categorization service failed. Please try again or select manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isPolishing, setIsPolishing] = useState(false);

  const handleAIPolish = async () => {
    if (!formDescription.trim()) {
      setSaveError('Please enter some rough notes in the description first so the AI can enrich it.');
      return;
    }
    setIsPolishing(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/gemini/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formDescription })
      });
      if (!response.ok) {
        throw new Error('Server returned an error.');
      }
      const data = await response.json();
      if (data.polished) {
        setFormDescription(data.polished);
      }
    } catch (err) {
      console.error('AI polish failed:', err);
      setSaveError('AI description polishing failed. Please try again.');
    } finally {
      setIsPolishing(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Image Download State for Selected Pin
  const [selectedReportImageUrl, setSelectedReportImageUrl] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Parse CSV records
  useEffect(() => {
    if (!fileContent) return;
    try {
      const lines = fileContent.trim().split('\n');
      if (lines.length === 0) return;
      const headers = lines[0].split(',').map(h => h.trim());
      const parsed = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(',');
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ? values[idx].trim() : '';
        });
        // Safely set default values for gamification/predictive SLA columns
        row.Upvotes = Number(row.Upvotes || 0);
        row.Downvotes = Number(row.Downvotes || 0);
        row.ReporterId = row.ReporterId || 'resident';
        row.PredictedSLA = row.PredictedSLA || 'Typically fixed within 48 hours';
        row.UrgencyLevel = row.UrgencyLevel || row.Severity || 'Moderate';
        row.TrafficImpact = row.TrafficImpact || 'Minor';
        row.StatusHistory = row.StatusHistory || row.Status || 'Reported';
        parsed.push(row);
      }
      setReports(parsed);
    } catch (err) {
      console.error('Error parsing pothole reports:', err);
    }
  }, [fileContent]);

  // Handle selected report photo download from Google Drive
  useEffect(() => {
    let active = true;
    if (selectedReportImageUrl) {
      URL.revokeObjectURL(selectedReportImageUrl);
      setSelectedReportImageUrl(null);
    }
    
    if (selectedReport?.ImageId && token) {
      setIsDownloadingImage(true);
      getFileBlob(token, selectedReport.ImageId)
        .then((blob) => {
          if (!active) return;
          const url = URL.createObjectURL(blob);
          setSelectedReportImageUrl(url);
          setIsDownloadingImage(false);
        })
        .catch((err) => {
          console.error('Error loading image from Google Drive:', err);
          if (active) {
            setIsDownloadingImage(false);
          }
        });
    } else {
      setIsDownloadingImage(false);
    }

    return () => {
      active = false;
    };
  }, [selectedReport, token]);

  // Clean up selection preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (selectedReportImageUrl) {
        URL.revokeObjectURL(selectedReportImageUrl);
      }
    };
  }, [imagePreviewUrl, selectedReportImageUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };

  // Update center when city changes
  const handleCityChange = (cityName: string) => {
    const city = INDIA_CITIES.find(c => c.name === cityName);
    if (city) {
      setActiveCity(city);
      setMapCenter({ lat: city.lat, lng: city.lng });
      setMapZoom(city.zoom);
    }
  };

  // Browser live location integration
  const handleLocateMe = () => {
    setIsLocating(true);
    setLocationStatus(null);
    if (!navigator.geolocation) {
      setLocationStatus('GPS Geolocation is not supported by this browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Confirm location is within general boundaries of India
        const isInsideIndia = 
          lat >= INDIA_BOUNDS.south && 
          lat <= INDIA_BOUNDS.north && 
          lng >= INDIA_BOUNDS.west && 
          lng <= INDIA_BOUNDS.east;
        
        if (isInsideIndia) {
          setUserLocation({ lat, lng });
          setMapCenter({ lat, lng });
          setMapZoom(15);
          setLocationStatus('Located your active GPS position in India.');
        } else {
          // If the user's actual location is outside India, generate high-fidelity simulated Indian coordinates
          // centered around the selected city to maintain the "Only available in India" rule gracefully.
          const offsetLat = (Math.random() - 0.5) * 0.01;
          const offsetLng = (Math.random() - 0.5) * 0.01;
          const simulatedLat = activeCity.lat + offsetLat;
          const simulatedLng = activeCity.lng + offsetLng;
          
          setUserLocation({ lat: simulatedLat, lng: simulatedLng });
          setMapCenter({ lat: simulatedLat, lng: simulatedLng });
          setMapZoom(15);
          setLocationStatus(`GPS simulated within ${activeCity.name} grid (actual coordinates outside India limits).`);
        }
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation failed, falling back to simulated Indian GPS nodes:', error);
        // On permission block or timeout, simulate inside the active city
        const offsetLat = (Math.random() - 0.5) * 0.01;
        const offsetLng = (Math.random() - 0.5) * 0.01;
        const simulatedLat = activeCity.lat + offsetLat;
        const simulatedLng = activeCity.lng + offsetLng;

        setUserLocation({ lat: simulatedLat, lng: simulatedLng });
        setMapCenter({ lat: simulatedLat, lng: simulatedLng });
        setMapZoom(15);
        setLocationStatus(`Simulated high-accuracy GPS node in ${activeCity.name} (hardware permission restricted).`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Click on map to schedule a new report
  const handleMapClick = (lat: number, lng: number) => {
    // Check boundaries
    const isInsideIndia = 
      lat >= INDIA_BOUNDS.south && 
      lat <= INDIA_BOUNDS.north && 
      lng >= INDIA_BOUNDS.west && 
      lng <= INDIA_BOUNDS.east;

    if (!isInsideIndia) {
      setLocationStatus('Warning: Location must be restricted to within India territorial limits.');
      return;
    }

    setNewReportCoords({ lat, lng });
    setIsReporting(true);
    setFormTitle('');
    setFormDescription('');
    setSaveError(null);
  };

  // Save/Update report status back to Google Drive
  const handleUpdateStatus = async (reportId: string, nextStatus: string) => {
    const updatedReports = reports.map(r => {
      if (r.Id === reportId) {
        const history = r.StatusHistory ? `${r.StatusHistory} -> ${nextStatus}` : `${r.Status} -> ${nextStatus}`;
        return { ...r, Status: nextStatus, StatusHistory: history };
      }
      return r;
    });

    await compileAndSaveToDrive(updatedReports);
    if (selectedReport && selectedReport.Id === reportId) {
      setSelectedReport({ ...selectedReport, Status: nextStatus });
    }
  };

  const handleVote = async (reportId: string, isUpvote: boolean) => {
    let triggeredResolution = false;
    const updatedReports = reports.map(r => {
      if (r.Id === reportId) {
        let currentUpvotes = Number(r.Upvotes || 0);
        let currentDownvotes = Number(r.Downvotes || 0);
        let status = r.Status;
        let statusHistory = r.StatusHistory || r.Status || 'Reported';

        if (isUpvote) {
          currentUpvotes += 1;
        } else {
          currentDownvotes += 1;
          // Auto-archiving if 3 or more resolved (downvotes) votes:
          if (currentDownvotes >= 3 && status !== 'Closed') {
            status = 'Closed';
            statusHistory += ' -> Closed';
            triggeredResolution = true;
          }
        }
        return {
          ...r,
          Upvotes: currentUpvotes,
          Downvotes: currentDownvotes,
          Status: status,
          StatusHistory: statusHistory
        };
      }
      return r;
    });

    await compileAndSaveToDrive(updatedReports);
    
    // Update local state for selected report
    const updatedSelected = updatedReports.find(r => r.Id === reportId);
    if (updatedSelected) {
      setSelectedReport(updatedSelected);
    }
    
    // Reward points for verification (+15 CKP)
    logVerification();
    
    if (triggeredResolution) {
      // Award +100 CKP for resolving issue
      logResolutionEarned();
    }
  };

  // Save new report submitted in form
  const handleNewReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportCoords) return;
    if (!formTitle.trim()) {
      setSaveError('Please enter a brief title describing the pothole or hazard.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const newId = `P${String(Math.floor(100 + Math.random() * 900))}`;
    let uploadedImageId = '';

    if (selectedImageFile && token && folderId) {
      try {
        uploadedImageId = await uploadBinaryFile(
          token,
          `${newId}_hazard_photo.jpg`,
          folderId,
          selectedImageFile.type || 'image/jpeg',
          selectedImageFile
        );
      } catch (err: any) {
        console.error('Error uploading hazard photo to Google Drive:', err);
        setSaveError(`Failed to upload photo: ${err.message || 'Drive error'}. Attempting to save report description without the image...`);
        setIsSaving(false);
        return;
      }
    }

    const categoryInfo = inferCategory(formTitle, formDescription);
    const newRecord = {
      Id: newId,
      Title: formTitle.replace(/,/g, ' '),
      Latitude: newReportCoords.lat.toFixed(6),
      Longitude: newReportCoords.lng.toFixed(6),
      Severity: formSeverity,
      Status: 'Reported',
      Description: formDescription.replace(/,/g, ' ').replace(/\n/g, ' '),
      ReportedAt: new Date().toISOString(),
      ImageId: uploadedImageId,
      Upvotes: 0,
      Downvotes: 0,
      ReporterId: token ? 'you' : 'resident',
      PredictedSLA: predictedSLA || 'Typically fixed within 48 hours',
      UrgencyLevel: urgencyLevel || formSeverity,
      TrafficImpact: trafficImpact || 'Minor',
      StatusHistory: 'Reported'
    };

    const nextReports = [...reports, newRecord];
    
    try {
      await compileAndSaveToDrive(nextReports);

      // Append this data as a new entry in 'reports.csv' within the UrbanPulse Drive folder
      if (token && folderId) {
        try {
          const files = await listFolderFiles(token, folderId);
          const reportsFile = files.find(f => f.name?.toLowerCase() === 'reports.csv');
          const newRow = `${newRecord.Id},${newRecord.Title || ''},${newRecord.Latitude || ''},${newRecord.Longitude || ''},${newRecord.Severity || ''},${newRecord.Status || ''},${newRecord.Description || ''},${newRecord.ReportedAt || ''},${newRecord.ImageId || ''},${newRecord.Upvotes},${newRecord.Downvotes},${newRecord.ReporterId},${newRecord.PredictedSLA},${newRecord.UrgencyLevel},${newRecord.TrafficImpact},${newRecord.StatusHistory}`;
          
          if (reportsFile) {
            // Get current content of reports.csv
            let currentContent = await getFileText(token, reportsFile.id);
            // Ensure proper line endings
            if (currentContent && !currentContent.endsWith('\n')) {
              currentContent += '\n';
            }
            const updatedContent = currentContent + newRow + '\n';
            // Update the file in Drive
            await updateFileContent(token, reportsFile.id, updatedContent, 'text/csv');
          } else {
            // Create a new reports.csv if it doesn't exist
            const headerRow = 'Id,Title,Latitude,Longitude,Severity,Status,Description,ReportedAt,ImageId,Upvotes,Downvotes,ReporterId,PredictedSLA,UrgencyLevel,TrafficImpact,StatusHistory';
            const initialContent = `${headerRow}\n${newRow}\n`;
            await uploadBinaryFile(
              token,
              'reports.csv',
              folderId,
              'text/csv',
              new Blob([initialContent], { type: 'text/csv' })
            );
          }
        } catch (csvErr: any) {
          console.error('Error syncing with reports.csv:', csvErr);
        }
      }

      // Reward points to the reporter
      logNewReport(categoryInfo.name === 'Pothole', categoryInfo.name === 'Sewer/Drainage');

      setNewReportCoords(null);
      setIsReporting(false);
      setSelectedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      // Reset AI states
      setPredictedSLA('');
      setUrgencyLevel('');
      setTrafficImpact('');
      setLocationStatus(`Successfully reported ${newId} and uploaded secure record to Google Drive.`);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to sync with Google Drive.');
    } finally {
      setIsSaving(false);
    }
  };

  const compileAndSaveToDrive = async (updatedList: any[]) => {
    // Generate CSV string matching original headers
    const headerRow = 'Id,Title,Latitude,Longitude,Severity,Status,Description,ReportedAt,ImageId,Upvotes,Downvotes,ReporterId,PredictedSLA,UrgencyLevel,TrafficImpact,StatusHistory';
    const bodyRows = updatedList.map(r => {
      return `${r.Id},${r.Title || ''},${r.Latitude || ''},${r.Longitude || ''},${r.Severity || ''},${r.Status || ''},${r.Description || ''},${r.ReportedAt || ''},${r.ImageId || ''},${r.Upvotes ?? 0},${r.Downvotes ?? 0},${r.ReporterId || 'admin'},${r.PredictedSLA || ''},${r.UrgencyLevel || ''},${r.TrafficImpact || ''},${r.StatusHistory || ''}`;
    });
    const csvContent = [headerRow, ...bodyRows].join('\n');
    
    await onUpdateFileContent(csvContent);
    setReports(updatedList);
  };

  // Filtering calculations
  const filteredReports = reports.filter(r => {
    const matchSev = selectedSeverity === 'All' || r.Severity === selectedSeverity;
    const matchStat = selectedStatus === 'All' || r.Status === selectedStatus;
    return matchSev && matchStat;
  });

  const severityColors: Record<string, string> = {
    Critical: '#EF4444', // Red
    High: '#F97316',     // Orange
    Moderate: '#F59E0B', // Amber
    Low: '#10B981',      // Emerald
  };

  const severityBgs: Record<string, string> = {
    Critical: 'bg-rose-50 text-rose-700 border-rose-100',
    High: 'bg-orange-50 text-orange-700 border-orange-100',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-100',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  const statusBgs: Record<string, string> = {
    Reported: 'bg-blue-50 text-blue-700 border-blue-150',
    'In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-150',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-150',
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-0 select-none">
      
      {/* Left Side: Map Container */}
      <div className="flex-1 min-h-[350px] lg:h-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative flex flex-col">
        {/* Real-time Map Search Overlay */}
        <div className="absolute top-4 left-4 z-[1001] w-80 max-w-[calc(100%-2rem)]">
          <form onSubmit={handleMapSearch} className="relative flex items-center shadow-lg rounded-xl overflow-hidden bg-white border border-slate-200">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Indian cities, towns or roads..."
              value={mapSearchQuery}
              onChange={(e) => setMapSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2.5 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              id="pothole-map-location-search-input"
            />
            <button
              type="submit"
              disabled={isMapSearching}
              className="absolute right-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isMapSearching ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </form>
        </div>

        {/* Geolocation Status overlay banner */}
        {locationStatus && (
          <div className="absolute top-16 left-4 right-4 z-[1000] bg-slate-900/90 text-white text-[10px] font-medium px-3.5 py-2 rounded-xl backdrop-blur-xs flex items-center gap-2 shadow-md leading-relaxed animate-fade-in">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{locationStatus}</span>
            <button 
              onClick={() => setLocationStatus(null)} 
              className="ml-auto hover:text-slate-300 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating controls in map corners */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-md font-bold text-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="Locate my position inside India"
          >
            {isLocating ? (
              <Loader className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            )}
            <span>{isLocating ? 'Locating...' : 'My Location'}</span>
          </button>
        </div>

        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={mapZoom}
          zoomControl={true}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
        >
          <ChangeView center={[mapCenter.lat, mapCenter.lng]} zoom={mapZoom} />
          <MapClickHandler onClick={handleMapClick} />
          
          <TileLayer
            attribution={darkMode ? '&copy; <a href="https://carto.com/">CARTO</a> contributors' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          />

          {/* Live Location Marker */}
          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]} 
              icon={createCustomIcon('#3B82F6', '📍', false, true)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <span className="font-bold text-blue-600">Your Live GPS Node</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Latitude: {userLocation.lat.toFixed(4)}<br/>Longitude: {userLocation.lng.toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render Pothole markers from Drive CSV */}
          {filteredReports.map((report) => {
            const lat = parseFloat(report.Latitude);
            const lng = parseFloat(report.Longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            const category = inferCategory(report.Title, report.Description);
            const color = category.color || severityColors[report.Severity] || '#6366F1';

            return (
              <Marker
                key={report.Id}
                position={[lat, lng]}
                icon={createCustomIcon(color, category.emoji, false, false)}
                eventHandlers={{
                  click: () => {
                    setSelectedReport(report);
                    setNewReportCoords(null);
                    setIsReporting(false);
                  }
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[200px] text-slate-800 font-sans text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${severityBgs[report.Severity] || 'bg-slate-50'}`}>
                        {report.Severity}
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${statusBgs[report.Status] || 'bg-slate-50'}`}>
                        {report.Status}
                      </span>
                    </div>
                    <h4 className="font-bold mt-2 text-slate-900 leading-snug">{report.Title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{report.Description}</p>
                    <div className="mt-2 border-t border-slate-100 pt-1 text-[9px] text-slate-400 font-mono">
                      Coords: {lat.toFixed(4)}, {lng.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Floating marker when placing a new report */}
          {newReportCoords && (
            <Marker 
              position={[newReportCoords.lat, newReportCoords.lng]} 
              draggable={true}
              icon={createCustomIcon('#10B981', '+', true, false)}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setNewReportCoords({ lat: position.lat, lng: position.lng });
                }
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <span className="font-bold block text-emerald-600 mb-1">New Hazard Location</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    Lat: {newReportCoords.lat.toFixed(6)}<br/>
                    Lng: {newReportCoords.lng.toFixed(6)}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-1">Drag marker to adjust location</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

        {/* Right Side: Filters, Controls & Report Form */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
          {/* City Jumper */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-500 stroke-[1.5]" />
              Jump to India Hub
            </h3>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {INDIA_CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleCityChange(c.name)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    activeCity.name === c.name
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Filters or Details card */}
          {!isReporting && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex-1 flex flex-col min-h-0">
              {selectedReport ? (
                /* Selected Pothole/Hazard Details Screen */
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hazard Details</span>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-405 dark:hover:text-indigo-300 cursor-pointer"
                    >
                      ← Back to list
                    </button>
                  </div>

                  <div className="mt-3.5 space-y-4 flex-1 overflow-y-auto pr-1">
                    {/* Status & Severity Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${severityBgs[selectedReport.Severity] || 'bg-slate-50'}`}>
                        {selectedReport.Severity} Severity
                      </span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${statusBgs[selectedReport.Status] || 'bg-slate-50'}`}>
                        {selectedReport.Status}
                      </span>
                      {selectedReport.UrgencyLevel && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> {selectedReport.UrgencyLevel} Urgency
                        </span>
                      )}
                    </div>

                    {/* AI-Powered Predictive Resolution Timeline */}
                    <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/80 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5 fill-indigo-500/20 text-indigo-600 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">AI Predictive Resolution SLA</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Timeline: {selectedReport.PredictedSLA || 'Typically fixed within 48 hours'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-500" />
                            <span>Urgency: {selectedReport.UrgencyLevel || 'Moderate'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="w-3 h-3 text-indigo-500" />
                            <span>Traffic: {selectedReport.TrafficImpact || 'Minor'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consensus Verification & Consensus Score */}
                    {selectedReport.Status !== 'Closed' && (
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Community Verification
                          </span>
                          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-550">Consensus weight</span>
                        </div>

                        {/* Confidence Score Gauge */}
                        {(() => {
                          const up = Number(selectedReport.Upvotes || 0);
                          const down = Number(selectedReport.Downvotes || 0);
                          const tot = up + down;
                          const pct = tot > 0 ? Math.round((up / tot) * 100) : 100;
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-black">
                                <span className={pct >= 70 ? 'text-emerald-600 dark:text-emerald-405' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-455'}>
                                  {pct}% Confidence
                                </span>
                                <span className="text-slate-450 dark:text-slate-500 font-medium text-[10px]">
                                  {up} Up / {tot} Total Votes
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                                <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${100 - pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action buttons to verify */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote(selectedReport.Id, true)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold shadow-3xs cursor-pointer transition-colors active:scale-95 duration-100"
                            title="Verify you saw this issue to earn Civic Karma points"
                          >
                            <ThumbsUp className="w-3 h-3 text-emerald-500 fill-emerald-500/10" />
                            <span>Still here (+15)</span>
                          </button>
                          <button
                            onClick={() => handleVote(selectedReport.Id, false)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold shadow-3xs cursor-pointer transition-colors active:scale-95 duration-100"
                            title="Flag this as resolved to archive it"
                          >
                            <ThumbsDown className="w-3 h-3 text-rose-500 fill-rose-500/10" />
                            <span>Resolved (+15)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Title & Description block */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{selectedReport.Title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        {selectedReport.Description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Evidence Photo */}
                    {selectedReport.ImageId && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Evidence Photo</label>
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 h-40 flex items-center justify-center relative shadow-xs">
                          {isDownloadingImage ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <Loader className="w-5 h-5 text-indigo-500 animate-spin" />
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Downloading from Drive...</span>
                            </div>
                          ) : selectedReportImageUrl ? (
                            <img 
                              src={selectedReportImageUrl} 
                              alt="Hazard Photo" 
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-center p-3 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                              Failed to load hazard photo
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location Metadata */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3 space-y-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Report ID</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{selectedReport.Id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reporter</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{selectedReport.ReporterId || 'resident'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coordinates</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{parseFloat(selectedReport.Latitude).toFixed(4)}, {parseFloat(selectedReport.Longitude).toFixed(4)}</span>
                      </div>
                      {selectedReport.ReportedAt && (
                        <div className="flex justify-between">
                          <span>Reported On</span>
                          <span className="text-slate-700 dark:text-slate-300">{new Date(selectedReport.ReportedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedReport.StatusHistory && (
                        <div className="flex flex-col gap-1 border-t border-slate-200/60 dark:border-slate-800/80 pt-1.5 mt-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <History className="w-2.5 h-2.5" /> State Audit Log
                          </span>
                          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 truncate">{selectedReport.StatusHistory}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remediation Controls */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                    {selectedReport.Status === 'Reported' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReport.Id, 'In Progress')}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-center animate-fade-in"
                      >
                        Begin Remediation
                      </button>
                    )}
                    {selectedReport.Status !== 'Resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReport.Id, 'Resolved')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer text-center animate-fade-in"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Normal Filtering & Summary list view */
                <>
                  <button
                    onClick={() => {
                      setNewReportCoords({ lat: mapCenter.lat, lng: mapCenter.lng });
                      setIsReporting(true);
                      setFormTitle('');
                      setFormDescription('');
                      setSelectedImageFile(null);
                      setImagePreviewUrl(null);
                      setSaveError(null);
                    }}
                    className="w-full mb-4 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Report Hazard at Map Center</span>
                  </button>

                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-slate-500 stroke-[1.5]" />
                    Filter Infrastructure Logs
                  </h3>

                  <div className="mt-4 space-y-3.5">
                    {/* Severity selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Severity Level</label>
                      <div className="flex flex-wrap gap-1">
                        {['All', 'Critical', 'High', 'Moderate', 'Low'].map((sev) => (
                          <button
                            key={sev}
                            onClick={() => setSelectedSeverity(sev)}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors border cursor-pointer ${
                              selectedSeverity === sev
                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Repair Status</label>
                      <div className="flex flex-wrap gap-1">
                        {['All', 'Reported', 'In Progress', 'Resolved'].map((stat) => (
                          <button
                            key={stat}
                            onClick={() => setSelectedStatus(stat)}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors border cursor-pointer ${
                              selectedStatus === stat
                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {stat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats / Issue list */}
                  <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 flex-1 overflow-y-auto">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider block mb-2">
                      Active Issues ({filteredReports.length})
                    </label>
                    <div className="space-y-1.5">
                      {filteredReports.map((r) => (
                        <div 
                          key={r.Id}
                          className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-slate-150 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700 rounded-xl transition-all flex items-center justify-between gap-2 text-left bg-white dark:bg-slate-950/10"
                        >
                          <div 
                            onClick={() => {
                              setSelectedReport(r);
                              setMapCenter({ lat: parseFloat(r.Latitude), lng: parseFloat(r.Longitude) });
                              setMapZoom(14);
                            }}
                            className="flex-1 min-w-0 cursor-pointer flex items-start gap-2"
                          >
                            <div className="p-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-500 mt-0.5 shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{r.Title}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 font-mono">{r.Id}</span>
                                <span className="text-slate-300 dark:text-slate-800 text-[8px]">•</span>
                                <span className={`text-[8px] font-extrabold px-1 rounded-sm ${severityBgs[r.Severity] || 'bg-slate-50'}`}>
                                  {r.Severity}
                                </span>
                                {r.ImageId && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-850 text-[8px]">•</span>
                                    <ImageIcon className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" title="Has attached image evidence" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Upvote Column */}
                          <div className="flex flex-col items-center justify-center shrink-0 border-l border-slate-100 dark:border-slate-800/80 pl-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(r.Id, true);
                              }}
                              className="p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-450 hover:text-emerald-600 dark:text-slate-550 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Verify/Upvote report"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                              {Number(r.Upvotes || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredReports.length === 0 && (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-[10px] font-medium">
                          No matching records found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Helper CTA */}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[9px] text-slate-450 dark:text-slate-500 font-medium flex items-start gap-1.5 leading-normal">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Tip: Tap anywhere on the map inside India limits to record a hazard at that precise location.</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* New Report Form overlay card */}
          {isReporting && newReportCoords && (
            <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-md flex flex-col gap-3.5 animate-slide-up">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  Report New Hazard
                </h3>
                <button
                  onClick={() => {
                    setIsReporting(false);
                    setNewReportCoords(null);
                    clearSelectedImage();
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {saveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-medium">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleNewReportSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Issue Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Major fissure, Open drain hole"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-none px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Severity</label>
                    <select
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 focus:outline-none px-2.5 py-1.5 rounded-lg text-slate-700 font-bold"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Coordinates</label>
                    <div className="text-[9px] font-mono bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-slate-500 text-center leading-normal">
                      {newReportCoords.lat.toFixed(3)}, {newReportCoords.lng.toFixed(3)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Description</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAIPolish}
                        disabled={isPolishing || !formDescription.trim()}
                        className="text-[9px] text-emerald-600 hover:text-emerald-800 disabled:text-slate-400 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-50 px-2 py-0.5 rounded-md"
                      >
                        {isPolishing ? (
                          <Loader className="w-3 h-3 animate-spin text-emerald-500" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{isPolishing ? 'Polishing...' : 'AI Polish'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAICategorize}
                        disabled={isAnalyzing || !formDescription.trim()}
                        className="text-[9px] text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-50 px-2 py-0.5 rounded-md"
                      >
                        {isAnalyzing ? (
                          <Loader className="w-3 h-3 animate-spin text-indigo-500" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                        )}
                        <span>{isAnalyzing ? 'Analyzing...' : 'AI Categorize'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Provide description of the hazard..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-none px-2.5 py-1.5 rounded-lg text-slate-700 font-medium"
                  />
                  {aiRationale && (
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-[9px] text-indigo-700 font-semibold leading-relaxed flex items-start gap-1.5 animate-fade-in">
                      <Sparkles className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{aiRationale}</span>
                    </div>
                  )}
                </div>

                {/* Evidence Photo Uploader */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Evidence Photo (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="pothole-photo-upload"
                    />
                    <label
                      htmlFor="pothole-photo-upload"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{selectedImageFile ? 'Change Photo' : 'Upload Photo'}</span>
                    </label>
                    {selectedImageFile && (
                      <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[120px]">
                        {selectedImageFile.name}
                      </span>
                    )}
                  </div>
                  {imagePreviewUrl && (
                    <div className="mt-2 relative w-full h-24 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                      <img src={imagePreviewUrl} alt="Preview" className="h-full object-contain" />
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-bold p-1 rounded-full w-5 h-5 flex items-center justify-center hover:bg-slate-950 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Submit Secure Report</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
  );
}
