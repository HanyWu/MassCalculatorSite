import type { FormEvent } from 'react'
import { useState } from 'react'
import { calculatePpmError, formatNumber, formatPpm } from '../utils/massUtils'

interface PpmResults {
  deltaDa: number | null
  ppm: number | null
}

export const PpmCalculator = () => {
  const [theoreticalMz, setTheoreticalMz] = useState('')
  const [observedMz, setObservedMz] = useState('')
  const [results, setResults] = useState<PpmResults>({ deltaDa: null, ppm: null })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    try {
      setError(null)

      if (!theoreticalMz.trim() || !observedMz.trim()) {
        throw new Error('请同时输入理论 m/z 和观测 m/z')
      }

      const theo = Number.parseFloat(theoreticalMz)
      const obs = Number.parseFloat(observedMz)

      if (Number.isNaN(theo) || Number.isNaN(obs)) {
        throw new Error('m/z 必须为有效数字')
      }

      const deltaDa = obs - theo
      const ppm = calculatePpmError(obs, theo)

      setResults({ deltaDa, ppm })
    } catch (e) {
      const message = e instanceof Error ? e.message : '计算时出现未知错误'
      setError(message)
      setResults({ deltaDa: null, ppm: null })
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">ΔDa &amp; ppm 计算</h2>
          <p className="card-subtitle">已知理论 m/z 与观测 m/z，计算质量差和 ppm 误差</p>
        </div>
        <span className="card-badge">Utility</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">
              理论 m/z <span>*</span>
            </label>
            <input
              className="input-number"
              type="number"
              step="0.000001"
              value={theoreticalMz}
              onChange={(e) => setTheoreticalMz(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">
              观测 m/z <span>*</span>
            </label>
            <input
              className="input-number"
              type="number"
              step="0.000001"
              value={observedMz}
              onChange={(e) => setObservedMz(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="primary-button">
          计算 ΔDa / ppm
          <span className="primary-button-icon">↵</span>
        </button>
      </form>

      {error && <div className="error-text">{error}</div>}

      <div className="results">
        <div>
          <div className="result-item-label">质量差 ΔDa</div>
          <div className="result-item-value">
            {results.deltaDa !== null ? `${formatNumber(results.deltaDa, 6)} Da` : '--'}
          </div>
        </div>
        <div>
          <div className="result-item-label">ppm 误差</div>
          <div className="result-item-value">
            {results.ppm !== null ? `${formatPpm(results.ppm)} ppm` : '--'}
          </div>
        </div>
      </div>

      <p className="hint-text">
        ppm = (观测 m/z − 理论 m/z) / 理论 m/z × 10⁶。正值通常表示观测质量偏大，负值表示偏小。
      </p>
    </section>
  )
}

