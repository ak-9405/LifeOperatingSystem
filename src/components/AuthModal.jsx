import { ArrowRight, Check, Eye, EyeOff, Leaf, LockKeyhole, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function AuthModal({
  mode,
  user,
  error,
  pending,
  onClose,
  onModeChange,
  onSubmit,
  onSignOut,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, pending]);

  return (
    <div className="modal-scrim auth-scrim" onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section className={'auth-dialog' + (mode === 'account' ? ' account-dialog' : '')} role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" ref={dialogRef} tabIndex={-1}>
        <button type="button" className="icon-button auth-close" onClick={onClose} aria-label="Close account dialog" disabled={pending}><X size={18} /></button>

        {mode === 'account' ? (
          <>
            <span className="auth-brand"><span className="auth-brand-mark"><Leaf size={17} /></span><span>life<span>OS</span></span></span>
            <div className="account-avatar">{initials(user?.name)}</div>
            <span className="eyebrow auth-eyebrow">YOUR PERSONAL SPACE</span>
            <h2 id="auth-dialog-title">You’re right at home.</h2>
            <p className="auth-intro">Your notes and check-ins are saved to your Life OS account.</p>
            <div className="account-card">
              <strong data-translate-ignore="true">{user?.name}</strong>
              <span data-translate-ignore="true">{user?.email}</span>
              <span className="account-status"><Check size={12} /> Signed in</span>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button account-signout" type="button" onClick={onSignOut} disabled={pending}>
              {pending ? 'Signing out…' : 'Sign out'} <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <>
            <span className="auth-brand"><span className="auth-brand-mark"><Leaf size={17} /></span><span>life<span>OS</span></span></span>
            <span className="eyebrow auth-eyebrow">{mode === 'signup' ? 'A LITTLE SPACE, JUST FOR YOU' : 'WELCOME BACK'}</span>
            <h2 id="auth-dialog-title">{mode === 'signup' ? 'Make it yours.' : 'Good to see you.'}</h2>
            <p className="auth-intro">
              {mode === 'signup'
                ? 'Create your account to keep your intentions and check-ins close.'
                : 'Sign in to pick up right where you left off.'}
            </p>

            <form className="auth-form" onSubmit={onSubmit}>
              {mode === 'signup' && (
                <label className="auth-field">
                  <span>Your name</span>
                  <input name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Alex Johnson" required autoFocus />
                </label>
              )}
              <label className="auth-field">
                <span>Email address</span>
                <input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required autoFocus={mode === 'login'} />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="password-input-wrap">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 12 : undefined}
                    maxLength={128}
                    placeholder={mode === 'signup' ? 'At least 12 characters' : 'Your password'}
                    required
                  />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
                {mode === 'signup' && <small>Use 12 or more characters. A phrase is easy to remember.</small>}
              </label>
              {mode === 'signup' && (
                <label className="auth-field">
                  <span>Confirm password</span>
                  <input name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} placeholder="Type it once more" required />
                </label>
              )}

              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="button button-dark auth-submit" disabled={pending}>
                {pending ? 'One moment…' : mode === 'signup' ? 'Create my account' : 'Sign in'}
                <ArrowRight size={15} />
              </button>
            </form>

            <div className="auth-switch">
              <span>{mode === 'signup' ? 'Already have an account?' : 'New to Life OS?'}</span>
              <button type="button" onClick={() => onModeChange(mode === 'signup' ? 'login' : 'signup')} disabled={pending}>
                {mode === 'signup' ? 'Sign in' : 'Create an account'}
              </button>
            </div>
            <div className="auth-footnote"><LockKeyhole size={12} /> Your password is securely hashed. It is never stored as plain text.</div>
          </>
        )}
      </section>
    </div>
  );
}