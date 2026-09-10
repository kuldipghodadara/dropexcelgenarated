'use client';

import { useState, useEffect } from 'react';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New Plan Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.message || 'Failed to fetch plans');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/plans`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name, durationMonths: parseInt(durationMonths, 10) })
      });
      const data = await res.json();
      
      if (data.success) {
        setShowForm(false);
        setName('');
        setDurationMonths('1');
        fetchPlans(); // Refresh the list
      } else {
        setError(data.message || 'Failed to create plan');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan? Active users on this plan will not be affected, but you cannot assign it anymore.')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      } else {
        setError(data.message || 'Failed to delete plan');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Subscription Plans</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create New Plan'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#FCE8E6', color: 'var(--error)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Create Plan</h3>
          <form onSubmit={handleCreatePlan} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
              <label>Plan Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Yearly"
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, width: '200px' }}>
              <label>Duration (Months)</label>
              <input 
                type="number" 
                className="form-input" 
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                min="1"
                placeholder="e.g. 1, 6, 12"
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Plan'}
            </button>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Plan Name</th>
              <th>Duration (Months)</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading plans...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No plans created yet.</td></tr>
            ) : (
              plans.map(plan => (
                <tr key={plan.id}>
                  <td style={{ fontWeight: 500 }}>{plan.name}</td>
                  <td>
                    {plan.durationMonths ? `${plan.durationMonths} Month${plan.durationMonths > 1 ? 's' : ''}` : 
                     plan.type === 'monthly' ? '1 Month' : 
                     plan.type === 'yearly' ? '12 Months' : 
                     plan.type === 'custom' ? `${plan.durationDays} Days` : 'Lifetime'}
                  </td>
                  <td>{new Date(plan.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      Delete
                    </button>
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
