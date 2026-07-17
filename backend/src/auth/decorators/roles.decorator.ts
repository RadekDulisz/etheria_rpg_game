import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Oznacza endpoint jako dostepny tylko dla wskazanych rol (patrz Role
 * na modelu User: PLAYER/ADMIN). Wymaga uzycia razem z RolesGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
