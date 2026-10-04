"""
CyberShield — Rate rules (tool-agnostic DoS / DDoS / BruteForce detector)

เสริม Flow Model v2: LSTM จำ "ลายนิ้วมือของเครื่องมือ" ที่เห็นตอนเทรน (HOIC/Hulk recall ≈ 0)
แต่การโจมตีแบบ volumetric ไม่ว่าเครื่องมือไหนก็ทำให้อัตรา flow สูงผิดปกติ — rule นับอัตราจับได้
ไม่ต้องเทรน ไม่มี false alarm จากการจำเครื่องมือ

ไม่ใช่ model: ไม่มี confidence จริง ส่ง event เป็น model_name="flow_rules" confidence=1.0

กฎ (ทุกกฎนับใน sliding window RATE_WINDOW_S วินาที):
  DoS        1 source → 1 dst  ≥ RATE_DOS_FLOWS flows
  DDoS       1 dst ← ≥ RATE_DDOS_SOURCES source ต่างกัน และรวม ≥ RATE_DDOS_FLOWS flows
  BruteForce 1 source → 1 (dst, auth port) ≥ RATE_BF_FLOWS flows (21/22/23/3389/5900)

ข้อจำกัด (ตั้งใจให้ชัด):
  - Slowloris / slow-rate DoS ไม่จับ: flow น้อยแต่ค้างนาน nfstream ปล่อย flow ตอนจบ
  - threshold ตั้งสำหรับ home LAN — ต้องจูนด้วย traffic ปกติจริง (เช่น backup/torrent/โหลดเว็บหนัก
    อาจทะลุ RATE_DOS_FLOWS) ยังไม่ใช่ตัวเลขที่ "ปรับจนแม่น" — เป็นแค่การเดาที่มีหลักฐานจริงรองรับครั้งเดียว
    (ดู CONTEXT.md Known Limitations → "Own-LAN capture", 2026-10-05): ค่าเดิม RATE_DOS_FLOWS=200 แจ้งเตือน
    DoS ผิดจาก `ab -n 200 -c 4` ปกติธรรมดา เลยปรับขึ้นเป็น 500 (ยังไม่มีข้อมูลว่าพอหรือเกิน — แค่ให้ช่องว่าง
    มากกว่าค่าที่พิสูจน์แล้วว่าต่ำไป) ส่วน RATE_DDOS_FLOWS=500 พลาด DDoS จำลอง 20 source/60 flow รวม
    (ต่ำกว่า threshold มาก) เลยลดเป็น 150 — ก็ยังเป็นการเดา ไม่ใช่ค่าที่วัดแล้วว่าถูก ต้องจูนต่อด้วย traffic จริง
  - นับตามเวลาของ flow ที่ nfstream ปล่อย (flow-end) ไม่ใช่เวลาเริ่มโจมตี → แจ้งช้ากว่าจริงได้
"""

import os
from collections import deque
from dataclasses import dataclass

AUTH_PORTS = frozenset({21, 22, 23, 3389, 5900})


def _env_f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


@dataclass(frozen=True)
class RateAlert:
    attack_class: str   # "DoS" | "DDoS" | "BruteForce" — ชื่อ class เดียวกับ Flow Model
    rule: str
    source_ip: str      # DDoS: dst ที่ถูกโจมตี (มีหลาย source)
    detail: str


class RateRuleDetector:
    def __init__(self, window_s=None, dos_flows=None, ddos_sources=None, ddos_flows=None,
                 bf_flows=None, cooldown_s=None, max_keys=100_000):
        self.window_s = _env_f("RATE_WINDOW_S", 10) if window_s is None else window_s
        self.dos_flows = int(_env_f("RATE_DOS_FLOWS", 500) if dos_flows is None else dos_flows)
        self.ddos_sources = int(_env_f("RATE_DDOS_SOURCES", 20) if ddos_sources is None else ddos_sources)
        self.ddos_flows = int(_env_f("RATE_DDOS_FLOWS", 150) if ddos_flows is None else ddos_flows)
        self.bf_flows = int(_env_f("RATE_BF_FLOWS", 15) if bf_flows is None else bf_flows)
        self.cooldown_s = _env_f("RATE_COOLDOWN_S", 30) if cooldown_s is None else cooldown_s
        self.max_keys = max_keys
        self._pair: dict = {}      # (src, dst) -> deque[ts]
        self._auth: dict = {}      # (src, dst, port) -> deque[ts]
        self._dst: dict = {}       # dst -> deque[(ts, src)]
        self._last_alert: dict = {}
        self._n = 0

    def _trim(self, d: deque, now: float, tuples=False):
        lo = now - self.window_s
        while d and (d[0][0] if tuples else d[0]) < lo:
            d.popleft()

    def _cool(self, key, now) -> bool:
        """True ถ้าเพิ่งแจ้ง key นี้ไปแล้ว (กัน alert รัวทุก flow)"""
        last = self._last_alert.get(key)
        if last is not None and now - last < self.cooldown_s:
            return True
        self._last_alert[key] = now
        return False

    def observe(self, ts_s: float, src: str, dst: str, dst_port: int) -> list:
        """ป้อน 1 flow (ts_s = เวลาวินาที) → คืน list ของ RateAlert ที่เพิ่งทริกเกอร์"""
        alerts = []

        d = self._pair.setdefault((src, dst), deque())
        d.append(ts_s)
        self._trim(d, ts_s)
        if len(d) >= self.dos_flows and not self._cool(("DoS", src, dst), ts_s):
            alerts.append(RateAlert("DoS", "src_to_dst_rate", src,
                                    f"{len(d)} flows/{self.window_s:g}s {src}->{dst}"))

        if int(dst_port) in AUTH_PORTS:
            a = self._auth.setdefault((src, dst, int(dst_port)), deque())
            a.append(ts_s)
            self._trim(a, ts_s)
            if len(a) >= self.bf_flows and not self._cool(("BF", src, dst, int(dst_port)), ts_s):
                alerts.append(RateAlert("BruteForce", "auth_port_rate", src,
                                        f"{len(a)} flows/{self.window_s:g}s {src}->{dst}:{dst_port}"))

        t = self._dst.setdefault(dst, deque())
        t.append((ts_s, src))
        self._trim(t, ts_s, tuples=True)
        if len(t) >= self.ddos_flows:
            n_src = len({s for _, s in t})
            if n_src >= self.ddos_sources and not self._cool(("DDoS", dst), ts_s):
                alerts.append(RateAlert("DDoS", "dst_many_sources", dst,
                                        f"{len(t)} flows from {n_src} sources/{self.window_s:g}s ->{dst}"))

        self._n += 1
        if self._n % 5000 == 0:
            self._gc(ts_s)
        return alerts

    def _gc(self, now: float):
        """ล้าง key ที่เงียบเกิน window — กัน memory โตไม่จำกัดจาก scan/spoofed source"""
        lo = now - self.window_s
        for table, tup in ((self._pair, False), (self._auth, False), (self._dst, True)):
            for k in [k for k, d in table.items() if not d or (d[-1][0] if tup else d[-1]) < lo]:
                del table[k]
        for k in [k for k, v in self._last_alert.items() if now - v > self.cooldown_s]:
            del self._last_alert[k]
        if len(self._pair) > self.max_keys:   # ยังเกินเพดานแม้ล้างแล้ว → ทิ้งทั้งหมดดีกว่า OOM
            self._pair.clear()
            self._auth.clear()
            self._dst.clear()


if __name__ == "__main__":
    def mk():
        return RateRuleDetector(window_s=10, dos_flows=200, ddos_sources=20, ddos_flows=500,
                                bf_flows=15, cooldown_s=30)

    # DoS: 300 flows ใน 3 วินาทีจากแหล่งเดียว แจ้งครั้งเดียว (cooldown)
    r = mk()
    got = [a for i in range(300) for a in r.observe(i * 0.01, "10.0.0.5", "10.0.0.9", 80)]
    assert [a.attack_class for a in got] == ["DoS"], got

    # ปกติ: 50 flows ใน 10 วินาที ไม่ทริกเกอร์
    r = mk()
    assert not [a for i in range(50) for a in r.observe(i * 0.2, "10.0.0.5", "10.0.0.9", 443)]
    # 1 flow/วินาที นาน 600 วินาที ไม่สะสมข้าม window
    assert not [a for i in range(600) for a in r.observe(100 + i, "10.0.0.6", "10.0.0.9", 80)]

    # BruteForce: SSH 20 flows ใน 4 วินาที / port ปกติจำนวนเท่ากันไม่ทริกเกอร์
    r = mk()
    got = [a for i in range(20) for a in r.observe(i * 0.2, "10.0.0.5", "10.0.0.9", 22)]
    assert [a.attack_class for a in got] == ["BruteForce"], got
    r = mk()
    assert not [a for i in range(20) for a in r.observe(i * 0.2, "10.0.0.5", "10.0.0.9", 8080)]

    # DDoS: 40 source × 15 flows = 600 flows ใน 6 วินาที (แต่ละ source ต่ำกว่า DoS threshold)
    r = mk()
    got = [a for i in range(600) for a in r.observe(i * 0.01, f"10.1.0.{i % 40}", "10.0.0.9", 80)]
    assert [a.attack_class for a in got] == ["DDoS"], got
    # source เยอะแต่ flow รวมน้อย (เว็บยอดนิยม) ไม่ทริกเกอร์
    r = mk()
    assert not [a for i in range(100) for a in r.observe(i * 0.05, f"10.1.0.{i}", "10.0.0.9", 80)]

    # โจมตีต่อเนื่อง 60 วินาที → แจ้งซ้ำหลัง cooldown 30s
    r = mk()
    got = [a for i in range(6000) for a in r.observe(i * 0.01, "10.0.0.5", "10.0.0.9", 80)]
    assert len(got) == 2, len(got)
    print("[OK] rate_rules self-test passed")
