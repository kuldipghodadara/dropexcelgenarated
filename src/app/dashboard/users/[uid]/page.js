'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UserDetailsPage({ params }) {
  const { uid } = params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customExpiry, setCustomExpiry] = useState('');
  const [assigningPlan, setAssigningPlan] = useState(false);

  const [deviceLimit, setDeviceLimit] = useState(2);
  const [updatingDeviceLimit, setUpdatingDeviceLimit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
        // Fetch User
        const userRes = await fetch(`${API_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userData.success) {
          const foundUser = userData.data.find(u => u.uid === uid);
          if (foundUser) {
            setUser(foundUser);
            setDeviceLimit(foundUser.deviceLimit || 2);
          }
        }

        // Fetch Plans
        const planRes = await fetch(`${API_URL}/admin/plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const planData = await planRes.json();
        if (planData.success) {
          setPlans(planData.data);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uid]);

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change this user's status to ${newStatus.toUpperCase()}?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/users/${uid}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, status: newStatus });
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!window.confirm(`Are you sure you want to grant this user the ${newRole.toUpperCase()} role?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/users/${uid}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, role: newRole });
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError('Network error');
    }
  };

  const handleDeviceLimitChange = async () => {
    setUpdatingDeviceLimit(true);
    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/users/${uid}/deviceLimit`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ deviceLimit })
      });
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, deviceLimit: parseInt(deviceLimit, 10) });
        alert('Device limit updated successfully!');
      } else {
        alert(data.message || 'Failed to update device limit');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setUpdatingDeviceLimit(false);
    }
  };

  const handlePlanSelection = (pid) => {
    setSelectedPlanId(pid);
    if (!pid) {
      setCustomExpiry('');
      return;
    }
    
    const plan = plans.find(p => p.id === pid);
    if (!plan || plan.type === 'lifetime') {
      setCustomExpiry('');
      return;
    }

    const d = new Date();
    
    if (plan.durationMonths) {
      d.setMonth(d.getMonth() + parseInt(plan.durationMonths, 10));
    } else if (plan.type === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (plan.type === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else if (plan.type === 'custom' && plan.durationDays) {
      d.setDate(d.getDate() + parseInt(plan.durationDays, 10));
    }
    
    // Format to YYYY-MM-DD for the HTML date input
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setCustomExpiry(`${yyyy}-${mm}-${dd}`);
  };

  const handleAssignPlan = async () => {
    let finalPlanId, finalPlanName, finalPlanType, finalDurationMonths;

    if (!selectedPlanId) {
      if (!customExpiry) {
        alert('Please select a plan or a custom expiry date!');
        return;
      }
      // Only date was selected
      finalPlanId = 'custom_override';
      finalPlanName = 'Custom Date Plan';
      finalPlanType = 'custom';
    } else {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (!selectedPlan) return;
      
      finalPlanId = selectedPlan.id;
      finalPlanName = selectedPlan.name;
      finalPlanType = selectedPlan.type || 'duration';
      finalDurationMonths = selectedPlan.durationMonths;

      if (selectedPlan.type === 'custom' && !customExpiry) {
        setError('Please select an expiry date for this custom plan');
        alert('Please select an expiry date for this custom plan');
        return;
      }
    }

    setAssigningPlan(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/admin/users/${uid}/plan`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          planId: finalPlanId, 
          planName: finalPlanName, 
          type: finalPlanType,
          durationMonths: finalDurationMonths,
          expiryDate: customExpiry
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser({ 
          ...user, 
          planId: data.data.planId, 
          planName: data.data.planName, 
          planType: data.data.planType,
          planExpiryDate: data.data.planExpiryDate 
        });
        alert('Plan assigned successfully!');
      } else {
        const errorMsg = data.message || 'Failed to assign plan';
        setError(errorMsg);
        alert('Error: ' + errorMsg);
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setAssigningPlan(false);
    }
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
            <div>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Last Login</div>
            <div>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>Subscription Plan</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Current Plan</div>
            <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'var(--primary)' }}>{user.planName || 'No Plan Assigned'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Expiry Date</div>
            <div style={{ fontWeight: 500, color: user.planExpiryDate && new Date(user.planExpiryDate) < new Date() ? 'var(--error)' : 'inherit' }}>
              {user.planType === 'lifetime' ? 'Lifetime Access' : 
               user.planExpiryDate ? new Date(user.planExpiryDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Assign New Plan</h4>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
              <label>Select Plan</label>
              <select 
                className="form-input"
                value={selectedPlanId}
                onChange={(e) => handlePlanSelection(e.target.value)}
              >
                <option value="">-- Select a Plan --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
            {plans.find(p => p.id === selectedPlanId)?.type !== 'lifetime' && (
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label>Expiry Date Override {plans.find(p => p.id === selectedPlanId)?.type !== 'custom' && '(Optional)'}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                />
              </div>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={handleAssignPlan}
              disabled={assigningPlan}
            >
              {assigningPlan ? 'Assigning...' : 'Assign Plan'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>Device Management</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Max Devices Allowed</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '80px', marginBottom: 0 }}
                min="1"
                value={deviceLimit}
                onChange={(e) => setDeviceLimit(e.target.value)}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleDeviceLimitChange}
                disabled={updatingDeviceLimit || parseInt(deviceLimit) === (user.deviceLimit || 2)}
              >
                {updatingDeviceLimit ? 'Saving...' : 'Update Limit'}
              </button>
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Active Devices Count</div>
            <div style={{ fontWeight: 500, fontSize: '1.2rem' }}>{user.activeDevices ? user.activeDevices.length : 0}</div>
          </div>
        </div>
        {user.activeDevices && user.activeDevices.length > 0 && (
          <div style={{ marginTop: '1.5rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Recent Devices</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
              {user.activeDevices.map((d, i) => (
                <li key={i} style={{ padding: '0.4rem 0', borderBottom: i !== user.activeDevices.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d.deviceName || 'Unknown Device'}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Last seen: {new Date(d.lastLoginAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
