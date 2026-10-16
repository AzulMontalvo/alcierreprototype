import { createDemoApi } from './demoApi';
import { createSupabaseApi } from './supabaseApi';
import type { Api } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const demo = !url || !key ? createDemoApi() : null;

/** API activa: Supabase si hay credenciales; si no, modo demo local. */
export const api: Api = demo ?? createSupabaseApi(url!, key!);

/** Solo disponible en modo demo: simula el resultado de la pasarela de pago. */
export const demoApi = demo;

export type { Api } from './types';
