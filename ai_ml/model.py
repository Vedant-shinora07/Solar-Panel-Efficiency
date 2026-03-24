import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import pickle

# Load your exported CSV
df = pd.read_csv("solar_data.csv")

# === Define efficiency ===
# Efficiency = (actual power output) / (theoretical max power under ideal conditions)
# You define "ideal": e.g. max light=100%, ideal temp=25°C, rated max power=X watts
RATED_MAX_POWER = 50.0  # watts — set to your panel's rated wattage

df["efficiency"] = (df["power"] / RATED_MAX_POWER) * 100
df["efficiency"] = df["efficiency"].clip(0, 100)  # keep within 0–100%

# Features and target
X = df[["voltage", "current", "temperature", "light"]]
y = df["efficiency"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

preds = model.predict(X_test)
print(f"MAE:  {mean_absolute_error(y_test, preds):.2f}%")
print(f"R²:   {r2_score(y_test, preds):.4f}")

# Save model for Flask to load
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model saved → model.pkl")
