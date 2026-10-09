# Flow Model training (how `best_flow_finetuned.keras` was built)

The serving Flow model is **CIC-IDS2017 (raw pcap, re-extracted with our nfstream config) as a base,
fine-tuned on own-LAN lab captures.** This was the fix for the train/serve gap that made the old
`best_flow_v2.keras` (CICFlowMeter-trained) near-blind on real nfstream traffic (DoS recall 0.13,
DDoS/BruteForce 0, benign FA 13.5%). Full story + numbers: `CONTEXT.md`.

## Pipeline

1. **Base (Kaggle, big data + tool variety):** `kaggle_kernels/cicids-nfstream-flow.py`
   Reads CIC-IDS2017 **raw pcaps** (Kaggle `congyuanxu/cicids2017`, ~44 GB) through nfstream with OUR
   serve config (`statistical_analysis=True, accounting_mode=3, idle_timeout=120`) so the feature
   distribution matches `backend/flow_features.py` and the live sensor. Labels timezone-free by IP+port
   (attacker 172.16.0.1 → victim 192.168.10.50; Tue 21/22=BruteForce, Wed 80=DoS, Fri 80=DDoS; portscan/
   botnet/heartbleed dropped). Builds per-source windows, fits a NEW scaler on nfstream, trains, saves
   model+scaler+metadata+EDA. Kernel: `pakasinprajusbsuk/cybershield-cicids-nfstream-flow`.
   > A pre-made "CIC-IDS2017-via-nfstream" CSV on Kaggle did NOT transfer (benign FA 94%) because it used
   > a different NFStreamer config — re-extracting from raw pcap with our config is what made it match.

2. **Lab capture (own VM, matches the sensor env):** `capture_expanded.sh`, `capture_more.sh`
   Rebuild the atk-netns / root-netns-veth lab, run many benign patterns + DoS/DDoS/BruteForce tools,
   `tcpdump -w` → `backend/sensors/flow_recorder.py --source pcap` → `data/captures/*.csv` (gitignored).
   (nfstream LIVE capture yields 0 flows on the lab VM — pcap is the only working path.)

3. **Fine-tune (host, has TF; data small):** `finetune_final.py` (`--save` ships the model)
   Loads the CIC base, fine-tunes on the lab windows (built via `backend/build_windows.py`),
   class-weighted; evaluates on a lab held-out split (the serve target) + a CIC held-out set (forgetting
   check). Saves `best_flow_finetuned.keras` + `flow_finetuned_scaler.json`.
   `finetune_v2.py` adds a 2-stage/LR-schedule variant and `--unseen` leave-one-tool-out CV (the 2-stage
   variant forgot CIC BruteForce more, so the simple fine-tune in `finetune_final.py` is what ships).

4. **EDA (Kaggle):** `kaggle_kernels/cybershield-flow-eda.py` — uploads the model as a dataset, runs
   predictions + confusion matrices, per-tool recall, confidence, feature signature, PCA/t-SNE.
   Kernel: `pakasinprajusbsuk/cybershield-flow-eda`.

## Notes / gotchas
- Host paths in the `.py` host scripts are session-specific (scratchpad). The Kaggle kernels are the
  canonical reproducible artifacts; the host scripts are kept for reference.
- Save models as `.keras` on the same Keras version that will load them. The EDA kernel loads **weights
  only** (`.weights.h5`) + rebuilds the arch, because Kaggle's Keras could not deserialize a `.keras`
  saved by a newer host Keras (`GlorotUniform ... input_axes`).
- Only attack your own VM/LAN.

## SQLi Injection Model v2 (2026-10-09, trained locally on CPU)

`train_sqli_v2.py` builds the dataset (CSIC 2010 + SecLists + generators, all passed through `backend/sqli_extract.py`), trains `best_sqli_v2.keras`
and prints v1-vs-v2 numbers on held-out sets; `make_sqli_test_samples.py` regenerates the Test-page sample file. Raw data is **not** in the repo —
download CSIC 2010 (`bridge4/CSIC2010_dataset_classification` on Hugging Face, parquet) and SecLists `Fuzzing/Databases/SQLi/*.txt` into `%TEMP%/sqli_raw`
(or `$SQLI_RAW_DIR`). On Windows import tensorflow before pandas/pyarrow or the process segfaults. ~20 min for 12 epochs on 12 CPU cores.
