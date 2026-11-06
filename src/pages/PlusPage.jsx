import { ArrowRight, BookOpen, Check, LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import './PlusPage.css';

export default function PlusPage({ currentUser, subscription, onRefreshStatus }) {
  const [pendingPlan, setPendingPlan] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const location = useLocation();

  useEffect(() => {
    const billing = new URLSearchParams(location.search).get('billing');
    if (billing === 'cancelled') setNotice('Checkout was closed. You can choose a plan whenever you’re ready.');
    if (billing !== 'success' || !currentUser) return undefined;
    let attempts = 0;
    let timer;
    const refresh = async () => {
      const result = await onRefreshStatus();
      attempts += 1;
      if (result?.isPlus) setNotice('Life OS Plus is ready on your account.');
      else if (attempts < 6) timer = window.setTimeout(refresh, 1500);
      else setNotice('Payment completed. Your Plus access is syncing; refresh this page in a moment.');
    };
    refresh();
    return () => window.clearTimeout(timer);
  }, [currentUser, location.search, onRefreshStatus]);

  async function startCheckout(plan) {
    if (!currentUser) return;
    setPendingPlan(plan);
    setError('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Checkout could not be started.');
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason.message || 'Checkout could not be started.');
      setPendingPlan('');
    }
  }

  async function openPortal() {
    setError('');
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Subscription management could not be opened.');
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason.message || 'Subscription management could not be opened.');
    }
  }

  const checkoutReady = Boolean(subscription?.checkoutEnabled);
  return <div className="route-page plus-page">
    <PageHeader eyebrow="A LITTLE MORE ROOM TO GROW" title="Life OS Plus." detail="Thoughtful tools for seeing your patterns and finding your next step, while your everyday space stays yours." />

    {subscription?.demo && <div className="plus-demo-banner" role="status"><Sparkles size={16} /><span><strong>Admin demo · Plus unlocked</strong><small>This preview account can explore every Plus feature.</small></span></div>}
    {subscription?.isPlus && !subscription?.demo && <div className="plus-demo-banner" role="status"><Check size={16} /><span><strong>Your Plus space is active</strong><small>{subscription.cancelAtPeriodEnd ? 'Your plan stays active through the end of this billing period.' : 'Your full Life OS Plus features are available.'}</small></span></div>}
    {notice && <p className="plus-notice" role="status">{notice}</p>}
    {error && <p className="plus-error" role="alert">{error}</p>}

    <section className="plus-feature-grid" aria-label="Life OS Plus features">
      <article className="plus-feature-card"><span className="plus-feature-icon"><TrendingUp size={18} /></span><span className="eyebrow">SEE YOUR PATTERNS</span><h2>Monthly reflections</h2><p>A gentle look at the days you showed up, the areas you returned to, and the tasks you finished.</p><span className="plus-feature-tag">Plus insight</span></article>
      <article className="plus-feature-card"><span className="plus-feature-icon"><BookOpen size={18} /></span><span className="eyebrow">FIND A NEW PERSPECTIVE</span><h2>Full motivation bank</h2><p>Browse the complete library of 100 philosophy cards, with sources and translators beside each quote.</p><span className="plus-feature-tag">100 cards</span></article>
      <article className="plus-feature-card"><span className="plus-feature-icon"><Sparkles size={18} /></span><span className="eyebrow">MAKE WRITING EASIER</span><h2>Guided journal templates</h2><p>Use optional reflection starters for health, work, relationships, habits, and a weekly reset.</p><span className="plus-feature-tag">In your life-area journals</span></article>
    </section>

    <section className="plus-plans" aria-labelledby="plus-plans-title">
      <div className="plus-plans-heading"><span className="eyebrow">OPTIONAL MEMBERSHIP</span><h2 id="plus-plans-title">Keep the everyday essentials free.</h2><p>Notes, life areas, your calendar, and basic progress remain available on the free plan.</p></div>
      {!currentUser ? <div className="plus-signin"><LockKeyhole size={18} /><span>Sign in or create an account to choose a plan.</span><Link className="button button-dark" to="/signin" state={{ from: '/plus' }}>Sign in <ArrowRight size={14} /></Link></div> : subscription?.isPlus ? <>
        <div className="plus-manage-row"><span>{subscription.demo ? 'Plus is unlocked for the local Admin demo.' : 'Manage billing, payment details, or cancellation.'}</span>{!subscription.demo && <button type="button" className="button button-dark" onClick={openPortal}>Manage subscription <ArrowRight size={14} /></button>}</div>
        {subscription.demo && <div className="plus-demo-pricing"><span className="eyebrow">PLANNED MEMBERSHIP PRICES</span><div><strong>£3.99</strong><small>per month</small><i>or</i><strong>£29.99</strong><small>per year</small></div></div>}
      </> : <div className="plus-plan-grid">
        {[{ key: 'monthly', name: 'Monthly', price: '£3.99', suffix: 'per month', detail: 'Flexible, cancel anytime.' }, { key: 'yearly', name: 'Yearly', price: '£29.99', suffix: 'per year', detail: 'Save compared with monthly.' }].map((plan) => <article className={'plus-plan-card' + (plan.key === 'yearly' ? ' is-recommended' : '')} key={plan.key}>
          {plan.key === 'yearly' && <span className="plus-plan-ribbon">BEST VALUE</span>}
          <span className="plus-plan-name">{plan.name}</span><strong>{plan.price}</strong><span className="plus-plan-suffix">{plan.suffix}</span><p>{plan.detail}</p>
          <button type="button" className="button button-dark" onClick={() => startCheckout(plan.key)} disabled={!checkoutReady || pendingPlan !== ''}>{pendingPlan === plan.key ? 'Opening checkout…' : checkoutReady ? 'Choose ' + plan.name.toLowerCase() : 'Preview plan'}</button>
        </article>)}</div>}
      {!subscription?.isPlus && currentUser && !checkoutReady && <p className="plus-preview-note">Subscription checkout is not connected yet. These are the planned prices; no payment can be taken in this preview.</p>}
      <p className="plus-privacy-note">Your writing stays yours. Life OS Plus does not sell journal data or use it for advertising.</p>
    </section>
  </div>;
}
