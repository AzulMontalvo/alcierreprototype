import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { resetDemo } from '../lib/api/demoApi';
import {
  IconBag, IconBell, IconChart, IconGrid, IconHome, IconQr, IconStore, IconTag, IconTicket, IconUser, IconUsers,
} from './Icons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

function BottomNav({ left, home, right }: { left: NavItem[]; home: string; right: NavItem[] }) {
  const item = (n: NavItem) => (
    <NavLink key={n.to} to={n.to} className="nav__item" aria-label={n.label}>
      {n.icon}
      <span className="nav__label">{n.label}</span>
      {!!n.badge && <span className="nav__badge">{n.badge}</span>}
    </NavLink>
  );
  return (
    <nav className="nav" aria-label="Navegación principal">
      {left.map(item)}
      <NavLink to={home} end className="nav__home" aria-label="Inicio">
        <IconHome width={34} height={34} />
      </NavLink>
      {right.map(item)}
    </nav>
  );
}

/** Alerta web cuando entra un pedido pagado al comercio (además del correo). */
function useIncomingOrderAlerts(enabled: boolean) {
  const toast = useToast();
  useEffect(() => {
    if (!enabled) return;
    let unsub = () => {};
    let cancelled = false;
    api
      .getMyBusiness()
      .then((b) => {
        if (!b || cancelled) return;
        unsub = api.subscribeIncomingOrders(b.id, () => {
          toast('📦 ¡Nuevo pedido! Revisa tus pedidos del día.', 'success');
          window.dispatchEvent(new Event('alcierre:orders-changed'));
          if ('Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker?.ready
              .then((reg) => reg.showNotification('Nuevo pedido en Al Cierre', { body: 'Un cliente reservó un paquete.', icon: '/icon.svg' }))
              .catch(() => new Notification('Nuevo pedido en Al Cierre'));
          }
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsub();
    };
  }, [enabled, toast]);
}

export default function Layout() {
  const { profile } = useAuth();
  const { count } = useCart();
  const role = profile?.role ?? 'customer';
  useIncomingOrderAlerts(role === 'business');

  const bellTo = role === 'business' ? '/negocio/pedidos' : role === 'admin' ? '/admin/negocios' : '/pedidos';

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Al Cierre, inicio">
          <span className="brand__mark">◐</span>
          <span className="brand__text">
            <small>rescata comida</small>
            Al Cierre
          </span>
        </Link>
        <div className="topbar__right">
          {api.mode === 'demo' && (
            <button className="demo-pill" onClick={() => confirm('¿Restablecer los datos de demostración?') && resetDemo()}>
              demo ↺
            </button>
          )}
          <span className="topbar__name">{profile ? profile.full_name.split(' ')[0] || 'Hola' : 'Invitado'}</span>
          <Link to={bellTo} className="topbar__bell" aria-label="Notificaciones">
            <IconBell />
          </Link>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      {role === 'business' ? (
        <BottomNav
          left={[
            { to: '/negocio/ofertas', label: 'Ofertas', icon: <IconTag /> },
            { to: '/negocio/pedidos', label: 'Pedidos', icon: <IconTicket /> },
          ]}
          home="/negocio"
          right={[
            { to: '/negocio/verificar', label: 'Verificar', icon: <IconQr /> },
            { to: '/perfil', label: 'Perfil', icon: <IconUser /> },
          ]}
        />
      ) : role === 'admin' ? (
        <BottomNav
          left={[
            { to: '/admin/negocios', label: 'Negocios', icon: <IconStore /> },
            { to: '/admin/ofertas', label: 'Ofertas', icon: <IconTag /> },
          ]}
          home="/admin"
          right={[
            { to: '/admin/ventas', label: 'Ventas', icon: <IconChart /> },
            { to: '/admin/usuarios', label: 'Usuarios', icon: <IconUsers /> },
          ]}
        />
      ) : (
        <BottomNav
          left={[
            { to: '/comercios', label: 'Comercios', icon: <IconGrid /> },
            { to: '/pedidos', label: 'Pedidos', icon: <IconTicket /> },
          ]}
          home="/"
          right={[
            { to: '/carrito', label: 'Carrito', icon: <IconBag />, badge: count },
            { to: profile ? '/perfil' : '/login', label: 'Perfil', icon: <IconUser /> },
          ]}
        />
      )}
    </div>
  );
}
