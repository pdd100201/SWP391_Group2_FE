import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import HomeScreen from './features/home/screens/HomeScreen'
import AuthScreen from './features/auth/screens/AuthScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/register" element={<AuthScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
