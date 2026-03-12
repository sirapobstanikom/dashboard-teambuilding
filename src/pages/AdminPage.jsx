import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { MAX_TEAMS, TEAM_COLOR_PALETTE } from '../constants'
import './AdminPage.css'

export default function AdminPage() {
  const {
    dashboardTitle,
    setDashboardTitle,
    teamIds,
    teamNames,
    teamColors,
    scores,
    setAllScores,
    setLastUpdate,
    setTeamName,
    setTeamColor,
    addTeam,
    removeTeam,
    flushToDatabase,
  } = useScore()
  const [formScores, setFormScores] = useState({})
  const [formNames, setFormNames] = useState({})
  const [formTitle, setFormTitle] = useState('')
  const [saved, setSaved] = useState(false)
  const [addAmounts, setAddAmounts] = useState({})
  const hasUserEditedRef = useRef(false)

  // เปิดให้ body เลื่อนได้บนมือถือ (เลื่อนหน้า Admin ได้)
  useEffect(() => {
    document.body.classList.add('route-admin')
    return () => document.body.classList.remove('route-admin')
  }, [])

  useEffect(() => {
    if (!hasUserEditedRef.current) {
      setFormScores({ ...scores })
      setFormNames(prev => ({ ...teamNames, ...prev }))
    }
  }, [scores, teamNames, teamIds])

  useEffect(() => {
    setFormTitle(dashboardTitle || '')
  }, [dashboardTitle])

  const handleScoreChange = (team, value) => {
    hasUserEditedRef.current = true
    const n = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0)
    setFormScores(prev => ({ ...prev, [team]: n === '' ? '' : n }))
  }

  const handleNameChange = (teamId, value) => {
    hasUserEditedRef.current = true
    setFormNames(prev => ({ ...prev, [teamId]: value }))
  }

  const handleNameBlur = (teamId) => {
    const name = (formNames[teamId] ?? teamNames[teamId] ?? '').trim() || `ทีม ${teamId}`
    setTeamName(teamId, name)
    setFormNames(prev => ({ ...prev, [teamId]: name }))
  }

  const handleAdd = (team, amount) => {
    hasUserEditedRef.current = true
    const current = Number(formScores[team]) || 0
    const next = current + amount
    const nextScores = { ...formScores, [team]: next }
    const normalized = {}
    teamIds.forEach(t => { normalized[t] = Math.max(0, Number(nextScores[t]) || 0) })
    setFormScores(normalized)
    setAllScores(normalized)
    setLastUpdate(new Date())
  }

  const handleAddCustom = (team) => {
    const raw = addAmounts[team]
    const amount = Math.max(0, parseInt(String(raw).replace(/\D/g, ''), 10) || 0)
    if (amount === 0) return
    handleAdd(team, amount)
    setAddAmounts(prev => ({ ...prev, [team]: '' }))
  }

  const handleTitleBlur = () => {
    const t = (formTitle || '').trim() || 'ORIENTATION SPORT DAY'
    setDashboardTitle(t)
    setFormTitle(t)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const titleToSet = (formTitle || '').trim() || 'ORIENTATION SPORT DAY'
    setDashboardTitle(titleToSet)
    const scoresToSet = {}
    teamIds.forEach(t => {
      scoresToSet[t] = formScores[t] === '' ? 0 : Number(formScores[t])
    })
    const namesToSet = {}
    teamIds.forEach(t => {
      namesToSet[t] = (formNames[t] ?? teamNames[t] ?? '').trim() || `ทีม ${t}`
    })
    teamIds.forEach(t => setTeamName(t, namesToSet[t]))
    const now = new Date()
    setAllScores(scoresToSet)
    setLastUpdate(now)
    await flushToDatabase({ dashboardTitle: titleToSet, teamIds, teamNames: { ...teamNames, ...namesToSet }, teamColors, scores: scoresToSet, lastUpdate: now })
    hasUserEditedRef.current = false
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getTeamColor = (teamId) => teamColors[teamId] || TEAM_COLOR_PALETTE[teamIds.indexOf(teamId) % TEAM_COLOR_PALETTE.length]

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin — กรอกคะแนน</h1>
        <Link to="/" className="admin-link-dashboard">ดู Dashboard</Link>
      </header>

      <form className="admin-form" onSubmit={handleSave}>
        <section className="admin-section admin-section-title">
          <h2>หัวเรื่อง Dashboard</h2>
          <input
            type="text"
            className="admin-input admin-input-title"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="เช่น ORIENTATION SPORT DAY"
            aria-label="หัวเรื่อง"
          />
        </section>
        <section className="admin-section">
          <h2>คะแนนแต่ละทีม ({teamIds.length}/{MAX_TEAMS})</h2>
          <div className="admin-team-fields">
            {teamIds.map((teamId) => (
              <div key={teamId} className="admin-team-row" style={{ '--team-color': getTeamColor(teamId) }}>
                <input
                  type="color"
                  className="admin-color-picker"
                  value={getTeamColor(teamId)}
                  onChange={e => setTeamColor(teamId, e.target.value)}
                  onBlur={() => setTimeout(() => flushToDatabase(), 0)}
                  title="สีทีม"
                  aria-label="สีทีม"
                />
                <input
                  type="text"
                  className="admin-input admin-input-name"
                  value={formNames[teamId] ?? teamNames[teamId] ?? ''}
                  onChange={e => handleNameChange(teamId, e.target.value)}
                  onBlur={() => handleNameBlur(teamId)}
                  placeholder="ชื่อทีม"
                  aria-label="ชื่อทีม"
                />
                <input
                  type="number"
                  min={0}
                  value={formScores[teamId] ?? ''}
                  onChange={e => handleScoreChange(teamId, e.target.value)}
                  className="admin-input admin-input-score"
                  aria-label="คะแนน"
                />
                <div className="admin-add-custom">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="จำนวน"
                    value={addAmounts[teamId] ?? ''}
                    onChange={e => setAddAmounts(prev => ({ ...prev, [teamId]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom(teamId))}
                    className="admin-input admin-input-add"
                    aria-label="บวกคะแนน"
                  />
                  <button type="button" className="admin-add-btn admin-add-custom-btn" onClick={() => handleAddCustom(teamId)} title="บวกคะแนน">
                    + บวก
                  </button>
                </div>
                <div className="admin-add-btns">
                  <button type="button" className="admin-add-btn" onClick={() => handleAdd(teamId, 10)}>+10</button>
                  <button type="button" className="admin-add-btn" onClick={() => handleAdd(teamId, 100)}>+100</button>
                  <button
                    type="button"
                    className="admin-remove-btn"
                    onClick={() => removeTeam(teamId)}
                    disabled={teamIds.length <= 1}
                    title="ลบทีม"
                    aria-label="ลบทีม"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="admin-add-team-wrap">
            <button
              type="button"
              className="admin-add-team-btn"
              onClick={addTeam}
              disabled={teamIds.length >= MAX_TEAMS}
            >
              + เพิ่มทีม
            </button>
            {teamIds.length >= MAX_TEAMS && <span className="admin-max-hint">(สูงสุด {MAX_TEAMS} ทีม)</span>}
          </div>
        </section>

        <button type="submit" className="admin-submit">
          {saved ? 'บันทึกแล้ว ✓' : 'อัปเดตคะแนน'}
        </button>
      </form>

      <p className="admin-hint">Dashboard จะอัปเดตตามค่าที่บันทึก (เก็บใน database แบบเรียลไทม์)</p>
    </div>
  )
}
