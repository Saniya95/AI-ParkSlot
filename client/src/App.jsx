import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VenueList from './components/VenueList';
import SlotGrid from './components/SlotGrid';
import BookingModal from './components/BookingModal';
import MyBookings from './components/MyBookings';
import GateKiosk from './components/GateKiosk';
import AdminDashboard from './components/AdminDashboard';
import AiChatbotModal from './components/AiChatbotModal';
import DemandForecastModal from './components/DemandForecastModal';
import AuthModal from './components/AuthModal';
import { Sparkles, Bot, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const stored = localStorage.getItem('aps_user');
      const u = stored ? JSON.parse(stored) : null;
      return u?.role === 'admin' ? 'admin' : 'explore';
    } catch {
      return 'explore';
    }
  });
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueSlots, setVenueSlots] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aps_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('aps_token') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // AI & Modals
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [demandModalVenue, setDemandModalVenue] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load Venues from MongoDB
  const loadVenues = async () => {
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch('/api/venues', { headers });
      if (!res.ok) return;
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data?.success) {
        setVenues(data.data);
      }
    } catch (err) {
      // Quiet background log
    }
  };

  // Load Bookings (User sees their own private bookings; Admin sees all)
  const loadBookings = async () => {
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch('/api/bookings', { headers });
      if (!res.ok) return;
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data?.success) {
        setBookings(data.data);
      }
    } catch (err) {
      // Quiet background log
    }
  };

  // Load Slots for selected venue
  const loadSlots = async (venueId) => {
    try {
      const res = await fetch(`/api/slots/venue/${venueId}`);
      if (!res.ok) return;
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data?.success) {
        setVenueSlots(data.data);
      }
    } catch (err) {
      // Quiet background log
    }
  };

  // Verify stored session on mount
  useEffect(() => {
    if (authToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(async res => {
          if (!res.ok) throw new Error('Auth check failed');
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        })
        .then(data => {
          if (data?.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('aps_user', JSON.stringify(data.user));
          } else {
            handleLogout(false);
          }
        })
        .catch(() => {
          handleLogout(false);
        });
    }
  }, [authToken]);

  // Strict Role-Based Protection: non-admin users cannot access admin panel or gate kiosk
  useEffect(() => {
    if ((activeTab === 'admin' || activeTab === 'kiosk') && currentUser?.role !== 'admin') {
      setActiveTab('explore');
      setToastMessage({
        type: 'error',
        text: 'Access Denied: Administrator privileges required.'
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    loadVenues();
    loadBookings();

    // 5-second live polling to sync slot state across users and devices
    const interval = setInterval(() => {
      loadVenues();
      loadBookings();
      if (selectedVenue) {
        loadSlots(selectedVenue._id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedVenue, authToken]);

  // Auth Handlers
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('aps_user', JSON.stringify(user));
    localStorage.setItem('aps_token', token);
    
    // Admin directly enters Admin Panel, Users enter Explore
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('explore');
    }

    setToastMessage({
      type: 'success',
      text: user.role === 'admin' ? 'Authenticated as Administrator.' : `Welcome back, ${user.name}!`
    });
    setTimeout(() => setToastMessage(null), 4000);
    loadBookings();
    loadVenues();
  };

  const handleLogout = (showToast = true) => {
    setCurrentUser(null);
    setAuthToken('');
    localStorage.removeItem('aps_user');
    localStorage.removeItem('aps_token');
    setBookings([]);
    setActiveTab('explore');
    if (showToast) {
      setToastMessage({
        type: 'success',
        text: 'You have been logged out successfully.'
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
    loadVenues();
  };

  // Select a venue to view its 2D floor plan
  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setAiRecommendation(null);
  };

  // Run AI Slot Recommendation
  const handleRunAiRecommend = async () => {
    if (!selectedVenue) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: selectedVenue._id,
          vehicleType: 'car',
          needEV: false,
          needHandicap: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiRecommendation(data);
      } else {
        alert(data.message || 'No slots available for recommendation');
      }
    } catch (err) {
      console.error('AI Recommender error:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Direct simulation from pass card
  const handleSimulateScan = async (type, booking) => {
    try {
      const endpoint = type === 'entry' ? '/api/scan/entry' : '/api/scan/exit';
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookingCode: booking.bookingCode, operator: 'Direct Pass Simulator' })
      });
      const data = await res.json();
      
      setToastMessage({
        type: data.success ? 'success' : 'error',
        text: data.message
      });
      setTimeout(() => setToastMessage(null), 5000);

      loadVenues();
      loadBookings();
      if (selectedVenue) loadSlots(selectedVenue._id);
    } catch (e) {
      console.error('Simulate scan error:', e);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: data.message });
        setTimeout(() => setToastMessage(null), 4000);
        loadBookings();
        loadVenues();
        if (selectedVenue) loadSlots(selectedVenue._id);
      } else {
        setToastMessage({ type: 'error', text: data.message });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (e) {
      console.error('Cancel booking error:', e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if ((tab === 'admin' || tab === 'kiosk') && currentUser?.role !== 'admin') {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
            return;
          }
          setActiveTab(tab);
          if (tab !== 'explore') setSelectedVenue(null);
        }}
        openChat={() => setIsChatOpen(true)}
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onLogout={() => handleLogout(true)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontSize: '0.875rem',
          fontWeight: 600,
          maxWidth: '400px',
          backdropFilter: 'blur(8px)',
          animation: 'modalIn 0.2s ease'
        }}>
          {toastMessage.text}
        </div>
      )}

      {/* Main Content Area */}
      <main className="container" style={{ flexGrow: 1, padding: '2rem 1.5rem' }}>
        
        {/* TAB 1: EXPLORE & BOOK PARKING */}
        {activeTab === 'explore' && (
          <div>
            {!selectedVenue ? (
              <VenueList
                venues={venues}
                onSelectVenue={handleSelectVenue}
                onCheckDemand={(v) => setDemandModalVenue(v)}
              />
            ) : (
              <SlotGrid
                venue={selectedVenue}
                slots={venueSlots}
                onBack={() => {
                  setSelectedVenue(null);
                  loadVenues();
                }}
                onSelectSlot={(slot) => {
                  if (!currentUser) {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                    setToastMessage({
                      type: 'error',
                      text: 'Please sign in or register before selecting a slot.'
                    });
                    setTimeout(() => setToastMessage(null), 4000);
                    return;
                  }
                  setBookingSlot(slot);
                }}
                onRunAiRecommend={handleRunAiRecommend}
                aiRecommendation={aiRecommendation}
                loadingAi={loadingAi}
              />
            )}
          </div>
        )}

        {/* TAB 2: MY PASSES & QR CODES */}
        {activeTab === 'passes' && (
          <MyBookings
            bookings={bookings}
            currentUser={currentUser}
            onSimulateScan={handleSimulateScan}
            onRefresh={loadBookings}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {/* TAB 3: GATE KIOSK TERMINALS (Admin Only) */}
        {activeTab === 'kiosk' && currentUser?.role === 'admin' && (
          <GateKiosk
            venues={venues}
            bookings={bookings}
            authToken={authToken}
            onRefresh={() => {
              loadBookings();
              loadVenues();
              if (selectedVenue) loadSlots(selectedVenue._id);
            }}
          />
        )}

        {/* TAB 4: ADMIN COMMAND CENTER (Only accessible to authenticated admin) */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminDashboard
            venues={venues}
            authToken={authToken}
            onRefreshAll={() => {
              loadVenues();
              loadBookings();
            }}
          />
        )}

      </main>

      {/* Booking Form Modal */}
      {bookingSlot && selectedVenue && (
        <BookingModal
          slot={bookingSlot}
          venue={selectedVenue}
          currentUser={currentUser}
          authToken={authToken}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setIsAuthModalOpen(true);
          }}
          onClose={() => setBookingSlot(null)}
          onBookingSuccess={() => {
            loadSlots(selectedVenue._id);
            loadBookings();
            loadVenues();
          }}
          onGoToPasses={() => {
            setBookingSlot(null);
            setSelectedVenue(null);
            setActiveTab('passes');
          }}
        />
      )}

      {/* AI Demand Prediction Modal */}
      {demandModalVenue && (
        <DemandForecastModal
          venue={demandModalVenue}
          onClose={() => setDemandModalVenue(null)}
        />
      )}

      {/* AI Parking Chatbot Modal */}
      {isChatOpen && (
        <AiChatbotModal
          onClose={() => setIsChatOpen(false)}
          venueId={selectedVenue?._id}
          selectedVenueName={selectedVenue?.name}
          authToken={authToken}
          currentUser={currentUser}
        />
      )}

      {/* User Authentication Modal (Login & Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Floating Chat Trigger Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.85rem 1.35rem',
            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            zIndex: 90
          }}
        >
          <Bot size={20} />
          <span>Ask AI Assistant</span>
        </button>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '1.5rem 0', background: 'var(--bg-secondary)', marginTop: 'auto' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>AI ParkSlot</strong> • Saniya Ahmed & Palak Rajput Minor Project (2026-27)
          </div>
          <div>
            Samrat Ashok Technological Institute Vidisha (M.P.) • MERN Stack & AI Architecture
          </div>
        </div>
      </footer>

    </div>
  );
}
