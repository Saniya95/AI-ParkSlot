import React from 'react';
import { 
  Car, 
  QrCode, 
  ShieldCheck, 
  SlidersHorizontal, 
  Bot, 
  Activity, 
  MapPin,
  Clock,
  User,
  LogOut,
  LogIn,
  ShieldAlert
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  openChat, 
  stats, 
  currentUser, 
  onOpenAuth, 
  onLogout 
}) {
  const isAdmin = currentUser?.role === 'admin';

  // Admin navigation: Show exactly two main tabs: Admin Panel and Gate Kiosk
  // User navigation: Book Parking and My QR Passes (Gate Kiosk completely removed)
  const navItems = isAdmin
    ? [
        { id: 'admin', label: 'Admin Panel', icon: SlidersHorizontal },
        { id: 'kiosk', label: 'Gate Kiosk', icon: ShieldCheck }
      ]
    : [
        { id: 'explore', label: 'Book Parking', icon: Car },
        { id: 'passes', label: 'My QR Passes', icon: QrCode }
      ];

  return (
    <header style={{
      background: 'rgba(17, 22, 34, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0.85rem 0'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab(isAdmin ? 'admin' : 'explore')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(14, 165, 233, 0.4)'
          }}>
            <Car size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                AI Park<span style={{ color: 'var(--accent-ai)' }}>Slot</span>
              </span>
              <span className="badge badge-ai" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                MERN + AI
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
              Smart Pre-Booking & Dual-QR Automated Parking
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '9px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  borderBottom: isActive ? '2px solid var(--accent-ai)' : '2px solid transparent'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent-ai)' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls, User Status, and AI Assistant */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Live System Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: 'var(--color-vacant)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--color-vacant)',
              boxShadow: '0 0 8px var(--color-vacant)'
            }} />
            <span>Atlas Live</span>
          </div>

          {/* AI Chatbot Button */}
          <button 
            onClick={openChat}
            className="btn btn-secondary"
            style={{ 
              padding: '0.5rem 0.9rem', 
              fontSize: '0.825rem',
              borderColor: 'rgba(14, 165, 233, 0.4)',
              background: 'rgba(14, 165, 233, 0.08)'
            }}
          >
            <Bot size={17} color="var(--accent-ai)" />
            <span style={{ color: 'var(--accent-ai)' }}>AI Assistant</span>
          </button>

          {/* User Auth Controls */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: currentUser.role === 'admin' ? 'rgba(234, 179, 8, 0.12)' : 'var(--bg-secondary)',
                border: currentUser.role === 'admin' ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid var(--border-subtle)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: currentUser.role === 'admin' ? '#facc15' : 'var(--text-main)',
                fontWeight: 600
              }}>
                {currentUser.role === 'admin' ? <ShieldAlert size={14} /> : <User size={14} />}
                <span>{currentUser.name}</span>
                {currentUser.role === 'admin' && (
                  <span style={{ fontSize: '0.65rem', background: '#eab308', color: '#000', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.2rem' }}>
                    ADMIN
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', gap: '0.35rem' }}
                title="Sign Out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', gap: '0.35rem' }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
