import { useNavigate } from "react-router-dom";
import CountrySearch from "../CountrySearch/CountrySearch";
import banner from "/img/recargas-banner.svg"; 

export default function Recargas() {
    const navigate = useNavigate();

    const handleCountryChange = (c) => {
        navigate(`/recargas/${c.code}`);
    };

    return (
        <div className="country-info">
            <div className="country-details">
                <img src={banner} alt="" className="country-banner" />
                <h2>¿A qué país quieres enviar la recarga?</h2>
                <CountrySearch
                    onSelect={handleCountryChange}
                    placeholder="Buscar País"
                />
            </div>
        </div>
    );
}