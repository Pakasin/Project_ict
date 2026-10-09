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
| Flow Model | nfstream (Network Sensor) | DoS, DDoS, BruteForce | **serving:** `best_flow_finetuned.keras` + `flow_finetuned_scaler.json` + `flow_finetuned_metadata.json` + `backend/flow_features.py` | ✅ complete — **per-source-IP windows, 52 features, LSTM(48)**. CIC-IDS2017 raw-pcap base (re-extracted with our nfstream config) **fine-tuned on own-LAN lab** → matches the live sensor: lab benign FA ~3.7%, DoS/DDoS/BruteForce detected live, **DoS unseen-tool recall ≈1.0** (CIC tool variety), CIC held-out near-perfect. Built via `backend/training/`. **`best_flow_v2.keras`** (CICFlowMeter-trained, `flow_v2_scaler.json`/`flow_v2_metadata.json`) is **archived** — near-blind on real nfstream traffic (DoS 0.13, DDoS/BruteForce 0), kept for comparison only. v1 (`best_GRU.keras`) and `best.keras` (fingerprint leak) also disk-only — never serve them. Weak spots: low-concurrency siege/ab DoS (benign-like), DDoS/BruteForce unseen-tool (few variants) — see CONTEXT.md |
| Injection Model | mitmproxy (HTTP Sensor) | SQL Injection | **serving:** `best_sqli_v2.keras` (v1 `best_sqli_v1.keras` archived) + `sqli_tokenizer.json` + `sqli_model_metadata.json` | ✅ complete — **char-level**, not the word-level pipeline the (now-removed, Kaggle-only) `train_sqli.py` described (see note below) |

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
- Complements to the LSTM: `backend/rate_rules.py` (tool-agnostic rate rules, wired into `network_sensor.py`, events use `model_name="flow_rules"`, not an ML model), `backend/sensors/flow_recorder.py` (labelled nfstream capture → `data/captures/*.csv`, gitignored — supports both a live interface and a `.pcap` file as `--source`) `backend/build_windows.py` (CSV → 10×52 windows, `--evaluate` scores Flow v2 + rules), and `backend/sensors/live_sensor_lite.py` (TF-free live sensor — nfstream offline on rotating pcaps + rate rules, ships windows to the host backend `/api/predict` for inference over an SSH tunnel; for environments where the capture host can't run TensorFlow). Only attack your own VM/LAN.
- **Capture gotchas, confirmed on a real VM (read before recording):** nfstream cannot capture on loopback (`--source lo` → 0 flows, always) — use a real interface or a veth pair. Live capture also has a warmup gap: a short burst of traffic that finishes within the first few seconds after `NFStreamer()` starts can be silently dropped (confirmed by replaying the same packets from a pcap, which parsed correctly every time) — prefer `tcpdump -w x.pcap` during the attack, then `flow_recorder.py --source x.pcap`, over recording live for short/bursty tools (nfstream *live* capture yields 0 flows on the lab VM — reconfirmed 2026-10-06 — so pcap is the only working path there, not just the preferred one). `backend/rate_rules.py` defaults were **retuned from real own-LAN nfstream captures** (2026-10-06): `RATE_DOS_FLOWS=300`, `RATE_DDOS_SOURCES=5`, `RATE_DDOS_FLOWS=50`, `RATE_BF_FLOWS=10` — these catch every captured DoS tool + a 10-source DDoS + port-22 BruteForce at no extra benign false-alarm vs. the old defaults (which missed DDoS/BruteForce entirely); they still assume a small LAN and remain env-overridable. On real own-LAN traffic the **rate rules, not the Flow LSTM, are what actually detect attacks** (shipped `best_flow_v2` scores DoS recall 0.13 / DDoS 0 / BruteForce 0 on nfstream flows). Live detection runs through `backend/sensors/live_sensor_lite.py` (TF-free: nfstream offline on rotating pcaps + rate rules, ships windows to the host backend for inference). Full write-up with numbers: CONTEXT.md Known Limitations → "Own-LAN capture" and "Own-LAN capture round 2".

SQLi model: Embedding layer, no scaler. Uses `sqli_tokenizer.json` — a plain `{char: index}` dict (char-level, vocab=106, maxlen=221, `<OOV>` index 1), **not** a word-level Keras `Tokenizer` (vocab=10000, maxlen=200) — an earlier local `train_sqli.py` (now removed; training happens on Kaggle, not in this repo) built the latter and didn't match the artifact actually shipped in `backend/models/`. Treat `sqli_model_metadata.json` as the source of truth for this model, not any training script. Threshold default 0.75 (`THRESHOLD_SQLI`). Serving encodes char-by-char via `backend/inference.py::encode_sqli_text`, pre-padding/truncating to 221 (keras `pad_sequences` default direction).

**Live SQLi detection (`http_sensor.py` → `backend/sqli_detect.py::analyze_request`) — measured 2026-10-09, read before changing:** the sensor must **not** feed the model a full URL (v1 scored 1/12 attacks that way: `1' OR '1'='1` 99.3% bare → 3.4% behind `http://host/path?id=`). `backend/sqli_extract.py` splits a request into attacker-controlled values (query params, path segments, body as form/JSON/multipart, cookies; double-URL-decoded; values >221 chars windowed so padding can't push a payload out of the model's view; capped at 48 candidates / 32 KB). `backend/sqli_rules.py` = tool-agnostic signature rules (events `model_name="sqli_rules"`, confidence 1.0, shown separately like `flow_rules`) run **first**; then **`best_sqli_v2.keras`** may alert if `SQLI_LIVE_ML_THRESHOLD` (default **0.99**, not `THRESHOLD_SQLI`) is met **and** the text has SQL structure (`_looks_like_sql`, kept: it cuts hand-written benign false alarms 4→1 with v2).
**Model v2** (`backend/training/train_sqli_v2.py`, trained locally on CPU, not Kaggle) replaces v1 (`best_sqli_v1.keras`, disk-only, never serve). v1 was trained on Kaggle strings (benign = emails/single words), so on real HTTP text its confidence was a punctuation detector (`Tom & Jerry (from 1940) -- review` 99.8%; 45% of CSIC-test benign values ≥0.75). v2 trains on exactly what the sensor feeds it (same extractor) with real benign CSIC-2010 request values + SecLists + generated payloads/benign text. **Held-out (CSIC 2010 test split, never trained on), ML alone @0.75:** benign values FP 0.06% (v1 45.4%), SQL-syntax anomalous values recall 96.5% (v1 81.9%); **full pipeline (rules+v2+gate) request-level:** 0/10,800 benign requests flagged, 311/311 SQL-anomalous requests caught (v1 pipeline 294/311); hand-written corpus 42/42 attacks, 1/33 benign false alarm. **Honest limits:** CSIC is one Spanish e-commerce app with synthetic attacks, "SQL-anomalous" = CSIC-anomalous ∧ SQL regex (not an original label, and similar in spirit to the rules), positives are largely generated from templates the author knows, and nothing is validated on this LAN's real traffic, real mitmproxy or HTTPS. Known weak spots: SQL-looking prose (`I tried SELECT ... WHERE id = 5 ... -- any idea?`), tautology-like maths (`if x=1 or y=2`), `AND 1=1` as a whole-body string; Thai characters are OOV in the fixed 106-char vocab. Re-run `train_sqli_v2.py` (+ `make_sqli_test_samples.py`) and re-measure before changing the model or thresholds. Tests: `python -m unittest discover -s tests` (stdlib only; `RUN_MODEL_TESTS=1` adds the real-model pipeline test). The hand-written test corpus was tuned against (hold-out before tuning: 3/16 false alarms, 9/23 misses) — a regression guard, not accuracy on this LAN.

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

Tables: `prediction_events` (model output log) + `incident_status`, `audit_log`, `blocked_ips`, `mute_rules` (Incidents/Settings-Firewall state — previously `localStorage` only, now persisted so it survives across browsers/devices). All three live in `backend/db.py` alongside `prediction_events`.

**Grouped Logs view (`GET /api/logs/groups`, `db.get_event_groups`, Logs → "จัดกลุ่ม")** — one row per attack instead of one per event: events with the same (source_ip, attack_class, model_name) whose gaps are ≤ `gap_minutes` (default 15, UI offers 5/15/60/240) form a group; reports count, alerts, muted, first/last time + id, duration, max confidence, sensors. Same filters/exclude as `/api/logs`; paging is over groups. Computed in Python over at most `MAX_GROUP_ROWS` (100k, newest first) events and says `truncated` when it hit the cap. Timestamps arrive as `Z`, `+00:00` or naive — all parsed (aware → UTC); unreadable ones become singleton groups, never merged or dropped. Real data: 309 events → 20 groups (largest: 186 DoS events in 21 s). Drill-down from a group sets the event-list filters (date filter is day-level, so a group's drill-down may include other bursts of the same day). Export CSV/JSON still exports events, not groups. Tests: `tests/test_groups.py`.

**Measuring mobile overflow — do not use `is_mobile` emulation:** Chrome's mobile emulation widens the layout viewport to fit content, so `scrollWidth == innerWidth` always and overflow is invisible (an earlier "no overflow" claim here was wrong for that reason). Use a plain 390 px viewport and check `document.documentElement.scrollWidth` plus elements whose `right > innerWidth` outside a scrolling ancestor. Checked 2026-10-10: Logs (list and groups), Dashboard, Analytics, Test fit at 390 px; **Settings (480 px) and Incidents (522 px) still overflow** — pre-existing, not yet fixed.

**Mute rules (`backend/routes/mute.py`, table `mute_rules`, `prediction_events.muted_by`)** — admin-only way to silence alerts known to be false. It weakens detection, so it is **safe by default and enforced server-side**: always expires (default 7 days, max 30; class-only rules max 7 — they blind the whole network to that class), needs an IP and/or attack class (never "everything"; IP must be a single address, exact match), needs a reason, every create/delete goes to `audit_log`. A muted event is **still stored** (`is_alert=0`, `muted_by=<rule id>`, "ปิดเสียง" tag in Logs, note in the event modal) but is not counted as an alert, not broadcast to `/ws/feed`, and does not trigger the webhook; `/api/stats` counts it in `totals.muted` (excluded from `events`/`alerts`/`normal`, so it can't pollute the charts). Matching happens in `internal.receive_event` via `db.find_active_mute`. UI: event modal ("ปิดเสียง alert แบบนี้…", pre-filled) and Settings → ระบบ & Sensor (list/delete). Tests: `tests/test_mute.py`. `frontend/vite.config.js` honours `VITE_BACKEND` so the UI can be pointed at an isolated backend with a throw-away DB when testing.

## Dashboard data

Dashboard/Analytics/Logs/Incidents show **real data only** — no mock fallbacks; empty or API-down states render explicit empty/error UI. Aggregates come from `GET /api/stats?since=&bucket=` (`backend/db.py::get_event_stats`, `backend/routes/stats.py`). An "alert" there = `is_alert=1` and class not Normal/BENIGN. `prediction_events` dst/port/protocol/bytes columns are nullable (only filled by newer sensors); there are no pps charts. Sensors write local naive ISO timestamps, so the frontend sends `since` in the same format. "Blocked IPs" are **recorded only** — nothing enforces them at a firewall yet.

**Dashboard v2 additions (schema + API):** `prediction_events` now also has nullable `dst_ip, dst_port, protocol, bytes, sensor` (migrated in `init_db` via `ALTER TABLE`; sensors send them, old sensors/rows leave them NULL → "Top targets/ports/protocol" widgets show empty state until new sensor data arrives). New tables: `incident_meta` (assignee), `incident_notes`, `app_settings` (runtime thresholds, override `.env`), `sensor_heartbeat`. New endpoints: `GET /api/health`, `GET/PUT /api/settings/thresholds` (`backend/routes/system.py`), `GET /api/events/{id}`, `POST /api/incidents/{id}/notes`, `PUT /api/incidents/{id}/assignee`, `GET /api/incidents/assignees`, `POST /internal/heartbeat`. `/api/logs` is server-side paged (`total`, `until`, `source_ip`, `q`, `severity`, `status`); `/api/stats` has `until`, `totals.resolved`, `top_targets/top_ports/by_protocol`. `GET /api/audit-log` is now admin-only. Sensors send a heartbeat every 30s via `backend/sensors/heartbeat.py`; a sensor is "online" if seen within 120s. `internal.py::get_threshold` is the single place thresholds are resolved (UI setting > `.env`). Frontend: `App.jsx` owns the one `/ws/feed` socket and re-dispatches events as `cybershield:event`; pages subscribe with `hooks/useLiveEvents.js`. General User accounts are server-side now (see Auth). Not done: GeoIP (needs MaxMind DB).

## Inference logic

`backend/inference.py` (with `backend/flow_features.py` for the Flow Model v2 features/window) holds the scale (Flow Model) and char-encode (SQLi) logic shared between `POST /api/predict` (manual test, single zero-padded / simulated sample) and the live sensors (`network_sensor.py`, `http_sensor.py`, real accumulated windows). Do not duplicate this logic in a route or sensor — import from here so the two paths can't drift apart again.

## Auth

Two account kinds, both verified by the backend and given a real signed session cookie (`role` = `admin` | `general`):
- **admin** — single identity from `.env` (`ADMIN_USERNAME`/`ADMIN_PASSWORD`); an empty `ADMIN_PASSWORD` rejects all admin logins.
- **General User** — self-registered via `POST /api/register`, stored in the `users` table (PBKDF2-SHA256, `backend/auth/passwords.py`). Read-only: `require_admin` (`backend/auth/session.py`) returns 403 for them on every state-mutating route (`PATCH /api/incidents/*`, notes/assignee, `POST/DELETE /api/blocked-ips/*`, `PUT /api/settings/*`, `GET /api/audit-log`, `GET /api/settings/notifications`).

`POST /api/login` locks out after 5 failures per (client IP, username) within 5 min (`backend/routes/auth.py`; behind nginx it keys on `X-Real-IP`/`X-Forwarded-For`, so nginx must set it). The frontend treats `GET /api/me` as the only source of truth (`App.jsx::checkAuth`); `localStorage` only keeps profile edits. **MFA (TOTP, RFC 6238, stdlib-only `backend/auth/totp.py`)** for both account kinds: table `mfa` (secret, enabled, last_counter anti-replay, hashed one-time recovery codes); `POST /api/login` returns `mfa_required` + a 5-min `mfa_pending` session (no real session yet) → `POST /api/login/mfa` (shares the 5-fails lockout); manage via `/api/mfa/{status,setup,enable,disable}` (`backend/routes/mfa.py`, UI: Settings → Profile). Disable needs password + code. Secret stored plaintext in SQLite (needed to compute TOTP). Setup shows secret/otpauth link only, no QR. Not implemented: password reset, GeoIP map. Webhook alerts (`backend/notify.py`, URL in `app_settings`, admin-only) post to Slack/Discord-style endpoints with a 60 s per-(class, source IP) cooldown. MITRE mapping lives in `backend/mitre.py` (`GET /api/mitre`; logs carry `mitre`).
