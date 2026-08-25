import { useState, type FormEvent } from 'react';
import { auth, setToken } from '../api';

interface LoginProps {
  onLogin: () => void;
  lang?: 'en' | 'ar';
}

export default function Login({ onLogin, lang = 'en' }: LoginProps) {
  const isRtl = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { accessToken } = await auth.login(email, password);
      setToken(accessToken);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? 'تعذر تسجيل الدخول' : 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{isRtl ? 'تسجيل دخول المسؤول' : 'Admin Sign In'}</h1>
        <p className="text-muted">{isRtl ? 'سجل الدخول باستخدام حساب الموظف.' : 'Sign in with your staff account.'}</p>
        {error && <div className="login-error">{error}</div>}
        <label className="input-group">
          <span className="input-label">{isRtl ? 'البريد الإلكتروني' : 'Email'}</span>
          <input className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
        </label>
        <label className="input-group">
          <span className="input-label">{isRtl ? 'كلمة المرور' : 'Password'}</span>
          <input className="input" type="password" value={password} onChange={event => setPassword(event.target.value)} required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? (isRtl ? 'جار تسجيل الدخول...' : 'Signing in...') : (isRtl ? 'تسجيل الدخول' : 'Sign In')}
        </button>
      </form>
    </main>
  );
}