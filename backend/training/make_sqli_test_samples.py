"""
สร้าง backend/models/sqli_test_samples.json ใหม่สำหรับหน้า Test (โมเดล v2)

ไฟล์เดิมคำนวณจาก best_sqli.keras (v1) บนชุดข้อมูล Kaggle เดิม ซึ่งไม่อยู่ในเครื่องแล้ว — ถ้าไม่สร้างใหม่ หน้า Test จะโชว์ผลของ v1
ขณะที่ระบบใช้ v2 จริง (หน้า Test เปิดเผยผลที่คำนวณไว้ ไม่ได้ทำนายสด และต้องไม่เลือกเฉพาะตัวที่ถูก)

ข้อมูล: CSIC 2010 test split — ไม่ได้ใช้เทรน v2 (ดู train_sqli_v2.py)
  Normal = ค่าจาก request ปกติ  |  SQLi = ค่าจาก request ผิดปกติที่มีไวยากรณ์ SQL (กรองด้วย regex ไม่ใช่ label ดั้งเดิมของชุดข้อมูล)
สุ่ม seed=42 ตามสัดส่วน 19:11 เท่าไฟล์เดิม ไม่คัดเฉพาะตัวที่ทายถูก ทายผิดแสดงตามจริง

รัน:  python backend/training/make_sqli_test_samples.py
"""

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import train_sqli_v2 as T  # noqa: E402  (import tensorflow ก่อน pandas — ดูในไฟล์นั้น)

THRESHOLD = 0.75        # = threshold_default ใน sqli_model_metadata.json (ค่าที่หน้า Test ใช้)
N_NORMAL, N_SQLI = 19, 11


def main():
    import tensorflow as tf
    model = tf.keras.models.load_model(T.MODELS / "best_sqli_v2.keras")
    te = T.pd.read_parquet(T.RAW / "csic_test.parquet")
    cands = T.csic_candidates(te)
    normal = sorted({c for c, _, l in cands if l == 0})
    anom = sorted({c for c, _, l in cands if l == 1 and c not in set(normal) and T.SQL_SIGNAL.search(c)})

    sc_n, sc_a = T.predict(model, normal), T.predict(model, anom)
    correct_n, correct_a = (sc_n < THRESHOLD).sum(), (sc_a >= THRESHOLD).sum()
    true_acc = float((correct_n + correct_a) / (len(normal) + len(anom)))

    rng = random.Random(42)
    classes = {}
    n_ok = n_all = 0
    for name, pool, scores, n in (("Normal", normal, sc_n, N_NORMAL), ("SQLi", anom, sc_a, N_SQLI)):
        pick = rng.sample(range(len(pool)), n)
        items = []
        for i in pick:
            pred = "SQLi" if scores[i] >= THRESHOLD else "Normal"
            items.append({"query": pool[i], "true_class": name, "predicted_class": pred,
                          "confidence": float(scores[i] if pred == "SQLi" else 1 - scores[i]), "correct": pred == name})
            n_ok += pred == name
            n_all += 1
        classes[name] = items

    out = {
        "generated_from": f"CSIC 2010 test split (ไม่ได้ใช้เทรน): ค่าปกติ {len(normal)} ค่า / ค่าผิดปกติที่มีไวยากรณ์ SQL {len(anom)} ค่า, สุ่ม seed=42",
        "model": "best_sqli_v2.keras",
        "true_set_accuracy": round(true_acc, 4),
        "sample_pool_accuracy": round(n_ok / n_all, 4),
        "note": "ML ล้วน ๆ ที่ threshold 0.75 (ไม่รวมกฎ sqli_rules และด่านโครงสร้างที่ sensor ใช้จริง) | label SQLi = request ผิดปกติของ CSIC ที่ตรง regex "
                "ไวยากรณ์ SQL ไม่ใช่ label ดั้งเดิม | ข้อมูลจาก web app ร้านค้าสเปนชุดเดียว — ไม่ใช่ traffic ของเครือข่ายนี้",
        "classes": classes,
    }
    path = T.MODELS / "sqli_test_samples.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {path}  true_set_accuracy={out['true_set_accuracy']}  sample_pool_accuracy={out['sample_pool_accuracy']}")


if __name__ == "__main__":
    main()
