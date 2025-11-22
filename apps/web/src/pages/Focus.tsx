import FocusTimer from '../components/FocusTimer'
import { useFocusSummary } from '../hooks/useFocusSessions'

const rituals = [
  'Mute notifications or enable Do Not Disturb.',
  'Pick a single task and write the first step.',
  'Plan your break reward before you start.'
]

const boosters = [
  { label: 'Deep work', hint: 'Use 50-minute focus blocks for complex work.' },
  { label: 'Micro breaks', hint: 'Stand up, stretch, hydrate between rounds.' },
  { label: 'Reflection', hint: 'Journal one win after each streak.' }
]

export default function Focus() {
  const summary = useFocusSummary()

  return (
    <div className="content animate-page focus-page">
      <div className="focus-page__hero">
        <div>
          <p className="focus-page__eyebrow">Flow state mode</p>
          <h1>Focus Center</h1>
          <p className="focus-page__lede">
            Queue up a Pomodoro session, track your streak, and keep your deep work ritual in one place.
          </p>
        </div>
        <div className="focus-stat-grid">
          <div className="focus-stat card card-float">
            <div className="focus-stat__label">Today</div>
            <div className="focus-stat__value">{summary.todayMinutes} min</div>
            <p className="focus-stat__hint">Logged focus time</p>
          </div>
          <div className="focus-stat card card-float">
            <div className="focus-stat__label">Streak</div>
            <div className="focus-stat__value">{summary.streakDays} days</div>
            <p className="focus-stat__hint">Consecutive focus days</p>
          </div>
          <div className="focus-stat card card-float">
            <div className="focus-stat__label">All time</div>
            <div className="focus-stat__value">{summary.totalMinutes} min</div>
            <p className="focus-stat__hint">Focus + break minutes logged</p>
          </div>
        </div>
      </div>
      <div className="focus-layout">
        <section className="focus-layout__primary card card-float focus-panel" aria-label="Focus timer">
          <FocusTimer />
        </section>
        <aside className="focus-layout__sidebar" aria-label="Focus rituals and tips">
          <div className="card card-float focus-rituals">
            <div className="focus-rituals__title">Pre-focus ritual</div>
            <ul>
              {rituals.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card card-float focus-boosters">
            <div className="focus-boosters__title">Momentum boosters</div>
            <div className="focus-boosters__list">
              {boosters.map(boost => (
                <div key={boost.label} className="focus-booster">
                  <div className="focus-booster__label">{boost.label}</div>
                  <p className="focus-booster__hint">{boost.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}


