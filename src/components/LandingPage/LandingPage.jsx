import "./LandingPage.css";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { countries } from "../../data/countries";

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const filteredCountries =
    query.trim() === ""
      ? []
      : countries.filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase())
        );

  function handleInputChange(e) {
    setQuery(e.target.value);
    setIsOpen(true);
  }

  function handleSelect(country) {
    setIsOpen(false);
    navigate(`/recargas/${country.code}`, { state: { country } }); // sends to Recargas component
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  return (
    <div className="landing">
      <div className="landingContent">
        <div className="landingCard">
          <h1>Bienvenido a RecargaYa</h1>
          <p>Manda recargas a tu familia y amigos en todo el mundo.</p>

          <div className="country-select" ref={wrapperRef}>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar Pais"
              autoComplete="off"
            />

            {isOpen && filteredCountries.length > 0 && (
              <ul className="country-dropdown">
                {filteredCountries.map((c) => (
                  <li key={c.code} onClick={() => handleSelect(c)}>
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
            <img src="./img/world-connected.svg" alt="Hero" />
        </div>
      </div>
   </div>
  );
}