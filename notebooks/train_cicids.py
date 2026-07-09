"""
CyberShield — Flow Model Training (CICIDS 2017)

Dataset: CICIDS 2017 Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv (~600 MB)
Classes: BENIGN, DoS, DDoS, PortScan, BruteForce (5 classes)
Input shape: (10, 78) — Sliding Window ขนาด 10, CICIDS มี 78 features
Output: Dense(5, softmax)

⚠️ Key Constraints:
  - fit StandardScaler บน train set เท่านั้น
  - Sliding window ต้อง group by Source IP
  - Zero-pad ด้านหน้า
  - บันทึก scaler_cicids.pkl คู่กับ lstm_cicids.h5

รันบน Kaggle:
  - Upload CICIDS 2017 dataset
  - Enable GPU accelerator
  - ⚠️ Dataset ใหญ่ ~600MB — อาจต้องใช้ RAM สูง
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping
import joblib

# ============================================================
# 1. โหลด Dataset
# ============================================================
print("📥 กำลังโหลด CICIDS 2017 dataset...")

# TODO: ปรับ path ให้ตรงกับ Kaggle dataset
df = pd.read_csv(
    "/kaggle/input/cicids2017/Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
)

# ลบช่องว่างออกจาก column names
df.columns = df.columns.str.strip()

print(f"  Total rows: {len(df)}")
print(f"  Columns: {len(df.columns)}")

# ============================================================
# 2. Data Cleaning
# ============================================================
print("\n🧹 Cleaning data...")

# ดู label distribution
print(f"\n📊 Label distribution:")
print(df["Label"].value_counts())

# Map labels → 5 classes
LABEL_MAP = {
    "BENIGN": "BENIGN",
    "DDoS": "DDoS",
    "DoS Hulk": "DoS",
    "DoS GoldenEye": "DoS",
    "DoS slowloris": "DoS",
    "DoS Slowhttptest": "DoS",
    "PortScan": "PortScan",
    "FTP-Patator": "BruteForce",
    "SSH-Patator": "BruteForce",
    "Bot": "BENIGN",  # Bot ไม่ใช่ scope ของ Flow Model
    "Infiltration": "BENIGN",
    "Heartbleed": "BENIGN",
    "Web Attack – Brute Force": "BruteForce",
    "Web Attack – XSS": "BENIGN",
    "Web Attack – Sql Injection": "BENIGN",
}

df["attack_class"] = df["Label"].map(LABEL_MAP)
df = df[df["attack_class"].notna()].copy()

print(f"\n📊 Mapped class distribution:")
print(df["attack_class"].value_counts())

# ============================================================
# 3. Handle Missing / Infinite Values
# ============================================================
print("\n🔧 Handling missing and infinite values...")

# แทน inf ด้วย NaN แล้วลบแถวที่มี NaN
df.replace([np.inf, -np.inf], np.nan, inplace=True)
df.dropna(inplace=True)
print(f"  Rows after cleaning: {len(df)}")

# ============================================================
# 4. เตรียม Features + Labels
# ============================================================
class_labels = ["BENIGN", "DoS", "DDoS", "PortScan", "BruteForce"]
class_to_idx = {c: i for i, c in enumerate(class_labels)}

# ลบ columns ที่ไม่ใช่ features
drop_cols = ["Label", "attack_class"]
# เก็บ Source IP ไว้สำหรับ group by แต่ไม่ใช้เป็น feature
if "Source IP" in df.columns:
    source_ips = df["Source IP"].values
    drop_cols.append("Source IP")
else:
    source_ips = None

if "Destination IP" in df.columns:
    drop_cols.append("Destination IP")
if "Timestamp" in df.columns:
    drop_cols.append("Timestamp")
if "Flow ID" in df.columns:
    drop_cols.append("Flow ID")
if "Source Port" in df.columns:
    drop_cols.append("Source Port")
if "Destination Port" in df.columns:
    drop_cols.append("Destination Port")

feature_cols = [c for c in df.columns if c not in drop_cols]
print(f"\n  Number of features: {len(feature_cols)}")

X = df[feature_cols].values.astype(np.float32)
y = df["attack_class"].map(class_to_idx).values

# ============================================================
# 5. Train/Test Split
# ============================================================
print("\n📊 Splitting train/test...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

# ============================================================
# 6. StandardScaler — fit บน train set เท่านั้น
# ============================================================
print("\n📏 Fitting StandardScaler on train set...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

joblib.dump(scaler, "scaler_cicids.pkl")
print("  ✅ Saved scaler_cicids.pkl")

# ============================================================
# 7. สร้าง Sliding Windows
# ============================================================
print("\n🪟 Creating sliding windows...")

WINDOW_SIZE = 10
N_FEATURES = X_train_scaled.shape[1]


def make_windows(X, y, window=WINDOW_SIZE):
    """สร้าง sliding windows พร้อม zero-pad ด้านหน้า"""
    Xw, yw = [], []
    for i in range(len(X)):
        start = max(0, i - window + 1)
        window_data = X[start:i + 1]

        pad_count = window - len(window_data)
        if pad_count > 0:
            pad = np.zeros((pad_count, X.shape[1]))
            window_data = np.vstack([pad, window_data])

        Xw.append(window_data)
        yw.append(y[i])
    return np.array(Xw), np.array(yw)


X_train_w, y_train_w = make_windows(X_train_scaled, y_train)
X_test_w, y_test_w = make_windows(X_test_scaled, y_test)

print(f"  Train windows: {X_train_w.shape}")
print(f"  Test windows:  {X_test_w.shape}")

y_train_cat = to_categorical(y_train_w, num_classes=5)
y_test_cat = to_categorical(y_test_w, num_classes=5)

# ============================================================
# 8. สร้าง LSTM Model
# ============================================================
print("\n🧠 Building LSTM model...")

model = Sequential([
    LSTM(128, input_shape=(WINDOW_SIZE, N_FEATURES), return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(5, activation="softmax"),
])

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

model.summary()

# ============================================================
# 9. Training
# ============================================================
print("\n🏋️ Training...")

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True,
)

history = model.fit(
    X_train_w, y_train_cat,
    epochs=20,
    batch_size=64,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=1,
)

# ============================================================
# 10. Evaluation
# ============================================================
print("\n📊 Evaluating on test set...")

y_pred = model.predict(X_test_w, verbose=0)
y_pred_classes = np.argmax(y_pred, axis=1)

print("\n=== Classification Report ===")
print(classification_report(y_test_w, y_pred_classes, target_names=class_labels))

print("\n=== Confusion Matrix ===")
print(confusion_matrix(y_test_w, y_pred_classes))

# ============================================================
# 11. บันทึก Model
# ============================================================
model.save("lstm_cicids.h5")
print("\n✅ Saved lstm_cicids.h5")
print("✅ Saved scaler_cicids.pkl")
print("\n🎉 Flow Model training complete!")
print("   คัดลอก lstm_cicids.h5 + scaler_cicids.pkl ไปไว้ที่ backend/models/")
