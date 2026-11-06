import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';
import AreaCard from '../components/AreaCard.jsx';
import { areas } from '../data/workspace.js';

export default function LifeAreasPage({ currentUser, areaEntries }) {
  return <div className="route-page">
    <PageHeader eyebrow="YOUR LIFE AREAS" title="Make room for what matters." detail="Give each part of your life a place to write. Saving a note automatically records a check-in for that area." action={<Link className="route-text-link" to="/progress">View your progress <ArrowRight size={14} /></Link>} />
    <div className="area-grid">{areas.map((area) => <AreaCard area={area} entry={areaEntries[area.slug]} demo={!currentUser} key={area.slug} />)}</div>
    <div className="areas-footer"><span><LockKeyhole size={13} /> Your data controls live in Account.</span><Link to="/privacy">How data is handled</Link></div>
  </div>;
}
