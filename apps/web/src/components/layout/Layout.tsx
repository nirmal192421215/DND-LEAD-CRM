import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
