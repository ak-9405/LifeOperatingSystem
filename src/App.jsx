import { ArrowRight, Check, ChevronDown, Compass, Globe2, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import { Sidebar, WorkspaceFooter } from './components/WorkspaceShell.jsx';
import NatureBackdrop from './components/NatureBackdrop.jsx';
import { areas, navigation } from './data/workspace.js';
import { localDateString, makeTaskId } from './lib/tasks.js';
import usePageTranslator from './hooks/usePageTranslator.js';
import useDirectionalFocusNavigation from './hooks/useDirectionalFocusNavigation.js';
import DayPage from './pages/DayPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import LifeAreasPage from './pages/LifeAreasPage.jsx';
import AreaPage from './pages/AreaPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PhilosophyPage from './pages/PhilosophyPage.jsx';
import PlusPage from './pages/PlusPage.jsx';

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

function App() {
  useDirectionalFocusNavigation();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const authMode = routeLocation.pathname === '/register' ? 'signup' : 'login';
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskArea, setNewTaskArea] = useState('goals');
  const [newTaskDate, setNewTaskDate] = useState(() => localDateString());
  const [newTaskMinutes, setNewTaskMinutes] = useState(10);
  const [newTaskReminderTime, setNewTaskReminderTime] = useState('');
  const [language, setLanguage] = useState('en');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [notice, setNotice] = useState('');
  const [contactStatus, setContactStatus] = useState({ state: 'idle', message: '' });
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const [areaEntries, setAreaEntries] = useState({});
  const [subscription, setSubscription] = useState({ isPlus: false, demo: false, status: 'free', checkoutEnabled: false, loading: true });
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [now] = useState(() => new Date());
  const translator = usePageTranslator(setNotice, setIsTranslating);
  const contactForm = useRef(null);
  const routeFocus = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => { try { return localStorage.getItem('lifeos.sidebar-open') !== 'false'; } catch { return true; } });
  const [desktopLayout, setDesktopLayout] = useState(() => window.matchMedia('(min-width: 761px)').matches);

  useEffect(() => {
    try { localStorage.setItem('lifeos.sidebar-open', String(sidebarOpen)); } catch {}
  }, [sidebarOpen]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px)');
    const update = () => setDesktopLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!currentUser?.id) {
      setSubscription({ isPlus: false, demo: false, status: 'free', checkoutEnabled: false, loading: false });
      return null;
    }
    try {
      const response = await fetch('/api/billing/status');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your plan could not be loaded.');
      setSubscription({ ...result, loading: false });
      return result;
    } catch {
      setSubscription((current) => ({ ...current, loading: false }));
      return null;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(now);
  const greetingPrefix = 'Hello';
  const today = localDateString(now);
  const displayedTasks = [...tasks].sort((a, b) => a.taskDate.localeCompare(b.taskDate));
  const doneCount = displayedTasks.filter((task) => task.completed).length;
  const plannedMinutes = displayedTasks.filter((task) => !task.completed).reduce((total, task) => total + Number(task.estimatedMinutes || 0), 0);
  const totalCheckIns = Object.values(areaEntries).reduce((total, entry) => total + Number(entry?.checkIns || 0), 0);

  const openAuth = useCallback((mode = 'login') => {
    setAuthError('');
    const from = ['/signin', '/register'].includes(routeLocation.pathname) ? routeLocation.state?.from || '/' : routeLocation.pathname;
    navigate(mode === 'signup' ? '/register' : '/signin', { state: { from } });
  }, [navigate, routeLocation.pathname, routeLocation.state]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active) setCurrentUser(result?.user || null);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const location = new URL(window.location.href);
    const authResult = location.searchParams.get('auth');
    if (!authResult) return;

    const messages = {
      'google-success': 'Welcome to Life OS. Your Google account is connected.',
      'google-cancelled': 'Google sign-in was cancelled.',
      'google-error': 'Google sign-in could not be completed. Please try again.',
      'google-email-conflict': 'An account already uses that email. Sign in with your password first.',
    };
    location.searchParams.delete('auth');
    navigate(location.pathname + location.search + location.hash, { replace: true });

    if (authResult === 'google-email-conflict' || authResult === 'google-error') {
      navigate('/signin', { replace: true });
      setAuthError(messages[authResult]);
      return;
    }
    if (messages[authResult]) setNotice(messages[authResult]);
  }, []);
  useEffect(() => {
    if (!currentUser?.id) {
      setAreaEntries({});
      setTasks([]);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    Promise.all([
      fetch('/api/life-areas', { signal: controller.signal }),
      fetch('/api/tasks', { signal: controller.signal }),
    ])
      .then(async ([areaResponse, taskResponse]) => {
        const [areaResult, taskResult] = await Promise.all([areaResponse.json(), taskResponse.json()]);
        if (!areaResponse.ok) throw new Error(areaResult.error || 'Life areas could not be loaded.');
        if (!taskResponse.ok) throw new Error(taskResult.error || 'Tasks could not be loaded.');
        if (!active) return;
        setAreaEntries(Object.fromEntries((areaResult.areas || []).map((area) => [area.slug, area])));
        setTasks(taskResult.tasks || []);
      })
      .catch((error) => { if (error.name !== 'AbortError' && active) setNotice(error.message); });
    return () => { active = false; controller.abort(); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let active = true;
    async function refreshLifeAreas() {
      try {
        const response = await fetch('/api/life-areas');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Life areas could not be refreshed.');
        if (active) setAreaEntries(Object.fromEntries((result.areas || []).map((area) => [area.slug, area])));
      } catch (error) {
        if (active) setNotice(error.message);
      }
    }
    window.addEventListener('lifeos:journal-saved', refreshLifeAreas);
    return () => {
      active = false;
      window.removeEventListener('lifeos:journal-saved', refreshLifeAreas);
    };
  }, [currentUser?.id]);

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
      const destination = routeLocation.state?.from;
      navigate(destination && !['/signin', '/register', '/account'].includes(destination) ? destination : '/', { replace: true });
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
      setAreaEntries({});
      setTasks([]);
      setCurrentUser(null);
      navigate('/signin', { replace: true });
      setNotice('You’ve signed out. Your account updates are safely saved.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  function handleAccountClick() {
    setAuthError('');
    navigate(currentUser ? '/account' : '/signin');
  }

  async function handleExportAccount() {
    setAuthPending(true);
    setAuthError('');
    try {
      const response = await fetch('/api/account/export');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your data could not be exported.');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lifeos-data-' + today + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Your account data was downloaded.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleDeleteAccount() {
    setAuthPending(true);
    setAuthError('');
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Your account could not be deleted.');
      }
      setAreaEntries({});
      setTasks([]);
      setCurrentUser(null);
      navigate('/', { replace: true });
      setNotice('Your account and saved data were deleted.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }



  async function persistTask(task, method = 'PUT') {
    if (!currentUser) { openAuth('login'); return false; }

    const previous = tasks.find((item) => item.id === task.id);
    const payloadTask = method === 'PUT' && previous && previous.completed !== task.completed
      ? { ...task, completedOn: task.completed ? today : null }
      : task;

    try {
      const url = method === 'POST' ? '/api/tasks' : '/api/tasks/' + encodeURIComponent(task.id);
      const response = await fetch(url, {
        method,
        headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(payloadTask),
      });
      const result = method === 'DELETE' ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || 'Your task could not be saved.');
      if (method === 'DELETE') {
        setTasks((current) => current.filter((item) => item.id !== task.id));
      } else {
        const savedTask = result.task;
        setTasks((current) => method === 'POST'
          ? [...current, savedTask]
          : current.map((item) => item.id === savedTask.id ? savedTask : item));
      }
      setActivityRefreshKey((value) => value + 1);
      return true;
    } catch (error) {
      setNotice(error.message);
      return false;
    }
  }

  async function handleAddTask(event) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const task = {
      id: makeTaskId(),
      title,
      areaSlug: newTaskArea,
      estimatedMinutes: Number(newTaskMinutes),
      completed: false,
      taskDate: newTaskDate,
      reminderTime: newTaskReminderTime,
    };
    const saved = await persistTask(task, 'POST');
    if (saved) {
      setNewTaskTitle('');
      setNewTaskDate(today);
      setNewTaskReminderTime('');
    }
  }

  async function handleUpdateTask(task) {
    return persistTask(task, 'PUT');
  }

  async function handleDeleteTask(task) {
    await persistTask(task, 'DELETE');
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(event.currentTarget).entries());
    setContactStatus({ state: 'sending', message: 'Saving your note…' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Your note could not be saved. Please try again.');
      }

      setContactStatus({
        state: 'success',
        message: 'Your note was saved. No email was sent.',
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


  const activeArea = routeLocation.pathname.startsWith('/life-areas/') ? areas.find((area) => area.slug === routeLocation.pathname.split('/')[2]) : null;
  const pageTitle = activeArea?.title || navigation.find((item) => item.href === routeLocation.pathname)?.label || ({ '/plus': 'Life OS Plus', '/about': 'How it works', '/privacy': 'Data and privacy', '/account': 'Your account', '/signin': 'Sign in', '/register': 'Get started' })[routeLocation.pathname] || 'Page not found';
  useEffect(() => {
    document.title = pageTitle + ' · Life OS';
    window.scrollTo(0, 0);
    routeFocus.current?.focus({ preventScroll: true });
    setShowMobileNav(false);
    setLanguageMenuOpen(false);
  }, [routeLocation.pathname, pageTitle]);

  const accountActions = { error: authError, pending: authPending, onModeChange: openAuth, onSubmit: handleAuthSubmit, onSignOut: handleSignOut, onExportData: handleExportAccount, onDeleteAccount: handleDeleteAccount };

  return <div className={'app-shell' + (!sidebarOpen ? ' is-sidebar-collapsed' : '')}>
    <NatureBackdrop />
    <Sidebar user={currentUser} closed={desktopLayout && !sidebarOpen} onAccountClick={handleAccountClick} />
    <main className="main-content">
      <header className="topbar">
        <div className="topbar-start">
          <button type="button" className="sidebar-toggle" aria-controls="your-space-sidebar" aria-expanded={sidebarOpen} aria-label={sidebarOpen ? 'Hide Your space sidebar' : 'Show Your space sidebar'} onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}<span>Your space</span>
          </button>
          <div className="topbar-context"><span className="topbar-dot" /><span>{pageTitle}</span></div>
        </div>
        <div className="topbar-actions">
          <div className="language-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setLanguageMenuOpen(false); }}>
            <button type="button" className="language-trigger" aria-label="Choose page language" aria-haspopup="menu" aria-expanded={languageMenuOpen} aria-busy={isTranslating} onClick={() => setLanguageMenuOpen((open) => !open)}><Globe2 size={15} strokeWidth={1.8} /><span>Translate</span><ChevronDown className="language-chevron" size={13} /></button>
            {languageMenuOpen && <div className="language-menu" role="menu" aria-label="Choose a language" data-translate-ignore="true">
              {languageOptions.map((option) => <button type="button" role="menuitemradio" aria-checked={language === option.code} className={language === option.code ? 'language-option language-option-active' : 'language-option'} key={option.code} disabled={isTranslating} onClick={() => chooseLanguage(option.code)}><span>{option.label}</span>{language === option.code && <Check size={14} />}</button>)}
              <span className="language-menu-caption">Free local translation</span>
            </div>}
          </div>
          {currentUser ? <button className="topbar-account" type="button" onClick={handleAccountClick} aria-label="Open account"><span className="topbar-avatar">{currentUser.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span className="topbar-account-name" data-translate-ignore="true">{currentUser.name.split(/\s+/)[0]}</span><ChevronDown size={14} /></button> : <div className="auth-actions"><Link className="sign-in-button" to="/signin">Sign in</Link><Link className="create-account-button" to="/register">Get started <ArrowRight size={14} /></Link></div>}
          <button type="button" aria-label="Toggle navigation" aria-expanded={showMobileNav} className="mobile-menu-button" onClick={() => setShowMobileNav((open) => !open)}>{showMobileNav ? <Plus className="rotate-45" size={20} /> : <Compass size={20} />}</button>
        </div>
      </header>
      {showMobileNav && <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((item) => <NavLink to={item.href} end={item.href === '/'} key={item.href} onClick={() => setShowMobileNav(false)}>{item.label}</NavLink>)}
        <span className="mobile-nav-divider" />
        {currentUser ? <Link to="/account" onClick={() => setShowMobileNav(false)}>My account · {currentUser.name}</Link> : <><Link className="mobile-nav-signin" to="/signin" onClick={() => setShowMobileNav(false)}>Sign in <ArrowRight size={14} /></Link><Link className="mobile-nav-join" to="/register" onClick={() => setShowMobileNav(false)}>Get started <ArrowRight size={14} /></Link></>}
      </nav>}
      <div className="page-content">
        <div className="route-outlet" ref={routeFocus} tabIndex={-1} aria-label={pageTitle}>
          <Routes>
            <Route path="/" element={<DayPage {...{currentUser, date, greetingPrefix, totalCheckIns, doneCount, displayedTasks, plannedMinutes, today, language, activityRefreshKey, newTaskTitle, setNewTaskTitle, newTaskArea, setNewTaskArea, newTaskDate, setNewTaskDate, newTaskMinutes, setNewTaskMinutes, newTaskReminderTime, setNewTaskReminderTime, handleAddTask, handleUpdateTask, handleDeleteTask}} onOpenAccount={() => openAuth('login')} />} />
            <Route path="/progress" element={<ProgressPage currentUser={currentUser} tasks={tasks} areaEntries={areaEntries} isPlus={subscription.isPlus} />} />
            <Route path="/life-areas" element={<LifeAreasPage currentUser={currentUser} areaEntries={areaEntries} />} />
            <Route path="/life-areas/:slug" element={<AreaPage currentUser={currentUser} areaEntries={areaEntries} isPlus={subscription.isPlus} onSignIn={() => openAuth('login')} />} />
            <Route path="/prompts" element={<Navigate to="/life-areas" replace />} />
            <Route path="/philosophy" element={<PhilosophyPage currentUser={currentUser} isPlus={subscription.isPlus} />} />
            <Route path="/plus" element={<PlusPage currentUser={currentUser} subscription={subscription} onRefreshStatus={refreshSubscription} />} />
            <Route path="/contact" element={<ContactPage currentUser={currentUser} contactStatus={contactStatus} handleContactSubmit={handleContactSubmit} contactForm={contactForm} />} />
            <Route path="/notes" element={<Navigate to="/contact" replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/account" element={<AccountPage mode="account" currentUser={currentUser} authReady={authReady} {...accountActions} />} />
            <Route path="/signin" element={<AccountPage mode="login" currentUser={currentUser} authReady={authReady} {...accountActions} />} />
            <Route path="/register" element={<AccountPage mode="signup" currentUser={currentUser} authReady={authReady} {...accountActions} />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <WorkspaceFooter />
      </div>
    </main>
    {isTranslating && <div className="translation-indicator"><Globe2 size={14} /> Translating your page…</div>}
    {notice && <div className="toast-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
  </div>;
}
export default App;
