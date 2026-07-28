import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Officials from './pages/Officials.jsx'
import OfficialDetail from './pages/OfficialDetail.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/officials" element={<Officials />} />
      <Route path="/official/:id" element={<OfficialDetail />} />
    </Routes>
  )
}
