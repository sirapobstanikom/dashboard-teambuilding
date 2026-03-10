export default function RoundTimer({ timerSeconds }) {
  const minutes = Math.floor(timerSeconds / 60)
  const seconds = timerSeconds % 60
  return (
    <section className="round-timer">
      <span className="timer-label">Round Time</span>
      <div className="timer-display">
        <span>{String(minutes).padStart(2, '0')}</span>:<span>{String(seconds).padStart(2, '0')}</span>
      </div>
    </section>
  )
}
