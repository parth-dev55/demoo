# AgriGPT - FastAPI Backend Engine

Production-structured, hackathon-friendly backend for **AgriGPT**, an AI-powered agricultural decision-support and farm operating system.

---

## 🏗 Architecture

```
React Frontend (Vite)
       │
       ▼ REST API (port 8000)
FastAPI Backend (app.main)
  ├── Core (Config, Security, Sanitization)
  ├── Database (Supabase PostgreSQL + In-Memory Hackathon Fallback)
  ├── Storage (Supabase Storage for Disease Scans)
  ├── AI Service (Google Gemini SDK)
  ├── Weather Service (Open-Meteo Realtime & Forecast)
  ├── Vision Diagnostics (Multimodal Crop Disease Scanner)
  ├── Predictive Engine (Explainable Water, Heat, and Disease Stress Models)
  └── Recommendation & Early Warning Engine
```

---

## 🚀 Quickstart Guide

### 1. Setup Virtual Environment & Install Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your keys:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-role-key
GEMINI_API_KEY=your-gemini-api-key
WEATHER_API_KEY=
FRONTEND_URL=http://localhost:5173
PORT=8000
ENVIRONMENT=development
```

> **Note**: Even if `SUPABASE_URL` or `SUPABASE_KEY` are not set during initial hackathon prototyping, the backend includes an integrated in-memory fallback store seeded with sample farm, field, crop, and soil readings so that all APIs, endpoints, tests, and documentation run immediately!

### 3. Database Migration (Supabase PostgreSQL)

To provision your live Supabase database tables:
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Copy and paste the contents of `backend/database/schema.sql`.
3. Click **Run**.
4. Create a public Storage bucket named `disease-scans` under Supabase **Storage**.

### 4. Run the Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- Health Verification: `http://localhost:8000/api/health`

### 5. Run the Test Suite

```bash
pytest backend/tests/test_api.py -v
```

---

## 📡 REST API Specifications

| Domain | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/api/health` | Service health status check |
| **Farms** | `POST` | `/api/farms` | Register new farm |
| | `GET` | `/api/farms` | List all farms |
| | `GET` | `/api/farms/{farm_id}` | Fetch farm details |
| | `PUT` | `/api/farms/{farm_id}` | Update farm metadata |
| | `DELETE` | `/api/farms/{farm_id}` | Delete farm |
| **Fields** | `POST` | `/api/farms/{farm_id}/fields` | Create a field/plot |
| | `GET` | `/api/farms/{farm_id}/fields` | List fields under farm |
| | `GET` | `/api/fields/{field_id}` | Fetch field details |
| **Crops** | `POST` | `/api/fields/{field_id}/crops` | Plant/register crop in field |
| | `GET` | `/api/fields/{field_id}/crops` | List crops in field |
| | `PUT` | `/api/crops/{crop_id}` | Update crop growth stage/yield |
| **Soil** | `POST` | `/api/fields/{field_id}/soil` | Ingest soil sensor reading |
| | `GET` | `/api/fields/{field_id}/soil/latest` | Fetch latest soil telemetry |
| | `GET` | `/api/fields/{field_id}/soil/history` | Multi-day soil time-series |
| **Weather** | `GET` | `/api/weather` | Current weather (by lat/lon or city) |
| | `GET` | `/api/fields/{field_id}/weather` | Field localized weather |
| | `GET` | `/api/fields/{field_id}/weather/forecast` | 7-day agricultural forecast |
| **AI Advisor** | `POST` | `/api/chat` | Contextual farmer advisory consultation |
| **Disease Scan** | `POST` | `/api/disease/scan` | AI Vision crop disease diagnosis |
| | `GET` | `/api/disease/scans` | Historical disease scan records |
| **Predictions** | `POST` | `/api/predictions` | Run stress predictive models |
| | `GET` | `/api/fields/{field_id}/predictions` | Fetch active field predictions |
| **Recommendations**| `GET` | `/api/fields/{field_id}/recommendations` | Active explainable recommendations |
| | `POST` | `/api/fields/{field_id}/recommendations/generate` | Synthesize & generate fresh recommendations |
| | `GET` | `/api/fields/{field_id}/early-warnings` | Multi-day trend early warning system |
| **Analytics** | `GET` | `/api/analytics/{farm_id}` | Performance & yield analytics |
| **Dashboard** | `GET` | `/api/dashboard/{farm_id}` | Unified decision-support response |

---

## 🛡 Incomplete Data Resilience

AgriGPT is architected to handle imperfect or missing agricultural sensor data:
- Missing telemetry does not cause server 500 errors.
- Every dashboard response includes a `data_quality` status indicator:
  ```json
  {
    "soil": "AVAILABLE",
    "weather": "AVAILABLE",
    "crop": "AVAILABLE",
    "overall_score": 1.0
  }
  ```
- If sensors are missing, recommendations transparently communicate reduced confidence rather than fabricating false sensor telemetry.
