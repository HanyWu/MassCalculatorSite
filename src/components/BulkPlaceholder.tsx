export const BulkPlaceholder = () => {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">批量数据处理（规划中）</h2>
          <p className="card-subtitle">
            未来将支持上传 CSV / TXT，对整张表格进行 m/z 误差与候选分子式的批量计算
          </p>
        </div>
        <span className="card-badge">Roadmap</span>
      </div>

      <div className="prose">
        <p>
          当前版本主要聚焦于单个离子的精确质量与误差计算。批量处理功能会在后续版本中加入，用于配合
          LC–HRMS、GC–HRMS 或直接进样 HRMS 的结果表格，做更系统的质量统计和分子式枚举。
        </p>
        <p className="prose-strong">计划支持的能力包括：</p>
        <ul className="prose-list">
          <li>上传 CSV / TXT，并选择 m/z 列、理论 m/z 列或分子式列；</li>
          <li>批量计算 ΔDa 和 ppm 误差，生成误差分布统计（均值、标准差等）；</li>
          <li>在给定误差窗口内批量枚举候选分子式；</li>
          <li>按规则标记或过滤“超出误差阈值”的峰；</li>
          <li>导出处理后的结果表（CSV / Excel）；</li>
          <li>未来可能加入误差直方图、箱线图等可视化模块。</li>
        </ul>
      </div>

      <div className="tag-list">
        <span className="tag">批量 ppm 统计</span>
        <span className="tag">候选分子式枚举</span>
        <span className="tag">CSV / Excel 导出</span>
        <span className="tag">m/z 列自动识别</span>
        <span className="tag">误差直方图</span>
        <span className="tag">方法学开发辅助</span>
      </div>
    </section>
  )
}

