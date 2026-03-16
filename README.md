<p align="center">
  <img src="https://img.shields.io/badge/NiyuktiSetu-Defence_Interview_Platform-1a1a2e?style=for-the-badge&labelColor=16213e&color=0f3460" alt="NiyuktiSetu"/>
</p>

<h1 align="center">🛡️ NiyuktiSetu</h1>

<p align="center">
  <b>AI-Powered Defence Interview & Recruitment Platform</b><br/>
  <sub>Secure • Intelligent • Anti-Cheat Enabled</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white" alt="React 19"/>
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Python-Flask-3776AB?logo=python&logoColor=white" alt="Python Flask"/>
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/TensorFlow-ArcFace-FF6F00?logo=tensorflow&logoColor=white" alt="TensorFlow"/>
  <img src="https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?logo=huggingface&logoColor=black" alt="HuggingFace"/>
</p>

---

## 📖 About

**NiyuktiSetu** is a full-stack AI-driven interview platform built for defence recruitment (NDA/CDS). It conducts autonomous interview sessions with real-time face verification, anti-spoofing measures, NLP-based answer evaluation, and a kiosk-mode lockdown — replicating the experience of a real SSB interview panel.

The platform authenticates candidates via RFID + Roll Number + DOB (simulating NIC Government Database validation), verifies identity through live facial biometrics, and conducts adaptive interviews where the next question is selected based on the candidate's **behavioral tone** and **performance score**.

---

## ✨ Key Features

### 🎙️ Intelligent Interview Engine
- **4-Signal NLP Scoring** — evaluates each answer on Keyword Match (35%), Semantic Similarity (25%), Completeness (20%), and Coherence (20%)
- **Tone Analysis** — classifies candidate behavior as *confident, nervous, evasive, aggressive, thoughtful,* or *neutral*
- **Behavior-Driven Question Selection** — adapts difficulty and category based on real-time tone detection and running scores
- **520+ Question Bank** — across General Knowledge, Mathematics, Science, Reasoning, Current Affairs, Personality, English, and Geography
- **Bilingual Support** — conducts interviews in English and Hindi
- **Text-to-Speech** — natural voice delivery of questions using Azure Neural Voices (via `edge-tts`)

### 🔐 Face Verification & Anti-Spoofing
- **ArcFace + MTCNN** — deep-learning-based face recognition with cosine similarity matching
- **Liveness Detection** — blink detection (Eye Aspect Ratio), head pose estimation (PnP solver), and motion analysis
- **Mid-Interview Re-Verification** — periodic identity checks against the registered reference embedding
- **Multi-Face Detection** — Haar Cascade-based monitoring flags unauthorized persons in frame
- **Combined Monitor Endpoint** — single API call performs face count + liveness check (reduced network round-trips)

### 🖥️ Kiosk Mode & Exam Security
- **Keyboard Guard** — OS-level low-level keyboard hook blocks `Alt+Tab`, `Win` key, `Ctrl+Esc`, and `Alt+Esc`
- **Taskbar Hiding** — Windows taskbar is hidden during the interview session
- **Chrome Kiosk Launcher** — launches the exam in a full-screen locked browser window
- **Invigilator Exit** — only `Alt+F4` from within Chrome is allowed to exit

### 📊 Dashboard & Reports
- **Candidate Dashboard** — interview history, scores, and session analytics
- **Detailed Interview Reports** — per-question breakdown with keyword/semantic/completeness/coherence scores
- **Tone Summary** — visualization of behavioral tone distribution across the interview

### 🔑 Authentication & Security
- **OTP-Based Login** — email OTP verification for candidate registration
- **JWT Authentication** — secure API access with token-based auth
- **RFID Binding** — permanent RFID-to-account binding prevents credential sharing
- **Multi-Factor Interview Login** — RFID + Roll No + DOB + Face Verification (4-layer security)
- **Verification Logging** — every attempt is logged with IP address and timestamps

---

## 🏗️ Architecture

```
                         ┌──────────────────────┐
                         │   React Frontend     │
                         │   (Port 3000)        │
                         │   TailwindCSS +      │
                         │   Radix UI + Framer  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Node.js Backend     │
                         │  (Port 9091)         │
                         │  Express + MongoDB   │
                         │  JWT + Multer        │
                         └───┬──────────┬───────┘
                             │          │
                    ┌────────┘          └────────┐
                    ▼                            ▼
         ┌────────────────────┐      ┌────────────────────┐
         │  NLP Interview     │      │  Face Verification │
         │  Engine            │      │  API               │
         │  (Port 6000)       │      │  (Port 5000)       │
         │  Flask + HF        │      │  Flask + DeepFace  │
         │  Transformers      │      │  ArcFace + MTCNN   │
         │  + edge-tts        │      │  + MediaPipe       │
         └────────────────────┘      └────────────────────┘
```

---

## 📁 Project Structure

```
NiyuktiSetu_main/
│
├── landingPage/                    # React Frontend (CRA + CRACO)
│   ├── src/
│   │   ├── components/
│   │   │   ├── FaceVerification.jsx    # Webcam face capture & verification
│   │   │   ├── InterviewSession.jsx    # Main interview UI with Q&A flow
│   │   │   ├── PermissionsScreen.jsx   # Camera/mic permission handler
│   │   │   └── magicui/               # Custom animated UI components
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # Candidate dashboard with analytics
│   │   │   ├── InterviewLogin.jsx      # RFID + Roll No + DOB login
│   │   │   ├── LoginPage.jsx           # OTP-based authentication
│   │   │   └── SignUpPage.jsx          # Candidate registration
│   │   ├── services/
│   │   │   └── api.js                  # Centralized API service layer
│   │   └── utils/
│   │       └── mockAuth.js             # Auth context & helpers
│   └── tailwind.config.js
│
├── node-backend/                   # Express.js API Server
│   ├── server.js                       # Entry point (Port 9091)
│   ├── config/
│   │   └── database.js                 # MongoDB connection
│   ├── models/
│   │   ├── User.js                     # User schema (OTP auth)
│   │   ├── InterviewCandidate.js       # NIC candidate records
│   │   ├── InterviewSession.js         # Session tracking
│   │   ├── InterviewVerification.js    # Verification audit logs
│   │   └── InterviewReport.js          # Interview result reports
│   ├── routes/
│   │   ├── otpAuth.js                  # OTP send/verify endpoints
│   │   ├── interview.js                # Interview login, face verify, Q&A
│   │   └── user.js                     # User profile management
│   ├── database/
│   │   └── seed.js                     # Seed dummy candidate data
│   └── uploads/
│       ├── candidates/                 # Reference passport images
│       └── live_captures/              # Live webcam captures
│
├── NLPModel/                       # NLP Interview Engine (Python)
│   ├── api_server.py                   # Flask API (Port 6000)
│   ├── nda_question_bank_520.csv       # 520+ questions across 8 categories
│   ├── indian_voices.txt               # TTS voice configuration
│   ├── requirements.txt                # Python dependencies
│   └── tts_cache/                      # Cached TTS audio files
│
├── face_verification_api/          # Face Verification API (Python)
│   ├── app.py                          # Flask API (Port 5000)
│   ├── face_service.py                 # Core CV pipeline (ArcFace, blink, pose)
│   ├── requirements.txt                # Python dependencies
│   └── reference_images/              # Stored reference face embeddings
│
├── KioskGuard.cs                   # C# keyboard hook compiled binary source
├── kiosk-guard.ps1                 # PowerShell kiosk guard script
├── launch-kiosk.bat                # Windows batch launcher for kiosk mode
└── RestoreTaskbar.cs               # Taskbar restoration utility
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | v18+ |
| **Python** | 3.9+ |
| **MongoDB** | 6.0+ (or MongoDB Atlas) |
| **Git** | latest |

### 1. Clone the Repository

```bash
git clone https://github.com/anothercoder-nik/NiyuktiSetu_main.git
cd NiyuktiSetu_main
```

### 2. Setup Node.js Backend

```bash
cd node-backend
npm install
```

Create a `.env` file in `node-backend/`:

```env
PORT=9091
MONGODB_URI=mongodb://localhost:27017/niyuktisetu
JWT_SECRET=your_jwt_secret_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

Seed the database with dummy candidates:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

### 3. Setup React Frontend

```bash
cd landingPage
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

### 4. Setup NLP Interview Engine

```bash
cd NLPModel
pip install -r requirements.txt
python api_server.py
```

> ⚠️ **First run** will download the HuggingFace sentiment analysis model (~250 MB).

The NLP engine will start on `http://localhost:6000`

### 5. Setup Face Verification API

```bash
cd face_verification_api
pip install -r requirements.txt
python app.py
```

> ⚠️ **First run** will download ArcFace and MTCNN model weights (~500 MB).

The face API will start on `http://localhost:5000`

### 6. (Optional) Launch Kiosk Mode

For exam-proctored sessions on Windows:

```bash
.\launch-kiosk.bat
```

This will:
- Launch Chrome in kiosk mode
- Activate the keyboard guard (blocks Alt+Tab, Win key)
- Hide the Windows taskbar

---

## 🔌 API Reference

### Node.js Backend — `:9091`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/otp-auth/send` | Send OTP to email |
| `POST` | `/otp-auth/verify` | Verify OTP & get JWT |
| `POST` | `/interview/interview-login` | Verify RFID + Roll No + DOB |
| `POST` | `/interview/verify-live` | Face verification (live vs reference) |
| `POST` | `/interview/start-interview` | Start interview session |
| `POST` | `/interview/submit-answer` | Submit answer & get next question |
| `POST` | `/interview/complete` | Save interview report |
| `POST` | `/interview/tts` | Text-to-Speech proxy |
| `GET` | `/interview/session-status/:rfid` | Get session status |
| `GET` | `/user/profile` | Get user profile (protected) |
| `GET` | `/health` | Health check |

### NLP Engine — `:6000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/start-interview` | Initialize session & get first question |
| `POST` | `/submit-answer` | Evaluate answer (4-signal) & get next question |
| `POST` | `/tts` | Generate speech audio from text |
| `GET` | `/get-session` | Get session state |
| `GET` | `/health` | Health check with stats |

### Face Verification — `:5000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/verify` | Compare two face images |
| `POST` | `/register-reference` | Store reference embedding |
| `POST` | `/liveness-check` | Verify blink / head turn / face present |
| `POST` | `/re-verify` | Mid-interview identity re-check |
| `POST` | `/face-count` | Detect multiple faces in frame |
| `POST` | `/monitor` | Combined face-count + liveness (single call) |
| `POST` | `/verify-with-reference` | Verify live image vs stored reference path |
| `GET` | `/health` | Health check |

---

## 🧠 How the NLP Scoring Works

Each answer is evaluated with a **4-signal weighted scoring system** (0–10 scale):

```
┌─────────────────────────────────────────────────────────────┐
│                     FINAL SCORE (0-10)                      │
├───────────────┬───────────────┬──────────────┬──────────────┤
│ Keyword Match │   Semantic    │ Completeness │  Coherence   │
│    (35%)      │ Similarity    │    (20%)     │   (20%)      │
│               │    (25%)      │              │              │
│ Expected      │ TF-IDF cosine │ Word count + │ Sentiment    │
│ keywords in   │ vs reference  │ sentence     │ confidence + │
│ answer        │ answer        │ structure    │ fluency      │
└───────────────┴───────────────┴──────────────┴──────────────┘
```

**Tone-adaptive question selection** then uses the detected behavioral tone to decide:
- **Evasive** → probe with direct factual questions, cap difficulty
- **Nervous** → ease pressure with familiar topics
- **Aggressive** → challenge with harder questions
- **Confident** → escalate difficulty progressively
- **Thoughtful** → present complex analytical questions

---

## 🔐 Anti-Spoofing Pipeline

```
Live Frame → Face Detection → Quality Check
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                             ▼
             Blink Detection              Head Pose Estimation
             (Eye Aspect Ratio)           (solvePnP + Euler angles)
                    │                             │
                    └─────────────┬───────────────┘
                                  ▼
                         Motion Analysis
                    (frame diff vs photo attack)
                                  │
                                  ▼
                    Multi-Face Detection (Haar)
                    ── flags unauthorized persons
                                  │
                                  ▼
                    Cosine Similarity vs Reference
                    ── identity re-verification
```

---

## 🧪 Test Credentials

| RFID | Roll No | DOB | Name |
|------|---------|-----|------|
| `RFID001234` | `ROLL2024001` | `2002-04-15` | Nikunj Agarwal |
| `RFID001235` | `ROLL2024002` | `2003-11-22` | Shreya Sharma |
| `RFID001236` | `ROLL2024003` | `2002-08-10` | Rahul Kumar |
| `RFID001237` | `ROLL2024004` | `2003-02-28` | Priya Singh |
| `RFID001238` | `ROLL2024005` | `2002-12-05` | Amit Verma |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TailwindCSS, Radix UI, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, MongoDB, Mongoose, JWT, Nodemailer |
| **NLP Engine** | Python, Flask, HuggingFace Transformers, scikit-learn, edge-tts |
| **Face AI** | Python, Flask, DeepFace (ArcFace), MTCNN, MediaPipe, OpenCV, TensorFlow |
| **Kiosk** | PowerShell, C# (Win32 API), Windows Low-Level Keyboard Hooks |

---

## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/anothercoder-nik">
        <b>Nikunj Agarwal</b>
      </a>
      <br/>
      <sub>Frontend • Backend • Kiosk Mode</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Shourya-here">
        <b>Shourya Kumar</b>
      </a>
      <br/>
      <sub>AI/ML Models • NLP Engine • Face Verification</sub>
    </td>
  </tr>
</table>

---

## 📜 License

This project is developed for academic and research purposes as part of a defence recruitment automation initiative.

---

<p align="center">
  <sub>Built with ❤️ for India's Defence Recruitment</sub>
</p>
