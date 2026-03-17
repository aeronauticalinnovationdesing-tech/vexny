import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function WompiCheckout({ open, onClose, course, userEmail, onPurchaseCreated }) {
  useEffect(() => {
    if (open && course) {
      handleCheckout();
    }
  }, [open, course]);

  const handleCheckout = async () => {
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

      // Redirigir a Wompi
      const params = new URLSearchParams({
        "public-key": publicKey,
        currency: "COP",
        "amount-in-cents": String(amountInCents),
        reference,
        "signature:integrity": signature,
        "redirect-url": redirectUrl,
      });

      window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`;
    } catch (error) {
      console.error('Error preparing checkout:', error);
      alert('Error al preparar el pago. Intenta nuevamente.');
      onClose();
    }
  };

  return null;
}