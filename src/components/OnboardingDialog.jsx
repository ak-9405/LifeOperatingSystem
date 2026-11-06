import { ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { areas } from '../data/workspace.js';
import './OnboardingDialog.css';

export default function OnboardingDialog({ initial, onComplete, demoPreview = false }) {
  const [selected, setSelected] = useState(initial?.focusAreas || []);
  const [intention, setIntention] = useState(initial?.focusIntention || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  async function finish(skip = false) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/account/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusAreas: skip ? [] : selected, focusIntention: skip ? '' : intention }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your starting point could not be saved.');
      onComplete(result);
    } catch (reason) {
      setError(reason.message || 'Your starting point could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function toggleArea(slug) {
    setSelected((current) => current.includes(slug)
      ? current.filter((item) => item !== slug)
      : current.length < 3 ? [...current, slug] : current);
  }

  return <div className="onboarding-scrim">
    <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description">
      <span className="onboarding-icon"><Compass size={20} /></span>
      <span className="eyebrow">{demoPreview ? 'GUIDED START · ADMIN PREVIEW' : 'A GENTLE START'}</span>
      <h2 id="onboarding-title" ref={titleRef} tabIndex={-1}>Make this space yours.</h2>
      <p id="onboarding-description">Choose up to three parts of life you’d like to give a little attention.</p>
      <div className="onboarding-area-list" role="group" aria-label="Choose life areas">
        {areas.map((area) => {
          const active = selected.includes(area.slug);
          return <button type="button" key={area.slug} aria-pressed={active} className={active ? 'is-selected' : ''} onClick={() => toggleArea(area.slug)} disabled={saving || (!active && selected.length >= 3)}>
            <area.icon size={15} /><span>{area.title}</span>{active && <Check size={14} />}
          </button>;
        })}
      </div>
      <label className="onboarding-intention-label" htmlFor="onboarding-intention">What would you like to make room for?</label>
      <input id="onboarding-intention" maxLength={240} value={intention} onChange={(event) => setIntention(event.target.value)} placeholder="A small intention, if one comes to mind" disabled={saving} />
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <div className="onboarding-actions"><button type="button" className="onboarding-skip" onClick={() => finish(true)} disabled={saving}>Skip for now</button><button type="button" className="button button-dark" onClick={() => finish()} disabled={saving}>{saving ? 'Saving…' : 'Save my starting point'} <ArrowRight size={15} /></button></div>
      <small><Sparkles size={12} /> Private to your account. Nothing here is a commitment.</small>
    </section>
  </div>;
}
