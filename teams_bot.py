from flask import Flask, request, jsonify

app = Flask(__name__)

inventory = {
    "PC-101": {"name": "Dell Laptop", "status": "available", "assigned_to": None},
    "KB-55": {"name": "Logitech Keyboard", "status": "in use", "assigned_to": "Riya"}
}

@app.route("/")
def home():
    return jsonify({"message": "✅ Inventory Bot API is running"})


@app.route("/api/messages", methods=["POST"])
def messages():
    data = request.json or {}
    user_text = data.get("text", "").strip()

    if user_text.lower().startswith("who has"):
        item = user_text.split()[-1].upper()
        if item in inventory:
            item_data = inventory[item]
            reply = f"{item} ({item_data['name']}) → Status: {item_data['status']}, Assigned: {item_data['assigned_to'] or 'Nobody'}"
        else:
            reply = "❌ Item not found."
    else:
        reply = "❌ Sorry, I didn't understand that command."

    return jsonify({"text": reply})


if __name__ == "__main__":
    # Render requires binding to 0.0.0.0 and port 10000
    app.run(host="0.0.0.0", port=10000, debug=False)
