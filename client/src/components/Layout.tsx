import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Home, GitCompare } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const isFullscreen = location.pathname.includes('/fullscreen');

  if (isFullscreen) {
    return (
      <div className="w-screen h-screen overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-50 shadow-sm">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-800">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <span>论文智析</span>
        </Link>
        <nav className="ml-8 flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            <Home className="h-4 w-4" />
            工作台
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            <GitCompare className="h-4 w-4" />
            论文对比
          </NavLink>
        </nav>
        <div className="ml-auto text-xs text-slate-400">AI 驱动的学术论文智能分析平台</div>
      </header>
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
};

export default Layout;
