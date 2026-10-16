import "./LandingPage.css";
import { useNavigate } from "react-router-dom";
import CountrySearch from "../CountrySearch/CountrySearch";

export default function LandingPage() {
  const navigate = useNavigate();

  function handleSelect(country) {
    navigate(`/recargas/${country.code}`, { state: { country } });
  }

  return (
    <div className="landing">
      <div className="landingContent">
        <div className="landingCard">
          <h1>Bienvenido a RecargaYa</h1>
          <p>Manda recargas a tu familia y amigos en todo el mundo.</p>

          <CountrySearch onSelect={handleSelect} />

             <div className="features">
                <h2>Características</h2>
                <ul>
                  <li>Envío rápido y seguro</li>
                  <li>Manda recargas a 160+ países</li>
                  <li>Interfaz intuitiva y fácil de usar</li>
                  <li>Mantente conectado con tu familia y amigos</li>
                </ul>
            </div>
          </div>
        <div className="landingIllustration">
          <img src="/img/world-connected.svg" alt="Mundo conectado" />
        </div>
      </div>
    </div>
  );
}