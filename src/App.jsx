import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScoreProvider } from './context/ScoreContext'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <ScoreProvider>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </ScoreProvider>
    </BrowserRouter>
  )
}
