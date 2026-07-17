export type ServiceStatus = 'up' | 'down';

/**
 * Ksztalt odpowiedzi endpointu /health. Wykorzystywany przez healthcheck
 * kontenera Docker oraz (docelowo) load balancer w srodowisku chmurowym.
 */
export class HealthResponseDto {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}
