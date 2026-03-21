// src/utils/massUtils.js (REVISED)

/* Constants */
export const PROTON_MASS = 1.007276466621;

export const ATOMIC_MASSES = {
  H: 1.00782503223,
  C: 12.00000000000,
  N: 14.00307400443,
  O: 15.99491461957,
  F: 18.99840316273,
  Na: 22.9897692820,
  P: 30.97376199842,
  S: 31.9720711744,
  Cl: 34.968852682,
  K: 38.9637064864,
  Br: 78.9183376,
  I: 126.904473,
  // Add other elements if needed
};

/* Parse formula string into a plain object {El: count} */
export const parseFormula = (formula) => {
  if (!formula || typeof formula !== 'string') return {};
  const elementMap = new Map();
  const regex = /([A-Z][a-z]*)(\d*)/g;
  const cleanedFormula = formula.replace(/[^A-Za-z0-9]/g, '');
  let match;

  while ((match = regex.exec(cleanedFormula)) !== null) {
    const [, element, countStr] = match;
    if (ATOMIC_MASSES[element]) {
      const count = countStr ? parseInt(countStr, 10) : 1;
      elementMap.set(element, (elementMap.get(element) || 0) + count);
    } else {
      throw new Error(`分子式中包含未知或不支持的元素: ${element}`);
    }
  }
  return Object.fromEntries(elementMap);
};

/* Calculate mass from counts object */
const calculateMassFromCounts = (elementCounts) => {
  let mass = 0;
  if (!elementCounts || typeof elementCounts !== 'object') return 0;
  for (const [element, count] of Object.entries(elementCounts)) {
    const n = Number(count) || 0;
    const m = ATOMIC_MASSES[element];
    if (!m) throw new Error(`未知元素质量: ${element}`);
    mass += m * n;
  }
  return mass;
};

/* Calculate exact neutral mass from formula string */
export const calculateExactMass = (formula) => {
  if (!formula) return 0;
  const elementCounts = parseFormula(formula);
  return calculateMassFromCounts(elementCounts);
};

/* Format formula into canonical order (C H N O P S ... then others) */
export const formatFormulaCanonical = (formula) => {
  const elementCounts = parseFormula(formula);
  const order = ['C', 'H', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'];
  let result = '';

  // Take from ordered list first
  for (const el of order) {
    if (elementCounts[el]) {
      result += el + (elementCounts[el] > 1 ? elementCounts[el] : '');
      delete elementCounts[el];
    }
  }

  // Append remaining elements alphabetically
  const rest = Object.keys(elementCounts).sort();
  for (const el of rest) {
    const count = elementCounts[el];
    if (count && count > 0) result += el + (count > 1 ? count : '');
  }
  return result;
};

/* Calculate RDB (degree of unsaturation) */
export const calculateRDB = (elementCounts) => {
  const C = elementCounts.C || 0;
  const H = elementCounts.H || 0;
  const N = elementCounts.N || 0;
  const P = elementCounts.P || 0;
  const X = (elementCounts.F || 0) + (elementCounts.Cl || 0) + (elementCounts.Br || 0) + (elementCounts.I || 0);

  if (C === 0) return 'N/A';
  const rdb = C - H / 2 - X / 2 + N / 2 + P / 2 + 1;
  return Number.isInteger(rdb) ? rdb : Number(rdb.toFixed(1));
};

/* Enumerate candidate formulas within mass window
   params: { elements, minCounts, maxCounts, targetMz, ppmWindow, charge, maxResults }
*/
// enumerateFormulas with RDB filtering (defaults: minRdb=-1, maxRdb=50)
export const enumerateFormulas = ({
  elements = [], minCounts = {}, maxCounts = {}, targetMz = 0, ppmWindow = 10,
  charge = 1, maxResults = 100, useProton = false, minRdb = -1, maxRdb = 50,
} = {}) => {
  const z = Number(charge) || 0;
  const absZ = Math.abs(z) || 0;
  const targetMzNum = Number(targetMz) || 0;
  const targetMass = (useProton && absZ > 0) ? (absZ * targetMzNum - z * PROTON_MASS) : targetMzNum;
  const massTolerance = (targetMass * Number(ppmWindow || 0)) / 1e6;
  const minMass = targetMass - massTolerance;
  const maxMass = targetMass + massTolerance;

  const candidates = [];
  const sortedElements = [...elements].sort((a, b) => (ATOMIC_MASSES[b] || 0) - (ATOMIC_MASSES[a] || 0));

  function search(elementIndex, currentCounts, currentMass) {
    if (currentMass > maxMass || candidates.length >= maxResults) return;

    if (elementIndex >= sortedElements.length) {
      if (currentMass >= minMass) {
        for (const el in minCounts) {
          if ((currentCounts[el] || 0) < (minCounts[el] || 0)) return;
        }

        const formulaStr = Object.entries(currentCounts)
          .filter(([, count]) => count > 0)
          .map(([el, count]) => `${el}${count > 1 ? count : ''}`)
          .join('');
        if (!formulaStr) return;

        const finalFormula = formatFormulaCanonical(formulaStr);
        const exactMass = currentMass;
        const ionMass = (useProton && z !== 0) ? exactMass + z * PROTON_MASS : exactMass;
        const mz = (z === 0) ? ionMass : ionMass / Math.abs(z);
        // observedMass (来自 targetMass) 与 exactMass (理论) 对比：use (observed - theoretical)/theoretical
const ppmError = (targetMass > 0 && exactMass > 0) ? ((targetMass - exactMass) / exactMass) * 1e6 : null;
        const rdbVal = calculateRDB(currentCounts);
        // calculateRDB may return 'N/A' or a number/string; coerce to number or skip
        if (rdbVal === 'N/A') return;
        const rdb = Number(rdbVal);
        if (!Number.isFinite(rdb)) return;

        // RDB range filter
        if (typeof minRdb === 'number' && rdb < minRdb) return;
        if (typeof maxRdb === 'number' && rdb > maxRdb) return;

        candidates.push({ formula: finalFormula, exactMass, mz, ppmError, rdb });
      }
      return;
    }

    const element = sortedElements[elementIndex];
    const maxCount = Number(maxCounts[element] || 0);
    const elementMass = ATOMIC_MASSES[element] || 0;

    for (let i = maxCount; i >= 0; i--) {
      currentCounts[element] = i;
      search(elementIndex + 1, currentCounts, currentMass + i * elementMass);
    }
  }

  search(0, {}, 0);
  candidates.sort((a, b) => Math.abs((a.ppmError || 0)) - Math.abs((b.ppmError || 0)));
  return candidates.slice(0, maxResults);
};

/* Helper: safe number formatter */
export const formatNumber = (num, precision = 4) => {
  if (!Number.isFinite(Number(num))) return '-';
  return Number(num).toFixed(precision);
};

/* Helper: format ppm with sign */
export const formatPpm = (ppm, precision = 2) => {
  if (ppm === null || ppm === undefined || !Number.isFinite(Number(ppm))) return '-';
  const p = Number(ppm);
  const sign = p > 0 ? '+' : '';
  return sign + p.toFixed(precision);
};

/* Add calculatePpmError to match imports used elsewhere */
export const calculatePpmError = (theoreticalMz, observedMz) => {
  const t = Number(theoreticalMz);
  const o = Number(observedMz);
  if (!Number.isFinite(t) || !Number.isFinite(o) || o === 0) return null;
  return ((t - o) / o) * 1e6;
};

/* Type doc for reference */
/**
 * @typedef {object} FormulaCandidate
 * @property {string} formula
 * @property {number} exactMass
 * @property {number} mz
 * @property {number|null} ppmError
 * @property {number | string} rdb
 */