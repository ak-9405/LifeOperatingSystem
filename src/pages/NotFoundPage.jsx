import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFoundPage() {
  return <div className="route-page not-found-page"><Compass size={34} /><PageHeader eyebrow="A LITTLE OFF TRACK" title="This page is not here." detail="Head back to your day and choose your next step." /><Link className="button button-dark" to="/"><ArrowLeft size={15} /> Back to your day</Link></div>;
}
