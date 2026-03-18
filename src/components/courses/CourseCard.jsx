import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, ShoppingCart, Eye, Edit2 } from "lucide-react";

const profileLabels = {
  trader: "Trader",
  drone_pilot: "Drones",
  startup: "Startup",
  elite_human: "Elite Human",
};

const categoryLabels = {
  productividad: "Productividad",
  finanzas: "Finanzas",
  tecnologia: "Tecnología",
  marketing: "Marketing",
  desarrollo_personal: "Desarrollo Personal",
  otro: "Otro"
};

export default function CourseCard({ course, purchased, onBuy, onView, onEdit, showProfiles }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-12 h-12 text-primary/40" />
        )}
        <Badge className="absolute top-3 left-3 bg-primary/90 text-white text-xs">
          {categoryLabels[course.category] || "Otro"}
        </Badge>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-base line-clamp-2">{course.title}</h3>
        {course.description && (
          <p className="text-muted-foreground text-xs line-clamp-2">{course.description}</p>
        )}
        {course.duration_hours && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {course.duration_hours}h de contenido
          </div>
        )}
        {showProfiles && (
          <div className="flex flex-wrap gap-1">
            {course.target_profiles?.length > 0
              ? course.target_profiles.map(p => (
                  <Badge key={p} variant="outline" className="text-xs px-1.5 py-0">{profileLabels[p] || p}</Badge>
                ))
              : <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">Todos los perfiles</Badge>
            }
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            ${(course.price || 0).toLocaleString()} COP
          </span>
          {purchased ? (
            <Button size="sm" variant="outline" onClick={() => onView(course)} className="gap-1">
              <Eye className="w-3 h-3" /> Ver curso
            </Button>
          ) : (
            <Button size="sm" onClick={() => onBuy(course)} className="gap-1">
              <ShoppingCart className="w-3 h-3" /> Comprar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}