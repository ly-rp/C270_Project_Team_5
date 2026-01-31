const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const themeToggle = document.getElementById("theme-toggle");
const modeSelect = document.getElementById("mode-select");

const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");

const leaderboardBtn = document.getElementById("leaderboard-btn");
const leaderboardPanel = document.getElementById("leaderboard-panel");
const leaderboardList = document.getElementById("leaderboard-list");

/* ================= LEADERBOARD ================= */
//If the leaderboard is not working when running, please let me know. Errors are common :c -Eleanor
let leaderboardData = [];

// Fetch leaderboard data from backend
async function fetchLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    leaderboardData = data;
    renderLeaderboard();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Show error message in leaderboard panel
    if (leaderboardList) {
      leaderboardList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #999;">
          Failed to load leaderboard data.
        </div>
      `;
    }
  }
}

function renderLeaderboard() {
  if (!leaderboardList) return;

  if (leaderboardData.length === 0) {
    leaderboardList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #999;">
        No leaderboard data available.
      </div>
    `;
    return;
  }

  const data = [...leaderboardData].slice(0, 10);

  leaderboardList.innerHTML = data
    .map((row, i) => {
      return `
        <div class="lb-item">
          <div class="lb-rank">${i + 1}</div>
          <div class="lb-name">${row.name}</div>
          <div class="lb-score">${row.best}</div>
        </div>
      `;
    })
    .join("");
}

/* ================= PANEL TOGGLE (MANUAL CONTROL) ================= */

function hidePanelsOnStart() {
  if (settingsPanel) settingsPanel.classList.add("hidden");
  if (leaderboardPanel) leaderboardPanel.classList.add("hidden");
}

// Toggle settings (does NOT auto-close leaderboard)
if (settingsBtn && settingsPanel) {
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsPanel.classList.toggle("hidden");
  });

  settingsPanel.addEventListener("click", (e) => e.stopPropagation());
}

// Toggle leaderboard (does NOT auto-close settings)
if (leaderboardBtn && leaderboardPanel) {
  leaderboardBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    leaderboardPanel.classList.toggle("hidden");
    // Refresh leaderboard data when opening the panel
    if (!leaderboardPanel.classList.contains("hidden")) {
      fetchLeaderboard();
    }
  });

  leaderboardPanel.addEventListener("click", (e) => e.stopPropagation());
}

// Clicking outside closes BOTH
document.addEventListener("click", () => {
  if (settingsPanel) settingsPanel.classList.add("hidden");
  if (leaderboardPanel) leaderboardPanel.classList.add("hidden");
});

/* ================= GAME STATE ================= */

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;
let mode = modeSelect ? modeSelect.value : "2p";

/* ================= WIN CONDITIONS ================= */

const winningThreeCombinations = [
  [0, 1, 2],[3, 4, 5],[6, 7, 8],
  [0, 3, 6],[1, 4, 7],[2, 5, 8],
  [0, 4, 8],[2, 4, 6]
];

/* ================= SCOREBOARD ================= */

let scores = { player: 0, computer: 0, tie: 0 };

function updateScoreboard() {
  const p = document.getElementById("player-score");
  const c = document.getElementById("computer-score");
  const t = document.getElementById("tie-score");
  if (!p || !c || !t) return;

  p.textContent = scores.player;
  c.textContent = scores.computer;
  t.textContent = scores.tie;
}

function updateScoreLabels() {
  const leftLabel = document.getElementById("left-label");
  const rightLabel = document.getElementById("right-label");
  if (!leftLabel || !rightLabel) return;

  if (mode === "bot") {
    leftLabel.textContent = "Player";
    rightLabel.textContent = "Bot";
  } else {
    leftLabel.textContent = "Player X";
    rightLabel.textContent = "Player O";
  }
}

function updateTurnText() {
  if (!statusText) return;

  if (mode === "bot") {
    statusText.textContent =
      currentPlayer === "X" ? "Player X's turn" : "Bot's turn";
  } else {
    statusText.textContent =
      currentPlayer === "X" ? "Player X's turn" : "Player O's turn";
  }
}

/* ================= GAME LOGIC ================= */

cells.forEach(cell => cell.addEventListener("click", handleCellClick));

function handleCellClick() {
  const index = this.getAttribute("data-index");
  if (board[index] !== "" || !gameActive) return;

  board[index] = currentPlayer;
  this.textContent = currentPlayer;

  checkResult();

  // Bot moves only when it's O's turn in bot mode
  if (gameActive && mode === "bot" && currentPlayer === "O") {
    setTimeout(botMove, 250);
  }
}

function checkResult() {
  // Win
  for (let combo of winningThreeCombinations) {
    const [a, b, c] = combo;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      gameActive = false;

      // scoring (both modes)
      if (currentPlayer === "X") scores.player++;
      else scores.computer++;

      if (mode === "bot") {
        statusText.textContent = currentPlayer === "X" ? "You win!" : "Bot wins!";
      } else {
        statusText.textContent = currentPlayer === "X" ? "Player X wins!" : "Player O wins!";
      }

      updateScoreboard();
      return;
    }
  }

  // Tie
  if (!board.includes("")) {
    gameActive = false;
    scores.tie++;
    statusText.textContent = "It's a tie!";
    updateScoreboard();
    return;
  }

  // Switch turn
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnText();
}

function resetGame() {
  board = ["", "", "", "", "", "", "", "", ""];
  gameActive = true;
  currentPlayer = "X";
  updateTurnText();
  cells.forEach(cell => (cell.textContent = ""));
}

function resetScores() {
  scores = { player: 0, computer: 0, tie: 0 };
  updateScoreboard();
}

/* ================= BOT ================= */

function findWinningMove(player) {
  for (let combo of winningThreeCombinations) {
    const [a, b, c] = combo;
    const vals = [board[a], board[b], board[c]];

    if (vals.filter(v => v === player).length === 2 && vals.includes("")) {
      if (board[a] === "") return a;
      if (board[b] === "") return b;
      if (board[c] === "") return c;
    }
  }
  return null;
}

function botMove() {
  let move = findWinningMove("O") || findWinningMove("X");

  if (move === null) {
    const empty = board
      .map((v, i) => (v === "" ? i : null))
      .filter(v => v !== null);
    move = empty[Math.floor(Math.random() * empty.length)];
  }

  board[move] = "O";
  cells[move].textContent = "O";
  checkResult();
}

/* ================= THEME ================= */

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

/* ================= MODE ================= */

if (modeSelect) {
  modeSelect.addEventListener("change", () => {
    mode = modeSelect.value;
    resetGame();
    resetScores();
    updateScoreLabels();
    updateTurnText();
  });
}

/* ================= INIT ================= */

window.addEventListener("load", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  hidePanelsOnStart();
  fetchLeaderboard(); // Fetch leaderboard from backend on page load
  updateScoreLabels();
  updateTurnText();
  updateScoreboard();
});

// testing CodeQL PR scan
