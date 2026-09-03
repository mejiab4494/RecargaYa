import "./LandingPage.css";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import countriesData from "world-countries";

const countries = countriesData
  .map((c) => ({
    code: c.cca2,
    name: c.name.common,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
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
    setSelectedCode("");
    setIsOpen(true);
  }

  function handleSelect(country) {
    setQuery(country.name);
    setSelectedCode(country.code);
    setIsOpen(false);
    navigate("/country-info", { state: { country } });
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
    <div className="landing-page">
      <h1>Bienvenido a RecargaYa</h1>
      <p>Manda recargas a tu familia y amigos en todo el mundo.</p>

      <div className="country-select" ref={wrapperRef}>
        <span>Pais:</span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="e.g., El Salvador"
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

      {selectedCode && <p>Selected code: {selectedCode}</p>}
    </div>
  );
}