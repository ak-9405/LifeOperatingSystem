import { BookOpen, LockKeyhole, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { areas } from '../data/workspace.js';
import './QuickNoteModal.css';

function localDateString(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export default function QuickNoteModal({ signedIn, onClose, onOpenAccount }) {
  const [areaSlug, setAreaSlug] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const savingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  savingRef.current = saving;
  onCloseRef.current = onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !savingRef.current) onCloseRef.current();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function saveNote(event) {
    event.preventDefault();
    if (!signedIn || !areaSlug || !text.trim() || saving) return;
    setSaving(true);
    setMessage('');
    const date = localDateString();
    try {
      const response = await fetch(`/api/life-areas/${encodeURIComponent(areaSlug)}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), date, activityDate: date }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your note could not be saved.');
      window.dispatchEvent(new Event('lifeos:journal-saved'));
      onClose();
    } catch (error) {
      setMessage(error.message || 'Your note could not be saved. Keep this window open and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-scrim quick-note-scrim" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="area-dialog quick-note-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-note-title" ref={dialogRef} tabIndex={-1}>
        <div className="area-dialog-top">
          <span className="quick-note-icon"><BookOpen size={19} /></span>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close note" disabled={saving}><X size={17} /></button>
        </div>
        <span className="eyebrow area-dialog-eyebrow">A PAGE FOR TODAY</span>
        <div className="area-dialog-title-row"><div><h2 id="quick-note-title">Write what’s on your mind.</h2><p>No prompt, no perfect words. Just yours.</p></div></div>
        {signedIn ? (
          <form className="quick-note-form" onSubmit={saveNote}>
            <label htmlFor="quick-note-area">Save this note in</label>
            <select id="quick-note-area" value={areaSlug} onChange={(event) => { setAreaSlug(event.target.value); setTimeout(() => textareaRef.current?.focus(), 0); }} required>
              <option value="" disabled>Choose a life area</option>
              {areas.map((area) => <option value={area.slug} key={area.slug}>{area.title}</option>)}
            </select>
            <label className="sr-only" htmlFor="quick-note-text">Your note</label>
            <textarea ref={textareaRef} id="quick-note-text" maxLength={10000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Dear page, today I…" required />
            <div className="quick-note-footer"><span>Private to your account</span><small>{text.length.toLocaleString('en-GB')} / 10,000</small></div>
            {message && <p className="area-dialog-message" role="alert">{message}</p>}
            <div className="quick-note-actions">
              <button type="button" className="quick-note-cancel" onClick={onClose} disabled={saving}>Maybe later</button>
              <button type="submit" className="quick-note-save" disabled={!areaSlug || !text.trim() || saving}><Save size={15} />{saving ? 'Saving…' : 'Save note'}</button>
            </div>
          </form>
        ) : (
          <div className="quick-note-locked"><LockKeyhole size={18} /><p>Your private journal is ready when you are.</p><button type="button" className="quick-note-save" onClick={onOpenAccount}><LockKeyhole size={15} /> Open your workspace</button></div>
        )}
      </section>
    </div>
  );
}
