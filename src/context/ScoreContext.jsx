import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { TEAMS } from '../constants'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const STORAGE_KEY = 'olympic-dashboard-scores'
const DASHBOARD_ROW_ID = 'default'

const defaultScores = { green: 0, red: 0, yellow: 0, blue: 0 }
const defaultMedals = { green: 0, red: 0, yellow: 0, blue: 0 }

function loadStateFromStorage() {
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

function saveStateToStorage(scores, medals, lastUpdate, timerSeconds) {
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

const initialState = loadStateFromStorage()

export function ScoreProvider({ children }) {
  const [scores, setScoresState] = useState(() => initialState.scores)
  const [medals, setMedalsState] = useState(() => initialState.medals)
  const [lastUpdate, setLastUpdateState] = useState(() => initialState.lastUpdate)
  const [timerSeconds, setTimerSecondsState] = useState(() => initialState.timerSeconds)
  const saveTimeoutRef = useRef(null)
  const isRemoteUpdateRef = useRef(false)

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

  // Load from Supabase on mount: team_scores (แต่ละทีม) + dashboard_state (timer, last_update)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return
    let cancelled = false
    async function fetchState() {
      try {
        const [teamsRes, dashboardRes] = await Promise.all([
          supabase.from('team_scores').select('team, score, medals, updated_at').in('team', TEAMS),
          supabase.from('dashboard_state').select('scores, medals, last_update, timer_seconds').eq('id', DASHBOARD_ROW_ID).single(),
        ])
        if (cancelled) return
        isRemoteUpdateRef.current = true
        if (teamsRes.data && Array.isArray(teamsRes.data) && teamsRes.data.length > 0) {
          const scores = { ...defaultScores }
          const medals = { ...defaultMedals }
          let lastUpdate = null
          teamsRes.data.forEach((row) => {
            if (TEAMS.includes(row.team)) {
              scores[row.team] = Number(row.score) || 0
              medals[row.team] = Number(row.medals) || 0
              if (row.updated_at) {
                const d = new Date(row.updated_at)
                if (!lastUpdate || d > lastUpdate) lastUpdate = d
              }
            }
          })
          setScoresState(scores)
          setMedalsState(medals)
          if (lastUpdate) setLastUpdateState(lastUpdate)
        } else if (dashboardRes.data?.scores || dashboardRes.data?.medals) {
          if (dashboardRes.data.scores && typeof dashboardRes.data.scores === 'object') {
            setScoresState(prev => ({ ...defaultScores, ...prev, ...dashboardRes.data.scores }))
          }
          if (dashboardRes.data.medals && typeof dashboardRes.data.medals === 'object') {
            setMedalsState(prev => ({ ...defaultMedals, ...prev, ...dashboardRes.data.medals }))
          }
        }
        if (dashboardRes.data) {
          if (dashboardRes.data.last_update) setLastUpdateState(new Date(dashboardRes.data.last_update))
          if (typeof dashboardRes.data.timer_seconds === 'number') setTimerSecondsState(dashboardRes.data.timer_seconds)
        }
      } catch (_) {}
    }
    fetchState()
    return () => { cancelled = true }
  }, [])

  // Persist to localStorage and Supabase when state changes
  useEffect(() => {
    saveStateToStorage(scores, medals, lastUpdate, timerSeconds)

    if (!isSupabaseEnabled() || !supabase || isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false
      return
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null
      const now = new Date().toISOString()
      try {
        await Promise.all([
          supabase.from('team_scores').upsert(
            TEAMS.map((team) => ({
              team,
              score: scores[team] ?? 0,
              medals: medals[team] ?? 0,
              updated_at: now,
            })),
            { onConflict: 'team' }
          ),
          supabase.from('dashboard_state').upsert({
            id: DASHBOARD_ROW_ID,
            scores,
            medals,
            last_update: lastUpdate ? lastUpdate.toISOString() : null,
            timer_seconds: timerSeconds,
            updated_at: now,
          }, { onConflict: 'id' }),
        ])
      } catch (_) {}
    }, 400)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [scores, medals, lastUpdate, timerSeconds])

  // Realtime: sync เมื่อมี client อื่นอัปเดต (ทั้ง team_scores และ dashboard_state)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return
    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_scores' }, async () => {
        isRemoteUpdateRef.current = true
        const { data } = await supabase.from('team_scores').select('team, score, medals, updated_at').in('team', TEAMS)
        if (!data || !data.length) return
        const scores = { ...defaultScores }
        const medals = { ...defaultMedals }
        let lastUpdate = null
        data.forEach((row) => {
          if (TEAMS.includes(row.team)) {
            scores[row.team] = Number(row.score) || 0
            medals[row.team] = Number(row.medals) || 0
            if (row.updated_at) {
              const d = new Date(row.updated_at)
              if (!lastUpdate || d > lastUpdate) lastUpdate = d
            }
          }
        })
        setScoresState(scores)
        setMedalsState(medals)
        if (lastUpdate) setLastUpdateState(lastUpdate)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_state' }, (payload) => {
        const row = payload.new
        if (!row || row.id !== DASHBOARD_ROW_ID) return
        isRemoteUpdateRef.current = true
        if (row.scores && typeof row.scores === 'object') setScoresState(prev => ({ ...defaultScores, ...prev, ...row.scores }))
        if (row.medals && typeof row.medals === 'object') setMedalsState(prev => ({ ...defaultMedals, ...prev, ...row.medals }))
        if (row.last_update) setLastUpdateState(new Date(row.last_update))
        if (typeof row.timer_seconds === 'number') setTimerSecondsState(row.timer_seconds)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fallback: listen for storage events (other tab, when Supabase is off)
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
