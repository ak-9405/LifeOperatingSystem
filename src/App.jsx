import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Compass,
  Flower2,
  Globe2,
  HeartHandshake,
  HeartPulse,
  Leaf,
  LibraryBig,
  LockKeyhole,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AreaDetailModal from './components/AreaDetailModal.jsx';
import AuthModal from './components/AuthModal.jsx';

const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-Hans', label: '中文' },
];

const navigation = [
  { href: '#today', label: 'Your day', icon: Compass },
  { href: '#life-areas', label: 'Life areas', icon: Flower2 },
  { href: '#how-it-works', label: 'How it works', icon: Sparkles },
  { href: '#coach', label: 'AI companion', icon: MessageCircle },
];

const tasks = [
  { id: 'money', title: 'Brush your teeth!', detail: 'Hygiene · 10 MIN' },
  { id: 'health', title: 'Make the bed nice and tidy!', detail: 'Mental Health · 25 MIN' },
  { id: 'learning', title: 'Tell yourself you rock!', detail: 'Motivation · 30 MIN' },
  { id: 'people', title: 'Time to HUSTLE!', detail: 'Discipline · 5 MIN' },
];

const areas = [
  { slug: 'money', title: 'Money', value: '$12,460', detail: 'Your monthly cushion', change: '+8.2%', icon: WalletCards, tone: 'moss', progress: 72 },
  { slug: 'health', title: 'Health', value: '4 of 5', detail: 'Movement days this week', change: 'On track', icon: HeartPulse, tone: 'coral', progress: 80 },
  { slug: 'learning', title: 'Learning', value: '6.5 hrs', detail: 'Curiosity, in hours', change: '+1.5 hrs', icon: BookOpenCheck, tone: 'lilac', progress: 64 },
  { slug: 'goals', title: 'Goals', value: '3 in motion', detail: 'One step at a time', change: 'On track', icon: Target, tone: 'sun', progress: 68 },
  { slug: 'reading', title: 'Reading', value: '24 pages', detail: 'A little every day', change: 'This week', icon: LibraryBig, tone: 'sky', progress: 46 },
  { slug: 'habits', title: 'Habits', value: '12 days', detail: 'Your longest streak yet', change: 'A new record', icon: Zap, tone: 'apricot', progress: 86 },
  { slug: 'career', title: 'Career', value: '2 priorities', detail: 'A thoughtful next move', change: 'In focus', icon: BriefcaseBusiness, tone: 'blue', progress: 58 },
  { slug: 'business', title: 'Business', value: 'Growing well', detail: 'The important work', change: '+12%', icon: BarChart3, tone: 'mint', progress: 76 },
  { slug: 'relationships', title: 'Relationships', value: '4 check-ins', detail: 'Meaningful time together', change: 'This week', icon: HeartHandshake, tone: 'rose', progress: 70 },
];

const balance = [
  { label: 'Health', value: 82, color: 'green' },
  { label: 'Money', value: 68, color: 'sand' },
  { label: 'People', value: 76, color: 'lavender' },
];

const steps = [
  {
    number: '01',
    href: '#life-areas',
    title: 'Bring the whole picture together',
    detail: 'Keep your money, health, goals, learning, and the people you love in one calm place.',
    icon: CircleDollarSign,
    tone: 'step-sage',
  },
  {
    number: '02',
    href: '#coach',
    title: 'See what deserves your attention',
    detail: 'Your morning brief connects the dots and turns a busy week into a few clear priorities.',
    icon: Sparkles,
    tone: 'step-lilac',
  },
  {
    number: '03',
    href: '#contact',
    title: 'Build a life that feels in sync',
    detail: 'Make a little progress today, learn from the patterns, and adjust as life changes.',
    icon: TrendingUp,
    tone: 'step-peach',
  },
];

const coachSuggestions = [
  'You’ve made room for everyone else this week. Keep one hour for something that fills you back up.',
  'Your small habits are adding up. A short walk today is enough to keep your rhythm.',
  'Your best next move is the one that makes tomorrow feel lighter. Start with a quick money check-in.',
];

function Brand() {
  return (
    <a className="brand" href="#today" aria-label="Life OS home">
      <span className="brand-symbol"><Leaf size={19} strokeWidth={2.2} /></span>
      <span className="brand-name">life<span>OS</span></span>
      <span className="brand-edition">YOUR LIFE, IN RHYTHM</span>
    </a>
  );
}

function Sidebar({ user, onAccountClick }) {
  const initials = user
    ? user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : '';

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <span className="sidebar-heading">YOUR SPACE</span>
      <nav className="side-nav">
        {navigation.map(({ href, label, icon: Icon }, index) => (
          <a className={'nav-link' + (index === 0 ? ' nav-link-active' : '')} href={href} key={href}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {index === 0 && <span className="nav-pip" />}
          </a>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-mantra">
        <span className="mantra-icon"><Flower2 size={17} /></span>
        <p>Small steps. A fuller life.</p>
        <span>Your own pace is a good pace.</span>
      </div>
      <button type="button" className="sidebar-user" onClick={onAccountClick} aria-label={user ? 'Open account' : 'Sign in or create an account'}>
        <span className="user-avatar">{user ? initials : <Leaf size={14} />}</span>
        <span className="user-lines"><strong data-translate-ignore={user ? 'true' : undefined}>{user?.name || 'Your personal space'}</strong><span>{user ? 'Signed in · saved to your account' : 'Sign in to save your updates'}</span></span>
        <ChevronDown size={16} className="user-chevron" />
      </button>
    </aside>
  );
}

function SectionHeading({ eyebrow, title, detail, aside }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {aside}
    </div>
  );
}

function AreaCard({ area, entry, onClick }) {
  const Icon = area.icon;
  const checkIns = Number(entry?.checkIns || 0);
  const progress = Math.min(100, area.progress + checkIns * 2);
  return (
    <button type="button" className="area-card" onClick={() => onClick(area)} aria-haspopup="dialog">
      <span className="area-card-top">
        <span className={'area-icon tone-' + area.tone}><Icon size={18} strokeWidth={1.8} /></span>
        <span className="area-change">
          {checkIns ? checkIns + (checkIns === 1 ? ' check-in' : ' check-ins') : area.change}
          {area.change.includes('%') && !checkIns && <ArrowUpRight size={12} />}
        </span>
      </span>
      <span className="area-title">{area.title}</span>
      <strong className="area-value">{area.value}</strong>
      <span className="area-detail" data-translate-ignore={entry?.intention ? 'true' : undefined}>{entry?.intention || area.detail}</span>
      <span className="area-progress"><span style={{ width: progress + '%' }} /></span>
      <span className="area-open-hint">Open area <ArrowRight size={11} /></span>
    </button>
  );
}

function App() {
  const [completed, setCompleted] = useState([]);
  const [language, setLanguage] = useState('en');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [notice, setNotice] = useState('');
  const [contactStatus, setContactStatus] = useState({ state: 'idle', message: '' });
  const [coachIndex, setCoachIndex] = useState(0);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaEntries, setAreaEntries] = useState({});
  const [now] = useState(() => new Date());
  const translator = usePageTranslator(setNotice, setIsTranslating);
  const contactForm = useRef(null);

  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(now);
  const greeting = new Intl.DateTimeFormat('en-GB', { hour: 'numeric' }).format(now);
  const hour = Number(greeting.split(' ')[0].split(':')[0]);
  const greetingPrefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const doneCount = completed.length;

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    setAuthError('');
  }, []);

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthOpen(true);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active) setCurrentUser(result?.user || null);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setAreaEntries({});
      return undefined;
    }

    const controller = new AbortController();
    fetch('/api/life-areas', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Life areas could not be loaded.');
        setAreaEntries(Object.fromEntries((result.areas || []).map((area) => [area.slug, area])));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setNotice(error.message);
      });
    return () => controller.abort();
  }, [currentUser?.id]);

  const toggleTask = useCallback((id) => {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 6200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function chooseLanguage(target) {
    setLanguageMenuOpen(false);
    setNotice('');
    if (target === language) return;
    const succeeded = await translator.translate(target);
    if (succeeded) setLanguage(target);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (authMode === 'signup' && details.password !== details.confirmPassword) {
      setAuthError('Those passwords do not match yet.');
      return;
    }

    setAuthPending(true);
    setAuthError('');
    const payload = { email: details.email, password: details.password };
    if (authMode === 'signup') payload.name = details.name;

    try {
      const response = await fetch('/api/auth/' + (authMode === 'signup' ? 'signup' : 'login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your account could not be opened.');

      setCurrentUser(result.user);
      setAuthOpen(false);
      setAuthError('');
      setNotice(authMode === 'signup' ? 'Your personal space is ready.' : 'Welcome back. Your saved updates are here.');
    } catch (error) {
      setAuthError(error.message.includes('Failed to fetch') ? 'The sign-in service is unavailable. Please try again.' : error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleSignOut() {
    setAuthPending(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign out is unavailable right now.');
      setCurrentUser(null);
      setAreaEntries({});
      setAuthOpen(false);
      setNotice('You’ve signed out. Your account updates are safely saved.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  function handleAccountClick() {
    setAuthMode(currentUser ? 'account' : 'login');
    setAuthError('');
    setAuthOpen(true);
  }

  async function handleCheckIn(slug) {
    if (!currentUser) {
      setAreaEntries((current) => ({
        ...current,
        [slug]: { ...current[slug], checkIns: Number(current[slug]?.checkIns || 0) + 1 },
      }));
      return true;
    }

    try {
      const response = await fetch('/api/life-areas/' + encodeURIComponent(slug) + '/check-ins', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your check-in could not be saved.');
      setAreaEntries((current) => ({ ...current, [slug]: result.area }));
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  async function handleSaveIntention(slug, intention) {
    if (!currentUser) {
      setAreaEntries((current) => ({
        ...current,
        [slug]: { ...current[slug], intention, checkIns: Number(current[slug]?.checkIns || 0) },
      }));
      return true;
    }

    try {
      const response = await fetch('/api/life-areas/' + encodeURIComponent(slug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intention }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your intention could not be saved.');
      setAreaEntries((current) => ({ ...current, [slug]: result.area }));
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(event.currentTarget).entries());
    setContactStatus({ state: 'sending', message: 'Sending your note…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Your note could not be sent. Please try again.');
      }

      setContactStatus({
        state: 'success',
        message: 'Thank you — your note is on its way. We’ll be in touch soon.',
      });
      contactForm.current?.reset();
    } catch (error) {
      setContactStatus({
        state: 'error',
        message: error.message.includes('Failed to fetch')
          ? 'The contact service is unavailable. Please try again later.'
          : error.message,
      });
    }
  }

  return (
    <div className="app-shell">
      <Sidebar user={currentUser} onAccountClick={handleAccountClick} />
      <main className="main-content" id="page-top">
        <header className="topbar">
          <div className="topbar-context"><span className="topbar-dot" /><span>A more connected way to live</span></div>
          <div className="topbar-actions">
            <div
              className="language-picker"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setLanguageMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="language-trigger"
                aria-label="Choose page language"
                aria-haspopup="menu"
                aria-expanded={languageMenuOpen}
                aria-busy={isTranslating}
                onClick={() => setLanguageMenuOpen((open) => !open)}
              >
                <Globe2 size={15} strokeWidth={1.8} />
                <span>Translate</span>
                <ChevronDown className="language-chevron" size={13} />
              </button>
              {languageMenuOpen && (
                <div className="language-menu" role="menu" aria-label="Choose a language" data-translate-ignore="true">
                  {languageOptions.map((option) => (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={language === option.code}
                      className={language === option.code ? 'language-option language-option-active' : 'language-option'}
                      key={option.code}
                      disabled={isTranslating}
                      onClick={() => chooseLanguage(option.code)}
                    >
                      <span>{option.label}</span>
                      {language === option.code && <Check size={14} />}
                    </button>
                  ))}
                  <span className="language-menu-caption">Free local translation</span>
                </div>
              )}
            </div>
            {currentUser ? (
              <button className="topbar-account" type="button" onClick={handleAccountClick} aria-label="Open account">
                <span className="topbar-avatar">{currentUser.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                <span className="topbar-account-name" data-translate-ignore="true">{currentUser.name.split(/\s+/)[0]}</span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <div className="auth-actions">
                <button type="button" className="sign-in-button" onClick={() => openAuth('login')}>Sign in</button>
                <button type="button" className="create-account-button" onClick={() => openAuth('signup')}>Create account</button>
              </div>
            )}
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={showMobileNav}
              className="mobile-menu-button"
              onClick={() => setShowMobileNav((open) => !open)}
            >
              {showMobileNav ? <Plus className="rotate-45" size={20} /> : <Compass size={20} />}
            </button>
          </div>
        </header>
        {showMobileNav && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => <a href={item.href} key={item.href} onClick={() => setShowMobileNav(false)}>{item.label}</a>)}
            <span className="mobile-nav-divider" />
            {currentUser ? (
              <button type="button" onClick={() => { setShowMobileNav(false); handleAccountClick(); }}>My account · {currentUser.name}</button>
            ) : (
              <>
                <button type="button" onClick={() => { setShowMobileNav(false); openAuth('login'); }}>Sign in</button>
                <button type="button" className="mobile-nav-join" onClick={() => { setShowMobileNav(false); openAuth('signup'); }}>Create an account <ArrowRight size={14} /></button>
              </>
            )}
          </nav>
        )}

        <div className="page-content">
          <section className="welcome" id="today">
            <div className="welcome-copy">
              <span className="eyebrow welcome-eyebrow"><CalendarDays size={13} /> {date}</span>
              <h1>{greetingPrefix}{currentUser ? <>,<br /><em data-translate-ignore="true">{currentUser.name.trim().split(/\s+/)[0]}.</em></> : '.'}</h1>
              <p className="welcome-subtitle">The day is yours. Let’s make a little room for what matters.</p>
            </div>
            <button type="button" className="week-streak" onClick={() => setSelectedArea(areas.find((area) => area.slug === 'habits'))} aria-haspopup="dialog">
              <span className="week-streak-icon"><Sparkles size={15} /></span>
              <span className="streak-copy"><strong>You’re finding your rhythm</strong><small>You showed up for yourself 5 days this week</small></span>
              <span className="week-dots" aria-label="Five day streak">
                {[0, 1, 2, 3, 4].map((day) => <span className="week-dot week-dot-done" key={day}><Check size={10} /></span>)}
                <span className="week-dot"><Plus size={10} /></span>
              </span>
            </button>
          </section>

          <section className="dashboard-grid" aria-label="Your day at a glance">
            <article className="brief-card">
              <div className="brief-orbit brief-orbit-one" />
              <div className="brief-orbit brief-orbit-two" />
              <div className="brief-topline">
                <span className="brief-icon"><Sparkles size={14} /></span>
                <span>YOUR MORNING BRIEF</span><span className="brief-divider" /><span className="brief-tailor">A little clarity, for you</span>
              </div>
              <h2>Make space for<br /><em>what moves you.</em></h2>
              <p className="brief-intro">Your life is a lot of little things. Here’s a thoughtful place to begin.</p>
              <div className="brief-rule" />
              <div className="brief-task-heading"><span>THE THINGS THAT MATTER TODAY</span><span className="task-counter">{doneCount} <i>/ 4 done</i></span></div>
              <div className="brief-tasks">
                {tasks.map((task) => {
                  const isDone = completed.includes(task.id);
                  return (
                    <button type="button" key={task.id} className={'brief-task' + (isDone ? ' brief-task-done' : '')} onClick={() => toggleTask(task.id)} aria-pressed={isDone}>
                      <span className="task-check">{isDone && <Check size={13} strokeWidth={2.5} />}</span>
                      <span className="task-copy"><span>{task.title}</span><small>{task.detail}</small></span>
                      <ArrowDownRight className="task-arrow" size={15} />
                    </button>
                  );
                })}
              </div>
              <div className="brief-bottom">
                <span><Clock3 size={14} /> A gentle 70 minutes, all told</span>
                <a href="#life-areas">Your whole picture <ArrowRight size={14} /></a>
              </div>
            </article>

            <aside className="pulse-card">
              <div className="pulse-topline"><span className="eyebrow">A MOMENT TO ZOOM OUT</span><span className="pulse-dot" /></div>
              <div className="pulse-title-row"><h3>Your life,<br />in balance.</h3><div className="pulse-score"><span>82</span><small>your week</small></div></div>
              <p className="pulse-description">You’re doing more than you think. Here’s the shape of your week.</p>
              <div className="pulse-chart" aria-label="Life balance chart">
                <div className="pulse-chart-grid"><span /><span /><span /><span /></div>
                <svg viewBox="0 0 320 112" role="img" aria-label="Your balance is trending up">
                  <defs><linearGradient id="pulseFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a6d9bf" stopOpacity=".46" /><stop offset="100%" stopColor="#a6d9bf" stopOpacity=".01" /></linearGradient></defs>
                  <path d="M0,84 C24,78 28,49 54,59 S91,79 110,59 S137,48 156,61 S192,80 209,47 S239,30 254,43 S283,59 300,32 S313,18 320,24 L320,112 L0,112 Z" fill="url(#pulseFill)" />
                  <path d="M0,84 C24,78 28,49 54,59 S91,79 110,59 S137,48 156,61 S192,80 209,47 S239,30 254,43 S283,59 300,32 S313,18 320,24" fill="none" stroke="#6ab48d" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="300" cy="32" r="4.4" fill="#f7f8f3" stroke="#4e986d" strokeWidth="2.5" />
                </svg>
                <div className="chart-labels"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>TODAY</span></div>
              </div>
              <div className="balance-list">
                {balance.map((item) => (
                  <div className="balance-item" key={item.label}>
                    <span className={'balance-dot ' + item.color} /><span className="balance-label">{item.label}</span>
                    <div className="balance-track"><span style={{ width: item.value + '%' }} /></div><span className="balance-value">{item.value}%</span>
                  </div>
                ))}
              </div>
              <a className="pulse-note" href="#life-areas"><span className="pulse-note-icon"><Flower2 size={15} /></span><span>Progress is allowed to look like you.</span><ArrowRight size={13} /></a>
            </aside>
          </section>

          <section className="area-section" id="life-areas">
            <SectionHeading
              eyebrow="THE WHOLE PICTURE"
              title="All the parts that make you, you."
              detail="A little snapshot of your life, all in one place."
              aside={<a className="text-link" href="#coach">A note from your coach <ArrowRight size={14} /></a>}
            />
            <div className="area-grid">
              {areas.map((area) => (
                <AreaCard area={area} entry={areaEntries[area.slug]} onClick={setSelectedArea} key={area.slug} />
              ))}
            </div>
            <div className="areas-footer"><span><LockKeyhole size={13} /> Your life stays yours. Always.</span><span>More connected, always at your pace.</span></div>
          </section>

          <section className="how-section section-block" id="how-it-works">
            <div className="how-heading">
              <div className="eyebrow"><span className="eyebrow-flower"><Flower2 size={14} /></span> A SOFTER WAY FORWARD</div>
              <h2>Less keeping up.<br /><em>More living well.</em></h2>
              <p>Life doesn’t happen in separate tabs. Your money affects your plans. Your energy affects your work. We bring the threads together so you can see what matters.</p>
              <a className="button button-dark" href="#contact">Find your flow <ArrowRight size={15} /></a>
              <div className="how-side-note"><span className="note-asterisk">✳</span><span>Designed for real life,<br />which is beautifully messy.</span></div>
            </div>
            <div className="steps-list">
              {steps.map(({ number, title, detail, icon: Icon, tone, href }) => (
                <a className="step-card" href={href} key={number}>
                  <div className={'step-icon ' + tone}><Icon size={18} strokeWidth={1.7} /></div>
                  <span className="step-number">{number}</span>
                  <h3>{title}</h3><p>{detail}</p>
                  <span className="step-open-link"><ArrowRight size={14} /></span>
                </a>
              ))}
              <p className="steps-caption"><span />No streaks to protect. No perfect days required.</p>
            </div>
          </section>

          <section className="coach-section section-block" id="coach">
            <div className="coach-glow coach-glow-one" /><div className="coach-glow coach-glow-two" />
            <div className="coach-copy">
              <span className="coach-tag"><Sparkles size={13} /> YOUR THOUGHTFUL AI COMPANION</span>
              <h2>A little perspective<br />can change <em>your whole day.</em></h2>
              <p>Think of it as a clear-headed voice in your corner — looking at the bigger picture, helping you find your next right step.</p>
              <button type="button" className="button button-light" onClick={() => setCoachIndex((index) => (index + 1) % coachSuggestions.length)}>
                Give me a gentle nudge <ArrowRight size={15} />
              </button>
            </div>
            <div className="coach-conversation">
              <div className="coach-conversation-head">
                <span className="coach-avatar"><Sparkles size={17} /></span>
                <span className="coach-persona"><strong>Your life, in context</strong><small>Here when you need a clearer view</small></span>
                <span className="coach-online">HERE WITH YOU</span>
              </div>
              <div className="conversation-date">{date.toUpperCase()} · A MOMENT OF CLARITY</div>
              <div className="coach-message"><p>What would make today feel a little more like yours?</p></div>
              <div className="coach-reply"><span className="reply-spark"><Sparkles size={13} /></span><p>{coachSuggestions[coachIndex]}</p></div>
              <div className="coach-prompt"><span>Try “help me find my focus”</span><span className="prompt-send"><Send size={14} /></span></div>
              <div className="coach-privacy"><LockKeyhole size={12} /> A private space for your thoughts</div>
            </div>
          </section>

          <section className="contact-section section-block" id="contact">
            <div className="contact-copy">
              <span className="eyebrow"><span className="contact-star">✳</span> START A CONVERSATION</span>
              <h2>Let’s make space<br />for <em>what matters.</em></h2>
              <p>Curious about your own Life OS? Tell us what you’re hoping to make a little easier. We’d love to hear from you.</p>
              <div className="contact-assurance"><span className="contact-assurance-icon"><LockKeyhole size={15} /></span><span><strong>Just between us.</strong><small>Your note is private, and we’ll only use it to reply.</small></span></div>
              <div className="contact-contact-line"><span className="contact-line-dot" />Thoughtful reply, usually within two working days.</div>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit} ref={contactForm}>
              <div className="form-heading"><span>YOUR NOTE</span><span>01 <i>/ 04</i></span></div>
              <div className="form-row">
                <label className="field-wrap"><span>Your name</span><input type="text" name="name" placeholder="How should we address you?" autoComplete="name" maxLength={100} required /></label>
                <label className="field-wrap"><span>Email address</span><input type="email" name="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required /></label>
              </div>
              <label className="field-wrap">
                <span>What’s on your mind?</span>
                <select name="area" defaultValue="">
                  <option value="" disabled>Choose what you’re curious about</option>
                  <option value="Life OS">The Life OS experience</option>
                  <option value="AI companion">The AI companion</option>
                  <option value="Integrations">Connecting my tools</option>
                  <option value="Something else">Something else entirely</option>
                </select>
                <span className="select-chevron"><ChevronDown size={15} /></span>
              </label>
              <label className="field-wrap"><span>A little more, if you like</span><textarea name="message" placeholder="No perfect words needed. We’re listening…" rows={3} maxLength={2000} required /></label>
              <button className="button button-submit" type="submit" disabled={contactStatus.state === 'sending'}>
                {contactStatus.state === 'sending' ? 'Sending…' : 'Send your note'}
                {contactStatus.state === 'success' ? <BadgeCheck size={16} /> : <ArrowRight size={15} />}
              </button>
              <div aria-live="polite" className={'form-status status-' + contactStatus.state}>{contactStatus.message}</div>
            </form>
          </section>

          <footer className="footer">
            <a className="footer-brand" href="#page-top"><span><Leaf size={14} /></span>lifeOS</a>
            <span className="footer-promise">Make room for what matters.</span>
            <div className="footer-links"><a href="#how-it-works">Our approach</a><a href="#contact">Say hello <ArrowUpRight size={12} /></a></div>
            <span className="footer-copyright">© 2026 LIFE OS</span>
          </footer>
        </div>
      </main>
      {selectedArea && (
        <AreaDetailModal
          key={selectedArea.slug}
          area={selectedArea}
          saved={areaEntries[selectedArea.slug]}
          signedIn={Boolean(currentUser)}
          onClose={() => setSelectedArea(null)}
          onCheckIn={handleCheckIn}
          onSaveIntention={handleSaveIntention}
          onOpenSignUp={() => {
            setSelectedArea(null);
            openAuth('signup');
          }}
        />
      )}
      {authOpen && (
        <AuthModal
          mode={authMode}
          user={currentUser}
          error={authError}
          pending={authPending}
          onClose={closeAuth}
          onModeChange={(mode) => {
            setAuthMode(mode);
            setAuthError('');
          }}
          onSubmit={handleAuthSubmit}
          onSignOut={handleSignOut}
        />
      )}
      {isTranslating && <div className="translation-indicator"><Globe2 size={14} /> Translating your page…</div>}
      {notice && <div className="toast-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
    </div>
  );
}

function usePageTranslator(setNotice, setIsTranslating) {
  const recordsRef = useRef([]);
  const nodeRecordsRef = useRef(new WeakMap());
  const attributeRecordsRef = useRef(new WeakMap());
  const translatedRef = useRef(new Map());
  const activeLanguageRef = useRef('en');
  const inFlightRef = useRef(false);
  const translatableAttributes = ['placeholder', 'aria-label', 'aria-description', 'title', 'alt'];

  const cacheFor = (language) => {
    if (!translatedRef.current.has(language)) translatedRef.current.set(language, new Map());
    return translatedRef.current.get(language);
  };

  const scanPage = () => {
    const root = document.getElementById('root');
    if (!root) return [];
    const dirty = [];
    const isIgnored = (element) => Boolean(element.closest('[data-translate-ignore],script,style'));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.nodeValue || '';
        if (!text.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isIgnored(parent) || parent.closest('textarea,input,svg')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      let record = nodeRecordsRef.current.get(node);
      if (!record) {
        record = { kind: 'text', node, source: node.nodeValue, lastApplied: node.nodeValue };
        nodeRecordsRef.current.set(node, record);
        recordsRef.current.push(record);
        dirty.push(record);
      } else if (node.nodeValue !== record.lastApplied) {
        // React may restore English content after a translated render. Treat that as dirty too.
        if (node.nodeValue !== record.source) record.source = node.nodeValue;
        record.lastApplied = node.nodeValue;
        dirty.push(record);
      }
      node = walker.nextNode();
    }

    root.querySelectorAll('*').forEach((element) => {
      if (isIgnored(element)) return;
      let elementRecords = attributeRecordsRef.current.get(element);
      for (const attribute of translatableAttributes) {
        if (!element.hasAttribute(attribute)) {
          if (elementRecords?.has(attribute)) elementRecords.get(attribute).active = false;
          continue;
        }
        const value = element.getAttribute(attribute) || '';
        if (!value.trim()) {
          if (elementRecords?.has(attribute)) elementRecords.get(attribute).active = false;
          continue;
        }

        if (!elementRecords) {
          elementRecords = new Map();
          attributeRecordsRef.current.set(element, elementRecords);
        }

        let record = elementRecords.get(attribute);
        if (!record) {
          record = { kind: 'attribute', node: element, attribute, source: value, lastApplied: value, active: true };
          elementRecords.set(attribute, record);
          recordsRef.current.push(record);
          dirty.push(record);
        } else {
          record.active = true;
          if (value !== record.lastApplied) {
            if (value !== record.source) record.source = value;
            record.lastApplied = value;
            dirty.push(record);
          }
        }
      }
    });

    recordsRef.current = recordsRef.current.filter((record) => record.node.isConnected);
    return dirty;
  };

  const applyLanguage = async (language, changedOnly = false, discoveredRecords = null) => {
    const discovered = discoveredRecords ?? scanPage();
    if (language === 'en') {
      for (const record of recordsRef.current) {
        if (!record.node.isConnected || record.active === false) continue;
        record.lastApplied = record.source;
        if (record.kind === 'attribute') record.node.setAttribute(record.attribute, record.source);
        else record.node.nodeValue = record.source;
      }
      activeLanguageRef.current = 'en';
      return true;
    }

    const cache = cacheFor(language);
    const records = (changedOnly ? discovered : recordsRef.current.filter((record) => record.node.isConnected))
      .filter((record) => record.active !== false);
    const uniqueSources = [...new Set(records.map((record) => record.source.trim()).filter(Boolean))];
    const missing = uniqueSources.filter((text) => !cache.has(text));

    for (let start = 0; start < missing.length; start += 100) {
      const batch = missing.slice(start, start + 100);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, target: language }),
        });
        const result = await response.json();
        if (!response.ok) {
          setNotice(result.error || 'The local translation service could not translate that text. Please try again.');
          return false;
        }
        batch.forEach((text, index) => cache.set(text, decodeTranslatedText(result.translations[index] || text)));
      } catch {
        setNotice('The local translation service is starting or unavailable. Please try again in a moment.');
        return false;
      }
    }

    for (const record of records) {
      if (!record.node.isConnected || record.active === false) continue;
      const translated = cache.get(record.source.trim()) || record.source;
      const spacing = record.source.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const value = spacing ? spacing[1] + translated + spacing[3] : translated;
      record.lastApplied = value;
      if (record.kind === 'attribute') record.node.setAttribute(record.attribute, value);
      else record.node.nodeValue = value;
    }
    activeLanguageRef.current = language;
    return true;
  };

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let timer;

    const scheduleScan = () => {
      if (activeLanguageRef.current === 'en') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (inFlightRef.current) {
          scheduleScan();
          return;
        }
        const dirty = scanPage();
        if (!dirty.length) return;
        inFlightRef.current = true;
        try {
          await applyLanguage(activeLanguageRef.current, true, dirty);
        } finally {
          inFlightRef.current = false;
        }
      }, 80);
    };
    const observer = new MutationObserver(scheduleScan);

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return {
    translate: async (language) => {
      if (language === 'en') return applyLanguage('en');
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      setIsTranslating(true);
      try {
        const complete = await applyLanguage(language);
        if (complete) setNotice('');
        return complete;
      } finally {
        inFlightRef.current = false;
        setIsTranslating(false);
      }
    },
  };
}
function decodeTranslatedText(value) {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = value;
  return decoder.value;
}

export default App;