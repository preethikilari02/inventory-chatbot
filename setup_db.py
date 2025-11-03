import sqlite3

# Create database file
conn = sqlite3.connect("inventory.db")
cur = conn.cursor()

# Create table
cur.execute("""
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT UNIQUE,
    status TEXT,
    assigned_to TEXT,
    location TEXT
)
""")

# Insert some sample data
cur.execute("INSERT OR IGNORE INTO assets (asset_id, status, assigned_to, location) VALUES ('PC-101', 'available', NULL, 'IT Storage')")
cur.execute("INSERT OR IGNORE INTO assets (asset_id, status, assigned_to, location) VALUES ('KB-55', 'in use', 'Riya', 'Desk A3')")

conn.commit()
conn.close()

print("✅ Database created with sample data")
