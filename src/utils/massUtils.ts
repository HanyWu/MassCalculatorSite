export type ParsedFormula = Record<string, number>

export const ELEMENT_MASSES: Record<string, number> = {
  C: 12.0,
  H: 1.00782503223,
  N: 14.00307400443,
  O: 15.99491461957,
  S: 31.9720711744,
  P: 30.97376199842,
  F: 18.99840316273,
  Cl: 34.968852682,
  Br: 78.9183376,
  I: 126.9044719,
  Na: 22.989769282,
  K: 38.9637064864,
}

// 单质子质量（用于 [M + zH]^z+ 近似计算）
export const PROTON_MASS = 1.00727646688

const ELEMENT_PATTERN = /([A-Z][a-z]?)(\d*)/g

export function parseFormula(formula: string): ParsedFormula {
  const trimmed = formula.trim()
  if (!trimmed) {
    throw new Error('分子式不能为空')
  }

  const result: ParsedFormula = {}
  let match: RegExpExecArray | null
  let consumed = ''

  while ((match = ELEMENT_PATTERN.exec(trimmed)) !== null) {
    const symbol = match[1]
    const countStr = match[2]
    const count = countStr ? Number.parseInt(countStr, 10) : 1

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error(`元素 ${symbol} 的计数不合法`)
    }

    if (!(symbol in ELEMENT_MASSES)) {
      throw new Error(`暂不支持的元素：${symbol}`)
    }

    result[symbol] = (result[symbol] ?? 0) + count
    consumed += match[0]
  }

  if (consumed.length !== trimmed.length) {
    throw new Error('分子式格式不合法，请检查是否有多余字符')
  }

  return result
}

export function calculateExactMass(formula: string): number {
  const parsed = parseFormula(formula)
  let mass = 0

  for (const [symbol, count] of Object.entries(parsed)) {
    mass += ELEMENT_MASSES[symbol] * count
  }

  return mass
}

export function calculateTheoreticalMz(options: {
  formula: string
  charge: number
  neutralLossMass?: number
}): number {
  const { formula, charge, neutralLossMass = 0 } = options
  if (!Number.isFinite(charge) || charge === 0) {
    throw new Error('电荷数必须为非零整数')
  }

  const exactMass = calculateExactMass(formula)
  const numerator = exactMass + charge * PROTON_MASS - neutralLossMass
  return numerator / charge
}

export function calculatePpmError(observed: number, theoretical: number): number {
  if (!Number.isFinite(observed) || !Number.isFinite(theoretical) || theoretical === 0) {
    return NaN
  }

  return ((observed - theoretical) / theoretical) * 1e6
}

export function formatNumber(value: number | null | undefined, digits = 5): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return value.toFixed(digits)
}

export function formatPpm(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return value.toFixed(digits)
}

export interface FormulaSearchOptions {
  elements: string[]
  minCounts: Record<string, number>
  maxCounts: Record<string, number>
  targetMz: number
  ppmWindow: number
  charge: number
  maxResults?: number
}

export interface FormulaCandidate {
  formula: string
  exactMass: number
  mz: number
  ppmError: number
}

export function enumerateFormulas(options: FormulaSearchOptions): FormulaCandidate[] {
  const {
    elements,
    minCounts,
    maxCounts,
    targetMz,
    ppmWindow,
    charge,
    maxResults = 100,
  } = options

  if (!Number.isFinite(targetMz) || targetMz <= 0) return []
  if (!Number.isFinite(ppmWindow) || ppmWindow <= 0) return []
  if (!Number.isFinite(charge) || charge === 0) return []

  // 这里假设 m/z 已经是带电物种的质量数除以 |z|
  // 即带电物种质量 ≈ targetMz * |z|，不额外假设 [M + zH]⁺ 等加合形式
  const absCharge = Math.abs(charge)
  const neutralMass = targetMz * absCharge
  if (neutralMass <= 0) return []

  const delta = (ppmWindow / 1e6) * neutralMass
  const minMass = neutralMass - delta
  const maxMass = neutralMass + delta

  const sortedElements = [...elements].sort(
    (a, b) => ELEMENT_MASSES[a] - ELEMENT_MASSES[b],
  )

  const results: FormulaCandidate[] = []
  const counts: Record<string, number> = {}

  const dfs = (index: number, currentMass: number) => {
    if (results.length >= maxResults) return

    if (index === sortedElements.length) {
      if (currentMass >= minMass && currentMass <= maxMass) {
        const formula = sortedElements
          .map((el) => {
            const n = counts[el] ?? 0
            if (n === 0) return ''
            return n === 1 ? el : `${el}${n}`
          })
          .filter(Boolean)
          .join('')

        if (!formula) return

        const mz = currentMass / absCharge
        const ppmError = calculatePpmError(targetMz, mz)

        results.push({
          formula,
          exactMass: currentMass,
          mz,
          ppmError,
        })
      }
      return
    }

    const el = sortedElements[index]
    const mass = ELEMENT_MASSES[el]
    const maxCount = maxCounts[el] ?? 0

    // 预估后续元素的最大质量，用于剪枝
    let remainingMaxMass = 0
    for (let i = index + 1; i < sortedElements.length; i++) {
      const e = sortedElements[i]
      const m = ELEMENT_MASSES[e]
      const c = maxCounts[e] ?? 0
      remainingMaxMass += m * c
    }

    for (let n = 0; n <= maxCount; n++) {
      const newMass = currentMass + n * mass
      if (newMass > maxMass) break

      if (newMass + remainingMaxMass < minMass) {
        continue
      }

      counts[el] = n
      dfs(index + 1, newMass)
    }
  }

  dfs(0, 0)

  const filtered = results.filter((candidate) => {
    // 应用最小元素组成约束：每个元素的计数需 >= 指定最小值
    const parsed = parseFormula(candidate.formula)
    for (const [el, min] of Object.entries(minCounts)) {
      if (min > 0 && (parsed[el] ?? 0) < min) {
        return false
      }
    }
    return true
  })

  filtered.sort((a, b) => Math.abs(a.ppmError) - Math.abs(b.ppmError))
  return filtered.slice(0, maxResults)
}


