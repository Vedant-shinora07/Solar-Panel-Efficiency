#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// WiFi credentials
const char* SSID     = "YOUR_SSID";
const char* PASSWORD = "YOUR_PASSWORD";
const char* SERVER   = "http://192.168.1.100:5000/api/readings"; // your PC's IP

// Pin definitions
#define ACS712_PIN    34   // Current sensor (analog)
#define LDR_PIN       35   // Light sensor (analog)
#define ZMPT101B_PIN  32   // Voltage sensor (analog)
#define DS18B20_PIN   4    // Temperature sensor (digital)

OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensor(&oneWire);

// ACS712-30A: sensitivity = 66mV/A, offset = Vcc/2
float readCurrent() {
  int raw = analogRead(ACS712_PIN);
  float voltage = (raw / 4095.0) * 3.3;
  float current = (voltage - 1.65) / 0.066; // ACS712-30A
  return abs(current);
}

// ZMPT101B: calibrate multiplier for your panel's max voltage
float readVoltage() {
  int raw = analogRead(ZMPT101B_PIN);
  float voltage = (raw / 4095.0) * 3.3;
  return voltage * 100.0; // adjust multiplier after calibration
}

float readLight() {
  int raw = analogRead(LDR_PIN);
  return (raw / 4095.0) * 100.0; // 0–100% light intensity
}

float readTemperature() {
  tempSensor.requestTemperatures();
  return tempSensor.getTempCByIndex(0);
}

void sendData(float voltage, float current, float temp, float light) {
  if (WiFi.status() != WL_CONNECTED) return;

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

  int code = http.POST(body);
  Serial.printf("POST %s → %d\n", SERVER, code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  tempSensor.begin();
  WiFi.begin(SSID, PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nConnected: " + WiFi.localIP().toString());
}

void loop() {
  float v = readVoltage();
  float c = readCurrent();
  float t = readTemperature();
  float l = readLight();

  Serial.printf("V=%.2f  I=%.2fA  T=%.1f°C  L=%.1f%%\n", v, c, t, l);
  sendData(v, c, t, l);

  delay(5000); // send every 5 seconds
}
