/* ==================================================================
   Industrial Alchemist - IoT System Dashboard
   JavaScript - Real-time Data, Charts & Interactions
   ================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── Sidebar Toggle (mobile) ──
  const sidebar      = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ── Time Range Tabs (ML page) ──
  const timeTabs = document.querySelectorAll('.time-tabs button');
  timeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      timeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // ── Detect which page we're on ──
  const isDashboard = document.getElementById('tempChart') !== null;
  const isML        = document.getElementById('confidenceChart') !== null;

  // ── Chart.js defaults ──
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#8A8585';
  }

  /* ================================================================
     DASHBOARD PAGE
     ================================================================ */
  if (isDashboard) {
    initDashboard();
  }

  /* ================================================================
     ML PREDICTIONS PAGE
     ================================================================ */
  if (isML) {
    initMLPage();
  }

});


/* ════════════════════════════════════════════════════════════════════
   DASHBOARD FUNCTIONS
   ════════════════════════════════════════════════════════════════════ */

function initDashboard() {

  // ── Temperature Chart ──
  const tempCtx = document.getElementById('tempChart').getContext('2d');

  // Generate initial temperature data (24h, hourly points)
  const tempLabels = generateTimeLabels(24);
  let tempData = generateTempData(24);

  const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 200);
  tempGradient.addColorStop(0, 'rgba(90,150,144,0.25)');
  tempGradient.addColorStop(1, 'rgba(90,150,144,0.01)');

  const tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
      labels: tempLabels,
      datasets: [{
        data: tempData,
        borderColor: '#2F5755',
        borderWidth: 2.5,
        backgroundColor: tempGradient,
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#2F5755',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#432323',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => `${item.parsed.y.toFixed(1)} °C`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 4,
            font: { size: 10, weight: '500' },
            color: '#8A8585'
          },
          border: { display: false }
        },
        y: {
          display: false,
          min: 18,
          max: 38,
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

  // ── Current Bars ──
  const barsContainer = document.getElementById('currentBars');
  const barHeights = [25, 20, 30, 22, 40, 55, 70];
  renderCurrentBars(barsContainer, barHeights);

  // ── Real-Time Data Updates ──
  setInterval(() => {
    // Temperature
    const newTemp = randomInRange(22, 32, 1);
    document.getElementById('tempValue').innerHTML =
      `${newTemp} <span class="unit">°C</span>`;
    updateTempStatus(newTemp);

    // Update chart – shift left, push new
    tempChart.data.datasets[0].data.shift();
    tempChart.data.datasets[0].data.push(newTemp);
    tempChart.data.labels.shift();
    tempChart.data.labels.push(currentTimeLabel());
    tempChart.update('none');

    // Voltage
    const newVolt = randomInRange(210, 240, 1);
    document.getElementById('gaugeVal').textContent = Math.round(newVolt);
    document.getElementById('voltageVal').textContent = `${newVolt}V`;
    updateVoltageStatus(newVolt);

    // Current
    const newCurrent = randomInRange(3.5, 7.5, 1);
    document.getElementById('currentVal').textContent = newCurrent;
    updateCurrentAlert(newCurrent);

    // Update bars
    const newBars = barHeights.map(() => randomInRange(15, 75, 0));
    renderCurrentBars(barsContainer, newBars);

    // Bottom stats (occasional updates)
    const nodesUp = randomInRange(125, 130, 0);
    document.getElementById('nodesActive').textContent = `${nodesUp}/130`;
    document.getElementById('signalStrength').textContent =
      `-${randomInRange(38, 55, 0)} dBm`;

  }, 3000);
}


/* Helper: update temperature status badge */
function updateTempStatus(temp) {
  const badge = document.getElementById('tempStatus');
  if (temp > 30) {
    badge.innerHTML = '<span class="status-dot critical"></span> Critical';
    badge.className = 'status-badge critical';
  } else if (temp > 27) {
    badge.innerHTML = '<span class="status-dot warning"></span> High';
    badge.className = 'status-badge warning';
  } else {
    badge.innerHTML = '<span class="status-dot normal"></span> Normal';
    badge.className = 'status-badge normal';
  }
}

/* Helper: update voltage status */
function updateVoltageStatus(volt) {
  const el = document.getElementById('voltageStatus');
  if (volt < 210 || volt > 240) {
    el.textContent = 'Out of Range';
    el.style.color = 'var(--clr-danger)';
  } else {
    el.textContent = 'Safe Range';
    el.style.color = 'var(--clr-success)';
  }
}

/* Helper: update current alert strip */
function updateCurrentAlert(current) {
  const alert = document.getElementById('currentAlert');
  if (current > 6.5) {
    alert.innerHTML = '⚠ High Current Detected';
    alert.className = 'alert-strip danger';
  } else {
    alert.innerHTML = '⚠ Abnormal Spikes Prevented';
    alert.className = 'alert-strip warning';
  }
}

/* Render current bars */
function renderCurrentBars(container, heights) {
  container.innerHTML = '';
  heights.forEach((h, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar' + (i === heights.length - 1 ? ' active' : '');
    bar.style.height = h + '%';
    container.appendChild(bar);
  });
}


/* ════════════════════════════════════════════════════════════════════
   ML PREDICTIONS PAGE FUNCTIONS
   ════════════════════════════════════════════════════════════════════ */

function initMLPage() {

  // ── Confidence Donut ──
  const confCtx = document.getElementById('confidenceChart').getContext('2d');
  let confidenceVal = 94;

  const confidenceChart = new Chart(confCtx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [confidenceVal, 100 - confidenceVal],
        backgroundColor: ['#2F5755', 'rgba(0,0,0,0.06)'],
        borderWidth: 0,
        cutout: '78%',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      animation: {
        animateRotate: true,
        duration: 1200,
      }
    }
  });

  // ── Predicted vs Actual Chart ──
  const compCtx = document.getElementById('comparisonChart').getContext('2d');

  const compLabels = ['00:00','04:00','08:00','12:00','16:00','20:00','24:00'];
  const predictedData = [2.1, 2.3, 3.0, 3.8, 4.5, 5.2, 5.8];
  const actualData     = [2.0, 2.4, 2.8, 3.6, 4.3, 5.0, 5.6];

  const compChart = new Chart(compCtx, {
    type: 'line',
    data: {
      labels: compLabels,
      datasets: [
        {
          label: 'Predicted',
          data: predictedData,
          borderColor: '#5A9690',
          borderWidth: 2.5,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#5A9690',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          segment: {
            borderDash: (ctx) => ctx.p0DataIndex >= 4 ? [6, 4] : undefined
          }
        },
        {
          label: 'Actual',
          data: actualData,
          borderColor: '#8A8585',
          borderWidth: 2,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#8A8585',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          borderDash: [4, 4],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#432323',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} mm/s`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10, weight: '500' }, color: '#8A8585' },
          border: { display: false }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 10 }, color: '#8A8585' },
          border: { display: false },
          min: 0,
          max: 7,
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

  // ── Real-time updates for ML page ──
  setInterval(() => {
    // Update confidence slightly
    confidenceVal = Math.min(99, Math.max(85, confidenceVal + randomInRange(-2, 2, 0)));
    confidenceChart.data.datasets[0].data = [confidenceVal, 100 - confidenceVal];
    confidenceChart.update('none');
    document.getElementById('confidencePct').textContent = confidenceVal + '%';

    // Shift comparison data
    compChart.data.datasets[0].data.shift();
    compChart.data.datasets[0].data.push(randomInRange(2, 6, 1));
    compChart.data.datasets[1].data.shift();
    compChart.data.datasets[1].data.push(randomInRange(2, 6, 1));
    compChart.data.labels.shift();
    compChart.data.labels.push(currentTimeLabel());
    compChart.update('none');

  }, 4000);
}


/* ════════════════════════════════════════════════════════════════════
   SHARED UTILITY FUNCTIONS
   ════════════════════════════════════════════════════════════════════ */

/**
 * Generate an array of time labels going back `hours` hours.
 */
function generateTimeLabels(hours) {
  const labels = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const d = new Date(now - i * 3600000);
    if (i === hours) labels.push(`${hours}H AGO`);
    else if (i === Math.round(hours / 2)) labels.push(`${Math.round(hours / 2)}H AGO`);
    else if (i === 0) labels.push('NOW');
    else labels.push('');
  }
  return labels;
}

/**
 * Generate simulated temperature data.
 */
function generateTempData(count) {
  const data = [];
  let base = 24;
  for (let i = 0; i <= count; i++) {
    base += (Math.random() - 0.45) * 1.8;
    base = Math.max(20, Math.min(35, base));
    data.push(parseFloat(base.toFixed(1)));
  }
  return data;
}

/**
 * Random number in range with decimal precision.
 */
function randomInRange(min, max, decimals) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

/**
 * Current time formatted as label (HH:MM).
 */
function currentTimeLabel() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' +
         now.getMinutes().toString().padStart(2, '0');
}
