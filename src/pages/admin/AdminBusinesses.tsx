import { useState } from 'react';
import { Empty, ErrorNote, FoodPlate, Loader, PageTitle, useAsync } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { BUSINESS_STATUS_LABEL, categoryInfo, dateTime, errorMessage, hhmm } from '../../lib/format';
import type { BusinessStatus } from '../../lib/types';

const TABS: BusinessStatus[] = ['pending', 'approved', 'suspended'];

export default function AdminBusinesses() {
  const { data, error, loading, reload } = useAsync(() => api.adminListBusinesses());
  const [tab, setTab] = useState<BusinessStatus>('pending');
  const toast = useToast();

  async function setStatus(id: string, status: BusinessStatus) {
    try {
      await api.adminSetBusinessStatus(id, status);
      toast(`Negocio ${BUSINESS_STATUS_LABEL[status].toLowerCase()}`, 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const list = (data ?? []).filter((b) => b.status === tab);

  return (
    <>
      <PageTitle>Negocios</PageTitle>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {BUSINESS_STATUS_LABEL[t]}{' '}
            <span className="tabs__count">{(data ?? []).filter((b) => b.status === t).length}</span>
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty emoji="🏪" title="No hay negocios en esta lista" />}
      <div className="stack">
        {list.map((b) => (
          <article key={b.id} className="manage-card">
            <FoodPlate category={b.category} size="sm" />
            <div className="manage-card__info">
              <span className="store-card__cat">{categoryInfo(b.category).label}</span>
              <h3>{b.name}</h3>
              <p className="small">{b.address}</p>
              <p className="small">
                Tel. {b.phone} · Recolección {hhmm(b.pickup_start)}–{hhmm(b.pickup_end)}
              </p>
              <p className="small muted">Alta: {dateTime(b.created_at)}</p>
              <div className="manage-card__actions">
                {b.status !== 'approved' && (
                  <button className="pill-btn pill-btn--sm" onClick={() => setStatus(b.id, 'approved')}>
                    {b.status === 'pending' ? 'Aprobar' : 'Reactivar'}
                  </button>
                )}
                {b.status !== 'suspended' && (
                  <button className="link-btn" onClick={() => setStatus(b.id, 'suspended')}>
                    {b.status === 'pending' ? 'Rechazar' : 'Suspender'}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
