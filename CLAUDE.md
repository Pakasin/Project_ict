# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CyberShield — real-time network attack detection using 3 specialized LSTM models fed by live traffic sensors. Runs on a dedicated Linux VM on a home LAN.

- `CONTEXT.md` — canonical terminology glossary. Use terms defined there (e.g. "Intrusion Model" not "UNSW model", "Flow" not "packet").
- `IMPLEMENTATION_GUIDE.md` — full architecture reference with code skeletons for every component.

## Architecture

Three models, each owning distinct attack classes — never overlap:

| Model | Sensor | Attack Classes | Artifacts | Status |
|---|---|---|---|---|
| Intrusion Model | nfstream (Network Sensor) | R2L, U2R | `best_nslkdd_smote.keras` + `scaler_nslkdd.pkl` + `label_encoders_nslkdd.pkl` | ✅ complete (dataset switched UNSW-NB15 → NSL-KDD, SMOTE-balanced, see CONTEXT.md) |
| Flow Model | nfstream (Network Sensor) | DoS, DDoS, BruteForce | `best_GRU.keras` + `scaler_csecicids2018.pkl` + `feature_cols.json` + `trained_feature_cols.json` | ✅ complete (4-class, PortScan excluded — absent from dataset) |
| Injection Model | mitmproxy (HTTP Sensor) | SQL Injection | `lstm_sqli.h5` + `tokenizer_sqli.pkl` | ⏳ not started |

Data flow:
```
nfstream (root)  ──→ POST /internal/event ──→ FastAPI ──→ broadcast /ws/feed ──→ React
mitmproxy (root) ──→ POST /internal/event ──→ FastAPI ──→ SQLite (WAL)
```

Key constraints:
- Sensors run as **root** (raw socket access). FastAPI runs as non-root. They communicate via `POST /internal/event` with `X-Internal-Token` header.
- `/internal/` is blocked by nginx (`deny all`) — sensors only reach it via localhost.
- nginx proxies port 80 → React `dist/`, `/api/` and `/ws/` → FastAPI port 8000. WebSocket proxy requires `Upgrade` + `Connection` headers.

## LSTM Input Shape

Network models use **Sliding Window** of shape `(10, features)`. Neither dataset has a Source IP column — both use chronological windowing, NOT group-by-source-IP. Windows are ordered by time only, with **no grouping by attack subtype** — grouping by the label being predicted was a train/serve mismatch and has been removed. See CONTEXT.md Known Limitations.
- NSL-KDD (Intrusion Model): `(10, 41)` → 3-class softmax (Normal / R2L / U2R)
- CSE-CIC-IDS2018 (Flow Model): `(10, 71)` → 4-class softmax (BENIGN / DoS / DDoS / BruteForce — PortScan excluded, absent from dataset)
- Windows shorter than 10 flows are zero-padded at the front, but **incomplete windows were dropped at train time** — the model has never seen padding. Serving must therefore return no prediction until 10 flows have accumulated (skip the first 9 after sensor start). No `Masking` layer: left-side padding is incompatible with the cuDNN kernel.
- `StandardScaler` is fit on train set only, saved as `.pkl`, loaded at FastAPI startup.

**Flow Model feature counts differ on purpose — 78 vs 71:**
- `feature_cols.json` (78) = raw column order the scaler was fit on.
- `trained_feature_cols.json` (71) = what the model actually takes, after dropping the 7 fingerprint features in `FINGERPRINT_FEATURES` (TCP init window, header lengths, MSS, `Dst Port`, `Protocol`). Those encode *which host sent the flow*, not attack behaviour, and scored a spurious 0.9999 f1_macro; the honest 71-feature number is 0.9534.
- Order is fixed: **scale with all 78, then slice to 71** — never slice first, or values land in the wrong columns with no error raised.

SQLi model: Embedding layer, no scaler. Uses `tokenizer_sqli.pkl` (Keras Tokenizer, vocab=10000, maxlen=200).

## Common Commands

```bash
# Backend
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Sensors (require root)
sudo python backend/sensors/network_sensor.py
sudo mitmproxy --mode transparent --scripts backend/sensors/http_sensor.py

# Frontend
cd frontend && npm run dev        # development
cd frontend && npm run build      # production → dist/

# nginx
sudo systemctl reload nginx
```

## Environment

All secrets and tunable values in `.env` — never hardcode:

```
SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
INTERNAL_TOKEN          # shared secret for sensor → FastAPI IPC
THRESHOLD_INTRUSION, THRESHOLD_FLOW, THRESHOLD_SQLI   # per-model alert thresholds
NETWORK_INTERFACE       # nfstream capture interface (e.g. eth0)
```

## SQLite

Always enable WAL mode on every connection:
```python
conn.execute("PRAGMA journal_mode=WAL")
```
Schema uses no SQLite-specific types — designed for PostgreSQL migration.
