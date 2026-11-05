import { ArrowRight, Flower2 } from 'lucide-react';
import { Link } from 'react-router';
import { steps } from '../data/workspace.js';
import PageHeader from '../components/PageHeader.jsx';

export default function AboutPage(){return <div className="route-page"><PageHeader eyebrow="A LITTLE GUIDANCE" title="How Life OS works." detail="Simple tools for a day that feels more intentional." /><section className="how-section section-block" id="how-it-works">
            <div className="how-heading">
              <div className="eyebrow"><span className="eyebrow-flower"><Flower2 size={14} /></span> A SOFTER WAY FORWARD</div>
              <h2>Less keeping up.<br /><em>More living well.</em></h2>
              <p>Life OS keeps tasks, intentions and check-ins together so you can see what matters to you.</p>
              <Link className="button button-dark" to="/">Find your flow <ArrowRight size={15} /></Link>
              <div className="how-side-note"><span className="note-asterisk">✳</span><span>Designed for real life,<br />which is beautifully messy.</span></div>
            </div>
            <div className="steps-list">
              {steps.map(({ number, title, detail, icon: Icon, tone, href }) => (
                <Link className="step-card" to={href} key={number}>
                  <div className={'step-icon ' + tone}><Icon size={18} strokeWidth={1.7} /></div>
                  <span className="step-number">{number}</span>
                  <h3>{title}</h3><p>{detail}</p>
                  <span className="step-open-link"><ArrowRight size={14} /></span>
                </Link>
              ))}
              <p className="steps-caption"><span />No streaks to protect. No perfect days required.</p>
            </div>
          </section></div>;}
