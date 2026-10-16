import { useState, useRef, useEffect } from "react";
import { countries } from "../../data/countries";
import "./CountrySearch.css";

export default function CountrySearch({
  onSelect,
  initialValue = "",
  placeholder = "Buscar País",
}) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

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
    setQuery(country.name);
    setIsOpen(false);
    onSelect(country);
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
    <div className="country-select" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={(e) => {
          e.target.select(); // so typing replaces the current country name
          setIsOpen(true);
        }}
        placeholder={placeholder}
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
  );
}