import React from 'react';
import { 
  QrCode, 
  Car, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function MyBookings({ bookings, onSimulateScan, onRefresh, onCancelBooking, currentUser }) {
  if (!bookings || bookings.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <QrCode size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          No Active Parking Passes Yet
        </h3>
        <p style={{ color: 'var(--text-dim)', maxWidth: '450px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          Explore destinations like District Hospital or Metropolis Mall and reserve a slot while sitting comfortably at home!
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            My Digital Parking Passes
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
            Your dedicated Entry and Exit QR codes for automated barrier verification.
          </p>
        </div>
        <button onClick={onRefresh} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          <span>Refresh Passes</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {bookings.map((b) => {
          const isActive = b.status === 'active';
          const isBooked = b.status === 'booked';
          const isCompleted = b.status === 'completed';
          const isCancelled = b.status === 'cancelled';

          return (
            <div 
              key={b._id} 
              className="card"
              style={{
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(22, 28, 43, 0.95))' 
                  : 'var(--bg-card)',
                borderColor: isActive ? 'rgba(14, 165, 233, 0.4)' : 'var(--border-subtle)',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Slot {b.slotNumber}
                    </span>
                    <span className={`badge ${
                      isActive ? 'badge-occupied' : isBooked ? 'badge-reserved' : isCompleted ? 'badge-vacant' : 'badge-maint'
                    }`}>
                      {isActive ? '● Currently Parked' : isBooked ? 'Upcoming Reserved' : isCompleted ? 'Completed' : 'Cancelled'}
                    </span>
                    <span className="badge badge-ai" style={{ fontFamily: 'monospace' }}>
                      {b.bookingCode}
                    </span>
                  </div>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
                    <MapPin size={14} />
                    <span>{b.venueId?.name || 'Selected Venue'}</span>
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-vacant)' }}>
                    ₹{b.finalAmount || b.totalAmount}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Paid via {b.paymentMethod || 'UPI'}
                  </span>
                </div>
              </div>

              {/* Pass Content: Left Details, Right Dual QRs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                
                {/* Booking info details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Driver Name:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{b.userName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Vehicle Plate:</span>
                    <strong style={{ color: 'var(--accent-ai)', fontFamily: 'monospace' }}>{b.vehicleNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Vehicle Type:</span>
                    <span style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{b.vehicleType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Reserved Window:</span>
                    <span style={{ color: 'var(--text-main)' }}>
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({b.estimatedHours} hrs)
                    </span>
                  </div>
                  {b.checkInTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Gate Check-In:</span>
                      <span style={{ color: 'var(--color-vacant)' }}>
                        {new Date(b.checkInTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {b.checkOutTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Gate Check-Out:</span>
                      <span style={{ color: 'var(--color-occupied)' }}>
                        {new Date(b.checkOutTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* DUAL QR DISPLAY & SIMULATE BUTTONS */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  
                  {/* Entry QR Container */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    textAlign: 'center',
                    maxWidth: '180px',
                    opacity: isCompleted || isCancelled ? 0.4 : 1
                  }}>
                    <span className="badge badge-vacant" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                      ENTRY QR
                    </span>
                    {b.entryQrImage && (
                      <img src={b.entryQrImage} alt="Entry QR" style={{ width: '110px', height: '110px', borderRadius: '6px', margin: '0 auto', display: 'block' }} />
                    )}
                    {currentUser?.role === 'admin' ? (
                      <button
                        onClick={() => onSimulateScan('entry', b)}
                        disabled={isActive || isCompleted || isCancelled}
                        className="btn btn-success btn-sm"
                        style={{ marginTop: '0.65rem', width: '100%', fontSize: '0.72rem', padding: '0.35rem 0.5rem' }}
                      >
                        {isActive ? 'Entered' : 'Simulate Entry'}
                      </button>
                    ) : (
                      <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.72rem', color: isActive ? 'var(--color-vacant)' : 'var(--text-dim)' }}>
                        {isActive ? '✓ Checked In' : isCompleted ? 'Completed' : 'Scan at Entry Gate'}
                      </span>
                    )}
                  </div>

                  {/* Exit QR Container */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    textAlign: 'center',
                    maxWidth: '180px',
                    opacity: isCompleted || isCancelled ? 0.4 : 1
                  }}>
                    <span className="badge badge-occupied" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                      EXIT QR
                    </span>
                    {b.exitQrImage && (
                      <img src={b.exitQrImage} alt="Exit QR" style={{ width: '110px', height: '110px', borderRadius: '6px', margin: '0 auto', display: 'block' }} />
                    )}
                    {currentUser?.role === 'admin' ? (
                      <button
                        onClick={() => onSimulateScan('exit', b)}
                        disabled={!isActive}
                        className="btn btn-danger btn-sm"
                        style={{ marginTop: '0.65rem', width: '100%', fontSize: '0.72rem', padding: '0.35rem 0.5rem' }}
                      >
                        {isCompleted ? 'Exited' : 'Simulate Exit'}
                      </button>
                    ) : (
                      <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.72rem', color: isCompleted ? 'var(--color-vacant)' : isActive ? 'var(--color-occupied)' : 'var(--text-dim)' }}>
                        {isCompleted ? '✓ Completed' : isActive ? 'Scan at Exit Gate' : 'Awaiting Entry'}
                      </span>
                    )}
                  </div>

                </div>

              </div>

              {/* Cancel Button if upcoming */}
              {isBooked && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => onCancelBooking(b._id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Cancel Booking & Refund
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
