import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { installUnlockListener } from './lib/audio';
import { GameProvider } from './lib/game/GameProvider';
import { ProfilesProvider } from './lib/profiles/ProfilesProvider';
import Inicio from './pages/Inicio';
import Usuarios from './pages/Usuarios';
import Ruleta from './pages/Ruleta';
import Pregunta from './pages/Pregunta';
import Resultados from './pages/Resultados';
import Tienda from './pages/Tienda';
import Trofeos from './pages/Trofeos';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Inicio />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="ruleta" element={<Ruleta />} />
        <Route path="pregunta" element={<Pregunta />} />
        <Route path="resultados" element={<Resultados />} />
        <Route path="tienda/:profileId" element={<Tienda />} />
        <Route path="trofeos/:profileId" element={<Trofeos />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    installUnlockListener();
  }, []);

  return (
    <ProfilesProvider>
      <GameProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GameProvider>
    </ProfilesProvider>
  );
}
