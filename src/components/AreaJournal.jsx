import { BookOpen, LockKeyhole, Plus, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import './AreaJournal.css';

const writingGuides = [
  { label: 'A small check-in', text: 'What is taking up space in my mind today?\n\nOne thing I did for myself:\n\nOne small thing I want to carry into tomorrow:' },
  { label: 'A gentle reset', text: 'What has been working for me lately?\n\nWhat feels harder than it needs to?\n\nA small change I could try:' },
  { label: 'A week in review', text: 'A moment I want to remember:\n\nSomething I learned about myself:\n\nWhat I want to make room for next week:' },
];

function localDateString(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(value + 'T12:00:00'));
}

export default function AreaJournal({ area, signedIn, isPlus, onOpenAccount }) {
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [entryDate, setEntryDate] = useState(localDateString(new Date()));
  const [activityDate, setActivityDate] = useState(localDateString(new Date()));
  const [draft, setDraft] = useState('');
  const [savedDraft, setSavedDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showWritingGuides, setShowWritingGuides] = useState(false);
  const [message, setMessage] = useState('');
  const dirty = draft !== savedDraft;

  useEffect(() => {
    if (!signedIn) {
      setEntries([]);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setMessage('');
    fetch(`/api/life-areas/${encodeURIComponent(area.slug)}/journal`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your notes could not be loaded.');
        if (active) setEntries(result.entries || []);
      })
      .catch((error) => { if (error.name !== 'AbortError' && active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [area.slug, signedIn]);

  async function saveDraft() {
    if (!signedIn || loading || saving || !dirty) return true;
    if (!draft.trim() && !activeEntryId) return true;
    setSaving(true);
    setMessage('');
    try {
      const isNew = !activeEntryId;
      const url = `/api/life-areas/${encodeURIComponent(area.slug)}/journal${isNew ? '' : '/' + activeEntryId}`;
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft, date: entryDate, activityDate }),
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || 'Your note could not be saved.');
      window.dispatchEvent(new Event('lifeos:journal-saved'));
      if (!draft.trim() && activeEntryId) {
        setEntries((current) => current.filter((entry) => entry.id !== activeEntryId));
        setActiveEntryId(null);
        setSavedDraft('');
        setMessage('Empty note removed.');
      } else {
        const saved = result.entry;
        setEntries((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        const today = localDateString(new Date());
        setActiveEntryId(null);
        setEntryDate(today);
        setActivityDate(today);
        setDraft('');
        setSavedDraft('');
        setMessage('Note saved and check-in logged. Your page is ready for another note.');
      }
      return true;
    } catch (error) {
      setMessage(error.message || 'Your note could not be saved. Keep this page open and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openEntry(entry) {
    if (saving || dirty) return;
    setActiveEntryId(entry.id);
    setEntryDate(entry.date);
    setActivityDate(localDateString(new Date()));
    setDraft(entry.text);
    setSavedDraft(entry.text);
    setMessage('');
  }

  function startNewNote() {
    if (saving || dirty) return;
    setActiveEntryId(null);
    const today = localDateString(new Date());
    setEntryDate(today);
    setActivityDate(today);
    setDraft('');
    setSavedDraft('');
    setConfirmDelete(false);
    setMessage('A fresh page, whenever you are ready.');
  }

  function insertWritingGuide(text) {
    setDraft((current) => current.trim() ? current + '\n\n' + text : text);
    setActivityDate(localDateString(new Date()));
    setShowWritingGuides(false);
    setMessage('');
  }

  async function deleteNote() {
    if (!activeEntryId || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/life-areas/${encodeURIComponent(area.slug)}/journal/${activeEntryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Your note could not be deleted.');
      }
      setEntries((current) => current.filter((entry) => entry.id !== activeEntryId));
      setActiveEntryId(null);
      const today = localDateString(new Date());
      setEntryDate(today);
      setActivityDate(today);
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

  if (!signedIn) {
    return (
      <section className="area-journal area-journal-locked" aria-labelledby="area-journal-title">
        <div className="area-journal-heading"><span className="area-journal-heading-icon"><BookOpen size={18} /></span><div><span className="eyebrow">A QUIET CORNER FOR YOU</span><h2 id="area-journal-title">Your {area.title.toLowerCase()} journal</h2></div></div>
        <p>A little space to write to yourself, untangle a thought, or leave the day somewhere soft to land.</p>
        <button className="area-journal-unlock" type="button" onClick={onOpenAccount}><LockKeyhole size={15} /> Open your workspace</button>
      </section>
    );
  }

  const recentEntries = entries.slice(0, 6);
  return (
    <section className="area-journal" aria-labelledby="area-journal-title">
      <div className="area-journal-heading">
        <span className="area-journal-heading-icon"><BookOpen size={18} /></span>
        <div><span className="eyebrow">A QUIET CORNER FOR YOU</span><h2 id="area-journal-title">Your {area.title.toLowerCase()} journal</h2></div>
      </div>
      <p className="area-journal-intro">Write to clear your head, remember a little moment, or tell the page whatever is on your mind. No prompt or perfect words needed.</p>

      <div className="area-journal-editor">
        {(activeEntryId || loading || saving || dirty || draft) && <div className="area-journal-date-title">
          {activeEntryId && <div><h3>{formatDate(entryDate)}</h3></div>}
          {loading ? <span className="area-journal-save-state">Opening your journal…</span> : saving ? <span className="area-journal-save-state"><Save size={12} /> Saving…</span> : dirty ? <span className="area-journal-save-state">Unsaved changes</span> : (activeEntryId || draft) ? <span className="area-journal-save-state is-saved">Saved</span> : null}
        </div>}
        <div className="area-journal-writing-guides">
          {isPlus ? <>
            <button type="button" className="area-journal-guide-trigger" aria-expanded={showWritingGuides} onClick={() => setShowWritingGuides((open) => !open)}><Sparkles size={13} /> Writing guides <span>Plus</span></button>
            {showWritingGuides && <div className="area-journal-guide-options" role="group" aria-label="Choose a guided reflection template">{writingGuides.map((guide) => <button type="button" key={guide.label} onClick={() => insertWritingGuide(guide.text)}>{guide.label}</button>)}</div>}
          </> : <Link className="area-journal-guide-upsell" to="/plus"><Sparkles size={13} /> Guided writing templates <span>Plus</span></Link>}
        </div>
        <label className="sr-only" htmlFor="area-journal-note">Write anything you want</label>
        <textarea id="area-journal-note" data-translate-ignore="true" maxLength={10000} value={draft} onChange={(event) => { setDraft(event.target.value); setActivityDate(localDateString(new Date())); setMessage(''); }} placeholder={`Dear page, what is on my mind about ${area.title.toLowerCase()} today…`} disabled={loading || saving} />
        <div className="area-journal-editor-bottom"><span>Private to your account</span><small>{draft.length.toLocaleString('en-GB')} / 10,000</small></div>
        {message && <p className="area-journal-status" role="status">{message}</p>}
      </div>

      <div className="area-journal-bottom-row">
        <span className="area-journal-small-note">Saving your note logs a check-in automatically.</span>
        <div className="area-journal-bottom-actions">
          {activeEntryId && <button className="area-journal-delete-note" type="button" onClick={() => setConfirmDelete((value) => !value)} disabled={saving}>Delete note</button>}
          {(draft || activeEntryId) && <button className="area-journal-new-note" type="button" onClick={startNewNote} disabled={saving || dirty}><Plus size={14} /> New note</button>}
          <button className="area-journal-save-note" type="button" onClick={saveDraft} disabled={!dirty || !draft.trim() || saving || loading}><Save size={14} />{saving ? 'Saving…' : 'Save note'}</button>
        </div>
      </div>
      {confirmDelete && <div className="area-journal-delete-confirm" role="alertdialog" aria-label="Delete this note?"><span>Delete this note for good? Its check-in stays on your calendar.</span><button type="button" disabled={saving} onClick={deleteNote}>Delete note</button><button type="button" disabled={saving} onClick={() => setConfirmDelete(false)}>Keep it</button></div>}

      {recentEntries.length > 0 && <div className="area-journal-recent">
        <div className="area-journal-recent-heading"><span className="eyebrow">LITTLE NOTES YOU LEFT HERE</span><span>{entries.length}</span></div>
        <div className="area-journal-note-list">
          {recentEntries.map((entry) => <button className={'area-journal-note-card' + (activeEntryId === entry.id ? ' is-active' : '')} key={entry.id} type="button" onClick={() => openEntry(entry)} disabled={saving}>
            <span className="area-journal-note-date">{formatDate(entry.date)}</span>
            <span className="area-journal-note-preview">{entry.text.trim().replace(/\s+/g, ' ').slice(0, 120) || 'An empty page'}</span>
          </button>)}
        </div>
      </div>}
    </section>
  );
}
