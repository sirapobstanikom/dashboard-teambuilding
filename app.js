/**
 * Olympic Challenge Dashboard - Real-time scoreboard logic
 * Timer, rankings, score updates, confetti
 */

const TEAMS = ['green', 'red', 'yellow', 'blue'];
const MAX_SCORE = 100; // progress bar scale

let scores = { green: 0, red: 0, yellow: 0, blue: 0 };
let medals = { green: 0, red: 0, yellow: 0, blue: 0 };
let timerSeconds = 5 * 60; // 5 minutes
let timerInterval = null;
let lastUpdateTime = null;

// DOM refs
const scoreEls = {};
const stripScoreEls = {};
const progressEls = {};
const medalEls = {};
const rankBadges = {};
const cardRanks = {};

TEAMS.forEach(t => {
  scoreEls[t] = document.getElementById(`score-${t}`);
  stripScoreEls[t] = document.getElementById(`strip-score-${t}`);
  progressEls[t] = document.getElementById(`progress-${t}`);
  medalEls[t] = document.getElementById(`medals-${t}`);
  rankBadges[t] = document.querySelector(`.scoreboard-item[data-team="${t}"] .rank-badge`);
  cardRanks[t] = document.querySelector(`.team-card[data-team="${t}"] .card-rank`);
});

const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const lastUpdateEl = document.getElementById('last-update');
const confettiContainer = document.getElementById('confetti-container');

// ----- Timer -----
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds = Math.max(0, timerSeconds - 1);
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
    if (timerSeconds === 0) clearInterval(timerInterval);
  }, 1000);
}

function initTimer() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
  startTimer();
}

// ----- Rankings -----
function getRankedTeams() {
  return [...TEAMS].sort((a, b) => scores[b] - scores[a]);
}

function updateRankings() {
  const ranked = getRankedTeams();
  ranked.forEach((team, index) => {
    const rank = index + 1;
    if (rankBadges[team]) rankBadges[team].textContent = rank;
    if (cardRanks[team]) cardRanks[team].textContent = rank;
  });
}

// ----- Score & UI -----
function setLastUpdate() {
  const now = new Date();
  lastUpdateTime = now;
  if (lastUpdateEl) {
    lastUpdateEl.textContent = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

function updateTeamScore(team, newScore, addMedal = false) {
  const prev = scores[team];
  scores[team] = Math.max(0, newScore);
  if (addMedal) medals[team] = (medals[team] || 0) + 1;

  const el = scoreEls[team];
  const stripEl = stripScoreEls[team];
  const progressEl = progressEls[team];
  const medalEl = medalEls[team];

  if (el) {
    el.textContent = scores[team];
    if (scores[team] > prev) el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 400);
  }
  if (stripEl) stripEl.textContent = scores[team];
  if (progressEl) {
    const pct = Math.min(100, (scores[team] / MAX_SCORE) * 100);
    progressEl.style.width = pct + '%';
  }
  if (medalEl) medalEl.textContent = medals[team];

  updateRankings();
  setLastUpdate();
}

// ----- Confetti -----
const CONFETTI_COLORS = ['#00c853', '#c62828', '#ffc107', '#1565c0', '#fff', '#ffd54f'];

function createConfetti() {
  const count = 40 + Math.floor(Math.random() * 30);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDelay = Math.random() * 2 + 's';
    el.style.animationDuration = (3 + Math.random() * 2) + 's';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.width = (6 + Math.random() * 8) + 'px';
    el.style.height = (6 + Math.random() * 6) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    confettiContainer.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}

// ----- Simulated real-time updates -----
function randomTeam() {
  return TEAMS[Math.floor(Math.random() * TEAMS.length)];
}

function simulateScoreUpdate() {
  const team = randomTeam();
  const change = Math.random() > 0.5 ? 5 : 10;
  const newScore = scores[team] + change;
  updateTeamScore(team, newScore, Math.random() > 0.7);
  if (Math.random() > 0.85) createConfetti();
}

// ----- Init -----
function init() {
  initTimer();
  updateRankings();
  setLastUpdate();

  // Initial confetti burst
  setTimeout(createConfetti, 800);

  // Simulate updates every 4–8 seconds
  setInterval(simulateScoreUpdate, 4000 + Math.random() * 4000);

  // Optional: set initial demo scores
  setTimeout(() => {
    updateTeamScore('green', 45);
    updateTeamScore('red', 38);
    updateTeamScore('yellow', 32);
    updateTeamScore('blue', 28);
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
