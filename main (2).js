'use strict';

const canvas = document.getElementById('ca-canvas');
const ctx = canvas.getContext('2d');

const scatterCanvas = document.getElementById('scatter-canvas');
const scatterCtx = scatterCanvas.getContext('2d');

const entropyCanvas = document.getElementById('entropy-canvas');
const entropyCtx = entropyCanvas.getContext('2d');

let currentRule = 30;
let cellSize = 2;
let gridWidth = 300;
let running = false;
let paused = false;
let animFrame = null;
let generation = 0;
let rows = [];
let entropyHistory = [];
let maxRows = 0;
let speed = 8;
let stepInterval = null;
let initMode = 'single';

let measuredClass = null;
let avgEntropy = 0;
let lastLZ = 0;

function getInitRow(width, mode) {
  const row = new Array(width).fill(0);
  if (mode === 'single') {
    row[Math.floor(width / 2)] = 1;
  } else if (mode === 'random') {
    for (let i = 0; i < width; i++) row[i] = Math.random() > 0.5 ? 1 : 0;
  } else if (mode === 'pattern') {
    for (let i = 0; i < width; i++) row[i] = i % 2;
  }
  return row;
}

function stepCA(prev, rule) {
  const w = prev.length;
  const next = new Array(w).fill(0);
  for (let i = 0; i < w; i++) {
    const l = prev[(i - 1 + w) % w];
    const c = prev[i];
    const r = prev[(i + 1) % w];
    const idx = (l << 2) | (c << 1) | r;
    next[i] = (rule >> idx) & 1;
  }
  return next;
}

function setupCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  maxRows = Math.floor(wrap.clientHeight / cellSize) || 200;
  canvas.width  = gridWidth * cellSize;
  canvas.height = maxRows * cellSize;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRow(row, rowIdx) {
  for (let i = 0; i < row.length; i++) {
    ctx.fillStyle = row[i] ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(i * cellSize, rowIdx * cellSize, cellSize, cellSize);
  }
}

function redrawAll() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows.length; r++) {
    drawRow(rows[r], r);
  }
}

function updateMetrics(row) {
  const h = shannonEntropy(row);
  entropyHistory.push(h);

  const totalH = entropyHistory.reduce((a, b) => a + b, 0);
  avgEntropy = totalH / entropyHistory.length;

  const lz = lempelZivComplexity(row);
  lastLZ = lz;

  const lambda = langtonLambda(currentRule);
  measuredClass = classifyFromMetrics(lambda, avgEntropy, lz, gridWidth);

  document.getElementById('val-lambda').textContent = lambda.toFixed(3);
  document.getElementById('val-entropy').textContent = h.toFixed(3);
  document.getElementById('val-lz').textContent = lz;

  const cls = measuredClass;
  const el = document.getElementById('val-class');
  el.textContent = 'Class ' + cls;
  el.className = 'metric-val class-label-' + cls;
  document.getElementById('sub-class').textContent = classDescription(cls).split(':')[1]?.trim().split('.')[0] || '';
  document.getElementById('card-class').style.borderTop = '3px solid ' + classColor(cls);

  document.getElementById('explanation-text').textContent = classDescription(cls);

  drawEntropyChart();
}

function drawEntropyChart() {
  const w = entropyCanvas.width;
  const h = entropyCanvas.height;
  entropyCtx.fillStyle = '#ffffff';
  entropyCtx.fillRect(0, 0, w, h);

  if (entropyHistory.length < 2) return;

  const maxH = 1;
  entropyCtx.beginPath();
  entropyCtx.strokeStyle = '#1a1a1a';
  entropyCtx.lineWidth = 1.5;

  const step = w / Math.max(entropyHistory.length - 1, 1);
  for (let i = 0; i < entropyHistory.length; i++) {
    const x = i * step;
    const y = h - (entropyHistory[i] / maxH) * (h - 10) - 5;
    if (i === 0) entropyCtx.moveTo(x, y);
    else entropyCtx.lineTo(x, y);
  }
  entropyCtx.stroke();

  entropyCtx.strokeStyle = '#ccc';
  entropyCtx.lineWidth = 0.5;
  entropyCtx.setLineDash([3, 3]);
  const midY = h - (0.5 / maxH) * (h - 10) - 5;
  entropyCtx.beginPath();
  entropyCtx.moveTo(0, midY);
  entropyCtx.lineTo(w, midY);
  entropyCtx.stroke();
  entropyCtx.setLineDash([]);
}

function runStep() {
  if (rows.length === 0) return;

  const prev = rows[rows.length - 1];
  const next = stepCA(prev, currentRule);

  if (rows.length >= maxRows) {
    rows.shift();
    redrawAll();
    rows.push(next);
    drawRow(next, rows.length - 1);
  } else {
    rows.push(next);
    drawRow(next, rows.length - 1);
  }

  generation++;
  document.getElementById('gen-num').textContent = generation;

  if (generation % 3 === 0) updateMetrics(next);
}

function startRunning() {
  if (stepInterval) clearInterval(stepInterval);
  running = true;
  paused = false;
  document.getElementById('pause-btn').textContent = 'Pause';

  const delay = Math.max(1, Math.round((21 - speed) * 4));
  stepInterval = setInterval(() => {
    if (!paused) {
      const batchSize = Math.max(1, Math.floor(speed / 4));
      for (let i = 0; i < batchSize; i++) runStep();
    }
  }, delay);
}

function initRun() {
  if (stepInterval) clearInterval(stepInterval);
  running = false;
  paused = false;
  generation = 0;
  entropyHistory = [];
  measuredClass = null;
  rows = [];

  setupCanvas();
  updateDNA();

  const predicted = predictClass(currentRule);
  const lambda = langtonLambda(currentRule);

  document.getElementById('val-pred').textContent = 'Class ' + predicted;
  document.getElementById('sub-pred').textContent = 'lambda = ' + lambda.toFixed(3);
  document.getElementById('val-class').textContent = '—';
  document.getElementById('val-class').className = 'metric-val';
  document.getElementById('card-class').style.borderTop = '';
  document.getElementById('sub-class').textContent = 'run to classify';
  document.getElementById('val-entropy').textContent = '—';
  document.getElementById('val-lz').textContent = '—';
  document.getElementById('val-lambda').textContent = lambda.toFixed(3);
  document.getElementById('gen-num').textContent = '0';

  const firstRow = getInitRow(gridWidth, initMode);
  rows.push(firstRow);
  drawRow(firstRow, 0);

  document.getElementById('explanation-text').textContent =
    'Rule ' + currentRule + ' — predicted class: ' + predicted + '. Lambda = ' + lambda.toFixed(3) + '. Running...';

  startRunning();
  drawScatter();
}

function updateDNA() {
  const container = document.getElementById('rule-dna');
  container.innerHTML = '';

  const neighbourhoods = ['111','110','101','100','011','010','001','000'];
  for (let i = 7; i >= 0; i--) {
    const bit = (currentRule >> i) & 1;
    const wrap = document.createElement('div');
    wrap.className = 'dna-bit';

    const nbh = document.createElement('div');
    nbh.className = 'dna-neighbourhood';
    nbh.textContent = neighbourhoods[7 - i];

    const cell = document.createElement('div');
    cell.className = 'dna-cell ' + (bit ? 'alive' : 'dead');
    cell.title = 'Pattern ' + neighbourhoods[7 - i] + ' maps to ' + bit;

    wrap.appendChild(nbh);
    wrap.appendChild(cell);
    container.appendChild(wrap);
  }
}

function drawScatter() {
  const w = scatterCanvas.width;
  const h = scatterCanvas.height;
  scatterCtx.fillStyle = '#ffffff';
  scatterCtx.fillRect(0, 0, w, h);

  scatterCtx.strokeStyle = '#eee';
  scatterCtx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const x = 20 + (i / 4) * (w - 30);
    scatterCtx.beginPath();
    scatterCtx.moveTo(x, 10);
    scatterCtx.lineTo(x, h - 20);
    scatterCtx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const y = 10 + (i / 4) * (h - 30);
    scatterCtx.beginPath();
    scatterCtx.moveTo(20, y);
    scatterCtx.lineTo(w - 10, y);
    scatterCtx.stroke();
  }

  scatterCtx.font = '9px Verdana';
  scatterCtx.fillStyle = '#aaa';
  scatterCtx.textAlign = 'center';
  scatterCtx.fillText('Lambda', w / 2, h - 5);
  scatterCtx.save();
  scatterCtx.translate(10, h / 2);
  scatterCtx.rotate(-Math.PI / 2);
  scatterCtx.fillText('Entropy', 0, 0);
  scatterCtx.restore();

  for (let rule = 0; rule < 256; rule++) {
    const lambda = langtonLambda(rule);
    const predicted = predictClass(rule);

    const baseEntropy = getApproxEntropy(rule);

    const x = 20 + lambda * (w - 30);
    const y = h - 20 - baseEntropy * (h - 30);

    scatterCtx.beginPath();
    scatterCtx.arc(x, y, rule === currentRule ? 5 : 2.5, 0, Math.PI * 2);

    if (rule === currentRule) {
      scatterCtx.fillStyle = '#1a1a1a';
      scatterCtx.strokeStyle = '#1a1a1a';
      scatterCtx.lineWidth = 1;
      scatterCtx.fill();
      scatterCtx.stroke();
    } else {
      scatterCtx.fillStyle = classColor(predicted);
      scatterCtx.globalAlpha = 0.65;
      scatterCtx.fill();
      scatterCtx.globalAlpha = 1;
    }
  }
}

function getApproxEntropy(rule) {
  const lambda = langtonLambda(rule);
  const p = lambda;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

scatterCanvas.addEventListener('click', e => {
  const rect = scatterCanvas.getBoundingClientRect();
  const scaleX = scatterCanvas.width  / rect.width;
  const scaleY = scatterCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;
  const w = scatterCanvas.width;
  const h = scatterCanvas.height;

  let closestRule = 0;
  let closestDist = Infinity;

  for (let rule = 0; rule < 256; rule++) {
    const lambda = langtonLambda(rule);
    const baseEntropy = getApproxEntropy(rule);
    const x = 20 + lambda * (w - 30);
    const y = h - 20 - baseEntropy * (h - 30);
    const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closestRule = rule;
    }
  }

  if (closestDist < 20) {
    currentRule = closestRule;
    document.getElementById('rule-input').value = currentRule;
    document.getElementById('rule-slider').value = currentRule;
    initRun();
  }
});

document.getElementById('run-btn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('rule-input').value);
  if (val >= 0 && val <= 255) {
    currentRule = val;
    document.getElementById('rule-slider').value = val;
  }
  initRun();
});

document.getElementById('rule-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('run-btn').click();
});

document.getElementById('rule-slider').addEventListener('input', function() {
  currentRule = parseInt(this.value);
  document.getElementById('rule-input').value = currentRule;
  updateDNA();
  drawScatter();
});

document.getElementById('pause-btn').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('pause-btn').textContent = paused ? 'Resume' : 'Pause';
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (stepInterval) clearInterval(stepInterval);
  running = false;
  paused = false;
  generation = 0;
  entropyHistory = [];
  rows = [];
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.getElementById('gen-num').textContent = '0';
  document.getElementById('pause-btn').textContent = 'Pause';
});

document.getElementById('step-btn').addEventListener('click', () => {
  if (stepInterval) { clearInterval(stepInterval); stepInterval = null; }
  paused = true;
  running = false;
  document.getElementById('pause-btn').textContent = 'Resume';
  if (rows.length === 0) {
    const firstRow = getInitRow(gridWidth, initMode);
    rows.push(firstRow);
    drawRow(firstRow, 0);
  } else {
    runStep();
  }
});

document.getElementById('speed-slider').addEventListener('input', function() {
  speed = parseInt(this.value);
  document.getElementById('speed-val').textContent = speed;
  if (running && !paused && stepInterval) {
    clearInterval(stepInterval);
    startRunning();
  }
});

document.getElementById('width-slider').addEventListener('input', function() {
  gridWidth = parseInt(this.value);
  document.getElementById('width-val').textContent = gridWidth;
});

document.getElementById('cell-slider').addEventListener('input', function() {
  cellSize = parseInt(this.value);
  document.getElementById('cell-val').textContent = cellSize + 'px';
});

document.getElementById('init-select').addEventListener('change', function() {
  initMode = this.value;
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const rule = parseInt(btn.dataset.rule);
    currentRule = rule;
    document.getElementById('rule-input').value = rule;
    document.getElementById('rule-slider').value = rule;
    initRun();
  });
});

window.addEventListener('resize', () => {
  if (running || rows.length > 0) {
    setupCanvas();
    redrawAll();
  }
});

updateDNA();
drawScatter();

entropyCtx.fillStyle = '#ffffff';
entropyCtx.fillRect(0, 0, entropyCanvas.width, entropyCanvas.height);
entropyCtx.font = '10px Verdana';
entropyCtx.fillStyle = '#ccc';
entropyCtx.textAlign = 'center';
entropyCtx.fillText('run a rule to see entropy over time', entropyCanvas.width / 2, entropyCanvas.height / 2);
