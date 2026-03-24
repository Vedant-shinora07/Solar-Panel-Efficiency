#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ─── WiFi & Server ───────────────────────────────────────────
const char* SSID     = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";
const char* SERVER   = "http://192.168.1.100:5000/api/readings";  // your PC's local IP

// ─── GPIO Pin Map ────────────────────────────────────────────
#define ZMPT101B_PIN  34   // Voltage sensor  → D34
#define ACS712_PIN    35   // Current sensor  → D35
#define LDR_PIN       32   // Light sensor    → D32
#define DS18B20_PIN    4   // Temp sensor     → D4

// ─── DS18B20 Setup ───────────────────────────────────────────
OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensor(&oneWire);

// ─── Calibration Constants ───────────────────────────────────
const float ACS712_SENSITIVITY = 1.215;  // change to 0.185 (5A) or 0.100 (20A) if needed
const float ACS712_OFFSET      = 1.65;
const float ZMPT_MULTIPLIER    = 3.3;  // adjust this after calibration

// ─── Sensor Read Functions ───────────────────────────────────

float readVoltage() {
  long sum = 0;
  for (int i = 0; i < 100; i++) {
    sum += analogRead(ZMPT101B_PIN);
    delayMicroseconds(100);
  }
  float avgRaw     = sum / 100.0;
  float adcVoltage = (avgRaw / 4095.0) * 3.3;
  // return adcVoltage * ZMPT_MULTIPLIER;
  return adcVoltage;
}

float readCurrent() {
  long sum = 0;
  for (int i = 0; i < 100; i++) {
    sum += analogRead(ACS712_PIN);
    delayMicroseconds(100);
  }
  float avgRaw     = sum / 100.0;
  float adcVoltage = (avgRaw / 4095.0) * 3.3;
  float current    = (adcVoltage - ACS712_OFFSET) / ACS712_SENSITIVITY;
  return abs(current);
}

float readLight() {
  int raw = analogRead(LDR_PIN);
  return raw;
}

float readTemperature() {
  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);
  if (temp == DEVICE_DISCONNECTED_C) {
    return -999.0;
  }
  return temp;
}

// ─── WiFi Connect ────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[INFO] Connecting to: %s\n", SSID);
  WiFi.begin(SSID, PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;

    if (attempts % 10 == 0) {
      Serial.printf("\n[INFO] Still trying... (%d seconds elapsed)\n", attempts / 2);
    }

    if (attempts >= 40) {
      Serial.println("\n[ERR] Could not connect to WiFi. Check SSID and password.");
      Serial.printf("[ERR] SSID entered: '%s'\n", SSID);
      Serial.println("[ERR] Restarting ESP32 in 3 seconds...");
      delay(3000);
      ESP.restart();
    }
  }
  Serial.printf("\n[OK]  Connected — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ─── HTTP POST ───────────────────────────────────────────────
void sendData(float voltage, float current, float temp, float light) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi disconnected, skipping POST");
    return;
  }

  HTTPClient http;
  http.begin(SERVER);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["voltage"]     = voltage;
  doc["current"]     = current;
  doc["temperature"] = temp;
  doc["light"]       = light;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  if (httpCode == 200) {
    Serial.println("[OK]  Data sent successfully");
  } else {
    Serial.printf("[ERR] POST failed — HTTP %d\n", httpCode);
  }
  http.end();
}

// ─── Setup ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  tempSensor.begin();

  Serial.println("============================");
  Serial.println("   Solar Monitor - Debug    ");
  Serial.println("============================");
  Serial.printf("DS18B20 devices found: %d\n", tempSensor.getDeviceCount());
  Serial.println("Starting readings...\n");

  connectWiFi();
}

// ─── Main Loop ───────────────────────────────────────────────
void loop() {
  // Raw ADC values
  int rawVoltage = analogRead(ZMPT101B_PIN);
  int rawCurrent = analogRead(ACS712_PIN);
  int rawLight   = analogRead(LDR_PIN);

  // Processed values
  float voltage = readVoltage();
  float current = readCurrent();
  float temp    = readTemperature();
  float light   = readLight();
  float power   = voltage * current;

  Serial.println("──────────────────────────────────────");
  Serial.printf("  [D34] Voltage     raw: %4d  →  %.2f V\n",  rawVoltage, voltage);
  Serial.printf("  [D35] Current     raw: %4d  →  %.3f A\n",  rawCurrent, current);
  Serial.printf("  [D32] Light       raw: %4d  →  %.1f %%\n", rawLight,   light);

  if (temp == -999.0) {
    Serial.println("  [D4]  Temperature       →  SENSOR NOT FOUND");
  } else {
    Serial.printf("  [D4]  Temperature       →  %.1f C\n", temp);
  }

  Serial.printf("        Power           →  %.2f W\n", power);

  if (temp != -999.0) {
    sendData(voltage, current, temp, light);
  }

  delay(2000);  // read every 2 seconds
}
