'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UserDetailsPage({ params }) {
  const { uid } = params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dummy fetch for UI scaffolding
  useEffect(() => {
    setTimeout(() => {
      setUser({
        uid,
        name: 'John Doe',
        email: 'john@example.com',
        mobile: '9876543210',
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
      setLoading(false);
    }, 500);
  }, [uid]);

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change this user's status to ${newStatus.toUpperCase()}?`)) return;
    
    // In real app, call PUT /api/admin/users/:uid/status
    setUser({ ...user, status: newStatus });
  };

  const handleRoleChange = async (newRole) => {
    if (!window.confirm(`Are you sure you want to grant this user the ${newRole.toUpperCase()} role?`)) return;
    
    // In real app, call PUT /api/admin/users/:uid/role
    setUser({ ...user, role: newRole });
  };

  if (loading) return <div>Loading user details...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/users" style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.9rem' }}>
          &larr; Back to Users
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{user.name}</h1>
          <div style={{ color: 'var(--text-secondary)' }}>ID: {user.uid}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className={`badge badge-${user.role}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>{user.role}</span>
          <span className={`badge badge-${user.status}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>{user.status}</span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FCE8E6', color: 'var(--error)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>Contact Information</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Email Address</div>
            <div style={{ fontWeight: 500 }}>{user.email}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Mobile Number</div>
            <div style={{ fontWeight: 500 }}>{user.mobile}</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>System Metadata</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Created At</div>
            <div>{new Date(user.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Last Updated</div>
            <div>{new Date(user.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Last Login</div>
            <div>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>Administrative Actions</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Actions */}
          {user.status !== 'active' && (
            <button className="btn btn-primary" onClick={() => handleStatusChange('active')}>
              Activate User
            </button>
          )}
          {user.status !== 'suspended' && (
            <button className="btn btn-secondary" onClick={() => handleStatusChange('suspended')} style={{ color: 'var(--warning)' }}>
              Suspend User
            </button>
          )}
          {user.status !== 'blocked' && (
            <button className="btn btn-danger" onClick={() => handleStatusChange('blocked')}>
              Block User
            </button>
          )}

          <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 1rem' }}></div>

          {/* Role Actions */}
          {user.role === 'user' ? (
            <button className="btn btn-secondary" onClick={() => handleRoleChange('admin')} style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
              Grant Admin Access
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => handleRoleChange('user')}>
              Revoke Admin Access
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
