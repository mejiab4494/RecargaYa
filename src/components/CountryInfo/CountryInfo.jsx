import  {useLocation} from "react-router-dom";
import "./CountryInfo.css";

export default function CountryInfo() {
    const location = useLocation();
    const country = location.state?.country;

    if (!country) {
        return <p>País no encontrado. Regresa y escoje uno</p>;
    }
    return (
        <div className="country-info">
            <h2>{country.name}</h2>
            <p>Code: {country.code}</p>
        </div>
    );
}