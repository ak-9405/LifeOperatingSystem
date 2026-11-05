import { ArrowRight, BadgeCheck, ChevronDown, LockKeyhole } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';

export default function ContactPage({currentUser,contactStatus,handleContactSubmit,contactForm}){return <div className="route-page"><PageHeader eyebrow="CONTACT US" title="Get in touch." detail="Have a question or an idea for Life OS? Leave it here." /><section className="contact-section section-block" id="contact">
            <div className="contact-copy">
              <span className="eyebrow"><span className="contact-star">✳</span> LEAVE A NOTE</span>
              <h2>Let’s make space<br />for <em>what matters.</em></h2>
              <p>Have a question or idea? Leave the team a private note from your workspace.</p>
              <div className="contact-assurance"><span className="contact-assurance-icon"><LockKeyhole size={15} /></span><span><strong>Saved securely after sign-in.</strong><small>The app does not email your note. Avoid sensitive details.</small></span></div>
              <div className="contact-contact-line"><span className="contact-line-dot" />No automatic reply is sent.</div>
            </div>
{currentUser ? (
            <form className="contact-form" onSubmit={handleContactSubmit} ref={contactForm}>
              <div className="form-heading"><span>YOUR NOTE</span><span>01 <i>/ 04</i></span></div>
              <div className="form-row">
                <label className="field-wrap"><span>Your name</span><input type="text" name="name" defaultValue={currentUser?.name || ''} placeholder="How should we address you?" autoComplete="name" maxLength={100} required /></label>
                <label className="field-wrap"><span>Email address</span><input type="email" name="email" defaultValue={currentUser?.email || ''} placeholder="you@example.com" autoComplete="email" maxLength={254} required /></label>
              </div>
              <label className="field-wrap">
                <span>What’s on your mind?</span>
                <select name="area" defaultValue="">
                  <option value="" disabled>Choose what you’re curious about</option>
                  <option value="Life OS">The Life OS experience</option>
                  <option value="Daily prompts">Daily reflection prompts</option>
                  <option value="Integrations">Connecting my tools</option>
                  <option value="Something else">Something else entirely</option>
                </select>
                <span className="select-chevron"><ChevronDown size={15} /></span>
              </label>
              <label className="field-wrap"><span>A little more, if you like</span><textarea name="message" placeholder="No perfect words needed. We’re listening…" rows={3} maxLength={2000} required /></label>
              <button className="button button-submit" type="submit" disabled={contactStatus.state === 'sending'}>
                {contactStatus.state === 'sending' ? 'Saving…' : 'Save your note'}
                {contactStatus.state === 'success' ? <BadgeCheck size={16} /> : <ArrowRight size={15} />}
              </button>
              <div aria-live="polite" className={'form-status status-' + contactStatus.state}>{contactStatus.message}</div>
            </form>
            ) : (
              <div className="contact-auth-gate"><LockKeyhole size={18} /><strong>Leave a private note</strong><p>Contact notes are available from your personal workspace.</p></div>
            )}
          </section></div>;}
