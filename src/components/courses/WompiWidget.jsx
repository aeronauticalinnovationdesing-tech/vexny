import { useEffect } from 'react';

export default function WompiWidget({
  publicKey,
  reference,
  amountInCents,
  signature,
  customerEmail,
  redirectUrl
}) {
  useEffect(() => {
    // Esperar a que el script de Wompi esté cargado
    const checkInterval = setInterval(() => {
      if (window.WidgetCheckout) {
        clearInterval(checkInterval);
        new window.WidgetCheckout({
          currency: 'COP',
          amountInCents,
          reference,
          publicKey,
          customerEmail,
          redirectUrl,
          signature
        });
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [publicKey, reference, amountInCents, signature, customerEmail, redirectUrl]);

  return (
    <div>
      <script
        src="https://checkout.wompi.co/widget.js"
        data-public-key={publicKey}
        data-currency="COP"
        data-amount-in-cents={amountInCents}
        data-reference={reference}
        data-customer-email={customerEmail}
        data-redirect-url={redirectUrl}
        data-signature:integrity={signature}
        async
      ></script>
    </div>
  );
}