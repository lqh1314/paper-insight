import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
    <h1 className="text-6xl font-bold text-slate-300">404</h1>
    <p className="text-slate-500">页面不存在</p>
    <Link to="/" className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
      <Home className="h-4 w-4" /> 返回首页
    </Link>
  </div>
);

export default NotFound;
