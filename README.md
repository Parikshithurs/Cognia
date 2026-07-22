# 🧠 Cognia — ADHD Focus & Productivity App

Cognia is an intelligent, real-time focus management and productivity application engineered specifically for individuals with ADHD. By combining the Pomodoro technique, structured task prioritization, and **privacy-first computer vision tracking via MediaPipe**, Cognia helps users maintain focus, detect distraction patterns, and visualize their daily focus trends.

---

## ✨ Features

- 👁️ **Real-Time Visual Telemetry & Distraction Alerting**
  - Uses **MediaPipe FaceMesh** directly in the browser to track face presence and head posture without sending raw video to any server.
  - Automatically flags distraction events when face presence is lost for > 5 seconds during active focus sessions.
  - Streams real-time telemetry markers over WebSockets to the server for session quality analysis.

- ⏱️ **Adaptive Pomodoro Engine**
  - Customizable focus and break session durations.
  - Live session timers integrated with distraction counters and real-time posture indicators.
  - Automatically calculates an end-of-session **Focus Score (0–100%)** based on active presence ratio and tracking confidence.

- 📋 **ADHD-Friendly Task Management**
  - Organize tasks by priority (`low`, `medium`, `high`) and status (`todo`, `in_progress`, `done`).
  - Assign estimated durations to tasks and attach tasks directly to live focus sessions.

- 📊 **Productivity Analytics & Daily Streaks**
  - Comprehensive dashboard displaying overall focus score, total focused minutes, and distraction totals.
  - 30-day daily streak monitoring to build long-term productivity habits.
  - Session history breakdown with task attribution.

- 🔒 **Secure Authentication & Data Isolation**
  - Integrated with **Firebase Auth** for secure user login and token verification.
  - Backend protected via Firebase Admin token verification middleware.

---

## 🏗️ Architecture & Technology Stack

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                      Cognia Client                          │
 │  (Vanilla JS + Vite + MediaPipe FaceMesh + Firebase Auth)   │
 └──────────────┬──────────────────────────────┬───────────────┘
                │ HTTP API Requests            │ WebSockets (/ws)
                ▼                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                      Cognia Backend                         │
 │        (Node.js + Express + 'ws' WebSocket Server)          │
 └──────────────┬──────────────────────────────┬───────────────┘
                │                              │
                ▼                              ▼
 ┌──────────────────────────────┐  ┌───────────────────────────┐
 │     Firebase Admin SDK       │  │     sql.js (WASM SQLite)  │
 │  (Identity & Token Auth)     │  │   (Relational DB Store)   │
 └──────────────────────────────┘  └───────────────────────────┘
```

### **Frontend**
- **Core**: Vanilla JavaScript (ES Modules) SPA architecture.
- **Build System**: [Vite](https://vitejs.dev/)
- **Computer Vision**: `@mediapipe/face_mesh` & MediaPipe Camera Utils (client-side processing).
- **Styling**: Custom CSS design system with CSS variables, modern glassmorphism UI, dark theme, and responsive flex/grid layouts.
- **State & Sync**: Reactive state store with event listeners + custom WebSocket client.

### **Backend**
- **Runtime**: Node.js & Express.js
- **Real-Time Communication**: `ws` WebSocket server mounted at `/ws` for buffering and storing motion events.
- **Database**: SQLite powered by [`sql.js`](https://github.com/sql-js/sql.js) (WebAssembly) with persistent `.db` disk snapshotting.
- **Authentication**: `firebase-admin` middleware (`Bearer` ID token validation).

---

## 📁 Repository Structure

```text
cognia/
├── backend/                  # Express REST API & WebSocket Server
│   ├── src/
│   │   ├── controllers/      # Route controllers (tasks, sessions, motion, analytics)
│   │   ├── db/               # sql.js DB initialization & SQLite schema
│   │   ├── middleware/       # Firebase Auth token verification
│   │   ├── models/           # Data models (task, session, motionEvent)
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Analytics & Focus Score algorithms
│   │   ├── ws/               # WebSocket connection handler & motion buffer
│   │   └── server.js         # HTTP + WS Server entry point
│   ├── .env.example          # Backend environment configuration template
│   └── package.json
├── frontend/                 # Vite SPA Client Application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Toast)
│   │   ├── modules/          # Core modules (API, Camera, Session, Store, WS Client)
│   │   ├── pages/            # View pages (Login, Dashboard, Session, Analytics)
│   │   └── app.js            # Main application router & auth handler
│   ├── index.html            # Single page entry with MediaPipe CDN imports
│   └── package.json
├── docs/                     # Technical documentation (API, Integration, Privacy)
├── ops/                      # Infrastructure & Deployment manifests (k8s, Terraform)
├── scripts/                  # Development utility scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

---

### 1. Backend Setup

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

Configure your environment variables by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure `.env` contains your Firebase project settings and server configuration:
```env
PORT=3001
NODE_ENV=development
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
DB_PATH=./cognia.db
```

Start the backend development server:

```bash
npm run dev
```

The backend server will start at:
- **HTTP REST API**: `http://localhost:3001`
- **WebSocket Endpoint**: `ws://localhost:3001/ws`

---

### 2. Frontend Setup

In a new terminal window, navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser and navigate to: `http://localhost:5173`

---

## 📡 API & WebSocket Reference

### HTTP API Endpoints (`/api`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check | No |
| `GET` | `/api/tasks` | List user tasks | Yes |
| `POST` | `/api/tasks` | Create a new task | Yes |
| `PATCH` | `/api/tasks/:id` | Update task status or details | Yes |
| `DELETE` | `/api/tasks/:id` | Delete a task | Yes |
| `POST` | `/api/sessions` | Start a focus or break session | Yes |
| `PATCH` | `/api/sessions/:id/end` | Complete/abandon session & calculate focus score | Yes |
| `GET` | `/api/analytics/summary` | Get aggregated productivity metrics & streak | Yes |
| `GET` | `/api/analytics/recent` | Fetch recent session records | Yes |

### WebSocket Protocol (`ws://localhost:3001/ws`)

Connect with authentication token:
`ws://localhost:3001/ws?token=<FIREBASE_ID_TOKEN>`

**Incoming Client Messages:**
- `{ "type": "set_session", "session_id": 123 }` — Bind current WebSocket buffer to session.
- `{ "type": "motion", "payload": { "face_detected": true, "face_x": 0.48, "face_y": 0.35, "confidence": 0.85 } }` — Stream motion telemetry.
- `{ "type": "ping" }` — Heartbeat.

---

## 🔒 Privacy & Security

Cognia is built with a **privacy-first** approach:
- **Local Computer Vision**: Face detection is computed entirely inside your browser using MediaPipe WASM libraries.
- **Zero Video Stream Transmission**: WebCam video frames never leave your device. Only lightweight numerical landmarks (`face_detected` boolean, coordinates) are transmitted via WebSockets for metrics calculation.

---

## 🧪 Testing

To run backend tests:

```bash
cd backend
npm test
```

---

## 📄 License

This project is open-source software licensed under the MIT License.
