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
| Intrusion Model | nfstream (Network Sensor) | R2L, U2R | `best_nslkdd_SimpleRNN/` (dir-format Keras export) + `scaler_nslkdd.pkl` + `label_encoders_nslkdd.pkl` | ✅ complete (dataset switched UNSW-NB15 → NSL-KDD; architecture switched LSTM+SMOTE → SimpleRNN, see CONTEXT.md) |
| Flow Model (v2) | nfstream (Network Sensor) | DoS, DDoS, BruteForce | `best_flow_v2.keras` + `flow_v2_scaler.json` + `flow_v2_metadata.json` + `backend/flow_features.py` | ✅ complete — **per-source-IP windows, 52 features, LSTM**. Detects the attack *tools* in its training data (Hulk/GoldenEye/Slowloris, LOIC/HOIC, SSH); **unseen tools are not reliably detected** (see Flow Model v2 below). Superseded v1 (`best_GRU.keras`, 78→71 features, chronological window) and `best.keras` (78-feature, fingerprint leak) are kept on disk for comparison only — never load them for serving |
| Injection Model | mitmproxy (HTTP Sensor) | SQL Injection | `best_sqli.keras` + `sqli_tokenizer.json` + `sqli_model_metadata.json` | ✅ complete — **char-level**, not the word-level pipeline the (now-removed, Kaggle-only) `train_sqli.py` described (see note below) |

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

Network models use **Sliding Window** of shape `(10, features)`. The Intrusion Model (NSL-KDD has no Source IP column) uses chronological windowing ordered by time only. The Flow Model v2 windows **per source IP** (the last 10 flows of the same `Src IP`, which the improved CSE-CIC-IDS2018 dataset has and nfstream knows). Neither groups by attack subtype — grouping by the label being predicted was a train/serve mismatch and has been removed. See CONTEXT.md Known Limitations.
- NSL-KDD (Intrusion Model): `(10, 41)` → 3-class softmax (Normal / R2L / U2R)
- CSE-CIC-IDS2018 improved (Flow Model v2): `(10, 52)` per source IP → 4-class softmax (BENIGN / DoS / DDoS / BruteForce — PortScan excluded, absent from dataset)
- Windows shorter than 10 flows (Intrusion: zero-padded at the front; Flow v2: never padded) — **incomplete windows were dropped at train time** — the model has never seen padding. Serving must therefore return no prediction until 10 flows have accumulated (skip the first 9 after sensor start). No `Masking` layer: left-side padding is incompatible with the cuDNN kernel. This is not a theoretical concern — verified against `best_GRU.keras`: real DoS/DDoS test rows submitted as a single zero-padded sample predict `BENIGN`; the same rows submitted as a real 10-row window predict correctly (see CONTEXT.md Known Limitations #4). `POST /api/predict` accepts an optional `window` (Intrusion: 10×41; Flow v2: 10×46 = 43 primitives + `gap_ms` + `same_dst_ip` + `same_dst_port`) that skips padding entirely for manual/API testing. For Flow v2 a single `features` row (43 primitives) is **simulated** as one source repeating that flow 10 times (`gap_ms`, `same_dst`) — not real traffic. The Test page itself doesn't use `window` — its "randomize scenario" feature (`GET /api/test-samples/{model}`, backed by `backend/models/{flow_v2,intrusion,sqli}_test_samples.json`) instead reveals each sample's real, pre-computed evaluation result (including genuinely wrong predictions, unfiltered) rather than re-predicting through the single-row endpoint, which would misrepresent real accuracy for Flow/Intrusion.
- `StandardScaler` is fit on train set only, saved as `.pkl` (Flow v2: `flow_v2_scaler.json` mean/scale, then clip ±6), loaded at FastAPI startup.

**Flow Model v2 (current) — features, windows, honest limits:**
- Single source of truth: `backend/flow_features.py` (`PRIM_COLS` 43 nfstream-measurable primitives → `engineer()` log1p + 6 derived = 49 → + 3 source-behaviour features `gap_log1p_ms`, `same_dst_ip_as_prev`, `same_dst_port_as_prev` = **52**). `SourceWindowTracker` builds the per-source window at serve time; `backend/inference.py::load_model_artifacts` fails at startup if `flow_v2_metadata.json`/scaler don't match this module. Verified: tracker output equals the training pipeline on 587k real windows (max diff 2.4e-4, float rounding of the gap).
- `NFStreamer` must use `statistical_analysis=True, accounting_mode=3` (payload bytes) and `idle_timeout=120` to match the dataset; times/IATs are microseconds. Flows are consumed in nfstream emission (flow-end) order, as in training.
- Fingerprint features (init window, header lengths, MSS, `Dst Port`, `Protocol`, `Src Port`) are not used. v1's 78→71 scale-then-slice rule no longer applies.
- **What it can and cannot do (read `flow_v2_metadata.json → evaluation`):** on tools it has seen, later in time and on unseen benign hosts: accuracy 99.92% (seed 11), benign alert rate ≈0.01% (3 seeds), per-tool recall ≈1.0 (Slowloris 0.91). Hold-out-a-whole-tool CV (3 seeds × 3 folds, final `lstm_s`): GoldenEye ≈0.68, Slowloris ≈0.51, LOIC-HTTP ≈0.80, LOIC-UDP ≈0.34, **HOIC ≈0.01, Hulk ≈0.02** — i.e. it recognises the attack tools in its data and generalises poorly to unseen DoS/DDoS tools. Only 3 DoS / 2 DDoS tools exist in the data; BruteForce evidence is SSH only (one attacker IP, one day). nfstream-vs-CICFlowMeter value parity on real traffic is unverified (no pcap).
- Training happens on Kaggle (kernels `cybershield-flow-prep4` → `cybershield-flow-train4`), not in this repo.
- v3 (v2 + CIC-IDS2017 data, kernel `pipe5`) was evaluated and **rejected** — unseen-tool recall still ≈0 (details in CONTEXT.md Known Limitations).
- Complements to the LSTM: `backend/rate_rules.py` (tool-agnostic rate rules, wired into `network_sensor.py`, events use `model_name="flow_rules"`, not an ML model), `backend/sensors/flow_recorder.py` (labelled nfstream capture → `data/captures/*.csv`, gitignored) and `backend/build_windows.py` (CSV → 10×52 windows, `--evaluate` scores Flow v2 + rules). Only attack your own VM/LAN.

SQLi model: Embedding layer, no scaler. Uses `sqli_tokenizer.json` — a plain `{char: index}` dict (char-level, vocab=106, maxlen=221, `<OOV>` index 1), **not** a word-level Keras `Tokenizer` (vocab=10000, maxlen=200) — an earlier local `train_sqli.py` (now removed; training happens on Kaggle, not in this repo) built the latter and didn't match the artifact actually shipped in `backend/models/`. Treat `sqli_model_metadata.json` as the source of truth for this model, not any training script. Threshold default 0.75 (`THRESHOLD_SQLI`). Serving encodes char-by-char via `backend/inference.py::encode_sqli_text`, pre-padding/truncating to 221 (keras `pad_sequences` default direction).

**Intrusion Model on live traffic is OFF by default** (`INTRUSION_LIVE_ENABLED=false` in `.env`): `network_sensor.py::extract_nslkdd_features` is a placeholder (6 of 41 features, rest 0) and NSL-KDD content features (`hot`, `num_failed_logins`, `logged_in`, …) cannot be measured by nfstream, so live Intrusion predictions would be meaningless. The API/Test page still serves the model on supplied features.

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

Tables: `prediction_events` (model output log) + `incident_status`, `audit_log`, `blocked_ips` (Incidents/Settings-Firewall state — previously `localStorage` only, now persisted so it survives across browsers/devices). All three live in `backend/db.py` alongside `prediction_events`.

## Inference logic

`backend/inference.py` (with `backend/flow_features.py` for the Flow Model v2 features/window) holds the scale (Flow Model) and char-encode (SQLi) logic shared between `POST /api/predict` (manual test, single zero-padded / simulated sample) and the live sensors (`network_sensor.py`, `http_sensor.py`, real accumulated windows). Do not duplicate this logic in a route or sensor — import from here so the two paths can't drift apart again.

## Auth

Single admin identity only, defined in `.env` (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) — no user table. `backend/auth/session.py::require_admin` is a FastAPI dependency guarding every state-mutating route (`PATCH /api/incidents/*`, `POST/DELETE /api/blocked-ips/*`); General User accounts are frontend-only (`localStorage`, `Login.jsx` signup form) and never receive a real session cookie, so they are correctly rejected by `require_admin` at the API layer regardless of what the UI shows/hides.
