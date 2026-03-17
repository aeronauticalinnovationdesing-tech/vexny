import { useProfile, PROFILES } from '@/lib/ProfileContext';
import { Sword } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfileSelect() {
  const { selectProfile } = useProfile();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Sword className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">VEXNY</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          ¿Quién eres hoy? Selecciona tu perfil para personalizar tu espacio de trabajo.
        </p>
      </motion.div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {PROFILES.map((profile, i) => {
          const Icon = profile.icon;
          return (
            <motion.button
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => selectProfile(profile.id)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left hover:border-primary/50 hover:shadow-xl transition-all duration-300"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${profile.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <div className="relative flex flex-col gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {profile.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {profile.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {profile.nav.slice(0, 4).map(n => (
                    <span key={n.path + n.label} className="px-2 py-0.5 rounded-full bg-muted">
                      {n.label}
                    </span>
                  ))}
                  {profile.nav.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full bg-muted">+{profile.nav.length - 4}</span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-xs text-muted-foreground"
      >
        Puedes cambiar de perfil en cualquier momento desde el menú lateral
      </motion.p>
    </div>
  );
}