import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Camera,
  Upload,
  Folder,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Loader,
  Compass,
  PlusCircle,
  HelpCircle,
  X,
  FileSpreadsheet,
  Search,
  Sparkles
} from 'lucide-react';
import { GoogleDriveFile } from '../types';
import {
  uploadBinaryFile,
  listFolderFiles,
  getFileText,
  updateFileContent
} from '../lib/drive';
import { logNewReport } from '../lib/gamification';

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ReportIssueProps {
  token: string | null;
  folderId: string | null;
  onRefresh: () => void;
  onSuccessViewChange?: () => void;
  darkMode?: boolean;
}

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

// Helper to programmatically pan/zoom map
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

// Click listener for the map to place/move the report marker
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

// Custom markers using Leaflet with rich high-contrast Tailwind styling and animations
const createCustomMarkerIcon = (color: string, emoji: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center group">
        <!-- Pulsing beacon for high scannability and visual scannability -->
        <div class="absolute -top-1 w-10 h-10 rounded-full animate-ping opacity-25" style="background-color: ${color};"></div>
        <!-- Main Icon Container with ultra thick contrast borders and premium shadows -->
        <div class="relative w-9 h-9 rounded-full border-[3px] border-white dark:border-slate-900 shadow-xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-200" style="background-color: ${color};">
          <span class="text-base filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-none leading-none">${emoji}</span>
        </div>
        <!-- Pointer Pin Tip -->
        <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] -mt-[1px] filter drop-shadow-md" style="border-t-color: ${color};"></div>
      </div>
    `,
    className: 'custom-report-pin',
    iconSize: [40, 46],
    iconAnchor: [20, 46]
  });
};

const userGpsIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center w-6 h-6">
      <div class="absolute w-6 h-6 bg-blue-400 rounded-full opacity-45 animate-ping"></div>
      <div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `,
  className: 'custom-user-gps-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function ReportIssue({ token, folderId, onRefresh, onSuccessViewChange, darkMode = false }: ReportIssueProps) {
  // Map positioning state
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Bengaluru default
  const [mapZoom, setMapZoom] = useState(12);

  // Map search state
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isMapSearching, setIsMapSearching] = useState(false);

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    setIsMapSearching(true);
    setLocationStatus(null);
    setStatusMessage(null);

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
        setReportCoords({ lat, lng });
        setMapCenter([lat, lng]);
        setMapZoom(15);
        setLocationStatus(`Mapped location: ${topResult.display_name}`);
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

  // Active City filter/focus
  const [activeCity, setActiveCity] = useState(INDIA_CITIES[1]); // Bengaluru default

  // Geolocation tracking
  const [userLiveCoords, setUserLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Form states
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formDescription, setFormDescription] = useState('');

  // AI Categorization states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [predictedSLA, setPredictedSLA] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [trafficImpact, setTrafficImpact] = useState('');

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const runPotholeDetection = async (fileToDetect: File) => {
    setIsDetecting(true);
    setStatusMessage(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(fileToDetect);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        try {
          const response = await fetch('/api/detect-pothole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, filename: fileToDetect.name })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to detect potholes.');
          }

          const data = await response.json();
          setDetectionResult(data);

          // Update local preview to show the annotated image!
          setLocalFilePreview(data.annotatedImage);

          // Auto-fill form fields
          setFormTitle(data.title || '');
          setFormDescription(data.description || '');
          if (data.severity) {
            const sev = data.severity.charAt(0).toUpperCase() + data.severity.slice(1).toLowerCase();
            if (['Critical', 'High', 'Moderate', 'Low'].includes(sev)) {
              setFormSeverity(sev);
            }
          }
          if (data.predictedSLA) {
            setPredictedSLA(data.predictedSLA);
          }
          if (data.urgencyLevel) {
            setUrgencyLevel(data.urgencyLevel);
          }
          if (data.trafficImpact) {
            setTrafficImpact(data.trafficImpact);
          }

          setStatusMessage({
            type: 'success',
            text: `AI Surface Scan complete (${data.provider}). Found ${data.pothole_count} pothole(s) covering ${data.damage_percentage}% of road segment.`
          });
        } catch (err: any) {
          console.error(err);
          setStatusMessage({ type: 'error', text: err.message || 'Image detection failed.' });
        } finally {
          setIsDetecting(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to read image file.' });
      setIsDetecting(false);
    }
  };

  const handleAICategorize = async () => {
    if (!formDescription.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a description first so the AI can analyze it.' });
      return;
    }
    setIsAnalyzing(true);
    setStatusMessage(null);
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
      setStatusMessage({ type: 'error', text: 'AI categorization service failed. Please try again or select manually.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isPolishing, setIsPolishing] = useState(false);

  const handleAIPolish = async () => {
    if (!formDescription.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter some rough notes in the description first so the AI can enrich it.' });
      return;
    }
    setIsPolishing(true);
    setStatusMessage(null);
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
        setStatusMessage({ type: 'success', text: 'Description successfully polished and enriched by AI!' });
      }
    } catch (err) {
      console.error('AI polish failed:', err);
      setStatusMessage({ type: 'error', text: 'AI description polishing failed. Please try again.' });
    } finally {
      setIsPolishing(false);
    }
  };

  // Image upload options states
  // 'camera' = Take with device camera, 'local' = Upload from local device, 'drive' = Select from UrbanPulse folder
  const [imageSource, setImageSource] = useState<'camera' | 'local' | 'drive'>('camera');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localFilePreview, setLocalFilePreview] = useState<string | null>(null);

  // Drive files image list
  const [driveImages, setDriveImages] = useState<GoogleDriveFile[]>([]);
  const [selectedDriveImageId, setSelectedDriveImageId] = useState<string>('');
  const [loadingDriveImages, setLoadingDriveImages] = useState(false);

  // Submit states
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch image files inside UrbanPulse on mount/refresh
  useEffect(() => {
    if (token && folderId) {
      loadDriveImages();
    }
  }, [token, folderId]);

  const loadDriveImages = async () => {
    if (!token || !folderId) return;
    setLoadingDriveImages(true);
    try {
      const filesList = await listFolderFiles(token, folderId);
      // Filter image files by extension or mimeType
      const filtered = filesList.filter(f => {
        const name = f.name?.toLowerCase() || '';
        const mime = f.mimeType?.toLowerCase() || '';
        return (
          mime.startsWith('image/') ||
          name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp') ||
          name.endsWith('.gif')
        );
      });
      setDriveImages(filtered);
    } catch (err) {
      console.error('Error loading drive images:', err);
    } finally {
      setLoadingDriveImages(false);
    }
  };

  // Geolocation trigger
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setLocationStatus(null);
    setStatusMessage(null);

    if (!navigator.geolocation) {
      setLocationStatus('GPS Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Check if inside India bounds
        const isInsideIndia =
          lat >= INDIA_BOUNDS.south &&
          lat <= INDIA_BOUNDS.north &&
          lng >= INDIA_BOUNDS.west &&
          lng <= INDIA_BOUNDS.east;

        if (isInsideIndia) {
          setUserLiveCoords({ lat, lng });
          setReportCoords({ lat, lng });
          setMapCenter([lat, lng]);
          setMapZoom(15);
          setLocationStatus('Located. Set report marker to your live GPS location.');
        } else {
          // Fallback simulation near active city coordinates
          const offsetLat = (Math.random() - 0.5) * 0.006;
          const offsetLng = (Math.random() - 0.5) * 0.006;
          const simLat = activeCity.lat + offsetLat;
          const simLng = activeCity.lng + offsetLng;

          setUserLiveCoords({ lat: simLat, lng: simLng });
          setReportCoords({ lat: simLat, lng: simLng });
          setMapCenter([simLat, simLng]);
          setMapZoom(15);
          setLocationStatus(`GPS simulated in ${activeCity.name} grid (device is outside India limits).`);
        }
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation failed, falling back to simulated Indian GPS coordinates:', error);
        const offsetLat = (Math.random() - 0.5) * 0.006;
        const offsetLng = (Math.random() - 0.5) * 0.006;
        const simLat = activeCity.lat + offsetLat;
        const simLng = activeCity.lng + offsetLng;

        setUserLiveCoords({ lat: simLat, lng: simLng });
        setReportCoords({ lat: simLat, lng: simLng });
        setMapCenter([simLat, simLng]);
        setMapZoom(15);
        setLocationStatus(`Simulated high-accuracy GPS node in ${activeCity.name} (hardware permission restricted).`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Handle click on map to position the report marker
  const handleMapClick = (lat: number, lng: number) => {
    const isInsideIndia =
      lat >= INDIA_BOUNDS.south &&
      lat <= INDIA_BOUNDS.north &&
      lng >= INDIA_BOUNDS.west &&
      lng <= INDIA_BOUNDS.east;

    if (!isInsideIndia) {
      setStatusMessage({
        type: 'error',
        text: 'Warning: Location pins must be placed inside Indian territorial limits.'
      });
      return;
    }

    setReportCoords({ lat, lng });
    setStatusMessage(null);
  };

  // Handle local image file changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      const url = URL.createObjectURL(file);
      setLocalFilePreview(url);
      runPotholeDetection(file);
    }
  };

  // Clear current image choice
  const handleClearImage = () => {
    setLocalFile(null);
    if (localFilePreview) {
      URL.revokeObjectURL(localFilePreview);
      setLocalFilePreview(null);
    }
    setSelectedDriveImageId('');
    setDetectionResult(null);
  };

  // Submit secure report
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!token || !folderId) {
      setStatusMessage({ type: 'error', text: 'Google Drive authorization token is missing.' });
      return;
    }

    if (!reportCoords) {
      setStatusMessage({ type: 'error', text: 'Please interactively drop a marker on the map to define the coordinates first.' });
      return;
    }

    if (!formTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a descriptive title for this issue.' });
      return;
    }

    setIsSaving(true);
    const reportId = `P${String(Math.floor(100 + Math.random() * 900))}`;
    let finalImageId = '';

    try {
      // Step 1: Handle image upload if user uploaded via device Camera or local files
      if ((imageSource === 'camera' || imageSource === 'local') && localFile) {
        try {
          let fileToUpload: Blob | File = localFile;

          if (detectionResult?.annotatedImage) {
            const matches = detectionResult.annotatedImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const byteCharacters = atob(matches[2]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              fileToUpload = new Blob([byteArray], { type: matches[1] || 'image/jpeg' });
            }
          }

          finalImageId = await uploadBinaryFile(
            token,
            `${reportId}_hazard_photo.jpg`,
            folderId,
            localFile.type || 'image/jpeg',
            fileToUpload
          );
        } catch (uploadErr: any) {
          console.error('Image upload failed:', uploadErr);
          throw new Error(`Evidence image upload failed: ${uploadErr.message}`);
        }
      } else if (imageSource === 'drive' && selectedDriveImageId) {
        finalImageId = selectedDriveImageId;
      }

      // Step 2: Format submission payload
      const cleanTitle = formTitle.replace(/,/g, ' ').replace(/\n/g, ' ').trim();
      const cleanDesc = formDescription.replace(/,/g, ' ').replace(/\n/g, ' ').trim();
      const categoryInfo = inferCategory(cleanTitle, cleanDesc);

      const newRecord = {
        Id: reportId,
        Title: cleanTitle,
        Latitude: reportCoords.lat.toFixed(6),
        Longitude: reportCoords.lng.toFixed(6),
        Severity: formSeverity,
        Status: 'Reported',
        Description: cleanDesc,
        ReportedAt: new Date().toISOString(),
        ImageId: finalImageId,
        Upvotes: 0,
        Downvotes: 0,
        ReporterId: token ? 'you' : 'resident',
        PredictedSLA: predictedSLA || 'Typically fixed within 48 hours',
        UrgencyLevel: urgencyLevel || formSeverity,
        TrafficImpact: trafficImpact || 'Minor',
        StatusHistory: 'Reported'
      };

      const newRow = `${newRecord.Id},${newRecord.Title},${newRecord.Latitude},${newRecord.Longitude},${newRecord.Severity},${newRecord.Status},${newRecord.Description},${newRecord.ReportedAt},${newRecord.ImageId},${newRecord.Upvotes},${newRecord.Downvotes},${newRecord.ReporterId},${newRecord.PredictedSLA},${newRecord.UrgencyLevel},${newRecord.TrafficImpact},${newRecord.StatusHistory}`;

      // Step 3: Append/Update `pothole_reports.csv`
      const filesList = await listFolderFiles(token, folderId);
      const potholeReportsFile = filesList.find(f => f.name?.toLowerCase() === 'pothole_reports.csv' || f.name?.toLowerCase() === 'reports.csv');

      if (potholeReportsFile) {
        let currentPotholes = await getFileText(token, potholeReportsFile.id);
        if (currentPotholes && !currentPotholes.endsWith('\n')) {
          currentPotholes += '\n';
        }
        const updatedPotholes = currentPotholes + newRow + '\n';
        await updateFileContent(token, potholeReportsFile.id, updatedPotholes, 'text/csv');
      } else {
        const headerRow = 'Id,Title,Latitude,Longitude,Severity,Status,Description,ReportedAt,ImageId,Upvotes,Downvotes,ReporterId,PredictedSLA,UrgencyLevel,TrafficImpact,StatusHistory';
        const initialPotholes = `${headerRow}\n${newRow}\n`;
        await uploadBinaryFile(token, 'pothole_reports.csv', folderId, 'text/csv', new Blob([initialPotholes], { type: 'text/csv' }));
      }

      // Step 4: Append/Update `reports.csv` within the UrbanPulse Drive folder
      const reportsCsvFile = filesList.find(f => f.name?.toLowerCase() === 'reports.csv');
      if (reportsCsvFile) {
        let currentReports = await getFileText(token, reportsCsvFile.id);
        if (currentReports && !currentReports.endsWith('\n')) {
          currentReports += '\n';
        }
        const updatedReports = currentReports + newRow + '\n';
        await updateFileContent(token, reportsCsvFile.id, updatedReports, 'text/csv');
      } else {
        const headerRow = 'Id,Title,Latitude,Longitude,Severity,Status,Description,ReportedAt,ImageId,Upvotes,Downvotes,ReporterId,PredictedSLA,UrgencyLevel,TrafficImpact,StatusHistory';
        const initialReports = `${headerRow}\n${newRow}\n`;
        await uploadBinaryFile(token, 'reports.csv', folderId, 'text/csv', new Blob([initialReports], { type: 'text/csv' }));
      }

      // Reward points to the reporter
      logNewReport(categoryInfo.name === 'Pothole', categoryInfo.name === 'Sewer/Drainage');

      // Reset local AI states
      setPredictedSLA('');
      setUrgencyLevel('');
      setTrafficImpact('');

      // Success Reset
      setStatusMessage({
        type: 'success',
        text: `Successfully saved secure report ${reportId} with coordinates [${reportCoords.lat.toFixed(4)}, ${reportCoords.lng.toFixed(4)}] directly into Google Drive!`
      });

      // Clear form inputs
      setFormTitle('');
      setFormDescription('');
      setReportCoords(null);
      handleClearImage();

      // Trigger workspace reloads
      onRefresh();

      // If callback is supplied, route them back after brief delay
      if (onSuccessViewChange) {
        setTimeout(() => {
          onSuccessViewChange();
        }, 1500);
      }

    } catch (err: any) {
      console.error('Submission failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sync with Google Drive.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 flex flex-col h-full overflow-hidden select-none transition-colors duration-300">
      {/* Header Panel */}
      <div className="h-14 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900/60 flex items-center justify-between px-6 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Report New Road Hazard</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Drop a marker and upload critical street infrastructure defects</p>
          </div>
        </div>

        {/* Quick City Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-150 dark:bg-slate-900 p-1 rounded-lg">
          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1.5">Zoom to:</span>
          {INDIA_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => {
                setActiveCity(city);
                setMapCenter([city.lat, city.lng]);
                setMapZoom(city.zoom);
              }}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${activeCity.name === city.name
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-3xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              {city.name.replace(' (HQ)', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form + Map Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Interactive Map */}
        <div className="w-3/5 h-full relative border-r border-slate-100 dark:border-slate-900 bg-slate-100 dark:bg-slate-950/20 flex flex-col">
          {/* Real-time Map Search Overlay */}
          <div className="absolute top-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)]">
            <form onSubmit={handleMapSearch} className="relative flex items-center shadow-lg rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Indian cities, towns or roads..."
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                className="w-full pl-9 pr-20 py-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-semibold transition-colors"
                id="map-location-search-input"
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

          <div className="flex-1 relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              zoomControl={true}
            >
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <MapClickHandler onClick={handleMapClick} />

              <TileLayer
                attribution={darkMode ? '&copy; <a href="https://carto.com/">CARTO</a> contributors' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
                url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
              />

              {/* Render Selected Point Marker */}
              {reportCoords && (() => {
                const category = inferCategory(formTitle, formDescription);
                return (
                  <Marker
                    position={[reportCoords.lat, reportCoords.lng]}
                    icon={createCustomMarkerIcon(category.color, category.emoji)}
                  />
                );
              })()}

              {/* Render User GPS Marker if Active */}
              {userLiveCoords && (
                <Marker
                  position={[userLiveCoords.lat, userLiveCoords.lng]}
                  icon={userGpsIcon}
                />
              )}
            </MapContainer>
          </div>

          {/* Location Action Overlay Panel */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              id="report-locate-me-btn"
            >
              {isLocating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Scanning GPS limits...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 animate-pulse" />
                  <span>Use Current Location</span>
                </>
              )}
            </button>
          </div>

          {/* Guide banner overlay */}
          <div className="absolute top-4 right-4 z-10 bg-slate-900/90 text-white rounded-xl p-3 max-w-xs shadow-lg backdrop-blur-xs text-[10px] leading-normal flex items-start gap-2 border border-slate-700">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Interactive Drop Marker</p>
              <p className="text-slate-300">
                Click anywhere on the map above inside India bounds to drop a pin. Coordinates will automatically update in the reporting sidebar on the right.
              </p>
            </div>
          </div>

          {locationStatus && (
            <div className="absolute bottom-4 right-4 z-10 bg-slate-900/85 text-white font-mono text-[9px] rounded-lg px-2.5 py-1.5 shadow border border-slate-700">
              {locationStatus}
            </div>
          )}
        </div>

        {/* Right Side: Form & Asset Picker Panel */}
        <div className="w-2/5 h-full bg-white dark:bg-slate-950 flex flex-col overflow-y-auto p-5 transition-colors">
          <div className="mb-4">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Hazard Registry Form</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Provide detailed evidence to schedule emergency road repairs</p>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs font-medium mb-4 flex items-start gap-2.5 leading-relaxed border transition-colors ${statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
              }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 flex-1 flex flex-col">
            {/* Title field */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Issue Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Deep asphalt crater, Open sewer drain"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 font-semibold transition-colors"
              />
            </div>

            {/* Severity & Coordinates row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Severity Priority</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-bold transition-colors"
                >
                  <option value="Critical" className="bg-white dark:bg-slate-900">🚨 Critical (Axle Hazard)</option>
                  <option value="High" className="bg-white dark:bg-slate-900">⚠️ High Priority</option>
                  <option value="Moderate" className="bg-white dark:bg-slate-900">⚡ Moderate Risk</option>
                  <option value="Low" className="bg-white dark:bg-slate-900">🌱 Low (Cosmetic)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Coordinates Mapped</label>
                {reportCoords ? (
                  <div className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/40 p-2 rounded-xl text-indigo-700 dark:text-indigo-400 text-center font-bold transition-colors">
                    {reportCoords.lat.toFixed(5)}, {reportCoords.lng.toFixed(5)}
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1 transition-colors animate-pulse">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Drop Pin on Map</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Hazard Description</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAIPolish}
                    disabled={isPolishing || !formDescription.trim()}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 disabled:text-slate-400 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:bg-slate-50 dark:disabled:bg-slate-900 px-2 py-0.5 rounded-lg border border-transparent dark:border-slate-850"
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
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:text-slate-400 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:bg-slate-50 dark:disabled:bg-slate-900 px-2 py-0.5 rounded-lg border border-transparent dark:border-slate-850"
                  >
                    {isAnalyzing ? (
                      <Loader className="w-3 h-3 animate-spin text-indigo-500" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Auto-Categorize'}</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                placeholder="Enter details about safety risks, nearby landmarks, lane positions, etc..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none px-3 py-2 rounded-xl text-slate-750 dark:text-slate-200 font-medium transition-colors"
              />
              {aiRationale && (
                <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold leading-relaxed flex items-start gap-1.5 animate-fade-in transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{aiRationale}</span>
                </div>
              )}
            </div>

            {/* Segmented Image Source Selection */}
            <div className="border border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/20 p-3 rounded-xl space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attach Evidence Image</span>
                <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">Secure Upload</span>
              </div>

              <div className="bg-slate-200/60 dark:bg-slate-900 p-0.5 rounded-lg flex items-center gap-0.5 text-[10px] font-bold text-slate-500 transition-colors">
                <button
                  type="button"
                  onClick={() => { setImageSource('camera'); handleClearImage(); }}
                  className={`flex-1 py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${imageSource === 'camera'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setImageSource('local'); handleClearImage(); }}
                  className={`flex-1 py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${imageSource === 'local'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Device Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setImageSource('drive'); handleClearImage(); }}
                  className={`flex-1 py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer ${imageSource === 'drive'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Drive Folder</span>
                </button>
              </div>

              {/* View according to choice */}
              {imageSource === 'camera' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pothole-report-camera"
                  />
                  <label
                    htmlFor="pothole-report-camera"
                    className="w-full py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border-dashed"
                  >
                    <Camera className="w-4 h-4 text-indigo-650 animate-pulse" />
                    <span>{localFile ? 'Recapture Image' : 'Trigger Device Camera'}</span>
                  </label>
                </div>
              )}

              {imageSource === 'local' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pothole-report-local"
                  />
                  <label
                    htmlFor="pothole-report-local"
                    className="w-full py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors border-dashed"
                  >
                    <Upload className="w-4 h-4 text-indigo-650" />
                    <span>{localFile ? 'Change File' : 'Browse Files in Folder'}</span>
                  </label>
                  {imageSource === 'drive' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedDriveImageId}
                          onChange={(e) => setSelectedDriveImageId(e.target.value)}
                          disabled={loadingDriveImages || driveImages.length === 0}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:outline-none p-2 rounded-lg text-slate-705 dark:text-slate-300 font-semibold"
                        >
                          {loadingDriveImages ? (
                            <option>Scanning drive folder images...</option>
                          ) : driveImages.length === 0 ? (
                            <option>No images found in UrbanPulse</option>
                          ) : (
                            <>
                              <option value="" className="bg-white dark:bg-slate-900">-- Choose file from UrbanPulse folder --</option>
                              {driveImages.map(img => (
                                <option key={img.id} value={img.id} className="bg-white dark:bg-slate-900">{img.name}</option>
                              ))}
                            </>
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={loadDriveImages}
                          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer"
                          title="Reload folder photos list"
                        >
                          {loadingDriveImages ? (
                            <Loader className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          ) : (
                            <Folder className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {driveImages.length > 0 && !selectedDriveImageId && (
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Select any historical photo previously stored inside the UrbanPulse workspace.</p>
                      )}
                    </div>
                  )}

                  {/* Show preview if file selected */}
                  {localFilePreview && (imageSource === 'camera' || imageSource === 'local') && (
                    <div className="relative w-full h-40 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
                      {isDetecting ? (
                        <div className="flex flex-col items-center gap-2 text-white text-center">
                          <Loader className="w-5 h-5 animate-spin text-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-350">Scanning Road surface (YOLO/Gemini)...</span>
                        </div>
                      ) : (
                        <>
                          <img src={localFilePreview} alt="Local Capture Preview" className="h-full object-contain" />
                          <button
                            type="button"
                            onClick={handleClearImage}
                            className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-950 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {detectionResult && (
                            <div className="absolute bottom-2 left-2 bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-200 animate-pulse" />
                              <span>Detected: {detectionResult.pothole_count} Pothole(s) ({detectionResult.damage_percentage}% Damage Area)</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Selected Drive Image indicator */}
                  {imageSource === 'drive' && selectedDriveImageId && (
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/40 rounded-lg text-[10px] font-bold text-indigo-800 dark:text-indigo-400 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">
                        Selected: {driveImages.find(i => i.id === selectedDriveImageId)?.name || 'Image'}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="text-indigo-650 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 cursor-pointer"
                      >
                        ✕ Clear Selection
                      </button>
                    </div>
                  )}            </div>
              )}
            </div>

            {/* Submission triggers */}
            <div className="pt-2 mt-auto">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Synchronizing Secure Payload to Drive...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit Secure UrbanPulse Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
