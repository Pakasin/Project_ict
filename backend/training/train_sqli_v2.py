"""
Injection Model v2 — เทรนบน "ค่าที่ sensor ส่งเข้าโมเดลจริง" แทนชุดข้อมูล Kaggle เดิม

ปัญหาของ v1 (best_sqli.keras, วัดเมื่อ 2026-10-09 — ดู CONTEXT.md Known Limitations #0):
  - ข้อความปกติในชุด Kaggle เป็นอีเมล/คำเดี่ยว ๆ → โมเดลไม่เคยเห็นข้อความปกติที่มีเครื่องหมายวรรคตอน
    `Tom & Jerry (from 1940) -- review` ได้ 99.8%; ค่าปกติจริง 11/27 ได้ ≥ 0.75
  - positive เป็น payload สไตล์ sqlmap → พลาด `UNION SELECT` (0.0%)

วิธีของ v2:
  1. ข้อมูลทุกตัวผ่าน backend/sqli_extract.py (extractor ตัวเดียวกับ http_sensor) → เทรนบนสิ่งที่จะเจอตอนใช้งาน
  2. negative = ค่าจาก request ปกติจริงของ CSIC 2010 (train split) + ข้อความปกติที่สร้างเองให้มีวรรคตอน/คำ SQL ปะปน
  3. positive = SecLists SQLi payloads (+ mutation) + payload ที่สร้างจากแม่แบบหลายตระกูล/หลาย DB
     + ค่าจาก request ผิดปกติของ CSIC (train split) ที่มีไวยากรณ์ SQL
  4. ประเมินบนชุดที่ "ไม่ได้ใช้เทรน": CSIC test split (ปกติ + ผิดปกติที่มี SQL) และ corpus มือเขียนใน tests/
     เทียบ v1 บนชุดเดียวกัน

ข้อมูลดิบ (ไม่เก็บใน repo — ลิขสิทธิ์/ขนาด) ต้องอยู่ที่ $SQLI_RAW_DIR (default %TEMP%/sqli_raw):
  csic_train.parquet, csic_test.parquet  ← huggingface.co/datasets/bridge4/CSIC2010_dataset_classification
  Generic-SQLi.txt ฯลฯ                   ← danielmiessler/SecLists  Fuzzing/Databases/SQLi/

ข้อจำกัด (ตั้งใจให้ชัด):
  - positive ส่วนใหญ่สร้างจากแม่แบบที่ผู้เขียนรู้จัก → โมเดลเรียนรู้ "ตระกูลที่เรารู้" ตัวเลขบน corpus มือเขียนจึงไม่อิสระเต็มที่
    ตัวที่อิสระที่สุดคือ CSIC test (ผู้สร้างคนละคน) แต่ label ของมันคือ "ผิดปกติ" ไม่ใช่ "SQLi" → กรองด้วย regex ไวยากรณ์ SQL
  - ไม่ใช่ traffic จริงของ LAN นี้ — ต้องวัดซ้ำด้วย request จริงก่อนเชื่อตัวเลข

รัน:  python backend/training/train_sqli_v2.py            (ผลลัพธ์: backend/models/best_sqli_v2.keras + sqli_v2_metadata.json)
"""

import json
import os
import random
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))

import tensorflow as tf  # noqa: E402,F401  — ต้อง import ก่อน pandas/pyarrow: ไม่งั้น segfault ทันทีบน Windows
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from backend.sqli_extract import request_candidates  # noqa: E402

RAW = Path(os.environ.get("SQLI_RAW_DIR", os.path.join(os.environ.get("TEMP", "/tmp"), "sqli_raw")))
MODELS = ROOT / "backend" / "models"
SEED = 7
MAXLEN = 221
rng = random.Random(SEED)
np.random.seed(SEED)

# ───────────────────────────── ตัวช่วยสร้างข้อมูล ─────────────────────────────

WORDS = ("the of and to in is you that it he was for on are as with his they at be this from have or by one had not but what all were "
         "when we there can an your which their said if do will each about how up out them then she many some so these would other into "
         "has more her two like him see time could no make than first been its who now people my made over did down only way find use "
         "may water long little very after words called just where most know get through back much before go good new write our used me "
         "man too any day same right look think also around another came come work three word must because does part even place well "
         "such here take why help put different away again off went old number great tell men say small every found still between name "
         "should home big give air line set own under read last never us left end along while might next sound below saw something thought "
         "both few those always show large often together asked house don't world going want school important until form food keep children "
         "feet land side without boy once animal life enough took sometimes four head above kind began almost live page got earth need far "
         "hand high year mother light country father let night picture being study second soon story since white ever paper hard near sentence "
         "better best across during today however sure knew try told young sun thing whole hear example heard several change answer room "
         "sea against top turned learn point city play toward five using himself usually shoes running red blue green phone laptop camera "
         "coffee pizza order table update select union drop delete insert create user group access account password email address "
         "สวัสดี ขอบคุณ รองเท้า กาแฟ ร้านอาหาร ราคา สั่งซื้อ ที่อยู่ เบอร์โทร คำถาม ค้นหา").split()
FIRST = "john mary somchai maria pedro juan ana luis carlos sofia o'brien d'angelo robert o'neil anne-marie jean-luc".split()
SQLWORDS = ["select", "union", "insert", "update", "delete", "drop", "table", "where", "from", "order by", "group by", "create",
            "alter", "grant", "exec", "having", "join", "and", "or", "not", "null", "like", "limit"]


def rnum(lo=1, hi=9999):
    return rng.randint(lo, hi)


def rword():
    return rng.choice(WORDS)


def rstr(n=None):
    n = n or rng.randint(3, 8)
    return "".join(rng.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(n))


def mutate_case(s):
    mode = rng.random()
    if mode < 0.25:
        return s.upper()
    if mode < 0.45:
        return "".join(c.upper() if rng.random() < 0.5 else c.lower() for c in s)
    return s


def mutate_ws(s):
    """เปลี่ยนช่องว่างเป็นแบบที่ผู้โจมตีใช้เลี่ยง (/**/, tab, หลายช่อง) — หลังจาก URL decode แล้ว"""
    if " " not in s or rng.random() < 0.55:
        return s
    sep = rng.choice(["/**/", "\t", "  ", "   ", "\n", "+", "/*x*/"])
    return s.replace(" ", sep) if rng.random() < 0.5 else re.sub(r" ", lambda m: sep if rng.random() < 0.5 else " ", s)


def sqlmap_spacing(s):
    """สไตล์ชุดข้อมูล Kaggle เดิม: ใส่ช่องว่างรอบเครื่องหมาย  `(  select  )`"""
    return re.sub(r"([()=,])", r" \1 ", s) if rng.random() < 0.2 else s


# ───────────────────────────── Positive: แม่แบบ payload ─────────────────────────────

PRE = lambda: rng.choice(["", "", "1", "-1", "0", "999", str(rnum()), "admin", "x", rword(), "-" + str(rnum()), "1%", "a"])
CLOSE = lambda: rng.choice(["", "", "'", "'", '"', "')", "'))", ")", "))", "%')", "' )", "\")", "`"])
SUF = lambda: rng.choice(["", "", "-- ", "--", "-- -", "#", "/*", ";--", "--+", ";#", " -- ", "%00", ";%00"])
OR = lambda: rng.choice(["or", "OR", "or", "||", "or not", "and", "AND", "&&", "xor"])
FUNCS = ["user()", "database()", "version()", "@@version", "current_user", "schema()", "system_user()", "@@datadir", "sysdate", "banner",
         "concat(user(),0x3a,database())", "group_concat(table_name)", "load_file('/etc/passwd')", "char(%d)" % rnum(30, 120),
         "(select %s from %s limit 1)" % (rng.choice(["password", "username", "card", "secret"]), rng.choice(["users", "accounts", "admin", "members"]))]
TABLES = ["users", "user", "accounts", "admin", "members", "customers", "orders", "login", "employees", "information_schema.tables",
          "information_schema.columns", "sysobjects", "pg_catalog.pg_tables", "sqlite_master", "dual", "all_tables", "mysql.user"]
COLS = ["username", "password", "pass", "email", "id", "name", "card_number", "table_name", "column_name", "*", "@@version", "user()"]


def taut():
    n, m = rnum(), rnum()
    k = rng.choice(["num", "str", "numdiff", "like", "true", "emptystr", "samesame"])
    if k == "num":
        return f"{n}={n}"
    if k == "str":
        a = rstr(rng.randint(1, 3))
        return f"'{a}'='{a}"
    if k == "numdiff":
        return f"{n}={m}" if rng.random() < 0.5 else f"{n}>{rnum(0, n)}"
    if k == "like":
        return f"'{rstr(2)}' like '{rstr(2)}"
    if k == "true":
        return rng.choice(["1", "true", "'1'", "1=1", "2>1", "'a'<'b"])
    if k == "emptystr":
        return "''='"
    return f"{rstr(3)}={rstr(3)}"


def gen_tautology():
    return f"{PRE()}{CLOSE()} {OR()} {taut()}{SUF()}"


def gen_union():
    n = rng.randint(1, 8)
    cols = ",".join(rng.choice(["null", "null", str(rnum(1, 9)), rng.choice(FUNCS), f"'{rstr(3)}'", f"0x{rnum(1000, 99999):x}"]) for _ in range(n))
    frm = rng.choice(["", "", f" from {rng.choice(TABLES)}", f" from {rng.choice(TABLES)} limit {rnum(0, 5)},1", f" from {rng.choice(TABLES)} where {taut()}"])
    kw = rng.choice(["union select", "union all select", "union distinct select", "UNION ALL SELECT", "union/**/select", "union(select"])
    inner = f"{kw} {cols}{frm}" + (")" if kw.endswith("(select") else "")
    return f"{PRE()}{CLOSE()} {inner}{SUF()}"


def gen_stacked():
    stmt = rng.choice([
        f"drop table {rng.choice(TABLES)}", f"drop database {rstr()}", f"delete from {rng.choice(TABLES)}",
        f"insert into {rng.choice(TABLES)} values('{rstr()}','{rstr()}')", f"update {rng.choice(TABLES)} set {rng.choice(COLS[:4])}='{rstr()}'",
        f"exec xp_cmdshell('{rng.choice(['dir', 'whoami', 'net user'])}')", "shutdown", f"create user {rstr()} identified by '{rstr()}'",
        f"truncate table {rng.choice(TABLES)}", f"select {rng.choice(COLS)} from {rng.choice(TABLES)}", f"alter table {rng.choice(TABLES)} drop column {rstr()}",
        "exec master..xp_cmdshell 'ping 10.0.0.1'", f"grant all on *.* to '{rstr()}'@'%'"])
    return f"{PRE()}{CLOSE()}; {stmt}{SUF()}"


def gen_time():
    n = rng.randint(1, 15)
    t = rng.choice([f"sleep({n})", f"pg_sleep({n})", f"benchmark({rnum(100000, 9999999)},md5(1))", f"waitfor delay '0:0:{n}'",
                    f"dbms_pipe.receive_message(chr({rnum(60, 120)})||chr({rnum(60, 120)}),{n})", f"(select * from (select(sleep({n})))a)",
                    f"if(1=1,sleep({n}),0)", f"case when {taut()} then sleep({n}) else 0 end", f"dbms_lock.sleep({n})"])
    glue = rng.choice([f" {OR()} ", " and ", "; ", " || ", " "])
    return f"{PRE()}{CLOSE()}{glue}{t}{SUF()}"


def gen_error():
    inner = f"select {rng.choice(['version()', 'user()', 'database()', '@@version'])}"
    e = rng.choice([f"extractvalue(1,concat(0x7e,({inner})))", f"updatexml(1,concat(0x7e,({inner})),1)", f"convert(int,({inner}))",
                    f"cast(({inner}) as int)", f"(select 1 from(select count(*),concat(({inner}),floor(rand(0)*2))x from information_schema.tables group by x)a)",
                    f"exp(~(select*from({inner})a))", f"1/(select 0 from {rng.choice(TABLES)})", f"xmltype((select {rstr(1)} from dual))"])
    return f"{PRE()}{CLOSE()} {rng.choice(['and', 'or', 'and'])} {e}{SUF()}"


def gen_blind():
    sel = f"select {rng.choice(COLS[:6])} from {rng.choice(TABLES[:6])} limit {rnum(0, 3)},1"
    f = rng.choice([f"ascii(substring(({sel}),{rnum(1, 20)},1))>{rnum(30, 120)}", f"length(({sel}))={rnum(1, 30)}", f"substr(({sel}),{rnum(1, 9)},1)='{rstr(1)}'",
                    f"(select count(*) from {rng.choice(TABLES)})>{rnum(0, 5)}", f"ord(mid(({sel}),{rnum(1, 9)},1))={rnum(48, 122)}",
                    f"exists(select * from {rng.choice(TABLES)})", f"{rnum()} in (select {rng.choice(COLS[:4])} from {rng.choice(TABLES)})",
                    f"length(database())={rnum(1, 20)}", f"(select substring(version(),1,1))='{rng.choice('45')}'"])
    return f"{PRE()}{CLOSE()} {rng.choice(['and', 'or'])} {f}{SUF()}"


def gen_orderby():
    return rng.choice([f"{PRE()}{CLOSE()} order by {rnum(1, 30)}{SUF()}", f"{PRE()}{CLOSE()} group by {rng.choice(COLS)} having {taut()}{SUF()}",
                       f"{PRE()}{CLOSE()} procedure analyse({rnum(1, 3)},{rnum(1, 3)}){SUF()}"])


def gen_auth_bypass():
    return rng.choice([f"{rng.choice(['admin', 'root', 'administrator', rword()])}'{rng.choice(['--', '#', '/*', '-- -', ' --'])}",
                       f"' or '{rstr(1)}'='{rstr(1)}", "' or ''='", f"admin' or {taut()} limit 1{SUF()}", f"') or ('{rstr(1)}'='{rstr(1)}",
                       f"{rword()}' and {taut()}{SUF()}", "' or 1=1 limit 1 offset 0-- ", "') or 1=1--", "admin'/*", f"' or {rnum()}={rnum()}--"])


def gen_sqlmap():
    n = rnum(1000, 9999)
    return rng.choice([
        f"{PRE()}{rng.choice([chr(34), chr(39), '%'])}  )  ) {OR()} {n} = {n}#", f"{PRE()}' ) ) or {n} = {rnum(1000, 9999)}",
        f"{PRE()}\"  )   where {n}  =  {n} and {rnum(1000, 9999)}  =  dbms_utility.sqlid_to_sqlhash   (    (   chr  (  {rnum(60, 120)}  )",
        f"{PRE()}' ) as {rstr(4)} where {n}={n} rlike (select (case when ({n}={n}) then 1 else 0x28 end))-- {rstr(4)}",
        f"{PRE()} and {n}=(select count(*) from sysusers as sys1,sysusers as sys2,sysusers as sys3,sysusers as sys4)",
        f"{PRE()}' and {n}=convert(int,(select '{rstr(3)}'+'{rstr(3)}'+(select (case when ({n}={n}) then '1' else '0' end))+'{rstr(3)}'))--",
        f"{PRE()}' or char({rnum(60, 100)})||char({rnum(60, 100)})||char({rnum(60, 100)})||char({rnum(60, 100)}) = regexp_substring(repeat(left(crypt_key(char(1)),0),{rnum(100000, 500000000)}),null) and 'x'='x",
        f"select count  (  *  )   from rdb$fields as t1,rdb$types as t2,rdb$collations as t3,rdb$functions as t4",
        f"{PRE()}' and {n}={n}  and '{rstr(4)}'='{rstr(4)}", f"{PRE()}) {OR()} {n}={n}-- {rstr(4)}",
        f"{PRE()}' union all select null,null,concat(0x{rnum(10 ** 5, 10 ** 8):x},0x{rnum(10 ** 5, 10 ** 8):x}),null-- -",
        f"{PRE()}%' and {n}={n} and '%'='"])


def gen_schema_file():
    return rng.choice([f"{PRE()}{CLOSE()} union select table_name,null from information_schema.tables where table_schema=database(){SUF()}",
                       f"{PRE()}{CLOSE()} union select column_name from information_schema.columns where table_name='{rng.choice(TABLES[:6])}'{SUF()}",
                       f"{PRE()}{CLOSE()} union select name from sqlite_master where type='table'{SUF()}",
                       f"{PRE()}{CLOSE()} union select null,load_file('/etc/passwd'){SUF()}",
                       f"{PRE()}{CLOSE()} into outfile '/var/www/{rstr()}.php'{SUF()}", f"{PRE()}{CLOSE()} select utl_http.request('http://{rstr()}.com') from dual{SUF()}",
                       f"{PRE()}{CLOSE()} and 1=(select top 1 name from sysobjects where xtype='u'){SUF()}"])


POS_FAMILIES = [(gen_tautology, 14), (gen_union, 16), (gen_stacked, 9), (gen_time, 10), (gen_error, 8), (gen_blind, 9),
                (gen_orderby, 4), (gen_auth_bypass, 6), (gen_sqlmap, 12), (gen_schema_file, 6)]


def gen_positive():
    fn = rng.choices([f for f, _ in POS_FAMILIES], weights=[w for _, w in POS_FAMILIES])[0]
    return mutate_case(sqlmap_spacing(mutate_ws(fn()))).strip()


def load_seclists():
    out = []
    for p in RAW.glob("*.txt"):
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and len(line) >= 3:
                out.append(line)
    return list(dict.fromkeys(out))


# ───────────────────────────── Negative: ข้อความปกติที่มีวรรคตอน ─────────────────────────────

def sentence(n=None):
    n = n or rng.randint(2, 12)
    return " ".join(rword() for _ in range(n))


def gen_negative():
    k = rng.randrange(42)
    if k >= 36:
        return gen_negative_short(k - 36)
    if k == 0:
        return f"{rng.choice(FIRST).title()} {rng.choice(['O' + chr(39) + 'Reilly', 'D' + chr(39) + 'Angelo', 'Smith', 'Garcia'])}"
    if k == 1:
        return f"{sentence()}, {sentence(3)}! ({sentence(3)}) -- {sentence(2)}"
    if k == 2:
        return f"{sentence(4)}: {rnum(1, 99)} or {rnum(1, 99)} and {rnum(1, 99)}"
    if k == 3:
        return f"{rstr()}.{rstr()}@{rng.choice(['example.com', 'mail.co.th', 'corp.local'])}"
    if k == 4:
        return f"https://{rstr()}.com/{rstr()}?{rstr(2)}={rnum()}&{rstr(2)}={rword()}"
    if k == 5:
        return json.dumps({rstr(4): rword(), rstr(3): rnum(), "tags": [rword(), rword()]}, ensure_ascii=False)
    if k == 6:
        return f"{rng.choice(['select', 'update', 'delete', 'insert', 'drop', 'union', 'order by', 'create'])} {sentence(rng.randint(1, 5))}"
    if k == 7:
        return f"how to {rng.choice(SQLWORDS)} {rng.choice(SQLWORDS)} in {rword()}? ({sentence(3)})"
    if k == 8:
        return f"{rng.choice(['x', 'y', 'a', 'n'])}={rnum()} {rng.choice(['or', 'and'])} {rng.choice(['x', 'y', 'b'])}={rnum()}, {sentence(2)}"
    if k == 9:
        return f"#{rword()} @{rstr()} {sentence(3)} #{rword()}"
    if k == 10:
        return f"{rng.choice(['if', 'while', 'for'])} ({rstr(1)} == {rnum()}) {{ return {rnum()}; }} // {sentence(3)}"
    if k == 11:
        return f"color: #{rnum(100000, 999999)}; margin: {rnum(0, 20)}px {rnum(0, 20)}px; font-family: '{rword()}', sans-serif;"
    if k == 12:
        return f"{rnum(2020, 2026)}-{rnum(1, 12):02d}-{rnum(1, 28):02d} {rnum(0, 23):02d}:{rnum(0, 59):02d}:{rnum(0, 59):02d}"
    if k == 13:
        return f"text/html;q=0.9, application/xml;q={rnum(1, 9) / 10}, */*;q=0.8"
    if k == 14:
        return f"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/{rnum(500, 600)}.36 (KHTML, like Gecko) Chrome/{rnum(80, 130)}.0 Safari/537.36"
    if k == 15:
        return f"<{rng.choice(['b', 'p', 'div', 'span'])}>{sentence(3)}</{rng.choice(['b', 'p', 'div', 'span'])}>"
    if k == 16:
        return f"${rnum(1, 999)}.{rnum(0, 99):02d} ({rnum(5, 70)}% off) - {sentence(2)}"
    if k == 17:
        return f"C:\\Users\\{rstr()}\\{rstr()}\\{rstr()}.{rng.choice(['txt', 'pdf', 'docx'])}"
    if k == 18:
        return f"/{rstr()}/{rstr()}/{rnum()}/../{rstr()}.{rng.choice(['png', 'js', 'css'])}"
    if k == 19:
        return f"{rstr(8).upper()}-{rnum(100, 999)}-{rstr(3).upper()}"
    if k == 20:
        return f"{rng.choice(['(', '[', '{'])}{sentence(3)}{rng.choice([')', ']', '}'])} {rng.choice(['—', '–', '-', '--', '...'])} {sentence(3)}"
    if k == 21:
        return f"'{sentence(2)}' and '{sentence(2)}' are {sentence(3)}"
    if k == 22:
        return f"it's {sentence(3)} and i'm {sentence(2)}; you're {sentence(2)}"
    if k == 23:
        return f"{rnum(1, 20)} + {rnum(1, 20)} = {rnum(1, 40)}; {rnum(1, 9)} * {rnum(1, 9)} = {rnum(1, 80)} or {rnum(1, 9)} < {rnum(1, 9)}"
    if k == 24:
        return f"{rng.choice(['Calle', 'Avenida', 'Plaza'])} {rng.choice(['Mayor', 'del Sol', 'Nueva'])}, {rnum(1, 200)}, {rnum(1, 9)}º {rng.choice('ABCD')}"
    if k == 25:
        return f"where are you from? {sentence(3)} - from {rword()} to {rword()}"
    if k == 26:
        return f"{rng.choice(['name', 'q', 'search', 'title'])}={sentence(2)}&{rng.choice(['page', 'id', 'sort'])}={rnum()}"
    if k == 27:
        return f"=?utf-8?q?{sentence(2).replace(' ', '_')}?= <{rstr()}@{rstr()}.com>"
    if k == 28:
        return "".join(rng.choice("abcdefABCDEF0123456789-_") for _ in range(rng.randint(20, 64))) + rng.choice(["==", "=", ""])
    if k == 29:
        return sentence(rng.randint(15, 45)) + rng.choice([".", "!", "?", "...", ";"])
    if k == 30:
        return f"{rng.choice(['Dr.', 'Mr.', 'Mrs.'])} {rng.choice(FIRST).title()} ({rword()}) #{rnum()}"
    if k == 31:
        return f"{{{{ {rstr()} }}}} ${{{rstr()}}} %{rstr()}% {sentence(2)}"
    if k == 32:
        # (ไม่ใส่ SQL statement จริงเป็นตัวอย่างปกติ — ในบริบท IDS ค่าแบบนั้นในพารามิเตอร์ควรถูกสงสัย)
        return f"Please {rng.choice(SQLWORDS)} {sentence(2)}; thanks (really)!"
    if k == 33:
        return f"{rnum(1, 99)}) {sentence(3)} -- {rnum(1, 99)}) {sentence(2)}"
    if k == 34:
        return f"{sentence(3)} || {sentence(2)} && {sentence(2)}"
    return f"{rng.choice(['1', '0', '-1', str(rnum())])}{rng.choice(['', ' ', '%', '.', ','])} {rword()}"


def gen_negative_short(k):
    """รูปแบบสั้น ๆ ที่ sensor ส่งเข้าโมเดลบ่อยมาก (query ทั้งก้อนของ ?id=1, ค่าภาษาไทย, ค่า q= ของ header)"""
    if k == 0:
        return f"{rng.choice(['id', 'page', 'uid', 'item', 'cat', 'n', 'p'])}={rnum(0, 99999)}"
    if k == 1:
        return "&".join(f"{rng.choice(['id', 'page', 'sort', 'lang', 'q', 'limit', 'offset', 'ref'])}={rng.choice([rnum(0, 999), rword(), 'asc', 'th'])}"
                        for _ in range(rng.randint(2, 4)))
    if k == 2:
        return f"{rng.choice(['q', 'search', 'keyword', 'name', 'title'])}={' '.join(rng.choice(['รองเท้า', 'กาแฟ', 'ร้านอาหาร', 'สวัสดี', 'ราคา', 'โทรศัพท์', rword()]) for _ in range(rng.randint(1, 3)))}"
    if k == 3:
        return ",".join(f"{rng.choice(['en-US', 'en', 'th', 'th-TH', 'es', 'fr', '*'])};q={rng.choice(['0.9', '0.8', '0.5', '0.7', '0.3'])}" for _ in range(rng.randint(1, 4)))
    if k == 4:
        return f"{rng.choice(FIRST).title()} {rng.choice(['Smith', 'Garcia', 'Lee'])}{rng.choice([')', '.', ',', ' (jr)', ' #2', '!'])}"
    return f"{rng.choice(['a', 'x', 'k', 'v'])}={rnum(0, 99)}&{rng.choice(['b', 'y', 'm'])}={rng.choice([rnum(0, 99), rword()])}"


# ───────────────────────────── CSIC 2010 → candidates ─────────────────────────────

def parse_http(raw: str):
    head, _, body = raw.replace("\r\n", "\n").partition("\n\n")
    lines = head.split("\n")
    parts = lines[0].split(" ")
    target = parts[1] if len(parts) > 1 else "/"
    hdr = {}
    for ln in lines[1:]:
        k, _, v = ln.partition(":")
        hdr[k.strip().lower()] = v.strip()
    return target, body, hdr.get("content-type", ""), hdr.get("cookie", "")


SQL_SIGNAL = re.compile(
    r"(?i)\b(select|union|insert\s+into|drop\s+(table|database)|delete\s+from|update\s+\w+\s+set|waitfor|sleep\s*\(|benchmark\s*\(|exec(ute)?\b|having\b)|"
    r"['\"]\s*(or|and)\b|\b(or|and)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+|--\s|;\s*(drop|delete|insert|update|select)")


def csic_candidates(df: pd.DataFrame):
    """(candidate, request_index, label) ทุกตัวที่ extractor ของ sensor จะส่งเข้าโมเดล"""
    out = []
    for i, (raw, lab) in enumerate(zip(df["requests"], df["label"])):
        try:
            for c in request_candidates(*parse_http(raw)):
                out.append((c, i, int(lab)))
        except Exception:
            continue
    return out


# ───────────────────────────── Encoding (ต้องตรง inference.encode_sqli_text) ─────────────────────────────

WORD_INDEX = json.load(open(MODELS / "sqli_tokenizer.json", encoding="utf-8"))


def encode_many(texts):
    arr = np.zeros((len(texts), MAXLEN), dtype=np.int32)
    for r, t in enumerate(texts):
        seq = [WORD_INDEX.get(ch, 1) for ch in t][-MAXLEN:]
        if seq:
            arr[r, MAXLEN - len(seq):] = seq
    return arr


def build_dataset():
    t0 = time.time()
    csic_tr = pd.read_parquet(RAW / "csic_train.parquet")
    csic_te = pd.read_parquet(RAW / "csic_test.parquet")
    tr_c, te_c = csic_candidates(csic_tr), csic_candidates(csic_te)
    print(f"CSIC candidates: train {len(tr_c)}, test {len(te_c)}  ({time.time() - t0:.0f}s)")

    normal_tr = {c for c, _, l in tr_c if l == 0}
    normal_te = {c for c, _, l in te_c if l == 0}
    anom_tr = {c for c, _, l in tr_c if l == 1 and c not in normal_tr and SQL_SIGNAL.search(c)}
    anom_te = {c for c, _, l in te_c if l == 1 and c not in normal_tr and c not in normal_te and SQL_SIGNAL.search(c)}
    print(f"  normal: train {len(normal_tr)} / test {len(normal_te)};  anomalous w/ SQL signal: train {len(anom_tr)} / test {len(anom_te)}")

    seclists = load_seclists()
    print(f"  SecLists payloads: {len(seclists)}")

    pos = set(anom_tr)
    for s in seclists:                                    # payload ดิบ + mutation หลายแบบ
        for _ in range(6):
            pos.add(mutate_case(mutate_ws(s)).strip())
        for pre in ("1", "-1", "admin", "x"):
            pos.add(f"{pre}{s}")
    while len(pos) < 70000:
        pos.add(gen_positive())

    neg = set(normal_tr)
    while len(neg) < len(normal_tr) + 45000:
        neg.add(gen_negative())

    # กัน leakage เฉพาะฝั่ง "โจมตี": ห้ามสตริงโจมตีของชุด test โผล่ในชุดเทรน
    # ค่าปกติที่พบบ่อย (เช่น `id=1`) ต้องอยู่ในชุดเทรนได้ — รอบแรกผมกรองมันออกเพราะซ้ำกับ test ทำให้โมเดลไม่เคยเห็นค่าปกติที่
    # พบบ่อยที่สุด และ request-level false alarm พุ่งเป็น 12.9% (ล้วนมาจาก `id=1`/`id=2`)
    pos = [p for p in pos if p not in neg and p not in anom_te and 2 <= len(p)]
    pos_set = set(pos)
    neg = [n for n in neg if n not in pos_set and 2 <= len(n)]
    neg_set = set(neg)
    novel_normal_te = sorted(normal_te - neg_set)            # ค่าปกติที่โมเดลไม่เคยเห็นตอนเทรน = ประมาณการแบบ unseen
    print(f"  train set: positives {len(pos)}, negatives {len(neg)};  held-out normal values never seen in training: {len(novel_normal_te)}/{len(normal_te)}")
    return pos, neg, {"normal_te": sorted(normal_te), "normal_te_novel": novel_normal_te, "anom_te": sorted(anom_te),
                      "csic_te_requests": csic_te}


def make_model():
    import tensorflow as tf
    L = tf.keras.layers
    m = tf.keras.Sequential([
        L.Input(shape=(MAXLEN,), dtype="int32"),
        L.Embedding(106, 32),
        L.Bidirectional(L.LSTM(64)),
        L.Dropout(0.3),
        L.Dense(48, activation="relu"),
        L.Dense(1, activation="sigmoid"),
    ])
    m.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="binary_crossentropy",
              metrics=[tf.keras.metrics.AUC(name="auc")])
    return m


def predict(model, texts, bs=1024):
    if not texts:
        return np.array([])
    return np.concatenate([model.predict(encode_many(texts[i:i + bs]), verbose=0)[:, 0] for i in range(0, len(texts), bs)])


def rate(scores, th):
    return float((scores >= th).mean()) if len(scores) else float("nan")


def evaluate(model, held, label):
    """ประเมินโมเดล 1 ตัวบนชุดที่ไม่ได้ใช้เทรน — ML ล้วน ๆ ไม่มีกฎ/ด่านโครงสร้าง"""
    import test_sqli as T                       # corpus มือเขียน (request ระดับ)
    res = {}
    n_s, a_s = predict(model, held["normal_te"]), predict(model, held["anom_te"])
    nn_s = predict(model, held["normal_te_novel"])
    res["csic_test_normal_values_all"] = {"n": len(n_s), **{f"fp@{t}": rate(n_s, t) for t in (0.5, 0.75, 0.9, 0.99)}}
    res["csic_test_normal_values_never_seen_in_training"] = {"n": len(nn_s), **{f"fp@{t}": rate(nn_s, t) for t in (0.5, 0.75, 0.9, 0.99)}}
    res["csic_test_sql_anomalous_values"] = {"n": len(a_s), **{f"recall@{t}": rate(a_s, t) for t in (0.5, 0.75, 0.9, 0.99)}}

    # request ระดับ: request ถูกเตือนถ้ามี candidate ใดก็ตามเกิน threshold
    te = held["csic_te_requests"]
    cands = csic_candidates(te)
    by_req = {}
    sc = predict(model, [c for c, _, _ in cands])
    for (c, i, l), s in zip(cands, sc):
        by_req.setdefault(i, [l, 0.0])[1] = max(by_req.get(i, [l, 0.0])[1], float(s))
    nrm = np.array([s for l, s in by_req.values() if l == 0])
    res["csic_test_normal_requests"] = {"n_with_candidates": len(nrm), **{f"fp@{t}": rate(nrm, t) for t in (0.5, 0.75, 0.9, 0.99)}}

    def req_scores(reqs):
        out = []
        for r in reqs:
            cs = request_candidates(*r[:4])
            out.append(float(predict(model, cs).max()) if cs else 0.0)
        return np.array(out)
    ben, att = req_scores(T.BENIGN), req_scores(T.ATTACKS)
    res["handwritten_corpus"] = {"benign_n": len(ben), "attack_n": len(att),
                                 **{f"fp@{t}": rate(ben, t) for t in (0.5, 0.75, 0.9, 0.99)},
                                 **{f"recall@{t}": rate(att, t) for t in (0.5, 0.75, 0.9, 0.99)}}
    print(f"\n=== {label} (ML ล้วน ๆ ไม่มีกฎ ไม่มีด่านโครงสร้าง) ===")
    print(json.dumps(res, indent=1))
    return res


def main():
    import tensorflow as tf
    tf.keras.utils.set_random_seed(SEED)
    pos, neg, held = build_dataset()

    texts = pos + neg
    y = np.array([1] * len(pos) + [0] * len(neg), dtype="float32")
    idx = np.random.permutation(len(texts))
    texts = [texts[i] for i in idx]; y = y[idx]
    X = encode_many(texts)
    assert (X[0:1] == __import__("backend.inference", fromlist=["x"]).encode_sqli_text(WORD_INDEX, texts[0])).all(), "encoder drift vs inference.py"
    n_val = int(len(X) * 0.1)
    Xv, yv, Xt, yt = X[:n_val], y[:n_val], X[n_val:], y[n_val:]
    print(f"train {len(Xt)} / val {len(Xv)}  (pos share {y.mean():.2f})")

    model = make_model()
    cb = [tf.keras.callbacks.EarlyStopping(monitor="val_auc", mode="max", patience=3, restore_best_weights=True),
          tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=1)]
    model.fit(Xt, yt, validation_data=(Xv, yv), epochs=int(os.environ.get("EPOCHS", 12)), batch_size=256, callbacks=cb, verbose=2)

    out = MODELS / "best_sqli_v2.keras"
    model.save(out)
    print("saved", out)

    v2 = evaluate(model, held, "v2 (new)")
    v1 = evaluate(tf.keras.models.load_model(MODELS / "best_sqli_v1.keras"), held, "v1 (current)")
    meta = {"model_file": "best_sqli_v2.keras", "max_len": MAXLEN, "vocab_size": 106, "char_level": True,
            "classes": ["Normal", "SQLi"], "trained_on": "CSIC2010 train (normal values + SQL-signal anomalous) + SecLists + generated",
            "n_positive": len(pos), "n_negative": len(neg), "seed": SEED, "evaluation": {"v2": v2, "v1_same_sets": v1}}
    (MODELS / "sqli_v2_metadata.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
