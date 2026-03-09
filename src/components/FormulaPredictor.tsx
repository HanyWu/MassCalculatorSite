import type { FormEvent } from 'react'
import { useState } from 'react'
import { enumerateFormulas, formatNumber, formatPpm, parseFormula } from '../utils/massUtils'
import type { FormulaCandidate } from '../utils/massUtils'

export const FormulaPredictor = () => {
  const [targetMz, setTargetMz] = useState('')
  const [ppmWindow, setPpmWindow] = useState('5')
  const [charge, setCharge] = useState('1')
  const [minFormula, setMinFormula] = useState('')
  const [maxFormula, setMaxFormula] = useState('')
  const [maxResults, setMaxResults] = useState('50')

  const [candidates, setCandidates] = useState<FormulaCandidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    try {
      setError(null)
      setIsSearching(true)

      const mz = Number.parseFloat(targetMz)
      const ppm = Number.parseFloat(ppmWindow)
      const z = Number.parseInt(charge, 10)
      const maxResultCount = Number.parseInt(maxResults, 10)

      if (!Number.isFinite(mz) || mz <= 0) throw new Error('请输入有效的目标 m/z')
      if (!Number.isFinite(ppm) || ppm <= 0) throw new Error('ppm 误差窗口必须为正数')
      if (!Number.isFinite(z) || z === 0) throw new Error('电荷数必须为非零整数')
      if (!Number.isFinite(maxResultCount) || maxResultCount <= 0) {
        throw new Error('结果上限必须为正整数')
      }

      if (!maxFormula.trim()) {
        throw new Error('请在“最大元素组成”中输入一个化学式，例如 C20H40N2O10')
      }

      const maxCounts = parseFormula(maxFormula)
      const minCounts: Record<string, number> = {}

      if (minFormula.trim()) {
        const parsedMin = parseFormula(minFormula)
        for (const [el, count] of Object.entries(parsedMin)) {
          const max = maxCounts[el]
          if (max === undefined) {
            throw new Error(`元素 ${el} 设定了最小原子数，但未在“最大元素组成”中给出上限`)
          }
          if (max < count) {
            throw new Error(`元素 ${el} 的最大原子数必须 ≥ 最小原子数`)
          }
          minCounts[el] = count
        }
      }

      const elements = Object.keys(maxCounts)

      const results = enumerateFormulas({
        elements,
        minCounts,
        maxCounts,
        targetMz: mz,
        ppmWindow: ppm,
        charge: z,
        maxResults: maxResultCount,
      })

      if (results.length === 0) {
        setError('在当前元素和原子数范围内未找到候选分子式，可适当放宽范围或误差窗口。')
      }

      setCandidates(results)
    } catch (e) {
      const message = e instanceof Error ? e.message : '搜索候选分子式时出现未知错误'
      setError(message)
      setCandidates([])
    } finally {
      setIsSearching(false)
    }
  }

  const approxCombinationUpperBound = (() => {
    if (!maxFormula.trim()) return NaN
    try {
      const parsed = parseFormula(maxFormula)
      return Object.values(parsed).reduce((acc, n) => acc * (n + 1), 1)
    } catch {
      return NaN
    }
  })()

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">分子式预测（试验版）</h2>
          <p className="card-subtitle">
            输入目标 m/z、ppm 窗口和元素范围，在当前约束下搜索候选分子式
          </p>
        </div>
        <span className="card-badge">Beta</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">
              目标 m/z <span>*</span>
            </label>
            <input
              className="input-number"
              type="number"
              step="0.000001"
              value={targetMz}
              onChange={(e) => setTargetMz(e.target.value)}
            />
            <p className="field-description">
              通常为观测到的离子 m/z，当前实现仅按 |z| 将 m/z 转换为质量搜索，不假设特定加合形式。
            </p>
          </div>

          <div className="field">
            <label className="field-label">
              ppm 窗口 <span>*</span>
            </label>
            <div className="field-input-row">
              <input
                className="input-number"
                type="number"
                step="0.1"
                value={ppmWindow}
                onChange={(e) => setPpmWindow(e.target.value)}
              />
              <span className="suffix">± ppm</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">
              电荷数 z <span>*</span>
            </label>
            <input
              className="input-number"
              type="number"
              step={1}
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
            />
            <p className="field-description">
              例如 +1 / +2 / −1 等，当前仅使用 |z| 参与质量换算，未对价态做额外约束。
            </p>
          </div>
        </div>

        <div className="field" style={{ marginTop: '0.9rem' }}>
          <label className="field-label">最小元素组成（可选）</label>
          <input
            className="input"
            placeholder="例如：CH2、C6H6N1O2（留空表示不设下限）"
            value={minFormula}
            onChange={(e) => setMinFormula(e.target.value)}
          />
          <p className="field-description">
            直接输入一个化学式，表示候选分子式中每种元素的原子数需 ≥ 对应值；例如 CH2 表示 C≥1、H≥2。
          </p>
        </div>

        <div className="field" style={{ marginTop: '0.9rem' }}>
          <label className="field-label">最大元素组成（必填）</label>
          <p className="field-description">
            直接输入一个化学式，例如 C20H40N2O10，表示每种元素的原子数不超过相应值。当前支持的元素集合由工具栏元素质量表决定。
          </p>
          <input
            className="input"
            placeholder="例如：C20H40N2O10、C10H10F10Cl2"
            value={maxFormula}
            onChange={(e) => setMaxFormula(e.target.value)}
          />
        </div>

        <div className="form-grid" style={{ marginTop: '0.7rem' }}>
          <div className="field">
            <label className="field-label">结果上限</label>
            <input
              className="input-number"
              type="number"
              min={1}
              step={1}
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
            />
            <p className="field-description">按 |ppm 误差| 从小到大排序，只保留前 N 个候选。</p>
          </div>

          <div className="field">
            <label className="field-label">粗略复杂度提示</label>
            <p className="field-description">
              粗略组合数（上限乘积）约为：
              <span className="hint-highlight">
                {` ${
                  Number.isFinite(approxCombinationUpperBound)
                    ? approxCombinationUpperBound.toLocaleString()
                    : '—'
                } `}
              </span>
              个。实际搜索会使用质量剪枝，通常远少于该值。
            </p>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={isSearching}>
          {isSearching ? '搜索中…' : '搜索候选分子式'}
          <span className="primary-button-icon">⌘⏎</span>
        </button>
      </form>

      {error && <div className="error-text">{error}</div>}

      {candidates.length > 0 && (
        <div className="results">
          {candidates.map((c) => (
            <div key={c.formula}>
              <div className="result-item-label">候选分子式</div>
              <div className="result-item-value">{c.formula}</div>
              <div className="result-item-extra">
                精确质量 {formatNumber(c.exactMass, 5)} Da，理论 m/z {formatNumber(c.mz, 6)}，ppm 误差{' '}
                {formatPpm(c.ppmError, 2)} ppm
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="hint-text">
        本工具仅根据精确质量在限定元素池内做简单枚举，未考虑同位素分布、RDBE、结构可行性等高级约束，实际解析时请结合
        MS/MS 信息和化学常识综合判断。
      </p>
    </section>
  )
}

