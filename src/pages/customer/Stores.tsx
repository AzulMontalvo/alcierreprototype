import { Link } from 'react-router-dom';
import { IconClock, IconPin } from '../../components/Icons';
import { Empty, ErrorNote, FoodPlate, Loader, PageTitle, useAsync } from '../../components/ui';
import { api } from '../../lib/api';
import { categoryInfo, hhmm, pickupOpen } from '../../lib/format';

export default function Stores() {
  const { data, error, loading } = useAsync(() => api.listBusinesses());

  return (
    <>
      <PageTitle>Comercios</PageTitle>
      <ErrorNote error={error} />
      {loading && <Loader />}
      {data?.length === 0 && <Empty title="Aún no hay comercios participantes" />}
      <div className="stack">
        {data?.map((b) => (
          <Link key={b.id} to={`/comercios/${b.id}`} className="store-card">
            <FoodPlate category={b.category} size="sm" />
            <div className="store-card__info">
              <span className="store-card__cat">{categoryInfo(b.category).label}</span>
              <h3>{b.name}</h3>
              <p className="muted small">
                <IconPin width={13} height={13} /> {b.address}
              </p>
              <p className="small">
                <IconClock width={13} height={13} /> Recolección {hhmm(b.pickup_start)}–{hhmm(b.pickup_end)}{' '}
                {pickupOpen(b.pickup_end) ? (
                  <span className="dot dot--on">abierto</span>
                ) : (
                  <span className="dot">cerrado hoy</span>
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
