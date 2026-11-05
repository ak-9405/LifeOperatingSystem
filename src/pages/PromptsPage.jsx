import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { coachSuggestions } from '../data/workspace.js';
import PageHeader from '../components/PageHeader.jsx';

export default function PromptsPage({currentUser}){const [coachIndex,setCoachIndex]=useState(0);return <div className="route-page"><PageHeader eyebrow="PAUSE AND REFLECT" title="A little room to think." detail="Choose a question and take a moment for yourself." /><section className="coach-section section-block" id="coach">
            <div className="coach-glow coach-glow-one" /><div className="coach-glow coach-glow-two" />
            <div className="coach-copy">
              <span className="coach-tag"><Sparkles size={13} /> DAILY REFLECTION PROMPTS</span>
              <h2>A little perspective<br />can change <em>your whole day.</em></h2>
              <p>Pick a question to pause, think, and choose what deserves your attention. These prompts are written into the app; they are not AI-generated.</p>
              {currentUser && <button type="button" className="button button-light" onClick={() => setCoachIndex((index) => (index + 1) % coachSuggestions.length)}>Show another prompt <ArrowRight size={15} /></button>}
            </div>
            <div className="coach-conversation reflection-card" aria-live="polite">
              {currentUser ? (
                <>
              <div className="coach-conversation-head">
                <span className="coach-avatar"><Sparkles size={17} /></span>
                <span className="coach-persona"><strong>Reflection prompt</strong><small>A moment to think for yourself</small></span>
                <span className="prompt-count">{coachIndex + 1} / {coachSuggestions.length}</span>
              </div>
              <div className="conversation-date">TODAY · TAKE A MOMENT</div>
              <p className="reflection-question">{coachSuggestions[coachIndex]}</p>
              <div className="coach-privacy"><LockKeyhole size={12} /> Your reflection is not entered or saved.</div>
                </>
              ) : (
                <div className="reflection-locked"><LockKeyhole size={19} /><strong>Space to think, on your terms.</strong><p>Reflection prompts are part of your private workspace.</p></div>
              )}
            </div>
          </section></div>;}
