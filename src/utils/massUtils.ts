// src/utils/massUtils.ts

export const PROTON_MASS = 1.007276466621;

export const ATOMIC_MASSES: Record<string, number> = {
  H: 1.00782503223,
  C: 12.0,
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

export type ElementCounts = Record<string, number>;

export interface FormulaCandidate {
  formula: string;
  exactMass: number;
  ionMass?: number;
  mz: number;
  ppmError: number | null;
  rdb?: number;
}

/* Parse formula string into a plain object {El: count} */
export const parseFormula = (formula: string): ElementCounts => {
  if (!formula || typeof formula !== 'string') return {};
  const elementMap = new Map<string, number>();
  const regex = /([A-Z][a-z]*)(\d*)/g;
  const cleanedFormula = formula.replace(/[^A-Za-z0-9]/g, '');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanedFormula)) !== null) {
    const [, element, countStr] = match;
    if (!(element in ATOMIC_MASSES)) {
      throw new Error(`分子式中包含未知或不支持的元素: ${element}`);
    }
    const count = countStr ? parseInt(countStr, 10) : 1;
    elementMap.set(element, (elementMap.get(element) || 0) + count);
  }
  return Object.fromEntries(elementMap) as ElementCounts;
};

/* Calculate mass from counts object */
const calculateMassFromCounts = (elementCounts: ElementCounts): number => {
  let mass = 0;
  if (!elementCounts || typeof elementCounts !== 'object') return 0;
  for (const [element, count] of Object.entries(elementCounts)) {
    const n = Number(count) || 0;
    const m = ATOMIC_MASSES[element];
    if (m === undefined) throw new Error(`未知元素质量: ${element}`);
    mass += m * n;
  }
  return mass;
};

/* Calculate exact neutral mass from formula string */
export const calculateExactMass = (formula: string): number => {
  if (!formula) return 0;
  const elementCounts = parseFormula(formula);
  return calculateMassFromCounts(elementCounts);
};

/* Format formula into canonical order (C H N O P S ... then others) */
export const formatFormulaCanonical = (formula: string): string => {
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

/* Calculate RDB (degree of unsaturation)
   Return a finite number (can be fractional), or NaN if cannot compute.
*/
export const calculateRDB = (elementCounts: ElementCounts): number => {
  const C = elementCounts.C || 0;
  const H = elementCounts.H || 0;
  const N = elementCounts.N || 0;
  const P = elementCounts.P || 0;
  const X = (elementCounts.F || 0) + (elementCounts.Cl || 0) + (elementCounts.Br || 0) + (elementCounts.I || 0);

  // RDBE formula: RDBE = 1 + C - H/2 + N/2 + P/2 + X/2   (X = halogens, some forms vary)
  const rdb = 1 + C - H / 2 + N / 2 + P / 2 + X / 2;
  return Number.isFinite(rdb) ? rdb : NaN;
};

/* Enumerate candidate formulas within mass window
   params: { elements, minCounts, maxCounts, targetMz, ppmWindow, charge, maxResults, useProton, minRdb, maxRdb }
   Note: targetMz is treated as the observed mass (observed), and ppm is computed as (observed - theoretical)/theoretical * 1e6
*/
export const enumerateFormulas = (opts: {
  elements?: string[];
  minCounts?: ElementCounts;
  maxCounts?: ElementCounts;
  targetMz?: number;
  ppmWindow?: number;
  charge?: number;
  maxResults?: number;
  useProton?: boolean;
  minRdb?: number;
  maxRdb?: number;
} = {}): FormulaCandidate[] => {
  const {
    elements = [],
    minCounts = {},
    maxCounts = {},
    targetMz = 0,
    ppmWindow = 10,
    charge = 1,
    maxResults = 100,
    useProton = false,
    minRdb = -Infinity,
    maxRdb = Infinity,
  } = opts;

  const z = Number(charge) || 0;
  const absZ = Math.abs(z) || 0;
  const observedMz = Number(targetMz) || 0;

  // Convert observed m/z to observed neutral mass (if useProton true assume [M+H]+ style):
  const observedMass = useProton && absZ > 0 ? (absZ * observedMz - z * PROTON_MASS) : observedMz;

  const massTolerance = (observedMass * Number(ppmWindow || 0)) / 1e6;
  const minMass = observedMass - massTolerance;
  const maxMass = observedMass + massTolerance;

  const candidates: FormulaCandidate[] = [];
  const sortedElements = [...elements].sort((a, b) => (ATOMIC_MASSES[b] || 0) - (ATOMIC_MASSES[a] || 0));

  function search(elementIndex: number, currentCounts: ElementCounts, currentMass: number) {
    if (currentMass > maxMass || candidates.length >= maxResults) return;

    if (elementIndex >= sortedElements.length) {
      if (currentMass >= minMass) {
        for (const el of Object.keys(minCounts)) {
          if ((currentCounts[el] || 0) < (minCounts[el] || 0)) return;
        }

        const formulaStr = Object.entries(currentCounts)
          .filter(([, count]) => (count || 0) > 0)
          .map(([el, count]) => `${el}${count! > 1 ? count : ''}`)
          .join('');
        if (!formulaStr) return;

        const finalFormula = formatFormulaCanonical(formulaStr);
        const exactMass = currentMass;
        const ionMass = useProton && z !== 0 ? exactMass + z * PROTON_MASS : exactMass;
        const mz = z === 0 ? ionMass : ionMass / Math.abs(z);

        // ppm: (observed - theoretical) / theoretical * 1e6
        const ppmError = (observedMass > 0 && exactMass > 0)
          ? ((observedMass - exactMass) / exactMass) * 1e6
          : null;

        const rdb = calculateRDB(currentCounts);
        if (!Number.isFinite(rdb)) return;

        if (typeof minRdb === 'number' && rdb < minRdb) return;
        if (typeof maxRdb === 'number' && rdb > maxRdb) return;

        candidates.push({ formula: finalFormula, exactMass, ionMass, mz, ppmError, rdb });
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
    delete currentCounts[element];
  }

  search(0, {}, 0);

  candidates.sort((a, b) => Math.abs(a.ppmError ?? 0) - Math.abs(b.ppmError ?? 0));
  return candidates.slice(0, maxResults);
};

/* Helper: safe number formatter */
export const formatNumber = (num: number | null | undefined, precision = 4): string => {
  if (!Number.isFinite(Number(num))) return '-';
  return Number(num).toFixed(precision);
};

/* Helper: format ppm with sign */
export const formatPpm = (ppm: number | null | undefined, precision = 2): string => {
  if (ppm === null || ppm === undefined || !Number.isFinite(Number(ppm))) return '-';
  const p = Number(ppm);
  const sign = p > 0 ? '+' : '';
  return sign + p.toFixed(precision);
};

/* calculatePpmError helper (observable API) — uses (observed - theoretical)/theoretical */
export const calculatePpmError = (theoretical: number, observed: number): number | null => {
  const t = Number(theoretical);
  const o = Number(observed);
  if (!Number.isFinite(t) || !Number.isFinite(o) || t === 0) return null;
  return ((o - t) / t) * 1e6;
};