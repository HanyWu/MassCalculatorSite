// src/components/ExactMassCalculator.tsx

import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { FormulaCandidate } from '../utils/massUtils';
import {
  parseFormula,
  calculateExactMass,
  formatNumber,
  formatPpm,
  PROTON_MASS,
} from '../utils/massUtils';

export const MassCalculator = () => {
  const [formula, setFormula] = useState<string>('H2O');
  const [charge, setCharge] = useState<string>('1');
  const [observedMz, setObservedMz] = useState<string>('');
  const [useProton, setUseProton] = useState<boolean>(true);

  const [result, setResult] = useState<FormulaCandidate | null>(null);
  const [error, setError] = useState<string>('');

  const canUseProton = useMemo(() => Number.parseInt(charge, 10) !== 0, [charge]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!formula.trim()) {
      setError('请输入一个化学式');
      return;
    }

    try {
      const parsed = parseFormula(formula);
      if (Object.keys(parsed).length === 0) {
        throw new Error('请输入有效的分子式');
      }

      const exactMass = calculateExactMass(formula);
      const z = Number.parseInt(charge, 10) || 0;
      let ionMass = exactMass;

      if (canUseProton && useProton && z !== 0) {
        // add z * proton mass (supports negative/positive z)
        ionMass += PROTON_MASS * z;
      }

      const mz = z !== 0 ? ionMass / Math.abs(z) : ionMass;

      let ppmError: number | null = null;
      const obsMz = Number.parseFloat(observedMz);
      if (Number.isFinite(obsMz) && obsMz > 0) {
        ppmError = ((obsMz - mz) / mz) * 1e6;
      }

      setResult({
        formula: formatFormulaSafe(formula),
        exactMass,
        ionMass,
        mz,
        ppmError,
      } as FormulaCandidate);

    } catch (e) {
      const message = e instanceof Error ? e.message : '计算时发生未知错误';
      setError(message);
    }
  };

  // helper to keep displayed formula canonical if parse/format available
  const formatFormulaSafe = (f: string) => {
    try {
      // formatFormulaCanonical might not be exported; fall back to input
      // If your massUtils exports formatFormulaCanonical, replace below accordingly.
      return f;
    } catch {
      return f;
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">精确质量计算器</h2>
          <p className="card-subtitle">
            计算中性质量、离子 m/z 和 ppm 误差
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
          <div className="field">
            <label className="field-label">分子式 *</label>
            <input
              className="input"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="例如: C6H12O6"
            />
          </div>

          <div className="field" style={{ justifyContent: 'center', marginTop: '1.2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: canUseProton ? 'pointer' : 'not-allowed' }}>
              <input
                type="checkbox"
                checked={canUseProton && useProton}
                disabled={!canUseProton}
                onChange={(e) => setUseProton(e.target.checked)}
                style={{ marginRight: '0.5rem', transform: 'scale(1.2)' }}
              />
              <span style={{ color: canUseProton ? 'inherit' : '#aaa' }}>
                使用 H⁺ 作为电荷载体
                <p style={{ fontSize: '0.8rem', color: '#888' }}>电荷为0时此选项无效。</p>
              </span>
            </label>
          </div>

          <div className="field">
            <label className="field-label">电荷数 z *</label>
            <input
              className="input-number"
              type="number"
              step={1}
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">观测值 (m/z 或 Da) (可选)</label>
            <input
              className="input-number"
              type="number"
              step="any"
              value={observedMz}
              onChange={(e) => setObservedMz(e.target.value)}
              placeholder="用于计算 ppm 误差"
            />
          </div>
        </div>

        <button type="submit" className="primary-button">
          计算
          <span className="primary-button-icon">↵</span>
        </button>
      </form>

      {error && <div className="error-text">{error}</div>}

      {result && (
        <div className="result-table-container">
          <table className="result-table">
            <thead>
              <tr>
                <th>参数</th>
                <th>计算值</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="参数">中性分子质量 (Da)</td>
                <td data-label="计算值">{formatNumber(result.exactMass, 6)}</td>
              </tr>
              <tr>
                <td data-label="参数">离子质量 (Da)</td>
                <td data-label="计算值">{formatNumber(result.ionMass ?? result.exactMass, 6)}</td>
              </tr>
              <tr>
                <td data-label="参数">理论 m/z</td>
                <td data-label="计算值">{formatNumber(result.mz, 6)}</td>
              </tr>
              {result.ppmError !== null && result.ppmError !== undefined && (
                <tr>
                  <td data-label="参数">质量误差 (ppm)</td>
                  <td data-label="计算值">{formatPpm(result.ppmError, 2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export const ExactMassCalculator = MassCalculator;
export default MassCalculator;