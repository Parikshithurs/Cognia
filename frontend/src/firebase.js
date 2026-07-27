/**
 * Firebase configuration
 * -------------------------
 * SETUP INSTRUCTIONS (one-time):
 *
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Add project" → give it a name (e.g. "cognia") → Continue
 * 3. Disable Google Analytics if you don't need it → Create project
 * 4. Click "Web" icon (</>) to add a web app → Register app
 * 5. Copy the firebaseConfig object shown and paste below
 * 6. In the left sidebar → Build → Authentication → Get started
 * 7. Enable "Email/Password" provider (Sign-in method tab)
 * 8. Optionally enable "Google" provider too
 *
 * For the BACKEND (.env file):
 * 9.  Project Settings (gear icon) → Service accounts → Generate new private key
 * 10. Download the JSON → copy values into backend/.env
 */

const firebaseConfig = {
    apiKey: "AIzaSyDoRJpTX1XyVQevHoS-SA9b1dW66_ceu3Y",
    authDomain: "cognia-1c0e1.firebaseapp.com",
    projectId: "cognia-1c0e1",
    storageBucket: "cognia-1c0e1.firebasestorage.app",
    messagingSenderId: "842425551860",
    appId: "1:842425551860:web:fc029da2515c80d43807a1"
};
// Initialize Firebase (compat SDK loaded via CDN in index.html)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

export { auth };
