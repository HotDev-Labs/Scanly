# Scanly – System Architecture, Tech Stack & Integration Guide

> **Scanly** is a high-performance, mobile-responsive smart luggage verification and tracking platform designed for transit stations, intercity coach networks, and long-distance travel providers to eliminate luggage loss, baggage mismatches, and unauthorized luggage pickup.

---

## 1. Executive Summary & Core Mission

Long-distance bus and transit operations (such as FlixBus, InterCity, Greyhound, and RedBus) transport millions of passengers with multiple luggage items loaded into common undercarriage luggage compartments. At intermediate stops, drivers and passengers face a critical challenge: **verifying that the person picking up a bag actually owns that specific bag**.

Scanly solves this challenge through:
1. **Cryptographic Tag Generation & Privacy Shield**: Generates locked QR luggage tags that mask passenger phone numbers and destinations from casual phone scans.
2. **Anti-Theft Security Lock & PIN Verification**: Requires passenger PIN (last 4 digits of phone) or operator password to unlock and pull customer details on scan.
3. **Pull & Push Handover Workflow**: Station agents securely pull customer details upon PIN verification, then push step-by-step handovers to the cloud.
4. **Sequential Multi-Bag Stepper**: Guides operators step-by-step (e.g., *“Scan Bag 1 of 3”*, *“Scan Bag 2 of 3”*) to ensure no bags are left behind.
5. **Instant Camera Scanning**: Runs in any modern mobile browser with zero app installation required by transit agents.
6. **Agent Accountability**: Links every bag scan, trip batch, and handover timestamp to an authenticated transit agent.

---

## 2. Complete Technology Stack & Specifications

### 2.1 Languages
* **Python (3.12+ / 3.14)**: Powers the high-throughput backend APIs, ORM data persistence, PDF label generation, and cryptographic hashing.
* **JavaScript (ES Modules / JSX)**: Powers the single-page application (SPA) client interface, asynchronous network clients, and live video camera feeds.
* **SQL**: Interacts with relational database engines (PostgreSQL and SQLite) for transactional consistency.
* **HTML5 & CSS3**: Responsive UI layout, flexbox, grid, and SVG vector graphics rendering.

### 2.2 Frontend Frameworks & Libraries
* **React 19 (`react`, `react-dom`)**: Modern reactive UI engine utilizing concurrent rendering, hooks, and component lifecycle management.
* **Vite 8 (`vite`, `@vitejs/plugin-react`)**: Ultra-fast next-generation frontend build tool and development server with Hot Module Replacement (HMR).
* **Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`)**: Modern utility-first CSS framework for atomic, responsive styling and animations.
* **Lucide React (`lucide-react`)**: Clean, accessible iconography system for transit UI elements (buses, luggage, QR codes, shields).
* **Html5Qrcode (`html5-qrcode`)**: High-performance, cross-platform video stream barcode and QR code decoding library supporting camera autofocus and environmental rear-camera selection.
* **Canvas-Confetti (`canvas-confetti`)**: Interactive micro-animations upon successful complete bag handovers.
* **Oxlint (`oxlint`)**: High-speed JavaScript and JSX linter for code health.

### 2.3 Backend Frameworks & Libraries
* **FastAPI (`fastapi>=0.115.0`)**: High-performance, modern Python web framework built on top of Starlette and Pydantic, providing native ASGI asynchronous execution and auto-generated OpenAPI/Swagger documentation.
* **Uvicorn (`uvicorn[standard]>=0.30.0`)**: Production-grade ASGI web server running the Python application.
* **Pydantic v2 (`pydantic>=2.0.0`)**: Robust data validation, serialization, and type enforcement across API request bodies and response models.
* **SQLAlchemy 2.0 (`sqlalchemy>=2.0.30`)**: Advanced Python SQL toolkit and Object Relational Mapper (ORM), handling declarative data models, query compilation, and connection pools.
* **PyJWT (`pyjwt>=2.8.0`)**: RFC 7519 JSON Web Token implementation used to sign and verify agent authentication bearer tokens.
* **Passlib & Bcrypt (`passlib[bcrypt]>=1.7.4`, `bcrypt>=4.0.0`)**: Secure password hashing algorithms with salt generation and PBKDF2/Bcrypt fallback mechanisms.
* **ReportLab (`reportlab>=4.2.0`)**: Enterprise PDF generation engine for rendering 2-inch and 3-inch thermal luggage claim tags.
* **Qrcode (`qrcode[pil]>=7.4.2`)**: Server-side QR code image matrix generation for luggage tags and baggage manifests.
* **Python-Multipart (`python-multipart>=0.0.9`)**: Handles streaming multi-part form data uploads for manifest CSV imports and avatar image uploads.

### 2.4 Database Engines & Multi-Driver Architecture
* **Cloud Production Database: Vercel Postgres / Neon (`POSTGRES_URL`)**:
  * Distributed, serverless PostgreSQL with connection pooling.
  * Multi-driver auto-resolution pipeline:
    1. `psycopg` (v3 binary): High-performance native PostgreSQL adapter.
    2. `psycopg2-binary`: Established enterprise PostgreSQL driver fallback.
    3. `pg8000`: Pure-Python DB-API 2.0 PostgreSQL driver (ensures zero binary dependency lockups on diverse serverless environments).
* **Local Development Database: SQLite (`sqlite:///./smart_luggage.db`)**:
  * Zero-config, single-file relational database engine for offline local development and rapid prototyping.
  * Serverless temporary fallback: automatically falls back to `/tmp/smart_luggage.db` if cloud database credentials are absent.

### 2.5 Cloud Platform & Storage
* **Vercel Services Architecture (`vercel.json`)**: Monorepo orchestration separating the Python FastAPI backend and Vite React frontend into distinct, independently built micro-services with path rewrites (`/api/*` -> `backend`, `/*` -> `frontend`).
* **Vercel Blob Storage (`@vercel/blob` REST API)**: Distributed edge object storage for transit agent avatars and photo attachments.

---

## 3. Directory & File Structure Walkthrough

Below is the repository layout and the function of each file:

```
qr scanner/
├── backend/                             # Python FastAPI Backend Service
│   ├── app/
│   │   ├── routers/                     # API Endpoint Handlers (Controllers)
│   │   │   ├── auth_routes.py           # Agent registration, login, profile endpoints
│   │   │   ├── avatar_routes.py         # Cloud & local profile photo upload handlers
│   │   │   ├── import_routes.py         # CSV & spreadsheet manifest bulk upload
│   │   │   ├── luggage_routes.py        # Luggage item scanning, status, and handover
│   │   │   ├── passenger_routes.py      # Passenger CRUD, batch listings, QR generation
│   │   │   ├── stats_routes.py          # Transit station statistics & KPIs
│   │   │   └── verification_routes.py   # Multi-bag sequential verification stepper
│   │   ├── services/                    # Business Logic Layer
│   │   │   ├── import_service.py        # Manifest CSV parsing, schema normalization & validation
│   │   │   ├── qr_service.py            # QR payload cryptography and thermal PDF printing
│   │   │   └── verification_service.py  # Bag collection logic & step-by-step verification rules
│   │   ├── auth.py                      # JWT token generation, verification & auth dependencies
│   │   ├── database.py                  # Database engine initialization, multi-driver resolution & sessions
│   │   ├── main.py                      # FastAPI app initialization, middleware, CORS, table auto-creation
│   │   ├── models.py                    # SQLAlchemy ORM schemas (Users, Passengers, Luggage, Trips)
│   │   └── schemas.py                   # Pydantic validation models for requests and responses
│   ├── sample_data/
│   │   └── sample_passengers.csv        # Pre-configured 30-passenger test manifest for quick onboarding
│   ├── tests/                           # Pytest Test Automation Suite
│   │   ├── test_api_endpoints.py        # Integration tests for auth, passengers, luggage, and batches
│   │   └── test_verification_scenarios.py # End-to-end multi-bag sequential verification tests
│   ├── main.py                          # ASGI application entrypoint for Vercel Serverless
│   └── requirements.txt                 # Backend Python package requirements
├── frontend/                            # Vite + React Single-Page Application
│   ├── public/
│   │   ├── favicon.svg                  # Minimalist Scanly luggage + QR scan icon (browser tabs)
│   │   └── logo.svg                     # Vector brand logo with wordmark
│   ├── src/
│   │   ├── components/                  # Reusable React UI Components
│   │   │   ├── AuthModal.jsx            # Agent login and account creation modal dialog
│   │   │   ├── AvatarUploadModal.jsx    # Photo capture and avatar upload modal
│   │   │   ├── BottomNav.jsx            # Mobile-optimized bottom navigation dock
│   │   │   ├── Navbar.jsx               # Desktop header with centered tabs and profile badge
│   │   │   └── ScanlyLogo.jsx           # Reusable SVG vector logo component
│   │   ├── pages/                       # Primary Application Screens
│   │   │   ├── CollectionStatusPage.jsx # Real-time luggage tracking and handover table
│   │   │   ├── GenerateQrPage.jsx       # Passenger manifest selector & thermal QR tag generator
│   │   │   ├── ImportPage.jsx           # CSV manifest file uploader with column auto-mapping
│   │   │   ├── ProfilePage.jsx          # Agent profile view, trip batch selector & account settings
│   │   │   └── ScanQrPage.jsx           # Real-time camera QR scanner with audio feedback
│   │   ├── api.js                       # Centralized asynchronous API client with JWT bearer handling
│   │   ├── App.jsx                      # Root application component & active tab router
│   │   ├── index.css                    # Tailwind CSS imports and custom transit styling
│   │   └── main.jsx                     # React 19 DOM bootstrap entrypoint
│   ├── index.html                       # HTML5 root shell
│   ├── package.json                     # Frontend npm package dependencies & build scripts
│   └── vite.config.js                   # Vite configuration and Tailwind CSS plugin setup
├── run_app.py                           # Cross-platform Python script to launch local development servers
├── start.bat                            # Windows 1-click execution script
├── requirements.txt                     # Root Python dependencies
├── vercel.json                          # Multi-service Vercel deployment and routing configuration
└── README.md                            # High-level overview and setup instructions
```

---

## 4. Frontend-to-Backend Architecture & Communication Flow

### 4.1 Routing & Proxy Architecture
Scanly is deployed as a **multi-service project** on Vercel:

```
[ Browser / Mobile Client ]
             │
             ▼
     [ Vercel Router ]
     /               \
    /                 \
Rewrites /api/:path*   Rewrites /(.*)
  ▼                     ▼
[ Backend Service ]   [ Frontend Service ]
(FastAPI ASGI)        (Vite Static SPA)
```

1. **Production Mode (`vercel.json`)**:
   - `vercel.json` directs any request matching `/api/:path*` directly to the `backend` service (`backend/main.py:app`).
   - All other routes `/(.*)` serve the Vite React SPA from `frontend/`.
   - Both services live under the same origin domain (e.g. `https://scanly-henna.vercel.app/`), eliminating CORS pre-flight latency.
2. **Local Development Mode (`run_app.py`)**:
   - Launches the FastAPI backend on `http://127.0.0.1:8000`.
   - Launches the Vite dev server on `http://localhost:5173`.
   - Automatically proxies requests starting with `/api` to port 8000.

### 4.2 Unified API Client (`frontend/src/api.js`)
All client interactions are channeled through a singleton API module:
* **Token Attachment**: Inspects `localStorage.getItem('slvs_token')`. If present, automatically injects the HTTP header:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
* **Unified Error Normalization**: Parses standard JSON errors (`{"detail": "..."}`) and fallback text, throwing structured JavaScript errors.

### 4.3 End-to-End Data Flows

#### 1. Agent Authentication Lifecycle
```
[Agent] ──> Enters Email & Password in AuthModal.jsx
                 │
                 ▼
         POST /api/auth/login  (or /api/auth/signup)
                 │
                 ▼
         FastAPI auth_routes.py validates password hash (Bcrypt)
                 │
                 ▼
         Issues signed JWT (HS256) containing { sub: user_id, email, full_name }
                 │
                 ▼
[Client] Saves token in localStorage('slvs_token') ──> Updates currentUser state
```

#### 2. Passenger Baggage QR Tag Generation
```
[Agent] ──> Selects Trip Batch & Enters Passenger Info (Name, Bags = 3)
                 │
                 ▼
         POST /api/passengers/{id}/generate-qr
                 │
                 ▼
         FastAPI passenger_routes.py + qr_service.py
         Creates 3 LuggageItem records: P01-L1, P01-L2, P01-L3
         Generates cryptographically random UUID tokens for each bag
                 │
                 ▼
[Client] Displays printable tag modal with live QR codes & thermal label layout
```

#### 3. Real-Time Camera Verification & Handover Stepper
```
[Agent] ──> Opens Scan & Verify tab ──> Camera activates (Html5Qrcode)
                 │
                 ▼
[Camera] ──> Decodes QR code token on customer's bag
                 │
                 ▼
         POST /api/luggage/scan  { code: "<TOKEN_STRING>" }
                 │
                 ▼
         FastAPI luggage_routes.py calls verification_service.py
         1. Matches token to passenger record
         2. Computes collected bags vs total passenger bags
         3. Updates database status: PENDING ──> COLLECTED
         4. Returns: { step: 2, total: 3, all_collected: false }
                 │
                 ▼
[Client UI] ──> Plays audio chime + prompts: "Please Scan Bag 2 of 3 Now"
                 │
           (When all 3 bags are scanned)
                 │
                 ▼
         POST /api/luggage/passenger/{id}/handover-all
         Updates all 3 bags: COLLECTED ──> HANDED_OVER
[Client UI] ──> Green Confetti + Confirmed Handover Badge
```

---

## 5. Enterprise Integration Blueprint for Travel Operators (FlixBus, Intercity, Greyhound, RedBus)

Major coach operators face thousands of luggage misplacements every month. Scanly can be integrated into existing carrier infrastructure in three straightforward ways:

### 5.1 Architecture for Travel Operator Integration

```
┌────────────────────────────────────────────────────────┐
│     Carrier Core System (FlixBus / InterCity / RedBus)  │
│  - Ticketing Engine                                    │
│  - Passenger Booking Database                          │
│  - Driver Mobile Terminal / Conductor App              │
└──────────────────────────┬─────────────────────────────┘
                           │
             REST API Calls & Webhook Events
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Scanly Verification Engine               │
│                                                        │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ Manifest Ingestion│  │ Luggage Verification Engine │ │
│  │ (/api/passengers)│  │ (/api/luggage/scan)         │ │
│  └──────────────────┘  └─────────────────────────────┘ │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ QR Tag Generator │  │ Cloud Persistence           │ │
│  │ (Thermal / PDF)  │  │ (PostgreSQL / Vercel Edge)  │ │
│  └──────────────────┘  └─────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 5.2 Three-Phase Implementation Workflow

#### Phase 1: Ticketing & Booking Pass Integration
* When a passenger purchases a ticket on the FlixBus or InterCity website/app, the carrier’s booking system calls Scanly’s API:
  ```http
  POST /api/passengers
  Content-Type: application/json
  Authorization: Bearer <CARRIER_API_KEY>

  {
    "name": "Sarah Jenkins",
    "mobile_number": "+1-555-0199",
    "boarding_stop": "Munich Central Station",
    "destination_stop": "Berlin Alexanderplatz",
    "batch_name": "Coach-FLIX-402",
    "luggage_count": 2
  }
  ```
* Scanly returns the unique encrypted QR tag payloads.
* The carrier automatically prints the QR codes directly on the passenger’s **PDF Boarding Pass** and displays them inside the passenger's **Mobile App Wallet**.

#### Phase 2: Coach Loading at Departure (Driver App)
1. At the departure station, the driver attaches a physical luggage slip or adhesive tag to the passenger’s bags.
2. The driver scans each bag once using the carrier’s mobile terminal.
3. Scanly registers the bags as **LOADED** in the undercarriage compartment for that specific coach run (`Coach-FLIX-402`).

#### Phase 3: Intermediate Stops & Destination Handover
1. The coach reaches an intermediate stop (e.g., Leipzig on the Munich -> Berlin route).
2. Passenger Sarah Jenkins steps off to claim her 2 bags.
3. The driver points the scanner at Sarah’s boarding pass QR code or bag slip:
   - Scanly verifies: *Sarah has 2 bags tagged for Leipzig. Bag 1 verified.*
   - Visual audio alert: *“Scan Bag 2 of 2.”*
   - Driver scans Bag 2: *“Verification Complete – Handover Approved.”*
4. If a passenger accidentally tries to pick up a bag destined for Berlin, Scanly triggers an immediate red alert: **“DESTINATION MISMATCH: Bag belongs to Berlin passenger!”**

### 5.3 Webhook Notification Integration
Scanly can broadcast real-time luggage state changes back to the carrier’s platform:
```http
POST https://api.flixbus.com/v1/webhooks/luggage-event
Content-Type: application/json
X-Scanly-Signature: sha256=...

{
  "event": "luggage.handover_completed",
  "timestamp": "2026-11-26T21:15:00Z",
  "trip_id": "Coach-FLIX-402",
  "passenger": {
    "name": "Sarah Jenkins",
    "destination": "Leipzig"
  },
  "bags_handed_over": 2,
  "agent_id": 42
}
```
* **Passenger Peace of Mind**: The carrier app can instantly push a notification to the traveler: *“Your 2 bags were successfully collected at Leipzig Central Station.”*

### 5.4 Embeddable Mobile Scanner Component (React / React Native)
Carriers can embed the Scanly scanner directly into their existing driver and conductor applications using the following pattern:

```jsx
import React, { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function CarrierLuggageScanner({ coachTripId, onHandoverComplete }) {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScanCode = async (decodedToken) => {
    setLoading(true);
    try {
      const response = await fetch('https://scanly.carrier.com/api/luggage/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.CARRIER_AUTH_TOKEN}`
        },
        body: JSON.stringify({ code: decodedToken, auto_collect: true })
      });
      const data = await response.json();
      setScanResult(data);

      if (data.all_collected) {
        onHandoverComplete?.(data);
      }
    } catch (err) {
      console.error('Scanly Verification Failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="carrier-scanner-card">
      <div id="carrier-qr-reader" style={{ width: '100%', height: 300 }} />
      {scanResult && (
        <div className={`status-banner ${scanResult.all_collected ? 'success' : 'pending'}`}>
          <h3>{scanResult.passenger_name} ({scanResult.collected_count}/{scanResult.total_count} Bags)</h3>
          <p>{scanResult.message}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Summary of Key Strengths

| Aspect | Scanly Architecture |
| :--- | :--- |
| **Zero Hardware Lock-In** | Operates on any smartphone, iPad, Android tablet, or rugged handheld computer equipped with a standard camera. |
| **Zero App Store Lag** | Pure responsive Web App (PWA) running on React 19 and Vite; updates deploy instantly via Vercel without waiting for App Store approvals. |
| **Sequential Verification** | Multi-bag stepper logic stops accidental partial pickups (where passenger leaves 1 bag in the bus hold). |
| **Dual Database Engine** | Native cloud serverless PostgreSQL for enterprise scale, paired with a zero-configuration SQLite engine for local offline testing. |
| **Turnkey Partner API** | REST API endpoints allow rapid integration into existing intercity coach ticketing engines within days. |
