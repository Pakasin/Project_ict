"""
CyberShield — SQLi input extraction (HTTP request → ข้อความที่ส่งเข้า Injection Model)

ทำไมต้องมีโมดูลนี้: Injection Model เทรนด้วย "ค่า payload ล้วน ๆ" (เช่น `1' OR '1'='1`) ไม่ใช่ URL เต็ม
เดิม http_sensor ส่ง `flow.request.url + body` ทั้งก้อน → ข้อความขึ้นต้นด้วย `http://host/path?id=` ทำให้คะแนนตก
(payload เดียวกัน 99.3% → 3.4%; ทดสอบ 12 โจมตีจับได้ 1) โมดูลนี้แตก request เป็น "ค่าที่ผู้โจมตีควบคุมได้" ทีละค่า
แล้วให้โมเดล/กฎตรวจแต่ละค่าแยกกัน

สิ่งที่สกัด: ชื่อ+ค่า query parameter, ส่วนของ path, ค่าใน body (form / JSON / multipart / ข้อความดิบ), ค่า Cookie
และสตริง query/body ทั้งก้อนที่ decode แล้ว (กัน payload ที่แยกข้ามหลาย parameter)

กันการเลี่ยง: decode ซ้ำ 2 ชั้น (%2527), ค่ายาวกว่า 221 ตัวอักษรถูกตัดเป็นหน้าต่างเลื่อน (โมเดลเก็บแค่ท้าย 221 ตัว
ผู้โจมตีเลยเติมขยะนำหน้าเพื่อดัน payload ออกจากหน้าต่างได้) และจำกัดจำนวน/ขนาด candidate เพื่อไม่ให้ proxy ช้า

ไม่พึ่ง TensorFlow/mitmproxy — เทสต์ได้ตรง ๆ (tests/test_sqli.py)
"""

import json
import re
from collections.abc import Iterator
from urllib.parse import parse_qsl, unquote, unquote_plus, urlsplit

WINDOW = 221             # = SQLI_MAX_LEN ใน inference.py (ความยาวที่โมเดลมองเห็น)
STRIDE = 110             # หน้าต่างเลื่อนซ้อนกึ่งหนึ่ง ไม่ให้ payload ถูกตัดขาดกลางทาง
MAX_CANDIDATES = 48      # ต่อ 1 request
MAX_TOTAL_CHARS = 32768  # ตัวอักษรรวมที่ยอมส่งเข้าโมเดลต่อ 1 request
MAX_BODY_BYTES = 65536   # อ่าน body ไม่เกินนี้ (sensor ตัดก่อนเรียกมาที่นี่)
MAX_JSON_DEPTH = 8
MAX_FIELDS = 200

# SQL injection ต้องมีอักขระ "ไวยากรณ์" อย่างน้อยหนึ่งตัว (quote, ;, comment, วงเล็บ, เครื่องหมายเปรียบเทียบ
# หรือช่องว่างคั่นคำสั่ง) — token ล้วนตัวอักษร/ตัวเลข (เช่น session id, hash, ชื่อไฟล์) ฉีดอะไรไม่ได้
# จึงข้ามได้โดยไม่เสีย recall (ทดสอบ: ตัด false alarm ของ cookie ยาวที่เคยได้ 92.7%)
_SYNTAX = re.compile(r"""['"`;#()=<>*/\\|&\s]|--|%27|%22""")

_MULTIPART_PART = re.compile(r"\r?\n\r?\n(.*?)\r?\n--", re.DOTALL)


def _decode_forms(s: str) -> list[str]:
    """ค่าที่ decode แล้ว 1 ชั้น และ 2 ชั้น (กัน double-encoding เช่น %2527 → %27 → ')"""
    once = unquote_plus(s)
    twice = unquote_plus(once)
    forms = [s]
    for f in (once, twice):
        if f not in forms:
            forms.append(f)
    return forms


def _windows(s: str) -> Iterator[str]:
    if len(s) <= WINDOW:
        yield s
        return
    pos = 0
    while True:
        yield s[pos:pos + WINDOW]
        if pos + WINDOW >= len(s):
            return
        pos += STRIDE


def _json_strings(obj, depth: int = 0) -> Iterator[str]:
    if depth > MAX_JSON_DEPTH:
        return
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield str(k)
            yield from _json_strings(v, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            yield from _json_strings(v, depth + 1)
    # ตัวเลข/bool/null ฉีด SQL ไม่ได้ → ข้าม


def _body_values(body: str, content_type: str) -> tuple[list[str], str]:
    """(ค่าแต่ละตัวใน body, body ทั้งก้อนที่ decode แล้ว)"""
    if not body:
        return [], ""
    ct = (content_type or "").lower()
    stripped = body.lstrip()

    if "json" in ct or stripped[:1] in ("{", "["):
        try:
            return list(_json_strings(json.loads(body))), body
        except ValueError:
            pass  # ประกาศว่า JSON แต่ parse ไม่ได้ → ตกไปตรวจเป็นข้อความดิบ

    if "multipart/" in ct or stripped.startswith("--"):
        return _MULTIPART_PART.findall(body + "\r\n--"), body

    looks_form = "x-www-form-urlencoded" in ct or ("=" in body and "\n" not in body.strip())
    if looks_form:
        try:
            pairs = parse_qsl(body, keep_blank_values=True, max_num_fields=MAX_FIELDS)
        except ValueError:
            pairs = []
        if pairs:
            return [x for k, v in pairs for x in (k, v)], unquote_plus(body)

    return [unquote_plus(body)], unquote_plus(body)


def request_candidates(target: str, body: str = "", content_type: str = "", cookie: str = "") -> list[str]:
    """แตก request เป็นรายการข้อความที่ควรตรวจ (เรียงตามความสำคัญ ไม่ซ้ำ ไม่เกิน limit)

    target: path+query (`/item?id=1`) หรือ URL เต็ม — host/scheme ถูกทิ้ง ไม่ส่งเข้าโมเดล
    """
    raw: list[str] = []
    parts = urlsplit(target)

    try:
        pairs = parse_qsl(parts.query, keep_blank_values=True, max_num_fields=MAX_FIELDS)
    except ValueError:
        pairs = []
    for k, v in pairs:
        raw.extend((v, k))
    if parts.query:
        raw.append(unquote_plus(parts.query))      # ทั้งก้อน: payload ที่แยกข้ามหลาย parameter

    for seg in parts.path.split("/"):
        if seg:
            raw.append(unquote(seg))

    values, whole_body = _body_values(body[:MAX_BODY_BYTES], content_type)
    raw.extend(values)
    if whole_body:
        raw.append(whole_body)

    for chunk in (cookie or "").split(";"):
        _, _, val = chunk.partition("=")
        if val.strip():
            raw.append(val.strip())

    out: list[str] = []
    seen: set[str] = set()
    total = 0
    for item in raw:
        for form in _decode_forms(item):
            for win in _windows(form):
                win = win.strip()
                if len(win) < 2 or win in seen or not _SYNTAX.search(win):
                    continue
                if len(out) >= MAX_CANDIDATES or total + len(win) > MAX_TOTAL_CHARS:
                    return out
                seen.add(win)
                out.append(win)
                total += len(win)
    return out
