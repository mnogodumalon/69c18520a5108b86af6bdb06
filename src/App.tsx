import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SchnelleinladungPage from '@/pages/SchnelleinladungPage';
import DienstleisterbuchungPage from '@/pages/DienstleisterbuchungPage';
import EinladungsmanagementPage from '@/pages/EinladungsmanagementPage';
import EventverwaltungPage from '@/pages/EventverwaltungPage';
import DienstleisterverwaltungPage from '@/pages/DienstleisterverwaltungPage';
import GaesteverwaltungPage from '@/pages/GaesteverwaltungPage';

const EventVorbereitenPage = lazy(() => import('@/pages/intents/EventVorbereitenPage'));
const EventAbschliessenPage = lazy(() => import('@/pages/intents/EventAbschliessenPage'));

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="schnelleinladung" element={<SchnelleinladungPage />} />
            <Route path="dienstleisterbuchung" element={<DienstleisterbuchungPage />} />
            <Route path="einladungsmanagement" element={<EinladungsmanagementPage />} />
            <Route path="eventverwaltung" element={<EventverwaltungPage />} />
            <Route path="dienstleisterverwaltung" element={<DienstleisterverwaltungPage />} />
            <Route path="gaesteverwaltung" element={<GaesteverwaltungPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="intents/event-vorbereiten" element={<Suspense fallback={null}><EventVorbereitenPage /></Suspense>} />
            <Route path="intents/event-abschliessen" element={<Suspense fallback={null}><EventAbschliessenPage /></Suspense>} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
