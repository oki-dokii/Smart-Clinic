# Firebase Setup Instructions

The Google sign-in is failing because the Firebase project needs to be configured with the correct domain. Here's how to fix it:

## 1. Firebase Console Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add these domains:
   - `*.replit.dev` (for development)
   - `*.replit.app` (for deployed apps)
   - Your current Replit domain (check the URL bar)

## 2. Current Issue

The error shows that the domain is not authorized for Firebase authentication. This is a security feature that prevents unauthorized websites from using your Firebase project.

## 3. Alternative: Use Email Authentication

While you configure Firebase, patients can still sign up and log in using email and password authentication, which is working correctly.

## 4. Environment Variables

Make sure these are set in your Replit secrets:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID` 
- `VITE_FIREBASE_PROJECT_ID`

## 5. Testing

After adding the domain to Firebase:
1. Clear your browser cache
2. Try the Google sign-in again
3. Both email and Google authentication should work

The email authentication is fully functional and can be used immediately.