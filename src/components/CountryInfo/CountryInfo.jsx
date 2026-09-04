import { useState } from "react";
import { useLocation } from "react-router-dom";
import "./CountryInfo.css";

export default function CountryInfo() {
    const location = useLocation();
    const country = location.state?.country;

    const [formData, setFormData] = useState({
        phoneNumber: "",
        operator: "",
        amount: "",
        senderName: "",
        senderEmail: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // "success" | "error" | null

    if (!country) {
        return <p>País no encontrado. Regresa y escoje uno</p>;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);

        try {
            const payload = {
                country: country.code,
                ...formData,
            };

            // Replace with your actual top-off API endpoint
            const response = await fetch("/api/topoff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Request failed");

            setStatus("success");
            setFormData({
                phoneNumber: "",
                operator: "",
                amount: "",
                senderName: "",
                senderEmail: "",
            });
        } catch (err) {
            console.error(err);
            setStatus("error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="country-info">
            <div className="country-details">
                <h2>{country.name}</h2>
                <p>Code: {country.code}</p>

                <form onSubmit={handleSubmit} className="topoff-form">
                    <div className="form-group">
                        <label htmlFor="phoneNumber">Número de teléfono</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            placeholder="Ej. 7123-4567"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="operator">Operador</label>
                        <select
                            id="operator"
                            name="operator"
                            value={formData.operator}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un operador</option>
                            <option value="claro">Claro</option>
                            <option value="tigo">Tigo</option>
                            <option value="digicel">Digicel</option>
                            <option value="movistar">Movistar</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="amount">Monto a recargar</label>
                        <select
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecciona un monto</option>
                            <option value="5">$5</option>
                            <option value="10">$10</option>
                            <option value="20">$20</option>
                            <option value="30">$30</option>
                            <option value="50">$50</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="senderName">Tu nombre</label>
                        <input
                            type="text"
                            id="senderName"
                            name="senderName"
                            value={formData.senderName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="senderEmail">Tu correo electrónico</label>
                        <input
                            type="email"
                            id="senderEmail"
                            name="senderEmail"
                            value={formData.senderEmail}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" disabled={submitting}>
                        {submitting ? "Enviando..." : "Solicitar recarga"}
                    </button>

                    {status === "success" && (
                        <p className="form-success">¡Solicitud enviada con éxito!</p>
                    )}
                    {status === "error" && (
                        <p className="form-error">
                            Hubo un error al enviar la solicitud. Intenta de nuevo.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}