import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/footer.jsx'
import LandingPage from './components/LandingPage/LandingPage.jsx'
import Recargas from './components/Recargas/Recargas.jsx'
import CountryInfo from './components/CountryInfo/CountryInfo.jsx'
import TarjetaDeRegalo from './components/TarjetaDeRegalo/TarjetaDeRegalo.jsx'
import GiftCardInfo from './components/GiftCardInfo/GiftCardInfo.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/recargas" element={<Recargas />} />
          <Route path="/tarjetaDeRegalo" element={<TarjetaDeRegalo />} />
          <Route path="/tarjetaDeRegalo/:code" element={<GiftCardInfo />} />
          <Route path="/recargas/:code" element={<CountryInfo />} />
        </Routes>
      </div>
      <Footer />
    </BrowserRouter>
  )
}

export default App
