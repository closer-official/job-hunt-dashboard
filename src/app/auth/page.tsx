'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');

    const supabase = createClient();
    const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password });

    if (passwordError) {
      setMessage('メールアドレスまたはパスワードが違います。会員登録がまだの場合は先に登録してください。');
      setIsBusy(false);
      return;
    }

    await supabase.auth.signOut();

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo
      }
    });

    if (otpError) {
      setMessage(otpError.message);
      setIsBusy(false);
      return;
    }

    setStep('code');
    setMessage('メールに届いた6桁コードを入力してください。');
    setIsBusy(false);
  }

  async function signUp() {
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

  async function verifyOtp() {
    setIsBusy(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });

    if (error) {
      setMessage('コードが違うか期限切れです。もう一度ログインからやり直してください。');
      setIsBusy(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <main className="entry-screen">
      <form className="entry-panel auth-form" onSubmit={signInWithPassword}>
        <p className="eyebrow">{step === 'credentials' ? 'Sign in' : 'Verification'}</p>
        <h1>{step === 'credentials' ? 'ログイン' : '確認コード'}</h1>
        <label>
          メール
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={step === 'code' || isBusy}
            required
          />
        </label>

        {step === 'credentials' ? (
          <>
            <label>
              パスワード
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <button className="primary-action" type="submit" disabled={isBusy}>
              パスワード確認後、コードを送信
            </button>
            <button className="secondary-action" type="button" onClick={signUp} disabled={isBusy || !email || password.length < 8}>
              会員登録
            </button>
          </>
        ) : (
          <>
            <label>
              メールの6桁コード
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
            </label>
            <button className="primary-action" type="button" onClick={verifyOtp} disabled={isBusy || otp.length !== 6}>
              コードを確認してログイン
            </button>
            <button className="secondary-action" type="button" onClick={() => setStep('credentials')} disabled={isBusy}>
              メール・パスワードに戻る
            </button>
          </>
        )}
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </main>
  );
}
