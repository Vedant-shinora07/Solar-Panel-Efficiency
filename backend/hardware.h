#ifndef SOLAR_MONITOR_H
#define SOLAR_MONITOR_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "secrets.h"

#define ZMPT101B_PIN    34
#define ACS712_PIN      35
#define LDR_PIN         32
#define DS18B20_PIN      4

#define ACS712_SENSITIVITY  1.215f
#define ACS712_OFFSET       1.65f
#define ZMPT_MULTIPLIER     3.3f

#define READ_INTERVAL_MS    2000
#define WIFI_MAX_ATTEMPTS   40

float readVoltage();
float readCurrent();
float readLight();
float readTemperature();
void  connectWiFi();
void  sendData(float voltage, float current, float temp, float light);

#endif
