import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_TEAM_IDS, DEFAULT_TEAM_NAMES, DEFAULT_TEAM_COLORS, TEAM_COLOR_PALETTE } from '../constants'
import { supabase, isSupabaseEnabled } from '../lib/supabase'

const STORAGE_KEY = 'olympic-dashboard-scores'
const DASHBOARD_ROW_ID = 'default'

const defaultState = {
  teamIds: [...DEFAULT_TEAM_IDS],
  teamNames: { ...DEFAULT_TEAM_NAMES },
  teamColors: { ...DEFAULT_TEAM_COLORS },
  scores: Object.fromEntries(DEFAULT_TEAM_IDS.map(id => [id, 0])),
  medals: Object.fromEntries(DEFAULT_TEAM_IDS.map(id => [id, 0])),
  lastUpdate: null,
  timerSeconds: 5 * 60,
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      const teamIds = Array.isArray(data.teamIds) && data.teamIds.length > 0 ? data.teamIds : defaultState.teamIds
      const teamNames = data.teamNames && typeof data.teamNames === 'object' ? { ...defaultState.teamNames, ...data.teamNames } : { ...defaultState.teamNames }
      const teamColors = data.teamColors && typeof data.teamColors === 'object' ? { ...defaultState.teamColors, ...data.teamColors } : { ...defaultState.teamColors }
      const scores = { ...Object.fromEntries(teamIds.map(id => [id, 0])), ...data.scores }
      const medals = { ...Object.fromEntries(teamIds.map(id => [id, 0])), ...data.medals }
      return {
        teamIds,
        teamNames,
        teamColors,
        scores,
        medals,
        lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : null,
        timerSeconds: typeof data.timerSeconds === 'number' ? data.timerSeconds : 5 * 60,
      }
    }
  } catch (_) {}
  return { ...defaultState }
}

function saveStateToStorage(teamIds, teamNames, teamColors, scores, medals, lastUpdate, timerSeconds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      teamIds,
      teamNames,
      teamColors,
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
  const [teamIds, setTeamIdsState] = useState(() => initialState.teamIds)
  const [teamNames, setTeamNamesState] = useState(() => initialState.teamNames)
  const [teamColors, setTeamColorsState] = useState(() => initialState.teamColors ?? defaultState.teamColors)
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

  // Load from Supabase on mount: team_ids, team_names, team_scores, dashboard_state
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return
    let cancelled = false
    async function fetchState() {
      try {
        const { data: dashboardData } = await supabase
          .from('dashboard_state')
          .select('team_ids, team_names, team_colors, scores, medals, last_update, timer_seconds')
          .eq('id', DASHBOARD_ROW_ID)
          .single()
        if (cancelled) return
        isRemoteUpdateRef.current = true
        const ids = Array.isArray(dashboardData?.team_ids) && dashboardData.team_ids.length > 0
          ? dashboardData.team_ids
          : defaultState.teamIds
        const names = dashboardData?.team_names && typeof dashboardData.team_names === 'object'
          ? { ...defaultState.teamNames, ...dashboardData.team_names }
          : defaultState.teamNames
        const colors = dashboardData?.team_colors && typeof dashboardData.team_colors === 'object'
          ? { ...defaultState.teamColors, ...dashboardData.team_colors }
          : defaultState.teamColors
        setTeamIdsState(ids)
        setTeamNamesState(prev => ({ ...defaultState.teamNames, ...prev, ...names }))
        setTeamColorsState(prev => ({ ...defaultState.teamColors, ...prev, ...colors }))
        if (dashboardData?.last_update) setLastUpdateState(new Date(dashboardData.last_update))
        if (typeof dashboardData?.timer_seconds === 'number') setTimerSecondsState(dashboardData.timer_seconds)
        const { data: teamsData } = await supabase
          .from('team_scores')
          .select('team, score, medals, updated_at')
          .in('team', ids)
        if (cancelled) return
        if (teamsData && Array.isArray(teamsData) && teamsData.length > 0) {
          const nextScores = Object.fromEntries(ids.map(id => [id, 0]))
          const nextMedals = Object.fromEntries(ids.map(id => [id, 0]))
          let lastUpdate = null
          teamsData.forEach((row) => {
            if (ids.includes(row.team)) {
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
        } else if (dashboardData?.scores && typeof dashboardData.scores === 'object') {
          setScoresState(prev => ({ ...Object.fromEntries(ids.map(id => [id, 0])), ...prev, ...dashboardData.scores }))
        }
        if (dashboardData?.medals && typeof dashboardData.medals === 'object') {
          setMedalsState(prev => ({ ...Object.fromEntries(ids.map(id => [id, 0])), ...prev, ...dashboardData.medals }))
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
      saveStateToStorage(teamIds, teamNames, teamColors, scores, medals, lastUpdate, timerSeconds)
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
        const teamRows = teamIds.map((team) => ({
          team,
          score: Number(scores[team]) || 0,
          medals: Number(medals[team]) || 0,
          updated_at: now,
        }))
        const [teamRes, dashboardRes] = await Promise.all([
          supabase.from('team_scores').upsert(teamRows, { onConflict: 'team' }),
          supabase.from('dashboard_state').upsert({
            id: DASHBOARD_ROW_ID,
            team_ids: teamIds,
            team_names: teamNames,
            team_colors: teamColors,
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
  }, [teamIds, teamNames, teamColors, scores, medals, lastUpdate, timerSeconds])

  // Realtime: อัปเดตหน้าบ้านทันทีเมื่อมีค่าเข้า database (ใช้ payload โดยตรง)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase) return
    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_scores' }, (payload) => {
        const row = payload?.new
        if (!row) return
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
        if (Array.isArray(row.team_ids) && row.team_ids.length > 0) setTeamIdsState(row.team_ids)
        if (row.team_names && typeof row.team_names === 'object') setTeamNamesState(prev => ({ ...prev, ...row.team_names }))
        if (row.team_colors && typeof row.team_colors === 'object') setTeamColorsState(prev => ({ ...defaultState.teamColors, ...prev, ...row.team_colors }))
        if (row.scores && typeof row.scores === 'object') setScoresState(prev => ({ ...prev, ...row.scores }))
        if (row.medals && typeof row.medals === 'object') setMedalsState(prev => ({ ...prev, ...row.medals }))
        if (row.last_update) setLastUpdateState(new Date(row.last_update))
        if (typeof row.timer_seconds === 'number') setTimerSecondsState(row.timer_seconds)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // โพลจาก DB ทุก 2 วินาที (เมื่ออยู่หน้า Dashboard เท่านั้น)
  useEffect(() => {
    if (!isSupabaseEnabled() || !supabase || isAdminPage) return
    let cancelled = false
    const poll = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const { data: dashboardData } = await supabase
          .from('dashboard_state')
          .select('team_ids, team_names, team_colors, scores, medals, last_update, timer_seconds')
          .eq('id', DASHBOARD_ROW_ID)
          .single()
        if (cancelled) return
        const ids = Array.isArray(dashboardData?.team_ids) && dashboardData.team_ids.length > 0 ? dashboardData.team_ids : teamIds
        const { data: teamsData } = await supabase
          .from('team_scores')
          .select('team, score, medals, updated_at')
          .in('team', ids)
        if (cancelled) return
        isRemoteUpdateRef.current = true
        if (Array.isArray(dashboardData?.team_ids) && dashboardData.team_ids.length > 0) setTeamIdsState(dashboardData.team_ids)
        if (dashboardData?.team_names && typeof dashboardData.team_names === 'object') setTeamNamesState(prev => ({ ...prev, ...dashboardData.team_names }))
        if (dashboardData?.team_colors && typeof dashboardData.team_colors === 'object') setTeamColorsState(prev => ({ ...defaultState.teamColors, ...prev, ...dashboardData.team_colors }))
        if (teamsData && teamsData.length > 0) {
          const nextScores = Object.fromEntries(ids.map(id => [id, 0]))
          const nextMedals = Object.fromEntries(ids.map(id => [id, 0]))
          let lastUpdate = null
          teamsData.forEach((row) => {
            if (ids.includes(row.team)) {
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
        if (dashboardData?.scores && typeof dashboardData.scores === 'object') setScoresState(prev => ({ ...prev, ...dashboardData.scores }))
        if (dashboardData?.medals && typeof dashboardData.medals === 'object') setMedalsState(prev => ({ ...prev, ...dashboardData.medals }))
        if (dashboardData?.last_update) setLastUpdateState(new Date(dashboardData.last_update))
        if (typeof dashboardData?.timer_seconds === 'number') setTimerSecondsState(dashboardData.timer_seconds)
      } catch (_) {}
    }
    const id = setInterval(poll, 2000)
    poll()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAdminPage, teamIds])

  // เมื่อไม่ใช้ Supabase: sync หลายแท็บผ่าน localStorage
  useEffect(() => {
    if (isSupabaseEnabled()) return
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const data = JSON.parse(e.newValue)
        if (Array.isArray(data.teamIds)) setTeamIdsState(data.teamIds)
        if (data.teamNames && typeof data.teamNames === 'object') setTeamNamesState(data.teamNames)
        if (data.teamColors && typeof data.teamColors === 'object') setTeamColorsState(data.teamColors)
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
    const next = {}
    teamIds.forEach(t => {
      const v = Number(newScores[t])
      next[t] = isNaN(v) ? 0 : Math.max(0, Math.floor(v))
    })
    setScoresState(next)
    setLastUpdateState(new Date())
  }, [teamIds])

  const setAllMedals = useCallback((newMedals) => {
    const next = {}
    teamIds.forEach(t => {
      const v = Number(newMedals[t])
      next[t] = isNaN(v) ? 0 : Math.max(0, Math.floor(v))
    })
    setMedalsState(next)
    setLastUpdateState(new Date())
  }, [teamIds])

  const setTeamName = useCallback((teamId, name) => {
    setTeamNamesState(prev => ({ ...prev, [teamId]: String(name).trim() || prev[teamId] || teamId }))
  }, [])

  const setTeamColor = useCallback((teamId, hex) => {
    const color = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : (teamColors[teamId] || TEAM_COLOR_PALETTE[0])
    setTeamColorsState(prev => ({ ...prev, [teamId]: color }))
  }, [teamColors])

  const addTeam = useCallback(() => {
    if (teamIds.length >= 30) return
    const newId = 'team_' + Date.now()
    const newColor = TEAM_COLOR_PALETTE[teamIds.length % TEAM_COLOR_PALETTE.length]
    setTeamIdsState(prev => [...prev, newId])
    setTeamNamesState(prev => ({ ...prev, [newId]: `ทีม ${teamIds.length + 1}` }))
    setTeamColorsState(prev => ({ ...prev, [newId]: newColor }))
    setScoresState(prev => ({ ...prev, [newId]: 0 }))
    setMedalsState(prev => ({ ...prev, [newId]: 0 }))
    setLastUpdateState(new Date())
  }, [teamIds.length])

  const removeTeam = useCallback((teamId) => {
    if (teamIds.length <= 1) return
    setTeamIdsState(prev => prev.filter(id => id !== teamId))
    setTeamNamesState(prev => {
      const next = { ...prev }
      delete next[teamId]
      return next
    })
    setTeamColorsState(prev => {
      const next = { ...prev }
      delete next[teamId]
      return next
    })
    setScoresState(prev => {
      const next = { ...prev }
      delete next[teamId]
      return next
    })
    setMedalsState(prev => {
      const next = { ...prev }
      delete next[teamId]
      return next
    })
    setLastUpdateState(new Date())
    if (isSupabaseEnabled() && supabase) {
      supabase.from('team_scores').delete().eq('team', teamId).then(({ error }) => {
        if (error) console.error('[Supabase] delete team_scores:', error.message)
      })
    }
  }, [teamIds.length, teamIds])

  // บันทึกลง database ทันที (เรียกจาก Admin ตอนกดปุ่มอัปเดต)
  const flushToDatabase = useCallback(async (payload) => {
    if (!isSupabaseEnabled() || !supabase) return
    const ids = payload?.teamIds ?? teamIds
    const names = payload?.teamNames ?? teamNames
    const colors = payload?.teamColors ?? teamColors
    const s = payload?.scores ?? scores
    const m = payload?.medals ?? medals
    const lu = payload?.lastUpdate !== undefined ? payload.lastUpdate : lastUpdate
    const ts = payload?.timerSeconds !== undefined ? payload.timerSeconds : timerSeconds
    const now = new Date().toISOString()
    try {
      const teamRows = ids.map((team) => ({
        team,
        score: Number(s[team]) || 0,
        medals: Number(m[team]) || 0,
        updated_at: now,
      }))
      const [teamRes, dashboardRes] = await Promise.all([
        supabase.from('team_scores').upsert(teamRows, { onConflict: 'team' }),
        supabase.from('dashboard_state').upsert({
          id: DASHBOARD_ROW_ID,
          team_ids: ids,
          team_names: names,
          team_colors: colors,
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
  }, [teamIds, teamNames, teamColors, scores, medals, lastUpdate, timerSeconds])

  const value = {
    teamIds,
    teamNames,
    teamColors,
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
    setTeamName,
    setTeamColor,
    addTeam,
    removeTeam,
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
