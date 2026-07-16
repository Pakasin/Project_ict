# CyberShield — Implementation Guide

Based on all architecture decisions resolved in session. Reference `CONTEXT.md` for terminology.

---

## Project Structure (Final)

```
cybershield/
├── .env                          # secrets + thresholds (never commit)
├── backend/
│   ├── main.py                   # FastAPI app
│   ├── auth/
│   │   └── session.py            # require_login dependency
│   ├── models/
│   │   ├── lstm_unswnb15.h5
│   │   ├── lstm_csecicids2018.h5
│   │   ├── lstm_sqli.h5
│   │   ├── scaler_unswnb15.pkl
│   │   └── scaler_csecicids2018.pkl
│   ├── routes/
│   │   ├── predict.py            # /test manual endpoint
│   │   ├── internal.py           # /internal/event (sensor IPC)
│   │   ├── logs.py               # /api/logs
│   │   └── ws.py                 # /ws/feed (broadcast)
│   └── sensors/
│       ├── network_sensor.py     # nfstream → sliding window → POST /internal/event
│       └── http_sensor.py        # mitmproxy addon → POST /internal/event
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # real-time feed
│   │   │   ├── Logs.jsx          # history table
│   │   │   └── Test.jsx          # manual payload test
│   │   └── App.jsx
│   └── dist/                     # built by `npm run build` → served by nginx
├── notebooks/                    # Kaggle .ipynb files
│   ├── train_unswnb15.ipynb
│   ├── train_csecicids2018.ipynb
│   └── train_sqli.ipynb
└── nginx.conf
```

---

## .env Structure

```env
# Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=your-random-secret-key-32chars

# Internal IPC secret
INTERNAL_TOKEN=your-internal-secret

# Alert thresholds (per-model)
THRESHOLD_INTRUSION=0.85
THRESHOLD_FLOW=0.80
THRESHOLD_SQLI=0.75

# Network interface for nfstream
NETWORK_INTERFACE=eth0
```

---

## Phase 1 — Linux VM Setup

```bash
# Ubuntu/Debian VM on home LAN
sudo apt update && sudo apt install -y python3-pip nginx nodejs npm

pip install fastapi uvicorn starlette tensorflow scikit-learn nfstream mitmproxy joblib python-dotenv

# React
cd frontend && npm install
```

nginx เปิด mirror port หรือ bridge mode ให้เห็น traffic ทั้ง LAN

---

## Phase 2 — Kaggle Training (3 Models)

### หลักการร่วมกันของ UNSW-NB15 และ CSE-CIC-IDS2018

ทั้งสองโมเดลใช้ **Sliding Window** shape `(10, features)` โดย:
1. sort flows ตาม timestamp
2. group by source IP
3. สร้าง windows ขนาด 10 ทีละ step
4. windows ที่สั้นกว่า 10 (ต้นๆ ของแต่ละ IP) → **zero-pad ด้านหน้า**
5. fit `StandardScaler` บน training set → บันทึกเป็น `.pkl`

### Model 1: Intrusion Model (UNSW-NB15)

- Dataset: UNSW-NB15 (~25 MB) — ใช้เฉพาะ class **R2L + U2R + Normal** (ตัด DoS/Probe ออก)
- Output shape: `(10, 49)` → Dense 3 (Normal / R2L / U2R)

```python
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np

# --- Feature prep ---
# df = UNSW-NB15 dataframe, keep only Normal/R2L/U2R rows
# encode categoricals, drop label column

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)  # fit บน train set เท่านั้น
joblib.dump(scaler, 'scaler_unswnb15.pkl')

# --- Sliding window ---
def make_windows(X, y, window=10):
    Xw, yw = [], []
    for i in range(len(X)):
        start = max(0, i - window + 1)
        window_data = X[start:i+1]
        # zero-pad ด้านหน้าถ้าสั้นกว่า 10
        pad = np.zeros((window - len(window_data), X.shape[1]))
        Xw.append(np.vstack([pad, window_data]))
        yw.append(y[i])
    return np.array(Xw), np.array(yw)

# NOTE: ต้อง group by source IP ก่อนแล้วค่อยทำ window ต่อ group
# ถ้า shuffle แบบ random windows จะปน IP กัน

# --- Model ---
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense

model = Sequential([
    LSTM(128, input_shape=(10, 49), return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(3, activation='softmax')  # Normal / R2L / U2R
])
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(X_train_w, y_train_w, epochs=20, batch_size=64, validation_split=0.2)
model.save('lstm_unswnb15.h5')
```

### Model 2: Flow Model (CSE-CIC-IDS2018)

- Dataset: `CSE-CIC-IDS2018-AWS.csv` (~600 MB)
- Classes: **DoS, DDoS, PortScan, BruteForce, BENIGN**
- Output shape: `(10, 78)` → Dense 5

```python
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
joblib.dump(scaler, 'scaler_csecicids2018.pkl')

# sliding window เหมือน UNSW-NB15 (group by Src IP column)

model = Sequential([
    LSTM(128, input_shape=(10, 78), return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(5, activation='softmax')
])
model.save('lstm_csecicids2018.h5')
```

### Model 3: Injection Model (SQLi)

- Dataset: Kaggle `sajid576/sql-injection-dataset`
- Input: raw query string text → Embedding → LSTM
- ไม่ใช้ StandardScaler (ใช้ Embedding แทน)
- บันทึก `tokenizer` แทน scaler

```python
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
import joblib

tokenizer = Tokenizer(num_words=10000, oov_token='<OOV>')
tokenizer.fit_on_texts(X_train)
joblib.dump(tokenizer, 'tokenizer_sqli.pkl')  # บันทึก tokenizer ด้วย

X_seq = pad_sequences(tokenizer.texts_to_sequences(X_train), maxlen=200)

model = Sequential([
    Embedding(10000, 64, input_length=200),
    LSTM(128, return_sequences=True),
    LSTM(64),
    Dense(1, activation='sigmoid')
])
model.save('lstm_sqli.h5')
```

---

## Phase 3 — FastAPI Backend

### main.py

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import tensorflow as tf
import joblib
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models + scalers at startup
    app.state.model_intrusion = tf.keras.models.load_model("models/lstm_unswnb15.h5")
    app.state.model_flow      = tf.keras.models.load_model("models/lstm_csecicids2018.h5")
    app.state.model_sqli      = tf.keras.models.load_model("models/lstm_sqli.h5")
    app.state.scaler_intrusion = joblib.load("models/scaler_unswnb15.pkl")
    app.state.scaler_flow      = joblib.load("models/scaler_csecicids2018.pkl")
    app.state.tokenizer_sqli   = joblib.load("models/tokenizer_sqli.pkl")
    print("All models loaded")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    max_age=3600
)

from routes import auth, predict, internal, logs, ws
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(internal.router)
app.include_router(logs.router)
app.include_router(ws.router)
```

### routes/internal.py — Sensor IPC Endpoint

```python
from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from datetime import datetime
import os
from routes.ws import broadcast  # broadcast to all dashboard clients

router = APIRouter()

class PredictionEvent(BaseModel):
    model_name: str       # "intrusion" | "flow" | "sqli"
    attack_class: str     # "R2L" | "U2R" | "DDoS" | "Normal" | etc.
    confidence: float
    source_ip: str
    timestamp: str

@router.post("/internal/event")
async def receive_event(
    event: PredictionEvent,
    x_internal_token: str = Header(None)
):
    if x_internal_token != os.getenv("INTERNAL_TOKEN"):
        raise HTTPException(status_code=403)

    # Save to SQLite
    await save_log(event)

    # Broadcast to dashboard WebSocket clients
    await broadcast(event.dict())
    return {"ok": True}
```

### routes/ws.py — Detection Feed WebSocket

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio

router = APIRouter()
active_connections: List[WebSocket] = []

async def broadcast(data: dict):
    for ws in active_connections:
        try:
            await ws.send_json(data)
        except Exception:
            pass

@router.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await asyncio.sleep(30)  # keep-alive ping
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        active_connections.remove(websocket)
```

### SQLite WAL mode (db.py)

```python
import sqlite3

def get_db():
    conn = sqlite3.connect("cybershield.db")
    conn.execute("PRAGMA journal_mode=WAL")  # enable WAL mode
    return conn
```

---

## Phase 4 — Sensors

### sensors/network_sensor.py (รันเป็น root)

```python
import nfstream
import numpy as np
import joblib
import requests
import os
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

# Sliding window buffer: {source_ip: [flow_features, ...]}
windows = defaultdict(list)
WINDOW_SIZE = 10

scaler_intrusion = joblib.load("models/scaler_unswnb15.pkl")
scaler_flow      = joblib.load("models/scaler_csecicids2018.pkl")

INTERNAL_URL   = "http://localhost:8000/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN")

def extract_unswnb15_features(flow) -> list:
    # map nfstream flow attributes → UNSW-NB15 49 features
    # (implement based on UNSW-NB15 feature list)
    return [...]

def extract_csecicids2018_features(flow) -> list:
    # map nfstream flow attributes → CSE-CIC-IDS2018 78 features
    return [...]

def make_padded_window(features_list, feature_len):
    window = features_list[-WINDOW_SIZE:]
    pad_count = WINDOW_SIZE - len(window)
    padded = [[0.0] * feature_len] * pad_count + window
    return np.array(padded).reshape(1, WINDOW_SIZE, feature_len)

def post_event(model_name, attack_class, confidence, source_ip):
    from datetime import datetime
    requests.post(INTERNAL_URL, json={
        "model_name": model_name,
        "attack_class": attack_class,
        "confidence": confidence,
        "source_ip": source_ip,
        "timestamp": datetime.now().isoformat()
    }, headers={"X-Internal-Token": INTERNAL_TOKEN}, timeout=2)

streamer = nfstream.NFStreamer(
    source=os.getenv("NETWORK_INTERFACE"),
    statistical_analysis=True
)

for flow in streamer:
    src_ip = flow.src_ip

    # --- Intrusion Model (UNSW-NB15: R2L / U2R) ---
    nsl_features = extract_unswnb15_features(flow)
    windows[f"nsl_{src_ip}"].append(nsl_features)
    X_nsl = make_padded_window(windows[f"nsl_{src_ip}"], 41)
    X_nsl_scaled = scaler_intrusion.transform(X_nsl.reshape(-1, 41)).reshape(1, 10, 41)
    # load model and predict (or import from shared state)

    # --- Flow Model (CSE-CIC-IDS2018: DDoS / BruteForce / PortScan / DoS) ---
    csecic_features = extract_csecicids2018_features(flow)
    windows[f"cic_{src_ip}"].append(csecic_features)
    X_cic = make_padded_window(windows[f"cic_{src_ip}"], 78)
    X_cic_scaled = scaler_flow.transform(X_cic.reshape(-1, 78)).reshape(1, 10, 78)
    # predict and post_event if confidence >= threshold
```

### sensors/http_sensor.py (mitmproxy addon)

```python
# รันด้วย: mitmproxy --mode transparent --scripts http_sensor.py
import requests
import os
import joblib
import numpy as np
from tensorflow.keras.preprocessing.sequence import pad_sequences
from datetime import datetime

tokenizer = joblib.load("models/tokenizer_sqli.pkl")
INTERNAL_URL   = "http://localhost:8000/internal/event"
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN")
THRESHOLD      = float(os.getenv("THRESHOLD_SQLI", "0.75"))

# model โหลด once ตอน startup
import tensorflow as tf
model_sqli = tf.keras.models.load_model("models/lstm_sqli.h5")

class SQLiAddon:
    def request(self, flow):
        query = flow.request.url + " " + flow.request.get_text()
        seq = pad_sequences(tokenizer.texts_to_sequences([query]), maxlen=200)
        confidence = float(model_sqli.predict(seq)[0][0])

        if confidence >= THRESHOLD:
            requests.post(INTERNAL_URL, json={
                "model_name": "sqli",
                "attack_class": "SQL Injection",
                "confidence": confidence,
                "source_ip": flow.client_conn.address[0],
                "timestamp": datetime.now().isoformat()
            }, headers={"X-Internal-Token": INTERNAL_TOKEN}, timeout=2)

addons = [SQLiAddon()]
```

---

## Phase 5 — React Frontend

### Dashboard.jsx — Real-time Feed

```jsx
import { useEffect, useState } from 'react'

export default function Dashboard() {
    const [events, setEvents] = useState([])

    useEffect(() => {
        const ws = new WebSocket(`ws://${window.location.host}/ws/feed`)
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)
            if (data.type === 'ping') return
            if (data.attack_class !== 'Normal') {
                setEvents(prev => [data, ...prev].slice(0, 100))
            }
        }
        return () => ws.close()
    }, [])

    return (
        <div>
            <h1>Live Detection Feed</h1>
            {events.map((ev, i) => (
                <div key={i} style={{ color: ev.confidence >= 0.8 ? 'red' : 'orange' }}>
                    [{ev.timestamp}] {ev.model_name} — {ev.attack_class}
                    ({(ev.confidence * 100).toFixed(1)}%) from {ev.source_ip}
                </div>
            ))}
        </div>
    )
}
```

### Test.jsx — Manual Payload Test

```jsx
// POST ตรงไปที่ /api/predict ข้าม sensor
// แสดง 3 tabs: Network (UNSW-NB15 features), Flow (CSE-CIC-IDS2018 features), SQLi (text input)
```

---

## Phase 6 — nginx Config

```nginx
# /etc/nginx/sites-available/cybershield
server {
    listen 80;

    # Serve React build
    root /path/to/cybershield/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    # Proxy WebSocket (must include Upgrade headers)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Block internal endpoint from outside
    location /internal/ {
        deny all;
    }
}
```

---

## Startup Order

```bash
# 1. FastAPI backend (non-root)
uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 2. Network Sensor (root required for raw capture)
sudo python backend/sensors/network_sensor.py

# 3. HTTP Sensor (root required for transparent proxy)
sudo mitmproxy --mode transparent --scripts backend/sensors/http_sensor.py

# 4. nginx (already running as service)
sudo systemctl start nginx
```

---

## Key Constraints (อย่าลืม)

| เรื่อง | สิ่งที่ต้องระวัง |
|---|---|
| Scaler | fit บน train set เท่านั้น บันทึก `.pkl` คู่กับ `.h5` เสมอ |
| Sliding window | group by source IP ก่อน ห้าม shuffle ข้าม IP |
| Zero-padding | pad ด้านหน้า (ไม่ใช่ท้าย) ให้ตรงกับ training |
| Internal endpoint | block จาก nginx ด้วย `deny all` |
| Session secret | ใน `.env` ห้าม hardcode ใน code |
| SQLi tokenizer | บันทึก `tokenizer_sqli.pkl` ควบคู่กับ model เสมอ |
| WAL mode | `PRAGMA journal_mode=WAL` ทุกครั้งที่เปิด connection |
