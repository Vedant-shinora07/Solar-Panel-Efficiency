from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import pandas as pd
import pickle
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
CSV_PATH   = os.path.join(BASE_DIR, "solar_data.csv")

model = None
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print("[OK]  AI model loaded from model.pkl")
else:
    print("[WARN] model.pkl not found — efficiency predictions disabled")
    print("[WARN] Run ai_ml/model.py after collecting data to enable them")


def get_db():
    return mysql.connector.connect(
        host     = os.getenv("DB_HOST",     "localhost"),
        user     = os.getenv("DB_USER",     "root"),
        password = os.getenv("DB_PASSWORD", ""),
        database = os.getenv("DB_NAME",     "solar_monitor"),
        port     = int(os.getenv("DB_PORT", 3306))
    )

@app.route("/api/readings", methods=["POST"])
def receive_reading():

    data = request.json

    required = ["voltage", "current", "temperature", "light"]
    missing  = [f for f in required if f not in data]
    if missing:
        return jsonify({
            "status": "error",
            "message": f"Missing fields: {missing}"
        }), 400

    voltage     = float(data["voltage"])
    current     = float(data["current"])
    temperature = float(data["temperature"])
    light       = float(data["light"])

    efficiency = None
    if model is not None:
        try:
            features   = [[voltage, current, temperature, light]]
            efficiency = round(float(model.predict(features)[0]), 2)
            efficiency = max(0.0, min(100.0, efficiency))
        except Exception as e:
            print(f"[WARN] Prediction failed: {e}")

    try:
        db     = get_db()
        cursor = db.cursor()

        cursor.execute("""
            INSERT INTO sensor_readings (voltage, current, temperature, light)
            VALUES (%s, %s, %s, %s)
        """, (voltage, current, temperature, light))

        reading_id = cursor.lastrowid

        if efficiency is not None:
            cursor.execute("""
                INSERT INTO efficiency_predictions (reading_id, efficiency_pct)
                VALUES (%s, %s)
            """, (reading_id, efficiency))

        db.commit()
        cursor.close()
        db.close()

    except Exception as e:
        print(f"[ERR] Database error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

    print(f"[SAVED] ID:{reading_id} | "
          f"V:{voltage:.2f}V  "
          f"I:{current:.3f}A  "
          f"T:{temperature:.1f}°C  "
          f"L:{light:.0f}  "
          f"Eff:{efficiency}%")

    return jsonify({
        "status"     : "ok",
        "id"         : reading_id,
        "efficiency" : efficiency
    }), 200

@app.route("/api/latest", methods=["GET"])
def get_latest():

    try:
        limit = int(request.args.get("limit", 25))
        limit = min(limit, 200)  # cap at 200 rows

        db     = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                r.id,
                r.voltage,
                r.current,
                r.temperature,
                r.light,
                r.power,
                r.timestamp,
                p.efficiency_pct
            FROM sensor_readings r
            LEFT JOIN efficiency_predictions p ON p.reading_id = r.id
            ORDER BY r.timestamp DESC
            LIMIT %s
        """, (limit,))

        rows = cursor.fetchall()
        cursor.close()
        db.close()

        result = []
        for row in rows:
            row["timestamp"] = str(row["timestamp"])
            result.append(row)

        return jsonify(result[::-1]), 200

    except Exception as e:
        print(f"[ERR] /api/latest failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/count", methods=["GET"])
def get_count():

    try:
        db     = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM sensor_readings")
        total = cursor.fetchone()[0]
        cursor.close()
        db.close()
        return jsonify({"total_rows": total}), 200

    except Exception as e:
        print(f"[ERR] /api/count failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/export", methods=["GET"])
def export_csv():

    try:
        db = get_db()
        df = pd.read_sql("""
            SELECT voltage, current, temperature, light, power
            FROM sensor_readings
            ORDER BY timestamp ASC
        """, db)
        db.close()

        df.to_csv(CSV_PATH, index=False)

        print(f"[OK]  Exported {len(df)} rows → {CSV_PATH}")
        return jsonify({
            "status": "exported",
            "rows"  : len(df),
            "file"  : CSV_PATH
        }), 200

    except Exception as e:
        print(f"[ERR] /api/export failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/model/status", methods=["GET"])
def model_status():
    return jsonify({
        "model_loaded"  : model is not None,
        "model_path"    : MODEL_PATH,
        "model_exists"  : os.path.exists(MODEL_PATH)
    }), 200

if __name__ == "__main__":
    print("=" * 50)
    print("  Industrial Alchemist - Flask Backend")
    print("=" * 50)
    print(f"  DB Host     : {os.getenv('DB_HOST', 'localhost')}")
    print(f"  DB Name     : {os.getenv('DB_NAME', 'solar_monitor')}")
    print(f"  Model       : {'Loaded' if model else 'Not loaded'}")
    print(f"  CSV path    : {CSV_PATH}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=solar_monitor
DB_PORT=3306
