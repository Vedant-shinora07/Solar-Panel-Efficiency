// ── Backend API URL ──────────────────────────────────────────
// Change this to your PC's IP if opening on another device
const API_BASE = "http://localhost:5000";
const API_LATEST = `${API_BASE}/api/latest?limit=25`;

document.addEventListener("DOMContentLoaded", () => {
  // ── Sidebar Toggle (mobile) ──
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("active");
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarOverlay.classList.remove("active");
    });
  }

  // ── Time Range Tabs (ML page) ──
  const timeTabs = document.querySelectorAll(".time-tabs button");
  timeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      timeTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  // ── Detect which page we're on ──
  const isDashboard = document.getElementById("tempChart") !== null;
  const isML = document.getElementById("confidenceChart") !== null;

  // ── Chart.js defaults ──
  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#8A8585";
  }

  if (isDashboard) initDashboard();
  if (isML) initMLPage();
});

/* ════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ════════════════════════════════════════════════════════════════ */

function initDashboard() {
  // ── Temperature Chart setup ──
  const tempCtx = document.getElementById("tempChart").getContext("2d");

  const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 200);
  tempGradient.addColorStop(0, "rgba(90,150,144,0.25)");
  tempGradient.addColorStop(1, "rgba(90,150,144,0.01)");

  // Start with empty arrays — filled by first API fetch
  const tempChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "#2F5755",
          borderWidth: 2.5,
          backgroundColor: tempGradient,
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#2F5755",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#432323",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => `${item.parsed.y.toFixed(1)} °C`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 4,
            font: { size: 10, weight: "500" },
            color: "#8A8585",
          },
          border: { display: false },
        },
        y: {
          display: false,
          min: 18,
          max: 38,
        },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });

  // ── Current Bars initial render ──
  const barsContainer = document.getElementById("currentBars");
  renderCurrentBars(barsContainer, [25, 20, 30, 22, 40, 55, 70]);

  // ── Fetch & update dashboard ──
  async function fetchDashboard() {
    try {
      const res = await fetch(API_LATEST);
      const rows = await res.json();

      if (!rows.length) return;

      const latest = rows[rows.length - 1];

      // ── Temperature ──
      const temp = latest.temperature ?? null;
      if (temp !== null) {
        document.getElementById("tempValue").innerHTML =
          `${temp.toFixed(1)} <span class="unit">°C</span>`;
        updateTempStatus(temp);
      }

      // ── Voltage ──
      const voltage = latest.voltage ?? null;
      if (voltage !== null) {
        document.getElementById("gaugeVal").textContent = Math.round(voltage);
        document.getElementById("voltageVal").textContent =
          `${voltage.toFixed(1)}V`;
        updateVoltageStatus(voltage);
      }

      // ── Current ──
      const current = latest.current ?? null;
      if (current !== null) {
        document.getElementById("currentVal").textContent = current.toFixed(2);
        updateCurrentAlert(current);

        // Scale bar heights based on current value (0–10A range)
        const scaledBars = [
          current * 5,
          current * 4,
          current * 7,
          current * 6,
          current * 9,
          current * 10,
          current * 8,
        ].map((v) => Math.min(Math.max(v, 5), 100));
        renderCurrentBars(barsContainer, scaledBars);
      }

      // ── Temperature Chart — rebuild from history ──
      const labels = rows.map((r) =>
        r.timestamp
          ? r.timestamp.slice(11, 16) // HH:MM from "YYYY-MM-DD HH:MM:SS"
          : "",
      );
      const temps = rows.map((r) => r.temperature ?? null);

      tempChart.data.labels = labels;
      tempChart.data.datasets[0].data = temps;
      tempChart.update("none");

      // ── Light reading → Signal Strength display ──
      const light = latest.light ?? null;
      if (light !== null) {
        document.getElementById("signalStrength").textContent =
          `${light.toFixed(0)} lux`;
      }

      // ── Connection status ──
      showConnectionStatus(true);
    } catch (err) {
      console.error("[ERR] Failed to fetch from backend:", err);
      showConnectionStatus(false);
    }
  }

  // Fetch immediately then every 5 seconds
  fetchDashboard();
  setInterval(fetchDashboard, 5000);
}

/* ════════════════════════════════════════════════════════════════
   ML PREDICTIONS PAGE
   ════════════════════════════════════════════════════════════════ */

function initMLPage() {
  // ── Confidence Donut ──
  const confCtx = document.getElementById("confidenceChart").getContext("2d");
  let confidenceVal = 0;

  const confidenceChart = new Chart(confCtx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [0, 100],
          backgroundColor: ["#2F5755", "rgba(0,0,0,0.06)"],
          borderWidth: 0,
          cutout: "78%",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      animation: { animateRotate: true, duration: 1200 },
    },
  });

  // ── Predicted vs Actual Chart ──
  const compCtx = document.getElementById("comparisonChart").getContext("2d");

  const compChart = new Chart(compCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Predicted Efficiency",
          data: [],
          borderColor: "#5A9690",
          borderWidth: 2.5,
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#5A9690",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          segment: {
            borderDash: (ctx) => (ctx.p0DataIndex >= 4 ? [6, 4] : undefined),
          },
        },
        {
          label: "Actual Power Output",
          data: [],
          borderColor: "#8A8585",
          borderWidth: 2,
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#8A8585",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          borderDash: [4, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#432323",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (item) =>
              `${item.dataset.label}: ${item.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: { font: { size: 10, weight: "500" }, color: "#8A8585" },
          border: { display: false },
        },
        y: {
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: {
            font: { size: 10 },
            color: "#8A8585",
            callback: (v) => v + "%",
          },
          border: { display: false },
          min: 0,
          max: 100,
        },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });

  // ── Fetch & update ML page ──
  async function fetchML() {
    try {
      const res = await fetch(API_LATEST);
      const rows = await res.json();

      if (!rows.length) return;

      const latest = rows[rows.length - 1];

      // ── Efficiency → Confidence donut ──
      // efficiency_pct is null until model.pkl is loaded in Flask
      const efficiency = latest.efficiency_pct ?? null;

      if (efficiency !== null) {
        confidenceVal = parseFloat(efficiency.toFixed(1));
        confidenceChart.data.datasets[0].data = [
          confidenceVal,
          100 - confidenceVal,
        ];
        confidenceChart.update("none");
        document.getElementById("confidencePct").textContent =
          confidenceVal + "%";
      } else {
        // Model not trained yet — show placeholder
        document.getElementById("confidencePct").textContent = "N/A";
      }

      // ── Comparison chart — efficiency (predicted) vs power% (actual) ──
      const labels = rows.map((r) =>
        r.timestamp ? r.timestamp.slice(11, 16) : "",
      );

      // Predicted = efficiency_pct from AI model
      const predicted = rows.map((r) =>
        r.efficiency_pct !== null && r.efficiency_pct !== undefined
          ? parseFloat(r.efficiency_pct.toFixed(1))
          : null,
      );

      // Actual = normalize power to 0–100% using max power in the dataset
      const powers = rows.map((r) => r.power ?? 0);
      const maxPower = Math.max(...powers, 1); // avoid divide by zero
      const actual = powers.map((p) =>
        parseFloat(((p / maxPower) * 100).toFixed(1)),
      );

      compChart.data.labels = labels;
      compChart.data.datasets[0].data = predicted;
      compChart.data.datasets[1].data = actual;
      compChart.update("none");
    } catch (err) {
      console.error("[ERR] Failed to fetch ML data:", err);
    }
  }

  fetchML();
  setInterval(fetchML, 5000);
}

/* ════════════════════════════════════════════════════════════════
   SHARED UI HELPERS  (unchanged from original)
   ════════════════════════════════════════════════════════════════ */

function updateTempStatus(temp) {
  const badge = document.getElementById("tempStatus");
  if (temp > 30) {
    badge.innerHTML = '<span class="status-dot critical"></span> Critical';
    badge.className = "status-badge critical";
  } else if (temp > 27) {
    badge.innerHTML = '<span class="status-dot warning"></span> High';
    badge.className = "status-badge warning";
  } else {
    badge.innerHTML = '<span class="status-dot normal"></span> Normal';
    badge.className = "status-badge normal";
  }
}

function updateVoltageStatus(volt) {
  const el = document.getElementById("voltageStatus");
  if (volt < 210 || volt > 240) {
    el.textContent = "Out of Range";
    el.style.color = "var(--clr-danger)";
  } else {
    el.textContent = "Safe Range";
    el.style.color = "var(--clr-success)";
  }
}

function updateCurrentAlert(current) {
  const alert = document.getElementById("currentAlert");
  if (current > 6.5) {
    alert.innerHTML = "⚠ High Current Detected";
    alert.className = "alert-strip danger";
  } else {
    alert.innerHTML = "⚠ Abnormal Spikes Prevented";
    alert.className = "alert-strip warning";
  }
}

function renderCurrentBars(container, heights) {
  container.innerHTML = "";
  heights.forEach((h, i) => {
    const bar = document.createElement("div");
    bar.className = "bar" + (i === heights.length - 1 ? " active" : "");
    bar.style.height = h + "%";
    container.appendChild(bar);
  });
}

function showConnectionStatus(connected) {
  // Update the nodes active stat to reflect connection state
  const el = document.getElementById("nodesActive");
  if (!el) return;
  el.textContent = connected ? "1/1 Online" : "Offline";
  el.style.color = connected ? "var(--clr-success)" : "var(--clr-danger)";
}

function currentTimeLabel() {
  const now = new Date();
  return (
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0")
  );
}
