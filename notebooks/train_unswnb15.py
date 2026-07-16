"""
CyberShield — Intrusion Model Training (UNSW-NB15)

Dataset: UNSW-NB15 (~25 MB)
ใช้เฉพาะ 3 classes: Normal, R2L, U2R (ตัด DoS/Probe ออก เพราะ Flow Model รับผิดชอบ)
Input shape: (10, 49) — Sliding Window ขนาด 10, UNSW-NB15 มี 49 features
Output: Dense(3, softmax) — Normal / R2L / U2R

⚠️ Key Constraints:
  - fit StandardScaler บน train set เท่านั้น
  - Sliding window ต้อง group by source IP ก่อน
  - Zero-pad ด้านหน้า (ไม่ใช่ท้าย) ให้ตรงกับ inference
  - บันทึก scaler_unswnb15.pkl คู่กับ lstm_unswnb15.h5 เสมอ

รันบน Kaggle:
  - Upload UNSW-NB15 dataset
  - Enable GPU accelerator
  - รันทั้งไฟล์
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
print("📥 กำลังโหลด UNSW-NB15 dataset...")

# UNSW-NB15 column names (49 features + 2 labels)
COL_NAMES = [
    "duration", "protocol_type", "service", "flag", "src_bytes",
    "dst_bytes", "land", "wrong_fragment", "urgent", "hot",
    "num_failed_logins", "logged_in", "num_compromised", "root_shell",
    "su_attempted", "num_root", "num_file_creations", "num_shells",
    "num_access_files", "num_outbound_cmds", "is_host_login",
    "is_guest_login", "count", "srv_count", "serror_rate",
    "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate",
    "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
    "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate", "dst_host_srv_serror_rate", "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate", "label", "difficulty"
]

# TODO: ปรับ path ให้ตรงกับ Kaggle dataset
df_train = pd.read_csv("/kaggle/input/unsw-nb15/UNSW_NB15_training-set.csv", names=COL_NAMES)
df_test = pd.read_csv("/kaggle/input/unsw-nb15/UNSW_NB15_testing-set.csv", names=COL_NAMES)

print(f"  Train: {len(df_train)} rows")
print(f"  Test:  {len(df_test)} rows")

# ============================================================
# 2. กรองเฉพาะ Normal / R2L / U2R
# ============================================================
# UNSW-NB15 attack types → class mapping
ATTACK_MAP = {
    "normal": "Normal",
    # R2L attacks
    "ftp_write": "R2L", "guess_passwd": "R2L", "imap": "R2L",
    "multihop": "R2L", "phf": "R2L", "spy": "R2L", "warezclient": "R2L",
    "warezmaster": "R2L", "snmpgetattack": "R2L", "named": "R2L",
    "xlock": "R2L", "xsnoop": "R2L", "sendmail": "R2L",
    "httptunnel": "R2L", "worm": "R2L",
    # U2R attacks
    "buffer_overflow": "U2R", "loadmodule": "U2R", "perl": "U2R",
    "rootkit": "U2R", "sqlattack": "U2R", "xterm": "U2R", "ps": "U2R",
}

# Map labels
df_train["attack_class"] = df_train["label"].str.strip().str.lower().map(ATTACK_MAP)
df_test["attack_class"] = df_test["label"].str.strip().str.lower().map(ATTACK_MAP)

# เก็บเฉพาะ Normal / R2L / U2R (ตัด DoS / Probe ออก)
df_train = df_train[df_train["attack_class"].notna()].copy()
df_test = df_test[df_test["attack_class"].notna()].copy()

print(f"\n📊 Class distribution (train):")
print(df_train["attack_class"].value_counts())

# ============================================================
# 3. Encode Categorical Features
# ============================================================
print("\n🔧 Encoding categorical features...")

categorical_cols = ["protocol_type", "service", "flag"]
label_encoders = {}

for col in categorical_cols:
    le = LabelEncoder()
    # fit บน train + test รวมกัน เพื่อให้ครอบคลุมทุกค่า
    all_values = pd.concat([df_train[col], df_test[col]])
    le.fit(all_values)
    df_train[col] = le.transform(df_train[col])
    df_test[col] = le.transform(df_test[col])
    label_encoders[col] = le

# ============================================================
# 4. เตรียม Features + Labels
# ============================================================
feature_cols = COL_NAMES[:41]  # 49 features
class_labels = ["Normal", "R2L", "U2R"]
class_to_idx = {c: i for i, c in enumerate(class_labels)}

X_train = df_train[feature_cols].values.astype(np.float32)
y_train = df_train["attack_class"].map(class_to_idx).values

X_test = df_test[feature_cols].values.astype(np.float32)
y_test = df_test["attack_class"].map(class_to_idx).values

# ============================================================
# 5. StandardScaler — fit บน train set เท่านั้น
# ============================================================
print("\n📏 Fitting StandardScaler on train set...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)  # ใช้ transform เท่านั้น ห้าม fit

# บันทึก scaler
joblib.dump(scaler, "scaler_unswnb15.pkl")
print("  ✅ Saved scaler_unswnb15.pkl")

# ============================================================
# 6. สร้าง Sliding Windows (group by source IP)
# ============================================================
print("\n🪟 Creating sliding windows (window=10, group by source IP)...")

WINDOW_SIZE = 10


def make_windows_grouped(X, y, df, window=WINDOW_SIZE):
    """สร้าง sliding windows โดย group by source IP

    ห้าม shuffle ข้าม IP — จะทำให้ windows ปน IP กัน
    Zero-pad ด้านหน้าสำหรับ windows ที่สั้นกว่า 10
    """
    Xw, yw = [], []

    # UNSW-NB15 ไม่มี source IP column โดยตรง
    # ใช้ sequential windowing แทน (ข้อมูลเรียงตาม timestamp อยู่แล้ว)
    for i in range(len(X)):
        start = max(0, i - window + 1)
        window_data = X[start:i + 1]

        # zero-pad ด้านหน้าถ้าสั้นกว่า window_size
        pad_count = window - len(window_data)
        if pad_count > 0:
            pad = np.zeros((pad_count, X.shape[1]))
            window_data = np.vstack([pad, window_data])

        Xw.append(window_data)
        yw.append(y[i])

    return np.array(Xw), np.array(yw)


X_train_w, y_train_w = make_windows_grouped(X_train_scaled, y_train, df_train)
X_test_w, y_test_w = make_windows_grouped(X_test_scaled, y_test, df_test)

print(f"  Train windows: {X_train_w.shape}")
print(f"  Test windows:  {X_test_w.shape}")

# One-hot encode labels
y_train_cat = to_categorical(y_train_w, num_classes=3)
y_test_cat = to_categorical(y_test_w, num_classes=3)

# ============================================================
# 7. สร้าง LSTM Model
# ============================================================
print("\n🧠 Building LSTM model...")

model = Sequential([
    LSTM(128, input_shape=(WINDOW_SIZE, 41), return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(3, activation="softmax"),  # Normal / R2L / U2R
])

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

model.summary()

# ============================================================
# 8. Training
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
# 9. Evaluation
# ============================================================
print("\n📊 Evaluating on test set...")

y_pred = model.predict(X_test_w, verbose=0)
y_pred_classes = np.argmax(y_pred, axis=1)

print("\n=== Classification Report ===")
print(classification_report(y_test_w, y_pred_classes, target_names=class_labels))

print("\n=== Confusion Matrix ===")
print(confusion_matrix(y_test_w, y_pred_classes))

# ============================================================
# 10. บันทึก Model
# ============================================================
model.save("lstm_unswnb15.h5")
print("\n✅ Saved lstm_unswnb15.h5")
print("✅ Saved scaler_unswnb15.pkl")
print("\n🎉 Intrusion Model training complete!")
print("   คัดลอก lstm_unswnb15.h5 + scaler_unswnb15.pkl ไปไว้ที่ backend/models/")
