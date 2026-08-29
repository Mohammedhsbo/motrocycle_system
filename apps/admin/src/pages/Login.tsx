import { useState, type FormEvent } from 'react';
import { auth, setToken } from '../api';

interface LoginProps {
  onLogin: () => void;
  lang?: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Admin Sign In',
    subtitle: 'Sign in with your staff account.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    errorFallback: 'Unable to sign in',
  },
  ar: {
    title: 'تسجيل دخول المسؤول',
    subtitle: 'سجل الدخول باستخدام حساب الموظف.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جار تسجيل الدخول...',
    errorFallback: 'تعذر تسجيل الدخول',
  }
};

export default function Login({ onLogin, lang = 'en' }: LoginProps) {
  const i18n = t[lang];
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
      setError(err instanceof Error ? err.message : i18n.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{i18n.title}</h1>
        <p className="text-muted">{i18n.subtitle}</p>
        {error && <div className="login-error">{error}</div>}
        <label className="input-group">
          <span className="input-label">{i18n.email}</span>
          <input className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
        </label>
        <label className="input-group">
          <span className="input-label">{i18n.password}</span>
          <input className="input" type="password" value={password} onChange={event => setPassword(event.target.value)} required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? i18n.signingIn : i18n.signIn}
        </button>
      </form>
    </main>
  );
}