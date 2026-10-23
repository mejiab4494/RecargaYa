import { useState } from "react";
import { useParams } from "react-router-dom";
import PaymentSection from "../PaymentSection/PaymentSection.jsx";
import "./GiftCardInfo.css";

const AMOUNTS = [10, 25, 50, 100];

export default function GiftCardInfo() {
    const { code } = useParams();
    const [amount, setAmount] = useState(25);
    const [form, setForm] = useState({
        recipientName: "",
        recipientContact: "",
        senderName: "",
        message: "",
    });
    const [status, setStatus] = useState(null); // null | "paid" | error string

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    // Only show payment once the required fields are filled in
    const formReady =
        form.recipientName.trim() &&
        form.recipientContact.trim() &&
        form.senderName.trim();

    const order = {
        type: "giftCard",   // tells the backend this isn't a top-up
        country: code,
        amount,             // dollars; the server should re-validate this
        ...form,
    };

    if (status === "paid") {
        return (
            <div className="gift-card-info">
                <h2>¡Tarjeta enviada!</h2>
                <p>Se enviará a {form.recipientName}.</p>
            </div>
        );
    }

    return (
        <div className="gift-card-info">
            <h2>Enviar Tarjeta de Regalo a {code}</h2>

            <div className="amount-options">
                {AMOUNTS.map((a) => (
                    <button
                        key={a}
                        type="button"
                        className={a === amount ? "selected" : ""}
                        onClick={() => setAmount(a)}
                    >
                        ${a}
                    </button>
                ))}
            </div>

            <div className="gift-form">
                <input name="recipientName" placeholder="Nombre del destinatario"
                    value={form.recipientName} onChange={handleChange} required />
                <input name="recipientContact" placeholder="Correo o teléfono del destinatario"
                    value={form.recipientContact} onChange={handleChange} required />
                <input name="senderName" placeholder="Tu nombre"
                    value={form.senderName} onChange={handleChange} required />
                <textarea name="message" placeholder="Mensaje personal (opcional)"
                    value={form.message} onChange={handleChange} />
            </div>

            {formReady ? (
                <PaymentSection
                    order={order}
                    amountCents={amount * 100}
                    onPaid={() => setStatus("paid")}
                    onError={(msg) => setStatus(msg)}
                />
            ) : (
                <p>Completa los datos para continuar al pago.</p>
            )}

            {status && status !== "paid" && <p className="error">{status}</p>}
        </div>
    );
}