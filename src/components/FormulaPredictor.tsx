// src/components/FormulaPredictor.jsx (Updated with RDB range)

import type { FormEvent } from 'react';
import { useState, useMemo } from 'react';
import {
  enumerateFormulas,
  formatPpm,
  parseFormula,
} from '../utils/massUtils';
import type { FormulaCandidate } from '../utils/massUtils';

export const FormulaPredictor = () => {
  const [targetMz, setTargetMz] = useState('0');
  const [ppmWindow, setPpmWindow] = useState('10');
  const [charge, setCharge] = useState('1');
  const [minFormula, setMinFormula] = useState('');
  const [maxFormula, setMaxFormula] = useState('C20H40N5O5');
  const [maxResults, setMaxResults] = useState('50');

  // 新增：RDB 范围
  const [minRdb, setMinRdb] = useState('-1');
  const [maxRdb, setMaxRdb] = useState('50');

  const [candidates, setCandidates] = useState<FormulaCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      setIsSearching(true);

      const mz = Number.parseFloat(targetMz);
      const ppm = Number.parseFloat(ppmWindow);
      const z = Number.parseInt(charge, 10);
      const maxResultCount = Number.parseInt(maxResults, 10);
      const minRdbNum = Number.parseFloat(minRdb);
      const maxRdbNum = Number.parseFloat(maxRdb);

      if (!Number.isFinite(mz) || mz <= 0) throw new Error('请输入有效的目标 m/z');
      if (!Number.isFinite(ppm) || ppm <= 0) throw new Error('ppm 误差窗口必须为正数');
      if (!Number.isFinite(z) || z === 0) throw new Error('电荷数必须为非零整数');
      if (!Number.isFinite(maxResultCount) || maxResultCount <= 0) {
        throw new Error('结果上限必须为正整数');
      }
      if (!Number.isFinite(minRdbNum) || !Number.isFinite(maxRdbNum)) {
        throw new Error('RDB 范围必须为有效数字');
      }
      if (minRdbNum > maxRdbNum) throw new Error('RDB 的最小值不能大于最大值');
      if (!maxFormula.trim()) {
        throw new Error('请在“最大元素组成”中输入一个化学式');
      }

      const maxCounts = parseFormula(maxFormula);
      const minCounts = minFormula.trim() ? parseFormula(minFormula) : {};
      
      const elements = Object.keys(maxCounts);

      const results = enumerateFormulas({
        elements,
        minCounts,
        maxCounts,
        targetMz: mz,
        ppmWindow: ppm,
        charge: z,
        maxResults: maxResultCount,
        // 不默认使用质子作为载体（按之前修正，若需要质子请显式传 useProton: true）
        useProton: false,
        minRdb: minRdbNum,
        maxRdb: maxRdbNum,
      });

      if (results.length === 0) {
        setError('在当前元素和原子数范围内未找到候选分子式。');
      }

      setCandidates(results);
    } catch (e) {
      const message = e instanceof Error ? e.message : '搜索时出现未知错误';
      setError(message);
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  const approxCombinationUpperBound = useMemo(() => {
    if (!maxFormula.trim()) return NaN;
    try {
      const parsed = parseFormula(maxFormula);
      return Object.values(parsed).reduce((acc, n) => acc * (Number(n) + 1), 1);
    } catch {
      return NaN;
    }
  }, [maxFormula]);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">分子式预测</h2>
          <p className="card-subtitle">
            输入目标 m/z、ppm 窗口和元素范围，搜索候选分子式
          </p>
        </div>
        <span className="card-badge">Beta</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">目标 m/z <span>*</span></label>
            <input
              className="input-number" type="number" step="0.000001"
              value={targetMz} onChange={(e) => setTargetMz(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">ppm 窗口 <span>*</span></label>
            <div className="field-input-row">
              <input
                className="input-number" type="number" step="0.1"
                value={ppmWindow} onChange={(e) => setPpmWindow(e.target.value)}
              />
              <span className="suffix">± ppm</span>
            </div>
          </div>
          <div className="field">
            <label className="field-label">电荷数 z <span>*</span></label>
            <input
              className="input-number" type="number" step={1}
              value={charge} onChange={(e) => setCharge(e.target.value)}
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: '0.9rem' }}>
          <label className="field-label">最小元素组成（可选）</label>
          <input
            className="input" placeholder="例如：C6H6N1O2"
            value={minFormula} onChange={(e) => setMinFormula(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: '0.9rem' }}>
          <label className="field-label">最大元素组成（必填）</label>
          <input
            className="input" placeholder="例如：C20H40N2O10"
            value={maxFormula} onChange={(e) => setMaxFormula(e.target.value)}
          />
        </div>

        <div className="form-grid" style={{ marginTop: '0.7rem' }}>
          <div className="field">
            <label className="field-label">结果上限</label>
            <input
              className="input-number" type="number" min={1} step={1}
              value={maxResults} onChange={(e) => setMaxResults(e.target.value)}
            />
          </div>

          {/* 新增：RDB 范围输入 */}
          <div className="field">
            <label className="field-label">RDB 范围</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="input-number" type="number" step="0.5"
                value={minRdb} onChange={(e) => setMinRdb(e.target.value)}
                style={{ width: '6rem' }}
              />
              <span>—</span>
              <input
                className="input-number" type="number" step="0.5"
                value={maxRdb} onChange={(e) => setMaxRdb(e.target.value)}
                style={{ width: '6rem' }}
              />
            </div>
            <p className="field-description">默认：-1 到 50</p>
          </div>

          <div className="field">
            <label className="field-label">粗略复杂度提示</label>
            <p className="field-description">
              组合数上限约为：
              <span className="hint-highlight">
                {Number.isFinite(approxCombinationUpperBound)
                  ? approxCombinationUpperBound.toLocaleString()
                  : '—'}
              </span>
            </p>
          </div>
        </div>

        <button type="submit" className="primary-button" disabled={isSearching}>
          {isSearching ? '搜索中…' : '搜索候选分子式'}
          <span className="primary-button-icon">↵</span>
        </button>
      </form>

      {error && <div className="error-text">{error}</div>}

      {candidates.length > 0 && (
        <div className="result-table-container">
          <table className="result-table">
            <thead>
              <tr>
                <th>候选分子式</th>
                <th>RDB</th>
                <th>误差 (ppm)</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.formula}>
                  <td data-label="分子式">{c.formula}</td>
                  <td data-label="RDB">{c.rdb}</td>
                  <td data-label="误差 (ppm)">{formatPpm(c.ppmError)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint-text">
        本工具仅根据精确质量在限定元素池内做简单枚举，未考虑同位素分布、RDBE、结构可行性等高级约束，实际解析时请结合 MS/MS 信息和化学常识综合判断。
      </p>
    </section>
  );
};