import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
let auth: any = null;

// Initialize Firebase only if all required config variables are present
if (import.meta.env.VITE_FIREBASE_API_KEY && 
    import.meta.env.VITE_FIREBASE_PROJECT_ID && 
    import.meta.env.VITE_FIREBASE_APP_ID) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

// Google Sign In
export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase not configured. Please add your Firebase secrets.');
  }
  
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

// Handle redirect result
export async function handleRedirectResult() {
  if (!auth) {
    return null;
  }
  
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error('Error handling redirect result:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser() {
  if (!auth) {
    return;
  }
  
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export { auth };