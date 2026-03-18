import { useCurrentUser } from './useCurrentUser';
import { useProfile } from '@/lib/ProfileContext';

/**
 * Hook para filtrar datos por perfil/usuario actual
 * - Profiles individuales: filtran por created_by (usuario actual)
 * - Profiles de empresa: filtran por company_id
 */
export function useProfileData() {
  const user = useCurrentUser();
  const { activeProfileId } = useProfile() || {};

  const getDataFilter = () => {
    // Para perfiles individuales (trader, drone_pilot, startup, elite_human)
    // Filtrar por usuario actual
    if (['trader', 'drone_pilot', 'startup', 'elite_human'].includes(activeProfileId)) {
      return { created_by: user?.email };
    }

    // Para perfiles de empresa (si existen)
    // Se manejaría diferente con company_id
    return { created_by: user?.email };
  };

  return {
    user,
    activeProfileId,
    dataFilter: getDataFilter(),
    isEnterpriseProfile: false, // expandible para futuros perfiles de empresa
  };
}