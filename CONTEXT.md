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

**Intrusion Model (NSL-KDD)** — ✅ complete:
LSTM model trained on **NSL-KDD** (switched from UNSW-NB15 — see Known Limitations for why), with SMOTE oversampling on R2L/U2R. Specializes in R2L (Remote-to-Local) and U2R (User-to-Root) attack classes only (DoS/Probe excluded — Flow Model's responsibility). Input: Network Sensor features, 41 features (NSL-KDD schema, not 49/UNSW-NB15). Test results: R2L recall 0.10 / U2R recall 0.42 / macro-avg F1 0.51 — see Known Limitations for why R2L recall is capped by the dataset, not the pipeline.
_Avoid_: network model, UNSW model, UNSW-NB15 model

**Flow Model (CSE-CIC-IDS2018)** — ✅ complete:
LSTM (v2) trained on the *improved* CSE-CIC-IDS2018 (Engelen et al., corrected labels, `Src IP` available). Specializes in DDoS, DoS, and BruteForce (4-class: BENIGN/DoS/DDoS/BruteForce — PortScan excluded, absent from dataset). Input: a window of 10 Flows from the **same source IP**, 52 features that nfstream can measure plus source-behaviour (gap since the previous flow, same destination as the previous flow) — see `backend/flow_features.py`. Recognises the attack *tools* it was trained on (DoS: Hulk/GoldenEye/Slowloris; DDoS: LOIC/HOIC; BruteForce: SSH); **unseen tools are not reliably detected** — see Known Limitations. Supersedes v1 (GRU, 78→71 features, chronological windows).
_Avoid_: CSE-CIC-IDS2018 model, traffic model

**Injection Model (SQLi)** — ✅ complete:
LSTM model (char-level Embedding, vocab=106, maxlen=221). Binary classifier: Normal vs SQLi, threshold 0.75. Input: HTTP Sensor request text, encoded char-by-char (see `backend/inference.py::encode_sqli_text`). Artifacts: `best_sqli.keras` + `sqli_tokenizer.json` + `sqli_model_metadata.json`. Training happens on Kaggle (no local training scripts in this repo) — an earlier local `train_sqli.py` described a *different* word-level pipeline (vocab=10000, maxlen=200) that did **not** match the shipped artifact; treat `sqli_model_metadata.json` as ground truth for this model, not any training script.
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

**Scaler**: Per-model `sklearn` StandardScaler saved as `.pkl`, fit on training data only. Loaded at FastAPI startup and applied to all incoming features before LSTM inference. Files: `scaler_nslkdd.pkl`, `scaler_csecicids2018.pkl` (SQLi uses an Embedding layer + char-level `sqli_tokenizer.json`, no scaler needed). Intrusion Model also requires `label_encoders_nslkdd.pkl` (LabelEncoder for `protocol_type`/`service`/`flag`, fit on train+test combined to cover unseen categorical values).

**Sliding Window**: A rolling buffer of the 10 most recent Flows. Forms one LSTM input sample of shape `(10, features)`. Flow Model v2: grouped **per source IP** (preserves per-attacker context; never padded). Intrusion Model: chronological only (NSL-KDD has no Source IP).

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

**Flow Model v2 (improved CSE-CIC-IDS2018)** — current:
- **Unseen-tool generalisation is weak (measured, not assumed).** Holding out a whole attack tool (lstm_s, 3 seeds × 3 folds): GoldenEye ≈0.68, Slowloris ≈0.51, LOIC-HTTP ≈0.80, LOIC-UDP ≈0.34, HOIC ≈0.01, Hulk ≈0.02 class recall; benign alert rate stays ≈0.01–0.03% on unseen hosts. On tools it *has* seen (later in time, unseen benign hosts) accuracy is 99.92% (seed 11) with benign alert rate ≈0.01% and per-tool recall ≈1.0, Slowloris 0.91 (3 seeds; optimistic: same tool and attacker IP). Only 3 DoS and 2 DDoS tools exist in the data, so a model that learns "behaviour" rather than "tool" cannot be demonstrated — more tool diversity is the real fix, not more tuning.
- **BruteForce is SSH only** (one attacker IP, one day). FTP/web brute-force and all "Attempted" flows are excluded (they are port-closed/no-payload flows, not brute-force behaviour).
- **v1's f1 0.993 / 0.9534 and the "Single-flow requests are unreliable" note below describe the superseded GRU** — they came from class-sampled data that made windows unrealistically dense (e.g. Slowloris, ~3.5 flows/s against ~130 benign flows/s, is invisible in a network-wide chronological window).
- **nfstream ≠ CICFlowMeter, unverified:** v2 uses only primitives nfstream can compute (`accounting_mode=3`, `idle_timeout=120`, µs units) but no pcap parity test has been run; treat `THRESHOLD_FLOW` as untuned until it has seen real traffic.
- Trained on Kaggle (`cybershield-flow-prep4` → `cybershield-flow-train4`); evaluation numbers live in `backend/models/flow_v2_metadata.json`.
- **Flow v3 (more data) did not help — not installed.** Trained on CSE-CIC-IDS2018 + CIC-IDS2017 improved (Kaggle `cybershield-flow-pipe5`, 2026-10-05) with leave-attack-family-out CV and cross-capture tests. Unseen-tool recall stayed ≈0: HOIC 0.00, Hulk 0.05–0.09, LOIC-HTTP ≈0 (family CV); cross-capture 2017→2018 HOIC 0, LOIC-UDP ≈0, Hulk 0.06–0.17, benign false-alarm up to 3.2%; 2018→2017 varies strongly by seed (Hulk 0.06–0.92, LOIC 0.25–1.0, FTP 0). Best CV score 0.78 vs v2's 0.85. Conclusion: adding captures of the *same* tools does not teach tool-independent behaviour; v2 stays deployed. Mitigations in the repo: `backend/rate_rules.py` (tool-agnostic flow-rate rules, event `model_name="flow_rules"`, thresholds are unmeasured guesses — tune on real LAN traffic) and `backend/sensors/flow_recorder.py` + `backend/build_windows.py` (record labelled flows from attacks run against your own VM, then `python -m backend.build_windows data/captures/*.csv --evaluate`). Rate rules do not catch slow DoS (Slowloris).

**Flow Model v1 (superseded — GRU, `best_GRU.keras`)**:
1. **Dataset Selection**: Trained on 3 specific days (Feb 14, 16, 21, 2018) rather than the intended "Friday-Afternoon" slice.
2. **Missing Classes**: The trained model only covers 4 classes (`BENIGN`, `DoS`, `DDoS`, `BruteForce`). `PortScan` was omitted because it is completely absent from the dataset slice used (unlike CIC-IDS2017).
3. **Sequence Grouping**: The raw CSE-CIC-IDS2018 dataset lacked `Source IP` attributes. Therefore, instead of grouping sequences by attacker IP as intended for the sliding window, a chronological split by attack subtype was used for model training. The production sensor MUST construct the sliding window using the exact same method as training (chronological). It must not attempt to use group-by-Source-IP even if the Network Sensor provides it, as this would cause a severe train/serve mismatch, invalidating all reported performance metrics. If IP-based grouping is desired in the future, a new dataset containing Source IPs must be acquired to retrain the model from scratch.
4. **Single-flow requests are unreliable — verified, not just a padding footnote**: `POST /api/predict` with a single `features` row zero-pads 9 of the 10 window rows. Confirmed empirically against `best_GRU.keras`: real held-out DoS/DDoS test rows submitted this way predict `BENIGN` at ~98-100% confidence — even hand-crafted extreme values (huge packet rates, tiny inter-arrival times) still predict `BENIGN`. The same rows submitted as a genuine 10-row window (no padding) predict correctly at ~100% confidence, matching the reported f1. Root cause: CSE-CIC-IDS2018 features are highly inter-correlated (rates are derived from byte/packet/duration counts); one real row surrounded by 9 zero rows is far outside the training manifold, and hand-typed numbers that don't preserve those correlations are similarly out-of-distribution regardless of padding. `POST /api/predict` accepts an optional `window` (10 real rows) which skips padding entirely, for manual/API testing. The Test page's "randomize scenario" feature (`GET /api/test-samples/flow`, backed by `backend/models/flow_test_samples.json`, real unfiltered test-set samples — no `window_features`, single row only) reveals each sample's pre-computed real-evaluation result instead of re-predicting, since the single-row endpoint would misrepresent real accuracy. Treat any single-`features` result from manual typing as a UI/plumbing smoke test, not a detection-accuracy demo.

**Intrusion Model (NSL-KDD)** — ✅ complete:
1. **Dataset Switch (UNSW-NB15 → NSL-KDD)**: The original `train_unswnb15.py` script (Kaggle-only now, not in this repo) had a `COL_NAMES` (41-feature schema) and `ATTACK_MAP` copied wholesale from NSL-KDD/KDD99, not UNSW-NB15 (which has 45 differently-named columns and only 9 `attack_cat` values: Normal, Generic, Exploits, Fuzzers, DoS, Reconnaissance, Analysis, Backdoor, Shellcode, Worms — none of which map cleanly to `R2L`/`U2R`, terms that only exist in NSL-KDD/KDD99). Rather than force an inaccurate reinterpretation, the dataset was switched to real NSL-KDD, which the script already matched.
2. **Missing Source IP**: Same as Flow Model — NSL-KDD has no Source IP or timestamp column, so sequential windowing (by original row order) is used instead of group-by-IP. Confirmed empirically to still help: RF baseline (flat, no window) scored R2L recall 0.01 / U2R recall 0.07, vs. LSTM+window 0.10 / 0.36 — row order still carries burst-pattern structure inherited from the original capture (same-label runs average ~33 rows, 3.01% label switch rate), even with no explicit timestamp. Production sensor windowing must match this exactly (sequential, not group-by-IP) or all reported metrics are invalid.
3. **Severe class imbalance, addressed with SMOTE**: Train set — Normal 67,343 / R2L 995 / U2R 52 (U2R = 0.04% of train). `class_weight` alone (`{Normal: 0.34, R2L: 22.91, U2R: 438.40}`) was tried first; SMOTE oversampling was added on top (applied to raw scaled `X_train` before windowing, never touching test: R2L 995→5,000, U2R 52→1,000). Final choice is LSTM+SMOTE — it improved U2R recall +10pp (0.36→0.42) over LSTM without SMOTE, without hurting R2L.
4. **R2L recall (~0.10) is a dataset ceiling, not a pipeline bug** — two compounding causes, isolated by splitting R2L test rows into "seen" subtypes (in train: `spy, warezmaster, ftp_write, phf, warezclient, imap, guess_passwd, multihop`) vs. "novel" subtypes NSL-KDD intentionally adds only to `KDDTest+` (`httptunnel, snmpguess, snmpgetattack, xsnoop, named, worm, xlock, sendmail`): (a) novel-subtype recall ≈ 0 (0.004→0.000 after SMOTE) is expected by design — `KDDTest+` deliberately tests generalization to unseen attacks; (b) **even seen-subtype recall stayed low (0.128→0.137) after SMOTE** — indicating a feature-representation limit, not a sample-count problem: R2L behavior (password guessing, external service exploitation) shows up in features like `num_failed_logins`/`num_compromised` that overlap heavily with Normal traffic. SMOTE can only interpolate existing features, so it can't manufacture separability that isn't there. Do not read the low R2L recall as a training defect.
5. **U2R recall (0.42) has known unexplored headroom**: not yet tried — different SMOTE ratios, ADASYN instead of SMOTE, or feature engineering targeted at privilege-escalation signals (`root_shell`, `num_root`, `su_attempted`).
6. **Final test metrics for LSTM+SMOTE** (evaluated on the untouched original test set, not SMOTE-balanced, for fair comparison): R2L recall 0.10 / F1 0.19, U2R recall 0.42 / F1 0.45, macro-avg F1 0.51. RF flat baseline scored macro-avg F1 0.34 for comparison. **Historical — this architecture is no longer deployed, see #8.**
7. **Artifacts (LSTM+SMOTE, historical)**: `best_nslkdd_smote.keras`, `scaler_nslkdd.pkl`, `label_encoders_nslkdd.pkl`. Kept on disk for comparison, not loaded by `backend/main.py`.
8. **Deployed architecture switched to SimpleRNN**: `backend/main.py` now loads `best_nslkdd_SimpleRNN/` (a dir-format Keras export — `config.json` + `metadata.json` + `model.weights.h5`, not a single `.keras` zip; `tf.keras.models.load_model()` accepts the directory path directly). Same input shape `(10, 41)`, same `scaler_nslkdd.pkl`/`label_encoders_nslkdd.pkl`. Overall accuracy on a held-out random sample (`backend/models/intrusion_test_samples.json`, 31 samples, unfiltered): 77.4% (true-set accuracy 78.3%). Per-class breakdown from that sample: Normal correct ~87% (20/23), **R2L 0/7 correct (0%)** — every R2L sample in the pool was misclassified as Normal, consistent with R2L being a known dataset-level weak point (see #4) — U2R 1/1 correct. Detailed recall/F1/confusion-matrix figures for this architecture have not been computed; only the accuracy figures above are verified. Single-row zero-padded inference (`POST /api/predict` without `window`) does not reliably reproduce these numbers — same padding-artifact issue documented for the Flow Model (see Known Limitations #4) — so the Test page's "randomize scenario" feature reveals the pre-computed real-evaluation result rather than re-predicting through that endpoint.
