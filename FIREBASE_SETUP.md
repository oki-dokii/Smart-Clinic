# Firebase Setup Instructions - REQUIRED STEPS

Both Google and Email authentication need to be enabled in Firebase Console. Here's the complete setup:

## 1. Enable Authentication Methods

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `smart-clinic-d59c5`
3. Go to **Authentication** → **Sign-in method**
4. **ENABLE these providers:**
   - **Email/Password** - Click "Enable" and save
   - **Google** - Click "Enable" and save

## 2. Add Authorized Domains

1. Still in **Authentication** → **Settings** → **Authorized domains**
2. Add this exact domain: `42638f0d-82bc-40ee-b3bd-785d53c6ac2a-00-3rsnhjlr0ddv2.sisko.replit.dev`

## 3. Current Issues

- **Email signup failing**: `auth/operation-not-allowed` = Email/password not enabled
- **Google signup failing**: Domain not authorized + authentication method not enabled

## 4. Required Actions

**YOU MUST DO BOTH:**
1. Enable Email/Password authentication in Firebase Console
2. Enable Google authentication in Firebase Console
3. Add the Replit domain to authorized domains

## 5. Environment Variables (Already Set)

✓ `VITE_FIREBASE_API_KEY`
✓ `VITE_FIREBASE_APP_ID` 
✓ `VITE_FIREBASE_PROJECT_ID`

## 6. After Setup

Once you enable both authentication methods in Firebase Console, both email and Google signup will work immediately.