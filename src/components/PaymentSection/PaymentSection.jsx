import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    ExpressCheckoutElement,
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import "./PaymentSection.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CREATE_INTENT_URL =
    "https://us-central1-recargaya-27525.cloudfunctions.net/createPaymentIntent";

function CheckoutForm({ order, amountCents, onPaid, onError }) {
    const stripe = useStripe();
    const elements = useElements();
    const [paying, setPaying] = useState(false);

    // Keep the displayed amount in sync if the top-up changes
    useEffect(() => {
        if (elements) elements.update({ amount: amountCents });
    }, [elements, amountCents]);

    // Used by both the Google Pay button (receives an event)
    // and the "Pagar" button (called with no event)
    const pay = async (event) => {
        if (!stripe || !elements || paying) return;
        setPaying(true);

        // Report the error and close the Google Pay sheet if it's open
        const fail = (message) => {
            event?.paymentFailed?.({ reason: "fail" });
            onError(message);
        };

        try {
            const { error: submitError } = await elements.submit();
            if (submitError) return fail(submitError.message);

            const res = await fetch(CREATE_INTENT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            if (!res.ok) return fail("No se pudo iniciar el pago.");

            const { clientSecret } = await res.json();

            const { error } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: { return_url: window.location.href },
                redirect: "if_required",
            });
            if (error) return fail(error.message);

            onPaid();
        } catch (err) {
            console.error(err);
            fail("Error al procesar el pago.");
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="payment-section">
            {/* Google Pay (only shows if the browser supports it) */}
            <ExpressCheckoutElement
                onConfirm={pay}
                options={{
                    paymentMethods: {
                        googlePay: "auto",
                        applePay: "never",
                        link: "never",
                        amazonPay: "never",
                        paypal: "never",
                    },
                }}
            />

            <p className="payment-divider">o paga con tarjeta</p>

            {/* Card form */}
            <PaymentElement
                options={{ wallets: { googlePay: "never", applePay: "never" } }}
            />

            <button
                type="button"
                className="pay-btn"
                onClick={() => pay()}
                disabled={!stripe || paying}
            >
                {paying
                    ? "Procesando..."
                    : `Pagar $${(amountCents / 100).toFixed(2)}`}
            </button>
        </div>
    );
}

export default function PaymentSection({ order, amountCents, onPaid, onError }) {
    return (
        <Elements
            stripe={stripePromise}
            options={{
                mode: "payment",
                amount: amountCents,
                currency: "usd",
                locale: "es",
            }}
        >
            <CheckoutForm
                order={order}
                amountCents={amountCents}
                onPaid={onPaid}
                onError={onError}
            />
        </Elements>
    );
}