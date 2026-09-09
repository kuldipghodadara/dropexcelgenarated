'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          Admin Panel
        </div>
        <nav className="sidebar-nav">
          <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={20} style={{ marginRight: '12px' }} />
            Dashboard
          </Link>
          <Link href="/dashboard/users" className={`nav-item ${pathname.startsWith('/dashboard/users') ? 'active' : ''}`}>
            <Users size={20} style={{ marginRight: '12px' }} />
            Users
          </Link>
          <Link href="/dashboard/settings" className={`nav-item ${pathname === '/dashboard/settings' ? 'active' : ''}`}>
            <Settings size={20} style={{ marginRight: '12px' }} />
            Settings
          </Link>
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <Link href="/login" className="nav-item" style={{ color: 'var(--error)' }}>
            <LogOut size={20} style={{ marginRight: '12px' }} />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}
