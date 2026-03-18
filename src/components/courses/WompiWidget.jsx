import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function WompiWidget({ 
  reference, 
  amountInCents, 
  customerEmail,
  publicKey,
  signature,
  profile,
  onSuccess
}) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Cargar el script de Wompi solo una vez
    if (window.WidgetCheckout) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Wompi widget script');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Inicializar widget cuando tenemos todos los datos y el script está cargado
  useEffect(() => {
    if (scriptLoaded && reference && amountInCents && customerEmail && publicKey && signature) {
      initializeWidget();
    }
  }, [scriptLoaded, reference, amountInCents, customerEmail, publicKey, signature]);

  const initializeWidget = () => {
    if (!window.WidgetCheckout) {
      console.warn('WidgetCheckout not available yet');
      return;
    }

    // Si es suscripción, redirige a Dashboard; si es curso, a Courses
    const isSub = reference?.startsWith('VEXNY-SUB-');
    const redirectUrl = isSub 
      ? `${window.location.origin}/Dashboard`
      : `${window.location.origin}/Courses`;

    try {
      console.log('Initializing Wompi widget with:', { reference, amountInCents, publicKey });
      const checkout = new window.WidgetCheckout({
        currency: 'COP',
        amountInCents: String(amountInCents),
        reference: String(reference),
        publicKey: String(publicKey),
        customerEmail: String(customerEmail),
        redirectUrl: String(redirectUrl),
        signature: String(signature)
      });

      // Listener para cuando se completa el pago
      checkout.onError = (error) => {
        console.error('Payment error:', error);
      };

      checkout.onSuccess = async (transaction) => {
        console.log('Payment successful:', transaction);
        
        if (isSub) {
          try {
            // Llamar callback para sincronizar backend
            const callbackRes = await base44.functions.invoke('wompiCallback', {
              reference: transaction.reference || reference,
              transactionId: transaction.id
            });
            console.log('Callback response:', callbackRes.data);
          } catch (err) {
            console.error('Callback error:', err);
          }

          // Esperar más tiempo para que el webhook se procese
          await new Promise(r => setTimeout(r, 2000));

          // Invalidar todas las queries de suscripción y usuario
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          
          console.log('Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        } else if (onSuccess) {
          onSuccess(true);
        }
      };

      checkout.render('#wompi-checkout');
      console.log('Widget rendered successfully');
    } catch (error) {
      console.error('Widget initialization error:', error);
    }
  };

  if (!scriptLoaded) {
    return <div className="text-center py-4 text-muted-foreground">Cargando widget de pago...</div>;
  }

  return <div id="wompi-checkout" />;
}