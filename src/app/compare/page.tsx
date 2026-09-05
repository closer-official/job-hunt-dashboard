import { DashboardShell } from '@/components/dashboard-shell';
import { companies } from '@/lib/mock-data';

export default function ComparePage() {
  return (
    <DashboardShell>
      <section className="section-head">
        <div>
          <p className="eyebrow">Comparison</p>
          <h1>企業比較</h1>
        </div>
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>企業</th><th>評価</th><th>適性</th><th>リスク</th><th>更新日</th></tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.grade} / {company.score}</td>
                <td>{company.roleFit}</td>
                <td>{company.risks.join(', ')}</td>
                <td>{company.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
