import { GoogleDriveFile, ProjectFolder } from '../types';

export const LOCAL_SANDBOX_FILES: GoogleDriveFile[] = [
  { id: 'readme', name: 'README.md', mimeType: 'text/markdown', size: '1024' },
  { id: 'sensors', name: 'environmental_sensors.csv', mimeType: 'text/csv', size: '2048' },
  { id: 'ridership', name: 'transit_ridership.csv', mimeType: 'text/csv', size: '1024' },
  { id: 'demographics', name: 'demographics_distribution.json', mimeType: 'application/json', size: '1500' },
  { id: 'potholes', name: 'pothole_reports.csv', mimeType: 'text/csv', size: '2048' }
];

export const DEFAULT_LOCAL_CONTENTS: Record<string, string> = {
  readme: `# 🏙️ UrbanPulse: Smart City Planning & Transit Insights (Local Sandbox Mode)

Welcome to the **UrbanPulse Workspace**! (Bypassed Google Drive scope restrictions).

All data is running in local sandbox memory. Feel free to use the Map, report potholes, upvote/downvote, and inspect telemetry stats.
`,
  sensors: `Station,Timestamp,PM2.5(ug/m3),CO2(ppm),Temperature(C),Humidity(%),Noise(dB)
Downtown Core,2026-06-26T08:00:00Z,22.4,465,24.5,62,72
Downtown Core,2026-06-26T12:00:00Z,28.1,490,26.2,58,75
Downtown Core,2026-06-26T16:00:00Z,19.5,445,25.8,60,70
Green District,2026-06-26T08:00:00Z,8.2,385,21.8,75,45
Green District,2026-06-26T12:00:00Z,10.5,395,23.4,70,48
Green District,2026-06-26T16:00:00Z,7.8,380,22.1,72,44
Industrial Zone,2026-06-26T08:00:00Z,42.6,580,28.0,50,82
Industrial Zone,2026-06-26T12:00:00Z,48.9,610,29.5,45,85
Industrial Zone,2026-06-26T16:00:00Z,38.2,540,28.7,48,80
Waterfront Hub,2026-06-26T08:00:00Z,12.3,410,22.5,80,60
Waterfront Hub,2026-06-26T12:00:00Z,15.8,425,24.1,76,64
Waterfront Hub,2026-06-26T16:00:00Z,11.1,405,23.6,78,58
`,
  ridership: `Hour,Metro Line Alpha,Metro Line Beta,Electric Bus 101,Electric Bus 202
06:00,1200,850,220,180
08:00,4500,3200,650,580
10:00,2800,2100,410,390
12:00,2200,1800,350,330
14:00,2400,1950,380,360
16:00,3100,2400,480,450
18:00,5200,3900,780,710
20:00,2900,2200,450,420
22:00,1500,1100,260,210
`,
  demographics: JSON.stringify({
    projectName: "UrbanPulse Analytics",
    lastUpdated: "2026-06-26",
    cityVitals: {
      totalPopulation: 845000,
      growthRate: "1.4%",
      averageSustainabilityScore: 78
    },
    districtStats: [
      { district: "Downtown Core", populationDensity: 14500, commuterInflow: 280000, greenIndexPct: 12, primaryMobility: "Public Transit" },
      { district: "Green District", populationDensity: 4200, commuterInflow: 15000, greenIndexPct: 58, primaryMobility: "Walking/Cycling" },
      { district: "Industrial Zone", populationDensity: 1800, commuterInflow: 95000, greenIndexPct: 8, primaryMobility: "Personal Vehicles" },
      { district: "Waterfront Hub", populationDensity: 8900, commuterInflow: 120000, greenIndexPct: 34, primaryMobility: "Mixed Transit" }
    ],
    modalSharePct: { Metro: 38, Bus: 22, Walking: 15, Cycling: 10, PersonalCar: 15 }
  }, null, 2),
  potholes: `Id,Title,Latitude,Longitude,Severity,Status,Description,ReportedAt,ImageId,Upvotes,Downvotes,ReporterId,PredictedSLA,UrgencyLevel,TrafficImpact,StatusHistory
P001,Large Crater on Outer Ring Rd,12.9279,77.6811,Critical,Reported,Deep pothole on the service road near Bellandur flyover causing major traffic delays.,2026-06-25T10:30:00Z,,4,0,resident1@gmail.com,Typically fixed within 24 hours,Critical,Heavy,Reported
P002,Sunken Manhole Cover,18.9220,72.8347,Moderate,In Progress,Manhole cover is sunken by 4 inches at Colaba Causeway. Dangerous for two-wheelers.,2026-06-25T14:15:00Z,,2,1,resident2@gmail.com,Typically fixed within 5 days,Moderate,Moderate,Reported -> In Progress
P003,Open Trench on Sidewalk,28.6139,77.2090,High,Reported,Unfenced excavation on Janpath Road sidewalk. Pedestrian hazard.,2026-06-26T02:00:00Z,,5,0,resident3@gmail.com,Typically fixed within 48 hours,High,Moderate,Reported
P004,Waterlogging & Road Damage,13.0827,80.2707,Critical,In Progress,Post-monsoon waterlogging has stripped asphalt on Poonamallee High Rd.,2026-06-26T06:45:00Z,,8,0,resident4@gmail.com,Typically fixed within 24 hours,Critical,Heavy,Reported -> In Progress
P005,Broken Speed Breaker,17.3850,78.4867,Low,Closed,Speed breaker near Charminar is chipped with exposed iron rods.,2026-06-24T09:00:00Z,,1,3,resident5@gmail.com,Typically fixed within 5 days,Low,Minor,Reported -> In Progress -> Resolved -> Closed
`
};

export function isSandboxActive(): boolean {
  return localStorage.getItem('urbanpulse-sandbox-active') === 'true';
}

export function activateSandbox() {
  localStorage.setItem('urbanpulse-sandbox-active', 'true');
  initializeSandbox();
}

export function initializeSandbox() {
  const currentFiles = localStorage.getItem('urbanpulse-sandbox-files');
  if (!currentFiles) {
    localStorage.setItem('urbanpulse-sandbox-files', JSON.stringify(LOCAL_SANDBOX_FILES));
  }
  LOCAL_SANDBOX_FILES.forEach(file => {
    const fileKey = `urbanpulse-sandbox-file-${file.id}`;
    if (!localStorage.getItem(fileKey)) {
      localStorage.setItem(fileKey, DEFAULT_LOCAL_CONTENTS[file.id] || '');
    }
  });
}

function getSandboxFiles(): GoogleDriveFile[] {
  initializeSandbox();
  try {
    const data = localStorage.getItem('urbanpulse-sandbox-files');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Fallback if parsing fails
  }
  return LOCAL_SANDBOX_FILES;
}

function getSandboxFileContent(fileId: string): string {
  initializeSandbox();
  return localStorage.getItem(`urbanpulse-sandbox-file-${fileId}`) || DEFAULT_LOCAL_CONTENTS[fileId] || '';
}

function saveSandboxFileContent(fileId: string, content: string, mimeType: string) {
  initializeSandbox();
  try {
    localStorage.setItem(`urbanpulse-sandbox-file-${fileId}`, content);
  } catch (e: any) {
    // Check if it's a QuotaExceededError
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)) {
      console.warn("Storage quota exceeded. Cleaning up older sandbox images to free up space.");
      const imgKeys: { key: string; time: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('urbanpulse-sandbox-file-sandbox-img-')) {
          const idPart = key.replace('urbanpulse-sandbox-file-sandbox-img-', '');
          const time = parseInt(idPart) || 0;
          imgKeys.push({ key, time });
        }
      }
      
      // Sort oldest first
      imgKeys.sort((a, b) => a.time - b.time);
      
      let success = false;
      for (const item of imgKeys) {
        localStorage.removeItem(item.key);
        const files = getSandboxFiles();
        const fileIdPart = item.key.replace('urbanpulse-sandbox-file-', '');
        const updatedFiles = files.filter(f => f.id !== fileIdPart);
        localStorage.setItem('urbanpulse-sandbox-files', JSON.stringify(updatedFiles));
        
        try {
          localStorage.setItem(`urbanpulse-sandbox-file-${fileId}`, content);
          success = true;
          console.log(`Successfully freed up space by deleting old sandbox image ${item.key}`);
          break;
        } catch (retryErr) {
          // Keep deleting older images
        }
      }
      
      if (!success) {
        throw new Error("Local sandbox storage is completely full and cannot be written to. Please clear some disk space on your computer.");
      }
    } else {
      throw e;
    }
  }
  
  // update file size in file list
  const files = getSandboxFiles();
  const fileIndex = files.findIndex(f => f.id === fileId);
  if (fileIndex !== -1) {
    files[fileIndex].size = String(content.length);
  } else {
    // Add new file to list
    files.push({
      id: fileId,
      name: fileId.startsWith('sandbox-img-') ? `uploaded_image_${fileId.replace('sandbox-img-', '')}.jpg` : fileId,
      mimeType,
      size: String(content.length)
    });
  }
  try {
    localStorage.setItem('urbanpulse-sandbox-files', JSON.stringify(files));
  } catch (e: any) {
    console.error("Failed to save file index:", e);
  }
}

/**
 * Robust fetch wrapper with timeout configuration to prevent network calls from hanging indefinitely
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Connection timed out after ${timeout}ms while requesting Google Drive APIs`);
    }
    throw error;
  }
}

/**
 * Extracts descriptive error messages from Google API JSON responses
 */
async function handleApiError(res: Response, fallbackPrefix: string): Promise<never> {
  let errorMsg = res.statusText || '';
  try {
    const errJson = await res.json();
    if (errJson?.error?.message) {
      errorMsg = errJson.error.message;
    } else if (errJson?.error_description) {
      errorMsg = errJson.error_description;
    }
  } catch (e) {
    // ignore parsing failure
  }
  throw new Error(`${fallbackPrefix}: ${errorMsg || `HTTP ${res.status}`}`);
}

/**
 * Searches the user's Drive for folders named 'UrbanPulse'
 */
export async function findUrbanPulseFolder(token: string): Promise<ProjectFolder | null> {
  if (isSandboxActive()) {
    return { id: 'sandbox-folder', name: 'UrbanPulse' };
  }

  const q = encodeURIComponent("name contains 'UrbanPulse' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await handleApiError(res, 'Failed to search Drive');
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name,
      };
    }
    // Folder not found - fallback to sandbox
    console.warn('UrbanPulse folder not found in Drive. Automatically falling back to Local Sandbox.');
    activateSandbox();
    return { id: 'sandbox-folder', name: 'UrbanPulse' };
  } catch (error) {
    console.error('Error finding UrbanPulse folder, switching to Local Sandbox:', error);
    activateSandbox();
    return { id: 'sandbox-folder', name: 'UrbanPulse' };
  }
}

/**
 * Lists all files inside a specific Google Drive folder
 */
export async function listFolderFiles(token: string, folderId: string): Promise<GoogleDriveFile[]> {
  if (isSandboxActive() || folderId === 'sandbox-folder') {
    return getSandboxFiles();
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,iconLink)&orderBy=name`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await handleApiError(res, 'Failed to list files');
    }
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing files, falling back to sandbox files:', error);
    activateSandbox();
    return getSandboxFiles();
  }
}

/**
 * Fetches the binary content of a file as a Blob
 */
export async function getFileBlob(token: string, fileId: string): Promise<Blob> {
  if (isSandboxActive() || fileId === 'readme' || fileId === 'sensors' || fileId === 'ridership' || fileId === 'demographics' || fileId === 'potholes' || fileId.startsWith('sandbox-')) {
    const content = getSandboxFileContent(fileId);
    
    // Check if the content is a base64 encoded binary file
    if (content.startsWith('data:')) {
      const parts = content.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || '';
      const byteString = atob(parts[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mime });
    }
    
    return new Blob([content], { type: fileId === 'demographics' ? 'application/json' : 'text/plain' });
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await handleApiError(res, 'Failed to download file content');
    }
    return await res.blob();
  } catch (error) {
    console.error('Error fetching file blob, falling back to sandbox content:', error);
    const content = getSandboxFileContent(fileId);
    return new Blob([content], { type: 'text/plain' });
  }
}

/**
 * Fetches the text content of a file
 */
export async function getFileText(token: string, fileId: string): Promise<string> {
  const blob = await getFileBlob(token, fileId);
  return await blob.text();
}

/**
 * Helper to upload metadata then patch the content (two-step upload)
 */
async function uploadFile(
  token: string,
  name: string,
  parentFolderId: string,
  mimeType: string,
  content: string
): Promise<string> {
  // Step 1: Create metadata
  const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
  const metaRes = await fetchWithTimeout(metadataUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      parents: [parentFolderId],
      mimeType,
    }),
  });

  if (!metaRes.ok) {
    await handleApiError(metaRes, `Failed to create file metadata for ${name}`);
  }

  const fileData = await metaRes.json();
  const fileId = fileData.id;

  // Step 2: Upload content
  const contentUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const contentRes = await fetchWithTimeout(contentUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
    },
    body: content,
  });

  if (!contentRes.ok) {
    await handleApiError(contentRes, `Failed to upload file content for ${name}`);
  }

  return fileId;
}

/**
 * Uploads a raw binary Blob/File to a folder inside Google Drive
 */
export async function uploadBinaryFile(
  token: string,
  name: string,
  parentFolderId: string,
  mimeType: string,
  fileBlob: Blob
): Promise<string> {
  if (isSandboxActive() || parentFolderId === 'sandbox-folder') {
    const fileId = `sandbox-img-${Date.now()}`;
    
    // Read blob as data URL to store in localStorage
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64data = reader.result as string;
          saveSandboxFileContent(fileId, base64data, mimeType);
          
          // update file list with the real name
          const files = getSandboxFiles();
          const fileIndex = files.findIndex(f => f.id === fileId);
          if (fileIndex !== -1) {
            files[fileIndex].name = name;
          }
          localStorage.setItem('urbanpulse-sandbox-files', JSON.stringify(files));
          
          resolve(fileId);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileBlob);
    });
  }

  try {
    // Step 1: Create metadata
    const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
    const metaRes = await fetchWithTimeout(metadataUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        parents: [parentFolderId],
        mimeType,
      }),
    });

    if (!metaRes.ok) {
      await handleApiError(metaRes, `Failed to create file metadata for ${name}`);
    }

    const fileData = await metaRes.json();
    const fileId = fileData.id;

    // Step 2: Upload media
    const contentUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const contentRes = await fetchWithTimeout(contentUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: fileBlob,
    });

    if (!contentRes.ok) {
      await handleApiError(contentRes, `Failed to upload binary content for ${name}`);
    }

    return fileId;
  } catch (error) {
    console.error('Error uploading binary file, falling back to local storage:', error);
    const fileId = `sandbox-img-${Date.now()}`;
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64data = reader.result as string;
          saveSandboxFileContent(fileId, base64data, mimeType);
          
          // update file list with the real name
          const files = getSandboxFiles();
          const fileIndex = files.findIndex(f => f.id === fileId);
          if (fileIndex !== -1) {
            files[fileIndex].name = name;
          }
          localStorage.setItem('urbanpulse-sandbox-files', JSON.stringify(files));
          
          resolve(fileId);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileBlob);
    });
  }
}

/**
 * Creates an UrbanPulse folder and populates it with rich, sample files
 */
export async function createUrbanPulseFolderAndSamples(token: string): Promise<ProjectFolder> {
  if (isSandboxActive()) {
    activateSandbox();
    return { id: 'sandbox-folder', name: 'UrbanPulse' };
  }

  try {
    // 1. Create Folder
    const folderUrl = 'https://www.googleapis.com/drive/v3/files';
    const folderRes = await fetchWithTimeout(folderUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'UrbanPulse',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!folderRes.ok) {
      await handleApiError(folderRes, 'Failed to create folder');
    }

    const folderData = await folderRes.json();
    const folderId = folderData.id;

    // 2. Upload README.md
    const readmeContent = DEFAULT_LOCAL_CONTENTS.readme;
    await uploadFile(token, 'README.md', folderId, 'text/markdown', readmeContent);

    // 3. Upload environmental_sensors.csv
    const sensorsContent = DEFAULT_LOCAL_CONTENTS.sensors;
    await uploadFile(token, 'environmental_sensors.csv', folderId, 'text/csv', sensorsContent);

    // 4. Upload transit_ridership.csv
    const ridershipContent = DEFAULT_LOCAL_CONTENTS.ridership;
    await uploadFile(token, 'transit_ridership.csv', folderId, 'text/csv', ridershipContent);

    // 5. Upload demographics_distribution.json
    const demographicsContent = DEFAULT_LOCAL_CONTENTS.demographics;
    await uploadFile(token, 'demographics_distribution.json', folderId, 'application/json', demographicsContent);

    // 6. Upload pothole_reports.csv
    const potholesContent = DEFAULT_LOCAL_CONTENTS.potholes;
    await uploadFile(token, 'pothole_reports.csv', folderId, 'text/csv', potholesContent);

    return {
      id: folderId,
      name: 'UrbanPulse',
    };
  } catch (error) {
    console.error('Error creating folder and samples, falling back to Local Sandbox:', error);
    activateSandbox();
    return { id: 'sandbox-folder', name: 'UrbanPulse' };
  }
}

/**
 * Updates an existing file's content in Google Drive
 */
export async function updateFileContent(token: string, fileId: string, content: string, mimeType: string): Promise<void> {
  if (isSandboxActive() || fileId === 'readme' || fileId === 'sensors' || fileId === 'ridership' || fileId === 'demographics' || fileId === 'potholes' || fileId.startsWith('sandbox-')) {
    saveSandboxFileContent(fileId, content, mimeType);
    return;
  }

  const contentUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  try {
    const contentRes = await fetchWithTimeout(contentUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: content,
    });

    if (!contentRes.ok) {
      await handleApiError(contentRes, 'Failed to update file content');
    }
  } catch (error) {
    console.error('Error updating file content, falling back to sandbox write:', error);
    saveSandboxFileContent(fileId, content, mimeType);
  }
}
