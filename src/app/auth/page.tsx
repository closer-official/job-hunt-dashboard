'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'ログインしました。');
  }

  async function signUp() {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : '確認メールを送信しました。');
  }

  async function sendOtp() {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setMessage(error ? error.message : 'ワンタイムログインメールを送信しました。');
  }

  return (
    <main className="entry-screen">
      <form className="entry-panel auth-form" onSubmit={signInWithPassword}>
        <p className="eyebrow">Sign in</p>
        <h1>ログイン</h1>
        <label>
          メール
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          パスワード
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} />
        </label>
        <button className="primary-action" type="submit">ログイン</button>
        <button className="secondary-action" type="button" onClick={signUp}>会員登録</button>
        <button className="secondary-action" type="button" onClick={sendOtp}>メールでワンタイムログイン</button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </main>
  );
}
