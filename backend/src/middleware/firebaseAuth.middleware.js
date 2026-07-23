require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin once
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.warn('⚠️  Firebase Admin env vars not set. Auth will be BYPASSED (dev only).');
    } else {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        });
    }
}

/**
 * Express middleware — verifies Firebase ID Token from Authorization header.
 * Attaches req.uid (Firebase user ID) on success.
 *
 * In development (no Firebase env vars set), allows a special
 * X-Dev-UID header for testing without token verification.
 */
async function firebaseAuth(req, res, next) {
    const devUid = req.headers['x-dev-uid'];
    const firebaseReady =
        process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

    // Dev bypass when Firebase not configured
    if (!firebaseReady) {
        if (devUid) {
            req.uid = devUid;
            return next();
        }
        return res.status(401).json({ error: 'Firebase not configured. Send X-Dev-UID header for dev mode.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.uid = decoded.uid;
        req.email = decoded.email;
        next();
    } catch (err) {
        console.error('Firebase token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = { firebaseAuth };
