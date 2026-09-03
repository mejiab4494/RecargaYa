import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header.jsx'
import LandingPage from './components/LandingPage/LandingPage.jsx'
import CountryInfo from './components/CountryInfo/CountryInfo.jsx'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <LandingPage />
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/country-info" element={<CountryInfo />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
