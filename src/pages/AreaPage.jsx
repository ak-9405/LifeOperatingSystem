import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router';
import AreaDetailModal from '../components/AreaDetailModal.jsx';
import { areas } from '../data/workspace.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function AreaPage({ currentUser, areaEntries, onCheckIn, onSaveIntention, onSignIn }) {
  const { slug } = useParams();
  const area = areas.find((item) => item.slug === slug);
  if (!area) return <NotFoundPage />;
  return <div className="route-page area-detail-page">
    <Link className="route-back-link" to="/life-areas"><ArrowLeft size={15} /> All life areas</Link>
    <AreaDetailModal key={area.slug} area={area} saved={areaEntries[area.slug]} signedIn={Boolean(currentUser)} presentation="page" onCheckIn={onCheckIn} onSaveIntention={onSaveIntention} onOpenSignUp={onSignIn} />
    <Link className="route-text-link area-progress-link" to={slug === 'health' ? '/progress' : '/'}>{slug === 'health' ? 'Steps, sleep and health goals' : 'Plan a task for this area'} <ArrowRight size={14} /></Link>
  </div>;
}
