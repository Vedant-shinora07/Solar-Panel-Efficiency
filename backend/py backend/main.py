from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import pandas as pd
import pickle
import os

app = Flask(__name__)
CORS(app)

# Load trained AI model if it exists
model = None
if os.path.exists("model.pkl"):
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="YOUR_PASSWORD",
        database="solar_monitor"
    )

@app.route("/api/readings", methods=["POST"])
def receive_reading():
    data = request.json
    voltage     = data["voltage"]
    current     = data["current"]
    temperature = data["temperature"]
    light       = data["light"]

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO sensor_readings (voltage, current, temperature, light) VALUES (%s, %s, %s, %s)",
        (voltage, current, temperature, light)
    )
    reading_id = cursor.lastrowid

    # Run AI prediction if model is loaded
    efficiency = None
    if model:
        features = [[voltage, current, temperature, light]]
        efficiency = round(float(model.predict(features)[0]), 2)
        cursor.execute(
            "INSERT INTO efficiency_predictions (reading_id, efficiency_pct) VALUES (%s, %s)",
            (reading_id, efficiency)
        )

    db.commit()
    cursor.close()
    db.close()

    return jsonify({"status": "ok", "id": reading_id, "efficiency": efficiency})


@app.route("/api/latest", methods=["GET"])
def get_latest():
    """Returns the last N readings for the dashboard."""
    limit = request.args.get("limit", 20)
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT r.*, p.efficiency_pct
        FROM sensor_readings r
        LEFT JOIN efficiency_predictions p ON p.reading_id = r.id
        ORDER BY r.timestamp DESC
        LIMIT %s
    """, (limit,))
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    # Convert datetime to string for JSON
    for row in rows:
        row["timestamp"] = str(row["timestamp"])
    return jsonify(rows[::-1])  # chronological order


@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    """Exports all readings as CSV for AI training."""
    db = get_db()
    df = pd.read_sql("SELECT voltage, current, temperature, light, power FROM sensor_readings", db)
    db.close()
    csv_path = "solar_data.csv"
    df.to_csv(csv_path, index=False)
    return jsonify({"status": "exported", "rows": len(df), "file": csv_path})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
