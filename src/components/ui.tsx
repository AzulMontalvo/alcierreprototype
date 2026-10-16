import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryInfo, ORDER_STATUS_LABEL } from '../lib/format';
import type { Category, OrderStatus } from '../lib/types';
import { IconBack } from './Icons';

/** Ilustración de categoría sobre "tabla de madera" (eco del estilo 3D de la referencia). */
export function FoodPlate({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`plate plate--${size}`} aria-label={categoryInfo(category).label} role="img">
      <span className="plate__board" />
      <span className="plate__bowl">{categoryInfo(category).emoji}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge--${status}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function Loader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <span className="loader__dot" />
      <span className="loader__dot" />
      <span className="loader__dot" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Empty({ emoji = '🍃', title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__emoji">{emoji}</div>
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

export function PageTitle({ children, back, action }: { children: ReactNode; back?: boolean; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="page-title">
      {back && (
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Volver">
          <IconBack />
        </button>
      )}
      <h1>{children}</h1>
      {action && <div className="page-title__action">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="error-note" role="alert">
      {error}
    </p>
  );
}

/** Carga asíncrona con estados loading/error y recarga manual. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
