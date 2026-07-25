import store from '../store/store.js';
import { sendMotionFrame } from '../sync/wsClient.js';

const DISTRACTION_THRESHOLD_MS = 5000; // 5 seconds without face = distracted

let faceMesh = null;
let camera = null;
let lastFaceTime = Date.now();
let isStreaming = false;

export async function startCamera(videoEl, canvasEl) {
    if (isStreaming) return;

    if (typeof FaceMesh === 'undefined') {
        console.warn('MediaPipe FaceMesh not loaded. Running without face detection.');
        return startFallbackCamera(videoEl);
    }

    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => processResults(results, canvasEl));

    if (typeof Camera === 'undefined') {
        console.warn('MediaPipe Camera not loaded. Falling back to basic camera.');
        return startFallbackCamera(videoEl);
    }

    camera = new Camera(videoEl, {
        onFrame: async () => {
            if (faceMesh) await faceMesh.send({ image: videoEl });
        },
        width: 640,
        height: 480,
    });

    await camera.start();
    isStreaming = true;
    console.log('📷 Camera started');
}

function processResults(results, canvasEl) {
    const now = Date.now();
    const faceDetected = results.multiFaceLandmarks?.length > 0;

    let face_x = null, face_y = null, confidence = null;

    if (faceDetected) {
        lastFaceTime = now;
        const landmarks = results.multiFaceLandmarks[0];
        // Use nose tip (landmark 1) as face position
        const nose = landmarks[1];
        face_x = parseFloat(nose.x.toFixed(4));
        face_y = parseFloat(nose.y.toFixed(4));
        confidence = 0.85; // MediaPipe doesn't expose confidence directly

        // Draw on canvas
        if (canvasEl) drawFaceIndicator(canvasEl, nose, true);
    } else {
        if (canvasEl) clearCanvas(canvasEl);
    }

    const distractedDuration = now - lastFaceTime;
    const isDistracted = !faceDetected && distractedDuration > DISTRACTION_THRESHOLD_MS;

    // Update store
    const prevDistracted = store.get('isDistracted');
    store.set('motionData', { face_detected: faceDetected, face_x, face_y, confidence });
    store.set('isDistracted', isDistracted);

    if (isDistracted && !prevDistracted) {
        store.update('distractionCount', (c) => (c || 0) + 1);
    }

    // Send to backend via WebSocket
    sendMotionFrame({
        face_detected: faceDetected,
        face_x,
        face_y,
        confidence,
        timestamp: new Date().toISOString(),
    });
}

function drawFaceIndicator(canvas, nose, detected) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = nose.x * canvas.width;
    const y = nose.y * canvas.height;
    const color = detected ? '#22d3ee' : '#ef4444';

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function startFallbackCamera(videoEl) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoEl.srcObject = stream;
        await videoEl.play();
        isStreaming = true;
    } catch (e) {
        console.error('Camera access denied:', e);
    }
}

export function stopCamera() {
    camera?.stop();
    faceMesh?.close();
    camera = null;
    faceMesh = null;
    isStreaming = false;
    lastFaceTime = Date.now();
    console.log('📷 Camera stopped');
}
