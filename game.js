/**
 * Wingo Game for SR777 CLUB
 * Realistic 3-color Candlestick Chart (green, red, violet) - pure JS
 * Real trend, volatility, trend reversals, rare violet, real trading vibe.
 */

let timeLeft = 30;
let results = [];
let timerInterval;
let periodCounter = generatePeriodNumber();
let walletBalance = 5000;
let userBetHistory = [];
let currentPage = 0;
let myBetCurrentPage = 0;
const resultsPerPage = 10;
const betsPerPage = 10;
let soundEnabled = true;
let chartUpdateInterval = null;

let gameStats = {
  totalBets: 0,
  totalWins: 0,
  totalAmountWon: 0,
  biggestWin: 0,
  winStreak: 0,
  currentStreak: 0
};

const MULTIPLIERS = {
  COLOR_WIN: 1.90,
  VIOLET_WIN: 4.40,
  NUMBER_WIN: 8.10,
  SPECIAL_COLOR_WIN: 1.5
};

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  switchSection('history');
  setupEventListeners();
});

function initGame() {
  loadGameState();
  initTradingChart();
  updateTimerDisplay();
  updateWingoNumbers();
  updateHistory();
  updateNextPeriod();
  updateWalletBalance();
  updatePortfolio();
  startTimer();
  const soundPref = localStorage.getItem('soundEnabled');
  if (soundPref !== null) {
    soundEnabled = soundPref === 'true';
    updateSoundIcon();
  }
}

function setupEventListeners() {
  document.getElementById('confirmBet').addEventListener('click', confirmBet);
  document.getElementById('cancelBet').addEventListener('click', closeBattingSlide);
  document.querySelectorAll('.quick-bet').forEach(button => {
    button.addEventListener('click', () => {
      const amount = parseInt(button.getAttribute('data-amount'));
      const betAmountInput = document.getElementById('betAmount');
      const currentValue = parseFloat(betAmountInput.value) || 0;
      betAmountInput.value = currentValue + amount;
    });
  });
  document.querySelectorAll('.heading-box').forEach(item => {
    item.addEventListener('click', (e) => {
      const selectedOption = e.target.innerText;
      openBattingSlide(selectedOption);
    });
  });
  document.getElementById('history-btn').addEventListener('click', () => switchSection('history'));
  document.getElementById('progress-btn').addEventListener('click', () => switchSection('progress'));
  document.getElementById('portfolio-btn').addEventListener('click', () => switchSection('portfolio'));
  document.getElementById('previous-btn').addEventListener('click', showPreviousPage);
  document.getElementById('next-btn').addEventListener('click', showNextPage);
  document.getElementById('mybet-previous-btn').addEventListener('click', showPreviousMyBetPage);
  document.getElementById('mybet-next-btn').addEventListener('click', showNextMyBetPage);
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
  let pressTimer;
  const logo = document.querySelector('.logo-container h1');
  logo.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      resetGame();
    }, 3000);
  });
  logo.addEventListener('mouseup', () => clearTimeout(pressTimer));
  logo.addEventListener('mouseleave', () => clearTimeout(pressTimer));
  window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
    clearInterval(chartUpdateInterval);
  });
}

// -------- PURE JS 3-color CANDLESTICK CHART WITH REAL TREND ---------

let candleData = [];
let trendDir = 1; // 1=up, -1=down, 0=sideways
let volatility = 1.5; // controls candle size
function initTradingChart() {
  trendDir = (Math.random()<0.5?1:-1);
  volatility = 1 + Math.random()*2;
  candleData = generateInitialCandles(30);
  drawCandlestickChart();
  if (chartUpdateInterval) clearInterval(chartUpdateInterval);
  chartUpdateInterval = setInterval(updateCandlestickChart, 1000);
}

function pickTrendDirection(prevTrend) {
  const r = Math.random();
  if (r<0.13) return -1*prevTrend; // 13% chance reverse
  if (r<0.2) return 0; // 7% sideways
  return prevTrend; // rest continue trend
}

function pickVolatility(prevVol) {
  // 20% chance change volatility
  if (Math.random()<0.2) {
    let v = 1 + Math.random()*2.5;
    return v;
  }
  return prevVol;
}

function generateInitialCandles(count) {
  let arr = [];
  let lastClose = 100 + Math.random() * 10;
  let lastColor = "green";
  let trend = trendDir;
  let vol = volatility;
  for (let i = 0; i < count; i++) {
    let candle = generateNextCandle(lastClose, lastColor, trend, vol);
    arr.push(candle);
    lastClose = candle.c;
    lastColor = candle.color;
    trend = pickTrendDirection(trend);
    vol = pickVolatility(vol);
  }
  trendDir = trend;
  volatility = vol;
  return arr;
}

// Candle formation with real trend, volatility, rare violet
function generateNextCandle(lastClose, lastColor, trend, vol) {
  // Decide candle color with trend and violet rare
  let color;
  let r = Math.random();
  if (trend === 0) {
    // Sideways: 16% violet, 42% green, 42% red
    if (r < 0.16) color = "violet";
    else color = (r < 0.58 ? "green" : "red");
  } else if (trend === 1) {
    // Uptrend: 8% violet, 70% green, 22% red
    if (r < 0.08) color = "violet";
    else color = (r < 0.78 ? "green" : "red");
  } else {
    // Downtrend: 8% violet, 22% green, 70% red
    if (r < 0.08) color = "violet";
    else color = (r < 0.30 ? "green" : "red");
  }

  // Candle open/close logic
  let open, close, high, low;
  let baseMove = (trend===0 ? 0 : trend * (Math.random()*vol*0.5 + vol*0.2));
  // Violet candle: open≈close, but with wick (doji style)
  if (color === "violet") {
    open = lastClose + (Math.random()-0.5)*vol*0.3;
    close = open + (Math.random()-0.5)*vol*0.12; // very small
    let wick = Math.random()*vol*1.7 + 0.2;
    high = Math.max(open, close) + wick/2;
    low = Math.min(open, close) - wick/2;
    // Force almost flat
    close = Number(open + (Math.random()-0.5)*vol*0.07);
  }
  // Green candle: close > open
  else if (color === "green") {
    open = lastClose + (Math.random()-0.2)*vol*0.25;
    let body = Math.abs(baseMove + Math.random()*vol*0.7);
    close = open + body;
    high = close + Math.random()*vol*0.5;
    low = open - Math.random()*vol*0.4;
    // कभी कभी flat green तो थोड़ी gap दें
    if (Math.abs(open-close)<0.15) close = open + 0.18 + Math.random()*0.14;
  }
  // Red candle: open > close
  else if (color === "red") {
    open = lastClose + (Math.random()+0.2)*vol*0.25;
    let body = Math.abs(baseMove + Math.random()*vol*0.7);
    close = open - body;
    high = open + Math.random()*vol*0.4;
    low = close - Math.random()*vol*0.5;
    if (Math.abs(open-close)<0.15) close = open - 0.18 - Math.random()*0.14;
  }

  open = Number(open.toFixed(2));
  close = Number(close.toFixed(2));
  high = Math.max(open, close, Number(high.toFixed(2)));
  low = Math.min(open, close, Number(low.toFixed(2)));
  return { o: open, h: high, l: low, c: close, color: color, trend: trend };
}

function updateCandlestickChart() {
  // Update trend and volatility for next candle
  trendDir = pickTrendDirection(trendDir);
  volatility = pickVolatility(volatility);

  candleData.shift();
  let last = candleData[candleData.length-1];
  let newCandle = generateNextCandle(last.c, last.color, trendDir, volatility);
  candleData.push(newCandle);
  drawCandlestickChart();
}

function drawCandlestickChart() {
  const canvas = document.getElementById('trading-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const padding = 15;
  const width = canvas.width - padding*2;
  const height = canvas.height - padding*2;

  // Y scale
  let min = Math.min(...candleData.map(c=>c.l));
  let max = Math.max(...candleData.map(c=>c.h));
  if (min === max) { min -= 1; max += 1; }
  const yScale = val => padding + height - ((val - min) / (max-min)) * height;

  // Draw grid
  ctx.strokeStyle = "#eee";
  ctx.lineWidth = 1;
  for (let i=0;i<=4;i++) {
    let y = padding + (height/4)*i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width-padding, y);
    ctx.stroke();
    // y labels
    ctx.fillStyle = "#aaa";
    ctx.font = "10px Arial";
    let val = max - (max-min)*i/4;
    ctx.fillText(val.toFixed(2), 2, y+3);
  }

  // Candle width/spacing
  let candleWidth = Math.floor(width / candleData.length)*0.7;
  let spacing = Math.floor(width / candleData.length)*0.3;

  // Draw candles
  for (let i=0;i<candleData.length;i++) {
    let c = candleData[i];
    let x = padding + (i * width / candleData.length) + spacing/2;
    let yOpen = yScale(c.o);
    let yClose = yScale(c.c);
    let yHigh = yScale(c.h);
    let yLow = yScale(c.l);

    // Color
    let colorObj = getCandleColorProps(c.color);

    // Wick
    ctx.strokeStyle = colorObj.wick;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth/2, yHigh);
    ctx.lineTo(x + candleWidth/2, yLow);
    ctx.stroke();

    // Body
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let bodyTop = Math.min(yOpen, yClose);
    let bodyBottom = Math.max(yOpen, yClose);
    let bodyHeight = Math.max(2, bodyBottom - bodyTop);
    ctx.fillStyle = colorObj.body;
    ctx.strokeStyle = colorObj.border;
    ctx.rect(x, bodyTop, candleWidth, bodyHeight);
    ctx.fill();
    ctx.stroke();
  }
}

// Returns color scheme for candle
function getCandleColorProps(color) {
  if (color === "green") {
    return { body: "#63e88a", border: "#3BB143", wick: "#3BB143" };
  }
  if (color === "red") {
    return { body: "#ffcccc", border: "#e05555", wick: "#e05555" };
  }
  // Violet
  return { body: "#e7d0fd", border: "#7600bc", wick: "#7600bc" };
}

// ------------------- बाकी गेम लॉजिक (जैसा पहले) -------------------

function generatePeriodNumber() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  return `${day}${month}${year}00001`;
}

function loadGameState() {
  const savedState = localStorage.getItem('wingoGameState');
  if (savedState) {
    const state = JSON.parse(savedState);
    timeLeft = state.timeLeft || 30;
    results = state.results || [];
    periodCounter = state.periodCounter || generatePeriodNumber();
    walletBalance = state.walletBalance || 5000;
    userBetHistory = state.userBetHistory || [];
    gameStats = state.gameStats || {
      totalBets: 0,
      totalWins: 0,
      totalAmountWon: 0,
      biggestWin: 0,
      winStreak: 0,
      currentStreak: 0
    };
  }
}

function saveGameState() {
  const state = {
    timeLeft,
    results,
    periodCounter,
    walletBalance,
    userBetHistory,
    gameStats
  };
  localStorage.setItem('wingoGameState', JSON.stringify(state));
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft === 5) {
      showCountdownOverlay();
      closeBattingSlide();
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      generateRandomNumber();
      timeLeft = 30;
      startTimer();
    }
    saveGameState();
  }, 1000);
}

function updateTimerDisplay() {
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function generateRandomNumber() {
  const number = Math.floor(Math.random() * 10);
  const colorClass = getColorClass(number);
  results.unshift({ number, colorClass, period: periodCounter });
  checkBettingResult();
  const currentNum = parseInt(periodCounter.slice(8));
  periodCounter = periodCounter.slice(0, 8) + String(currentNum + 1).padStart(5, '0');
  updateWingoNumbers();
  updateHistory();
  updateNextPeriod();
  updatePortfolio();
  saveGameState();
}

function getColorClass(number) {
  if (number === 0 || number === 5) return 'violet';
  return number % 2 === 0 ? 'red' : 'green';
}

function updateWingoNumbers() {
  const wingoDiv = document.getElementById('wingo-numbers');
  if (!wingoDiv) return;
  wingoDiv.innerHTML = '';
  const latestResults = results.slice(0, 5);
  if (latestResults.length === 0) return;
  latestResults.forEach(result => {
    const numberCircle = document.createElement('div');
    numberCircle.classList.add('number-ball', result.colorClass);
    numberCircle.textContent = result.number;
    wingoDiv.appendChild(numberCircle);
  });
}

function updateHistory() {
  const historyDiv = document.getElementById('results-history');
  if (!historyDiv) return;
  historyDiv.innerHTML = '';
  const start = currentPage * resultsPerPage;
  const end = start + resultsPerPage;
  const pageResults = results.slice(start, end);
  if (pageResults.length === 0 && currentPage > 0) {
    currentPage = Math.max(0, Math.ceil(results.length / resultsPerPage) - 1);
    updateHistory();
    return;
  }
  if (pageResults.length === 0) {
    historyDiv.innerHTML = '<div style="text-align:center;padding:50px;color:#888">No results available</div>';
    return;
  }
  pageResults.forEach(result => {
    const historyRow = document.createElement('div');
    historyRow.classList.add('history-row');
    const trendText = result.number >= 5 ? 'Up' : 'Down';
    const trendClass = result.number >= 5 ? 'number-green' : 'number-red';
    historyRow.innerHTML = `
      <div class="history-period">${result.period}</div>
      <div class="history-number ${trendClass}">${trendText}</div>
      <div class="history-bigsmall">${result.number >= 5 ? 'Up' : 'Down'}</div>
    `;
    historyDiv.appendChild(historyRow);
  });
  updateNavigationButtons();
  updatePageInfo();
}

function updateMyBetHistory() {
  const myBetHistoryDiv = document.getElementById('mybet-history');
  if (!myBetHistoryDiv) return;
  myBetHistoryDiv.innerHTML = '';
  const start = myBetCurrentPage * betsPerPage;
  const end = start + betsPerPage;
  const pageBets = userBetHistory.slice(start, end);
  if (pageBets.length === 0 && myBetCurrentPage > 0) {
    myBetCurrentPage = Math.max(0, Math.ceil(userBetHistory.length / betsPerPage) - 1);
    updateMyBetHistory();
    return;
  }
  if (pageBets.length === 0) {
    myBetHistoryDiv.innerHTML = '<div style="text-align:center;padding:50px;color:#888">No bets placed yet</div>';
    return;
  }
  pageBets.forEach(bet => {
    const betRow = document.createElement('div');
    betRow.classList.add('mybet-row');
    let iconClass, iconContent;
    if (['Green C', 'Red C', 'Violet C', 'Up', 'Down'].includes(bet.option)) {
      iconClass = bet.option.toLowerCase().replace(' c', '');
      iconContent = bet.option.charAt(0);
    } else {
      iconClass = 'violet';
      iconContent = bet.option;
    }
    const betDate = new Date(bet.timestamp);
    const formattedDateTime = `${betDate.toLocaleDateString()} ${betDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    let resultClass, resultText;
    if (bet.status === 'Pending') {
      resultClass = 'pending';
      resultText = 'Pending';
    } else if (bet.status === 'Win') {
      resultClass = 'win';
      resultText = `+₹${bet.winAmount.toFixed(2)}`;
    } else {
      resultClass = 'loss';
      resultText = `-₹${bet.amount.toFixed(2)}`;
    }
    betRow.innerHTML = `
      <div class="bet-icon"><span class="icon ${iconClass}">${iconContent}</span></div>
      <div class="period-info">
        <div class="period-no">${bet.period}</div>
        <div class="date-time">${formattedDateTime}</div>
      </div>
      <div class="bet-result ${resultClass}">${resultText}</div>
    `;
    myBetHistoryDiv.appendChild(betRow);
  });
  updateMyBetNavigationButtons();
  updateMyBetPageInfo();
}

function updateNextPeriod() {
  const nextPeriod = document.getElementById('period-number');
  if (nextPeriod) nextPeriod.textContent = periodCounter;
}

function openBattingSlide(selectedOption) {
  const battingOverlay = document.getElementById('battingOverlay');
  const selectedOptionText = document.getElementById('selectedOption');
  if (!battingOverlay || !selectedOptionText) return;
  selectedOptionText.textContent = `Selected: ${selectedOption}`;
  battingOverlay.style.display = 'flex';
  setTimeout(() => battingOverlay.classList.add('active'), 10);
  const betAmountInput = document.getElementById('betAmount');
  if (betAmountInput) {
    betAmountInput.value = '';
    betAmountInput.focus();
  }
}

function closeBattingSlide() {
  const battingOverlay = document.getElementById('battingOverlay');
  if (!battingOverlay) return;
  battingOverlay.classList.remove('active');
  setTimeout(() => {
    if (!battingOverlay.classList.contains('active')) {
      battingOverlay.style.display = 'none';
    }
  }, 300);
}

function confirmBet() {
  const betAmountInput = document.getElementById('betAmount');
  const selectedOption = document.getElementById('selectedOption')?.textContent.split(": ")[1];
  const rawInput = betAmountInput?.value.trim();
  const betAmount = parseFloat(rawInput);
  if (!rawInput || isNaN(betAmount) || betAmount < 1) {
    showToast("Please enter a valid amount of ₹1 or more");
    return;
  }
  if (!selectedOption) {
    showToast("Please select an option");
    return;
  }
  if (betAmount > walletBalance) {
    showToast(`Insufficient balance! Available: ₹${walletBalance.toLocaleString()}`);
    return;
  }
  walletBalance -= betAmount;
  updateWalletBalance();
  userBetHistory.unshift({
    option: selectedOption,
    amount: betAmount,
    period: periodCounter,
    timestamp: new Date(),
    status: 'Pending',
    winAmount: 0
  });
  gameStats.totalBets++;
  showToast(`Bet placed! ₹${betAmount.toLocaleString()} deducted from your wallet.`);
  closeBattingSlide();
  updatePortfolio();
  saveGameState();
}

function checkBettingResult() {
  if (results.length === 0) return;
  const latestResult = results[0];
  const previousPeriod = latestResult.period;
  const pendingBets = userBetHistory.filter(bet => bet.period === previousPeriod && bet.status === 'Pending');
  if (pendingBets.length === 0) return;
  let totalWinAmount = 0;
  pendingBets.forEach(bet => {
    let winAmount = 0;
    const isUp = bet.option === "Up" && latestResult.number >= 5;
    const isDown = bet.option === "Down" && latestResult.number < 5;
    const isRed = bet.option === "Red C" && latestResult.colorClass === "red";
    const isGreen = bet.option === "Green C" && latestResult.colorClass === "green";
    const isViolet = bet.option === "Violet C" && latestResult.colorClass === "violet";
    const isNumber = parseInt(bet.option) === latestResult.number;
    if (isUp || isDown || (isRed && latestResult.number !== 5) || (isGreen && latestResult.number !== 0)) {
      winAmount = bet.amount * MULTIPLIERS.COLOR_WIN;
    } else if ((isRed && latestResult.number === 0) || (isGreen && latestResult.number === 5)) {
      winAmount = bet.amount * MULTIPLIERS.SPECIAL_COLOR_WIN;
    } else if (isViolet) {
      winAmount = bet.amount * MULTIPLIERS.VIOLET_WIN;
    } else if (isNumber) {
      winAmount = bet.amount * MULTIPLIERS.NUMBER_WIN;
    }
    bet.status = winAmount > 0 ? 'Win' : 'Loss';
    bet.winAmount = winAmount;
    bet.resultProcessedAt = new Date();
    if (winAmount > 0) {
      totalWinAmount += winAmount;
      gameStats.totalWins++;
      gameStats.totalAmountWon += winAmount;
      gameStats.currentStreak++;
      if (winAmount > gameStats.biggestWin) {
        gameStats.biggestWin = winAmount;
      }
      if (gameStats.currentStreak > gameStats.winStreak) {
        gameStats.winStreak = gameStats.currentStreak;
      }
    } else {
      gameStats.currentStreak = 0;
    }
  });
  if (totalWinAmount > 0) {
    walletBalance += totalWinAmount;
    updateWalletBalance();
  }
  if (totalWinAmount > 0) {
    showCustomAlert(true, latestResult.number, latestResult.colorClass, totalWinAmount, latestResult.period);
  } else {
    showCustomAlert(false);
  }
  updateMyBetHistory();
  updatePortfolio();
  saveGameState();
}

function showCustomAlert(isWin, winningNumber = null, winningColor = null, won = null, periodNo = null) {
  const alertBox = document.createElement('div');
  alertBox.className = 'custom-alert';
  alertBox.style.backgroundImage = isWin ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' : 'linear-gradient(135deg, #f44336, #c62828)';
  alertBox.innerHTML = isWin ? `
    <div class="alert-message">
      <h1>Congratulations!</h1>
      <p>You won ₹${won.toFixed(2)}</p>
      <p>Result: ${winningNumber} (${winningColor})</p>
      <p>Period: ${periodNo}</p>
    </div>
  ` : `
    <div class="alert-message">
      <h1>Sorry!</h1>
      <p>You didn't win this time.</p>
    </div>
  `;
  document.body.appendChild(alertBox);
  setTimeout(() => {
    alertBox.style.opacity = '0';
    setTimeout(() => alertBox.remove(), 300);
  }, 3000);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function updateWalletBalance() {
  const walletBalanceBox = document.getElementById('walletBalanceBox');
  if (walletBalanceBox) walletBalanceBox.textContent = `₹${walletBalance.toLocaleString()}`;
}

function updateNavigationButtons() {
  const previousBtn = document.getElementById('previous-btn');
  const nextBtn = document.getElementById('next-btn');
  if (!previousBtn || !nextBtn) return;
  previousBtn.disabled = currentPage === 0;
  nextBtn.disabled = (currentPage + 1) * resultsPerPage >= results.length;
}

function updateMyBetNavigationButtons() {
  const previousBtn = document.getElementById('mybet-previous-btn');
  const nextBtn = document.getElementById('mybet-next-btn');
  if (!previousBtn || !nextBtn) return;
  previousBtn.disabled = myBetCurrentPage === 0;
  nextBtn.disabled = (myBetCurrentPage + 1) * betsPerPage >= userBetHistory.length;
}

function showPreviousPage() {
  if (currentPage > 0) {
    currentPage--;
    updateHistory();
  }
}

function showNextPage() {
  if ((currentPage + 1) * resultsPerPage < results.length) {
    currentPage++;
    updateHistory();
  }
}

function showPreviousMyBetPage() {
  if (myBetCurrentPage > 0) {
    myBetCurrentPage--;
    updateMyBetHistory();
  }
}

function showNextMyBetPage() {
  if ((myBetCurrentPage + 1) * betsPerPage < userBetHistory.length) {
    myBetCurrentPage++;
    updateMyBetHistory();
  }
}

function showCountdownOverlay() {
  const gameBox = document.querySelector('.game-box');
  if (!gameBox) return;
  const countdownOverlay = document.createElement('div');
  countdownOverlay.className = 'countdown-overlay';
  countdownOverlay.innerHTML = `<div class="countdown-timer">5</div>`;
  gameBox.appendChild(countdownOverlay);
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    countdownOverlay.querySelector('.countdown-timer').textContent = countdown;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownOverlay.remove();
    }
  }, 1000);
}

function switchSection(section) {
  const sections = ['history-section', 'progress-section', 'portfolio-section'];
  sections.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  });
  if (section === 'history') {
    document.getElementById('history-section').style.display = 'block';
  } else if (section === 'progress') {
    document.getElementById('progress-section').style.display = 'block';
  } else if (section === 'portfolio') {
    document.getElementById('portfolio-section').style.display = 'block';
    updateMyBetHistory();
  }
  document.querySelectorAll('.section-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${section}-btn`).classList.add('active');
}

function updatePortfolio() {
  document.getElementById('total-bets').textContent = gameStats.totalBets;
  document.getElementById('total-wins').textContent = `₹${gameStats.totalAmountWon.toLocaleString()}`;
  document.getElementById('biggest-win').textContent = `₹${gameStats.biggestWin.toLocaleString()}`;
  const rate = gameStats.totalBets > 0 ? Math.round((gameStats.totalWins / gameStats.totalBets) * 100) : 0;
  document.getElementById('win-rate').textContent = `${rate}%`;
}

function updatePageInfo() {
  const totalPages = Math.ceil(results.length / resultsPerPage);
  document.getElementById('page-info').textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
}

function updateMyBetPageInfo() {
  const totalPages = Math.ceil(userBetHistory.length / betsPerPage);
  document.getElementById('mybet-page-info').textContent = `Page ${myBetCurrentPage + 1} of ${totalPages || 1}`;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled);
  updateSoundIcon();
}

function updateSoundIcon() {
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  }
}

function resetGame() {
  if (confirm("Are you sure you want to reset the game? All your progress will be lost.")) {
    localStorage.removeItem('wingoGameState');
    location.reload();
  }
}