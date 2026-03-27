# Industrial Alchemist — Solar Panel IoT Monitor

A full-stack IoT system that reads solar panel sensor data in real time, stores it in a MySQL database, trains a machine learning model to predict panel efficiency, and displays everything on a custom web dashboard.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Hardware](#hardware)
- [Tech Stack](#tech-stack)
- [ESP32 Firmware](#esp32-firmware)
- [Backend API](#backend-api)
- [Database Schema](#database-schema)
- [AI / ML Model](#ai--ml-model)
- [Frontend Dashboard](#frontend-dashboard)
- [API Reference](#api-reference)
- [Configuration & Secrets](#configuration--secrets)
- [Data Collection Guide](#data-collection-guide)
- [Known Limitations](#known-limitations)

---

## Project Overview

This system monitors a solar panel's real-time performance using four physical sensors connected to an ESP32 microcontroller. Every 5 seconds the ESP32 reads voltage, current, temperature and light intensity, then sends the data over WiFi to a Flask backend which stores it in MySQL. Once enough data is collected, a Random Forest machine learning model is trained to predict panel efficiency from the sensor readings. Both live sensor data and AI-predicted efficiency are displayed on a custom web dashboard.

---

## System Architecture

![System Architecture Diagram](D:\clg projects and codes\MPIS_AIML-project\Solar-Panel-Efficiency\assets\mpis_proj_circuit.png)
*The system follows a tiered architecture: Hardware (ESP32) -> Backend (Flask/MySQL) -> Intelligence (Scikit-Learn) -> Frontend (Web Dashboard).*

---

## Hardware

### Microcontroller

| Component | Model |
|-----------|-------|
| Microcontroller | ESP32 Dev Module |

### Sensors & GPIO Mapping

| Sensor | Component | GPIO Pin | Measures |
|--------|-----------|----------|----------|
| Voltage sensor | ZMPT101B | D34 | Panel output voltage |
| Current sensor | ACS712 | D35 | Panel output current |
| Light sensor | LDR | D32 | Light intensity (raw ADC) |
| Temperature sensor | DHT22 | D4 | Ambient temperature (°C) |

### Calibration Constants

| Constant | Default Value | Notes |
|----------|--------------|-------|
| `ACS712_SENSITIVITY` | `1.215` | Use `0.185` for 5A, `0.100` for 20A, `0.066` for 30A module |
| `ACS712_OFFSET` | `1.65` | Vcc/2 at 3.3V — adjust if 0A reads non-zero |
| `ZMPT_MULTIPLIER` | `3.3` | Calibrate against a known voltage using a multimeter |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Microcontroller | ESP32 (Arduino framework) |
| Firmware language | C++ (Arduino IDE) |
| Backend | Python 3, Flask, flask-cors |
| Database | MySQL |
| DB driver | mysql-connector-python |
| AI / ML | scikit-learn (Random Forest Regressor) |
| Data handling | pandas, numpy |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Charts | Chart.js 4.4.7 |

---

## ESP32 Firmware

### File: `solar_monitor.h`
Holds all configuration in one place — GPIO pins, calibration constants, WiFi credentials (via `secrets.h`) and function declarations.

### File: `solar_monitor.ino`
Main firmware logic:
* Reads all 4 sensors every 5 seconds
* Averages 100 ADC samples for voltage and current to reduce noise
* Reconnects WiFi automatically if connection drops
* Skips HTTP POST if DHT22 returns an error reading

---

## Backend API

### File: `backend/app.py`
Flask server running on port 5000. Handles all communication between the ESP32, the database, and the frontend.

| Method | Route | Called by | Purpose |
|--------|-------|-----------|---------|
| POST | `/api/readings` | ESP32 | Receive and store sensor data |
| GET | `/api/latest` | Frontend JS | Fetch last N readings for charts |
| GET | `/api/export` | Browser / manual | Export CSV for model training |

---

## Database Schema

### Table: `sensor_readings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `voltage` | FLOAT | Volts |
| `current` | FLOAT | Amps |
| `temperature` | FLOAT | Celsius |
| `light` | FLOAT | Raw ADC value from LDR |
| `power` | FLOAT | Generated column: `voltage * current` |

---

## AI / ML Model

### File: `ai_ml/model.py`
Trains a Random Forest Regressor to predict solar panel efficiency from the 4 sensor inputs.

### How It Works
A Random Forest builds 100 independent decision trees. The final prediction is the average across all 100 trees, which makes it far more stable and accurate than a single decision tree.

| Input features | Output |
|---------------|--------|
| voltage, current, temperature, light | efficiency_pct (0 – 100%) |

---

## Frontend Dashboard

### `index.html` — Dashboard Page
Displays real-time sensor data (Temperature, Voltage, Current, Light) polled from `/api/latest` every 5 seconds.

### `ml.html` — ML Predictions Page
Displays efficiency predictions from the AI model using a confidence donut and historical charts.

---

## API Reference

### `POST /api/readings`
Receives sensor data from the ESP32.

**Request body:**
```json
{
  "voltage":     15.2,
  "current":     1.4,
  "temperature": 34.1,
  "light":       876.0
}

```

## Configuration & Secrets

### What is gitignored

| File | Reason |
|------|--------|
| `venv/` | Python environment |
| `backend/.env` | Database credentials |
| `hardware/solar_monitor/secrets.h` | WiFi credentials |
| `backend/model.pkl` | Generated binary model |

---

## Data Collection Guide

For best model accuracy collect data across various conditions before training:

* **Different times of day** (morning, midday, afternoon)
* **Different weather** (clear, cloudy, overcast)
* **Different seasons**
* **Different panel angles or shading**

---

*MPIS_AIML_PROJECT — IoT System v1.0*
