import { useMemo } from 'react'

const COLORS = ['#00c853', '#c62828', '#ffc107', '#1565c0', 'rgba(255,255,255,0.4)', '#ffd54f']
const PARTICLE_COUNT = 70

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 15,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
  }))
}

export default function FallingColors() {
  const particles = useMemo(() => createParticles(), [])

  return (
    <div className="falling-colors" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="falling-colors__particle"
          style={{
            '--left': `${p.left}%`,
            '--size': `${p.size}px`,
            '--color': p.color,
            '--duration': `${p.duration}s`,
            '--delay': `-${p.delay}s`,
            '--radius': p.borderRadius,
          }}
        />
      ))}
    </div>
  )
}
