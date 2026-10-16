import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorNote, FoodPlate, Loader, PageTitle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { CATEGORIES, discountPct, errorMessage, money } from '../../lib/format';
import type { Category } from '../../lib/types';

interface FormState {
  title: string;
  description: string;
  category: Category;
  original_price: string;
  price: string;
  stock: string;
}

export default function OfferForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: 'restaurante',
    original_price: '',
    price: '',
    stock: '5',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const biz = await api.getMyBusiness();
        if (!biz) {
          nav('/negocio/perfil', { replace: true });
          return;
        }
        if (id) {
          const o = (await api.listMyOffers()).find((x) => x.id === id);
          if (!o) throw new Error('Oferta no encontrada');
          setForm({
            title: o.title,
            description: o.description,
            category: o.category,
            original_price: String(o.original_price),
            price: String(o.price),
            stock: String(o.stock),
          });
        } else {
          setForm((f) => ({ ...f, category: biz.category }));
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, nav]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const orig = Number(form.original_price);
  const price = Number(form.price);
  const validPrices = orig > 0 && price > 0 && price < orig;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validPrices) {
      setError('El precio de rescate debe ser mayor a 0 y menor al precio original');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveOffer({
        id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        original_price: orig,
        price,
        stock: Math.max(0, Math.floor(Number(form.stock))),
      });
      toast(id ? 'Oferta actualizada' : 'Oferta publicada 🎉', 'success');
      nav('/negocio/ofertas');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <>
      <PageTitle back>{id ? 'Editar oferta' : 'Publicar oferta'}</PageTitle>
      <form className="form panel" onSubmit={submit}>
        <div className="offer-preview">
          <FoodPlate category={form.category} size="md" />
          <div>
            <strong>{form.title || 'Tu paquete sorpresa'}</strong>
            {validPrices && (
              <p className="small">
                {money(price)} <s>{money(orig)}</s> · <span className="success">-{discountPct(orig, price)}%</span>
              </p>
            )}
          </div>
        </div>
        <label className="field">
          <span>Nombre del producto / paquete</span>
          <input
            required
            minLength={2}
            maxLength={80}
            placeholder="Ej. Bolsa sorpresa de pan"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea
            rows={3}
            placeholder="¿Qué puede incluir? Alérgenos, cantidad aproximada…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Categoría (foto ilustrativa)</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            <span>Precio original</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.5"
              required
              value={form.original_price}
              onChange={(e) => set('original_price', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Precio de rescate</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.5"
              required
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Cantidad disponible (paquetes)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            required
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
          />
        </label>
        <ErrorNote error={error} />
        <button className="cta" disabled={busy}>
          {busy ? 'Guardando…' : id ? 'Guardar cambios' : 'Publicar oferta'}
        </button>
      </form>
    </>
  );
}
