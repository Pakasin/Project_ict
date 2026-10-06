"""
CyberShield — FastAPI Main Application

โหลด 3 LSTM models + scalers ตอน startup
เปิด session middleware สำหรับ admin auth
Include routers ทั้งหมด
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Path สำหรับ model files
MODELS_DIR = Path(__file__).parent / "models"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """โหลด LSTM models + scalers/tokenizer ตอน app startup"""
    import tensorflow as tf
    import joblib
    from backend.db import init_db
    from backend.inference import load_model_artifacts

    # สร้าง database tables ถ้ายังไม่มี
    init_db()

    # --- โหลด models ---
    # Intrusion Model: best_nslkdd_SimpleRNN (SimpleRNN, dir-format Keras export)
    # switched from best_nslkdd_smote.keras (LSTM+SMOTE) — see CLAUDE.md for
    # accuracy figures. best_nslkdd_smote.keras kept on disk for comparison only.
    app.state.model_intrusion = tf.keras.models.load_model(
        str(MODELS_DIR / "best_nslkdd_SimpleRNN")
    )
    # Flow Model (serving): best_flow_finetuned.keras — LSTM 48, 52 features, window ต่อ source IP.
    # CIC-IDS2017 raw pcap (re-extracted ด้วย nfstream config เรา: accounting_mode=3, idle_timeout=120)
    # เป็นฐาน แล้ว fine-tune ด้วย own-LAN lab captures → ตรง sensor จริง (benign FA ~3.7% บน lab,
    # DoS/DDoS/BF จับได้สด) และยังเก่งบน CIC. ใช้ flow_finetuned_scaler.json (fit บน nfstream).
    # best_flow_v2.keras (เดิม, trained CICFlowMeter) เก็บบนดิสก์เพื่อเปรียบเทียบเท่านั้น — บน nfstream
    # จริง DoS recall ~0.13 / DDoS-BF 0 (train/serve gap). best_GRU.keras / best.keras ก็ห้ามใช้ serve.
    # เรื่องเต็ม: CONTEXT.md → "CIC-IDS2017 raw-pcap base + fine-tune".
    app.state.model_flow = tf.keras.models.load_model(
        str(MODELS_DIR / "best_flow_finetuned.keras")
    )
    app.state.model_sqli = tf.keras.models.load_model(
        str(MODELS_DIR / "best_sqli.keras")
    )

    # --- โหลด scalers (fit บน train set เท่านั้น) ---
    app.state.scaler_intrusion = joblib.load(str(MODELS_DIR / "scaler_nslkdd.pkl"))
    app.state.label_encoders_intrusion = joblib.load(str(MODELS_DIR / "label_encoders_nslkdd.pkl"))

    # --- โหลด metadata + feature-slice map + sqli word_index ---
    artifacts = load_model_artifacts()
    app.state.model_metadata = artifacts["model_metadata"]
    app.state.sqli_metadata = artifacts["sqli_metadata"]
    app.state.flow_meta = artifacts["flow_meta"]
    app.state.flow_scaler = artifacts["flow_scaler"]
    app.state.flow_prim_cols = artifacts["flow_prim_cols"]
    app.state.flow_feature_names = artifacts["flow_feature_names"]
    app.state.flow_classes = artifacts["flow_classes"]
    app.state.sqli_word_index = artifacts["sqli_word_index"]

    print("✅ LSTM models + scalers loaded successfully")
    yield


app = FastAPI(
    title="CyberShield API",
    description="Real-time AI Cyber Attack Detection System",
    version="1.0.0",
    lifespan=lifespan,
)

# Session middleware สำหรับ admin authentication
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "fallback-dev-secret-change-me"),
    max_age=3600,  # 1 ชั่วโมง
)

# --- Include Routers ---
from backend.routes import auth, predict, internal, logs, ws, incidents  # noqa: E402

app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(internal.router)
app.include_router(logs.router)
app.include_router(ws.router)
app.include_router(incidents.router)


# --- Serve React static files (production) ---
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
