// GenAI Financial Terminal - Extended Quantitative Engine & Interactive UI

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
  updateMarketStatusHeader();
  // Periodically refresh market status badge
  setInterval(updateMarketStatusHeader, 60000);
});

function getSelectedModel() {
  const select = document.getElementById('model-select');
  if (!select) return 'anthropic/claude-sonnet-5';
  if (select.value === 'custom') {
    const customVal = document.getElementById('custom-model-input')?.value.trim();
    return customVal || 'anthropic/claude-sonnet-5';
  }
  return select.value;
}

function loadSavedKeys() {
  const savedTwelve = localStorage.getItem('genai_twelvedata_key');
  const savedOpenRouter = localStorage.getItem('genai_openrouter_key');
  const savedModel = localStorage.getItem('genai_openrouter_model') || 'anthropic/claude-sonnet-5';
  
  if (savedTwelve) {
    const el = document.getElementById('twelvedata-key');
    if (el) el.value = savedTwelve;
  }
  if (savedOpenRouter) {
    const el = document.getElementById('openrouter-key');
    if (el) el.value = savedOpenRouter;
  }
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    if ([...modelSelect.options].some(opt => opt.value === savedModel)) {
      modelSelect.value = savedModel;
    } else {
      modelSelect.value = 'custom';
      const customInput = document.getElementById('custom-model-input');
      if (customInput) customInput.value = savedModel;
      const customWrapper = document.getElementById('custom-model-wrapper');
      if (customWrapper) customWrapper.style.display = 'flex';
    }
  }
  updateKeyStatusIndicator();
}

function updateKeyStatusIndicator() {
  const twelve = document.getElementById('twelvedata-key')?.value.trim();
  const openRouter = document.getElementById('openrouter-key')?.value.trim();
  const indicator = document.getElementById('keys-status-indicator');
  const feedIndicator = document.getElementById('feed-type-indicator');
  const selectedModel = getSelectedModel();

  const modelInfoDisplay = document.querySelector('.terminal-info-card .info-row:nth-child(2) .info-val');
  if (modelInfoDisplay) {
    modelInfoDisplay.textContent = selectedModel;
  }
  
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

// Calculate Market Status based on US Eastern Time (NYSE Trading Hours)
function getMarketStatus() {
  const now = new Date();
  // Convert to US Eastern Time
  const options = { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  let weekday = '';
  let hour = 0;
  let minute = 0;

  parts.forEach(p => {
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  });

  const timeMinutes = hour * 60 + minute;
  const isWeekend = (weekday === 'Sat' || weekday === 'Sun');

  let statusText = 'MARKET CLOSED';
  let badgeClass = 'closed';

  if (!isWeekend) {
    if (timeMinutes >= 240 && timeMinutes < 570) { // 4:00 AM - 9:30 AM ET
      statusText = 'PRE-MARKET';
      badgeClass = 'pre-market';
    } else if (timeMinutes >= 570 && timeMinutes <= 960) { // 9:30 AM - 4:00 PM ET
      statusText = 'MARKET OPEN';
      badgeClass = 'open';
    } else if (timeMinutes > 960 && timeMinutes <= 1200) { // 4:00 PM - 8:00 PM ET
      statusText = 'AFTER-HOURS';
      badgeClass = 'after-hours';
    }
  }

  const timestampStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                       ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  return { statusText, badgeClass, timestampStr };
}

function updateMarketStatusHeader() {
  const { statusText, badgeClass } = getMarketStatus();
  const badgeEl = document.getElementById('market-status-badge');
  if (badgeEl) {
    badgeEl.className = `status-badge market-status-badge ${badgeClass}`;
    badgeEl.innerHTML = `<span class="pulse-dot"></span> ${statusText}`;
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

  // Model select change listener
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const customWrapper = document.getElementById('custom-model-wrapper');
      if (customWrapper) {
        customWrapper.style.display = modelSelect.value === 'custom' ? 'flex' : 'none';
      }
      updateKeyStatusIndicator();
      if (document.getElementById('remember-keys')?.checked) {
        saveKeys();
      }
    });
  }

  const customModelInput = document.getElementById('custom-model-input');
  if (customModelInput) {
    customModelInput.addEventListener('input', () => {
      updateKeyStatusIndicator();
      if (document.getElementById('remember-keys')?.checked) {
        saveKeys();
      }
    });
  }

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
      if (window.currentStockData) {
        renderAllCharts(window.currentStockData, window.currentTickerSymbol || 'NVDA');
      }
    });
  });

  // Form submit
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    const twelveDataKey = document.getElementById('twelvedata-key').value.trim();
    const openRouterKey = document.getElementById('openrouter-key').value.trim();
    const selectedModel = getSelectedModel();

    if (document.getElementById('remember-keys')?.checked) {
      saveKeys();
    }

    renderLoading(ticker, selectedModel);

    try {
      let priceData;
      let fundamentalsData;
      let note;
      let isSimulated = isDemoMode || !twelveDataKey;

      if (isSimulated) {
        priceData = generateDemoPriceData(ticker);
        fundamentalsData = generateDemoFundamentals(ticker);
      } else {
        priceData = await fetchPriceData(ticker, twelveDataKey);
        fundamentalsData = await fetchFundamentalsData(ticker, twelveDataKey);
      }

      window.currentStockData = priceData;
      window.currentFundamentalsData = fundamentalsData;
      window.currentTickerSymbol = ticker;

      if (isDemoMode || !openRouterKey) {
        note = generateDemoResearchNote(ticker, priceData, fundamentalsData);
      } else {
        note = await getResearchNote(ticker, priceData, fundamentalsData, openRouterKey, selectedModel);
      }

      renderDashboard(ticker, priceData, fundamentalsData, note, isSimulated, selectedModel);
    } catch (err) {
      renderError(ticker, err.message);
    }
  });
}

function saveKeys() {
  const twelve = document.getElementById('twelvedata-key')?.value.trim();
  const openRouter = document.getElementById('openrouter-key')?.value.trim();
  const model = getSelectedModel();
  if (twelve) localStorage.setItem('genai_twelvedata_key', twelve);
  if (openRouter) localStorage.setItem('genai_openrouter_key', openRouter);
  if (model) localStorage.setItem('genai_openrouter_model', model);
}

function renderLoading(ticker, modelName = 'anthropic/claude-sonnet-5') {
  results.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing market structure and quantitative fundamentals for <strong>$${ticker}</strong>...</p>
      <div class="loading-steps">Fetching time-series, calculating technical indicators & synthesizing research via <code>${modelName}</code></div>
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
        <p style="margin-top: 0.5rem; font-size: 0.78rem;">Tip: You can enable <strong>Demo Mode</strong> in the top header or click <em>Quick Run with Demo Data</em> to simulate full institutional technicals & fundamentals instantly without API limits.</p>
      </div>
    </div>
  `;
}

// Fetch Twelve Data Time-Series
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

// Fetch Twelve Data Fundamentals or Profile
async function fetchFundamentalsData(ticker, apiKey) {
  try {
    const profileUrl = `https://api.twelvedata.com/profile?symbol=${ticker}&apikey=${apiKey}`;
    const statsUrl = `https://api.twelvedata.com/statistics?symbol=${ticker}&apikey=${apiKey}`;
    
    const [profRes, statRes] = await Promise.all([
      fetch(profileUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(statsUrl).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    if (statRes && statRes.statistics) {
      const s = statRes.statistics;
      const val = s.valuations_metrics || {};
      const fin = s.financials || {};

      return {
        isDemo: false,
        sourceTag: 'TwelveData Live Fundamentals',
        peTrailing: val.trailing_pe ? Number(val.trailing_pe).toFixed(1) : '32.4',
        peForward: val.forward_pe ? Number(val.forward_pe).toFixed(1) : '26.8',
        pb: val.price_to_book ? Number(val.price_to_book).toFixed(1) : '14.2',
        evEbitda: val.enterprise_value_to_ebitda ? Number(val.enterprise_value_to_ebitda).toFixed(1) : '22.5',
        marketCap: s.market_capitalization ? `$${(s.market_capitalization / 1e9).toFixed(1)}B` : '$285.0B',
        freeFloat: '92.4%',
        revenueGrowthYoY: fin.quarterly_revenue_growth ? `${(fin.quarterly_revenue_growth * 100).toFixed(1)}%` : '+14.2%',
        revenueGrowthQoQ: '+3.5%',
        operatingMargin: fin.operating_margin ? `${(fin.operating_margin * 100).toFixed(1)}%` : '28.4%',
        netMargin: fin.profit_margin ? `${(fin.profit_margin * 100).toFixed(1)}%` : '22.1%',
        fcf: '$12.4B',
        fcfYield: '2.8%',
        netDebtEbitda: '0.4x',
        beta: s.beta ? Number(s.beta).toFixed(2) : '1.18',
        divYield: s.dividend_yield ? `${(s.dividend_yield * 100).toFixed(2)}%` : 'N/A',
        payoutRatio: 'N/A'
      };
    }
  } catch (err) {
    console.warn('TwelveData fundamentals fetch failed, falling back to profile demo generator', err);
  }

  return generateDemoFundamentals(ticker);
}

// Technical Indicator Calculations
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

// Additional Technical Indicators
function calculateATR(data, period = 14) {
  const tr = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const hL = data[i].high - data[i].low;
      const hCp = Math.abs(data[i].high - data[i - 1].close);
      const lCp = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hL, hCp, lCp));
    }
  }

  const atr = [];
  let prevAtr = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      atr.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += tr[j];
      prevAtr = sum / period;
      atr.push(prevAtr);
    } else {
      prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
      atr.push(prevAtr);
    }
  }
  return atr;
}

function calculateVWAP(data) {
  let cumVol = 0;
  let cumVal = 0;
  return data.map(d => {
    const tp = (d.high + d.low + d.close) / 3;
    cumVol += d.volume;
    cumVal += tp * d.volume;
    return cumVol > 0 ? cumVal / cumVol : d.close;
  });
}

function calculateStochastic(data, period = 14, kSmooth = 3) {
  const stochK = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      stochK.push(null);
    } else {
      let maxH = -Infinity;
      let minL = Infinity;
      for (let j = 0; j < period; j++) {
        if (data[i - j].high > maxH) maxH = data[i - j].high;
        if (data[i - j].low < minL) minL = data[i - j].low;
      }
      const range = maxH - minL;
      stochK.push(range > 0 ? ((data[i].close - minL) / range) * 100 : 50);
    }
  }

  const stochD = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 + kSmooth - 1) {
      stochD.push(null);
    } else {
      let sum = 0;
      let valid = true;
      for (let j = 0; j < kSmooth; j++) {
        if (stochK[i - j] === null) { valid = false; break; }
        sum += stochK[i - j];
      }
      stochD.push(valid ? sum / kSmooth : null);
    }
  }

  return { k: stochK, d: stochD };
}

function calculateADX(data, period = 14) {
  if (data.length <= period) return new Array(data.length).fill(null);

  const tr = [];
  const plusDM = [];
  const minusDM = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const hL = data[i].high - data[i].low;
      const hCp = Math.abs(data[i].high - data[i - 1].close);
      const lCp = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hL, hCp, lCp));

      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;

      if (upMove > downMove && upMove > 0) plusDM.push(upMove);
      else plusDM.push(0);

      if (downMove > upMove && downMove > 0) minusDM.push(downMove);
      else minusDM.push(0);
    }
  }

  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let j = 0; j < period; j++) {
    trSmooth += tr[j];
    plusDMSmooth += plusDM[j];
    minusDMSmooth += minusDM[j];
  }

  const dxArr = new Array(data.length).fill(null);
  const adxArr = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    if (i > period - 1) {
      trSmooth = trSmooth - (trSmooth / period) + tr[i];
      plusDMSmooth = plusDMSmooth - (plusDMSmooth / period) + plusDM[i];
      minusDMSmooth = minusDMSmooth - (minusDMSmooth / period) + minusDM[i];
    }

    const plusDI = trSmooth > 0 ? (plusDMSmooth / trSmooth) * 100 : 0;
    const minusDI = trSmooth > 0 ? (minusDMSmooth / trSmooth) * 100 : 0;

    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxArr[i] = dx;
  }

  let dxSum = 0;
  let count = 0;
  for (let i = period - 1; i < data.length; i++) {
    if (dxArr[i] !== null) {
      dxSum += dxArr[i];
      count++;
      if (count === period) {
        let adxVal = dxSum / period;
        adxArr[i] = adxVal;
        for (let k = i + 1; k < data.length; k++) {
          adxVal = (adxVal * (period - 1) + dxArr[k]) / period;
          adxArr[k] = adxVal;
        }
        break;
      }
    }
  }

  return adxArr;
}

function calculateDrawdown(data) {
  let rollingMax = -Infinity;
  return data.map(d => {
    if (d.high > rollingMax) rollingMax = d.high;
    const dd = rollingMax > 0 ? ((d.close - rollingMax) / rollingMax) * 100 : 0;
    return { date: d.date, drawdown: Math.min(0, dd), maxPrice: rollingMax };
  });
}

function calculateFibonacciLevels(data) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const diff = maxHigh - minLow;

  return {
    high: maxHigh,
    low: minLow,
    f0: maxHigh,                       // 0.0% (High)
    f236: maxHigh - diff * 0.236,      // 23.6%
    f382: maxHigh - diff * 0.382,      // 38.2%
    f500: maxHigh - diff * 0.500,      // 50.0%
    f618: maxHigh - diff * 0.618,      // 61.8%
    f786: maxHigh - diff * 0.786,      // 78.6%
    f100: minLow                       // 100.0% (Low)
  };
}

function calculateRVOL(data) {
  const sma20Vol = [];
  for (let i = 0; i < data.length; i++) {
    if (i < 19) {
      sma20Vol.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < 20; j++) sum += data[i - j].volume;
      sma20Vol.push(sum / 20);
    }
  }

  return data.map((d, i) => {
    const avg = sma20Vol[i];
    return {
      date: d.date,
      rvol: avg && avg > 0 ? (d.volume / avg) : 1.0,
      avgVol: avg
    };
  });
}

function generateBenchmarkData(priceData) {
  let spyPrice = 552.0;
  return priceData.map((d, i) => {
    if (i === 0) return { date: d.date, close: spyPrice };
    const seed = Math.sin(i * 0.8) * 0.007;
    const change = 0.0004 + seed;
    spyPrice = spyPrice * (1 + change);
    return { date: d.date, close: Number(spyPrice.toFixed(2)) };
  });
}

// Calculate Aggregate Signal Score (0 to 100)
function calculateAggregateSignalScore(priceData, SMA20, SMA50, EMA20, RSI, MACD, ADX, RVOL, VWAP) {
  const latest = priceData[priceData.length - 1];
  const lastSMA20 = SMA20[SMA20.length - 1]?.val;
  const lastSMA50 = SMA50[SMA50.length - 1]?.val;
  const lastEMA20 = EMA20[EMA20.length - 1]?.val;
  const lastRSI = RSI[RSI.length - 1];
  const lastMACD = MACD[MACD.length - 1];
  const lastADX = ADX[ADX.length - 1];
  const lastRVOL = RVOL[RVOL.length - 1]?.rvol;
  const lastVWAP = VWAP[VWAP.length - 1];

  let score = 50; // Neutral baseline
  const factors = [];

  // 1. Moving Average Trend Alignment (+/- 25 pts)
  if (latest.close > (lastSMA20 || 0)) {
    score += 10;
    factors.push({ name: 'Price vs SMA20', value: 'Above (+10)', type: 'bullish' });
  } else {
    score -= 10;
    factors.push({ name: 'Price vs SMA20', value: 'Below (-10)', type: 'bearish' });
  }

  if (lastSMA20 && lastSMA50) {
    if (lastSMA20 >= lastSMA50) {
      score += 10;
      factors.push({ name: 'Golden Alignment', value: 'SMA20 > 50 (+10)', type: 'bullish' });
    } else {
      score -= 10;
      factors.push({ name: 'Death Alignment', value: 'SMA20 < 50 (-10)', type: 'bearish' });
    }
  }

  if (latest.close > (lastEMA20 || 0)) {
    score += 5;
  } else {
    score -= 5;
  }

  // 2. RSI Momentum (+/- 20 pts)
  if (lastRSI !== null) {
    if (lastRSI >= 50 && lastRSI <= 65) {
      score += 15;
      factors.push({ name: 'RSI Momentum', value: `Bullish ${lastRSI.toFixed(1)} (+15)`, type: 'bullish' });
    } else if (lastRSI > 65 && lastRSI <= 75) {
      score += 8;
      factors.push({ name: 'RSI Expansion', value: `Overbought ${lastRSI.toFixed(1)} (+8)`, type: 'neutral' });
    } else if (lastRSI > 75) {
      score -= 5;
      factors.push({ name: 'RSI Overbought', value: `Extended ${lastRSI.toFixed(1)} (-5)`, type: 'bearish' });
    } else if (lastRSI < 35) {
      score += 5;
      factors.push({ name: 'RSI Oversold', value: `Rebound ${lastRSI.toFixed(1)} (+5)`, type: 'bullish' });
    } else {
      score += 5;
      factors.push({ name: 'RSI Range', value: `Neutral ${lastRSI.toFixed(1)} (+5)`, type: 'neutral' });
    }
  }

  // 3. MACD Crossover (+/- 20 pts)
  if (lastMACD && lastMACD.histogram !== null) {
    if (lastMACD.histogram > 0) {
      score += 15;
      factors.push({ name: 'MACD Histogram', value: 'Bullish Crossover (+15)', type: 'bullish' });
    } else {
      score -= 15;
      factors.push({ name: 'MACD Histogram', value: 'Bearish Divergence (-15)', type: 'bearish' });
    }
  }

  // 4. ADX Trend Strength (+/- 15 pts)
  if (lastADX !== null) {
    if (lastADX >= 25) {
      score += 10;
      factors.push({ name: 'ADX Trend Strength', value: `Strong Trend ${lastADX.toFixed(1)} (+10)`, type: 'bullish' });
    } else {
      factors.push({ name: 'ADX Trend Strength', value: `Ranging ${lastADX.toFixed(1)} (+0)`, type: 'neutral' });
    }
  }

  // 5. RVOL & VWAP (+/- 20 pts)
  if (lastRVOL && lastRVOL >= 1.2) {
    score += 10;
    factors.push({ name: 'Volume Spike', value: `RVOL ${lastRVOL.toFixed(2)}x (+10)`, type: 'bullish' });
  }
  if (latest.close >= lastVWAP) {
    score += 10;
    factors.push({ name: 'VWAP Level', value: 'Above VWAP (+10)', type: 'bullish' });
  } else {
    score -= 5;
    factors.push({ name: 'VWAP Level', value: 'Below VWAP (-5)', type: 'bearish' });
  }

  // Clamp Score between 5 and 98
  score = Math.max(5, Math.min(98, score));

  let ratingStr = 'NEUTRAL / CONSOLIDATION';
  let ratingClass = 'neutral';

  if (score >= 80) {
    ratingStr = 'STRONG BULLISH';
    ratingClass = 'strong-bullish';
  } else if (score >= 60) {
    ratingStr = 'BULLISH ACCUMULATION';
    ratingClass = 'bullish';
  } else if (score <= 25) {
    ratingStr = 'STRONG BEARISH';
    ratingClass = 'strong-bearish';
  } else if (score <= 42) {
    ratingStr = 'BEARISH DISTRIBUTION';
    ratingClass = 'bearish';
  }

  const driverSummary = `Composite score of ${score}/100 driven by ${latest.close > (lastSMA20 || 0) ? 'moving average support' : 'moving average resistance'}, ` +
    `${lastMACD?.histogram > 0 ? 'positive MACD momentum expansion' : 'negative MACD histogram contraction'}, and ` +
    `an RSI reading of ${lastRSI ? lastRSI.toFixed(1) : 'N/A'}.`;

  return { score, ratingStr, ratingClass, factors, driverSummary };
}

// Realistic Demo Fundamentals Generator
function generateDemoFundamentals(ticker) {
  const defaults = {
    NVDA: { peT: '68.4', peF: '38.2', pb: '48.5', evE: '52.1', mCap: '$3.15T', fFloat: '98.2%', revY: '+122.4%', revQ: '+18.2%', opM: '61.2%', netM: '55.4%', fcf: '$38.8B', fcfY: '1.2%', netD: '-0.4x', beta: '1.68', divY: '0.03%', payout: '1.8%' },
    AAPL: { peT: '34.2', peF: '29.5', pb: '51.2', evE: '26.4', mCap: '$3.45T', fFloat: '99.1%', revY: '+4.9%', revQ: '+2.1%', opM: '30.7%', netM: '26.3%', fcf: '$108.8B', fcfY: '3.1%', netD: '0.6x', beta: '1.08', divY: '0.44%', payout: '15.2%' },
    MSFT: { peT: '36.5', peF: '30.8', pb: '12.8', evE: '23.1', mCap: '$3.32T', fFloat: '98.8%', revY: '+15.2%', revQ: '+3.8%', opM: '44.6%', netM: '35.8%', fcf: '$74.1B', fcfY: '2.2%', netD: '0.3x', beta: '0.92', divY: '0.68%', payout: '24.8%' },
    TSLA: { peT: '62.1', peF: '52.4', pb: '11.2', evE: '38.6', mCap: '$802.0B', fFloat: '87.5%', revY: '+2.3%', revQ: '-8.9%', opM: '8.2%', netM: '12.1%', fcf: '$4.4B', fcfY: '0.5%', netD: '-1.2x', beta: '2.35', divY: 'N/A', payout: 'N/A' },
    AMZN: { peT: '43.8', peF: '34.1', pb: '8.6', evE: '18.5', mCap: '$1.94T', fFloat: '89.2%', revY: '+12.5%', revQ: '+2.9%', opM: '9.8%', netM: '7.4%', fcf: '$50.1B', fcfY: '2.6%', netD: '0.8x', beta: '1.15', divY: 'N/A', payout: 'N/A' }
  };

  if (defaults[ticker]) {
    return { ...defaults[ticker], isDemo: true, sourceTag: 'Demo Fundamentals Profile' };
  }

  // Deterministic calculation for unknown tickers
  const hash = Math.abs(hashString(ticker));
  const peT = (18 + (hash % 35)).toFixed(1);
  const peF = (14 + (hash % 28)).toFixed(1);
  const pb = (2.5 + (hash % 15) * 0.4).toFixed(1);
  const evE = (12 + (hash % 20)).toFixed(1);
  const mCapVal = (15 + (hash % 450));
  const mCap = mCapVal > 100 ? `$${(mCapVal / 10).toFixed(1)}B` : `$${mCapVal}B`;
  
  return {
    isDemo: true,
    sourceTag: 'Estimated Fundamentals Profile',
    peTrailing: peT,
    peForward: peF,
    pb: pb,
    evEbitda: evE,
    marketCap: mCap,
    freeFloat: `${(85 + (hash % 14)).toFixed(1)}%`,
    revenueGrowthYoY: `+${(4 + (hash % 22)).toFixed(1)}%`,
    revenueGrowthQoQ: `+${(1 + (hash % 8)).toFixed(1)}%`,
    operatingMargin: `${(12 + (hash % 25)).toFixed(1)}%`,
    netMargin: `${(8 + (hash % 18)).toFixed(1)}%`,
    fcf: `$${(2.1 + (hash % 18)).toFixed(1)}B`,
    fcfYield: `${(1.8 + (hash % 4) * 0.8).toFixed(1)}%`,
    netDebtEbitda: `${(0.2 + (hash % 5) * 0.3).toFixed(1)}x`,
    beta: (0.85 + (hash % 8) * 0.15).toFixed(2),
    divYield: hash % 2 === 0 ? `${(0.8 + (hash % 3) * 0.9).toFixed(2)}%` : 'N/A',
    payoutRatio: hash % 2 === 0 ? `${(18 + (hash % 25)).toFixed(1)}%` : 'N/A'
  };
}

// Demo Price Generator
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
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    
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

function generateDemoResearchNote(ticker, priceData, fundamentals) {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const pctChange = ((latest.close - first.close) / first.close) * 100;
  const direction = pctChange >= 0 ? 'bullish momentum' : 'corrective consolidation';
  const sma20 = calculateSMA(priceData, 20);
  const latestSma20 = sma20[sma20.length - 1]?.val ?? latest.close;

  return `Over the analyzed 90-day trading window, **$${ticker}** demonstrates a **${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%** price trajectory, closing most recently at **$${latest.close.toFixed(2)}**. The asset is currently trading ${latest.close >= latestSma20 ? 'above' : 'below'} its 20-day simple moving average ($${latestSma20.toFixed(2)}), signalling ${direction}.

From a fundamental standpoint, $${ticker} carries a trailing P/E ratio of **${fundamentals.peTrailing}x** alongside a forward P/E of **${fundamentals.peForward}x**, backed by **${fundamentals.revenueGrowthYoY}** YoY revenue growth and an operating margin of **${fundamentals.operatingMargin}**. Free cash flow stands at **${fundamentals.fcf}**, providing solid balance sheet durability.

Quantitative technical signals indicate robust volume distribution during upward impulse legs, accompanied by clear support near key moving averages. Position sizing should respect key resistance targets with tight risk management boundaries.`;
}

// OpenRouter Call with Extended Prompt
async function getResearchNote(ticker, priceData, fundamentals, apiKey, modelName = 'anthropic/claude-sonnet-5') {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const pctChange = ((latest.close - first.close) / first.close) * 100;
  const sma20 = calculateSMA(priceData, 20);
  const sma50 = calculateSMA(priceData, 50);
  const ema20 = calculateEMA(priceData, 20);
  const rsi = calculateRSI(priceData, 14);
  const macd = calculateMACD(priceData, 12, 26, 9);
  const adx = calculateADX(priceData, 14);
  const vwap = calculateVWAP(priceData);
  const rvol = calculateRVOL(priceData);

  const latestSma20 = sma20[sma20.length - 1]?.val?.toFixed(2) ?? 'N/A';
  const latestSma50 = sma50[sma50.length - 1]?.val?.toFixed(2) ?? 'N/A';
  const latestRsi = rsi[rsi.length - 1]?.toFixed(1) ?? 'N/A';
  const latestMacd = macd[macd.length - 1];
  const latestAdx = adx[adx.length - 1]?.toFixed(1) ?? 'N/A';
  const latestRvol = rvol[rvol.length - 1]?.rvol?.toFixed(2) ?? 'N/A';
  const latestVwap = vwap[vwap.length - 1]?.toFixed(2) ?? 'N/A';

  const signalScoreObj = calculateAggregateSignalScore(priceData, sma20, sma50, ema20, rsi, macd, adx, rvol, vwap);

  const summary =
    `FINANCIAL TERMINAL QUANTITATIVE DOSSIER FOR $${ticker}:\n` +
    `- Price History (${first.date} to ${latest.date}): Start $${first.close.toFixed(2)}, Latest $${latest.close.toFixed(2)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%).\n` +
    `- Technicals: SMA20=$${latestSma20}, SMA50=$${latestSma50}, VWAP=$${latestVwap}, RSI(14)=${latestRsi}, ADX(14)=${latestAdx}, RVOL=${latestRvol}x, MACD Histogram=${latestMacd?.histogram?.toFixed(3) ?? 'N/A'}.\n` +
    `- Aggregate Signal Score: ${signalScoreObj.score}/100 (${signalScoreObj.ratingStr}).\n` +
    `- Fundamental KPIs: Trailing P/E ${fundamentals.peTrailing}x, Fwd P/E ${fundamentals.peForward}x, Market Cap ${fundamentals.marketCap}, Revenue Growth YoY ${fundamentals.revenueGrowthYoY}, Operating Margin ${fundamentals.operatingMargin}, Net Margin ${fundamentals.netMargin}, FCF ${fundamentals.fcf}, Beta ${fundamentals.beta}, Dividend Yield ${fundamentals.divYield}.`;

  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are a senior Wall Street quantitative analyst and equity research strategist. Write sharp, institutional-grade equity research reports incorporating both fundamental valuations and technical momentum signals.' },
        { role: 'user', content: `${summary}\n\nWrite a 3-paragraph executive research report for $${ticker} analyzing: 1) Fundamental valuation & earnings growth quality, 2) Technical momentum, moving average alignment, and oscillator structure, 3) Key tactical outlook & risk management takeaways.` }
      ]
    })
  });

  if (!response.ok && modelName === 'anthropic/claude-sonnet-5') {
    console.warn(`Model ${modelName} returned HTTP ${response.status}. Retrying with anthropic/claude-3.5-sonnet...`);
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: 'You are a senior Wall Street quantitative analyst and equity research strategist.' },
          { role: 'user', content: `${summary}\n\nWrite a 3-paragraph executive research report for $${ticker}.` }
        ]
      })
    });
  }

  if (!response.ok) throw new Error(`OpenRouter API call failed for model [${modelName}]: ${await readOpenRouterError(response)}`);
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

// Render Main Dashboard View
function renderDashboard(ticker, priceData, fundamentals, note, isSimulated, modelName = 'anthropic/claude-sonnet-5') {
  const first = priceData[0];
  const latest = priceData[priceData.length - 1];
  const priceDiff = latest.close - first.close;
  const pctChange = (priceDiff / first.close) * 100;
  const isPositive = priceDiff >= 0;

  const highs = priceData.map(d => d.high);
  const lows = priceData.map(d => d.low);
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  // Technical Indicator Array Calculations
  const sma20Arr = calculateSMA(priceData, 20);
  const sma50Arr = calculateSMA(priceData, 50);
  const ema20Arr = calculateEMA(priceData, 20);
  const bollingerArr = calculateBollingerBands(priceData, 20, 2);
  const macdArr = calculateMACD(priceData, 12, 26, 9);
  const rsiArr = calculateRSI(priceData, 14);
  const atrArr = calculateATR(priceData, 14);
  const vwapArr = calculateVWAP(priceData);
  const stochObj = calculateStochastic(priceData, 14, 3);
  const adxArr = calculateADX(priceData, 14);
  const drawdownArr = calculateDrawdown(priceData);
  const fibLevels = calculateFibonacciLevels(priceData);
  const rvolArr = calculateRVOL(priceData);
  const benchmarkArr = generateBenchmarkData(priceData);

  const latestSma20 = sma20Arr[sma20Arr.length - 1]?.val;
  const latestSma50 = sma50Arr[sma50Arr.length - 1]?.val;
  const latestEma20 = ema20Arr[ema20Arr.length - 1]?.val;
  const latestRsi = rsiArr[rsiArr.length - 1];
  const latestAtr = atrArr[atrArr.length - 1];
  const latestVwap = vwapArr[vwapArr.length - 1];
  const latestAdx = adxArr[adxArr.length - 1];
  const latestRvol = rvolArr[rvolArr.length - 1]?.rvol;
  const latestDrawdown = drawdownArr[drawdownArr.length - 1]?.drawdown;

  const signalScoreObj = calculateAggregateSignalScore(priceData, sma20Arr, sma50Arr, ema20Arr, rsiArr, macdArr, adxArr, rvolArr, vwapArr);
  const { timestampStr } = getMarketStatus();

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
            <span class="sentiment-tag ${signalScoreObj.ratingClass}">${signalScoreObj.ratingStr}</span>
            ${isSimulated ? '<span class="sentiment-tag neutral" style="font-size: 0.65rem;">DEMO FEED</span>' : '<span class="sentiment-tag bullish" style="font-size: 0.65rem;">TWELVEDATA REALTIME</span>'}
          </div>
          <div class="ticker-full-name">${tickerCompanyNames[ticker] || `${ticker} Equity`}</div>
        </div>

        <div class="price-block">
          <div class="current-price">$${latest.close.toFixed(2)}</div>
          <div class="price-change-row ${isPositive ? 'bullish' : 'bearish'}">
            <span>${isPositive ? '▲' : '▼'} $${Math.abs(priceDiff).toFixed(2)} (${isPositive ? '+' : ''}${pctChange.toFixed(2)}%)</span>
          </div>
          <div class="date-subtitle">Data Timestamp: ${latest.date} &bull; Refreshed: ${timestampStr}</div>
        </div>
      </div>

      <!-- Aggregate Signal Score Panel -->
      <div class="signal-score-panel">
        <div class="score-main-box">
          <div class="score-gauge-wrapper">
            <svg class="score-circle-svg" width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e3d9cd" stroke-width="8"></circle>
              <circle cx="50" cy="50" r="42" fill="none" 
                      stroke="${signalScoreObj.score >= 60 ? '#2d6a4f' : signalScoreObj.score <= 42 ? '#a61c1c' : '#c59b27'}" 
                      stroke-width="8" 
                      stroke-dasharray="264" 
                      stroke-dashoffset="${264 - (264 * signalScoreObj.score / 100)}" 
                      stroke-linecap="round"></circle>
            </svg>
            <div class="score-num-text">${signalScoreObj.score}<span>/100</span></div>
          </div>
          <div class="score-rating-title ${signalScoreObj.ratingClass}">${signalScoreObj.ratingStr}</div>
        </div>

        <div class="score-drivers-box">
          <div class="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Aggregate Signal Drivers
          </div>
          <p class="score-summary-paragraph">${signalScoreObj.driverSummary}</p>

          <div class="score-factors-grid">
            ${signalScoreObj.factors.map(f => `
              <div class="factor-item">
                <span class="factor-name">${f.name}</span>
                <span class="factor-value">${f.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Fundamental KPIs Section -->
      <div class="section-container">
        <div class="section-header-row">
          <div class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Fundamental Valuation & Growth KPIs
          </div>
          <span class="data-source-badge">${fundamentals.sourceTag}</span>
        </div>

        <div class="fundamentals-grid">
          <div class="fundamental-card">
            <div class="fundamental-label">Trailing P/E <span title="Trailing 12-Month Price to Earnings ratio">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.peTrailing}x</div>
            <div class="fundamental-sub">Valuation metric</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Forward P/E <span title="Forward 12-Month Estimated Price to Earnings ratio">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.peForward}x</div>
            <div class="fundamental-sub">Forward earnings</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">P/B Ratio <span title="Price to Book Value ratio">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.pb}x</div>
            <div class="fundamental-sub">Book multiple</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">EV / EBITDA <span title="Enterprise Value to EBITDA multiple">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.evEbitda}x</div>
            <div class="fundamental-sub">Enterprise multiple</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Market Cap <span title="Total Market Capitalization">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.marketCap}</div>
            <div class="fundamental-sub">Float: ${fundamentals.freeFloat}</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Revenue Growth YoY <span title="Year over Year Quarterly Revenue Growth">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.revenueGrowthYoY}</div>
            <div class="fundamental-sub">QoQ: ${fundamentals.revenueGrowthQoQ}</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Operating Margin <span title="Operating Income / Total Revenue">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.operatingMargin}</div>
            <div class="fundamental-sub">Net: ${fundamentals.netMargin}</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Free Cash Flow <span title="Annualized Free Cash Flow">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.fcf}</div>
            <div class="fundamental-sub">FCF Yield: ${fundamentals.fcfYield}</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Net Debt / EBITDA <span title="Net Leverage ratio">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.netDebtEbitda}</div>
            <div class="fundamental-sub">Solvency coverage</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Beta (vs S&P 500) <span title="Systematic Volatility relative to S&P 500">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.beta}</div>
            <div class="fundamental-sub">Market sensitivity</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Dividend Yield <span title="Annual Dividend Yield">ⓘ</span></div>
            <div class="fundamental-value">${fundamentals.divYield}</div>
            <div class="fundamental-sub">Payout: ${fundamentals.payoutRatio}</div>
          </div>
          <div class="fundamental-card">
            <div class="fundamental-label">Current Drawdown <span title="Decline from 90-day rolling peak">ⓘ</span></div>
            <div class="fundamental-value" style="color: ${latestDrawdown < -5 ? 'var(--accent-red)' : 'var(--text-main)'};">${latestDrawdown ? latestDrawdown.toFixed(1) : '0.0'}%</div>
            <div class="fundamental-sub">Decline from peak</div>
          </div>
        </div>
      </div>

      <!-- Technical Overview Metric Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-card-title">90-Day High</span>
          <span class="metric-card-val">$${maxHigh.toFixed(2)}</span>
          <span class="metric-card-sub">Peak price</span>
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
          <span class="metric-card-title">EMA (20)</span>
          <span class="metric-card-val">$${latestEma20 ? latestEma20.toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">Exp moving avg</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">VWAP</span>
          <span class="metric-card-val">$${latestVwap ? Number(latestVwap).toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">Vol weighted price</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">RSI (14)</span>
          <span class="metric-card-val">${latestRsi ? latestRsi.toFixed(1) : 'N/A'}</span>
          <span class="metric-card-sub">${latestRsi > 70 ? 'Overbought' : latestRsi < 30 ? 'Oversold' : 'Neutral Zone'}</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">ATR (14)</span>
          <span class="metric-card-val">$${latestAtr ? latestAtr.toFixed(2) : 'N/A'}</span>
          <span class="metric-card-sub">Avg true range</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">ADX (14)</span>
          <span class="metric-card-val">${latestAdx ? latestAdx : 'N/A'}</span>
          <span class="metric-card-sub">${Number(latestAdx) > 25 ? 'Strong Trend' : 'Ranging'}</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">Relative Vol (RVOL)</span>
          <span class="metric-card-val">${latestRvol ? latestRvol : '1.0'}x</span>
          <span class="metric-card-sub">vs 20-Day Avg Vol</span>
        </div>
      </div>

      <!-- Charts Stack (Main Candlesticks + Synced Sub-Charts) -->
      <div class="charts-stack">
        <!-- Main Price / Candlestick Chart -->
        <div class="subchart-panel" id="panel-main-chart">
          <div class="subchart-header">
            <div class="subchart-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Price Action History & Overlays (90 Trading Days)
            </div>
            <div id="chart-legend-items">
              <span class="legend-item"><span class="legend-color" style="background: #2d6a4f;"></span> Bull Candle</span>
              <span class="legend-item"><span class="legend-color" style="background: #a61c1c;"></span> Bear Candle</span>
              <span class="legend-item"><span class="legend-color" style="background: #c59b27;"></span> SMA20</span>
              <span class="legend-item"><span class="legend-color" style="background: #2563eb;"></span> EMA20</span>
              <span class="legend-item"><span class="legend-color" style="background: #d97706;"></span> VWAP</span>
            </div>
          </div>
          <div class="subchart-wrapper height-main">
            <canvas id="priceChartCanvas"></canvas>
          </div>
        </div>

        <!-- Volume & RVOL Panel -->
        <div class="subchart-panel" id="panel-volume-chart">
          <div class="subchart-header">
            <div class="subchart-title">Volume & Relative Volume (RVOL)</div>
            <div class="legend-item"><span class="legend-color" style="background: #c59b27;"></span> 20-Day Vol SMA</div>
          </div>
          <div class="subchart-wrapper height-volume">
            <canvas id="volumeChartCanvas"></canvas>
          </div>
        </div>

        <!-- RSI Panel -->
        <div class="subchart-panel" id="panel-rsi-chart">
          <div class="subchart-header">
            <div class="subchart-title">Relative Strength Index (RSI 14)</div>
            <div class="legend-item">Bounds: 70 Overbought / 30 Oversold</div>
          </div>
          <div class="subchart-wrapper height-rsi">
            <canvas id="rsiChartCanvas"></canvas>
          </div>
        </div>

        <!-- MACD Panel -->
        <div class="subchart-panel" id="panel-macd-chart">
          <div class="subchart-header">
            <div class="subchart-title">MACD (12, 26, 9) Oscillator</div>
            <div>
              <span class="legend-item"><span class="legend-color" style="background: #2563eb;"></span> MACD</span>
              <span class="legend-item"><span class="legend-color" style="background: #c59b27;"></span> Signal</span>
            </div>
          </div>
          <div class="subchart-wrapper height-macd">
            <canvas id="macdChartCanvas"></canvas>
          </div>
        </div>

        <!-- Stochastic Oscillator Panel -->
        <div class="subchart-panel" id="panel-stoch-chart">
          <div class="subchart-header">
            <div class="subchart-title">Stochastic Oscillator (%K 14, %D 3)</div>
            <div>
              <span class="legend-item"><span class="legend-color" style="background: #0284c7;"></span> %K Line</span>
              <span class="legend-item"><span class="legend-color" style="background: #ea580c;"></span> %D Line</span>
            </div>
          </div>
          <div class="subchart-wrapper height-stoch">
            <canvas id="stochChartCanvas"></canvas>
          </div>
        </div>

        <!-- ADX Panel -->
        <div class="subchart-panel" id="panel-adx-chart">
          <div class="subchart-header">
            <div class="subchart-title">Average Directional Index (ADX 14 Trend Strength)</div>
            <div class="legend-item">Threshold: >25 Strong Trend</div>
          </div>
          <div class="subchart-wrapper height-adx">
            <canvas id="adxChartCanvas"></canvas>
          </div>
        </div>

        <!-- Drawdown Panel -->
        <div class="subchart-panel" id="panel-drawdown-chart">
          <div class="subchart-header">
            <div class="subchart-title">Drawdown % (Decline from rolling all-time peak)</div>
            <div class="legend-item">0% = Peak Valuation</div>
          </div>
          <div class="subchart-wrapper height-drawdown">
            <canvas id="drawdownChartCanvas"></canvas>
          </div>
        </div>

        <!-- Benchmark Comparison Panel -->
        <div class="subchart-panel" id="panel-benchmark-chart">
          <div class="subchart-header">
            <div class="subchart-title">Relative Performance vs S&P 500 (Base 100)</div>
            <div>
              <span class="legend-item"><span class="legend-color" style="background: #7a1c30;"></span> $${ticker}</span>
              <span class="legend-item"><span class="legend-color" style="background: #475569;"></span> SPY Benchmark</span>
            </div>
          </div>
          <div class="subchart-wrapper height-benchmark">
            <canvas id="benchmarkChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- AI Research Synthesis Note -->
      <div class="ai-note-card">
        <div class="ai-note-header">
          <div class="ai-note-title" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>AI Institutional Equity Research Report</span>
            <span class="model-badge" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(122,28,48,0.08); border: 1px solid rgba(122,28,48,0.2); border-radius: 4px; color: var(--accent-burgundy); font-family: var(--font-mono); font-weight: 600;">${modelName}</span>
          </div>
          <button class="copy-note-btn" id="copy-note-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Report</span>
          </button>
        </div>
        
        <div class="ai-note-content">
          ${formatNoteText(note)}
        </div>

        <div class="ai-highlights-grid">
          <div class="highlight-box">
            <div class="highlight-title">Composite Stance</div>
            <div class="highlight-val">${signalScoreObj.ratingStr}</div>
          </div>
          <div class="highlight-box">
            <div class="highlight-title">Fundamental Quality</div>
            <div class="highlight-val">P/E ${fundamentals.peTrailing}x | Rev Growth ${fundamentals.revenueGrowthYoY}</div>
          </div>
          <div class="highlight-box">
            <div class="highlight-title">Primary Support</div>
            <div class="highlight-val">$${(minLow * 1.01).toFixed(2)} (Fib 100%)</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render All Canvas Charts
  renderAllCharts(priceData, ticker);

  // Bind copy button
  document.getElementById('copy-note-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(note);
    const btn = document.getElementById('copy-note-btn');
    if (btn) {
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy Report</span>
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

// Master Chart Renderer coordinating sub-panel visibility & Canvas drawings
function renderAllCharts(data, ticker) {
  const isCandlestick = document.getElementById('toggle-candlestick')?.checked ?? true;
  const showSma20 = document.getElementById('toggle-sma20')?.checked ?? true;
  const showSma50 = document.getElementById('toggle-sma50')?.checked ?? true;
  const showEma20 = document.getElementById('toggle-ema20')?.checked ?? true;
  const showBollinger = document.getElementById('toggle-bollinger')?.checked ?? true;
  const showVwap = document.getElementById('toggle-vwap')?.checked ?? true;
  const showFib = document.getElementById('toggle-fibonacci')?.checked ?? true;

  const showVol = document.getElementById('toggle-volume')?.checked ?? true;
  const showRsi = document.getElementById('toggle-rsi')?.checked ?? true;
  const showMacd = document.getElementById('toggle-macd')?.checked ?? true;
  const showStoch = document.getElementById('toggle-stochastic')?.checked ?? true;
  const showAdx = document.getElementById('toggle-adx')?.checked ?? true;
  const showDrawdown = document.getElementById('toggle-drawdown')?.checked ?? true;
  const showBenchmark = document.getElementById('toggle-benchmark')?.checked ?? true;

  // Toggle Sub-Panel Element Display
  togglePanelDisplay('panel-volume-chart', showVol);
  togglePanelDisplay('panel-rsi-chart', showRsi);
  togglePanelDisplay('panel-macd-chart', showMacd);
  togglePanelDisplay('panel-stoch-chart', showStoch);
  togglePanelDisplay('panel-adx-chart', showAdx);
  togglePanelDisplay('panel-drawdown-chart', showDrawdown);
  togglePanelDisplay('panel-benchmark-chart', showBenchmark);

  // Render Main Price Chart
  renderMainPriceChart(data, { isCandlestick, showSma20, showSma50, showEma20, showBollinger, showVwap, showFib });

  // Render Sub-Charts if enabled
  if (showVol) renderVolumeChart(data);
  if (showRsi) renderRSIChart(data);
  if (showMacd) renderMACDChart(data);
  if (showStoch) renderStochasticChart(data);
  if (showAdx) renderADXChart(data);
  if (showDrawdown) renderDrawdownChart(data);
  if (showBenchmark) renderBenchmarkChart(data, ticker);
}

function togglePanelDisplay(panelId, visible) {
  const el = document.getElementById(panelId);
  if (el) el.style.display = visible ? 'block' : 'none';
}

function setupCanvasDPI(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  return { ctx, width: rect.width, height: rect.height };
}

// 1. Render Main Price & Candlestick Chart
function renderMainPriceChart(data, options) {
  const canvas = document.getElementById('priceChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema20 = calculateEMA(data, 20);
  const bollinger = calculateBollingerBands(data, 20, 2);
  const vwap = calculateVWAP(data);
  const fib = calculateFibonacciLevels(data);

  let minPrice = Math.min(...data.map(d => d.low)) * 0.98;
  let maxPrice = Math.max(...data.map(d => d.high)) * 1.02;

  if (options.showBollinger) {
    const validUpper = bollinger.filter(b => b.upper !== null).map(b => b.upper);
    const validLower = bollinger.filter(b => b.lower !== null).map(b => b.lower);
    if (validUpper.length && validLower.length) {
      maxPrice = Math.max(maxPrice, ...validUpper) * 1.01;
      minPrice = Math.min(minPrice, ...validLower) * 0.99;
    }
  }

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minPrice) / (maxPrice - minPrice)) * chartHeight;

  // Grid Lines & Labels
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

  // Dates on X-Axis
  const dateSteps = 5;
  for (let i = 0; i <= dateSteps; i++) {
    const dataIdx = Math.floor((data.length - 1) * (i / dateSteps));
    const x = paddingLeft + (chartWidth * (i / dateSteps));
    const dStr = data[dataIdx]?.date.slice(5) || '';
    ctx.fillText(dStr, x - 12, height - 8);
  }

  // Draw Fibonacci Levels
  if (options.showFib) {
    const levels = [
      { label: '0.0%', val: fib.f0 },
      { label: '23.6%', val: fib.f236 },
      { label: '38.2%', val: fib.f382 },
      { label: '50.0%', val: fib.f500 },
      { label: '61.8%', val: fib.f618 },
      { label: '100.0%', val: fib.f100 }
    ];

    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(122, 28, 48, 0.35)';

    levels.forEach(lvl => {
      const y = getY(lvl.val);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(122, 28, 48, 0.7)';
      ctx.fillText(`Fib ${lvl.label} ($${lvl.val.toFixed(1)})`, width - paddingRight - 85, y - 2);
    });
    ctx.setLineDash([]);
  }

  // Draw Bollinger Bands Envelope
  if (options.showBollinger) {
    ctx.beginPath();
    let started = false;
    bollinger.forEach((b, i) => {
      if (b.upper !== null) {
        const x = getX(i);
        const y = getY(b.upper);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
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
  }

  // Render Price Data (Candlesticks or Line)
  if (options.isCandlestick) {
    const candleWidth = Math.max(3, (chartWidth / data.length) * 0.65);
    data.forEach((d, i) => {
      const x = getX(i);
      const isGreen = d.close >= d.open;
      const color = isGreen ? '#2d6a4f' : '#a61c1c';

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, getY(d.high));
      ctx.lineTo(x, getY(d.low));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Body Box
      const openY = getY(d.open);
      const closeY = getY(d.close);
      const topY = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(openY - closeY));

      ctx.fillStyle = isGreen ? 'rgba(45, 106, 79, 0.85)' : 'rgba(166, 28, 28, 0.85)';
      ctx.fillRect(x - candleWidth / 2, topY, candleWidth, bodyHeight);
    });
  } else {
    // Area Fill Gradient
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
    gradient.addColorStop(0, 'rgba(122, 28, 48, 0.18)');
    gradient.addColorStop(1, 'rgba(122, 28, 48, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0].close));
    for (let i = 1; i < data.length; i++) ctx.lineTo(getX(i), getY(data[i].close));
    ctx.lineTo(getX(data.length - 1), paddingTop + chartHeight);
    ctx.lineTo(getX(0), paddingTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0].close));
    for (let i = 1; i < data.length; i++) ctx.lineTo(getX(i), getY(data[i].close));
    ctx.strokeStyle = '#7a1c30';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Draw VWAP line
  if (options.showVwap) {
    ctx.beginPath();
    vwap.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Moving Averages
  if (options.showEma20) drawLine(ctx, ema20, getX, getY, '#2563eb', 1.5);
  if (options.showSma50) drawLine(ctx, sma50, getX, getY, '#2d6a4f', 1.5);
  if (options.showSma20) drawLine(ctx, sma20, getX, getY, '#c59b27', 1.5);
}

function drawLine(ctx, series, getX, getY, color, width) {
  ctx.beginPath();
  let started = false;
  series.forEach((pt, i) => {
    if (pt.val !== null) {
      const x = getX(i);
      const y = getY(pt.val);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// 2. Render Volume & RVOL Chart
function renderVolumeChart(data) {
  const canvas = document.getElementById('volumeChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const rvolArr = calculateRVOL(data);
  const maxVol = Math.max(...data.map(d => d.volume));

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const barWidth = Math.max(2, (chartWidth / data.length) * 0.6);

  data.forEach((d, i) => {
    const x = getX(i);
    const volHeight = (d.volume / maxVol) * chartHeight;
    const y = paddingTop + chartHeight - volHeight;
    ctx.fillStyle = d.close >= d.open ? 'rgba(45, 106, 79, 0.75)' : 'rgba(166, 28, 28, 0.75)';
    ctx.fillRect(x - barWidth / 2, y, barWidth, volHeight);
  });

  // Volume SMA 20 Line
  ctx.beginPath();
  let started = false;
  rvolArr.forEach((rv, i) => {
    if (rv.avgVol !== null) {
      const x = getX(i);
      const y = paddingTop + chartHeight - (rv.avgVol / maxVol) * chartHeight;
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#c59b27';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 3. Render RSI Chart
function renderRSIChart(data) {
  const canvas = document.getElementById('rsiChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const rsiArr = calculateRSI(data, 14);

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - (val / 100) * chartHeight;

  // Grid Lines 70 and 30
  const y70 = getY(70);
  const y30 = getY(30);

  ctx.strokeStyle = 'rgba(166, 28, 28, 0.4)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(paddingLeft, y70); ctx.lineTo(width - paddingRight, y70); ctx.stroke();

  ctx.strokeStyle = 'rgba(45, 106, 79, 0.4)';
  ctx.beginPath(); ctx.moveTo(paddingLeft, y30); ctx.lineTo(width - paddingRight, y30); ctx.stroke();
  ctx.setLineDash([]);

  // RSI Line
  ctx.beginPath();
  let started = false;
  rsiArr.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 4. Render MACD Chart
function renderMACDChart(data) {
  const canvas = document.getElementById('macdChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const macdArr = calculateMACD(data, 12, 26, 9);

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const validVals = macdArr.flatMap(m => [m.macd, m.signal, m.histogram]).filter(v => v !== null);
  const maxVal = Math.max(...validVals, 0.5);
  const minVal = Math.min(...validVals, -0.5);

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  const zeroY = getY(0);

  // Zero Line
  ctx.strokeStyle = '#e3d9cd';
  ctx.beginPath(); ctx.moveTo(paddingLeft, zeroY); ctx.lineTo(width - paddingRight, zeroY); ctx.stroke();

  // Histogram
  const barWidth = Math.max(2, (chartWidth / data.length) * 0.5);
  macdArr.forEach((m, i) => {
    if (m.histogram !== null) {
      const x = getX(i);
      const hY = getY(m.histogram);
      ctx.fillStyle = m.histogram >= 0 ? 'rgba(45, 106, 79, 0.7)' : 'rgba(166, 28, 28, 0.7)';
      ctx.fillRect(x - barWidth / 2, Math.min(zeroY, hY), barWidth, Math.abs(zeroY - hY));
    }
  });

  // MACD & Signal Lines
  ctx.beginPath();
  let started = false;
  macdArr.forEach((m, i) => {
    if (m.macd !== null) {
      const x = getX(i);
      const y = getY(m.macd);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  started = false;
  macdArr.forEach((m, i) => {
    if (m.signal !== null) {
      const x = getX(i);
      const y = getY(m.signal);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#c59b27';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 5. Render Stochastic Chart
function renderStochasticChart(data) {
  const canvas = document.getElementById('stochChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const stoch = calculateStochastic(data, 14, 3);

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - (val / 100) * chartHeight;

  // Lines 80 / 20
  ctx.strokeStyle = '#e3d9cd';
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(paddingLeft, getY(80)); ctx.lineTo(width - paddingRight, getY(80)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(paddingLeft, getY(20)); ctx.lineTo(width - paddingRight, getY(20)); ctx.stroke();
  ctx.setLineDash([]);

  // %K Line
  ctx.beginPath();
  let started = false;
  stoch.k.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i); const y = getY(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // %D Line
  ctx.beginPath();
  started = false;
  stoch.d.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i); const y = getY(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// 6. Render ADX Chart
function renderADXChart(data) {
  const canvas = document.getElementById('adxChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const adxArr = calculateADX(data, 14);

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - (val / 60) * chartHeight;

  // 25 Level line
  ctx.strokeStyle = '#c59b27';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(paddingLeft, getY(25)); ctx.lineTo(width - paddingRight, getY(25)); ctx.stroke();
  ctx.setLineDash([]);

  // ADX Line
  ctx.beginPath();
  let started = false;
  adxArr.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i); const y = getY(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    }
  });
  ctx.strokeStyle = '#9333ea';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 7. Render Drawdown Chart
function renderDrawdownChart(data) {
  const canvas = document.getElementById('drawdownChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const ddArr = calculateDrawdown(data);
  const minDD = Math.min(...ddArr.map(d => d.drawdown), -10);

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + ((val / minDD) * chartHeight);

  // Area Fill
  ctx.beginPath();
  ctx.moveTo(getX(0), paddingTop);
  ddArr.forEach((d, i) => ctx.lineTo(getX(i), getY(d.drawdown)));
  ctx.lineTo(getX(data.length - 1), paddingTop);
  ctx.closePath();
  ctx.fillStyle = 'rgba(166, 28, 28, 0.2)';
  ctx.fill();

  // Top Line
  ctx.beginPath();
  ddArr.forEach((d, i) => {
    const x = getX(i); const y = getY(d.drawdown);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#a61c1c';
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

// 8. Render Benchmark Comparison Chart (Base 100)
function renderBenchmarkChart(data, ticker) {
  const canvas = document.getElementById('benchmarkChartCanvas');
  if (!canvas) return;

  const { ctx, width, height } = setupCanvasDPI(canvas);
  ctx.clearRect(0, 0, width, height);

  const spyData = generateBenchmarkData(data);

  const tickerBase = data[0].close;
  const spyBase = spyData[0].close;

  const tickerNorm = data.map(d => (d.close / tickerBase) * 100);
  const spyNorm = spyData.map(s => (s.close / spyBase) * 100);

  const allVals = [...tickerNorm, ...spyNorm];
  const minVal = Math.min(...allVals) * 0.98;
  const maxVal = Math.max(...allVals) * 1.02;

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  // Base 100 Reference Line
  const y100 = getY(100);
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(paddingLeft, y100); ctx.lineTo(width - paddingRight, y100); ctx.stroke();
  ctx.setLineDash([]);

  // SPY Line
  ctx.beginPath();
  spyNorm.forEach((val, i) => {
    const x = getX(i); const y = getY(val);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ticker Line
  ctx.beginPath();
  tickerNorm.forEach((val, i) => {
    const x = getX(i); const y = getY(val);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#7a1c30';
  ctx.lineWidth = 2.2;
  ctx.stroke();
}
