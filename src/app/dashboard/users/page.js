'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
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
        if (data.success) {
          setUsers(data.data || []);
        } else {
          console.error("Failed to fetch users:", data.message);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const userName = user.displayName || user.name || 'Not provided';
    const matchesSearch = 
      userName.toLowerCase().includes(search.toLowerCase()) || 
      (user.email && user.email.toLowerCase().includes(search.toLowerCase())) || 
      (user.mobile && user.mobile.includes(search));
    
    if (filter === 'All') return matchesSearch;
    if (filter === 'Admin') return matchesSearch && user.role === 'admin';
    if (filter === 'User') return matchesSearch && user.role === 'user';
    return matchesSearch && user.status === filter.toLowerCase();
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>User Management</h1>
      </div>
      
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by name, email, or mobile..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select 
              className="form-input" 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All Users</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Suspended">Suspended</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.uid}>
                  <td style={{ fontWeight: 500 }}>{user.displayName || user.name || 'Not provided'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.mobile || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${user.role || 'user'}`}>{user.role || 'user'}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${user.status || 'active'}`}>{user.status || 'active'}</span>
                  </td>
                  <td>
                    <Link href={`/dashboard/users/${user.uid}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
