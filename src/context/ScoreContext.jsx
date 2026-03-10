import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { TEAMS } from '../constants'

const STORAGE_KEY = 'olympic-dashboard-scores'

const defaultScores = { green: 0, red: 0, yellow: 0, blue: 0 }
const defaultMedals = { green: 0, red: 0, yellow: 0, blue: 0 }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        scores: { ...defaultScores, ...data.scores },
        medals: { ...defaultMedals, ...data.medals },
        lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : null,
        timerSeconds: typeof data.timerSeconds === 'number' ? data.timerSeconds : 5 * 60,
      }
    }
  } catch (_) {}
  return {
    scores: { ...defaultScores },
    medals: { ...defaultMedals },
    lastUpdate: null,
    timerSeconds: 5 * 60,
  }
}

function saveState(scores, medals, lastUpdate, timerSeconds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      scores,
      medals,
      lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      timerSeconds,
    }))
  } catch (_) {}
}

const ScoreContext = createContext(null)

const initialState = loadState()

export function ScoreProvider({ children }) {
  const [scores, setScoresState] = useState(() => initialState.scores)
  const [medals, setMedalsState] = useState(() => initialState.medals)
  const [lastUpdate, setLastUpdateState] = useState(() => initialState.lastUpdate)
  const [timerSeconds, setTimerSecondsState] = useState(() => initialState.timerSeconds)

  const setScores = useCallback((value) => {
    setScoresState(typeof value === 'function' ? value : () => value)
  }, [])
  const setMedals = useCallback((value) => {
    setMedalsState(typeof value === 'function' ? value : () => value)
  }, [])
  const setLastUpdate = useCallback((date) => {
    setLastUpdateState(date || null)
  }, [])
  const setTimerSeconds = useCallback((value) => {
    setTimerSecondsState(typeof value === 'function' ? value : () => value)
  }, [])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveState(scores, medals, lastUpdate, timerSeconds)
  }, [scores, medals, lastUpdate, timerSeconds])

  // Listen for storage events (other tab updated)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const data = JSON.parse(e.newValue)
        if (data.scores) setScoresState(data.scores)
        if (data.medals) setMedalsState(data.medals)
        if (data.lastUpdate) setLastUpdateState(new Date(data.lastUpdate))
        if (typeof data.timerSeconds === 'number') setTimerSecondsState(data.timerSeconds)
      } catch (_) {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updateTeamScore = useCallback((team, newScore, addMedal = false) => {
    setScoresState(prev => ({ ...prev, [team]: Math.max(0, newScore) }))
    if (addMedal) {
      setMedalsState(prev => ({ ...prev, [team]: (prev[team] || 0) + 1 }))
    }
    setLastUpdateState(new Date())
  }, [])

  const setAllScores = useCallback((newScores) => {
    const next = { ...defaultScores }
    TEAMS.forEach(t => {
      const v = Number(newScores[t])
      next[t] = isNaN(v) ? 0 : Math.max(0, Math.floor(v))
    })
    setScoresState(next)
    setLastUpdateState(new Date())
  }, [])

  const setAllMedals = useCallback((newMedals) => {
    const next = { ...defaultMedals }
    TEAMS.forEach(t => {
      const v = Number(newMedals[t])
      next[t] = isNaN(v) ? 0 : Math.max(0, Math.floor(v))
    })
    setMedalsState(next)
    setLastUpdateState(new Date())
  }, [])

  const value = {
    scores,
    medals,
    lastUpdate,
    timerSeconds,
    setScores,
    setMedals,
    setLastUpdate,
    setTimerSeconds,
    updateTeamScore,
    setAllScores,
    setAllMedals,
  }

  return (
    <ScoreContext.Provider value={value}>
      {children}
    </ScoreContext.Provider>
  )
}

export function useScore() {
  const ctx = useContext(ScoreContext)
  if (!ctx) throw new Error('useScore must be used within ScoreProvider')
  return ctx
}
