CREATE DATABASE if not exists solar_monitor;
USE solar_monitor;

CREATE TABLE if not exists sensor_readings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  voltage     FLOAT NOT NULL,
  current     FLOAT NOT NULL,
  temperature FLOAT NOT NULL,
  light       FLOAT NOT NULL,
  power       FLOAT GENERATED ALWAYS AS (voltage * current) STORED,
  timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE if not exists efficiency_predictions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reading_id      INT,
  efficiency_pct  FLOAT,
  timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reading_id) REFERENCES sensor_readings(id)
);
