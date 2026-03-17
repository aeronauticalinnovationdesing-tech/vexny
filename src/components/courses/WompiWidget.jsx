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
  const initAttempted = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !signature || initAttempted.current) return;
    
    initAttempted.current = true;

    const initWidget = () => {
      if (!window.WidgetCheckout) {
        // Reintentar en 100ms si aún no está listo
        setTimeout(initWidget, 100);
        return;
      }

      try {
        console.log('Initializing Wompi Widget with:', {
          publicKey,
          reference,
          amountInCents,
          signature,
          customerEmail
        });

        new window.WidgetCheckout({
          currency: 'COP',
          amountInCents: String(amountInCents),
          reference: String(reference),
          publicKey: String(publicKey),
          customerEmail: String(customerEmail),
          redirectUrl: String(redirectUrl),
          signature: String(signature)
        });
      } catch (error) {
        console.error('Widget initialization error:', error);
      }
    };

    // Crear el script de Wompi
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.onload = initWidget;
    script.onerror = () => {
      console.error('Failed to load Wompi widget script');
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