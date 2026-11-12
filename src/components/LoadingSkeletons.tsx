import React from 'react';

/**
 * Bloques de carga con el patrón `.skeleton` definido en `src/index.css`.
 * Alturas elásticas para que cada vista pueda describir su propia forma.
 */
export const SkeletonBlock: React.FC<{ width?: string; height?: string; radius?: string }> = ({
  width = '100%',
  height = '1rem',
  radius,
}) => (
  <div
    className="skeleton"
    aria-hidden="true"
    style={{ width, height, borderRadius: radius || 'var(--radius-xs)' }}
  />
);

/**
 * Filas de tabla en carga. `aria-hidden` para no anunciar esqueleto vacío;
 * el contenedor announces `role="status"` con el texto de carga.
 */
export const SkeletonRows: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => (
  <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
    <span className="sr-only">Cargando datos...</span>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '0.75rem', alignItems: 'center' }}>
        {Array.from({ length: columns }).map((__, c) => (
          <SkeletonBlock key={c} height={c === 0 ? '1.25rem' : '0.85rem'} width={c === 0 ? '70%' : '100%'} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Tarjetas KPI en carga.
 */
export const SkeletonKpiGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div role="status" aria-live="polite" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
    <span className="sr-only">Cargando indicadores...</span>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <SkeletonBlock width="45%" height="0.7rem" />
        <SkeletonBlock width="35%" height="2rem" />
        <SkeletonBlock width="65%" height="0.65rem" />
      </div>
    ))}
  </div>
);
