# Inventory Chatbot - Interactive Backend Demo

inventory = {
    "PC-101": {
        "name": "Dell Laptop",
        "status": "available",
        "assigned_to": None,
        "location": "IT Storage",
        "history": []
    },
    "KB-55": {
        "name": "Logitech Keyboard",
        "status": "in use",
        "assigned_to": "Riya",
        "location": "Desk A3",
        "history": ["Assigned to Riya"]
    }
}

roles = {
    "admin": "1234",
    "technician": "2222",
    "reader": "3333"
}

def login():
    role = input("Enter role (admin/technician/reader): ").lower()
    pwd = input("Enter passcode: ")
    if roles.get(role) == pwd:
        print(f"✅ Logged in as {role}")
        return role
    else:
        print("❌ Invalid role or passcode")
        return None

def assign_item(item, user, role):
    if role != "admin":
        return "❌ Only admin can assign items."
    if item not in inventory:
        return "❌ Item not found."
    inventory[item]["assigned_to"] = user
    inventory[item]["status"] = "in use"
    inventory[item]["history"].append(f"Assigned to {user}")
    return f"✅ {item} assigned to {user}."

def check_item(item):
    if item not in inventory:
        return "❌ Item not found."
    data = inventory[item]
    return f"{item} ({data['name']}) → Status: {data['status']}, Assigned: {data['assigned_to']}, Location: {data['location']}"

def soft_delete(item, role):
    if role != "admin":
        return "❌ Only admin can delete items."
    if item not in inventory:
        return "❌ Item not found."
    inventory[item]["status"] = "archived"
    inventory[item]["history"].append("Soft deleted")
    return f"🗄️ {item} archived (soft deleted)."

# ---------------------------
# Interactive chatbot loop
# ---------------------------
print("=== Inventory Chatbot ===")
user_role = login()
if user_role:
    while True:
        query = input("\nYou: ")
        if query.lower() in ["exit", "quit"]:
            print("Bot: Goodbye 👋")
            break
        elif query.lower().startswith("who has"):
            item = query.split()[-1]
            print("Bot:", check_item(item))
        elif query.lower().startswith("assign"):
            # Example: Assign PC-101 to Manasa
            parts = query.split()
            if len(parts) >= 4 and parts[2].lower() == "to":
                item = parts[1]
                user = parts[3]
                print("Bot:", assign_item(item, user, user_role))
            else:
                print("Bot: ❌ Invalid assign command. Use: Assign <item> to <user>")
        elif query.lower().startswith("delete"):
            # Example: Delete KB-55
            item = query.split()[1]
            print("Bot:", soft_delete(item, user_role))
        elif query.lower().startswith("check"):
            # Example: Check PC-101
            item = query.split()[1]
            print("Bot:", check_item(item))
        else:
            print("Bot: ❌ I don't understand. Try: Who has <item>, Assign <item> to <user>, Check <item>, Delete <item>")
