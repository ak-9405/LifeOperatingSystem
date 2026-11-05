import { Navigate } from 'react-router';
import AuthModal from '../components/AuthModal.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function AccountPage({ mode, currentUser, authReady, ...actions }) {
  if (!authReady) return <div className="route-page route-loading" role="status">Opening your workspace…</div>;
  if (mode === 'account' && !currentUser) return <Navigate to="/signin" replace />;
  return <div className="route-page account-page">
    <PageHeader eyebrow={mode === 'account' ? 'YOUR PERSONAL SPACE' : 'WELCOME TO LIFE OS'} title={mode === 'account' ? 'Your account.' : mode === 'signup' ? 'Start with a little space.' : 'Pick up where you left off.'} detail={mode === 'account' ? 'Manage your workspace and the data you save.' : 'Your tasks, goals and daily progress, all in your own space.'} />
    <AuthModal key={mode} presentation="page" mode={mode} user={currentUser} {...actions} />
  </div>;
}
