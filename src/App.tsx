import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminHome from './pages/admin/AdminHome';
import AdminOffers from './pages/admin/AdminOffers';
import AdminSales from './pages/admin/AdminSales';
import AdminUsers from './pages/admin/AdminUsers';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import BusinessHome from './pages/business/BusinessHome';
import BusinessOffers from './pages/business/BusinessOffers';
import BusinessOrders from './pages/business/BusinessOrders';
import BusinessProfileForm from './pages/business/BusinessProfileForm';
import OfferForm from './pages/business/OfferForm';
import VerifyPickup from './pages/business/VerifyPickup';
import Cart from './pages/customer/Cart';
import DemoPayment from './pages/customer/DemoPayment';
import Home from './pages/customer/Home';
import MyOrders from './pages/customer/MyOrders';
import StoreDetail from './pages/customer/StoreDetail';
import Stores from './pages/customer/Stores';
import Ticket from './pages/customer/Ticket';
import Profile from './pages/Profile';

const biz = (el: JSX.Element) => <RequireRole roles={['business']}>{el}</RequireRole>;
const admin = (el: JSX.Element) => <RequireRole roles={['admin']}>{el}</RequireRole>;
const authed = (el: JSX.Element) => <RequireRole>{el}</RequireRole>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Cliente (catálogo público) */}
        <Route index element={<Home />} />
        <Route path="comercios" element={<Stores />} />
        <Route path="comercios/:id" element={<StoreDetail />} />
        <Route path="carrito" element={<Cart />} />
        <Route path="pago-demo/:orderId" element={authed(<DemoPayment />)} />
        <Route path="pedidos" element={authed(<MyOrders />)} />
        <Route path="pedidos/:id" element={authed(<Ticket />)} />
        <Route path="perfil" element={authed(<Profile />)} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Register />} />

        {/* Negocio */}
        <Route path="negocio" element={biz(<BusinessHome />)} />
        <Route path="negocio/perfil" element={biz(<BusinessProfileForm />)} />
        <Route path="negocio/ofertas" element={biz(<BusinessOffers />)} />
        <Route path="negocio/ofertas/nueva" element={biz(<OfferForm />)} />
        <Route path="negocio/ofertas/:id" element={biz(<OfferForm />)} />
        <Route path="negocio/pedidos" element={biz(<BusinessOrders />)} />
        <Route path="negocio/verificar" element={biz(<VerifyPickup />)} />

        {/* Backoffice */}
        <Route path="admin" element={admin(<AdminHome />)} />
        <Route path="admin/negocios" element={admin(<AdminBusinesses />)} />
        <Route path="admin/ofertas" element={admin(<AdminOffers />)} />
        <Route path="admin/usuarios" element={admin(<AdminUsers />)} />
        <Route path="admin/ventas" element={admin(<AdminSales />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
