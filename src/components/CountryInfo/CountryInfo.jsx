import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { countries } from "../../data/countries";
import CountrySearch from "../CountrySearch/CountrySearch";
import PaymentSection from "../PaymentSection/PaymentSection";
import "./CountryInfo.css";

const LOOKUP_PRODUCTS_URL =
    "https://us-central1-recargaya-27525.cloudfunctions.net/lookupProducts";

const operatorKey = (p) => String(p.operator?.id ?? p.operator?.name ?? "other");
const hasPromo = (p) => Array.isArray(p.promotions) && p.promotions.length > 0;

// Turns "7123-4567" into "+50371234567" using the country's calling code
const toInternational = (input, callingCode) => {
    let cleaned = (input || "").trim().replace(/[\s\-().]/g, "");
    if (!cleaned) return "";

    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);

    cleaned = cleaned.replace(/^0+/, "");
    return `${callingCode || ""}${cleaned}`;
};

export default function CountryInfo() {
    const navigate = useNavigate();
    const { code } = useParams();

    // The URL is the source of truth: /recargas/SV always shows El Salvador
    const country = code
        ? countries.find((c) => c.code === code.toUpperCase())
        : null;

    const [formData, setFormData] = useState({
        phoneNumber: "",
        productId: "",
        senderName: "",
        senderEmail: "",
    });
    const [products, setProducts] = useState([]);
    const [selectedOperator, setSelectedOperator] = useState("");
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productsError, setProductsError] = useState(null);
    const [status, setStatus] = useState(null); // "success" | "error" | null

    // Fetch products whenever the country changes
    useEffect(() => {
        if (!country?.code) return;

        setLoadingProducts(true);
        setProductsError(null);
        setProducts([]);
        setSelectedOperator("");
        setStatus(null);
        // Clear the phone number (it belongs to the old country) and the plan.
        // Name and email are kept so the user doesn't retype them.
        setFormData((prev) => ({ ...prev, phoneNumber: "", productId: "" }));

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

    // Unique carriers, with a flag if any of their plans has a promotion
    const operators = useMemo(() => {
        const map = new Map();
        products.forEach((p) => {
            const key = operatorKey(p);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    name: p.operator?.name || "Otros",
                    promo: false,
                });
            }
            if (hasPromo(p)) map.get(key).promo = true;
        });
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    // If there is only one carrier, select it automatically
    useEffect(() => {
        if (operators.length === 1) setSelectedOperator(operators[0].key);
    }, [operators]);

    const operatorProducts = products.filter(
        (p) => operatorKey(p) === selectedOperator
    );
    const selectedProduct = products.find(
        (p) => String(p.id) === String(formData.productId)
    );

    // Payment values
    const retail = selectedProduct?.prices?.retail;
    const amountCents = retail ? Math.round(retail.amount * 100) : 0;

    const isFormValid =
        !!selectedProduct &&
        formData.phoneNumber.trim() !== "" &&
        formData.senderName.trim() !== "" &&
        /\S+@\S+\.\S+/.test(formData.senderEmail);

    const order = {
        countryCode: country?.code,
        productId: formData.productId,
        phoneNumber: toInternational(formData.phoneNumber, country?.callingCode),
        senderName: formData.senderName,
        senderEmail: formData.senderEmail,
    };

    const handleCountryChange = (c) => {
        navigate(`/recargas/${c.code}`);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleOperatorSelect = (key) => {
        setSelectedOperator(key);
        setFormData((prev) => ({ ...prev, productId: "" }));
    };

    // No country chosen (e.g. header link to /recargas): show a search
    if (!country) {
        return (
            <Navigate to="/recargas" replace />
        );
    }

    return (
        <div className="country-info">
            <div className="country-details">
                <CountrySearch
                    key={country.code}
                    initialValue={country.name}
                    onSelect={handleCountryChange}
                    placeholder="Cambiar país"
                />

                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="topoff-form"
                >
                    {/* Step 1: carrier */}
                    <div className="form-group">
                        <label>Compañía</label>
                        {loadingProducts && <p>Cargando compañías...</p>}
                        {productsError && (
                            <p className="form-error">{productsError}</p>
                        )}
                        {!loadingProducts &&
                            !productsError &&
                            operators.length === 0 && (
                                <p>No hay compañías disponibles para este país.</p>
                            )}
                        <div className="operator-list">
                            {operators.map((op) => (
                                <button
                                    type="button"
                                    key={op.key}
                                    className={`operator-btn ${
                                        selectedOperator === op.key ? "active" : ""
                                    }`}
                                    onClick={() => handleOperatorSelect(op.key)}
                                >
                                    {op.name}
                                    {op.promo && (
                                        <span className="promo-badge">🎁 Promo</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: plan (only after a carrier is chosen) */}
                    <div className="form-group">
                        <label htmlFor="productId">Plan de recarga</label>
                        <select
                            id="productId"
                            name="productId"
                            value={formData.productId}
                            onChange={handleChange}
                            required
                            disabled={!selectedOperator}
                        >
                            <option value="">
                                {selectedOperator
                                    ? "Selecciona un plan"
                                    : "Primero elige una compañía"}
                            </option>
                            {operatorProducts.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} — ${product.prices?.retail?.amount}{" "}
                                    {product.prices?.retail?.unit}
                                    {product.validity?.quantity
                                        ? ` (${product.validity.quantity} ${product.validity.unit.toLowerCase()})`
                                        : ""}
                                    {hasPromo(product) ? " 🎁" : ""}
                                </option>
                            ))}
                        </select>

                        {selectedProduct && (
                            <>
                                {selectedProduct.description && (
                                    <p className="plan-description">
                                        {selectedProduct.description}
                                    </p>
                                )}
                                {selectedProduct.destination && (
                                    <p className="plan-description">
                                        Recibe: {selectedProduct.destination.amount}{" "}
                                        {selectedProduct.destination.unit}
                                    </p>
                                )}
                                {hasPromo(selectedProduct) && (
                                    <p className="promo-note">
                                        🎁{" "}
                                        {selectedProduct.promotions[0].title ||
                                            selectedProduct.promotions[0].description ||
                                            "Este plan tiene una promoción"}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="phoneNumber">Número de teléfono</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            placeholder="Número local o +código del país"
                            required
                        />
                        {formData.phoneNumber && (
                            <small>
                                Se enviará a:{" "}
                                {toInternational(
                                    formData.phoneNumber,
                                    country.callingCode
                                )}
                            </small>
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

                    {/* Payment */}
                    {selectedProduct && (
                        <p className="plan-description">
                            Total: ${retail?.amount} {retail?.unit}
                        </p>
                    )}

                    {isFormValid ? (
                        <PaymentSection
                            key={formData.productId}
                            order={order}
                            amountCents={amountCents}
                            onPaid={() => {
                                setStatus("success");
                                setSelectedOperator(
                                    operators.length === 1 ? operators[0].key : ""
                                );
                                setFormData({
                                    phoneNumber: "",
                                    productId: "",
                                    senderName: "",
                                    senderEmail: "",
                                });
                            }}
                            onError={(msg) => {
                                console.error(msg);
                                setStatus("error");
                            }}
                        />
                    ) : (
                        <p className="plan-description">
                            Completa el formulario para pagar.
                        </p>
                    )}

                    {status === "success" && (
                        <p className="form-success">
                            ¡Pago recibido! Tu recarga se enviará en unos minutos.
                        </p>
                    )}
                    {status === "error" && (
                        <p className="form-error">
                            No se pudo completar el pago. Intenta de nuevo.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}