"""
SQLi pipeline tests — สกัดข้อมูล (sqli_extract) + กฎ signature (sqli_rules) + ตัวตัดสิน (sqli_detect)

รัน:  python -m unittest discover -s tests -v          (ไม่ต้องติดตั้งอะไรเพิ่ม, ไม่ใช้ TensorFlow ยกเว้นคลาสสุดท้าย)

ชุดข้อมูลในไฟล์นี้ "เขียนเอง" (รูปแบบ request ที่พบทั่วไป) ไม่ใช่ traffic จริงจาก LAN — ใช้กันถอยหลัง (regression)
และวัดขอบเขตความสามารถ ไม่ใช่รับรองความแม่นยำบนเครือข่ายจริง
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.sqli_detect import analyze_request, analyze_with_scorer  # noqa: E402
from backend.sqli_extract import MAX_CANDIDATES, WINDOW, request_candidates  # noqa: E402
from backend.sqli_rules import match_rules  # noqa: E402

# (target, body, content_type, cookie)
BENIGN = [
    ("/", "", "", ""),
    ("/search?q=red+running+shoes", "", "", ""),
    ("/item?id=42&page=3&sort=price", "", "", ""),
    ("/search?q=o%27reilly+books", "", "", ""),                                   # apostrophe ในชื่อ
    ("/search?q=SELECT+*+FROM+table+syntax", "", "", ""),                        # เอกสาร SQL
    ("/post?title=how+to+select+the+union+of+two+sets", "", "", ""),
    ("/post?title=Drop+table+manners+and+update+set+of+rules", "", "", ""),
    ("/search?q=rock+%27n%27+roll+%23winning", "", "", ""),
    ("/notes", "text=Call me (after lunch) -- thanks! Cats and dogs: 1 or 2.", "", ""),
    ("/login", "username=somchai&password=Passw0rd%21", "application/x-www-form-urlencoded", ""),
    ("/api/cart", '{"item_id": 42, "qty": 2, "note": "gift wrap please"}', "application/json", ""),
    ("/signup", "email=test.user%40example.com&name=Test+User", "application/x-www-form-urlencoded", ""),
    ("/orders?from=2026-10-01&to=2026-10-09", "", "", ""),
    ("/search?q=%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%97%E0%B9%89%E0%B8%B2", "", "", ""),  # ไทย
    ("/home", "", "", "session=" + "a1b2c3d4" * 12 + "; theme=dark; lang=th"),
    ("/static/app.4f3a.js", "", "", ""),
    ("/api/v1/users/42/profile", "", "", ""),
    ("/cb?state=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl", "", "", ""),  # JWT
    # ── รอบ hold-out: ก่อนปรับกฎ เตือนผิด 3/16 (ข้อความ "(from 1940) -- review", "2+2=4 and 3=3", โพสต์ถาม SQL)
    #    กฎถูกแก้แล้วเพิ่มเข้าชุดนี้ — ชุดนี้จึงไม่ใช่การวัดอิสระอีกต่อไป
    ("/forum/post", "body=I tried SELECT * FROM users WHERE id = 5 but it says syntax error (MySQL 8) -- any idea?",
     "application/x-www-form-urlencoded", ""),
    ("/q?text=it%27s+a+nice+day+and+I%27m+happy", "", "", ""),
    ("/q?expr=2%2B2%3D4+and+3%3D3", "", "", ""),
    ("/q?title=Tom+%26+Jerry%3A+the+movie+%28from+1940%29+--+review", "", "", ""),
    ("/q?lang=en-US,en;q=0.9", "", "", ""),
    ("/q?math=if+x%3D1+or+y%3D2+then+z", "", "", ""),
    ("/q?note=Please+drop+by%3B+update+me+on+the+table+plan", "", "", ""),
    ("/q?sql=union+station+select+committee", "", "", ""),
    ("/q?name=Robert%27%29+Smith", "", "", ""),
    ("/q?time=12:30:45&tz=UTC%2B7", "", "", ""),
    ("/q?s=sort+order+by+5+items", "", "", ""),
    ("/q?s=show+me+cats+or+dogs+and+5+or+6", "", "", ""),
    ("/q?s=what%27s+1+in+a+list+of+5", "", "", ""),
    ("/q?s=exists+in+nature", "", "", ""),
    ("/q?s=%27quoted%27+and+%27text%27", "", "", ""),
]

# (target, body, content_type, cookie, ชื่อกฎที่ควรตรง)
ATTACKS = [
    ("/item?id=1' OR '1'='1", "", "", "", "quote_boolean_tautology"),
    ("/login?user=admin'--&pw=x", "", "", "", "quote_comment_terminator"),
    ("/item?id=1 UNION SELECT username,password FROM users--", "", "", "", "union_select"),
    ("/item?id=-1 UNION ALL SELECT NULL,NULL,NULL--", "", "", "", "union_select"),
    ("/item?id=1; DROP TABLE users;--", "", "", "", "stacked_destructive"),
    ("/item?id=1; SELECT SLEEP(5)--", "", "", "", None),                          # time_delay หรือ terminator ก็ได้
    ("/item?id=1 AND 1=1", "", "", "", "numeric_tautology"),
    ("/item?id=1 AND extractvalue(1,concat(0x7e,(select version())))", "", "", "", "error_based_function"),
    ("/item?id=1%27%20OR%20%271%27%3D%271", "", "", "", "quote_boolean_tautology"),
    ("/item?id=1%2527%2520OR%25201%253D1--", "", "", "", None),                  # double-encoded (ชนิดกฎใดก็ได้)
    ("/login", "username=admin' OR 1=1 --&password=x", "application/x-www-form-urlencoded", "", None),
    ("/api/login", '{"user": "admin\' --", "pw": "x"}', "application/json", "", "quote_comment_terminator"),
    ("/item?id=1 UNION SELECT table_name FROM information_schema.tables", "", "", "", None),
    ("/p?id=1 UNION SELECT 0x61646d696e,2,3", "", "", "", "union_select"),
    ("/p?id=1 UNION/**/SELECT 1,2", "", "", "", "union_select"),
    ("/p?id=1 /*!50000UNION*/ /*!50000SELECT*/ 1,2", "", "", "", "union_select"),
    ("/item/1' OR 1=1--", "", "", "", None),                                       # injection ใน path
    ("/home", "", "", "id=1' OR '1'='1; theme=dark", "quote_boolean_tautology"),   # injection ใน cookie
    ("/p?id=1 AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64", "", "", "", "blind_extraction"),
    ("/p?id=1; EXEC xp_cmdshell('dir')", "", "", "", None),
    ("/p?id=1; WAITFOR DELAY '0:0:5'--", "", "", "", None),
    ("/upload", "--B\r\nContent-Disposition: form-data; name=\"f\"\r\n\r\n1' OR '1'='1\r\n--B--",
     "multipart/form-data; boundary=B", "", "quote_boolean_tautology"),
    # ── รอบ hold-out: ก่อนปรับกฎ พลาด 9/23 (ORDER BY probe, ') OR ('1'='1, ' OR ''=', AND 'a'='a, EXISTS/IN subquery ฯลฯ)
    ("/p?id=1' AND '1'='1", "", "", "", None),
    ("/p?id=1' AND 1=0 UNION SELECT 1,2,3-- -", "", "", "", None),
    ("/p?id=1' ORDER BY 5--+", "", "", "", "order_by_probe"),
    ("/p?id=-1' UNION SELECT user(),database()#", "", "", "", None),
    ("/p?id=1 OR 1=1", "", "", "", "numeric_tautology"),
    ("/p?id=') OR ('1'='1", "", "", "", "quote_boolean_tautology"),
    ("/p?id=1' OR SLEEP(5)#", "", "", "", None),
    ("/p?name=admin'/*", "", "", "", "quote_comment_terminator"),
    ("/p?id=1;+INSERT+INTO+users+VALUES('a','b')--", "", "", "", None),
    ("/p?id=1' || '1'='1", "", "", "", None),
    ("/p?user=' OR ''='", "", "", "", "quote_boolean_tautology"),
    ("/p?id=1 AND 'a'='a", "", "", "", "quoted_tautology"),
    ("/p?id=2' --", "", "", "", "quote_comment_terminator"),
    ("/p?id=0x31 OR 1=1", "", "", "", "numeric_tautology"),
    ("/p?id=1 PROCEDURE ANALYSE()", "", "", "", "subquery_probe"),
    ("/p?id=1'; SHUTDOWN--", "", "", "", None),
    ("/p?q=1' UnIoN SeLeCt NULL--", "", "", "", None),
    ("/p?id=1 AND 1 IN (SELECT 1)", "", "", "", "subquery_probe"),
    ("/p?id=1' AND EXISTS(SELECT * FROM users)--", "", "", "", None),
    ("/p?id=1' ORDER BY 1--", "", "", "", None),
]

# ช่องว่างที่รู้และยอมรับ (ไม่ assert — บันทึกไว้ไม่ให้ใครเข้าใจว่ากฎครอบคลุมทุกอย่าง):
#   - ฟังก์ชันเดี่ยว ๆ ไม่มีบริบท SQL เช่น `CONCAT(CHAR(65),CHAR(66))`
#   - payload ที่สะกดแยก/ประกอบด้วย char() ต่อกันยาว ๆ, encoding แบบ unicode/overlong
#   - NoSQL injection, command injection (ไม่ใช่งานของ Injection Model)
KNOWN_RULE_GAPS = ["/p?id=CONCAT(CHAR(65),CHAR(66))"]


def _rule_hit(target, body="", ct="", cookie=""):
    for c in request_candidates(target, body, ct, cookie):
        hit = match_rules(c)
        if hit:
            return hit.rule
    return None


class ExtractTests(unittest.TestCase):
    def test_host_and_scheme_never_reach_the_model(self):
        cands = request_candidates("http://shop.lan/item?id=1' OR '1'='1")
        self.assertTrue(cands)
        self.assertFalse(any("shop.lan" in c or "http://" in c for c in cands))

    def test_payload_is_isolated_as_its_own_candidate(self):
        self.assertIn("1' OR '1'='1", request_candidates("/item?id=1' OR '1'='1&page=2"))

    def test_url_and_double_encoding_are_decoded(self):
        self.assertIn("1' OR 1=1--", request_candidates("/i?id=1%2527%2520OR%25201%253D1--"))

    def test_plain_alphanumeric_tokens_are_skipped(self):
        self.assertEqual(request_candidates("/home", cookie="session=" + "a1b2c3d4" * 12), [])

    def test_json_keys_and_string_values_but_not_numbers(self):
        cands = request_candidates("/api", '{"q": "x\' OR 1=1", "n": 5}', "application/json")
        self.assertIn("x' OR 1=1", cands)

    def test_long_value_is_windowed_so_leading_payload_cannot_be_pushed_out(self):
        payload = "1' OR '1'='1"
        value = payload + " -- " + "x " * 400                                   # payload อยู่หัว ขยะอยู่ท้าย
        cands = request_candidates("/i?id=" + value.replace(" ", "+").replace("'", "%27"))
        self.assertTrue(any(c.startswith(payload) and len(c) <= WINDOW for c in cands))

    def test_limits_hold_on_hostile_input(self):
        many = "&".join(f"p{i}=a'b{i}" for i in range(500))
        self.assertLessEqual(len(request_candidates("/x?" + many)), MAX_CANDIDATES)
        self.assertLessEqual(len(request_candidates("/x", "' " * 200000, "text/plain")), MAX_CANDIDATES)

    def test_garbage_input_never_raises(self):
        for args in [("",), ("/x?%zz=%",), ("/x", "{not json", "application/json"),
                     ("/x", "\x00\xff" * 50, "multipart/form-data"), ("::::",)]:
            request_candidates(*args)


class RuleTests(unittest.TestCase):
    def test_every_benign_request_is_clean(self):
        for target, body, ct, cookie in BENIGN:
            with self.subTest(target=target, body=body[:40]):
                self.assertIsNone(_rule_hit(target, body, ct, cookie))

    def test_every_attack_is_caught_by_rules(self):
        for target, body, ct, cookie, rule in ATTACKS:
            with self.subTest(target=target, body=body[:40]):
                hit = _rule_hit(target, body, ct, cookie)
                self.assertIsNotNone(hit, "rules missed this attack")
                if rule:
                    self.assertEqual(hit, rule)

    def test_rules_are_syntax_based_not_keyword_based(self):
        for text in ["select", "union", "drop table", "please select an option", "sleep(5 minutes)",
                     "union of two sets", "update set", "information about schema"]:
            with self.subTest(text=text):
                self.assertIsNone(match_rules(text))


class _StubModel:
    """คืนคะแนนคงที่ต่อทุก candidate — ทดสอบตรรกะตัดสินโดยไม่ต้องโหลด TensorFlow"""

    def __init__(self, score):
        self.score = score

    def predict(self, batch, verbose=0):
        import numpy as np
        return np.full((len(batch), 1), self.score, dtype="float32")


WORD_INDEX = {chr(i): i - 30 for i in range(32, 127)}


class DetectTests(unittest.TestCase):
    def _run(self, model, target, body="", ct="", cookie="", th=0.75):
        return analyze_request(target, body, ct, cookie, model, WORD_INDEX, th)

    def test_rules_win_over_the_model_and_cost_no_inference(self):
        class Boom:
            def predict(self, *a, **k):
                raise AssertionError("model must not run when a rule already matched")
        v = self._run(Boom(), "/i?id=1' OR '1'='1")
        self.assertEqual((v.kind, v.confidence), ("rules", 1.0))

    def test_model_can_alert_on_sql_shaped_text_the_rules_do_not_know(self):
        v = self._run(_StubModel(0.995), "/i?q=select name from t where x like 'a", th=0.99)
        self.assertEqual((v.kind, round(v.confidence, 3)), ("model", 0.995))

    def test_model_confidence_alone_is_not_enough(self):
        # คะแนนโมเดลบนวรรคตอนสูงถึง 99.8% กับข้อความปกติ → ต้องมีโครงสร้าง SQL ด้วย
        self.assertIsNone(self._run(_StubModel(0.999), "/q?title=Tom+%26+Jerry+(from+1940)+--+review", th=0.99))
        self.assertIsNone(self._run(_StubModel(0.999), "/q?note=Call+me+(after+lunch):+1+or+2", th=0.99))

    def test_model_below_threshold_is_ignored(self):
        self.assertIsNone(self._run(_StubModel(0.5), "/i?q=select name from t where x like 'a", th=0.99))

    def test_rules_back_up_a_silent_model(self):
        v = self._run(_StubModel(0.01), "/i?id=1 UNION SELECT a,b FROM t")
        self.assertEqual((v.kind, v.confidence, v.rule), ("rules", 1.0, "union_select"))

    def test_scorer_failure_falls_back_to_rules_and_never_raises(self):
        def broken(texts):
            raise ConnectionError("backend down")
        # กฎยังจับได้แม้ backend ล่ม; ข้อความที่ต้องพึ่งโมเดลถูกข้าม (ไม่ throw ใส่ proxy)
        self.assertEqual(analyze_with_scorer("/i?id=1 UNION SELECT a FROM t", "", "", "", broken, 0.99).kind, "rules")
        self.assertIsNone(analyze_with_scorer("/i?q=select name from t where x like 'a", "", "", "", broken, 0.99))

    def test_scorer_receives_only_sql_shaped_candidates(self):
        seen = []
        analyze_with_scorer("/i?q=select name from t where x like 'a&page=2&t=hello+world", "", "", "",
                            lambda texts: seen.extend(texts) or [0.0] * len(texts), 0.99)
        self.assertTrue(seen and all("select" in t.lower() for t in seen))

    def test_works_without_a_model(self):
        self.assertEqual(self._run(None, "/i?id=1' OR '1'='1").kind, "rules")

    def test_benign_request_is_quiet(self):
        for target, body, ct, cookie in BENIGN:
            with self.subTest(target=target):
                self.assertIsNone(self._run(_StubModel(0.01), target, body, ct, cookie))

    def test_request_with_nothing_to_check_skips_the_model(self):
        class Boom:
            def predict(self, *a, **k):
                raise AssertionError("model must not run")
        self.assertIsNone(self._run(Boom(), "/static/app.js"))


@unittest.skipUnless(os.environ.get("RUN_MODEL_TESTS") == "1",
                     "ตั้ง RUN_MODEL_TESTS=1 เพื่อรันกับโมเดลจริง (ต้องมี TensorFlow, ช้า)")
class RealModelTests(unittest.TestCase):
    """วัดทั้ง pipeline กับโมเดลจริง — ตัวเลขขั้นต่ำเป็นค่าที่วัดได้ ไม่ใช่เป้าหมายที่ต้องการ"""

    @classmethod
    def setUpClass(cls):
        import json
        import tensorflow as tf
        models = os.path.join(os.path.dirname(__file__), "..", "backend", "models")
        cls.model = tf.keras.models.load_model(os.path.join(models, "best_sqli_v2.keras"))
        with open(os.path.join(models, "sqli_tokenizer.json"), encoding="utf-8") as f:
            cls.word_index = json.load(f)

    def _detected(self, args):
        return analyze_request(*args[:4], self.model, self.word_index, 0.99) is not None

    def test_recall_and_false_alarms(self):
        caught = sum(self._detected(a[:4]) for a in ATTACKS)
        false_alarms = [b[0] for b in BENIGN if self._detected(b)]
        print(f"\n  real model + rules: caught {caught}/{len(ATTACKS)} attacks, false alarms: {false_alarms}")
        self.assertGreaterEqual(caught, len(ATTACKS) - 1)
        self.assertLessEqual(len(false_alarms), 2)


if __name__ == "__main__":
    unittest.main()
