import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  TrendingUp, Plane, Rocket, Zap,
  LayoutDashboard, FolderKanban, CheckSquare, StickyNote,
  Wallet, Calendar, Bot, FileText, BookOpen,
  BarChart2, BookMarked, Wind, Map, Target, Users, DollarSign, Lightbulb, Activity, CreditCard
} from 'lucide-react';

export const PROFILES = [
  {
    id: 'trader',
    label: 'Trader',
    description: 'Registra trades, analiza rendimiento y gestiona tu portafolio',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-700',
    accent: '#10b981',
    nav: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/Dashboard' },
      { icon: BarChart2, label: 'Trades', path: '/Tasks' },
      { icon: Wallet, label: 'Contabilidad', path: '/Accounting' },
      { icon: FileText, label: 'Informes', path: '/Reports' },
      { icon: StickyNote, label: 'Notas', path: '/Notes' },
      { icon: Calendar, label: 'Calendario', path: '/Calendar' },
      { icon: Bot, label: 'Secretaria IA', path: '/Secretary' },
      { icon: BookOpen, label: 'Cursos', path: '/Courses' },
      { icon: CreditCard, label: 'Suscripciones', path: '/Subscription' },
    ]
  },
  {
    id: 'drone_pilot',
    label: 'Piloto de Dron',
    description: 'Gestiona tu bitácora de vuelo, misiones y mantenimiento',
    icon: Plane,
    color: 'from-sky-500 to-blue-700',
    accent: '#0ea5e9',
    nav: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/Dashboard' },
      { icon: Wind, label: 'Bitácora de Vuelo', path: '/Tasks' },
      { icon: Map, label: 'Proyectos/Misiones', path: '/Projects' },
      { icon: Calendar, label: 'Calendario', path: '/Calendar' },
      { icon: StickyNote, label: 'Notas', path: '/Notes' },
      { icon: FileText, label: 'Informes', path: '/Reports' },
      { icon: Bot, label: 'Secretaria IA', path: '/Secretary' },
      { icon: BookOpen, label: 'Cursos', path: '/Courses' },
      { icon: CreditCard, label: 'Suscripciones', path: '/Subscription' },
    ]
  },
  {
    id: 'startup',
    label: 'Startup',
    description: 'Gestiona proyectos, equipo, finanzas y el crecimiento de tu empresa',
    icon: Rocket,
    color: 'from-violet-500 to-purple-700',
    accent: '#8b5cf6',
    nav: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/Dashboard' },
      { icon: FolderKanban, label: 'Proyectos', path: '/Projects' },
      { icon: CheckSquare, label: 'Tareas', path: '/Tasks' },
      { icon: Users, label: 'Contabilidad', path: '/Accounting' },
      { icon: DollarSign, label: 'Finanzas', path: '/Accounting' },
      { icon: Calendar, label: 'Calendario', path: '/Calendar' },
      { icon: Bot, label: 'Secretaria IA', path: '/Secretary' },
      { icon: FileText, label: 'Informes', path: '/Reports' },
      { icon: BookOpen, label: 'Cursos', path: '/Courses' },
      { icon: CreditCard, label: 'Suscripciones', path: '/Subscription' },
    ]
  },
  {
    id: 'elite_human',
    label: 'Humano de Elite',
    description: 'Optimiza tu vida, hábitos, metas y desarrollo personal',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    accent: '#f59e0b',
    nav: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/Dashboard' },
      { icon: Target, label: 'Metas y Tareas', path: '/Tasks' },
      { icon: Activity, label: 'Proyectos Vitales', path: '/Projects' },
      { icon: StickyNote, label: 'Diario / Notas', path: '/Notes' },
      { icon: Wallet, label: 'Finanzas', path: '/Accounting' },
      { icon: Calendar, label: 'Calendario', path: '/Calendar' },
      { icon: Lightbulb, label: 'Aprendizaje', path: '/Courses' },
      { icon: Bot, label: 'Secretaria IA', path: '/Secretary' },
      { icon: FileText, label: 'Informes', path: '/Reports' },
    ]
  },
];

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.active_profile) {
        setActiveProfileId(user.active_profile);
      }
    } catch (_) {}
    setLoading(false);
  };

  const selectProfile = async (profileId) => {
    setActiveProfileId(profileId);
    try {
      await base44.auth.updateMe({ active_profile: profileId });
    } catch (_) {}
  };

  const activeProfile = PROFILES.find(p => p.id === activeProfileId) || null;

  return (
    <ProfileContext.Provider value={{ activeProfile, activeProfileId, selectProfile, loading, profiles: PROFILES }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);