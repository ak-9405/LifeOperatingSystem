import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, LockKeyhole, Quote, Shuffle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';

export default function PhilosophyPage({ currentUser, isPlus }) {
  const [quotes, setQuotes] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    setQuotes([]);
    setError('');
    if (!currentUser) return undefined;
    const controller = new AbortController();
    setLoading(true);
    fetch(isPlus ? '/api/quotes' : '/api/quotes/daily', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The quote library could not be loaded.');
        const nextQuotes = isPlus ? result.quotes : result.quote ? [result.quote] : [];
        if (!nextQuotes.length) throw new Error('The quote library is empty. Please try again later.');
        let saved = 0;
        try { saved = Number(localStorage.getItem('lifeos.quote-index.' + currentUser.id)) || 0; } catch {}
        setIndex(isPlus ? Math.max(0, saved) % nextQuotes.length : 0);
        setQuotes(nextQuotes);
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentUser?.id, isPlus, retry]);
  useEffect(() => {
    if (!currentUser || !isPlus || !quotes.length) return;
    try { localStorage.setItem('lifeos.quote-index.' + currentUser.id, String(index)); } catch {}
  }, [currentUser?.id, isPlus, index, quotes.length]);
  const paused = isPlus && isHovered;
  useEffect(() => {
    if (!isPlus || !quotes.length || paused) return undefined;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % quotes.length), 5000);
    return () => window.clearTimeout(timer);
  }, [index, isPlus, paused, quotes.length]);
  const move = (direction) => setIndex((current) => (current + direction + quotes.length) % quotes.length);
  const quote = quotes[index];
  return <div className="route-page philosophy-page">
    <PageHeader eyebrow={isPlus ? 'YOUR MOTIVATION CARD BANK' : 'TODAY’S MOTIVATION'} title="A thought to carry with you." detail={isPlus ? 'A fresh card every five seconds. Hover to pause and read, or browse at your own pace.' : 'One calm thought for today. Plus opens the full library to browse.'} action={isPlus && quotes.length > 0 && <span className="quote-library-count"><BookOpen size={14} />{quotes.length} cards · {new Set(quotes.map((item) => item.author)).size} philosophers</span>} />
    {!currentUser ? <div className="quote-locked"><LockKeyhole size={23} /><h2>A quiet corner for a different perspective.</h2><p>Enter your personal workspace to explore the motivation card bank.</p><Link className="button button-dark" to="/signin" state={{ from: '/philosophy' }}>Sign in <ArrowRight size={15} /></Link></div> : loading ? <div className="quote-loading" role="status"><BookOpen size={25} /><p>Opening the library…</p></div> : error ? <div className="quote-error" role="alert"><p>{error}</p><button className="button button-dark" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div> : quote && <>
      <section className="quote-bank" role="region" aria-roledescription={isPlus ? 'carousel' : undefined} aria-label={isPlus ? 'Motivation card bank' : 'Today’s motivation card'} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <div className="quote-card">
          <span className="quote-card-kicker"><span />YOUR MOTIVATION CARD</span>
          <Quote className="quote-watermark" size={100} strokeWidth={1} aria-hidden="true" />
          <div className="quote-live-region" aria-live={paused ? 'polite' : 'off'} aria-atomic="true" data-translate-ignore="true">
            <figure className="quote-content" key={quote.id}><blockquote><p>{quote.text}</p></blockquote><figcaption><span className="quote-author-line" /><strong>{quote.author}</strong><span>{quote.work}</span></figcaption></figure>
          </div>
          <span className="quote-card-hint">{!isPlus ? 'TODAY’S CARD' : paused ? 'PAUSED WHILE YOU READ' : 'A NEW CARD ARRIVES IN 5 SECONDS'} {isPlus && <ArrowRight size={14} />}</span>
        </div>
        {isPlus && <div className="quote-controls">
          <button className="quote-control-button" type="button" onClick={() => move(-1)} aria-label="Previous motivation card"><ArrowLeft size={16} /><span>Previous</span></button>
          <div className="quote-position"><span>Card <strong>{String(index + 1).padStart(2, '0')}</strong> of {quotes.length}</span><progress value={index + 1} max={quotes.length} aria-label="Position in motivation card bank" /></div>
          <button className="quote-control-button quote-next" type="button" onClick={() => move(1)} aria-label="Next motivation card">Next <ArrowRight size={16} /></button>
        </div>}
        <div className="quote-source"><span><BookOpen size={15} /><span><strong>From the original text</strong><small>{quote.work} · Translated by {quote.translator}</small></span></span><a href={quote.sourceUrl} target="_blank" rel="noopener noreferrer">Read source <ExternalLink size={12} /></a></div>
        {isPlus ? <button className="quote-shuffle" type="button" onClick={() => move(1 + Math.floor(Math.random() * Math.max(1, quotes.length - 1)))}><Shuffle size={14} /> Surprise me</button> : <div className="quote-plus-teaser"><span><Sparkles size={15} /><span><strong>Want the whole library?</strong><small>Unlock all 100 cards, authors, and source editions with Life OS Plus.</small></span></span><Link to="/plus">Explore Plus <ArrowRight size={14} /></Link></div>}
      </section>
      <p className="quote-edition-note">Excerpts from historical English translations. The source and translator stay with each quote; Socrates’ words are presented through Plato’s Apology.</p>
    </>}
  </div>;
}
