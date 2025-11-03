from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

def get_db():
    conn = sqlite3.connect("inventory.db")
    conn.row_factory = sqlite3.Row
    return conn

# Check an asset
@app.route("/check/<item>")
def check_item(item):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM assets WHERE asset_id=?", (item,))
    row = cur.fetchone()
    conn.close()
    if row:
        return jsonify({
            "reply": f"{row['asset_id']} → Status: {row['status']}, Assigned: {row['assigned_to']}, Location: {row['location']}"
        })
    return jsonify({"reply": "❌ Item not found"})

# Assign an asset
@app.route("/assign/<item>/<user>", methods=["POST"])
def assign_item(item, user):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE assets SET status=?, assigned_to=? WHERE asset_id=?",
                ("in use", user, item))
    conn.commit()
    conn.close()
    return jsonify({"reply": f"✅ {item} assigned to {user}"})

# Soft delete an asset
@app.route("/delete/<item>", methods=["POST"])
def delete_item(item):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE assets SET status=? WHERE asset_id=?", ("archived", item))
    conn.commit()
    conn.close()
    return jsonify({"reply": f"🗄️ {item} archived (soft deleted)"})

if __name__ == "__main__":
    app.run(debug=True)
