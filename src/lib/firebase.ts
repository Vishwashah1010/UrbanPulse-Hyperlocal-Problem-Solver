import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace Drive scope to see and manage files
provider.addScope('https://www.googleapis.com/auth/drive');

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;
let activeListener: ((user: User, token: string) => void) | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (onAuthSuccess) {
    activeListener = onAuthSuccess;
  }
  
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
      if (isGoogleUser) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        // Email/Password user -> runs in local sandbox mode
        if (onAuthSuccess) onAuthSuccess(user, 'sandbox-token');
      }
    } else {
      // Check if there is an active local mock session in localStorage!
      const activeMockUser = localStorage.getItem('urbanpulse_active_mock_user');
      if (activeMockUser) {
        try {
          const mockUser = JSON.parse(activeMockUser) as User;
          if (onAuthSuccess) onAuthSuccess(mockUser, 'sandbox-token');
          return;
        } catch (e) {}
      }
      
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Email/Password Authentication Helpers with Local Fallback
export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.warn('Firebase sign in failed, checking local offline fallback database:', error.message);
    const usersKey = 'urbanpulse_local_users';
    const users = JSON.parse(localStorage.getItem(usersKey) || '{}');
    const localUser = users[email.toLowerCase()];
    if (localUser && localUser.password === pass) {
      const mockUser = {
        uid: localUser.uid,
        email: email,
        displayName: localUser.name,
        photoURL: null,
        providerData: []
      } as unknown as User;
      
      localStorage.setItem('urbanpulse_active_mock_user', JSON.stringify(mockUser));
      if (activeListener) {
        activeListener(mockUser, 'sandbox-token');
      }
      return mockUser;
    }
    throw error;
  }
};

export const emailSignUp = async (email: string, pass: string, name: string): Promise<User> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error: any) {
    console.warn('Firebase sign up failed, registering in local offline fallback database:', error.message);
    const usersKey = 'urbanpulse_local_users';
    const users = JSON.parse(localStorage.getItem(usersKey) || '{}');
    if (users[email.toLowerCase()]) {
      throw new Error('The email address is already in use by another account.');
    }
    
    const uid = 'local_uid_' + Math.random().toString(36).substring(2, 11);
    users[email.toLowerCase()] = { uid, name, password: pass };
    localStorage.setItem(usersKey, JSON.stringify(users));
    
    const mockUser = {
      uid: uid,
      email: email,
      displayName: name,
      photoURL: null,
      providerData: []
    } as unknown as User;
    
    localStorage.setItem('urbanpulse_active_mock_user', JSON.stringify(mockUser));
    if (activeListener) {
      activeListener(mockUser, 'sandbox-token');
    }
    return mockUser;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {}
  cachedAccessToken = null;
  localStorage.removeItem('urbanpulse_active_mock_user');
  localStorage.removeItem('urbanpulse-sandbox-active');
};
