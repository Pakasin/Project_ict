"""Event grouping — ยุบ event ที่ซ้ำเป็นการโจมตีหนึ่งครั้ง (db.get_event_groups, GET /api/logs/groups)"""

import asyncio
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import backend.db as db  # noqa: E402

T0 = datetime(2026, 10, 6, 13, 0, 0)


class GroupBase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._old = db.DB_PATH
        db.DB_PATH = os.path.join(self._tmp.name, "t.db")
        db.init_db()

    def tearDown(self):
        db.DB_PATH = self._old
        self._tmp.cleanup()

    def add(self, minutes, ip="10.0.0.1", cls="DoS", model="flow", conf=0.99, alert=True, muted_by=None, ts=None, sensor="s1"):
        stamp = ts or (T0 + timedelta(minutes=minutes)).isoformat()
        return asyncio.run(db.save_prediction_event(model, cls, conf, ip, stamp, alert, sensor=sensor, muted_by=muted_by))

    def groups(self, **kw):
        return db.get_event_groups(**kw)


class SessionizationTests(GroupBase):
    def test_events_within_the_gap_form_one_group(self):
        for m in (0, 3, 6, 9):
            self.add(m)
        g, total, trunc = self.groups(gap_minutes=15)
        self.assertEqual((total, trunc, g[0]["count"], g[0]["duration_s"]), (1, False, 4, 9 * 60))

    def test_a_pause_longer_than_the_gap_starts_a_new_group(self):
        for m in (0, 5, 10):
            self.add(m)
        for m in (200, 205):            # สามชั่วโมงต่อมา = การโจมตีครั้งใหม่
            self.add(m)
        g, total, _ = self.groups(gap_minutes=15)
        self.assertEqual((total, [x["count"] for x in g]), (2, [2, 3]))      # ใหม่สุดก่อน

    def test_gap_boundary_is_inclusive(self):
        self.add(0); self.add(15)
        self.assertEqual(self.groups(gap_minutes=15)[1], 1)
        self.assertEqual(self.groups(gap_minutes=14.9)[1], 2)

    def test_different_ip_class_or_model_never_merge(self):
        self.add(0); self.add(1, ip="10.0.0.2"); self.add(2, cls="DDoS"); self.add(3, model="flow_rules")
        self.assertEqual(self.groups()[1], 4)

    def test_group_reports_counts_ids_confidence_and_sensors(self):
        a = self.add(0, conf=0.81, sensor="a")
        self.add(1, conf=0.99, sensor="b", alert=False)
        c = self.add(2, conf=0.90, sensor="a", muted_by=7, alert=False)
        g = self.groups()[0][0]
        self.assertEqual((g["first_id"], g["last_id"], g["count"], g["alerts"], g["muted"]), (a, c, 3, 1, 1))
        self.assertEqual((g["max_confidence"], g["sensors"]), (0.99, ["a", "b"]))

    def test_muted_attacks_stay_visible_in_their_group(self):
        self.add(0, muted_by=1, alert=False); self.add(1, muted_by=1, alert=False)
        g = self.groups()[0][0]
        self.assertEqual((g["count"], g["alerts"], g["muted"]), (2, 0, 2))


class RobustnessTests(GroupBase):
    def test_mixed_timestamp_formats_group_together(self):
        self.add(0, ts="2026-10-06T13:00:00Z")
        self.add(0, ts="2026-10-06T13:03:00+00:00")
        self.add(0, ts="2026-10-06T13:06:00")
        g, total, _ = self.groups()
        self.assertEqual((total, g[0]["count"]), (1, 3))

    def test_timezone_offsets_are_normalised(self):
        self.add(0, ts="2026-10-06T13:00:00+00:00")
        self.add(0, ts="2026-10-06T20:05:00+07:00")      # = 13:05 UTC
        self.assertEqual(self.groups()[1], 1)

    def test_unreadable_timestamps_are_never_merged_or_dropped(self):
        self.add(0, ts="garbage"); self.add(0, ts="also garbage"); self.add(0)
        g, total, _ = self.groups()
        self.assertEqual((total, sum(x["count"] for x in g)), (3, 3))

    def test_empty_database(self):
        self.assertEqual(self.groups(), ([], 0, False))

    def test_truncation_is_reported_not_hidden(self):
        old = db.MAX_GROUP_ROWS
        db.MAX_GROUP_ROWS = 3
        try:
            for m in range(5):
                self.add(m)
            g, _, trunc = self.groups()
        finally:
            db.MAX_GROUP_ROWS = old
        self.assertTrue(trunc)
        self.assertEqual(g[0]["count"], 3)                # เก็บเฉพาะที่ใหม่ที่สุด


class FilterAndPagingTests(GroupBase):
    def test_same_filters_as_the_event_list(self):
        self.add(0, ip="10.0.0.1"); self.add(1, ip="10.0.0.2"); self.add(2, ip="10.0.0.3", cls="DDoS")
        self.assertEqual(self.groups(source_ip="10.0.0.1")[1], 1)
        self.assertEqual(self.groups(attack_class="DDoS")[1], 1)
        self.assertEqual(self.groups(exclude={"source_ip": ["10.0.0.1"], "attack_class": ["DDoS"]})[1], 1)
        self.assertEqual(self.groups(alerts_only=True)[1], 3)

    def test_paging_returns_total_groups_not_events(self):
        for i in range(5):
            for m in range(3):
                self.add(m, ip=f"10.0.0.{i}")
        page, total, _ = self.groups(limit=2, offset=2)
        self.assertEqual((total, len(page)), (5, 2))
        self.assertTrue(all(g["count"] == 3 for g in page))

    def test_group_count_matches_event_count_overall(self):
        for m in (0, 1, 100, 101, 102):
            self.add(m)
        g, _, _ = self.groups()
        self.assertEqual(sum(x["count"] for x in g), db.get_prediction_events(limit=500)[1])


if __name__ == "__main__":
    unittest.main()
