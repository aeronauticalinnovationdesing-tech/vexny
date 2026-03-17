import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, CreditCard } from "lucide-react";

export default function WompiCheckout({ open, onClose, course, userEmail, onPurchaseCreated }) {
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    if (open && course) {
      prepareCheckout();
    }
  }, [open, course]);

  useEffect(() => {
    if (checkoutData && open) {
      // Cargar script de Wompi cuando tengamos los datos
      const script = document.createElement('script');
      script.src = 'https://checkout.wompi.co/widget.js';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [checkoutData, open]);

  const prepareCheckout = async () => {
      setLoading(true);
      const reference = `VEXNY-${course.id}-${Date.now()}`;
      const amountInCents = Math.round((course.price || 0) * 100);

      const redirectUrl = `${window.location.origin}/Courses?wompi_ref=${reference}`;

      try {
        // Generar firma
        const sigRes = await base44.functions.invoke('wompiSignature', {
          reference,
          amountInCents,
          currency: 'COP'
        });

        const { signature, publicKey } = sigRes.data;

        // Registrar la compra como pendiente
        await base44.entities.CoursePurchase.create({
          course_id: course.id,
          course_title: course.title,
          user_email: userEmail,
          amount: course.price,
          wompi_reference: reference,
          status: 'pending'
        });

        onPurchaseCreated();

        setCheckoutData({ 
          reference, 
          amountInCents, 
          signature,
          publicKey,
          redirectUrl,
          customerEmail: userEmail
        });
      } catch (error) {
        console.error('Error preparing checkout:', error);
        alert('Error al preparar el pago. Intenta nuevamente.');
      }
      setLoading(false);
    };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar compra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="font-semibold">{course?.title}</p>
            <p className="text-2xl font-bold text-primary">${(course?.price || 0).toLocaleString()} COP</p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Serás redirigido al checkout seguro de Wompi para completar el pago.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : checkoutData ? (
            <WompiWidget
              publicKey={checkoutData.publicKey}
              reference={checkoutData.reference}
              amountInCents={checkoutData.amountInCents}
              signature={checkoutData.signature}
              customerEmail={checkoutData.customerEmail}
              redirectUrl={checkoutData.redirectUrl}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}