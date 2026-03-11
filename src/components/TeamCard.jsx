import { TEAM_COLOR_PALETTE, TEAMS } from '../constants'

const RANK_LABEL = ['', '1st', '2nd', '3rd', '4th']

export default function TeamCard({ team, teamName, score, rank, progressPct, colorIndex = 0, teamColor }) {
  const rankLabel = RANK_LABEL[rank] || `${rank}th`
  const rankClass = rank <= 4 ? `rank-${rank}` : ''
  const color = teamColor || TEAM_COLOR_PALETTE[colorIndex % TEAM_COLOR_PALETTE.length]
  const useCustomColor = !!teamColor || !TEAMS.includes(team)
  return (
    <article
      className={`team-card team-card--ranking ${rankClass} ${useCustomColor ? 'team-card--custom' : ''}`}
      data-team={team}
      data-rank={rank}
      style={useCustomColor ? { '--team-color': color } : undefined}
    >
      <div className="card-glow" />
      <div className="card-rank-wrap">
        <span className="card-rank-ordinal">{rankLabel}</span>
      </div>
      <div className="team-icon">&#127952;</div>
      <h2 className="team-name">{teamName || team}</h2>
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
