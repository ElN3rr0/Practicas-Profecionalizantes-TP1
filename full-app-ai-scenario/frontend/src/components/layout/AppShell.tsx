import { Outlet } from 'react-router-dom';
import GameClock from '../game/GameClock';
import Footer from './Footer';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-light-text">
      <Header />
      <GameClock />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
