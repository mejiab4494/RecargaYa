import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { countries } from "../../data/countries";
import "./CountryInfo.css";

const LOOKUP_PRODUCTS_URL =
    "https://us-central1-recargaya-27525.cloudfunctions.net/lookupProducts";
const REQUEST_TOPOFF_URL =
    "https://requesttopoff-xgo6xfjira-uc.a.run.app";

export default function CountryInfo() {
    const navigate = useNavigate();
    const { code } = useParams();
    const location = useLocation();
    const country =
        location.state?.country ||
        (code && countries.find((c) => c.code === code.toUpperCase()));

    const [formData, setFormData] = useState({
        phoneNumber: "",
        productId: "",
        senderName: "",
        senderEmail: "",
    });
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productsError, setProductsError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // "success" | "error" | null

    // Fetch DT One products for this country as soon as we know which country it is
    useEffect(() => {
        if (!country?.code) return;

        setLoadingProducts(true);
        setProductsError(null);

        fetch(`${LOOKUP_PRODUCTS_URL}?countryIso=${country.code}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load products");
                return res.json();
            })
            .then((data) => {
                const allProducts = Array.isArray(data) ? data : data.products || [];
                // Only mobile recharge products: these are the ones that need a phone number.
                const rechargeProducts = allProducts.filter(
                    (p) => p.type === "FIXED_VALUE_RECHARGE"
                );
                setProducts(rechargeProducts);
            })
            .catch((err) => {
                console.error("Product lookup failed:", err);
                setProductsError("No se pudieron cargar los planes disponibles.");
            })
            .finally(() => setLoadingProducts(false));
    }, [country?.code]);

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
                countryCode: country.code,
                productId: formData.productId,
                phoneNumber: formData.phoneNumber,
                senderName: formData.senderName,
                senderEmail: formData.senderEmail,
            };

            const response = await fetch(REQUEST_TOPOFF_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Request failed");

            setStatus("success");
            setFormData({
                phoneNumber: "",
                productId: "",
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

    // No country chosen (e.g. header link to /recargas): show a picker
    if (!country) {
        return (
            <div className="country-info">
                <div className="country-details">
                    <h2>¿A qué país quieres enviar la recarga?</h2>
                    <select
                        defaultValue=""
                        onChange={(e) => navigate(`/recargas/${e.target.value}`)}
                    >
                        <option value="" disabled>
                            Selecciona un país
                        </option>
                        {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="country-info">
            <div className="country-details">
                <h2>{country.name}</h2>

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
                        <label htmlFor="productId">Plan de recarga</label>
                        <select
                            id="productId"
                            name="productId"
                            value={formData.productId}
                            onChange={handleChange}
                            required
                            disabled={loadingProducts || !!productsError}
                        >
                            <option value="">
                                {loadingProducts
                                    ? "Cargando planes..."
                                    : "Selecciona un plan"}
                            </option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} — ${product.prices?.retail?.amount}{" "}
                                    {product.prices?.retail?.unit}
                                    {product.validity?.quantity
                                        ? ` (${product.validity.quantity} ${product.validity.unit.toLowerCase()})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                        {productsError && (
                            <p className="form-error">{productsError}</p>
                        )}
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

                    <button type="submit" disabled={submitting || loadingProducts}>
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