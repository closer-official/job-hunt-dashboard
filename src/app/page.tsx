import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="entry-screen">
      <section className="entry-panel">
        <p className="eyebrow">Private dashboard</p>
        <h1>Job Hunt Dashboard</h1>
        <p>企業調査、比較、更新履歴、履歴書PDF生成を一箇所で扱うための管理画面です。</p>
        <Link className="primary-action" href="/dashboard">ダッシュボードを開く</Link>
      </section>
    </main>
  );
}
