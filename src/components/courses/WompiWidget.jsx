import { useEffect, useRef } from 'react';

export default function WompiWidget({
  publicKey,
  reference,
  amountInCents,
  signature,
  customerEmail,
  redirectUrl
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !signature) return;

    // Cargar script de Wompi
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;

    // Cuando el script esté listo, inicializar el widget
    script.onload = () => {
      if (window.WidgetCheckout) {
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
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current && containerRef.current.contains(script)) {
        containerRef.current.removeChild(script);
      }
    };
  }, [publicKey, reference, amountInCents, signature, customerEmail, redirectUrl]);

  return <div ref={containerRef} />;
}