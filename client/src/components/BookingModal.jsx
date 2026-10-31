import React, { useState } from 'react';
import { 
  X, 
  Car, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  QrCode, 
  ShieldCheck, 
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';

export default function BookingModal({ 
  slot, 
  venue, 
  onClose, 
  onBookingSuccess, 
  onGoToPasses,
  onGoToKiosk,
  currentUser,
  authToken,
  onOpenAuth
}) {
  const [driverName, setDriverName] = useState(currentUser?.name || '');
  const [driverPhone, setDriverPhone] = useState(currentUser?.phone || '');
  const [vehicleNumber, setVehicleNumber] = useState(currentUser?.vehicleNumber || '');
  const [vehicleType, setVehicleType] = useState(slot.type || 'car');
  const [durationHours, setDurationHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const rate = venue.ratesPerHour[vehicleType] || venue.ratesPerHour.car || 40;
  const totalAmount = rate * durationHours;

  React.useEffect(() => {
    if (currentUser) {
      if (!driverName && currentUser.name) setDriverName(currentUser.name);
      if (!driverPhone && currentUser.phone) setDriverPhone(currentUser.phone);
      if (!vehicleNumber && currentUser.vehicleNumber) setVehicleNumber(currentUser.vehicleNumber);
    }
  }, [currentUser]);

  React.useEffect(() => {
    const activeToken = authToken || localStorage.getItem('aps_token');
    if (activeToken && error && (error.toLowerCase().includes('token') || error.toLowerCase().includes('log in') || error.toLowerCase().includes('sign in') || error.toLowerCase().includes('session expired'))) {
      setError('');
    }
  }, [authToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeToken = authToken || localStorage.getItem('aps_token') || '';
    const activeUser = currentUser || (() => {
      try {
        const u = localStorage.getItem('aps_user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    })();

    if (!activeUser || !activeToken) {
      setError('You must be signed in to reserve a parking slot. Please log in.');
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    if (!vehicleNumber.trim()) {
      setError('Please provide a valid vehicle license plate number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startTime = new Date();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeToken}`
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          venueId: venue._id,
          slotId: slot._id,
          userName: driverName || activeUser.name,
          userPhone: driverPhone || activeUser.phone,
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          vehicleType,
          startTime: startTime.toISOString(),
          estimatedHours: durationHours,
          paymentMethod
        })
      });

      let data = null;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!res.ok || !data?.success) {
        if (res.status === 401) {
          setError(data?.message || 'Session expired or invalid token. Please log in again.');
          return;
        }
        throw new Error(data?.message || `Booking failed (HTTP ${res.status})`);
      }

      setConfirmedBooking(data.booking);
      if (onBookingSuccess) onBookingSuccess(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {confirmedBooking ? 'Booking Confirmed • Dual QR Passes' : `Reserve Slot ${slot.slotNumber}`}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
              {venue.name} • {slot.floor} ({slot.section})
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes('log in') || error.toLowerCase().includes('sign in') || error.toLowerCase().includes('token') || error.toLowerCase().includes('session expired')) && onOpenAuth && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  Log In Again
                </button>
              )}
            </div>
          )}

          {!confirmedBooking && !currentUser && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#facc15' }}>
                <strong>Account Required:</strong> Please sign in to create this reservation.
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Sign In / Register
              </button>
            </div>
          )}

          {!confirmedBooking ? (
            /* Booking Form */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+91 94250 98765"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Vehicle License Plate Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MP 04 CB 4521"
                    style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Vehicle Type
                  </label>
                  <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                    <option value="car">Car / SUV</option>
                    <option value="bike">Two-Wheeler</option>
                    <option value="ev">Electric Vehicle (EV)</option>
                    <option value="handicap">Priority / Accessible</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Estimated Parking Duration
                  </label>
                  <select value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))}>
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours (Standard)</option>
                    <option value={3}>3 Hours</option>
                    <option value={4}>4 Hours</option>
                    <option value={6}>6 Hours (Half Day)</option>
                    <option value={8}>8 Hours (Full Shift)</option>
                    <option value={12}>12 Hours</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Payment Mode
                  </label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="FastTag">FastTag Auto-Debit</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cash">Cash at Kiosk</option>
                  </select>
                </div>
              </div>

              {/* Price Breakdown Card */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tariff Rate ({vehicleType.toUpperCase()}):</span>
                  <span style={{ color: 'var(--text-main)' }}>₹{rate} / hour</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                  <span style={{ color: 'var(--text-main)' }}>{durationHours} Hours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-main)' }}>Total Payable:</span>
                  <span style={{ color: 'var(--color-vacant)' }}>₹{totalAmount}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                {loading ? 'Securing Slot & Generating Dual QRs...' : `Confirm & Pay ₹${totalAmount}`}
              </button>
            </form>
          ) : (
            /* Booking Confirmation & Dual QR Codes */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-vacant)', fontSize: '1.05rem', fontWeight: 700 }}>
                <CheckCircle size={22} />
                <span>Slot Reserved Successfully!</span>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Pass Reference:</span>
                  <strong style={{ color: 'var(--accent-ai)', fontFamily: 'monospace' }}>{confirmedBooking.bookingCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Reserved Slot:</span>
                  <strong style={{ color: 'var(--color-vacant)' }}>{confirmedBooking.slotNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Vehicle Plate:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{confirmedBooking.vehicleNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Payment Status:</span>
                  <span className="badge badge-vacant">₹{confirmedBooking.totalAmount} Paid via {confirmedBooking.paymentMethod}</span>
                </div>
              </div>

              {/* DUAL QR DISPLAY (ENTRY QR & EXIT QR) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Entry QR */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="badge badge-vacant" style={{ marginBottom: '0.75rem', fontSize: '0.7rem' }}>
                    1. SCAN ON ENTRY
                  </span>
                  {confirmedBooking.entryQrImage && (
                    <img 
                      src={confirmedBooking.entryQrImage} 
                      alt="Entry QR" 
                      style={{ width: '130px', height: '130px', borderRadius: '8px', border: '2px solid rgba(16, 185, 129, 0.4)' }}
                    />
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem', marginBottom: 0 }}>
                    Opens barrier & marks slot as Occupied
                  </p>
                </div>

                {/* Exit QR */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className="badge badge-occupied" style={{ marginBottom: '0.75rem', fontSize: '0.7rem' }}>
                    2. SCAN ON EXIT
                  </span>
                  {confirmedBooking.exitQrImage && (
                    <img 
                      src={confirmedBooking.exitQrImage} 
                      alt="Exit QR" 
                      style={{ width: '130px', height: '130px', borderRadius: '8px', border: '2px solid rgba(239, 68, 68, 0.4)' }}
                    />
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem', marginBottom: 0 }}>
                    Settles duration & frees slot for others
                  </p>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => {
                    onClose();
                    if (onGoToPasses) onGoToPasses(confirmedBooking);
                    else if (onGoToKiosk) onGoToKiosk(confirmedBooking);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  <QrCode size={16} />
                  <span>View My QR Pass</span>
                </button>
                <button 
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem' }}
                >
                  Done
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
