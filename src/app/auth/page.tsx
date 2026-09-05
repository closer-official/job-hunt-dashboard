'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage('メールアドレスまたはパスワードが違います。会員登録がまだの場合は先に登録してください。');
      setIsBusy(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  async function signUp() {
    if (!email) {
      setMessage('メールアドレスを入力してください。');
      return;
    }

    if (password.length < 8) {
      setMessage('会員登録には8文字以上のパスワードを入力してください。');
      return;
    }

    setIsBusy(true);
    setMessage('');
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    setMessage(error ? error.message : '確認メールを送信しました。メール内のリンクを開いて登録を完了してください。');
    setIsBusy(false);
  }

  return (
    <main className="entry-screen">
      <form className="entry-panel auth-form" onSubmit={signInWithPassword}>
        <p className="eyebrow">Sign in</p>
        <h1>ログイン</h1>
        <label>
          メール
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isBusy}
            required
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isBusy}
            minLength={8}
            required
          />
        </label>
        <button className="primary-action" type="submit" disabled={isBusy}>
          ログイン
        </button>
        <button className="secondary-action" type="button" onClick={signUp} disabled={isBusy}>
          会員登録
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </main>
  );
}
