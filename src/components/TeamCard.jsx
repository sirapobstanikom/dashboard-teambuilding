import { TEAM_LABELS } from '../constants'

const RANK_LABEL = ['', '1st', '2nd', '3rd', '4th']

export default function TeamCard({ team, score, rank, progressPct }) {
  const rankLabel = RANK_LABEL[rank] || `${rank}th`
  const rankClass = rank <= 3 ? `rank-${rank}` : ''
  return (
    <article className={`team-card team-card--ranking ${rankClass}`} data-team={team} data-rank={rank}>
      <div className="card-glow" />
      <div className="card-rank-wrap">
        <span className="card-rank-ordinal">{rankLabel}</span>
      </div>
      <div className="team-icon">&#127952;</div>
      <h2 className="team-name">{TEAM_LABELS[team]}</h2>
      <div className="team-score-wrap">
        <span className="team-score">{score}</span>
        <span className="team-score-label">pts</span>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
    </article>
  )
}
