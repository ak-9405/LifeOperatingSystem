import { ChevronDown, Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import AreaJournal from './AreaJournal.jsx';

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
  presentation = 'modal',
  saved = {},
  signedIn,
  isPlus,
  onClose,
  onOpenSignUp,
}) {
  const dialogRef = useRef(null);
  const Icon = area.icon;
  const checkIns = Number(saved.checkIns || 0);
  const useSample = !signedIn && !checkIns && !saved.intention;
  const displayValue = useSample ? area.value : checkIns ? checkIns + (checkIns === 1 ? ' check-in' : ' check-ins') : saved.intention ? 'Intention set' : 'No activity yet';
  const displayDetail = useSample ? area.detail : saved.intention || (checkIns ? 'Your saved check-ins in this area.' : 'Nothing has been logged in this area yet.');

  useEffect(() => {
    if (presentation === 'page') return undefined;
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, presentation]);

  return (
    <div className={presentation === 'page' ? 'area-page-panel' : 'modal-scrim'} onMouseDown={(event) => presentation !== 'page' && event.target === event.currentTarget && onClose()}>
      <section className={'area-dialog' + (presentation === 'page' ? ' page-panel' : '')} role={presentation === 'page' ? 'region' : 'dialog'} aria-modal={presentation === 'page' ? undefined : true} aria-labelledby="area-dialog-title" ref={dialogRef} tabIndex={-1}>
        <div className="area-dialog-top">
          <span className={'area-dialog-icon tone-' + area.tone}><Icon size={19} /></span>
          {presentation !== 'page' && <button className="icon-button" type="button" aria-label="Close life area" onClick={onClose}><X size={18} /></button>}
        </div>

        <span className="eyebrow area-dialog-eyebrow">YOUR LIFE, IN CONTEXT</span>
        <div className="area-dialog-title-row">
          <div>
            {presentation === 'page' ? <h1 id="area-dialog-title">{area.title}</h1> : <h2 id="area-dialog-title">{area.title}</h2>}
            <p>{displayDetail}</p>
          </div>
          <div className="area-dialog-value">{displayValue}</div>
        </div>

        <AreaJournal area={area} signedIn={signedIn} isPlus={isPlus} onOpenAccount={onOpenSignUp} />

        <div className="area-dialog-progress">
          {useSample ? (
            <>
              <div><span>Example rhythm</span><strong>{area.progress}%</strong></div>
              <div className="area-dialog-progress-track"><span style={{ width: area.progress + '%' }} /></div>
              <small>Illustrative sample value</small>
            </>
          ) : (
            <>
              <div><span>Check-ins logged</span><strong>{checkIns}</strong></div>
              <small>{checkIns ? checkIns + (checkIns === 1 ? ' small step logged' : ' small steps logged') : 'Saving a journal note records your first check-in here.'}</small>
            </>
          )}
        </div>

        <div className="area-next-step">
          <span className="area-next-icon"><Sparkles size={15} /></span>
          <span className="area-next-copy"><strong>A gentle next step</strong><span>{nextSteps[area.slug]}</span></span>
        </div>

      </section>
    </div>
  );
}
