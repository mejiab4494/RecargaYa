import { useNavigate } from "react-router-dom";
import CountrySearch from "../CountrySearch/CountrySearch";
import banner from "/img/tarjeta-regalo-banner.svg"; 

export default function TarjetaDeRegalo() {
    const navigate = useNavigate();

    const handleCountryChange = (country) => {
        navigate(`/tarjetaDeRegalo/${country.code}`);
    };

    return (
        <div className="country-info">
            <div className="country-details">
                <img src={banner} alt="" className="country-banner" />
                <h2>Targeta de Regalo</h2>
                <p>¡Regala una experiencia increíble!</p>
                    <CountrySearch
                    onSelect={handleCountryChange}
                    placeholder="Buscar País"
                />
            </div>
        </div>
    )

}