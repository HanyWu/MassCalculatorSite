import './App.css'

import { useState } from 'react'
import { ExactMassCalculator } from './components/ExactMassCalculator'
import { PpmCalculator } from './components/PpmCalculator'
import { FormulaHintPanel } from './components/FormulaHintPanel'
import { FormulaPredictor } from './components/FormulaPredictor'
import { BulkPlaceholder } from './components/BulkPlaceholder'

type TabKey = 'exact' | 'formula' | 'bulk'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('exact')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-logo-inner">m/z</div>
          </div>
          <div>
            <h1 className="brand-text-title">Mass Calculator</h1>
            <p className="brand-text-subtitle">高分辨质谱质量计算与辅助分析</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="pill">
            <span className="pill-dot" />
            <span className="pill-text">Single-page • Frontend only</span>
          </div>
          <div className="pill pill-hrms">
            <span className="pill-text">
              HRMS • ppm • exact mass
            </span>
          </div>
        </div>
      </header>

      <div className="tab-bar">
        <button
          type="button"
          className={`tab-button ${activeTab === 'exact' ? 'active' : ''}`}
          onClick={() => setActiveTab('exact')}
        >
          精确质量 &amp; ppm
          <span className="tab-button-badge">核心</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'formula' ? 'active' : ''}`}
          onClick={() => setActiveTab('formula')}
        >
          分子式辅助
          <span className="tab-button-badge">工具</span>
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          批量处理
          <span className="tab-button-badge">规划中</span>
        </button>
      </div>

      <main className="tab-panel">
        {activeTab === 'exact' && (
          <div className="two-column">
            <ExactMassCalculator />
            <PpmCalculator />
          </div>
        )}

        {activeTab === 'formula' && (
          <>
            <FormulaPredictor />
            <div style={{ marginTop: '1.2rem' }}>
              <FormulaHintPanel />
            </div>
          </>
        )}

        {activeTab === 'bulk' && <BulkPlaceholder />}
      </main>
    </div>
  )
}

export default App
