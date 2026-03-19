# 🇮🇳 National Infrastructure Intelligence System (NIIS)

> A smart city infrastructure risk assessment and maintenance planning platform for bridges, roads, flyovers, and tunnels across India's national and state highway networks.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20FastAPI%20%7C%20PostgreSQL%20%7C%20Docker-blue)
![ML](https://img.shields.io/badge/ML-scikit--learn%20%7C%20Random%20Forest%20%7C%20Gradient%20Boosting-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🎯 What It Does

NIIS helps civil engineers and government bodies make **data-driven infrastructure maintenance decisions** by combining:
- 📊 **ML-based structural health prediction** (condition rating, deterioration rate, maintenance year)
- 🌦️ **Climate-adaptive risk scoring** (seismic zone, flood risk, rainfall, coastal exposure)
- 💰 **Policy-grade budget optimization** across multiple structures
- 📈 **20-year deterioration forecasting** with confidence intervals
- 🔄 **Model drift detection & auto-retraining** from real NHAI inspection data

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)               │
│  Dashboard · Heatmap · Risk Simulator · Budget Opt  │
└───────────────────┬─────────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────────┐
│              Node.js / Express Backend               │
│   Auth · Infrastructure · Inspections · Budgets     │
│   Sensors · Notifications · Model Versions · Stats  │
└──────────┬─────────────────────────┬────────────────┘
           │ PostgreSQL               │ HTTP
           │                ┌─────────▼──────────────┐
           │                │  FastAPI ML Microservice │
           │                │  /predict  /batch-predict│
           │                │  /optimize/budget        │
           │                │  /retrain  /drift-report │
           │                └─────────────────────────┘
```

---

## 🧠 ML Models

| Model | Task | Algorithms |
|-------|------|------------|
| Condition Rating | Predict structural health (0–10) | Random Forest · Gradient Boosting · Linear Regression |
| Maintenance Year | Predict when intervention is needed | Random Forest · Gradient Boosting · Linear Regression |
| Deterioration Rate | Predict annual condition decay | Random Forest · Gradient Boosting · Linear Regression |

**Features used (20-dimensional vector):**
Age, Traffic Load, Material Type, Environmental Exposure, Seismic Zone, Flood Risk, Route Type, Structure Type, Number of Spans, Design Life, Number of Lanes, Superstructure Type, Foundation Type, Major Defects, Scour Risk, Coastal Exposure, PCI, Pavement Type, Safety Score, Risk Score

---

## 📸 Pages / Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | KPI cards, national stats, risk overview |
| **Infrastructure Registry** | Browse, filter, search all structures |
| **Infrastructure Detail** | Full inspection history, ML predictions, deterioration chart |
| **Heatmap** | Geographic risk heatmap across India |
| **Risk Simulator** | Adjust parameters live and see risk change in real time |
| **Budget Optimizer** | Allocate limited funds across structures for max risk reduction |
| **Budget Tracker** | Track spending against allocated maintenance budgets |
| **Admin Panel** | User management, model versioning, retraining controls |
| **Risk Ticker** | Live feed of high-risk alerts across the network |

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.10+

### 1. Clone the repo
```bash
git clone https://github.com/pankajkumar9771369/National-Infrastructure-Intelligence-System-NIIS-.git
cd National-Infrastructure-Intelligence-System-NIIS-
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Start PostgreSQL + ML Service (Docker)
```bash
docker-compose up -d
```

### 4. Start Backend
```bash
cd backend
npm install
node src/index.js
```

### 5. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express.js |
| ML Service | Python, FastAPI, scikit-learn, NumPy |
| Database | PostgreSQL 15 |
| Containerization | Docker, Docker Compose |
| ML Algorithms | Random Forest, Gradient Boosting, Linear Regression |

---

## 👤 Author

**Pankaj Kumar**  
Civil Engineering | Full Stack Developer  
[GitHub](https://github.com/pankajkumar9771369)

---

## 📄 License

MIT License
