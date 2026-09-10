'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, LogOut, UserCircle, CreditCard } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      try {
        setAdminUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse admin user");
      }
    }
  }, []);

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
          <Link href="/dashboard/plans" className={`nav-item ${pathname.startsWith('/dashboard/plans') ? 'active' : ''}`}>
            <CreditCard size={20} style={{ marginRight: '12px' }} />
            Plans
          </Link>
          <Link href="/dashboard/settings" className={`nav-item ${pathname === '/dashboard/settings' ? 'active' : ''}`}>
            <Settings size={20} style={{ marginRight: '12px' }} />
            Settings
          </Link>
        </nav>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          {/* Admin Profile Section */}
          {adminUser && (
            <div style={{ marginBottom: '1rem' }}>
              <div 
                className="nav-item" 
                style={{ cursor: 'pointer', background: showProfileDetails ? 'var(--bg-card)' : 'transparent', borderRadius: '6px' }}
                onClick={() => setShowProfileDetails(!showProfileDetails)}
              >
                <UserCircle size={20} style={{ marginRight: '12px', color: 'var(--primary)' }} />
                <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {adminUser.displayName || adminUser.name || 'Admin'}
                </span>
              </div>
              
              {showProfileDetails && (
                <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ marginBottom: '0.3rem' }}><strong>Email:</strong><br/>{adminUser.email}</div>
                  <div style={{ marginBottom: '0.3rem' }}><strong>Mobile:</strong><br/>{adminUser.mobile || 'N/A'}</div>
                  <div><strong>Role:</strong> <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{adminUser.role}</span></div>
                </div>
              )}
            </div>
          )}

          <Link href="/login" className="nav-item" style={{ color: 'var(--error)' }} onClick={() => localStorage.clear()}>
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
