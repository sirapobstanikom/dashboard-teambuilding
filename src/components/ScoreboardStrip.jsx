import { TEAM_LABELS_EN } from '../constants'

const RANK_SUFFIX = ['', 'st', 'nd', 'rd', 'th']

export default function ScoreboardStrip({ rankedTeams, scores, rankByTeam }) {
  const list = rankedTeams || ['green', 'red', 'yellow', 'blue']
  return (
    <section className="scoreboard-strip scoreboard-strip--ranking">
      <span className="scoreboard-strip-label">Ranking</span>
      <div className="scoreboard-strip-inner">
        {list.map((team, index) => {
          const rank = index + 1
          const rankClass = rank <= 3 ? `rank-${rank}` : ''
          return (
            <div key={team} className={`scoreboard-item scoreboard-item--rank ${rankClass}`} data-team={team} data-rank={rank}>
              <span className="rank-badge rank-badge--medal">{rank}</span>
              <span className="rank-ordinal">{rank}{RANK_SUFFIX[rank] || 'th'}</span>
              <span className="team-mini-name">{TEAM_LABELS_EN[team]}</span>
              <span className="team-mini-score">{scores[team]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
