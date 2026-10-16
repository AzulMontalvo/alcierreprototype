import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorNote, Loader, PageTitle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { BUSINESS_STATUS_LABEL, CATEGORIES, errorMessage } from '../../lib/format';
import type { Business, BusinessInput } from '../../lib/types';

const EMPTY: BusinessInput = {
  name: '',
  category: 'restaurante',
  address: '',
  phone: '',
  pickup_start: '19:00',
  pickup_end: '21:00',
  description: '',
};

export default function BusinessProfileForm() {
  const nav = useNavigate();
  const toast = useToast();
  const [existing, setExisting] = useState<Business | null>(null);
  const [form, setForm] = useState<BusinessInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyBusiness()
      .then((b) => {
        if (b) {
          setExisting(b);
          const { name, category, address, phone, pickup_start, pickup_end, description } = b;
          setForm({ name, category, address, phone, pickup_start, pickup_end, description });
        }
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof BusinessInput>(k: K, v: BusinessInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.pickup_end <= form.pickup_start) {
      setError('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveMyBusiness({ ...form, name: form.name.trim(), address: form.address.trim() });
      toast(existing ? 'Datos actualizados' : 'Negocio registrado. Lo revisaremos pronto.', 'success');
      nav('/negocio');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <>
      <PageTitle back>{existing ? 'Datos del negocio' : 'Registra tu negocio'}</PageTitle>
      {existing && <p className="small">Estado: {BUSINESS_STATUS_LABEL[existing.status]}</p>}
      <form className="form panel" onSubmit={submit}>
        <label className="field">
          <span>Nombre del establecimiento</span>
          <input required minLength={2} maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          <span>Tipo de comercio</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value as BusinessInput['category'])}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Dirección exacta</span>
          <input
            required
            minLength={5}
            placeholder="Calle, número, colonia, referencias"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Recolección desde</span>
            <input type="time" required value={form.pickup_start} onChange={(e) => set('pickup_start', e.target.value)} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="time" required value={form.pickup_end} onChange={(e) => set('pickup_end', e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Teléfono de contacto</span>
          <input
            type="tel"
            required
            minLength={7}
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción breve (opcional)</span>
          <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <ErrorNote error={error} />
        <button className="cta" disabled={busy}>
          {busy ? 'Guardando…' : existing ? 'Guardar cambios' : 'Enviar a revisión'}
        </button>
      </form>
    </>
  );
}
