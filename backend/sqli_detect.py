"""
CyberShield — SQLi request analysis (สกัด → กฎ signature → Injection Model)

จุดเดียวที่ sensor ใช้ตัดสินว่า HTTP request หนึ่งเป็น SQL injection หรือไม่ (ห้ามทำซ้ำใน sensor)

ลำดับ: กฎ signature ก่อน (แม่นยำ ถูก) → ถ้าไม่ตรงค่อยให้ Injection Model ตรวจ (ต้องมั่นใจสูงและมีโครงสร้าง SQL จริง)
ส่งผลเดียวต่อ request (ไม่ส่งซ้ำสองเท่า) kind="rules" → model_name "sqli_rules", kind="model" → "sqli"

ไม่พึ่ง numpy/TensorFlow ตอน import: `analyze_with_scorer` รับฟังก์ชันให้คะแนนจากข้างนอก
→ sensor บน VM (Python 3.14 ไม่มี TF) ใช้ได้ โดยส่งข้อความไปให้ backend ให้คะแนนผ่าน /internal/sqli-score
`analyze_request` คือทางลัดสำหรับ process ที่โหลดโมเดลในตัวเอง (http_sensor.py)

ทำไมโมเดลต้องผ่านด่านโครงสร้างก่อนแจ้งเตือน: ดู CONTEXT.md Known Limitations #0 — ตัวเลขที่วัดได้ (CSIC 2010 test, 311 SQL-anomalous
requests / 10,800 benign): ด่านนี้ลด false alarm บน corpus มือเขียนจาก 4/33 เหลือ 1/33 โดยไม่เสีย recall
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

from backend.sqli_extract import request_candidates
from backend.sqli_rules import looks_like_sql, match_rules

Scorer = Callable[[list[str]], list[float]]


@dataclass(frozen=True)
class SqliVerdict:
    kind: Literal["model", "rules"]
    confidence: float       # model: sigmoid output | rules: 1.0 (ไม่มีความมั่นใจจริง)
    candidate: str          # ค่าที่ทำให้ตรวจพบ (ใช้ log/ดีบัก — ไม่ส่งไป backend: อาจมีข้อมูลผู้ใช้)
    rule: str | None = None


def analyze_with_scorer(
    target: str,
    body: str,
    content_type: str,
    cookie: str,
    score_fn: Scorer | None,
    threshold: float,
) -> SqliVerdict | None:
    """คืน SqliVerdict ถ้า request น่าจะเป็น SQL injection มิฉะนั้น None

    score_fn: รับรายการข้อความ คืนคะแนน SQLi 0–1 ต่อข้อความ (None = ใช้กฎอย่างเดียว)
    ถ้า score_fn ล้ม (เช่น backend ไม่ตอบ) → ใช้ผลจากกฎต่อ ไม่ทำให้ proxy ล้ม
    """
    candidates = request_candidates(target, body, content_type, cookie)
    if not candidates:
        return None

    # กฎก่อน: แม่นยำสูง ไม่มี false alarm จากเครื่องหมายวรรคตอน และถูกกว่าโมเดล
    for c in candidates:
        hit = match_rules(c)
        if hit:
            return SqliVerdict("rules", 1.0, c, rule=hit.rule)

    if score_fn is not None:
        sqlish = [c for c in candidates if looks_like_sql(c)]
        if sqlish:
            try:
                scores = score_fn(sqlish)
            except Exception:
                return None
            if scores:
                best = max(range(len(scores)), key=scores.__getitem__)
                if scores[best] >= threshold:
                    return SqliVerdict("model", scores[best], sqlish[best])
    return None


def analyze_request(
    target: str,
    body: str,
    content_type: str,
    cookie: str,
    model,
    word_index: dict,
    threshold: float,
) -> SqliVerdict | None:
    """เหมือน analyze_with_scorer แต่ให้คะแนนด้วยโมเดล Keras ที่โหลดอยู่ใน process นี้ (model=None → กฎอย่างเดียว)"""
    if model is None:
        return analyze_with_scorer(target, body, content_type, cookie, None, threshold)

    from backend.inference import predict_sqli_batch  # import ตรงนี้: ต้องใช้ numpy เฉพาะ process ที่มีโมเดล
    return analyze_with_scorer(target, body, content_type, cookie,
                               lambda texts: predict_sqli_batch(model, word_index, texts), threshold)
