'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // In a real app, we would integrate with Firebase Client SDK here to get the ID token,
  // then send the ID token to our backend /api/auth/login to get session/cookies.
  // Since we cannot initialize a real Firebase config on the client without the user's config,
  // we will build the UI logic assuming the token exchange happens.
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      
      const data = await res.json();
      
      if (data.success && data.token) {
        // Check if user is admin
        if (data.data && data.data.role !== 'admin') {
          setError('Access denied: You do not have admin privileges.');
          return;
        }
        
        // Store token in localStorage
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.data));
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Admin Login</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Sign in to access the dashboard
        </p>

        {error && (
          <div style={{ background: '#FCE8E6', color: 'var(--error)', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label>Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
