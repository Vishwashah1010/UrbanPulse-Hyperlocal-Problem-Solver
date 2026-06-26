import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  PlusCircle, 
  Compass, 
  HelpCircle,
  FileCheck,
  AlertTriangle,
  LogIn,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { initAuth, googleSignIn, logout } from './lib/firebase';
import { 
  findUrbanPulseFolder, 
  listFolderFiles, 
  getFileBlob, 
  createUrbanPulseFolderAndSamples,
  updateFileContent,
  LOCAL_SANDBOX_FILES,
  DEFAULT_LOCAL_CONTENTS,
  isSandboxActive,
  activateSandbox
} from './lib/drive';
import { AuthUser, ProjectFolder, GoogleDriveFile } from './types';
import Sidebar from './components/Sidebar';
import FilePreview from './components/FilePreview';
import MetricsDashboard from './components/MetricsDashboard';
import ReportIssue from './components/ReportIssue';



export default function App() {
  // Dark/Light theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('urbanpulse-theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('urbanpulse-theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  // Authentication state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Folder/Workspace state
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [folder, setFolder] = useState<ProjectFolder | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [folderSearchAttempted, setFolderSearchAttempted] = useState(false);

  // File Preview state
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileBlob, setSelectedFileBlob] = useState<Blob | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Active navigation view state
  const [activeView, setActiveView] = useState<'files' | 'metrics' | 'report'>('files');

  // Sample creation state
  const [isCreatingSamples, setIsCreatingSamples] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(authUser);
        setToken(accessToken);
        setNeedsAuth(false);
        // Load the drive workspace
        loadWorkspace(accessToken);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
        setFolder(null);
        setFiles([]);
        setSelectedFile(null);
        setSelectedFileContent(null);
        setSelectedFileBlob(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Search user's Drive for UrbanPulse folder
  const loadWorkspace = async (accessToken: string) => {
    setIsLoadingFolder(true);
    setFolderSearchAttempted(true);
    setSampleError(null);
    try {
      const foundFolder = await findUrbanPulseFolder(accessToken);
      setFolder(foundFolder);
      if (foundFolder) {
        const folderFiles = await listFolderFiles(accessToken, foundFolder.id);
        setFiles(folderFiles);

        // Auto-select the first non-readme file if available
        const defaultFile = folderFiles.find(f => f.name.toLowerCase() !== 'readme.md');
        if (defaultFile) {
          fetchFileContent(defaultFile, accessToken);
        }
      } else {
        setFiles([]);
        setSelectedFile(null);
        setSelectedFileContent(null);
        setSelectedFileBlob(null);
      }
    } catch (err: any) {
      console.error('Error loading drive workspace:', err);
      setSampleError(err.message || 'Failed to sync with Google Drive.');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  // Fetch individual file content (blob + text helper)
  const fetchFileContent = async (file: GoogleDriveFile, activeToken: string) => {
    setSelectedFile(file);
    setIsLoadingFile(true);
    setFileError(null);
    setSelectedFileContent(null);
    setSelectedFileBlob(null);

    try {
      const blob = await getFileBlob(activeToken, file.id);
      setSelectedFileBlob(blob);

      const isText = file.mimeType.startsWith('text/') || 
                     file.mimeType === 'application/json' ||
                     file.name.endsWith('.md') ||
                     file.name.endsWith('.csv') ||
                     file.name.endsWith('.json');
      if (isText) {
        const text = await blob.text();
        setSelectedFileContent(text);
      }
    } catch (err: any) {
      console.error('Error fetching file content:', err);
      setFileError(err.message || 'Failed to download file from Google Drive.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSelectFile = (file: GoogleDriveFile) => {
    if (!token) return;
    fetchFileContent(file, token);
  };

  // Update file content in actual Google Drive and local state
  const handleUpdateFileContent = async (newContent: string) => {
    if (!token || !selectedFile) return;
    try {
      await updateFileContent(token, selectedFile.id, newContent, selectedFile.mimeType || 'text/csv');
      setSelectedFileContent(newContent);
    } catch (err: any) {
      console.error('Error updating file content in Google Drive:', err);
      setFileError(err.message || 'Failed to update file in Google Drive.');
    }
  };

  // Manual Trigger to sign in
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setSampleError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const authUser: AuthUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        };
        setUser(authUser);
        setToken(result.accessToken);
        setNeedsAuth(false);
        loadWorkspace(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setSampleError(err.message || 'OAuth Google Authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      localStorage.removeItem('urbanpulse-sandbox-active');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Triggered when folder is not found or when resetting samples
  const handleCreateSamples = async () => {
    if (!token) return;
    setIsCreatingSamples(true);
    setSampleError(null);
    try {
      const newFolder = await createUrbanPulseFolderAndSamples(token);
      setFolder(newFolder);
      const folderFiles = await listFolderFiles(token, newFolder.id);
      setFiles(folderFiles);

      const defaultFile = folderFiles.find(f => f.name.toLowerCase() !== 'readme.md');
      if (defaultFile) {
        fetchFileContent(defaultFile, token);
      }
    } catch (err: any) {
      console.error('Error creating samples:', err);
      setSampleError(err.message || 'Failed to create sample files inside Google Drive.');
    } finally {
      setIsCreatingSamples(false);
    }
  };

  // RENDER LOGIN SCREEN (OAuth Gateway)
  if (needsAuth) {
    return (
      <div className={`min-h-screen flex flex-col justify-center py-12 px-6 lg:px-8 select-none transition-colors duration-300 relative ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}>
        {/* Floating Theme Toggle on Login Screen */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-sm ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700' 
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="login-theme-toggle-btn"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Building2 className="w-8 h-8" />
            </div>
          </div>
          <h2 className={`mt-6 text-center text-2xl font-bold tracking-tight font-sans transition-colors ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            UrbanPulse Workspace
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500 font-medium">
            Smart City Analytics, Telemetry Mesh & Transit Dashboards
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={`py-8 px-4 border rounded-2xl shadow-sm sm:px-10 flex flex-col items-center transition-colors duration-300 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-150'
          }`}>
            <p className={`text-center text-xs leading-relaxed mb-6 font-medium transition-colors ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              We need permission to see your Google Drive to load and preview the files inside your <strong>UrbanPulse</strong> project folder.
            </p>

            {sampleError && (
              <div className="mb-5 w-full p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-medium text-rose-700 flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{sampleError}</span>
              </div>
            )}

            {/* Premium Custom "Sign in with Google" button */}
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={`w-full max-w-[280px] flex items-center justify-center gap-3 px-5 py-3 border rounded-xl shadow-xs hover:shadow-sm transition-all text-sm font-bold select-none cursor-pointer ${
                darkMode
                  ? 'bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-800'
              }`}
              id="google-sign-in-btn"
            >
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span>{isLoggingIn ? 'Connecting Auth...' : 'Sign in with Google'}</span>
            </button>

            <div className={`mt-8 border-t pt-6 w-full grid grid-cols-2 gap-4 text-center transition-colors ${
              darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex flex-col items-center">
                <Compass className="w-5 h-5 text-indigo-500 stroke-[1.5]" />
                <span className={`text-[10px] font-bold mt-2 transition-colors ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Analytical Map</span>
              </div>
              <div className="flex flex-col items-center">
                <Activity className="w-5 h-5 text-emerald-500 stroke-[1.5]" />
                <span className={`text-[10px] font-bold mt-2 transition-colors ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Live Telemetry</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER WORKSPACE ENVIRONMENT
  return (
    <div className={`flex h-screen overflow-hidden font-sans antialiased transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-800'
    }`}>
      {/* Sidebar Explorer */}
      <Sidebar
        folder={folder}
        files={files}
        selectedFileId={selectedFile ? selectedFile.id : null}
        onSelectFile={handleSelectFile}
        onReload={() => token && loadWorkspace(token)}
        onCreateSamples={handleCreateSamples}
        isCreatingSamples={isCreatingSamples}
        isLoading={isLoadingFolder}
        user={user}
        onSignOut={handleSignOut}
        activeView={activeView}
        onChangeView={setActiveView}
        darkMode={darkMode}
        onToggleTheme={toggleDarkMode}
      />

      {/* Main Panel Content Previewer */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-slate-900/40' : 'bg-slate-50'
      }`} id="main-content-panel">
        {isLoadingFolder ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-4"></div>
            <p className="text-xs font-semibold text-slate-600">Scanning your Google Drive space...</p>
            <p className="text-[10px] text-slate-400 mt-1">Locating UrbanPulse project directory & certificates</p>
          </div>
        ) : folderSearchAttempted && !folder ? (
          /* Folder Not Found Landing Setup UI */
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center">
            <div className={`max-w-md border p-8 rounded-2xl shadow-sm flex flex-col items-center transition-colors ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-150'
            }`}>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                <Database className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className={`text-base font-bold transition-colors ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>No UrbanPulse Folder Found</h3>
              <p className={`text-xs mt-2 leading-relaxed transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-505'}`}>
                We couldn't find an existing folder named <strong>"UrbanPulse"</strong> in your Google Drive. Let's seed a new one to unlock the visual analytics workspace!
              </p>

              {sampleError && (
                <div className="mt-4 w-full p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-medium text-rose-700 flex items-start gap-2.5 leading-relaxed text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{sampleError}</span>
                </div>
              )}

              <button
                onClick={handleCreateSamples}
                disabled={isCreatingSamples}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                id="create-samples-setup-btn"
              >
                <PlusCircle className="w-4 h-4" />
                {isCreatingSamples ? 'Initializing Sandbox...' : 'Create UrbanPulse Folder & Samples'}
              </button>

              <div className="mt-5 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Will upload README.md, telemetry CSVs, and district JSONs
              </div>
            </div>
          </div>
        ) : activeView === 'report' ? (
          /* Render Dedicated Interactive Hazard Reporter */
          <ReportIssue
            token={token}
            folderId={folder ? folder.id : null}
            onRefresh={() => token && loadWorkspace(token)}
            onSuccessViewChange={() => setActiveView('files')}
            darkMode={darkMode}
          />
        ) : activeView === 'metrics' ? (
          /* Render Unified Metrics Dashboard */
          <MetricsDashboard
            files={files}
            token={token}
            folderId={folder ? folder.id : null}
            onRefresh={() => token && loadWorkspace(token)}
            darkMode={darkMode}
          />
        ) : (
          /* Show active preview container */
          <FilePreview
            file={selectedFile}
            fileContent={selectedFileContent}
            fileBlob={selectedFileBlob}
            isLoading={isLoadingFile}
            error={fileError}
            onDownload={() => selectedFile && handleSelectFile(selectedFile)}
            token={token}
            onUpdateFileContent={handleUpdateFileContent}
            folderId={folder ? folder.id : null}
            darkMode={darkMode}
          />
        )}
      </main>
    </div>
  );
}
