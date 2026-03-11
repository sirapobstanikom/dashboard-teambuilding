import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { TEAMS, TEAM_LABELS } from '../constants'
import './AdminPage.css'

export default function AdminPage() {
  const { scores, setAllScores, setLastUpdate, flushToDatabase } = useScore()
  const [formScores, setFormScores] = useState({ ...scores })
  const [saved, setSaved] = useState(false)
  const hasUserEditedRef = useRef(false)

  // ดึงค่าเก่าจาก context/DB มาใส่ฟอร์ม — แต่ถ้าผู้ใช้กำลังแก้ไขอยู่ ไม่ทับ (ป้องกันบัค)
  useEffect(() => {
    if (!hasUserEditedRef.current) {
      setFormScores({ ...scores })
    }
  }, [scores])

  const handleScoreChange = (team, value) => {
    hasUserEditedRef.current = true
    const n = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0)
    setFormScores(prev => ({ ...prev, [team]: n === '' ? '' : n }))
  }

  const handleAdd = (team, amount) => {
    hasUserEditedRef.current = true
    const current = Number(formScores[team]) || 0
    const next = current + amount
    const nextScores = { ...formScores, [team]: next }
    const normalized = {}
    TEAMS.forEach(t => { normalized[t] = Math.max(0, Number(nextScores[t]) || 0) })
    setFormScores(normalized)
    setAllScores(normalized)
    setLastUpdate(new Date())
  }

  // ค่าที่พิมพ์ในช่อง "บวก" แต่ละทีม (ทีม -> ตัวเลขที่พิมพ์)
  const [addAmounts, setAddAmounts] = useState({ green: '', red: '', yellow: '', blue: '' })

  const handleAddCustom = (team) => {
    const raw = addAmounts[team]
    const amount = Math.max(0, parseInt(String(raw).replace(/\D/g, ''), 10) || 0)
    if (amount === 0) return
    handleAdd(team, amount)
    setAddAmounts(prev => ({ ...prev, [team]: '' }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const scoresToSet = {}
    TEAMS.forEach(t => {
      scoresToSet[t] = formScores[t] === '' ? 0 : Number(formScores[t])
    })
    const now = new Date()
    setAllScores(scoresToSet)
    setLastUpdate(now)
    await flushToDatabase({ scores: scoresToSet, lastUpdate: now })
    hasUserEditedRef.current = false
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const teamColors = { green: '#00c853', red: '#c62828', yellow: '#ffc107', blue: '#1565c0' }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin — กรอกคะแนน</h1>
        <Link to="/" className="admin-link-dashboard">ดู Dashboard</Link>
      </header>

      <form className="admin-form" onSubmit={handleSave}>
        <section className="admin-section">
          <h2>คะแนนแต่ละทีม</h2>
          <div className="admin-team-fields">
            {TEAMS.map(team => (
              <div key={team} className="admin-team-row" style={{ '--team-color': teamColors[team] }}>
                <label className="admin-team-name">{TEAM_LABELS[team]}</label>
                <input
                  type="number"
                  min={0}
                  value={formScores[team]}
                  onChange={e => handleScoreChange(team, e.target.value)}
                  className="admin-input admin-input-score"
                  aria-label={`คะแนน ${TEAM_LABELS[team]}`}
                />
                <div className="admin-add-custom">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="จำนวน"
                    value={addAmounts[team]}
                    onChange={e => setAddAmounts(prev => ({ ...prev, [team]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom(team))}
                    className="admin-input admin-input-add"
                    aria-label={`บวกคะแนน ${TEAM_LABELS[team]}`}
                  />
                  <button type="button" className="admin-add-btn admin-add-custom-btn" onClick={() => handleAddCustom(team)} title="บวกคะแนน">
                    + บวก
                  </button>
                </div>
                <div className="admin-add-btns">
                  <button type="button" className="admin-add-btn" onClick={() => handleAdd(team, 10)}>+10</button>
                  <button type="button" className="admin-add-btn" onClick={() => handleAdd(team, 100)}>+100</button>
                </div>
              </div>
            ))}
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
