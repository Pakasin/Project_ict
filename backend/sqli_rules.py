"""
CyberShield — SQLi signature rules (เสริม Injection Model — ไม่ใช่ model)

เสริมแบบเดียวกับ rate_rules.py ที่เสริม Flow Model: Injection Model เทรนด้วย payload สไตล์ sqlmap จึงพลาด
รูปแบบคลาสสิกที่เห็นบ่อยที่สุด (ทดสอบ: `UNION SELECT ...` ได้ 0.0% แม้ส่ง payload ล้วน ๆ, `; DROP TABLE` 6%)
กฎเหล่านี้จับโครงสร้างไวยากรณ์ SQL ที่ใช้โจมตี ไม่ขึ้นกับเครื่องมือที่ใช้ ไม่ต้องเทรน

ไม่ใช่ model: ไม่มี confidence จริง ส่ง event เป็น model_name="sqli_rules" confidence=1.0
(แสดงแยกจาก "sqli" ในทุกหน้า เหมือน "flow_rules")

ออกแบบให้ "เข้มงวด" — ทุกกฎต้องมีโครงสร้างไวยากรณ์ครบ (เช่น `union` ตามด้วย `select`, quote ตามด้วย `or 1=1`)
ไม่ใช่แค่คำสำคัญ เพื่อไม่ให้ข้อความปกติที่มีคำว่า select/union/drop ติด (tests/test_sqli.py มีชุดข้อความปกติ
ที่ต้องไม่ติดทุกข้อ)

ข้อจำกัด (ตั้งใจให้ชัด):
  - เป็น signature: payload ที่ obfuscate ลึก (เช่น char() ต่อกัน, ชื่อฟังก์ชันสะกดแยก) หลุดได้ — ไม่ใช่ WAF เต็มรูปแบบ
  - ไม่ได้ปรับเทียบกับ traffic จริงของ LAN นี้ — ตรวจเฉพาะชุดทดสอบใน tests/ ซึ่งเขียนเอง (ไม่ใช่ข้อมูลจริง)
  - นี่คือ IDS: แจ้งเตือนอย่างเดียว ไม่บล็อก request
"""

import re
from dataclasses import dataclass
from urllib.parse import unquote_plus

_FLAGS = re.IGNORECASE | re.DOTALL

# (ชื่อกฎ, regex) — ทำงานกับข้อความที่ lower + normalize แล้ว
_RULES: list[tuple[str, re.Pattern]] = [
    ("union_select",
     r"\bunion\b\s*(?:all\s+|distinct\s+)?\(?\s*select\b"),
    ("quote_boolean_tautology",     # ' OR '1'='1   ') OR ('a'='a   1) OR 1=1   ' or 1=1   ' OR ''='
     r"""(?:['"`]\s*(?:\)\s*)*|\d\))\s*(?:or|and|\|\||&&)\s*(?:\(?\s*['"`]?[\w.-]+['"`]?\s*(?:=|<>|!=|<|>|\blike\b)\s*\(?\s*['"`]?[\w.-]+|"""
     r"""['"`]{2}\s*=\s*['"`])"""),
    ("sqlmap_numeric_probe",        # where 9295 = 9295 and ...   or 9323 = 9323  — เลขสุ่ม ≥3 หลักเท่ากันสองฝั่ง (ลายเซ็น sqlmap)
     r"\b(?:where|and|or|having)\s+(\d{3,})\s*=\s*\1(?!\d)"),
    ("char_chain_obfuscation",      # char(68)||char(69)||char(97)  — ประกอบสตริงจากรหัสตัวอักษร
     r"(?:\bchr?\s*\(\s*\d+\s*\)\s*(?:\|\||\+|,)\s*){2,}\bchr?\s*\("),
    ("heavy_query_join",            # from a as t1,b as t2,c as t3 — นับแถวแบบ heavy query ของ sqlmap
     r"\bas\s+t1\s*,\s*[\w$.]+\s+as\s+t2\b"),
    ("quoted_tautology",            # 1 AND 'a'='a  (quote ปิดของเดิมถูก injection ใช้แล้ว ฝั่งขวาจึงไม่มี quote ปิด)
     r"""\b(?:or|and)\s+'([^']*)'\s*=\s*'\1"""),
    ("numeric_tautology",           # 1 AND 1=1   5 or 2=2  — ต้องขึ้นต้นเป็นค่าสั้น ๆ แล้วตามด้วย and/or N=N
     # (ไม่ใช่ข้อความทั่วไปอย่าง "2+2=4 and 3=3")
     r"""^[\s(]*[\w.'"-]{0,16}[\s)]*\b(?:or|and)\s+(\d+)\s*=\s*\1(?!\w)"""),
    ("quote_comment_terminator",    # admin'--   admin')--   ' #   ' /*  (ต้องมี quote นำ ไม่ใช่ข้อความทั่วไปอย่าง "(from 1940) -- review")
     r"""['"`]\s*\)*\s*(?:--(?:\s|$|\+)|#(?:\s|$)|/\*)"""),
    ("order_by_probe",              # ' ORDER BY 5--   (นับคอลัมน์ก่อน UNION)
     r"""['"`)]\s*order\s+by\s+\d+|\border\s+by\s+\d+\s*(?:--|#|/\*)"""),
    ("stacked_destructive",         # ; DROP TABLE   ; DELETE FROM   ; INSERT INTO   ; EXEC
     r";\s*(?:drop\s+(?:table|database|view|user)|delete\s+from|insert\s+into|update\s+\w+\s+set|"
     r"alter\s+table|create\s+(?:table|user|database)|truncate\s+table|exec(?:ute)?\b|shutdown\b)"),
    ("time_delay",
     r"\b(?:sleep\s*\(\s*\d+(?:\.\d+)?\s*\)|pg_sleep\s*\(\s*\d|benchmark\s*\(\s*\d+\s*,|"
     r"dbms_pipe\.receive_message|dbms_lock\.sleep)|\bwaitfor\s+delay\b"),
    ("error_based_function",
     r"\b(?:extractvalue|updatexml|xmltype)\s*\(|\bexp\s*\(\s*~|\bctxsys\.drithsx\b|\bgeometrycollection\s*\("),
    ("schema_enumeration",
     r"\binformation_schema\b|\bsqlite_master\b|\bsysobjects\b|\bsyscolumns\b|\bpg_catalog\b|\bmysql\.user\b|"
     r"\ball_tables\b|\buser_tables\b"),
    ("file_or_os_access",
     r"\bload_file\s*\(|\binto\s+(?:out|dump)file\b|\bxp_cmdshell\b|\butl_http\b|\butl_file\b"),
    ("blind_extraction",            # ASCII(SUBSTRING((SELECT ...  — ดึงข้อมูลทีละตัวอักษร
     r"\b(?:ascii|ord|substr(?:ing)?|mid)\s*\(\s*\(?\s*select\b"),
    ("subquery_probe",              # AND 1 IN (SELECT 1)   AND EXISTS(SELECT ...)   PROCEDURE ANALYSE()
     r"\b(?:and|or)\s+\(?\s*(?:\d+\s+(?:not\s+)?in\s*\(\s*select\b|(?:not\s+)?exists\s*\(\s*select\b)|"
     r"\bprocedure\s+analyse\s*\("),
    ("subquery_after_quote",        # ' AND (SELECT ... FROM ...)
     r"""['"`)]\s*(?:and|or|;)\s*\(?\s*select\b.+?\bfrom\b"""),
]
_COMPILED = [(name, re.compile(pattern, _FLAGS)) for name, pattern in _RULES]

_INLINE_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_WS = re.compile(r"\s+")


@dataclass(frozen=True)
class RuleHit:
    rule: str


def _normalize(text: str) -> str:
    """lower + ถอด inline comment (`un/**/ion`, `/*!50000union*/`) + ยุบช่องว่าง — กันการเลี่ยงแบบพื้นฐาน"""
    t = text.lower()
    t = re.sub(r"/\*!\d*", " ", t)          # MySQL versioned comment: เปิดแล้วเนื้อในยังรัน
    t = _INLINE_COMMENT.sub(" ", t)
    t = t.replace("*/", " ")                # ตัวปิดของ versioned comment ที่ถอดตัวเปิดไปแล้ว
    return _WS.sub(" ", t)


def match_rules(text: str) -> RuleHit | None:
    """ตรวจข้อความ 1 ค่า (ควร decode URL มาแล้ว) คืนกฎแรกที่ตรง หรือ None"""
    forms = {text.lower(), _normalize(text), _normalize(unquote_plus(text))}
    for name, rx in _COMPILED:
        if any(rx.search(f) for f in forms):
            return RuleHit(name)
    return None


# ── ด่านโครงสร้าง SQL: ข้อความต้องมีทั้ง "คำสั่ง/ฟังก์ชัน SQL" และ "ไวยากรณ์ฉีด" ก่อนที่โมเดลจะมีสิทธิ์แจ้งเตือน ──
# (เหตุผลและตัวเลข: backend/sqli_detect.py, CONTEXT.md Known Limitations #0)
_SQL_WORD = re.compile(
    r"\b(?:select|union|insert|update|delete|drop|exec(?:ute)?|sleep|benchmark|waitfor|concat|chr|char|"
    r"substr(?:ing)?|cast|convert|declare|having|where|dbms_\w+|information_schema|rlike|regexp)\b", re.I)
_SQL_SYNTAX = re.compile(r"""['"`;)]|--|#|/\*|\b\d{3,}\s*=\s*\d{3,}|\bor\b|\band\b""", re.I)


def looks_like_sql(candidate: str) -> bool:
    return bool(_SQL_WORD.search(candidate) and _SQL_SYNTAX.search(candidate))
