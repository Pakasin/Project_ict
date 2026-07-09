# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CyberShield — real-time network attack detection using 3 specialized LSTM models fed by live traffic sensors. Runs on a dedicated Linux VM on a home LAN.

- `CONTEXT.md` — canonical terminology glossary. Use terms defined there (e.g. "Intrusion Model" not "NSL model", "Flow" not "packet").
- `IMPLEMENTATION_GUIDE.md` — full architecture reference with code skeletons for every component.

## Architecture

Three models, each owning distinct attack classes — never overlap:

| Model | Sensor | Attack Classes | Artifacts |
|---|---|---|---|
| Intrusion Model | nfstream (Network Sensor) | R2L, U2R | `lstm_nslkdd.h5` + `scaler_nslkdd.pkl` |
| Flow Model | nfstream (Network Sensor) | DoS, DDoS, PortScan, BruteForce | `lstm_cicids.h5` + `scaler_cicids.pkl` |
| Injection Model | mitmproxy (HTTP Sensor) | SQL Injection | `lstm_sqli.h5` + `tokenizer_sqli.pkl` |

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

Network models use **Sliding Window** of shape `(10, features)` grouped by source IP:
- NSL-KDD: `(10, 41)` → 3-class softmax (Normal / R2L / U2R)
- CICIDS: `(10, 78)` → 5-class softmax (BENIGN / DoS / DDoS / PortScan / BruteForce)
- Windows shorter than 10 flows are **zero-padded at the front** — training data includes padded samples for cold-start correctness.
- `StandardScaler` is fit on train set only, saved as `.pkl`, loaded at FastAPI startup alongside `.h5`.

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
