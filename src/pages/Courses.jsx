import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Search, Loader2, CheckCircle2 } from "lucide-react";
import CourseCard from "@/components/courses/CourseCard";
import CourseUploadForm from "@/components/courses/CourseUploadForm";
import WompiCheckout from "@/components/courses/WompiCheckout";

export default function Courses() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { activeProfileId } = useProfile();
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Verificar si viene de una redirección de Wompi
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('id');
    const wompiRef = params.get('wompi_ref');
    if ((transactionId || wompiRef) && user) {
      verifyPayment(transactionId, wompiRef);
    }
  }, [user]);

  const verifyPayment = async (transactionId, reference) => {
    if (!transactionId && !reference) return;
    setVerifying(true);
    const res = await base44.functions.invoke('verifyWompiTransaction', {
      transactionId: transactionId || '',
      reference: reference || ''
    });
    setPaymentResult(res.data?.status);
    queryClient.invalidateQueries(['purchases']);
    // Limpiar URL
    window.history.replaceState({}, '', '/Courses');
    setVerifying(false);
  };

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["courses", activeProfileId],
    queryFn: () => base44.entities.Course.filter({ is_published: true }),
    select: (data) => data.filter(c =>
      !c.target_profiles?.length || c.target_profiles.includes(activeProfileId)
    ),
    enabled: !!activeProfileId,
  });

  const { data: allCoursesAdmin = [] } = useQuery({
    queryKey: ["courses-admin", user?.email],
    queryFn: () => base44.entities.Course.filter({ created_by: user.email }),
    enabled: !!user,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.email],
    queryFn: () => base44.entities.CoursePurchase.filter({ user_email: user.email, status: "approved" }),
    enabled: !!user,
  });

  const isAdmin = user?.role === "admin";
  const displayCourses = isAdmin ? allCoursesAdmin : courses;

  const filteredCourses = displayCourses.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const purchasedIds = new Set(purchases.map(p => p.course_id));

  const handleView = (course) => setViewingPdf(course);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
            <p className="text-muted-foreground text-sm">
              {isAdmin ? "Gestiona y publica tus cursos" : "Aprende con nuestros cursos"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Subir curso
          </Button>
        )}
      </div>

      {/* Payment result banner */}
      {verifying && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Verificando tu pago...</p>
        </div>
      )}
      {paymentResult === "approved" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">¡Pago aprobado! Ya tienes acceso al curso.</p>
        </div>
      )}
      {paymentResult === "declined" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800">El pago fue rechazado. Por favor intenta de nuevo.</p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5 text-sm">
          {filteredCourses.length} cursos disponibles
        </Badge>
        {!isAdmin && (
          <Badge className="px-3 py-1.5 text-sm bg-green-100 text-green-800 border-green-200">
            {purchases.length} comprados
          </Badge>
        )}
      </div>

      {/* Courses Grid */}
      {loadingCourses ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay cursos disponibles</p>
          {isAdmin && <p className="text-sm mt-1">Sube tu primer curso usando el botón de arriba</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              purchased={purchasedIds.has(course.id) || isAdmin}
              onBuy={c => setSelectedCourse(c)}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-card border-b">
            <h2 className="font-semibold">{viewingPdf.title}</h2>
            <Button variant="outline" size="sm" onClick={() => setViewingPdf(null)}>Cerrar</Button>
          </div>
          <iframe
            src={viewingPdf.pdf_url}
            className="flex-1 w-full"
            title={viewingPdf.title}
          />
        </div>
      )}

      {/* Modals */}
      <CourseUploadForm
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSaved={() => queryClient.invalidateQueries(['courses', 'courses-admin'])}
      />

      {selectedCourse && (
        <WompiCheckout
          open={!!selectedCourse}
          onClose={() => {
            setSelectedCourse(null);
            setPaymentResult(null);
          }}
          course={selectedCourse}
          userEmail={user?.email}
          onPurchaseCreated={() => queryClient.invalidateQueries(['purchases'])}
        />
      )}
    </div>
  );
}