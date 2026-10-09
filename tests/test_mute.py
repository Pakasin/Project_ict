"""
Mute rules — จับคู่กฎ, หมดอายุ, ข้อจำกัดความปลอดภัยของ API, และเส้นทาง event จริง (internal.receive_event)

รัน:  python -m unittest discover -s tests -v     (ใช้ SQLite ชั่วคราว ไม่แตะ cybershield.db)
"""

import asyncio
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("INTERNAL_TOKEN", "test-token")

import backend.db as db  # noqa: E402


def run(coro):
    return asyncio.run(coro)


class MuteBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._old = db.DB_PATH
        db.DB_PATH = os.path.join(self._tmp.name, "t.db")
        db.init_db()
        self.now = datetime.now()

    def tearDown(self):
        db.DB_PATH = self._old
        self._tmp.cleanup()

    def rule(self, ip=None, cls=None, days=7, created=None):
        n = created or self.now
        return db.add_mute_rule(ip, cls, "test", "admin", n.isoformat(), (n + timedelta(days=days)).isoformat())

    def match(self, ip, cls, at=None):
        return db.find_active_mute(ip, cls, (at or self.now).isoformat())


class MatchingTests(MuteBase):
    def test_ip_and_class_must_both_match_when_both_given(self):
        r = self.rule("10.0.0.5", "DoS")
        self.assertEqual(self.match("10.0.0.5", "DoS"), r)
        self.assertIsNone(self.match("10.0.0.5", "DDoS"))
        self.assertIsNone(self.match("10.0.0.6", "DoS"))

    def test_ip_only_rule_covers_every_class_of_that_host(self):
        r = self.rule(ip="10.0.0.5")
        self.assertEqual(self.match("10.0.0.5", "DoS"), r)
        self.assertEqual(self.match("10.0.0.5", "SQL Injection"), r)
        self.assertIsNone(self.match("10.0.0.50", "DoS"))      # exact — ไม่ใช่ substring

    def test_class_only_rule_covers_every_host(self):
        r = self.rule(cls="BruteForce")
        self.assertEqual(self.match("1.2.3.4", "BruteForce"), r)
        self.assertIsNone(self.match("1.2.3.4", "DoS"))

    def test_expired_rule_never_matches_and_is_not_listed(self):
        self.rule("10.0.0.5", days=1)
        later = self.now + timedelta(days=2)
        self.assertIsNone(self.match("10.0.0.5", "DoS", at=later))
        self.assertEqual(db.list_mute_rules(later.isoformat()), [])
        self.assertEqual(len(db.list_mute_rules(later.isoformat(), include_expired=True)), 1)

    def test_deleted_rule_stops_matching(self):
        r = self.rule("10.0.0.5")
        self.assertTrue(db.delete_mute_rule(r))
        self.assertIsNone(self.match("10.0.0.5", "DoS"))
        self.assertFalse(db.delete_mute_rule(r))

    def test_sql_metacharacters_in_values_are_inert(self):
        self.rule("10.0.0.5")
        self.assertIsNone(self.match("10.0.0.5' OR '1'='1", "x'); DROP TABLE mute_rules;--"))
        self.assertEqual(len(db.list_mute_rules(self.now.isoformat())), 1)


class ApiLimitTests(MuteBase):
    def create(self, **kw):
        from fastapi import HTTPException
        from backend.routes.mute import MuteRuleRequest, create_mute_rule
        base = dict(source_ip="10.0.0.5", attack_class=None, reason="known scanner", days=7)
        base.update(kw)
        try:
            return run(create_mute_rule(MuteRuleRequest(**base), "admin"))
        except HTTPException as e:
            return e

    def assertRejected(self, result, status=400):
        from fastapi import HTTPException
        self.assertIsInstance(result, HTTPException)
        self.assertEqual(result.status_code, status)

    def test_valid_rule_is_created_and_audited(self):
        r = self.create()
        self.assertTrue(r["ok"])
        self.assertTrue(any("mute" in a["action"] for a in db.get_audit_logs(10)))

    def test_cannot_mute_everything(self):
        self.assertRejected(self.create(source_ip=None, attack_class=None))
        self.assertRejected(self.create(source_ip="  ", attack_class=""))

    def test_there_are_no_permanent_rules(self):
        self.assertRejected(self.create(days=0))
        self.assertRejected(self.create(days=-1))
        self.assertRejected(self.create(days=31))
        self.assertRejected(self.create(days=36500))

    def test_class_only_rules_are_capped_at_7_days(self):
        self.assertRejected(self.create(source_ip=None, attack_class="DoS", days=8))
        self.assertTrue(self.create(source_ip=None, attack_class="DoS", days=7)["ok"])

    def test_ip_must_be_a_single_address(self):
        for bad in ("10.0.0.0/24", "10.0.0.*", "not-an-ip", "10.0.0.5, 10.0.0.6", "999.1.1.1"):
            with self.subTest(ip=bad):
                self.assertRejected(self.create(source_ip=bad))
        self.assertTrue(self.create(source_ip="2001:db8::1")["ok"])

    def test_reason_is_required(self):
        self.assertRejected(self.create(reason=""))
        self.assertRejected(self.create(reason="  x "))

    def test_delete_unknown_rule_is_404_and_audited_when_real(self):
        from fastapi import HTTPException
        from backend.routes.mute import remove_mute_rule
        with self.assertRaises(HTTPException) as cm:
            run(remove_mute_rule(999, "admin"))
        self.assertEqual(cm.exception.status_code, 404)
        rid = self.create()["id"]
        self.assertTrue(run(remove_mute_rule(rid, "admin"))["ok"])
        self.assertTrue(any("ลบกฎ mute" in a["action"] for a in db.get_audit_logs(10)))


class EventPathTests(MuteBase):
    """internal.receive_event: ผล mute ต้องถึง DB, live feed และ webhook จริง ๆ"""

    def send(self, ip="10.0.0.5", cls="DoS", conf=0.99):
        from backend.routes import internal
        ev = internal.PredictionEvent(model_name="flow", attack_class=cls, confidence=conf,
                                      source_ip=ip, timestamp=datetime.now().isoformat())
        with mock.patch.object(internal, "broadcast", new=mock.AsyncMock()) as bc, \
             mock.patch.object(internal, "notify_alert", new=mock.AsyncMock()) as nt:
            res = run(internal.receive_event(ev, x_internal_token=os.environ["INTERNAL_TOKEN"]))
        events, _ = db.get_prediction_events(limit=50)
        row = next(e for e in events if e["id"] == res.event_id)
        return row, bc, nt

    def test_unmuted_alert_is_stored_broadcast_and_notified(self):
        row, bc, nt = self.send()
        self.assertEqual((row["is_alert"], row["muted_by"]), (1, None))
        bc.assert_awaited_once()
        nt.assert_awaited_once()

    def test_muted_event_is_kept_but_is_not_an_alert_nor_broadcast_nor_notified(self):
        rid = self.rule("10.0.0.5", "DoS")
        row, bc, nt = self.send()
        self.assertEqual((row["is_alert"], row["muted_by"]), (0, rid))
        self.assertEqual(row["attack_class"], "DoS")            # ข้อมูลเดิมยังอยู่ครบ ตรวจย้อนหลังได้
        bc.assert_not_awaited()
        nt.assert_not_awaited()

    def test_other_hosts_and_classes_are_not_muted(self):
        self.rule("10.0.0.5", "DoS")
        self.assertEqual(self.send(ip="10.0.0.6")[0]["is_alert"], 1)
        self.assertEqual(self.send(cls="DDoS")[0]["is_alert"], 1)

    def test_expired_rule_no_longer_mutes(self):
        self.rule("10.0.0.5", days=1, created=self.now - timedelta(days=3))
        self.assertEqual(self.send()[0]["is_alert"], 1)

    def test_below_threshold_event_is_not_marked_muted(self):
        self.rule("10.0.0.5")
        row, _, _ = self.send(conf=0.10)
        self.assertEqual((row["is_alert"], row["muted_by"]), (0, None))

    def test_stats_count_muted_separately_not_as_alert_or_normal(self):
        self.rule("10.0.0.5", "DoS")
        self.send(); self.send(ip="10.0.0.6")
        t = db.get_event_stats()["totals"]
        self.assertEqual((t["alerts"], t["muted"], t["events"], t["normal"]), (1, 1, 1, 0))


if __name__ == "__main__":
    unittest.main()
