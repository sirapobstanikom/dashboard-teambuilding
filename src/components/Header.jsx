import { useScore } from '../context/ScoreContext'

export default function Header() {
  const { dashboardTitle } = useScore()
  return (
    <header className="dashboard-header">
      <div className="olympic-rings">&#9976;</div>
      <h1 className="main-title">{dashboardTitle || 'ORIENTATION SPORT DAY'}</h1>
      <p className="subtitle">Live Score • Rankings</p>
    </header>
  )
}
