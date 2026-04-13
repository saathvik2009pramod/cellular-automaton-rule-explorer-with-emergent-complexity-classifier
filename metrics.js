'use strict';

function langtonLambda(rule) {
  let alive = 0;
  for (let i = 0; i < 8; i++) {
    if ((rule >> i) & 1) alive++;
  }
  return alive / 8;
}

function shannonEntropy(row) {
  let ones = 0;
  for (let i = 0; i < row.length; i++) ones += row[i];
  const p1 = ones / row.length;
  const p0 = 1 - p1;
  if (p1 === 0 || p0 === 0) return 0;
  return -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
}

function lempelZivComplexity(row) {
  const s = row.join('');
  const n = s.length;
  let c = 1;
  let l = 1;
  let i = 0;
  let k = 1;
  let kMax = 1;

  while (i + k <= n) {
    const sub = s.slice(i, i + k);
    const searchStr = s.slice(0, i + k - 1);
    if (searchStr.indexOf(sub) !== -1) {
      k++;
    } else {
      c++;
      i += k;
      k = 1;
      kMax = k;
    }
  }
  return c;
}

function classifyFromMetrics(lambda, avgEntropy, lzC, width) {
  const normLZ = lzC / Math.max(1, width);

  if (lambda < 0.1 || lambda > 0.9) return 'I';

  if (avgEntropy < 0.1) return 'I';

  if (avgEntropy > 0.85 && normLZ > 0.15) return 'III';

  if (avgEntropy > 0.3 && avgEntropy < 0.85 && lambda > 0.2 && lambda < 0.8) {
    if (normLZ > 0.08 && normLZ < 0.25) return 'IV';
  }

  if (avgEntropy < 0.5 && normLZ < 0.12) return 'II';

  if (avgEntropy > 0.75) return 'III';

  return 'II';
}

function predictClass(rule) {
  const lambda = langtonLambda(rule);

  if (lambda < 0.1 || lambda > 0.9) return 'I';
  if (lambda < 0.2 || lambda > 0.85) return 'II';

  const knownIV = [54, 110, 124, 137, 193];
  if (knownIV.includes(rule)) return 'IV';

  if (lambda > 0.35 && lambda < 0.65) return 'III';

  return 'II';
}

function classDescription(cls) {
  const descs = {
    'I':   'Class I: Uniform or dying. The pattern collapses to a fixed state regardless of starting conditions.',
    'II':  'Class II: Periodic or stable. Small repeating structures form and persist, similar to a blinking pattern.',
    'III': 'Class III: Chaotic. The output looks essentially random with very high information content.',
    'IV':  'Class IV: Complex. Localised structures emerge and interact in unpredictable ways. Rule 110 belongs here and is Turing complete.'
  };
  return descs[cls] || '';
}

function classColor(cls) {
  const colors = { 'I': '#aaaaaa', 'II': '#4a90d9', 'III': '#e05c4a', 'IV': '#4caf77' };
  return colors[cls] || '#999';
}

function computeAllRuleMetrics() {
  const results = [];
  for (let rule = 0; rule < 256; rule++) {
    const lambda = langtonLambda(rule);
    const predicted = predictClass(rule);
    results.push({ rule, lambda, predicted });
  }
  return results;
}
