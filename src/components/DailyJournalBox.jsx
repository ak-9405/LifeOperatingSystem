import { BookOpen, LockKeyhole, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { areas } from '../data/workspace.js';
import './DailyJournalBox.css';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value + 'T12:00:00'));
}

export default function DailyJournalBox({ signedIn, today, onOpenAccount }) {
  const [areaSlug, setAreaSlug] = useState('');
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [entryDate, setEntryDate] = useState(today);
  const [draft, setDraft] = useState('');
  const [savedDraft, setSavedDraft] = useState('');
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const savePickerRef = useRef(null);
  const dirty = draft !== savedDraft;

  useEffect(() => {
    if (showSavePicker) savePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [showSavePicker]);

  useEffect(() => {
    if (!signedIn || !areaSlug) {
      setEntries([]);
      setActiveEntryId(null);
      setEntryDate(today);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    fetch(`/api/life-areas/${encodeURIComponent(areaSlug)}/journal`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'This journal could not be opened.');
        if (active) setEntries(result.entries || []);
      })
      .catch((error) => { if (error.name !== 'AbortError' && active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [areaSlug, signedIn, today]);

  async function saveNote(targetArea) {
    if (!signedIn || !targetArea || !draft.trim() || saving || loading || !dirty) return;
    setSaving(true);
    setMessage('');
    try {
      const entryToUpdate = areaSlug === targetArea && activeEntryId ? entries.find((entry) => entry.id === activeEntryId) : null;
      const method = entryToUpdate ? 'PUT' : 'POST';
      const url = `/api/life-areas/${encodeURIComponent(targetArea)}/journal${entryToUpdate ? '/' + entryToUpdate.id : ''}`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft, date: entryToUpdate?.date || today, activityDate: today }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your note could not be saved.');
      const saved = result.entry;
      setAreaSlug(targetArea);
      setEntries((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setActiveEntryId(null);
      setEntryDate(today);
      setDraft('');
      setSavedDraft('');
      setShowSavePicker(false);
      const areaName = areas.find((area) => area.slug === targetArea)?.title || 'your journal';
      setConfirmDelete(false);
      setMessage(`Saved in ${areaName}. Check-in logged. The note is ready for another thought.`);
      window.dispatchEvent(new Event('lifeos:journal-saved'));
    } catch (error) {
      setMessage(error.message || 'Your note could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function openEntry(entry) {
    if (dirty || saving) return;
    setActiveEntryId(entry.id);
    setEntryDate(entry.date);
    setDraft(entry.text);
    setSavedDraft(entry.text);
    setMessage('');
    setShowSavePicker(false);
  }

  function startNewNote() {
    if (saving || dirty) return;
    setActiveEntryId(null);
    setEntryDate(today);
    setDraft('');
    setSavedDraft('');
    setMessage('');
    setShowSavePicker(false);
    setConfirmDelete(false);
  }

  async function deleteNote() {
    if (!areaSlug || !activeEntryId || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/life-areas/${encodeURIComponent(areaSlug)}/journal/${activeEntryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Your note could not be deleted.');
      }
      setEntries((current) => current.filter((entry) => entry.id !== activeEntryId));
      setActiveEntryId(null);
      setEntryDate(today);
      setDraft('');
      setSavedDraft('');
      setConfirmDelete(false);
      setMessage('Note deleted.');
    } catch (error) {
      setMessage(error.message || 'Your note could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  const pastEntries = entries.filter((entry) => entry.id !== activeEntryId).slice(0, 4);

  return (
      <section className="daily-journal-box" aria-labelledby="daily-journal-title">
        <div className="daily-journal-heading">
          <span className="daily-journal-icon"><BookOpen size={16} /></span>
          <div><span className="daily-journal-eyebrow">A QUIET CORNER FOR YOU</span><h2 id="daily-journal-title">Quick Note</h2><p>Write here whenever you’re ready. Save it when you’re done.</p></div>
        </div>
      {signedIn ? (
        <>
          <div className="daily-journal-date-row">
            <span>{areaSlug ? (entryDate === today ? 'TODAY' : formatDate(entryDate)) : 'YOUR PRIVATE JOURNAL'}</span>
            {loading ? <small>Opening…</small> : saving ? <small><Save size={11} /> Saving…</small> : !dirty && activeEntryId ? <small className="is-saved">Saved</small> : dirty ? <small>Unsaved draft</small> : null}
          </div>
          <label className="sr-only" htmlFor="daily-journal-text">Write what’s on your mind</label>
          <textarea id="daily-journal-text" maxLength={10000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a little or a lot. This space is yours…" disabled={saving || loading} />
          <div className="daily-journal-footer"><span><LockKeyhole size={11} /> Private to your account</span><small>{draft.length.toLocaleString('en-GB')} / 10,000</small></div>
          {message && <p className="daily-journal-message" role="status">{message}</p>}
          <div className="daily-journal-actions">
            <span>{!draft.trim() ? 'Write something first to enable saving.' : dirty ? 'Nothing is saved until you choose an area.' : areaSlug ? 'Your words stay yours.' : 'Save a thought whenever you’re ready.'}</span>
            <div>
              {activeEntryId && !dirty && <button type="button" className="daily-journal-delete" onClick={() => setConfirmDelete((value) => !value)} disabled={saving}><Trash2 size={13} /> Delete note</button>}
              {activeEntryId && !dirty && <button type="button" className="daily-journal-new" onClick={startNewNote}><Plus size={13} /> New note</button>}
              <button type="button" className="daily-journal-save" aria-expanded={showSavePicker} aria-controls="daily-journal-save-picker" onClick={() => { setMessage(''); setShowSavePicker(true); }} disabled={!draft.trim() || !dirty || saving || loading}><Save size={13} />{saving ? 'Saving…' : 'Save note'}</button>
            </div>
          </div>
          {confirmDelete && <div className="daily-journal-delete-confirm" role="alertdialog" aria-label="Delete this note?"><span>Delete this note for good? Its check-in stays on your calendar.</span><button type="button" disabled={saving} onClick={deleteNote}>Delete note</button><button type="button" disabled={saving} onClick={() => setConfirmDelete(false)}>Keep it</button></div>}
          {showSavePicker && (
            <div ref={savePickerRef} id="daily-journal-save-picker" className="daily-journal-save-picker" role="group" aria-label="Choose a life area for this note">
              <div><strong>Where should this note be saved?</strong><button type="button" aria-label="Close life area choices" onClick={() => setShowSavePicker(false)} disabled={saving}><X size={14} /></button></div>
              <div className="daily-journal-area-options">
                {areas.map((area) => <button type="button" key={area.slug} onClick={() => saveNote(area.slug)} disabled={saving || loading}>{area.title}</button>)}
              </div>
              {saving && <small>Saving your note…</small>}
            </div>
          )}
          {pastEntries.length > 0 && <details className="daily-journal-history"><summary>Recent notes <span>{pastEntries.length}</span></summary><div>{pastEntries.map((entry) => <button type="button" key={entry.id} onClick={() => openEntry(entry)} disabled={dirty || saving}><time>{formatDate(entry.date)}</time><span>{entry.text.replace(/\s+/g, ' ').trim().slice(0, 90)}</span></button>)}</div></details>}
        </>
      ) : (
        <div className="daily-journal-locked"><span>Your private writing space is ready when you are.</span><button type="button" onClick={onOpenAccount}>Open your workspace</button></div>
      )}
      </section>
  );
}
