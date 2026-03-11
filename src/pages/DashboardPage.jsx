import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import ScoreboardStrip from '../components/ScoreboardStrip'
import TeamCard from '../components/TeamCard'
import Confetti from '../components/Confetti'
import FallingColors from '../components/FallingColors'
import LiveTicker from '../components/LiveTicker'
import { useScore } from '../context/ScoreContext'
import { MAX_SCORE } from '../constants'

const ADMIN_LINK_KEY = 'dashboard_show_admin'

function getRankedTeams(teamIds, scores) {
  return [...teamIds].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))
}

export default function DashboardPage() {
  const { teamIds, teamNames, teamColors, scores, lastUpdate } = useScore()
  const confettiRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_LINK_KEY, '1')
    } catch {}
  }, [])

  const rankedTeams = getRankedTeams(teamIds, scores)
  const rankByTeam = rankedTeams.reduce((acc, team, i) => ({ ...acc, [team]: i + 1 }), {})
  const maxScore = Math.max(MAX_SCORE, ...rankedTeams.map(t => scores[t] || 0), 1)
  const teamCount = rankedTeams.length
  const gridMod = teamCount >= 9 ? 'many' : teamCount === 8 ? '8' : teamCount === 7 ? '7' : teamCount === 6 ? '6' : teamCount === 5 ? '5' : ''

  return (
    <div className="dashboard-wrapper">
      <div className="stadium-overlay" />
      <div className="spotlight-grid" />
      <FallingColors />

      <Link to="/admin" className="dashboard-admin-link dashboard-admin-link--subtle" title="Admin" aria-label="Admin">Admin</Link>

      <main className={`dashboard ${teamCount > 8 ? 'dashboard--many-teams' : ''}`}>
        <Header />
        <ScoreboardStrip rankedTeams={rankedTeams} scores={scores} rankByTeam={rankByTeam} teamNames={teamNames} />
        <div className={`ranking-grid-wrapper ${teamCount > 8 ? 'ranking-grid-wrapper--many' : ''}`}>
          <section className={`ranking-grid ${gridMod ? `ranking-grid--${gridMod}` : ''}`} data-team-count={teamCount}>
          {rankedTeams.map((team, index) => {
            const rank = index + 1
            return (
              <TeamCard
                key={team}
                team={team}
                teamName={teamNames[team] || `ทีม ${team}`}
                teamColor={teamColors[team]}
                score={scores[team] || 0}
                rank={rank}
                progressPct={Math.min(100, ((scores[team] || 0) / maxScore) * 100)}
                colorIndex={index}
              />
            )
          })}
          </section>
        </div>
        <LiveTicker lastUpdate={lastUpdate} />
      </main>

      <Confetti ref={confettiRef} />
    </div>
  )
}
