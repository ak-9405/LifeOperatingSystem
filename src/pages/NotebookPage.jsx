import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import { areas } from '../data/workspace.js';
import './NotebookPage.css';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value + 'T12:00:00'));
}

export default function NotebookPage({ currentUser, onSignIn }) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!currentUser) { setEntries([]); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ q: query, area });
        const response = await fetch('/api/life-areas/journal?' + params.toString(), { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Your notes could not be searched.');
        setEntries(result.entries || []);
      } catch (reason) {
        if (reason.name !== 'AbortError') setError(reason.message || 'Your notes could not be searched.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currentUser?.id, query, area, requestKey]);

  const trimmedQuery = query.trim();
  return <div className="route-page notebook-page">
    <PageHeader eyebrow="YOUR SAVED WORDS" title="Your notebook." detail="Find a thought you left in any of your life areas. Your private writing stays yours." />
    {!currentUser ? <section className="notebook-empty"><BookOpen size={22} /><h2>Your notes are private.</h2><p>Open your account to search your saved writing.</p><button className="button button-dark" type="button" onClick={onSignIn}>Open your workspace <ArrowRight size={14} /></button></section> : <>
      <section className="notebook-search-panel" aria-label="Search saved notes">
        <label className="notebook-search-input"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search words or phrases in your notes…" aria-label="Search notes" /><button type="button" aria-label="Clear search" onClick={() => setQuery('')} disabled={!query}><X size={15} /></button></label>
        <label className="notebook-area-filter"><span>Life area</span><select value={area} onChange={(event) => setArea(event.target.value)}><option value="">All areas</option>{areas.map((item) => <option value={item.slug} key={item.slug}>{item.title}</option>)}</select></label>
      </section>
      <div className="notebook-results-heading"><span>{loading ? 'Searching…' : `${entries.length}${entries.length === 200 ? '+' : ''} ${entries.length === 1 ? 'note' : 'notes'}`}{trimmedQuery ? ` matching “${trimmedQuery}”` : ' in your notebook'}</span><span>Newest first</span></div>
      {error ? <p className="notebook-message" role="alert">{error}</p> : loading && entries.length === 0 ? <p className="notebook-message" role="status">Looking through your saved notes…</p> : entries.length ? <div className="notebook-results">{entries.map((entry) => {
        const areaInfo = areas.find((item) => item.slug === entry.areaSlug);
        const excerpt = entry.text.replace(/\s+/g, ' ').trim();
        return <details className="notebook-result" key={entry.id}>
          <summary><span className="notebook-result-topline"><span>{areaInfo?.title || 'Life area'}</span><time dateTime={entry.date}>{formatDate(entry.date)}</time></span><span className="notebook-excerpt">{excerpt}</span></summary>
          <div className="notebook-result-body"><p>{entry.text}</p><Link to={'/life-areas/' + entry.areaSlug}>Open {areaInfo?.title || 'life area'} journal <ArrowRight size={13} /></Link></div>
        </details>;
      })}</div> : <section className="notebook-empty"><BookOpen size={22} /><h2>{trimmedQuery || area ? 'No notes found.' : 'Your notebook is ready.'}</h2><p>{trimmedQuery || area ? 'Try another word or choose a different life area.' : 'Notes you save in your life-area journals will appear here.'}</p>{!trimmedQuery && !area && <Link className="button button-dark" to="/life-areas">Write your first note <ArrowRight size={14} /></Link>}{trimmedQuery && <button className="button button-dark" type="button" onClick={() => { setQuery(''); setArea(''); setRequestKey((value) => value + 1); }}>Show all notes <ArrowRight size={14} /></button>}</section>}
      <p className="notebook-cap-note">Showing up to 200 notes. Search words, phrases, or filter by life area.</p>
    </>}
  </div>;
}
