# CyberShield — DFD & ER Diagrams

---

## 1. Data Flow Diagram (DFD)

### 1.1 Context Diagram (DFD Level 0)

แสดงภาพรวมของระบบ CyberShield กับ External Entities ทั้งหมด

```mermaid
graph LR
    subgraph External Entities
        NET["🌐 Network Traffic<br/>(Home LAN)"]
        HTTP["🔗 HTTP/HTTPS Traffic<br/>(Web Requests)"]
        ADMIN["👤 Admin User"]
    end

    subgraph "CyberShield System"
        SYS["⚡ AI Cyber Attack<br/>Detection System"]
    end

    NET -->|"Raw network flows"| SYS
    HTTP -->|"HTTP requests<br/>(query strings, body)"| SYS
    ADMIN -->|"Login credentials<br/>Manual test payloads"| SYS
    SYS -->|"Real-time alerts<br/>Detection feed<br/>Attack logs"| ADMIN
```

---

### 1.2 DFD Level 1

แสดง Process หลักภายในระบบ, Data Stores, และการไหลของข้อมูล

```mermaid
graph TB
    %% External Entities
    NET["🌐 Network Traffic"]
    HTTP["🔗 HTTP/HTTPS Traffic"]
    ADMIN["👤 Admin User"]

    %% Processes
    P1["<b>P1</b><br/>Network Sensor<br/>(nfstream)"]
    P2["<b>P2</b><br/>HTTP Sensor<br/>(mitmproxy)"]
    P3["<b>P3</b><br/>Intrusion Model<br/>(NSL-KDD LSTM)"]
    P4["<b>P4</b><br/>Flow Model<br/>(CICIDS LSTM)"]
    P5["<b>P5</b><br/>Injection Model<br/>(SQLi LSTM)"]
    P6["<b>P6</b><br/>FastAPI Backend<br/>(Event Processing)"]
    P7["<b>P7</b><br/>Authentication<br/>(Session Middleware)"]
    P8["<b>P8</b><br/>WebSocket<br/>Broadcast"]

    %% Data Stores
    D1[("D1: SQLite DB<br/>(Attack Logs)")]
    D2[("D2: Sliding Window<br/>Buffer (per IP)")]
    D3[("D3: Model Files<br/>(.h5 + .pkl)")]
    D4[("D4: Session Store<br/>(Cookie)")]

    %% Flows from External
    NET -->|"Raw network packets"| P1
    HTTP -->|"HTTP requests"| P2
    ADMIN -->|"Username / Password"| P7
    ADMIN -->|"Manual test payload"| P6

    %% Sensor Processing
    P1 -->|"Extracted flow features<br/>(41 NSL-KDD features)"| D2
    P1 -->|"Extracted flow features<br/>(78 CICIDS features)"| D2
    D2 -->|"Sliding window<br/>(10, 41)"| P3
    D2 -->|"Sliding window<br/>(10, 78)"| P4
    P2 -->|"Query string +<br/>request body text"| P5

    %% Model Inference
    D3 -.->|"Load model weights<br/>& scalers at startup"| P3
    D3 -.->|"Load model weights<br/>& scalers at startup"| P4
    D3 -.->|"Load model weights<br/>& tokenizer at startup"| P5

    %% Prediction Events
    P3 -->|"Prediction Event<br/>(R2L / U2R / Normal,<br/>confidence, src_ip)"| P6
    P4 -->|"Prediction Event<br/>(DDoS / DoS / PortScan /<br/>BruteForce / Benign,<br/>confidence, src_ip)"| P6
    P5 -->|"Prediction Event<br/>(SQL Injection / Normal,<br/>confidence, src_ip)"| P6

    %% Backend Processing
    P6 -->|"Save prediction log"| D1
    P6 -->|"Broadcast event"| P8
    P7 -->|"Session token"| D4
    D4 -.->|"Validate session"| P6

    %% Output to Admin
    P8 -->|"Real-time detection feed<br/>(WebSocket)"| ADMIN
    D1 -->|"Historical attack logs"| ADMIN
    P7 -->|"Login success/redirect"| ADMIN
```

---

### 1.3 DFD Level 2 — Process P1: Network Sensor (Detail)

```mermaid
graph LR
    NET["🌐 Network Traffic"]
    
    P1_1["P1.1<br/>Capture Flows<br/>(nfstream)"]
    P1_2["P1.2<br/>Extract NSL-KDD<br/>Features (41)"]
    P1_3["P1.3<br/>Extract CICIDS<br/>Features (78)"]
    P1_4["P1.4<br/>Scale Features<br/>(StandardScaler)"]
    P1_5["P1.5<br/>Build Sliding<br/>Window (10 flows)"]
    P1_6["P1.6<br/>Zero-Pad<br/>(if < 10 flows)"]

    D2[("D2: Sliding Window<br/>Buffer (per IP)")]
    D3[("D3: Scaler .pkl files")]

    NET -->|"Raw packets"| P1_1
    P1_1 -->|"Completed flow record"| P1_2
    P1_1 -->|"Completed flow record"| P1_3
    P1_2 -->|"41 raw features"| P1_4
    P1_3 -->|"78 raw features"| P1_4
    D3 -.->|"scaler_nslkdd.pkl<br/>scaler_cicids.pkl"| P1_4
    P1_4 -->|"Scaled features"| P1_5
    P1_5 -->|"Window < 10 flows"| P1_6
    P1_6 -->|"Padded window (10, features)"| D2
    P1_5 -->|"Full window (10, features)"| D2
```

---

### 1.4 DFD Level 2 — Process P6: FastAPI Backend (Detail)

```mermaid
graph TB
    SENSOR["Sensors<br/>(P1, P2)"]
    ADMIN["👤 Admin"]

    P6_1["P6.1<br/>Receive Internal Event<br/>(POST /internal/event)"]
    P6_2["P6.2<br/>Validate Internal Token<br/>(X-Internal-Token)"]
    P6_3["P6.3<br/>Evaluate Alert Threshold"]
    P6_4["P6.4<br/>Save to Database"]
    P6_5["P6.5<br/>Broadcast via WebSocket"]
    P6_6["P6.6<br/>Manual Test Predict<br/>(POST /api/predict)"]
    P6_7["P6.7<br/>Serve Logs<br/>(GET /api/logs)"]

    D1[("D1: SQLite DB")]
    D4[("D4: Session Store")]
    ENV[("ENV: .env<br/>Thresholds")]

    SENSOR -->|"Prediction Event JSON"| P6_1
    P6_1 -->|"Event + token"| P6_2
    P6_2 -->|"Authenticated event"| P6_3
    ENV -.->|"THRESHOLD_*"| P6_3
    P6_3 -->|"Event with alert flag"| P6_4
    P6_4 -->|"INSERT log"| D1
    P6_3 -->|"Alert / Event"| P6_5
    P6_5 -->|"WebSocket broadcast"| ADMIN

    ADMIN -->|"Test payload"| P6_6
    D4 -.->|"Validate session"| P6_6
    P6_6 -->|"Prediction result"| ADMIN
    P6_6 -->|"Save test log"| D1

    ADMIN -->|"Request logs"| P6_7
    D4 -.->|"Validate session"| P6_7
    D1 -->|"SELECT logs"| P6_7
    P6_7 -->|"Log history"| ADMIN
```

---

## 2. Entity-Relationship Diagram (ER Diagram)

### 2.1 ER Diagram — ฐานข้อมูล CyberShield

```mermaid
erDiagram
    ADMIN_USER {
        int id PK
        varchar username UK "unique username"
        varchar password_hash "hashed password"
        datetime created_at "account creation time"
    }

    SESSION {
        varchar session_id PK "cookie session ID"
        int user_id FK "references ADMIN_USER"
        datetime created_at "session start time"
        datetime expires_at "session expiry (1 hour)"
    }

    PREDICTION_EVENT {
        int id PK "auto-increment"
        varchar model_name "intrusion | flow | sqli"
        varchar attack_class "R2L, U2R, DDoS, DoS, PortScan, BruteForce, SQL Injection, Normal, Benign"
        float confidence "0.0 - 1.0 prediction score"
        varchar source_ip "attacker IP address"
        boolean is_alert "confidence >= threshold"
        datetime timestamp "detection time"
        datetime created_at "DB insert time"
    }

    MODEL_CONFIG {
        int id PK
        varchar model_name UK "intrusion | flow | sqli"
        varchar model_file "path to .h5 file"
        varchar scaler_file "path to .pkl scaler/tokenizer"
        float alert_threshold "per-model alert threshold"
        varchar attack_classes "comma-separated classes"
        varchar input_shape "e.g. (10,41) or (1,200)"
        datetime updated_at "last config update"
    }

    ALERT_LOG {
        int id PK
        int prediction_event_id FK "references PREDICTION_EVENT"
        varchar severity "HIGH | MEDIUM | LOW"
        varchar status "NEW | ACKNOWLEDGED | RESOLVED"
        text notes "admin notes"
        datetime acknowledged_at "when admin saw it"
        datetime created_at "alert creation time"
    }

    SENSOR_STATUS {
        int id PK
        varchar sensor_name UK "network_sensor | http_sensor"
        varchar sensor_type "nfstream | mitmproxy"
        varchar status "RUNNING | STOPPED | ERROR"
        varchar host "sensor host address"
        int flows_processed "total flows/requests processed"
        datetime last_heartbeat "last activity"
        datetime started_at "sensor start time"
    }

    MANUAL_TEST {
        int id PK
        int user_id FK "references ADMIN_USER"
        varchar model_name "intrusion | flow | sqli"
        text input_payload "test payload sent"
        varchar predicted_class "prediction result"
        float confidence "prediction confidence"
        datetime created_at "test timestamp"
    }

    %% Relationships
    ADMIN_USER ||--o{ SESSION : "has sessions"
    ADMIN_USER ||--o{ MANUAL_TEST : "performs tests"
    PREDICTION_EVENT ||--o| ALERT_LOG : "may trigger alert"
    MODEL_CONFIG ||--o{ PREDICTION_EVENT : "produces predictions"
    SENSOR_STATUS ||--o{ PREDICTION_EVENT : "generates events"
```

---

### 2.2 ตารางสรุป Entities

| Entity | คำอธิบาย | Key Attributes |
|---|---|---|
| **ADMIN_USER** | ผู้ดูแลระบบ (single admin user, credentials from `.env`) | `username`, `password_hash` |
| **SESSION** | Session-based authentication (Starlette SessionMiddleware) | `session_id`, `expires_at` (1 hr) |
| **PREDICTION_EVENT** | ผลการ detect จาก 3 LSTM models ทุกครั้งที่มี flow/request เข้ามา | `model_name`, `attack_class`, `confidence`, `source_ip`, `is_alert` |
| **MODEL_CONFIG** | การตั้งค่าของแต่ละ model (threshold, file paths, input shape) | `model_name`, `alert_threshold`, `model_file` |
| **ALERT_LOG** | Alert ที่ confidence ≥ threshold พร้อม status tracking | `severity`, `status`, `notes` |
| **SENSOR_STATUS** | สถานะของ Network Sensor และ HTTP Sensor | `sensor_name`, `status`, `last_heartbeat` |
| **MANUAL_TEST** | ประวัติการทดสอบจากหน้า `/test` (bypass sensor) | `input_payload`, `predicted_class` |

---

### 2.3 Relationships สรุป

| Relationship | Cardinality | คำอธิบาย |
|---|---|---|
| ADMIN_USER → SESSION | 1 : N | Admin 1 คน มีได้หลาย sessions (ล็อกอินหลายครั้ง) |
| ADMIN_USER → MANUAL_TEST | 1 : N | Admin ทดสอบ payload ได้หลายครั้ง |
| PREDICTION_EVENT → ALERT_LOG | 1 : 0..1 | Prediction Event อาจกลายเป็น Alert (ถ้า ≥ threshold) |
| MODEL_CONFIG → PREDICTION_EVENT | 1 : N | แต่ละ model สร้าง prediction events หลายรายการ |
| SENSOR_STATUS → PREDICTION_EVENT | 1 : N | แต่ละ sensor ส่ง events เข้าระบบหลายรายการ |

---

### 2.4 Data Dictionary — PREDICTION_EVENT (ตารางหลัก)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTO INCREMENT | Primary key |
| `model_name` | VARCHAR(20) | NOT NULL | `'intrusion'` / `'flow'` / `'sqli'` |
| `attack_class` | VARCHAR(30) | NOT NULL | ชื่อ class ที่ model predict ได้ |
| `confidence` | FLOAT | NOT NULL, CHECK(0≤x≤1) | ค่าความมั่นใจ 0.0–1.0 |
| `source_ip` | VARCHAR(45) | NOT NULL | IP ต้นทาง (รองรับ IPv6) |
| `is_alert` | BOOLEAN | NOT NULL, DEFAULT FALSE | `TRUE` ถ้า confidence ≥ threshold |
| `timestamp` | DATETIME | NOT NULL | เวลาที่ detect ได้จริง |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | เวลาที่ INSERT เข้า DB |

> [!NOTE]
> Schema ถูกออกแบบให้ไม่ใช้ SQLite-specific types เพื่อรองรับการย้ายไป PostgreSQL ในอนาคตตามที่ระบุใน CONTEXT.md
