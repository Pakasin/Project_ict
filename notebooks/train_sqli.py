"""
⚠️ NOT the script that produced backend/models/best_sqli.keras. That artifact
is char-level (vocab=106, maxlen=221 — see sqli_model_metadata.json); this
script builds a word-level tokenizer (vocab=10000, maxlen=200) and would
produce a different, incompatible model/tokenizer pair. Kept for reference
only — do not assume it describes the shipped model. See CLAUDE.md.

CyberShield — Injection Model Training (SQLi)

Dataset: Kaggle sajid576/sql-injection-dataset
Input: raw query string text → Embedding → LSTM
Output: Dense(1, sigmoid) — Binary: Normal vs SQL Injection

ไม่ใช้ StandardScaler (ใช้ Embedding layer แทน)
บันทึก tokenizer_sqli.pkl แทน scaler

Tokenizer config:
  - num_words = 10000 (vocabulary size)
  - maxlen = 200 (max sequence length)
  - oov_token = '<OOV>'

รันบน Kaggle:
  - Upload sajid576/sql-injection-dataset
  - Enable GPU accelerator
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks import EarlyStopping
import joblib

# ============================================================
# 1. โหลด Dataset
# ============================================================
print("📥 กำลังโหลด SQL Injection dataset...")

# TODO: ปรับ path ให้ตรงกับ Kaggle dataset
df = pd.read_csv("/kaggle/input/sql-injection-dataset/sqli.csv")

print(f"  Total rows: {len(df)}")
print(f"  Columns: {list(df.columns)}")

# สมมติว่า dataset มี columns: 'Query' (text) + 'Label' (0/1)
# ปรับตามโครงสร้างจริงของ dataset
TEXT_COL = "Query"    # column ที่มี SQL query text
LABEL_COL = "Label"   # column ที่มี label (0=Normal, 1=SQLi)

print(f"\n📊 Label distribution:")
print(df[LABEL_COL].value_counts())

# ============================================================
# 2. เตรียมข้อมูล
# ============================================================
print("\n🔧 Preparing data...")

# ลบ rows ที่มี NaN
df.dropna(subset=[TEXT_COL, LABEL_COL], inplace=True)

# แปลง text เป็น string
X_text = df[TEXT_COL].astype(str).values
y = df[LABEL_COL].values.astype(np.float32)

# ============================================================
# 3. Train/Test Split
# ============================================================
print("\n📊 Splitting train/test...")
X_train_text, X_test_text, y_train, y_test = train_test_split(
    X_text, y, test_size=0.2, random_state=42, stratify=y
)
print(f"  Train: {len(X_train_text)}, Test: {len(X_test_text)}")

# ============================================================
# 4. Tokenizer — fit บน train set เท่านั้น
# ============================================================
print("\n📝 Fitting Tokenizer on train set...")

VOCAB_SIZE = 10000
MAX_LEN = 200

tokenizer = Tokenizer(
    num_words=VOCAB_SIZE,
    oov_token="<OOV>",
    char_level=False,
)
tokenizer.fit_on_texts(X_train_text)  # fit บน train set เท่านั้น

# บันทึก tokenizer
joblib.dump(tokenizer, "tokenizer_sqli.pkl")
print("  ✅ Saved tokenizer_sqli.pkl")
print(f"  Vocabulary size: {min(len(tokenizer.word_index) + 1, VOCAB_SIZE)}")

# ============================================================
# 5. Tokenize + Pad Sequences
# ============================================================
print("\n🔢 Tokenizing and padding sequences...")

X_train_seq = pad_sequences(
    tokenizer.texts_to_sequences(X_train_text),
    maxlen=MAX_LEN,
    padding="post",
    truncating="post",
)

X_test_seq = pad_sequences(
    tokenizer.texts_to_sequences(X_test_text),
    maxlen=MAX_LEN,
    padding="post",
    truncating="post",
)

print(f"  Train sequences: {X_train_seq.shape}")
print(f"  Test sequences:  {X_test_seq.shape}")

# ============================================================
# 6. สร้าง LSTM Model
# ============================================================
print("\n🧠 Building LSTM model...")

model = Sequential([
    Embedding(VOCAB_SIZE, 64, input_length=MAX_LEN),
    LSTM(128, return_sequences=True),
    Dropout(0.3),
    LSTM(64),
    Dropout(0.3),
    Dense(1, activation="sigmoid"),  # Binary: Normal vs SQL Injection
])

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"],
)

model.summary()

# ============================================================
# 7. Training
# ============================================================
print("\n🏋️ Training...")

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True,
)

history = model.fit(
    X_train_seq, y_train,
    epochs=20,
    batch_size=64,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=1,
)

# ============================================================
# 8. Evaluation
# ============================================================
print("\n📊 Evaluating on test set...")

y_pred_probs = model.predict(X_test_seq, verbose=0)
y_pred = (y_pred_probs > 0.5).astype(int).flatten()

print("\n=== Classification Report ===")
print(classification_report(y_test.astype(int), y_pred, target_names=["Normal", "SQL Injection"]))

print("\n=== Confusion Matrix ===")
print(confusion_matrix(y_test.astype(int), y_pred))

# ============================================================
# 9. บันทึก Model
# ============================================================
model.save("lstm_sqli.h5")
print("\n✅ Saved lstm_sqli.h5")
print("✅ Saved tokenizer_sqli.pkl")
print("\n🎉 Injection Model training complete!")
print("   คัดลอก lstm_sqli.h5 + tokenizer_sqli.pkl ไปไว้ที่ backend/models/")
