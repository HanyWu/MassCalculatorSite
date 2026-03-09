const BACKGROUND_IONS = [
  {
    mode: '正离子模式',
    species: '[H]⁺',
    approxMz: 1.0073,
    type: 'Background ion',
    note: '质子；几乎所有 [M + H]⁺ 加合的基础峰。',
  },
  {
    mode: '正离子模式',
    species: '[Na]⁺',
    approxMz: 22.9898,
    type: 'Background ion / Adduct',
    note: '钠离子；来源于盐类、玻璃器皿、缓冲盐等，常见 [M + Na]⁺。',
  },
  {
    mode: '正离子模式',
    species: '[K]⁺',
    approxMz: 38.9637,
    type: 'Background ion / Adduct',
    note: '钾离子；与 Na⁺ 类似，形成 [M + K]⁺ 加合峰。',
  },
  {
    mode: '正离子模式',
    species: '[NH₄]⁺',
    approxMz: 18.0344,
    type: 'Adduct',
    note: '铵离子；来自甲酸铵/醋酸铵等流动相，形成 [M + NH₄]⁺。',
  },
  {
    mode: '正离子模式',
    species: '[ACN + H]⁺',
    approxMz: 42.0338,
    type: 'Background ion',
    note: '乙腈单体簇离子，在高比例 ACN 溶剂中常见。',
  },
  {
    mode: '正离子模式',
    species: '[2ACN + H]⁺',
    approxMz: 83.0609,
    type: 'Background ion',
    note: '乙腈二聚簇离子；LC–MS 中典型溶剂背景峰之一。',
  },
  {
    mode: '负离子模式',
    species: '[Cl]⁻',
    approxMz: 34.9689,
    type: 'Background ion / Adduct',
    note: '氯离子；可形成 [M + Cl]⁻，具有典型的 ³⁵Cl/³⁷Cl 同位素模式。',
  },
  {
    mode: '负离子模式',
    species: '[F]⁻',
    approxMz: 18.9984,
    type: 'Background ion',
    note: '氟离子；来自含氟试剂或材料，需与含 F 分子式区分。',
  },
  {
    mode: '负离子模式',
    species: '[CH₃COO]⁻',
    approxMz: 59.0139,
    type: 'Adduct',
    note: '乙酸根；在醋酸体系中与中性分子形成 [M + CH₃COO]⁻。',
  },
  {
    mode: '负离子模式',
    species: '[HCOO]⁻',
    approxMz: 45.0,
    type: 'Adduct',
    note: '甲酸根；甲酸体系中常见 [M + HCOO]⁻ 加合峰。',
  },
  {
    mode: '负离子模式',
    species: '[NO₃]⁻',
    approxMz: 62.9956,
    type: 'Background ion',
    note: '硝酸根；部分环境和无机分析体系中的典型背景阴离子。',
  },
]

export const FormulaHintPanel = () => {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">常见 Background Ion / Adduct</h2>
          <p className="card-subtitle">正负离子模式下常见溶剂/盐类背景峰与加合离子参考</p>
        </div>
        <span className="card-badge">Reference</span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>模式</th>
            <th>物种</th>
            <th>m/z（约）</th>
            <th>类型</th>
            <th>简要说明</th>
          </tr>
        </thead>
        <tbody>
          {BACKGROUND_IONS.map((ion) => (
            <tr key={`${ion.mode}-${ion.species}`}>
              <td>{ion.mode}</td>
              <td>{ion.species}</td>
              <td>{ion.approxMz.toFixed(4)}</td>
              <td>{ion.type}</td>
              <td>{ion.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="hint-text">
        更完整、系统的背景离子列表可以参考 Thermo Fisher 的技术海报（PDF，英文）：
        <a
          href="https://ccc.bc.edu/content/dam/bc1/top-tier/research/VPR/research-facilities/fisher-chemical-poster.pdf"
          target="_blank"
          rel="noreferrer"
          className="hint-highlight"
        >
          Thermo Fisher – Common Background Contamination Ions in Mass Spectrometry
        </a>
        。建议在方法开发和背景排查时配合本工具一起使用。
      </p>
    </section>
  )
}

