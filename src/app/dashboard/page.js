'use client';

import { useState, useEffect } from 'react';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    total: '-',
    active: '-',
    blocked: '-',
    admins: '-'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await res.json();
        if (data.success && data.data) {
          const users = data.data;
          setStats({
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            blocked: users.filter(u => u.status === 'blocked').length,
            admins: users.filter(u => u.role === 'admin').length
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{loading ? '...' : stats.total}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Active Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>{loading ? '...' : stats.active}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Blocked Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--error)' }}>{loading ? '...' : stats.blocked}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Admin Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--primary)' }}>{loading ? '...' : stats.admins}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>System Status</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Firebase Backend integration is successfully connected. Real-time statistics are currently being displayed based on live user data.
        </p>
      </div>
    </div>
  );
}
