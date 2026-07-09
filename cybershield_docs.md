# AI Cyber Attack Detection System
## Implementation Plan v2 - Documentation

---

## Final Decisions

| Topic | Decision |
|---|---|
| GPU | Kaggle Free (Tesla T4 / P100 - 30 hrs/week) |
| Dataset | NSL-KDD + Kaggle SQLi + CICIDS 2017 (subset) |
| Real-time | WebSocket (/ws/predict) + HTTP POST fallback |
| Auth | Session-based (Starlette SessionMiddleware) |

---

## System Architecture

`
Login Page -> Dashboard -> FastAPI -> 3x LSTM -> SQLite/DB
Session Auth   WebSocket    Backend   Models.h5   Attack Logs
`

---

## Timeline (8 Days)

| Day 1-2 | Day 2-4 | Day 4-6 | Day 6-8 |
|---|---|---|---|
| Setup + Auth | Kaggle Train | API + WebSocket | Frontend |

---

## Phase 1 - Project Setup & Auth (Day 1-2)

### 1.1 Project Structure

```
project/
├── backend/
│   ├── main.py
│   ├── auth/
│   │   └── session.py
│   ├── models/
│   │   ├── lstm_nslkdd.h5
│   │   ├── lstm_sqli.h5
│   │   └── lstm_cicids.h5
│   └── routes/
├── frontend/
└── notebooks/   ← Kaggle .ipynb files
```

### 1.2 Session Auth (Starlette SessionMiddleware)

ใช้ SessionMiddleware แทน JWT เก็บ session ใน cookie อายุ 1 ชั่วโมง

```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    SessionMiddleware,
    secret_key="your-secret-key",
    max_age=3600
)

@app.post("/login")
async def login(request: Request, ...):
    request.session["user"] = username
    return RedirectResponse("/dashboard")

@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login")
```

### 1.3 Protected Routes (Dependency)

```python
def require_login(request: Request):
    if "user" not in request.session:
        raise HTTPException(
            status_code=303,
            headers={"Location": "/login"}
        )
    return request.session["user"]
```

ใส่ Depends(require_login) ใน route ที่ต้องการ login ทุกตัว

---

## Phase 2 - Kaggle Training (3 Models) (Day 2-4)

### Kaggle Free GPU Specs

```
GPU:   NVIDIA Tesla T4 or P100
VRAM:  16 GB
RAM:   30 GB
Limit: 30 hrs/week (เพียงพอสำหรับ 3 โมเดล)
เปิด GPU: Notebook Settings -> Accelerator -> GPU T4 x2
```

---

### Model 1: NSL-KDD - Network Intrusion Detection

- Dataset: NSL-KDD (~25 MB, Public)
- Target: 5 classes - Normal, DoS, Probe, R2L, U2R
- Output: lstm_nslkdd.h5

```python
model = Sequential([
    LSTM(128, input_shape=(timesteps, features), return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(5, activation='softmax')
])
model.save('lstm_nslkdd.h5')
```

---

### Model 2: Kaggle SQLi - SQL Injection Detection

- Dataset: Kaggle SQL Injection Dataset (sajid576/sql-injection-dataset)
- Target: Binary - Normal / SQL Injection
- Output: lstm_sqli.h5

```python
model = Sequential([
    Embedding(vocab_size, 64, input_length=max_len),
    LSTM(128, return_sequences=True),
    LSTM(64),
    Dense(1, activation='sigmoid')
])
model.save('lstm_sqli.h5')
```

---

### Model 3: CICIDS 2017 - BruteForce / DDoS Detection

- Dataset: Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv (~600 MB จาก 7 GB)
- Target: 4 classes - DoS, DDoS, PortScan, BruteForce
- Output: lstm_cicids.h5

```python
model = Sequential([
    LSTM(64, input_shape=(timesteps, features)),
    Dropout(0.2),
    Dense(4, activation='softmax')
])
model.save('lstm_cicids.h5')
```

---

## Phase 3 - FastAPI Backend + WebSocket (Day 4-6)

### 3.1 Load 3 Models at Startup

```python
@app.on_event("startup")
async def load_models():
    app.state.model_nslkdd = load_model("models/lstm_nslkdd.h5")
    app.state.model_sqli   = load_model("models/lstm_sqli.h5")
    app.state.model_cicids = load_model("models/lstm_cicids.h5")
    print("All 3 models loaded")
```

### 3.2 WebSocket Real-time Prediction

Client เชื่อม WebSocket ส่ง payload รับ prediction แบบ live

```python
@app.websocket("/ws/predict")
async def ws_predict(websocket: WebSocket):
    await websocket.accept()
    while True:
        data       = await websocket.receive_json()
        model_type = data["type"]    # "sqli" | "network" | "bruteforce"
        payload    = data["payload"]
        result     = await run_prediction(model_type, payload)
        await websocket.send_json({
            "prediction": result["label"],
            "confidence": result["score"],
            "timestamp":  datetime.now().isoformat()
        })
```

### 3.3 HTTP POST /predict (Fallback)

```python
@app.post("/api/predict")
async def predict(
    request: PredictRequest,
    user = Depends(require_login)
):
    result = await run_prediction(request.type, request.payload)
    await save_log(user, request, result)
    return result
```

---

## Phase 4 - Frontend Dashboard (Day 6-8)

### 4.1 Pages ที่ต้องมี

| Route | คำอธิบาย | ต้อง Login? |
|---|---|---|
| /login | Login form | No |
| /dashboard | Real-time attack feed + stats | Yes |
| /logs | ประวัติ prediction ทั้งหมด | Yes |
| /test | Manual test payload (3 model tabs) | Yes |
| /logout | Clear session + redirect login | Yes |

### 4.2 Login Page

```html
<!-- /login -->
<form method="POST" action="/login">
  <input name="username" placeholder="Username" />
  <input name="password" type="password" />
  <button type="submit">เข้าสู่ระบบ</button>
</form>
```

```js
// ถ้าใช้ React
fetch('/login', { method: 'POST', credentials: 'include' })
```

### 4.3 Real-time Dashboard (WebSocket Client)

```js
const ws = new WebSocket("ws://localhost:8000/ws/predict");

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setLogs(prev => [data, ...prev].slice(0, 100)); // เก็บ 100 log ล่าสุด
};

// ส่ง payload ทดสอบ
ws.send(JSON.stringify({
    type:    "sqli",
    payload: "SELECT * FROM users WHERE id=1 OR 1=1"
}));
```

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend | FastAPI + Uvicorn |
| Auth | Starlette SessionMiddleware (Cookie-based) |
| AI Models | TensorFlow/Keras LSTM x3 |
| Real-time | WebSocket /ws/predict |
| Database | SQLite (or PostgreSQL) |
| Frontend | React / Jinja2 Templates |
| Training | Kaggle Notebooks (Free GPU: T4/P100) |
| Datasets | NSL-KDD, Kaggle SQLi, CICIDS 2017 |

---

## Getting Started (ขั้นตอนเริ่มต้น)

1. สร้าง Project Structure ตาม Phase 1
2. ติดตั้ง SessionMiddleware + login/logout routes
3. เปิด Kaggle Notebook เปิด GPU T4 Train ทีละโมเดล
4. Download .h5 files ใส่ใน backend/models/
5. สร้าง FastAPI routes + WebSocket endpoint
6. สร้าง Frontend Dashboard + เชื่อม WebSocket