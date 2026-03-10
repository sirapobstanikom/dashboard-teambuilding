export default function LiveTicker({ lastUpdate }) {
  const text = lastUpdate
    ? lastUpdate.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'
  return (
    <footer className="live-ticker">
      <span className="ticker-label">Last update:</span>
      <span className="last-update">{text}</span>
    </footer>
  )
}
