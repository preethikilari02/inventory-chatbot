# inventory_backend.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI app
app = FastAPI(title="Inventory Backend API")

# Allow frontend (React/Teams/Localhost) to access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (you can restrict later)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Example Data (You can replace with DB later) ---
inventory = {
    "PC-101": {"status": "Available", "location": "Lab A"},
    "PC-102": {"status": "In Use", "location": "Lab B"},
    "Laptop-001": {"status": "Under Maintenance", "location": "IT Office"},
}


# --- ROUTES ---

@app.get("/")
def root():
    return {"message": "Inventory Backend is Running ✅"}


@app.get("/items")
def get_items():
    """Return list of all inventory items."""
    return {"items": list(inventory.keys())}


@app.get("/check/{item_id}")
def check_item(item_id: str):
    """Return the status of a specific item."""
    item = inventory.get(item_id)
    if item:
        return {"status": item["status"], "location": item["location"]}
    else:
        return {"status": "Not Found"}


# --- Run server when executed directly ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5050)