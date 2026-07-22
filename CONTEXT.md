# CyberShield — AI Cyber Attack Detection System

Portfolio project: real-time network attack detection using 3 specialized LSTM models, fed by live traffic sensors on a monitored network.

## Language

### Sensors

**Network Sensor**:
A `nfstream`-based Python process that captures live network flows from a network interface and extracts flow-level features (byte counts, durations, flag counts, etc.) compatible with UNSW-NB15 and CSE-CIC-IDS2018 feature schemas.
_Avoid_: packet capture, sniffer, tap

**HTTP Sensor**:
A `mitmproxy`-based transparent proxy that intercepts HTTP/HTTPS requests and extracts query strings and request bodies for SQLi analysis.
_Avoid_: proxy, web tap, request interceptor

### Models

**Intrusion Model (UNSW-NB15)**:
LSTM model trained on UNSW-NB15 dataset. Specializes in R2L (Remote-to-Local) and U2R (User-to-Root) attack classes. Input: Network Sensor features.
_Avoid_: network model, UNSW model

**Flow Model (CSE-CIC-IDS2018)**:
LSTM model trained on CSE-CIC-IDS2018 (using 02-14, 02-16, 02-21 subsets). Specializes in DDoS, DoS, and BruteForce classes. Input: Network Sensor features.
_Avoid_: CSE-CIC-IDS2018 model, traffic model

**Injection Model (SQLi)**:
LSTM model trained on SecLists SQLi dataset. Binary classifier: Normal vs SQL Injection. Input: HTTP Sensor request text.
_Avoid_: SQLi model, text model

### Attack Classes

**R2L**: Remote-to-Local attack — unauthorized remote access attempt. Detected by Intrusion Model only.

**U2R**: User-to-Root attack — privilege escalation from local user to root. Detected by Intrusion Model only.

**DDoS / DoS / BruteForce**: Volumetric and credential-stuffing attacks. Detected by Flow Model only.

**SQL Injection**: Malicious SQL embedded in HTTP request. Detected by Injection Model only.

### Deployment

**Sensor Host**: Dedicated Linux VM on home LAN. Runs Network Sensor (nfstream) and HTTP Sensor (mitmproxy). Positioned to see traffic from all devices on the network (mirror port or bridge mode).

**Backend Host**: Same Linux VM. Runs FastAPI (port 8000) + all 3 LSTM models + SQLite (WAL mode). SQLite chosen for simplicity; schema designed for PostgreSQL migration (no SQLite-specific types). Single admin user; credentials stored in `.env`, never hardcoded.

**Frontend Host**: nginx on same VM. Serves React `dist/` on port 80. Proxies `/api` and `/ws` to FastAPI port 8000 (with `Upgrade` headers for WebSocket).

### Pipeline

**Flow**: A completed network connection record produced by the Network Sensor. One step in a Sliding Window. Partial windows (< 10 flows for a new source IP) are zero-padded — model is trained on padded samples to handle cold-start correctly.

**Scaler**: Per-model `sklearn` StandardScaler saved as `.pkl` alongside `.h5`. Fit on training data only. Loaded at FastAPI startup and applied to all incoming features before LSTM inference. Files: `scaler_unswnb15.pkl`, `scaler_csecicids2018.pkl` (SQLi uses Embedding layer, no scaler needed).

**Sliding Window**: A rolling buffer of the 10 most recent Flows grouped by source IP (in theory). Forms one LSTM input sample of shape `(10, features)`. Grouping by source IP preserves per-attacker context. *(Note: see Known Limitations regarding Flow Model training)*

**Prediction Event**: A single detection result emitted after a model scores a Flow or HTTP request. Contains: model name, attack class, confidence score, source IP, timestamp.

**Alert**: A Prediction Event where confidence ≥ per-model threshold (configured in `.env`). Displayed prominently in red on dashboard. Below-threshold events are logged silently.

**Alert Threshold**: Per-model float in `.env` (e.g. `THRESHOLD_INTRUSION=0.85`, `THRESHOLD_FLOW=0.80`, `THRESHOLD_SQLI=0.75`). Accounts for calibration differences between models.

**Detection Feed**: Server-to-client broadcast stream of Prediction Events via WebSocket. Dashboard is read-only — browser never sends payloads. Sensors (nfstream, mitmproxy) are the sole source of predictions.

**Internal Event Endpoint**: `POST /internal/event` — accepts Prediction Events from sensor processes running as root. Protected by a shared secret header (`X-Internal-Token`). Not exposed outside localhost.

**React Dashboard**: Single-page React app served by FastAPI. Connects to Detection Feed WebSocket on load. No build-time API calls — all data comes through WebSocket or REST endpoints.

**Manual Test**: `/test` page — sends payload directly to model, bypassing sensors. Used for demo when no live attack traffic is present and for model debugging during development.

## Example dialogue

> Dev: "The sensor picked up something — which model handles it?"
> Expert: "Depends on the traffic type. If it's a network flow with R2L or U2R signatures, Intrusion Model. If it's high-volume DDoS or a brute-force sweep, Flow Model. If it's an HTTP request with suspicious query params, Injection Model."
> Dev: "What if nfstream sees a DoS flow?"
> Expert: "Flow Model owns DoS. Intrusion Model doesn't see DoS — its role is R2L and U2R only."

## Known Limitations

**Flow Model (CSE-CIC-IDS2018)**:
1. **Dataset Selection**: Trained on 3 specific days (Feb 14, 16, 21, 2018) rather than the intended "Friday-Afternoon" slice.
2. **Missing Classes**: The trained model only covers 4 classes (`BENIGN`, `DoS`, `DDoS`, `BruteForce`). `PortScan` was omitted because it is completely absent from the dataset slice used (unlike CIC-IDS2017).
3. **Sequence Grouping**: The raw CSE-CIC-IDS2018 dataset lacked `Source IP` attributes. Therefore, instead of grouping sequences by attacker IP as intended for the sliding window, a chronological split by attack subtype was used for model training. The production sensor MUST construct the sliding window using the exact same method as training (chronological). It must not attempt to use group-by-Source-IP even if the Network Sensor provides it, as this would cause a severe train/serve mismatch, invalidating all reported performance metrics. If IP-based grouping is desired in the future, a new dataset containing Source IPs must be acquired to retrain the model from scratch.
