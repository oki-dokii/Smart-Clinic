import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Auth helper functions
export const signInWithGoogle = async () => {
  try {
    // Try popup first, fallback to redirect if popup is blocked
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // If popup is blocked, provide helpful error message
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error('Popup was blocked. Please allow popups for this site or try again.');
    }
    
    // If domain not authorized, provide helpful message
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please contact support.');
    }
    
    // Generic error with user-friendly message
    throw new Error(`Google sign-in failed: ${error.message || 'Please try again or use email login instead.'}`);
  }
};

export const createUserAccount = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};