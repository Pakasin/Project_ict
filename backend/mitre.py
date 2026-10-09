"""
CyberShield — MITRE ATT&CK mapping

attack_class (ที่โมเดล/กฎส่งมา) → tactic/technique. "SQL Injection" คือชื่อที่ http_sensor ส่ง ส่วน "SQLi"
คือชื่อ class ของโมเดล — รองรับทั้งสองเพื่อให้นับรวมกัน.
ไม่มี Reconnaissance/Port Scan เพราะไม่มีโมเดลหรือกฎตัวไหนตรวจจับได้
"""

MITRE_TECHNIQUES = [
    {"id": "T1190", "name": "Exploit Public-Facing Application", "tactic": "Initial Access",
     "tactic_th": "การเข้าถึงเบื้องต้น", "label_th": "โจมตีแบบใช้ช่องโหว่จากข้อมูล (SQLi)",
     "classes": ["SQLi", "SQL Injection"], "icon": "initial"},
    {"id": "T1110", "name": "Brute Force", "tactic": "Credential Access",
     "tactic_th": "การเข้าถึงข้อมูล", "label_th": "โจมตีแบบ Brute Force",
     "classes": ["BruteForce"], "icon": "credential"},
    {"id": "T1021", "name": "Remote Services", "tactic": "Lateral Movement",
     "tactic_th": "การเคลื่อนที่ในระบบ", "label_th": "Remote to Local (R2L)",
     "classes": ["R2L"], "icon": "lateral"},
    {"id": "T1068", "name": "Exploitation for Privilege Escalation", "tactic": "Privilege Escalation",
     "tactic_th": "การยกระดับสิทธิ์", "label_th": "User to Root (U2R)",
     "classes": ["U2R"], "icon": "privilege"},
    {"id": "T1498", "name": "Network Denial of Service", "tactic": "Impact",
     "tactic_th": "ผลกระทบ", "label_th": "Network DoS (DDoS/DoS)",
     "classes": ["DoS", "DDoS"], "icon": "impact"},
]

_BY_CLASS = {c.lower(): t for t in MITRE_TECHNIQUES for c in t["classes"]}


def technique_for(attack_class: str) -> dict | None:
    return _BY_CLASS.get((attack_class or "").lower())


def technique_id_for(attack_class: str) -> str | None:
    t = technique_for(attack_class)
    return t["id"] if t else None
