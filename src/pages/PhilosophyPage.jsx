import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, LockKeyhole, Quote, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';

export default function PhilosophyPage({ currentUser }) {
  const [quotes, setQuotes] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setQuotes([]);
    setError('');
    if (!currentUser) return undefined;
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/quotes', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The quote library could not be loaded.');
        if (!result.quotes?.length) throw new Error('The quote library is empty. Please try again later.');
        let saved = 0;
        try { saved = Number(localStorage.getItem('lifeos.quote-index.' + currentUser.id)) || 0; } catch {}
        setIndex(Math.max(0, saved) % result.quotes.length);
        setQuotes(result.quotes);
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentUser?.id, retry]);
  useEffect(() => {
    if (!currentUser || !quotes.length) return;
    try { localStorage.setItem('lifeos.quote-index.' + currentUser.id, String(index)); } catch {}
  }, [currentUser?.id, index, quotes.length]);
  const move = (direction) => setIndex((current) => (current + direction + quotes.length) % quotes.length);
  const quote = quotes[index];
  return <div className="route-page philosophy-page">
    <PageHeader eyebrow="THE PHILOSOPHY LIBRARY" title="Old wisdom. A fresh perspective." detail="A hundred thoughts to pause with. Click a quote to discover the next one." action={quotes.length > 0 && <span className="quote-library-count"><BookOpen size={14} />{quotes.length} quotes · {new Set(quotes.map((item) => item.author)).size} philosophers</span>} />
    {!currentUser ? <div className="quote-locked"><LockKeyhole size={23} /><h2>A quiet corner for a different perspective.</h2><p>Enter your personal workspace to explore the philosophy library.</p><Link className="button button-dark" to="/signin" state={{ from: '/philosophy' }}>Sign in <ArrowRight size={15} /></Link></div> : loading ? <div className="quote-loading" role="status"><BookOpen size={25} /><p>Opening the library…</p></div> : error ? <div className="quote-error" role="alert"><p>{error}</p><button className="button button-dark" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div> : quote && <>
      <div className="quote-card">
        <span className="quote-card-kicker"><span />A MOMENT OF PERSPECTIVE</span>
        <Quote className="quote-watermark" size={100} strokeWidth={1} aria-hidden="true" />
        <div className="quote-live-region" aria-live="polite" aria-atomic="true" data-translate-ignore="true">
          <figure className="quote-content" key={quote.id}><blockquote><p>{quote.text}</p></blockquote><figcaption><span className="quote-author-line" /><strong>{quote.author}</strong><span>{quote.work}</span></figcaption></figure>
        </div>
        <span className="quote-card-hint" id="quote-card-hint">CLICK ANYWHERE ON THIS CARD FOR THE NEXT QUOTE <ArrowRight size={14} /></span>
        <button className="quote-card-advance" type="button" aria-label="Show next quote" aria-describedby="quote-card-hint" onClick={() => move(1)} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } }} />
      </div>
      <div className="quote-controls">
        <button className="quote-control-button" type="button" onClick={() => move(-1)} aria-label="Previous quote"><ArrowLeft size={16} /><span>Previous</span></button>
        <div className="quote-position"><span>Quote <strong>{String(index + 1).padStart(2, '0')}</strong> of {quotes.length}</span><progress value={index + 1} max={quotes.length} aria-label="Position in quote library" /></div>
        <button className="quote-control-button quote-next" type="button" onClick={() => move(1)}>Next quote <ArrowRight size={16} /></button>
      </div>
      <div className="quote-source"><span><BookOpen size={15} /><span><strong>From the original text</strong><small>{quote.work} · Translated by {quote.translator}</small></span></span><a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer">Read source <ExternalLink size={12} /></a></div>
      <button className="quote-shuffle" type="button" onClick={() => move(1 + Math.floor(Math.random() * Math.max(1, quotes.length - 1)))}><Shuffle size={14} /> Surprise me</button>
      <p className="quote-edition-note">Excerpts from historical English translations. The source and translator stay with each quote; Socrates’ words are presented through Plato’s Apology.</p>
    </>}
  </div>;
}
