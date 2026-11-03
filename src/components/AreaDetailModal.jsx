import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  LockKeyhole,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const nextSteps = {
  money: 'Give your money a ten-minute check-in. Notice one thing you handled well.',
  health: 'Choose one small way to help your body feel looked after today.',
  learning: 'Find one idea that makes you curious, then give it twenty minutes.',
  goals: 'Pick the next visible step. It does not need to be the biggest one.',
  reading: 'Keep your book somewhere you can reach it during a quiet moment.',
  habits: 'Make the next repetition easy. Showing up counts.',
  career: 'Give one important piece of work a clear, uninterrupted start.',
  business: 'Choose the one decision that will make the rest of this week easier.',
  relationships: 'Reach out to one person you would like to feel closer to.',
};

export default function AreaDetailModal({
  area,
  saved = {},
  signedIn,
  onClose,
  onCheckIn,
  onSaveIntention,
  onOpenSignUp,
}) {
  const [intention, setIntention] = useState(saved.intention || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const Icon = area.icon;
  const checkIns = Number(saved.checkIns || 0);
  const progress = Math.min(100, area.progress + checkIns * 2);

  useEffect(() => {
    setIntention(saved.intention || '');
  }, [area.slug, saved.intention]);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    const succeeded = await onSaveIntention(area.slug, intention);
    setBusy(false);
    setMessage(succeeded ? 'Your intention is saved.' : 'That intention could not be saved. Please try again.');
  }

  async function checkIn() {
    setBusy(true);
    const succeeded = await onCheckIn(area.slug);
    setBusy(false);
    setMessage(succeeded ? 'A small step counts. Check-in saved.' : 'Your check-in could not be saved. Please try again.');
  }

  return (
    <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="area-dialog" role="dialog" aria-modal="true" aria-labelledby="area-dialog-title" ref={dialogRef} tabIndex={-1}>
        <div className="area-dialog-top">
          <span className={'area-dialog-icon tone-' + area.tone}><Icon size={19} /></span>
          <button className="icon-button" type="button" aria-label="Close life area" onClick={onClose}><X size={18} /></button>
        </div>

        <span className="eyebrow area-dialog-eyebrow">YOUR LIFE, IN CONTEXT</span>
        <div className="area-dialog-title-row">
          <div>
            <h2 id="area-dialog-title">{area.title}</h2>
            <p>{area.detail}</p>
          </div>
          <div className="area-dialog-value">{area.value}</div>
        </div>

        <div className="area-dialog-progress">
          <div><span>Your rhythm</span><strong>{progress}%</strong></div>
          <div className="area-dialog-progress-track"><span style={{ width: progress + '%' }} /></div>
          <small>{checkIns ? checkIns + (checkIns === 1 ? ' small step logged' : ' small steps logged') : 'Progress at your own pace'}</small>
        </div>

        <div className="area-next-step">
          <span className="area-next-icon"><Sparkles size={15} /></span>
          <span className="area-next-copy"><strong>A gentle next step</strong><span>{nextSteps[area.slug]}</span></span>
        </div>

        <form className="intention-form" onSubmit={save}>
          <label htmlFor="area-intention">What would feel good to focus on?</label>
          <div className="intention-field">
            <input
              id="area-intention"
              maxLength={240}
              value={intention}
              onChange={(event) => setIntention(event.target.value)}
              placeholder="Set a small intention for this area"
            />
            <button type="submit" disabled={busy} aria-label="Save intention"><Check size={16} /></button>
          </div>
          <small>{intention.length}/240 characters</small>
        </form>

        <div className="area-dialog-actions">
          <button className="button button-dark area-checkin-button" type="button" onClick={checkIn} disabled={busy}>
            <CircleCheck size={16} /> Log a check-in
          </button>
          <span className="area-time-note"><Clock3 size={13} /> No perfect days required</span>
        </div>
        {message && <p className="area-dialog-message" role="status">{message}</p>}
        {!signedIn && (
          <button type="button" className="sync-nudge" onClick={onOpenSignUp}>
            <LockKeyhole size={13} /> Sign in to keep your updates on every device <ArrowRight size={13} />
          </button>
        )}
      </section>
    </div>
  );
}