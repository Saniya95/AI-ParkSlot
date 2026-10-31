import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  Phone, 
  User as UserIcon, 
  Car, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  ShieldCheck 
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Safely parse JSON or text response to prevent 'Unexpected end of JSON input' crashes
  const parseResponseSafe = async (res, defaultErrMsg) => {
    let data = null;
    let rawText = '';
    try {
      rawText = await res.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!res.ok || !data?.success) {
      let msg = data?.message;
      if (!msg) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          msg = 'Backend server is unreachable or database is offline. Please verify the backend is running on port 5000.';
        } else if (res.status === 404) {
          msg = 'Authentication endpoint not found (404). Please verify backend server routes.';
        } else {
          msg = `${defaultErrMsg} (HTTP ${res.status})`;
        }
      }
      const err = new Error(msg);
      err.data = data;
      err.status = res.status;
      throw err;
    }

    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password
        })
      });

      const data = await parseResponseSafe(res, 'Login failed');
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      let msg = err.message;
      if (err.name === 'TypeError' && (msg.includes('fetch') || msg.includes('NetworkError'))) {
        msg = 'Cannot reach backend server. Please verify the backend is running on port 5000.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Name, email, phone number, and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          vehicleNumber: vehicleNumber.trim()
        })
      });

      const data = await parseResponseSafe(res, 'Registration failed');
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      let msg = err.message;
      if (err.data?.message && err.data.message.includes('already exists')) {
        setIdentifier(email.trim() || phone.trim());
      }
      if (err.name === 'TypeError' && (msg.includes('fetch') || msg.includes('NetworkError'))) {
        msg = 'Cannot reach backend server. Please verify the backend is running on port 5000.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {mode === 'login' ? 'Sign In to AI ParkSlot' : 'Create New Account'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
                {mode === 'login' ? 'Enter credentials or Admin access' : 'Register to reserve slots and get digital passes'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === 'login' ? '2px solid var(--accent-ai)' : '2px solid transparent',
              color: mode === 'login' ? 'var(--text-main)' : 'var(--text-dim)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            style={{
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              borderBottom: mode === 'register' ? '2px solid var(--accent-ai)' : '2px solid transparent',
              color: mode === 'register' ? 'var(--text-main)' : 'var(--text-dim)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <UserPlus size={15} />
            <span>Register</span>
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {mode === 'register' && (error.includes('already exists') || error.includes('log in')) && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-ai)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0.2rem 0',
                    textDecoration: 'underline'
                  }}
                >
                  Already registered? Click here to Log In &rarr;
                </button>
              )}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address or Phone Number:
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. user@aiparkslot.com or 9826012345"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Password:
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name:
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saniya Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address:
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. driver@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Phone Number:
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 94250 98765"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Vehicle Plate Number (Optional):
                </label>
                <div style={{ position: 'relative' }}>
                  <Car size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="e.g. MP 04 CB 4521"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Password:
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    placeholder="Choose a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {loading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
