import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase configuration is valid before initializing
const isFirebaseConfigured = firebaseConfig.apiKey && 
  firebaseConfig.authDomain &&
  firebaseConfig.projectId && 
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== 'undefined' && 
  firebaseConfig.authDomain !== 'undefined' &&
  firebaseConfig.projectId !== 'undefined' &&
  firebaseConfig.appId !== 'undefined';

let app: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google provider
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('Firebase authentication will be disabled');
  }
} else {
  console.log('⚠️ Firebase configuration incomplete - authentication features disabled');
}

export { auth, googleProvider };

// Auth helper functions
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase authentication is not configured. Please contact system administrator.');
  }
  
  try {
    console.log('Attempting Google sign-in with popup...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // If popup is blocked or fails, try redirect as fallback
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log('Popup blocked, trying redirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        // Note: redirect will reload the page, so we won't reach this return
        return null;
      } catch (redirectError: any) {
        console.error('Redirect also failed:', redirectError);
        throw new Error('Google sign-in failed. Please try email authentication instead.');
      }
    }
    
    // If domain not authorized, provide helpful message
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Domain configuration may need time to propagate.');
    }
    
    // For iframe errors, suggest email alternative
    if (error.message?.includes('iframe') || error.message?.includes('url')) {
      throw new Error('Google sign-in configuration issue. Please use email signup for now.');
    }
    
    // Generic error with user-friendly message
    throw new Error(`Google sign-in failed: ${error.message || 'Please try email login instead.'}`);
  }
};

export const createUserAccount = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase authentication is not configured. Please contact system administrator.');
  }
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase authentication is not configured. Please contact system administrator.');
  }
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    throw error;
  }
};

export const logOut = async () => {
  if (!auth) {
    console.log('Firebase not configured - logout not needed');
    return;
  }
  
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    // Call callback with null to indicate no user when Firebase is not configured
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }
  
  return onAuthStateChanged(auth, callback);
};