import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from 'react'

const CONFETTI_COLORS = ['#00c853', '#c62828', '#ffc107', '#1565c0', '#fff', '#ffd54f']

function Confetti(_, ref) {
  const containerRef = useRef(null)

  const trigger = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const count = 40 + Math.floor(Math.random() * 30)
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'confetti'
      el.style.left = Math.random() * 100 + 'vw'
      el.style.animationDelay = Math.random() * 2 + 's'
      el.style.animationDuration = 3 + Math.random() * 2 + 's'
      el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
      el.style.width = 6 + Math.random() * 8 + 'px'
      el.style.height = 6 + Math.random() * 6 + 'px'
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
      container.appendChild(el)
      setTimeout(() => el.remove(), 6000)
    }
  }, [])

  useImperativeHandle(ref, () => trigger, [trigger])

  useEffect(() => {
    const t = setTimeout(trigger, 800)
    return () => clearTimeout(t)
  }, [trigger])

  return <div ref={containerRef} className="confetti-container" id="confetti-container" />
}

export default forwardRef(Confetti)
