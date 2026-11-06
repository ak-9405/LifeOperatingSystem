export default function PrivacyPage(){return <div className="route-page"><section className="privacy-section" id="privacy" aria-labelledby="privacy-title">
            <div className="privacy-heading">
              <span className="eyebrow">HOW DATA IS HANDLED</span>
              <h1 id="privacy-title">Know what Life OS saves.</h1>
              <p>This describes the app’s current behavior.</p>
            </div>
            <div className="privacy-grid">
              <article>
                <h3>Tasks and life areas</h3>
                <p>Tasks, intentions, dated check-ins, private life-area journal entries, task reminder times, health readings and goals require an account and are saved in the app database. Account export and deletion include these records. Authorized database administrators can access stored content.</p>
              </article>
              <article>
                <h3>Contact notes</h3>
                <p>Contact notes can be sent only after sign-in. Your name, email, topic and message are stored in the app database; the app does not email the note or send an automatic reply. Anyone with database access can read them, so do not include sensitive information.</p>
              </article>
              <article>
                <h3>Activity calendar</h3>
                <p>The calendar marks a day when you write in a life area, log a check-in or finish a task. Journal activity follows your local date. Older check-in totals were saved without dates, so they are not assigned to calendar days.</p>
              </article>
            </div>
          </section></div>;}
