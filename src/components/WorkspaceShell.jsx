import { ArrowUpRight, ChevronDown, Leaf } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { navigation } from '../data/workspace.js';

export function Sidebar({ user, closed, onAccountClick }) {
  const initials = user ? user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : '';
  return (
    <aside id="your-space-sidebar" className="sidebar" aria-label="Main navigation" aria-hidden={closed || undefined} inert={closed || undefined}>
      <div className="sidebar-header">
        <Link className="brand" to="/" aria-label="Life OS home"><span className="brand-symbol"><Leaf size={19} strokeWidth={2.2} /></span><span className="brand-name">life<span>OS</span></span></Link>
      </div>
      <span className="brand-edition">YOUR LIFE, IN RHYTHM</span>
      <span className="sidebar-heading">YOUR SPACE</span>
      <nav className="side-nav" aria-label="Workspace">
        {navigation.map(({ href, label, icon: Icon }) => (
          <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')} to={href} end={href === '/'} key={href}>
            {({ isActive }) => <><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{isActive && <span className="nav-pip" />}</>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-mantra"><span className="sidebar-status-dot" /><p>A little space to focus.</p><span>One clear next step at a time.</span></div>
      <button type="button" className="sidebar-user" onClick={onAccountClick} aria-label={user ? 'Open account' : 'Open your personal workspace'}>
        <span className="user-avatar">{user ? initials : <Leaf size={14} />}</span>
        <span className="user-lines"><strong data-translate-ignore={user ? 'true' : undefined}>{user?.name || 'Personal workspace'}</strong><span>{user ? 'Your saved workspace' : 'Sign in to your workspace'}</span></span>
        <ChevronDown size={16} className="user-chevron" />
      </button>
    </aside>
  );
}

export function WorkspaceFooter() {
  return <footer className="footer">
    <Link className="footer-brand" to="/"><span><Leaf size={14} /></span>lifeOS</Link>
    <span className="footer-promise">Make room for what matters.</span>
    <div className="footer-links"><Link to="/about">How it works</Link><Link to="/privacy">Data and privacy</Link><Link to="/contact">Contact us <ArrowUpRight size={12} /></Link></div>
    <span className="footer-copyright">© 2026 LIFE OS</span>
  </footer>;
}
