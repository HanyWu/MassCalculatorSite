import type { FormEvent } from 'react'
import { useState } from 'react'
import {
  calculateExactMass,
  calculatePpmError,
  calculateTheoreticalMz,
  formatNumber,
  formatPpm,
} from '../utils/massUtils'

interface ExactMassResults {
  exactMass: number | null
  mz: number | null
  ppm: number | null
}

export const ExactMassCalculator = () => {
  const [formula, setFormula] = useState('')
  const [charge, setCharge] = useState('1')
  const [neutralLoss, setNeutralLoss] = useState('')
  const [observedMz, setObservedMz] = useState('')
  const [results, setResults] = useState<ExactMassResults>({
    exactMass: null,
    mz: null,
    ppm: null,
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    try {
      setError(null)

      if (!formula.trim()) {
        throw new Error('请输入分子式，例如 C6H12O6')
      }

      const z = Number.parseInt(charge, 10)
      if (!Number.isFinite(z) || z === 0) {
        throw new Error('电荷数必须为非零整数（正离子请输入正数）')
      }

      const neutralLossMass = neutralLoss.trim() ? Number.parseFloat(neutralLoss) : 0
      if (Number.isNaN(neutralLossMass) || neutralLossMass < 0) {
        throw new Error('中性丢失质量必须为非负数字')
      }

      const exactMass = calculateExactMass(formula)
      const mz = calculateTheoreticalMz({
        formula,
        charge: z,
        neutralLossMass,
      })

      let ppm: number | null = null
      if (observedMz.trim()) {
        const obs = Number.parseFloat(observedMz)
        if (Number.isNaN(obs)) {
          throw new Error('观测 m/z 必须为数字')
        }
        ppm = calculatePpmError(obs, mz)
      }

      setResults({ exactMass, mz, ppm })
    } catch (e) {
      const message = e instanceof Error ? e.message : '计算时出现未知错误'
      setError(message)
      setResults({ exactMass: null, mz: null, ppm: null })
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">精确质量 &amp; 理论 m/z</h2>
          <p className="card-subtitle">
            输入分子式、电荷及中性丢失，可选观测 m/z，计算单同位素质量与 ppm 误差
          </p>
        </div>
        <span className="card-badge">Calculator</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">
              分子式 <span>*</span>
            </label>
            <input
              className="input"
              placeholder="例如：C6H12O6"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
            />
            <p className="field-description">
              当前支持元素：C, H, N, O, S, P, F, Cl, Br, I, Na, K。
            </p>
          </div>

          <div className="field">
            <label className="field-label">
              电荷数 z <span>*</span>
            </label>
            <div className="field-input-row">
              <input
                className="input-number"
                type="number"
                step={1}
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
              />
              <span className="suffix">正离子请输入正数</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">中性丢失质量</label>
            <div className="field-input-row">
              <input
                className="input-number"
                type="number"
                step="0.000001"
                placeholder="可选，例如 H₂O ≈ 18.0106"
                value={neutralLoss}
                onChange={(e) => setNeutralLoss(e.target.value)}
              />
              <span className="suffix">Da</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">观测 m/z</label>
            <div className="field-input-row">
              <input
                className="input-number"
                type="number"
                step="0.000001"
                placeholder="可选，用于计算 ppm 误差"
                value={observedMz}
                onChange={(e) => setObservedMz(e.target.value)}
              />
              <span className="suffix">m/z</span>
            </div>
          </div>
        </div>

        <button type="submit" className="primary-button">
          计算
          <span className="primary-button-icon">↵</span>
        </button>
      </form>

      {error && <div className="error-text">{error}</div>}

      <div className="results">
        <div>
          <div className="result-item-label">单同位素精确质量</div>
          <div className="result-item-value">{formatNumber(results.exactMass, 6)} Da</div>
        </div>
        <div>
          <div className="result-item-label">理论 m/z</div>
          <div className="result-item-value">{formatNumber(results.mz, 6)}</div>
          <div className="result-item-extra">近似按 [M + zH]⁺，可选减去中性丢失</div>
        </div>
        <div>
          <div className="result-item-label">ppm 误差</div>
          <div className="result-item-value">
            {results.ppm !== null ? `${formatPpm(results.ppm)} ppm` : <span className="muted">--</span>}
          </div>
          <div className="result-item-extra">需提供观测 m/z 才能计算</div>
        </div>
      </div>

      <p className="hint-text">
        建议输入经过质量校准后的高分辨质谱数据。若需要考虑带钠、带钾等加合物，可在未来版本中加入更多加合模型。
      </p>
    </section>
  )
}

