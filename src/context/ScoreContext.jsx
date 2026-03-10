import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { TEAMS } from '../constants'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const STORAGE_KEY = 'olympic-dashboard-scores'
const DASHBOARD_ROW_ID = 'default'

const defaultScores = { green: 0, red: 0, yellow: 0, blue: 0 }
const defaultMedals = { green: 0, red: 0, yellow: 0, blue: 0 }

const defaultState = {
  scores: { ...defaultScores },
  medals: { ...defaultMedals },
  lastUpdate: null,
  timerSeconds: 5 * 60,
}

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
  return { ...defaultState }
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

// เมื่อใช้ Supabase ให้ใช้ database เป็นแหล่งความจริงเดียว ไม่โหลดจาก localStorage
const initialState = isSupabaseEnabled() ? defaultState : loadStateFromStorage()

export function ScoreProvider({ children }) {
  const location = useLocation()
  const [scores, setScoresState] = useState(() => initialState.scores)
  const [medals, setMedalsState] = useState(() => initialState.medals)
  const [lastUpdate, setLastUpdateState] = useState(() => initialState.lastUpdate)
  const [timerSeconds, setTimerSecondsState] = useState(() => initialState.timerSeconds)
  const saveTimeoutRef = useRef(null)
  const isRemoteUpdateRef = useRef(false)
  const hasFetchedRef = useRef(false)
  const isAdminPage = location.pathname === '/admin'

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
      } catch (e) {
        console.error('[Supabase] load failed:', e)
      } finally {
        hasFetchedRef.current = true
      }
    }
    fetchState()
    return () => { cancelled = true }
  }, [])

  // Persist: ถ้าใช้ Supabase ให้เก็บเฉพาะใน database (เรียลไทม์), ถ้าไม่ใช้ให้เก็บใน localStorage
  useEffect(() => {
    if (!isSupabaseEnabled()) {
      saveStateToStorage(scores, medals, lastUpdate, timerSeconds)
    }

    if (!isSupabaseEnabled() || !supabase || isRemoteUpdateRef.current || !hasFetchedRef.current) {
      isRemoteUpdateRef.current = false
      return
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null
      const now = new Date().toISOString()
      try {
        const teamRows = TEAMS.map((team) => ({
          team,
          score: Number(scores[team]) || 0,
          medals: Number(medals[team]) || 0,
          updated_at: now,
        }))
        const [teamRes, dashboardRes] = await Promise.all([
          supabase.from('team_scores').upsert(teamRows, { onConflict: 'team' }),
          supabase.from('dashboard_state').upsert({
            id: DASHBOARD_ROW_ID,
            scores,
            medals,
            last_update: lastUpdate ? lastUpdate.toISOString() : null,
            timer_seconds: timerSeconds,
            updated_at: now,
          }, { onConflict: 'id' }),
        ])
        if (teamRes.error) console.error('[Supabase] team_scores:', teamRes.error.message, teamRes.error)
        if (dashboardRes.error) console.error('[Supabase] dashboard_state:', dashboardRes.error.message, dashboardRes.error)
      } catch (err) {
        console.error('[Supabase] save failed:', err)
      }
    }, 400)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [scores, medals, lastUpdate, timerSeconds])

  // Realtime: อัปเดตหน้าบ้านทันทีเมื่อมีค่าเข้า database (ใช้ payload โดยตรง)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return
    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_scores' }, (payload) => {
        const row = payload?.new
        if (!row || !TEAMS.includes(row.team)) return
        isRemoteUpdateRef.current = true
        const team = row.team
        const score = Number(row.score) || 0
        const medalsCount = Number(row.medals) || 0
        setScoresState(prev => ({ ...prev, [team]: score }))
        setMedalsState(prev => ({ ...prev, [team]: medalsCount }))
        if (row.updated_at) setLastUpdateState(new Date(row.updated_at))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_state' }, (payload) => {
        const row = payload?.new
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

  // โพลจาก DB ทุก 2 วินาที (เมื่ออยู่หน้า Dashboard เท่านั้น ไม่โพลตอนอยู่หน้า Admin เพื่อไม่ให้ค่าที่กำลังพิมพ์ถูกทับ)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase || isAdminPage) return
    let cancelled = false
    const poll = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const [teamsRes, dashboardRes] = await Promise.all([
          supabase.from('team_scores').select('team, score, medals, updated_at').in('team', TEAMS),
          supabase.from('dashboard_state').select('scores, medals, last_update, timer_seconds').eq('id', DASHBOARD_ROW_ID).single(),
        ])
        if (cancelled) return
        isRemoteUpdateRef.current = true
        if (teamsRes.data && Array.isArray(teamsRes.data) && teamsRes.data.length > 0) {
          const nextScores = { ...defaultScores }
          const nextMedals = { ...defaultMedals }
          let lastUpdate = null
          teamsRes.data.forEach((row) => {
            if (TEAMS.includes(row.team)) {
              nextScores[row.team] = Number(row.score) || 0
              nextMedals[row.team] = Number(row.medals) || 0
              if (row.updated_at) {
                const d = new Date(row.updated_at)
                if (!lastUpdate || d > lastUpdate) lastUpdate = d
              }
            }
          })
          setScoresState(nextScores)
          setMedalsState(nextMedals)
          if (lastUpdate) setLastUpdateState(lastUpdate)
        }
        if (dashboardRes?.data) {
          const d = dashboardRes.data
          if (d.scores && typeof d.scores === 'object') setScoresState(prev => ({ ...defaultScores, ...prev, ...d.scores }))
          if (d.medals && typeof d.medals === 'object') setMedalsState(prev => ({ ...defaultMedals, ...prev, ...d.medals }))
          if (d.last_update) setLastUpdateState(new Date(d.last_update))
          if (typeof d.timer_seconds === 'number') setTimerSecondsState(d.timer_seconds)
        }
      } catch (_) {}
    }
    const id = setInterval(poll, 2000)
    poll()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAdminPage])

  // เมื่อไม่ใช้ Supabase: sync หลายแท็บผ่าน localStorage
  useEffect(() => {
    if (isSupabaseEnabled()) return
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

  // บันทึกลง database ทันที (เรียกจาก Admin ตอนกดปุ่มอัปเดต) — รับ payload เพื่อเขียนค่าที่กดบันทึกเลย ไม่รอ state
  const flushToDatabase = useCallback(async (payload) => {
    if (!isSupabaseEnabled() || !supabase) return
    const s = payload?.scores ?? scores
    const m = payload?.medals ?? medals
    const lu = payload?.lastUpdate !== undefined ? payload.lastUpdate : lastUpdate
    const ts = payload?.timerSeconds !== undefined ? payload.timerSeconds : timerSeconds
    const now = new Date().toISOString()
    try {
      const teamRows = TEAMS.map((team) => ({
        team,
        score: Number(s[team]) || 0,
        medals: Number(m[team]) || 0,
        updated_at: now,
      }))
      const [teamRes, dashboardRes] = await Promise.all([
        supabase.from('team_scores').upsert(teamRows, { onConflict: 'team' }),
        supabase.from('dashboard_state').upsert({
          id: DASHBOARD_ROW_ID,
          scores: s,
          medals: m,
          last_update: lu ? (lu instanceof Date ? lu.toISOString() : new Date(lu).toISOString()) : null,
          timer_seconds: ts,
          updated_at: now,
        }, { onConflict: 'id' }),
      ])
      if (teamRes.error) console.error('[Supabase] team_scores:', teamRes.error.message)
      if (dashboardRes.error) console.error('[Supabase] dashboard_state:', dashboardRes.error.message)
    } catch (err) {
      console.error('[Supabase] flush failed:', err)
    }
  }, [scores, medals, lastUpdate, timerSeconds])

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
    flushToDatabase,
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
