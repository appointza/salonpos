import json
import re
import sys
from pathlib import Path

import psycopg2

root = Path(__file__).resolve().parents[2]
cfg = json.loads((root / "appsettings.Development.json").read_text(encoding="utf-8"))
cs = cfg["ApplicationSettings"]["postgresqlconnection"]
parts = dict(re.findall(r"([^=;]+)=([^;]*)", cs))

sql_file = Path(__file__).with_name("20250925_hr_split_cover.sql")
sql = sql_file.read_text(encoding="utf-8")

conn = psycopg2.connect(
    host=parts["Host"],
    port=parts.get("Port", "5432"),
    dbname=parts["Database"],
    user=parts["Username"],
    password=parts["Password"],
)
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute(sql)
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'shifts'
          AND column_name IN ('splitStart', 'splitEnd')
        ORDER BY column_name
        """
    )
    shifts = [row[0] for row in cur.fetchall()]
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leaves'
          AND column_name = 'coverStaffId'
        """
    )
    leaves = [row[0] for row in cur.fetchall()]
conn.close()

print("Applied:", sql_file.name)
print("shifts:", shifts)
print("leaves:", leaves)
if len(shifts) < 2 or not leaves:
    sys.exit(1)
