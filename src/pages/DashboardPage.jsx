import { useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import ScoreboardStrip from '../components/ScoreboardStrip'
import TeamCard from '../components/TeamCard'
import Confetti from '../components/Confetti'
import FallingColors from '../components/FallingColors'
import LiveTicker from '../components/LiveTicker'
import { useScore } from '../context/ScoreContext'
import { TEAMS, MAX_SCORE } from '../constants'

function getRankedTeams(scores) {
  return [...TEAMS].sort((a, b) => scores[b] - scores[a])
}

export default function DashboardPage() {
  const { scores, lastUpdate } = useScore()
  const confettiRef = useRef(null)

  const rankedTeams = getRankedTeams(scores)
  const rankByTeam = rankedTeams.reduce((acc, team, i) => ({ ...acc, [team]: i + 1 }), {})

  return (
    <div className="dashboard-wrapper">
      <div className="stadium-overlay" />
      <div className="spotlight-grid" />
      <FallingColors />

      <Link to="/admin" className="dashboard-admin-link dashboard-admin-link--subtle" title="Admin">·</Link>

      <main className="dashboard">
        <Header />
        <ScoreboardStrip rankedTeams={rankedTeams} scores={scores} rankByTeam={rankByTeam} />
        <section className="ranking-grid">
          {rankedTeams.map((team, index) => {
            const rank = index + 1
            return (
              <TeamCard
                key={team}
                team={team}
                score={scores[team]}
                rank={rank}
                progressPct={Math.min(100, (scores[team] / MAX_SCORE) * 100)}
              />
            )
          })}
        </section>
        <LiveTicker lastUpdate={lastUpdate} />
      </main>

      <Confetti ref={confettiRef} />
    </div>
  )
}
