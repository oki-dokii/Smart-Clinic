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