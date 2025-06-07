/**
 * Wingo Game for SR777 CLUB
 * Fully functional implementation with trading chart
 */

// Game state
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
let tradingChart = null;
let chartData = [];
let chartUpdateInterval = null;

// Game statistics
let gameStats = {
  totalBets: 0,
  totalWins: 0,
  totalAmountWon: 0,
  biggestWin: 0,
  winStreak: 0,
  currentStreak: 0
};

// Multipliers
const MULTIPLIERS = {
  COLOR_WIN: 1.90,
  VIOLET_WIN: 4.40,
  NUMBER_WIN: 8.10,
  SPECIAL_COLOR_WIN: 1.5
};

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  switchSection('history');
  setupEventListeners();
});

// Initialize game
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

// Set up event listeners
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
  
  // Long press on logo to reset game
  let pressTimer;
  const logo = document.querySelector('.logo-container h1');
  logo.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      resetGame();
    }, 3000);
  });
  
  logo.addEventListener('mouseup', () => clearTimeout(pressTimer));
  logo.addEventListener('mouseleave', () => clearTimeout(pressTimer));

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
    clearInterval(chartUpdateInterval);
  });
}

// Initialize trading chart
function initTradingChart() {
  const ctx = document.getElementById('trading-chart').getContext('2d');
  
  // Generate initial chart data
  chartData = generateChartData(30);
  
  tradingChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: 30}, (_, i) => i + 1),
      datasets: [{
        label: 'Price',
        data: chartData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: false,
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              return value.toFixed(2);
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Price: ${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      animation: {
        duration: 0
      }
    }
  });
  
  // Start chart update interval
  chartUpdateInterval = setInterval(updateChart, 1000);
}

// Generate random chart data with realistic price movement
function generateChartData(count) {
  const data = [];
  let lastValue = 100 + Math.random() * 50;
  let trend = Math.random() > 0.5 ? 1 : -1;
  let volatility = 0.5 + Math.random() * 2;
  
  for (let i = 0; i < count; i++) {
    // Occasionally change trend
    if (Math.random() < 0.1) {
      trend *= -1;
      volatility = 0.5 + Math.random() * 2;
    }
    
    const change = (Math.random() * volatility + 0.1) * trend;
    lastValue += change;
    data.push(lastValue);
  }
  
  return data;
}

// Update chart with new data
function updateChart() {
  // Remove first element and add new one
  chartData.shift();
  
  const lastValue = chartData[chartData.length - 1];
  
  // Calculate new price with realistic movement
  let change;
  if (Math.random() < 0.2) {
    // 20% chance to reverse trend
    change = (Math.random() - 0.5) * 2;
  } else {
    // Continue current trend with some randomness
    const prevChange = chartData[chartData.length - 1] - chartData[chartData.length - 2];
    const trend = prevChange >= 0 ? 1 : -1;
    change = (Math.random() * 0.5 + 0.1) * trend;
  }
  
  const newValue = lastValue + change;
  chartData.push(newValue);
  
  // Update chart
  tradingChart.data.datasets[0].data = chartData;
  tradingChart.update('none');
}

// Generate period number based on current date
function generatePeriodNumber() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  return `${day}${month}${year}00001`;
}

// Load game state from localStorage
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

// Save game state to localStorage
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

// Start the timer
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

// Update timer display
function updateTimerDisplay() {
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Generate a random number and update results
function generateRandomNumber() {
  const number = Math.floor(Math.random() * 10);
  const colorClass = getColorClass(number);
  
  // Add to results
  results.unshift({ number, colorClass, period: periodCounter });
  
  // Check betting results
  checkBettingResult();
  
  // Increment period number
  const currentNum = parseInt(periodCounter.slice(8));
  periodCounter = periodCounter.slice(0, 8) + String(currentNum + 1).padStart(5, '0');
  
  // Update UI
  updateWingoNumbers();
  updateHistory();
  updateNextPeriod();
  updatePortfolio();
  
  saveGameState();
}

// Get the color class for a number
function getColorClass(number) {
  if (number === 0 || number === 5) return 'violet';
  return number % 2 === 0 ? 'red' : 'green';
}

// Update Wingo numbers display
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

// Update results history
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

// Update My Bet history
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

// Update next period display
function updateNextPeriod() {
  const nextPeriod = document.getElementById('period-number');
  if (nextPeriod) nextPeriod.textContent = periodCounter;
}

// Open betting slide
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

// Close betting slide
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

// Confirm bet
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
  
  // Deduct bet amount from balance
  walletBalance -= betAmount;
  updateWalletBalance();
  
  // Add bet record
  userBetHistory.unshift({
    option: selectedOption,
    amount: betAmount,
    period: periodCounter,
    timestamp: new Date(),
    status: 'Pending',
    winAmount: 0
  });
  
  // Update game stats
  gameStats.totalBets++;
  
  showToast(`Bet placed! ₹${betAmount.toLocaleString()} deducted from your wallet.`);
  closeBattingSlide();
  
  updatePortfolio();
  saveGameState();
}

// Check betting result
function checkBettingResult() {
  if (results.length === 0) return;
  
  const latestResult = results[0];
  const previousPeriod = latestResult.period;
  
  const pendingBets = userBetHistory.filter(bet => 
    bet.period === previousPeriod && bet.status === 'Pending'
  );

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

    // Update bet status
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
    // Update user balance
    walletBalance += totalWinAmount;
    updateWalletBalance();
  }

  // Show alert based on win/loss
  if (totalWinAmount > 0) {
    showCustomAlert(true, latestResult.number, latestResult.colorClass, totalWinAmount, latestResult.period);
  } else {
    showCustomAlert(false);
  }
  
  updateMyBetHistory();
  updatePortfolio();
  saveGameState();
}

// Show custom alert
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

// Show toast notification
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

// Update wallet balance display
function updateWalletBalance() {
  const walletBalanceBox = document.getElementById('walletBalanceBox');
  if (walletBalanceBox) walletBalanceBox.textContent = `₹${walletBalance.toLocaleString()}`;
}

// Update navigation buttons
function updateNavigationButtons() {
  const previousBtn = document.getElementById('previous-btn');
  const nextBtn = document.getElementById('next-btn');
  if (!previousBtn || !nextBtn) return;

  previousBtn.disabled = currentPage === 0;
  nextBtn.disabled = (currentPage + 1) * resultsPerPage >= results.length;
}

// Update My Bet navigation buttons
function updateMyBetNavigationButtons() {
  const previousBtn = document.getElementById('mybet-previous-btn');
  const nextBtn = document.getElementById('mybet-next-btn');
  if (!previousBtn || !nextBtn) return;

  previousBtn.disabled = myBetCurrentPage === 0;
  nextBtn.disabled = (myBetCurrentPage + 1) * betsPerPage >= userBetHistory.length;
}

// Navigation for History
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

// Navigation for My Bet
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

// Show countdown overlay
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

// Switch sections
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

// Update portfolio
function updatePortfolio() {
  document.getElementById('total-bets').textContent = gameStats.totalBets;
  document.getElementById('total-wins').textContent = `₹${gameStats.totalAmountWon.toLocaleString()}`;
  document.getElementById('biggest-win').textContent = `₹${gameStats.biggestWin.toLocaleString()}`;
  
  const rate = gameStats.totalBets > 0 ? 
    Math.round((gameStats.totalWins / gameStats.totalBets) * 100) : 0;
  document.getElementById('win-rate').textContent = `${rate}%`;
}

// Update page info
function updatePageInfo() {
  const totalPages = Math.ceil(results.length / resultsPerPage);
  document.getElementById('page-info').textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
}

// Update My Bet page info
function updateMyBetPageInfo() {
  const totalPages = Math.ceil(userBetHistory.length / betsPerPage);
  document.getElementById('mybet-page-info').textContent = `Page ${myBetCurrentPage + 1} of ${totalPages || 1}`;
}

// Toggle sound
function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled);
  updateSoundIcon();
}

// Update sound icon
function updateSoundIcon() {
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  }
}

// Reset game
function resetGame() {
  if (confirm("Are you sure you want to reset the game? All your progress will be lost.")) {
    localStorage.removeItem('wingoGameState');
    location.reload();
  }
}