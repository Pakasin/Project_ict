"""
CyberShield — Shared Inference Logic (Logic การทำนายร่วมของทุกโมเดล)

ไฟล์นี้รวม pipeline การเตรียมข้อมูล + ทำนาย (predict) ของทั้ง 3 โมเดลไว้ที่เดียว
เพื่อให้ /api/predict (Test Page) และ sensors (live traffic) ใช้โค้ดชุดเดียวกัน
— ป้องกัน logic แตกต่างกันและให้ผลลัพธ์ไม่ตรงกัน

╔═══════════════════════════════════════════════════════════════╗
║  โมเดลที่รองรับและขั้นตอนการประมวลผล                         ║
╠═══════════════════════════════════════════════════════════════╣
║  1. Intrusion Model (NSL-KDD)                                 ║
║     Input  : 41 features × 10 flows (window)                  ║
║     Process: scale(41) → reshape(1,10,41) → LSTM → softmax    ║
║     Output : 3 classes: Normal | R2L | U2R                     ║
║                                                               ║
║  2. Flow Model (CSE-CIC-IDS2018)                              ║
║     Input  : 78 raw features × 10 flows (window)              ║
║     Process: scale(78) → slice(71) → reshape(1,10,71) → GRU   ║
║     ⚠️  ต้อง scale ก่อน slice เสมอ — สลับไม่ได้               ║
║     Output : 4 classes: BENIGN | DoS | DDoS | BruteForce      ║
║                                                               ║
║  3. Injection Model / SQLi (char-level LSTM)                  ║
║     Input  : raw text (query string / request body)           ║
║     Process: char → index (word_index) → pad(221) → sigmoid   ║
║     Output : confidence 0.0-1.0, ตัดที่ threshold (0.75)      ║
╚═══════════════════════════════════════════════════════════════╝
"""

import json           # อ่านไฟล์ metadata JSON (feature list, class labels, tokenizer)
from pathlib import Path  # จัดการ path แบบ cross-platform ไม่ต้องต่อ string เอง

import numpy as np   # คำนวณ array/matrix สำหรับเตรียม tensor ก่อนส่งเข้าโมเดล

# ── Path ไปยังโฟลเดอร์ที่เก็บไฟล์โมเดลทั้งหมด ──
# Path(__file__).parent = โฟลเดอร์ที่ไฟล์นี้อยู่ (backend/)
# / "models" = backend/models/ — ใช้ / operator ของ pathlib แทนการต่อ string
MODELS_DIR = Path(__file__).parent / "models"

# ── ชื่อ class ของแต่ละโมเดล — ลำดับต้องตรงกับ output layer ของโมเดลพอดี ──
# Intrusion Model output: [prob_Normal, prob_R2L, prob_U2R] → index 0,1,2
INTRUSION_CLASSES = ["Normal", "R2L", "U2R"]
# SQLi Model ใช้ sigmoid → ไม่ใช้ list นี้โดยตรง แต่เก็บไว้ให้ครบถ้วน
SQLI_CLASSES      = ["Normal", "SQLi"]

# ── ค่าคงที่สำหรับ SQLi tokenizer ──
SQLI_OOV_INDEX = 1    # index สำรองสำหรับตัวอักษรที่ไม่มีใน vocabulary (Out-Of-Vocabulary)
                      # index 0 = padding, index 1 = OOV — ตามมาตรฐาน Keras
SQLI_MAX_LEN   = 221  # ความยาว sequence สูงสุด — ตรงกับที่โมเดลเทรนมา
                      # ยาวกว่า → ตัดจากหน้า เก็บแค่ท้าย 221 ตัว
                      # สั้นกว่า → เติม 0 ด้านหน้า (pre-padding)


def load_model_artifacts() -> dict:
    """โหลด metadata files ทั้งหมดสำหรับ 3 โมเดล — เรียกครั้งเดียวตอน app startup

    เรียกจาก lifespan() ใน main.py แล้วเก็บผลไว้ใน app.state.*
    ไม่อ่านไฟล์ซ้ำทุก request — ลด disk I/O และ latency

    Returns
    -------
    dict ที่มี keys ดังนี้:
        model_metadata   : input shapes + class labels ของ Intrusion และ Flow model
        sqli_metadata    : vocab size, max_len, threshold ของ SQLi model
        raw_cols         : list ชื่อ 78 features ของ Flow model (ตามลำดับ scaler)
        trained_cols     : list ชื่อ 71 features ที่ Flow model ใช้จริง
        flow_keep_idx    : list[int] — index ของ 71 cols ใน 78 cols สำหรับ numpy slice
        flow_classes     : list ชื่อ 4 output classes ของ Flow model
        sqli_word_index  : dict { ตัวอักษร → int } สำหรับ encode text เป็น token
    """
    # อ่าน metadata รวมของ Intrusion และ Flow model
    # รูปแบบ: {"intrusion_model": {"input_shape": ...}, "flow_model": {"class_labels": [...]}}
    with open(MODELS_DIR / "model_metadata.json", encoding="utf-8") as f:
        model_metadata = json.load(f)

    # อ่าน metadata เฉพาะ SQLi model (threshold, vocab_size, max_len)
    with open(MODELS_DIR / "sqli_model_metadata.json", encoding="utf-8") as f:
        sqli_metadata = json.load(f)

    # อ่านชื่อ 78 raw features ของ Flow model
    # ⚠️ ลำดับต้องตรงกับ scaler_csecicids2018.pkl ที่ fit ไว้ — ห้ามเรียงใหม่
    with open(MODELS_DIR / "feature_cols.json", encoding="utf-8") as f:
        raw_cols = json.load(f)

    # อ่านชื่อ 71 features ที่ Flow GRU ใช้จริง (subset ของ raw_cols)
    # ไฟล์นี้บันทึกไว้ตอนเทรน ต้องใช้ตัวนี้ slice ตามเสมอ
    with open(MODELS_DIR / "trained_feature_cols.json", encoding="utf-8") as f:
        trained_cols = json.load(f)

    # อ่าน char-level word index ของ SQLi tokenizer
    # รูปแบบ: {"a": 2, "b": 3, ...} — index 0 = padding, index 1 = OOV
    # บันทึกเป็น JSON dict ไม่ใช่ Keras Tokenizer object — encode เองในโค้ด
    with open(MODELS_DIR / "sqli_tokenizer.json", encoding="utf-8") as f:
        sqli_word_index = json.load(f)

    # สร้าง list ของ index ตำแหน่งที่ต้อง slice จาก 78 cols เหลือ 71 cols
    # วิธี: หาตำแหน่ง (index) ของแต่ละ trained col ใน raw_cols
    # ตัวอย่าง: ถ้า raw_cols[5] = "Flow Duration" และ trained_cols ต้องการ "Flow Duration"
    #           → flow_keep_idx มี 5 → scaled[:, flow_keep_idx] ดึง col ที่ 5 มาได้
    flow_keep_idx = [raw_cols.index(c) for c in trained_cols]

    # ดึงชื่อ class ทั้ง 4 ของ Flow model จาก metadata
    # ตัวอย่าง: ["BENIGN", "DoS attacks-GoldenEye", "DDoS attacks-LOIC-HTTP", "Brute Force"]
    flow_classes = model_metadata["flow_model"]["class_labels"]

    # ส่งคืนทุกอย่างเป็น dict เดียว — main.py แยกเก็บใน app.state.*
    return {
        "model_metadata":  model_metadata,
        "sqli_metadata":   sqli_metadata,
        "raw_cols":        raw_cols,
        "trained_cols":    trained_cols,
        "flow_keep_idx":   flow_keep_idx,   # ใช้ slice numpy: scaled[:, flow_keep_idx]
        "flow_classes":    flow_classes,
        "sqli_word_index": sqli_word_index,
    }


def predict_intrusion_window(
    model,                          # tf.keras.Model — Intrusion LSTM โหลดไว้ใน app.state
    scaler,                         # sklearn StandardScaler — fit บน NSL-KDD train set
    window_rows: list[list[float]], # 10 flows × 41 features เรียงตามเวลา (chronological)
) -> tuple[str, float, dict[str, float]]:
    """ทำนาย Intrusion ด้วย window 10 flows จริง (สำหรับ Live Sensor)

    ใช้โดย network_sensor.py เมื่อ sliding window สะสมครบ 10 flows
    เป็น serving path ที่ถูกต้อง — โมเดลเทรนบน window ขนาด 10 ล้วนๆ

    Returns: (class_name, confidence, all_probs)
    """
    # แปลง list of lists → numpy array รูปร่าง (10, 41)
    # จำเป็นต้องแปลงก่อนส่งให้ scaler เพราะ scaler รับ numpy array
    rows = np.array(window_rows)  # shape: (10, 41)

    # scale ทั้ง 10 flows ด้วย StandardScaler (ปรับ mean=0, std=1 ตาม train set)
    # แล้ว reshape เป็น (1, 10, 41) = [batch=1, timestep=10, features=41]
    # axis 0 = จำนวน window ที่ส่งพร้อมกัน (1 window ต่อ request)
    # axis 1 = จำนวน timestep (ขนาด window = 10)
    # axis 2 = จำนวน features (41 NSL-KDD features)
    scaled = scaler.transform(rows).reshape(1, rows.shape[0], rows.shape[1])

    # ส่ง tensor (1, 10, 41) เข้าโมเดล → ได้ softmax probability ของ 3 class
    # verbose=0 ปิด progress bar ไม่ให้ spam log
    probs = model.predict(scaled, verbose=0)[0]  # [0] ดึง batch แรก → shape: (3,)

    # หา index ของ class ที่มีความน่าจะเป็นสูงสุด
    idx = int(np.argmax(probs))

    return (
        INTRUSION_CLASSES[idx],                                       # ชื่อ class: Normal/R2L/U2R
        float(probs[idx]),                                            # confidence (0.0–1.0)
        {cls: float(p) for cls, p in zip(INTRUSION_CLASSES, probs)}, # prob ทุก class
    )


def predict_flow_window(
    model,                          # tf.keras.Model — Flow GRU โหลดไว้ใน app.state
    scaler,                         # sklearn StandardScaler — fit บน CIC-IDS2018 (78 cols)
    flow_keep_idx: list[int],       # index ของ 71 cols ที่ต้องการใน 78 cols
    flow_classes: list[str],        # ชื่อ 4 class (BENIGN, DoS, DDoS, BruteForce)
    window_rows: list[list[float]], # 10 flows × 78 raw features เรียงตามเวลา
) -> tuple[str, float, dict[str, float]]:
    """ทำนาย Flow attack ด้วย window 10 flows จริง (สำหรับ Live Sensor)

    ⚠️ กฎสำคัญ: scale ก่อน → slice หลัง (ห้ามสลับลำดับ)
       เหตุผล: scaler fit บน 78 cols ถ้า slice ก่อนจะ scale ผิดคอลัมน์
               ค่า mean/std จะตกคนละ column ทำให้ผลลัพธ์ผิดโดยไม่มี error

    Returns: (class_name, confidence, all_probs)
    """
    # แปลง list of lists → numpy array รูปร่าง (10, 78)
    rows = np.array(window_rows)  # shape: (10, 78)

    # Step 1: Scale ด้วย 78-column StandardScaler
    # ผลลัพธ์ยังคง 78 cols — scaler ต้องเห็น 78 cols ครบ
    scaled = scaler.transform(rows)  # shape: (10, 78)

    # Step 2: Slice เหลือ 71 cols ที่โมเดลใช้จริง
    # flow_keep_idx คือ list index เช่น [0, 2, 5, 7, ...] (71 ตัว)
    # numpy fancy indexing: ดึงเฉพาะ columns ที่ต้องการในครั้งเดียว
    sliced = scaled[:, flow_keep_idx]  # shape: (10, 71)

    # reshape เป็น (1, 10, 71) = [batch=1, timestep=10, features=71]
    window = sliced.reshape(1, sliced.shape[0], sliced.shape[1])

    # ส่ง tensor (1, 10, 71) เข้าโมเดล → softmax probability ของ 4 class
    probs = model.predict(window, verbose=0)[0]  # shape: (4,)

    idx = int(np.argmax(probs))  # index ของ class ที่ confidence สูงสุด

    return (
        flow_classes[idx],                                          # ชื่อ class
        float(probs[idx]),                                          # confidence
        {cls: float(p) for cls, p in zip(flow_classes, probs)},    # prob ทุก class
    )


def predict_intrusion(
    model,                  # tf.keras.Model — Intrusion LSTM
    scaler,                 # sklearn StandardScaler — fit บน NSL-KDD train set
    features: list[float],  # 41 features ของ 1 flow (จาก Test Page)
) -> tuple[str, float, dict[str, float]]:
    """ทำนาย Intrusion แบบ single-flow (สำหรับ Manual Test Page เท่านั้น)

    ⚠️ โมเดลต้องการ window 10 flows แต่ Test Page ส่งมาแค่ 1 flow
       วิธีแก้: สร้าง window ว่างทั้งหมด (zeros) แล้วใส่ flow จริงที่แถวท้ายสุด
       — โมเดลไม่เคยเห็น zero-padded window ตอนเทรน ผลลัพธ์จึงเป็น approximation
       — ระบบจะแสดง WINDOW_CAVEAT เตือนใน UI ไม่ซ่อนความไม่แน่นอนนี้

    Returns: (class_name, confidence, all_probs)
    """
    # Scale 41 features ด้วย StandardScaler
    # reshape(1, -1) = แปลง list เป็น array รูปร่าง (1, 41) ตามที่ scaler ต้องการ
    scaled = scaler.transform(np.array(features).reshape(1, -1))  # shape: (1, 41)

    # สร้าง window ขนาด (1, 10, 41) เต็มด้วยศูนย์
    # (1, 10, 41) = [batch=1, timestep=10, features=41]
    window = np.zeros((1, 10, 41))

    # วาง flow จริงไว้ที่แถวท้ายสุด (index 9 = timestep ล่าสุด)
    # [0] = batch 0, [9] = timestep ท้ายสุด, [:] = ทุก feature
    window[0, 9, :] = scaled[0]  # scaled[0] = แถวแรก (และแถวเดียว) ของ scaled

    # ส่ง tensor (1, 10, 41) เข้าโมเดล
    probs = model.predict(window, verbose=0)[0]  # shape: (3,)
    idx = int(np.argmax(probs))

    return (
        INTRUSION_CLASSES[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(INTRUSION_CLASSES, probs)},
    )


def predict_flow(
    model,                     # tf.keras.Model — Flow GRU
    scaler,                    # sklearn StandardScaler — fit บน CIC-IDS2018 (78 cols)
    flow_keep_idx: list[int],  # index ของ 71 cols ที่โมเดลใช้จริง
    flow_classes: list[str],   # ชื่อ 4 output classes
    features: list[float],     # 78 raw features ของ 1 flow (จาก Test Page)
) -> tuple[str, float, dict[str, float]]:
    """ทำนาย Flow attack แบบ single-flow (สำหรับ Manual Test Page เท่านั้น)

    ⚠️ เหมือน predict_intrusion — zero-pad window → ผลลัพธ์เป็น approximation
    ⚠️ กฎสำคัญ: scale(78) ก่อน → slice(71) หลัง — ห้ามสลับลำดับ

    Returns: (class_name, confidence, all_probs)
    """
    # Step 1: Scale 78 raw features → shape (1, 78)
    # reshape(1, -1) แปลง list → (1, 78) ตามที่ scaler ต้องการ
    scaled = scaler.transform(np.array(features).reshape(1, -1))  # shape: (1, 78)

    # Step 2: Slice เหลือ 71 cols ที่โมเดลใช้จริง (ต้องทำ หลัง scale เสมอ)
    sliced = scaled[:, flow_keep_idx]  # shape: (1, 71)

    # สร้าง window (1, 10, 71) เต็มด้วยศูนย์ แล้วใส่ flow จริงที่แถวท้ายสุด
    # len(flow_keep_idx) = 71 (จำนวน features หลัง slice)
    window = np.zeros((1, 10, len(flow_keep_idx)))
    window[0, 9, :] = sliced[0]  # ใส่ flow จริงที่ timestep ท้ายสุด

    probs = model.predict(window, verbose=0)[0]  # shape: (4,)
    idx = int(np.argmax(probs))

    return (
        flow_classes[idx],
        float(probs[idx]),
        {cls: float(p) for cls, p in zip(flow_classes, probs)},
    )


def encode_sqli_text(
    word_index: dict,         # dict { ตัวอักษร → int } จาก sqli_tokenizer.json
    text: str,                # ข้อความดิบ (URL + request body จาก HTTP sensor)
    maxlen: int = SQLI_MAX_LEN  # ความยาว sequence สูงสุด (default 221)
) -> np.ndarray:
    """แปลงข้อความดิบ → sequence ของ int แบบ char-level แล้ว pre-pad/truncate

    วิธีการ:
      1. แปลงทุกตัวอักษร → index จาก word_index (OOV = 1 ถ้าไม่มีใน dict)
      2. ถ้ายาวเกิน maxlen → ตัดจากหน้า เก็บแค่ท้าย maxlen ตัว
      3. ถ้าสั้นกว่า maxlen → เติม 0 ด้านหน้า (pre-padding)
         เหมือน keras.preprocessing.sequence.pad_sequences(padding='pre')

    Returns: numpy array shape (1, maxlen) พร้อมส่งเข้า model.predict
    """
    # แปลงทีละตัวอักษร → list of int
    # word_index.get(ch, SQLI_OOV_INDEX) = ถ้าไม่มี ch ในด word_index → ใช้ 1 (OOV)
    seq = [word_index.get(ch, SQLI_OOV_INDEX) for ch in text]

    if len(seq) >= maxlen:
        # ข้อความยาวเกิน → ตัดจากหน้า เก็บแค่ท้ายสุด 221 ตัวอักษร
        # (ส่วนท้ายมีโอกาสเป็น SQL injection payload มากกว่าส่วนหน้า)
        seq = seq[-maxlen:]
    else:
        # ข้อความสั้น → เติม 0 ด้านหน้าให้ครบ maxlen (pre-padding)
        # 0 คือ padding token (ไม่ใช่ OOV) — โมเดลเรียนรู้ที่จะเพิกเฉย
        seq = [0] * (maxlen - len(seq)) + seq

    # ห่อเป็น shape (1, 221) = [batch=1, sequence_length=221] สำหรับ model.predict
    return np.array([seq])


def predict_sqli(
    model,              # tf.keras.Model — SQLi Embedding+LSTM โหลดไว้ใน app.state
    word_index: dict,   # dict { ตัวอักษร → int } สำหรับ encode text
    threshold: float,   # ค่าตัด: confidence >= threshold → เป็น SQLi (default 0.75)
    text: str,          # ข้อความดิบ (URL + request body จาก HTTP sensor หรือ Test Page)
) -> tuple[str, float, dict[str, float]]:
    """ตรวจจับ SQL Injection ด้วย char-level Embedding → LSTM → sigmoid

    โมเดลนี้ใช้ sigmoid (ไม่ใช่ softmax) → output = ค่าเดียว (0.0–1.0)
    ตีความ: ยิ่งสูง → ยิ่งน่าจะเป็น SQLi
    ตัดสินใจด้วย threshold แทน argmax เพราะมีแค่ 2 class

    Returns: (class_name, confidence, all_probs)
        class_name : "SQLi" ถ้า confidence >= threshold | "Normal" ถ้าต่ำกว่า
        confidence : float ค่า sigmoid output = โอกาสเป็น SQLi (0.0–1.0)
        all_probs  : {"Normal": 1-conf, "SQLi": conf} รวมแล้วได้ 1.0
    """
    # แปลงข้อความ → sequence ของ int แบบ char-level + pre-pad → shape (1, 221)
    seq = encode_sqli_text(word_index, text)

    # ส่งเข้าโมเดล → ได้ sigmoid output
    # [0][0] = ดึง batch แรก [0] แล้วดึงค่าแรก [0] (sigmoid output 1 ค่า)
    confidence = float(model.predict(seq, verbose=0)[0][0])

    # ตัดสินใจ: ถ้า confidence >= threshold ถือว่าตรวจพบ SQL Injection
    predicted_class = "SQLi" if confidence >= threshold else "Normal"

    return (
        predicted_class,
        confidence,
        {"Normal": 1.0 - confidence, "SQLi": confidence},  # ทั้งสองรวมได้ 1.0 เสมอ
    )
