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
    # Flow Model: best_GRU.keras (71 features, GRU) คือ artifact จริงที่ serve
    # ห้ามใช้ best.keras (78 features, LSTM) — ตัวนั้นมี 7 fingerprint features
    # ที่ทำให้ f1 ปลอม 0.9999 (ดู CLAUDE.md) เก็บไว้เป็นหลักฐานเปรียบเทียบเท่านั้น
    app.state.model_intrusion = tf.keras.models.load_model(
        str(MODELS_DIR / "best_nslkdd_smote.keras")
    )
    app.state.model_flow = tf.keras.models.load_model(
        str(MODELS_DIR / "best_GRU.keras")
    )
    app.state.model_sqli = tf.keras.models.load_model(
        str(MODELS_DIR / "best_sqli.keras")
    )

    # --- โหลด scalers (fit บน train set เท่านั้น) ---
    app.state.scaler_intrusion = joblib.load(str(MODELS_DIR / "scaler_nslkdd.pkl"))
    app.state.label_encoders_intrusion = joblib.load(str(MODELS_DIR / "label_encoders_nslkdd.pkl"))
    app.state.scaler_flow = joblib.load(str(MODELS_DIR / "scaler_csecicids2018.pkl"))

    # --- โหลด metadata + feature-slice map + sqli word_index ---
    artifacts = load_model_artifacts()
    app.state.model_metadata = artifacts["model_metadata"]
    app.state.sqli_metadata = artifacts["sqli_metadata"]
    app.state.flow_raw_cols = artifacts["raw_cols"]
    app.state.flow_trained_cols = artifacts["trained_cols"]
    app.state.flow_keep_idx = artifacts["flow_keep_idx"]
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
