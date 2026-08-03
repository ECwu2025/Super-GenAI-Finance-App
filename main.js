// GenAI Financial Terminal - Core Engine & Interactive UI

const form = document.getElementById('ticker-form');
const results = document.getElementById('results');
const demoToggleBtn = document.getElementById('demo-mode-toggle');
const demoStatusText = document.getElementById('demo-status-text');
const quickDemoBtn = document.getElementById('quick-demo-btn');

let isDemoMode = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSavedKeys();
  setupEventListeners();
});

function loadSavedKeys() {
  const savedTwelve = localStorage.getItem('genai_twelvedata_key');
  const savedOpenRouter = localStorage.getItem('genai_openrouter_key');
  
  if (savedTwelve) {
    const el = document.getElementById('twelvedata-key');
    if (el) el.value = savedTwelve;
  }
  if (savedOpenRouter) {
    const el = document.getElementById('openrouter-key');
    if (el) el.value = savedOpenRouter;
  }
  updateKeyStatusIndicator();
}

function updateKeyStatusIndicator() {
  const twelve = document.getElementById('twelvedata-key')?.value.trim();
  const openRouter = document.getElementById('openrouter-key')?.value.trim();
  const indicator = document.getElementById('keys-status-indicator');
  const feedIndicator = document.getElementById('feed-type-indicator');
  
  if (indicator) {
    if (twelve && openRouter) {
      indicator.textContent = 'Live Keys Configured';
      indicator.style.color = 'var(--accent-green)';
      if (feedIndicator) feedIndicator.textContent = 'TwelveData + OpenRouter';
    } else if (twelve) {
      indicator.textContent = 'TwelveData Key Ready';
      indicator.style.color = 'var(--accent-cyan)';
      if (feedIndicator) feedIndicator.textContent = 'TwelveData + Demo AI';
    } else {
      indicator.textContent = 'Demo Mode Ready';
      indicator.style.color = 'var(--text-dim)';
      if (feedIndicator) feedIndicator.textContent = 'Simulated Market Feed';
    }
  }
}

function setupEventListeners() {
  // Preset tickers
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tickerInput = document.getElementById('ticker');
      if (tickerInput) {
        tickerInput.value = btn.getAttribute('data-ticker');
        tickerInput.focus();
      }
    });
  });

  // Password visibility toggles
  document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-for');
      const input = document.getElementById(inputId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁';
        }
      }
    });
  });

  // Key inputs change listener
  ['twelvedata-key', 'openrouter-key'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateKeyStatusIndicator();
      if (document.getElementById('remember-keys')?.checked) {
        saveKeys();
      }
    });
  });

  // Demo toggle
  demoToggleBtn?.addEventListener('click', () => {
    isDemoMode = !isDemoMode;
    demoStatusText.textContent = isDemoMode ? 'ON' : 'OFF';
    demoToggleBtn.classList.toggle('active', isDemoMode);
    updateKeyStatusIndicator();
  });

  quickDemoBtn?.addEventListener('click', () => {
    const tickerInput = document.getElementById('ticker');
    if (tickerInput) tickerInput.value = 'NVDA';
    isDemoMode = true;
    if (demoStatusText) demoStatusText.textContent = 'ON';
    if (demoToggleBtn) demoToggleBtn.classList.add('active');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  });

  // Checkbox toggle chips
  document.querySelectorAll('.toggle-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const checkbox = chip.querySelector('input[type="checkbox"]');
      if (checkbox && e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      chip.classList.toggle('active', checkbox.checked);
      // Re-render chart if view is active
      if (window.currentStockData) {
        renderChart(window.currentStockData);
      }
    });
  });

  // Form submit
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    const twelveDataKey = document.getElementById('twelvedata-key').value.trim();
    const openRouterKey = document.getElementById('openrouter-key').value.trim();

    if (document.getElementById('remember-keys')?.checked) {
      saveKeys();
    }

    renderLoading(ticker);

    try {
      let priceData;
      let note;
      let isSimulated = isDemoMode || !twelveDataKey;

      if (isSimulated) {
        // Fetch or generate realistic demo data
        priceData = generateDemoPriceData(ticker);
      } else {
        priceData = await fetchPriceData(ticker, twelveDataKey);
      }

      if (isDemoMode || !openRouterKey) {
        note = generateDemoResearchNote(ticker, priceData);
      } else {
        note = await getResearchNote(ticker, priceData, openRouterKey);
      }

      window.currentStockData = priceData;
      renderDashboard(ticker, priceData, note, isSimulated);
    } catch (err) {
      renderError(ticker, err.message);
    }
  });
}

function saveKeys() {
  const twelve = document.getElementById('twelvedata-key')?.value.trim();
  const openRouter = document.getElementById('openrouter-key')?.value.trim();
  if (twelve) localStorage.setItem('genai_twelvedata_key', twelve);
  if (openRouter) localStorage.setItem('genai_openrouter_key', openRouter);
}

function renderLoading(ticker) {
  results.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing market structure for <strong>$${ticker}</strong>...</p>
      <div class="loading-steps">Fetching historical bars & calculating technical indicators</div>
    </div>
  `;
}

function renderError(ticker, errorMessage) {
  results.innerHTML = `
    <div class="error-banner">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <div>
        <div class="error-title">Analysis Interrupted</div>
        <div class="error-desc">${errorMessage}</div>
        <p style="margin-top: 0.5rem; font-size: 0.78rem;">Tip: You can enable <strong>Demo Mode</strong> in the top header or click <em>Quick Run with Demo Data</em> to simulate technicals instantly without API limits.</p>
      </div>
    </div>
  `;
}

// Fetch Twelve Data API
async function fetchPriceData(ticker, apiKey) {
  const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=90&apikey=${apiKey}`;
  const response = await fetch(url);

  const body = await response.text();
  let raw;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new Error(body.trim() || 'Price data response failed to parse');
  }

  if (raw && raw.status === 'error') throw new Error(raw.message || 'Twelve Data API Error');
  if (!response.ok) throw new Error(`Price fetch HTTP status ${response.status}`);

  const values = raw.values ?? [];
  if (!values.length) throw new Error(`No price data returned for symbol ${ticker}`);

  return values
    .map((b) => ({
      date: b.datetime,
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
      volume: Number(b.volume)
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// OpenRouter Call
async function getResearchNote(ticker, priceData, apiKey) {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const pctChange = ((latest.close - first.close) / first.close) * 100;
  const sma20 = calculateSMA(priceData, 20);
  const sma50 = calculateSMA(priceData, 50);
  const rsi = calculateRSI(priceData, 14);

  const latestSma20 = sma20[sma20.length - 1]?.val?.toFixed(2) ?? 'N/A';
  const latestSma50 = sma50[sma50.length - 1]?.val?.toFixed(2) ?? 'N/A';
  const latestRsi = rsi[rsi.length - 1]?.toFixed(1) ?? 'N/A';

  const summary =
    `${ticker} price history from ${first.date} to ${latest.date}: ` +
    `start $${first.close.toFixed(2)}, latest close $${latest.close.toFixed(2)}, ` +
    `change ${pctChange.toFixed(2)}% over ${priceData.length} trading days. ` +
    `SMA20: $${latestSma20}, SMA50: $${latestSma50}, RSI(14): ${latestRsi}.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are an institutional Wall Street research analyst specializing in technical analysis and quantitative trends. Provide direct, objective financial notes.' },
        { role: 'user', content: `${summary}\n\nWrite a 2-paragraph research note evaluating key technical signals, price action, and trend outlook for ${ticker}.` }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenRouter API call failed. ${await readOpenRouterError(response)}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Research synthesis unavailable.';
}

async function readOpenRouterError(response) {
  let message = '';
  try {
    const body = await response.json();
    const err = body.error ?? body;
    message = err.message || '';
  } catch {}
  const hint = {
    401: 'API key is invalid or unauthorized',
    402: 'Insufficient OpenRouter credits',
    429: 'Rate limit reached'
  }[response.status];
  return [`(HTTP ${response.status})`, hint, message].filter(Boolean).join(' ');
}

// Technical Calculations
function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ date: data[i].date, val: null });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ date: data[i].date, val: sum / period });
    }
  }
  return result;
}

function calculateEMA(data, period) {
  const result = [];
  const k = 2 / (period + 1);
  let prevEma = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ date: data[i].date, val: null });
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      prevEma = sum / period;
      result.push({ date: data[i].date, val: prevEma });
    } else {
      const currentEma = (data[i].close * k) + (prevEma * (1 - k));
      prevEma = currentEma;
      result.push({ date: data[i].date, val: currentEma });
    }
  }
  return result;
}

function calculateBollingerBands(data, period = 20, stdDevMultiplier = 2) {
  const sma = calculateSMA(data, period);
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || sma[i].val === null) {
      result.push({ date: data[i].date, middle: null, upper: null, lower: null });
    } else {
      const mean = sma[i].val;
      let varianceSum = 0;
      for (let j = 0; j < period; j++) {
        varianceSum += Math.pow(data[i - j].close - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);
      result.push({
        date: data[i].date,
        middle: mean,
        upper: mean + (stdDevMultiplier * stdDev),
        lower: mean - (stdDevMultiplier * stdDev)
      });
    }
  }
  return result;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);

  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEma[i].val === null || slowEma[i].val === null) {
      macdLine.push({ date: data[i].date, close: 0 });
    } else {
      macdLine.push({ date: data[i].date, close: fastEma[i].val - slowEma[i].val });
    }
  }

  const signalEma = calculateEMA(macdLine, signalPeriod);

  return data.map((d, i) => {
    const macdVal = (fastEma[i].val !== null && slowEma[i].val !== null) ? (fastEma[i].val - slowEma[i].val) : null;
    const signalVal = signalEma[i].val;
    const histogram = (macdVal !== null && signalVal !== null) ? macdVal - signalVal : null;
    return {
      date: d.date,
      macd: macdVal,
      signal: signalVal,
      histogram: histogram
    };
  });
}

function calculateRSI(data, period = 14) {
  const rsiValues = new Array(data.length).fill(null);
  if (data.length <= period) return rsiValues;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsiValues[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 1);
    rsiValues[i] = 100 - (100 / (1 + rs));
  }

  return rsiValues;
}

// Realistic Simulated Data Generator
function generateDemoPriceData(ticker) {
  const days = 90;
  const basePrices = {
    NVDA: 128.50,
    AAPL: 224.20,
    MSFT: 445.80,
    TSLA: 252.10,
    AMZN: 186.40,
    SPY: 552.30,
    BTC: 64200.00
  };

  let currentPrice = basePrices[ticker] || (Math.abs(hashString(ticker) % 300) + 50);
  const result = [];

  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    
    // Geometric Brownian Motion simulation
    const volatility = 0.022;
    const drift = 0.0008;
    const changePercent = drift + (Math.random() - 0.48) * volatility;
    
    const open = currentPrice;
    const close = Math.max(5, open * (1 + changePercent));
    const high = Math.max(open, close) * (1 + Math.random() * 0.012);
    const low = Math.min(open, close) * (1 - Math.random() * 0.012);
    const volume = Math.floor(15000000 + Math.random() * 45000000);

    result.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: volume
    });

    currentPrice = close;
  }

  return result;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function generateDemoResearchNote(ticker, priceData) {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const pctChange = ((latest.close - first.close) / first.close) * 100;
  const direction = pctChange >= 0 ? 'bullish momentum' : 'corrective phase';
  const sma20 = calculateSMA(priceData, 20);
  const latestSma20 = sma20[sma20.length - 1]?.val ?? latest.close;

  return `Over the analyzed 90-day trading window, **$${ticker}** demonstrates a **${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%** overall price trajectory, closing most recently at **$${latest.close.toFixed(2)}**. The asset is currently trading ${latest.close >= latestSma20 ? 'above' : 'below'} its 20-day simple moving average ($${latestSma20.toFixed(2)}), signalling a ${direction} with key support established near the 50-day moving average.

Quantitative indicator metrics highlight strong volume distribution during upward impulse legs, accompanied by key consolidation ranges. Technical risk management points to watching near-term resistance thresholds, with favorable risk-reward dynamics for momentum-driven exposure.`;
}

// Render Dashboard UI
function renderDashboard(ticker, priceData, note, isSimulated) {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const priceDiff = latest.close - first.close;
  const pctChange = (priceDiff / first.close) * 100;
  const isPositive = priceDiff >= 0;

  // Highs and Lows
  const highs = priceData.map(d => d.high);
  const lows = priceData.map(d => d.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  // Technical Calculations
  const sma20Arr = calculateSMA(priceData, 20);
  const sma50Arr = calculateSMA(priceData, 50);
  const ema20Arr = calculateEMA(priceData, 20);
  const bollingerArr = calculateBollingerBands(priceData, 20, 2);
  const macdArr = calculateMACD(priceData, 12, 26, 9);
  const rsiArr = calculateRSI(priceData, 14);

  const latestSma20 = sma20Arr[sma20Arr.length - 1]?.val;
  const latestSma50 = sma50Arr[sma50Arr.length - 1]?.val;
  const latestEma20 = ema20Arr[ema20Arr.length - 1]?.val;
  const latestBollinger = bollingerArr[bollingerArr.length - 1];
  const latestMacd = macdArr[macdArr.length - 1];
  const latestRsi = rsiArr[rsiArr.length - 1];

  let sentiment = 'neutral';
  let sentimentText = 'NEUTRAL HOLD';
  if (latestRsi > 60 && isPositive && latest.close > (latestSma20 || 0)) {
    sentiment = 'bullish';
    sentimentText = 'BULLISH OUTLOOK';
  } else if (latestRsi < 40 && !isPositive && latest.close < (latestSma20 || 0)) {
    sentiment = 'bearish';
    sentimentText = 'BEARISH CAUTION';
  }

  // Calculate MACD Crossover signal
  let macdSignalStr = 'Neutral';
  if (latestMacd?.histogram !== null) {
    macdSignalStr = latestMacd.histogram > 0 ? 'Bullish Expansion' : 'Bearish Divergence';
  }

  // Calculate Bollinger Band width
  let bBandWidthStr = 'N/A';
  if (latestBollinger?.upper && latestBollinger?.lower && latestBollinger?.middle) {
    const widthPct = ((latestBollinger.upper - latestBollinger.lower) / latestBollinger.middle) * 100;
    bBandWidthStr = `${widthPct.toFixed(1)}%`;
  }

  const tickerCompanyNames = {
    NVDA: 'NVIDIA Corporation',
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    TSLA: 'Tesla, Inc.',
    AMZN: 'Amazon.com, Inc.',
    SPY: 'SPDR S&P 500 ETF Trust',
    BTC: 'Bitcoin USD'
  };

  results.innerHTML = `
    <div class="dashboard-view">
      <!-- Header Banner -->
      <div class="ticker-banner">
        <div>
          <div class="ticker-meta">
            <span class="ticker-symbol-badge">$${ticker}</span>
            <span class="sentiment-tag ${sentiment}">${sentimentText}</span>
            ${isSimulated ? '<span class="sentiment-tag neutral" style="font-size: 0.65rem;">DEMO FEED</span>' : ''}
          </div>
          <div class="ticker-full-name">${tickerCompanyNames[ticker] || `${ticker} Equity`}</div>
        </div>

        <div class="price-block">
          <div class="current-price">$${latest.close.toFixed(2)}</div>
          <div class="price-change-row ${isPositive ? 'bullish' : 'bearish'}">
            <span>${isPositive ? '▲' : '▼'} $${Math.abs(priceDiff).toFixed(2)} (${isPositive ? '+' : ''}${pctChange.toFixed(2)}%)</span>
          </div>
          <div class="date-subtitle">Last Updated: ${latest.date}</div>
        </div>
      </div>

      <!-- Key Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-card-title">90-Day High</span>
          <span class="metric-card-val">$${maxHigh.toFixed(2)}</span>
          <span class="metric-card-sub">Peak valuation</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">90-Day Low</span>
          <span class="metric-card-val">$${minLow.toFixed(2)}</span>
          <span class="metric-card-sub">Local floor</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">SMA (20)</span>
          <span class="metric-card-val">$${latestSma20 ? latestSma20.toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">20-Day trend</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">SMA (50)</span>
          <span class="metric-card-val">$${latestSma50 ? latestSma50.toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">50-Day baseline</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">EMA (20)</span>
          <span class="metric-card-val">$${latestEma20 ? latestEma20.toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">Exp moving avg</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">RSI (14)</span>
          <span class="metric-card-val">${latestRsi ? latestRsi.toFixed(1) : 'N/A'}</span>
          <span class="metric-card-sub">${latestRsi > 70 ? 'Overbought' : latestRsi < 30 ? 'Oversold' : 'Neutral Range'}</span>
        </div>
      </div>

      <!-- Technical Indicator Summary Cards -->
      <div class="ai-highlights-grid" style="margin-bottom: 1.25rem;">
        <div class="highlight-box">
          <div class="highlight-title">Moving Average Alignment</div>
          <div class="highlight-val">${latestSma20 && latestSma50 ? (latestSma20 >= latestSma50 ? 'Golden Bullish (SMA20 > 50)' : 'Death Bearish (SMA20 < 50)') : 'Calculating...'}</div>
        </div>
        <div class="highlight-box">
          <div class="highlight-title">MACD Momentum Signal</div>
          <div class="highlight-val">${macdSignalStr}</div>
        </div>
        <div class="highlight-box">
          <div class="highlight-title">Bollinger Band Width</div>
          <div class="highlight-val">${bBandWidthStr} (Vol Spurt)</div>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-container">
        <div class="chart-controls">
          <div class="chart-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Price Action History (90 Trading Days)
          </div>
          <div id="chart-legend-items">
            <span class="legend-item"><span class="legend-color" style="background: #7a1c30;"></span> Close Price</span>
            <span class="legend-item"><span class="legend-color" style="background: #c59b27;"></span> SMA20</span>
            <span class="legend-item"><span class="legend-color" style="background: #2d6a4f;"></span> SMA50</span>
            <span class="legend-item"><span class="legend-color" style="background: #2563eb;"></span> EMA20</span>
            <span class="legend-item"><span class="legend-color" style="background: #9333ea;"></span> Bollinger</span>
          </div>
        </div>
        <div class="canvas-wrapper">
          <canvas id="priceChartCanvas"></canvas>
        </div>
      </div>

      <!-- AI Research Synthesis Note -->
      <div class="ai-note-card">
        <div class="ai-note-header">
          <div class="ai-note-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            AI Financial Research Synthesis
          </div>
          <button class="copy-note-btn" id="copy-note-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Note</span>
          </button>
        </div>
        
        <div class="ai-note-content">
          ${formatNoteText(note)}
        </div>

        <div class="ai-highlights-grid">
          <div class="highlight-box">
            <div class="highlight-title">Technical Stance</div>
            <div class="highlight-val">${sentimentText}</div>
          </div>
          <div class="highlight-box">
            <div class="highlight-title">Volatility Index</div>
            <div class="highlight-val">${(Math.abs(pctChange) / 3).toFixed(2)}% / Period</div>
          </div>
          <div class="highlight-box">
            <div class="highlight-title">Primary Support</div>
            <div class="highlight-val">$${(minLow * 1.01).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render Canvas Chart
  renderChart(priceData);

  // Bind indicator toggles to re-render chart dynamically
  ['toggle-sma20', 'toggle-sma50', 'toggle-ema20', 'toggle-bollinger', 'toggle-volume'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderChart(priceData);
    });
  });

  // Bind copy button
  document.getElementById('copy-note-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(note);
    const btn = document.getElementById('copy-note-btn');
    if (btn) {
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy Note</span>
        `;
      }, 2000);
    }
  });
}

function formatNoteText(text) {
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
}

// Canvas Chart Renderer
function renderChart(data) {
  const canvas = document.getElementById('priceChartCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  // Clear background
  ctx.clearRect(0, 0, width, height);

  const showSma20 = document.getElementById('toggle-sma20')?.checked ?? true;
  const showSma50 = document.getElementById('toggle-sma50')?.checked ?? true;
  const showEma20 = document.getElementById('toggle-ema20')?.checked ?? true;
  const showBollinger = document.getElementById('toggle-bollinger')?.checked ?? true;
  const showVolume = document.getElementById('toggle-volume')?.checked ?? true;

  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema20 = calculateEMA(data, 20);
  const bollinger = calculateBollingerBands(data, 20, 2);

  const prices = data.map(d => d.close);
  let minPrice = Math.min(...prices) * 0.98;
  let maxPrice = Math.max(...prices) * 1.02;

  if (showBollinger) {
    const validUpper = bollinger.filter(b => b.upper !== null).map(b => b.upper);
    const validLower = bollinger.filter(b => b.lower !== null).map(b => b.lower);
    if (validUpper.length && validLower.length) {
      maxPrice = Math.max(maxPrice, ...validUpper) * 1.01;
      minPrice = Math.min(minPrice, ...validLower) * 0.99;
    }
  }

  const maxVol = Math.max(...data.map(d => d.volume));

  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Draw Grid Lines & Y-Axis Labels
  ctx.strokeStyle = '#e3d9cd';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#6b5a5c';
  ctx.font = '10px JetBrains Mono, monospace';

  const gridRows = 4;
  for (let i = 0; i <= gridRows; i++) {
    const y = paddingTop + (chartHeight / gridRows) * i;
    const priceVal = maxPrice - ((maxPrice - minPrice) / gridRows) * i;

    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    ctx.fillText(`$${priceVal.toFixed(1)}`, 5, y + 3);
  }

  // Draw Date Labels on X-Axis
  const dateSteps = 5;
  for (let i = 0; i <= dateSteps; i++) {
    const dataIdx = Math.floor((data.length - 1) * (i / dateSteps));
    const x = paddingLeft + (chartWidth * (i / dateSteps));
    const dStr = data[dataIdx]?.date.slice(5) || '';
    ctx.fillText(dStr, x - 12, height - 8);
  }

  // Draw Volume Bars if toggled
  if (showVolume) {
    const barWidth = Math.max(2, (chartWidth / data.length) * 0.6);
    data.forEach((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
      const volHeight = (d.volume / maxVol) * (chartHeight * 0.25);
      const y = paddingTop + chartHeight - volHeight;
      ctx.fillStyle = d.close >= d.open ? 'rgba(45, 106, 79, 0.3)' : 'rgba(166, 28, 28, 0.3)';
      ctx.fillRect(x - barWidth / 2, y, barWidth, volHeight);
    });
  }

  // Price Coordinates Calculation Function
  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minPrice) / (maxPrice - minPrice)) * chartHeight;

  // Draw Bollinger Bands (Envelope area fill + dotted bounds)
  if (showBollinger) {
    ctx.beginPath();
    let started = false;
    bollinger.forEach((b, i) => {
      if (b.upper !== null) {
        const x = getX(i);
        const y = getY(b.upper);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    for (let i = bollinger.length - 1; i >= 0; i--) {
      if (bollinger[i].lower !== null) {
        ctx.lineTo(getX(i), getY(bollinger[i].lower));
      }
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(147, 51, 234, 0.08)';
    ctx.fill();

    // Upper Line
    ctx.beginPath();
    started = false;
    bollinger.forEach((b, i) => {
      if (b.upper !== null) {
        const x = getX(i);
        const y = getY(b.upper);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
    });
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lower Line
    ctx.beginPath();
    started = false;
    bollinger.forEach((b, i) => {
      if (b.lower !== null) {
        const x = getX(i);
        const y = getY(b.lower);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
  }

  // Draw Area Fill Gradient under main price line
  const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
  gradient.addColorStop(0, 'rgba(122, 28, 48, 0.18)');
  gradient.addColorStop(1, 'rgba(122, 28, 48, 0.0)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(data[0].close));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(getX(i), getY(data[i].close));
  }
  ctx.lineTo(getX(data.length - 1), paddingTop + chartHeight);
  ctx.lineTo(getX(0), paddingTop + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw EMA 20 line
  if (showEma20) {
    ctx.beginPath();
    let started = false;
    ema20.forEach((pt, i) => {
      if (pt.val !== null) {
        const x = getX(i);
        const y = getY(pt.val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw SMA 50 line
  if (showSma50) {
    ctx.beginPath();
    let started = false;
    sma50.forEach((pt, i) => {
      if (pt.val !== null) {
        const x = getX(i);
        const y = getY(pt.val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw SMA 20 line
  if (showSma20) {
    ctx.beginPath();
    let started = false;
    sma20.forEach((pt, i) => {
      if (pt.val !== null) {
        const x = getX(i);
        const y = getY(pt.val);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw Main Price Line
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(data[0].close));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(getX(i), getY(data[i].close));
  }
  ctx.strokeStyle = '#7a1c30';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Highlight latest price point dot
  const lastIdx = data.length - 1;
  const lastX = getX(lastIdx);
  const lastY = getY(data[lastIdx].close);

  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#7a1c30';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

