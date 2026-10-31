import React, { useState } from 'react';
import { 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Scan, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Car,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function GateKiosk({ venues, bookings, onRefresh, authToken }) {
  const [activeKioskMode, setActiveKioskMode] = useState('entry'); // 'entry' | 'exit' | 'alpr'
  
  // Entry terminal states
  const [entryCode, setEntryCode] = useState('');
  const [entryResult, setEntryResult] = useState(null);
  const [entryLoading, setEntryLoading] = useState(false);

  // Exit terminal states
  const [exitCode, setExitCode] = useState('');
  const [exitResult, setExitResult] = useState(null);
  const [exitLoading, setExitLoading] = useState(false);

  // ALPR states
  const [plateInput, setPlateInput] = useState('MP 04 ZB 8899');
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?._id || '');
  const [alprResult, setAlprResult] = useState(null);
  const [alprLoading, setAlprLoading] = useState(false);

  // Active parked bookings for quick test selection
  const activeBookings = bookings.filter(b => b.status === 'active');
  const upcomingBookings = bookings.filter(b => b.status === 'booked');

  // Handle Entry QR Scan
  const handleEntryScan = async (codeToUse) => {
    const code = codeToUse || entryCode;
    if (!code.trim()) return;

    setEntryLoading(true);
    setEntryResult(null);

    try {
      const res = await fetch('/api/scan/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ bookingCode: code.trim(), operator: 'Kiosk Barrier Scanner A' })
      });

      const data = await res.json();
      setEntryResult(data);
      if (data.success && onRefresh) onRefresh();
    } catch (err) {
      setEntryResult({ success: false, message: err.message });
    } finally {
      setEntryLoading(false);
    }
  };

  // Handle Exit QR Scan
  const handleExitScan = async (codeToUse) => {
    const code = codeToUse || exitCode;
    if (!code.trim()) return;

    setExitLoading(true);
    setExitResult(null);

    try {
      const res = await fetch('/api/scan/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ bookingCode: code.trim(), operator: 'Exit Gate Barrier B' })
      });

      const data = await res.json();
      setExitResult(data);
      if (data.success && onRefresh) onRefresh();
    } catch (err) {
      setExitResult({ success: false, message: err.message });
    } finally {
      setExitLoading(false);
    }
  };

  // Handle ALPR Plate Recognition
  const handleVerifyPlate = async () => {
    if (!plateInput.trim() || !selectedVenueId) return;

    setAlprLoading(true);
    setAlprResult(null);

    try {
      const res = await fetch('/api/ai/verify-plate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ plateNumber: plateInput.trim(), venueId: selectedVenueId })
      });

      const data = await res.json();
      setAlprResult(data);
    } catch (err) {
      setAlprResult({ verified: false, message: err.message });
    } finally {
      setAlprLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Gate Barrier Kiosk & Dual QR Scanner
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
          Dedicated entry and exit barrier terminals with real-time slot state management & computer vision verification.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveKioskMode('entry')}
          className="btn btn-secondary"
          style={{
            borderColor: activeKioskMode === 'entry' ? 'var(--color-vacant)' : 'var(--border-subtle)',
            background: activeKioskMode === 'entry' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
            color: activeKioskMode === 'entry' ? 'var(--color-vacant)' : 'var(--text-muted)'
          }}
        >
          <LogIn size={16} />
          <span>Entry Terminal (Scan Entry QR)</span>
        </button>

        <button
          onClick={() => setActiveKioskMode('exit')}
          className="btn btn-secondary"
          style={{
            borderColor: activeKioskMode === 'exit' ? 'var(--color-occupied)' : 'var(--border-subtle)',
            background: activeKioskMode === 'exit' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
            color: activeKioskMode === 'exit' ? 'var(--color-occupied)' : 'var(--text-muted)'
          }}
        >
          <LogOut size={16} />
          <span>Exit Terminal (Scan Exit QR)</span>
        </button>

        <button
          onClick={() => setActiveKioskMode('alpr')}
          className="btn btn-secondary"
          style={{
            borderColor: activeKioskMode === 'alpr' ? 'var(--accent-ai)' : 'var(--border-subtle)',
            background: activeKioskMode === 'alpr' ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
            color: activeKioskMode === 'alpr' ? 'var(--accent-ai)' : 'var(--text-muted)'
          }}
        >
          <Camera size={16} />
          <span>ALPR Computer Vision Plate Match</span>
        </button>
      </div>

      {/* 1. ENTRY TERMINAL */}
      {activeKioskMode === 'entry' && (
        <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), var(--bg-card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
              <LogIn size={20} color="var(--color-vacant)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Gate 1 • Entry Kiosk
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                Scanned on entering. Validates reservation, unlocks boom barrier, and marks slot as Occupied.
              </p>
            </div>
          </div>

          {/* Quick Select Upcoming Booking for Testing */}
          {upcomingBookings.length > 0 && (
            <div style={{ marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                ⚡ One-Click Test: Pick an upcoming driver arriving right now:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {upcomingBookings.slice(0, 4).map(b => (
                  <button
                    key={b._id}
                    onClick={() => {
                      setEntryCode(b.bookingCode);
                      handleEntryScan(b.bookingCode);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    <span>{b.userName} ({b.vehicleNumber} • Slot {b.slotNumber})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Scan Entry QR or enter Booking Code (e.g. APS-384912)"
              value={entryCode}
              onChange={(e) => setEntryCode(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
            />
            <button
              onClick={() => handleEntryScan()}
              disabled={entryLoading}
              className="btn btn-success"
              style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }}
            >
              <Scan size={16} />
              <span>{entryLoading ? 'Scanning...' : 'Verify Entry'}</span>
            </button>
          </div>

          {/* Entry Scan Result View */}
          {entryResult && (
            <div style={{
              background: entryResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${entryResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {entryResult.success ? <CheckCircle size={20} color="var(--color-vacant)" /> : <AlertTriangle size={20} color="var(--color-occupied)" />}
                <strong style={{ color: entryResult.success ? 'var(--color-vacant)' : 'var(--color-occupied)', fontSize: '1rem' }}>
                  {entryResult.message}
                </strong>
              </div>

              {entryResult.booking && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Assigned Slot</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{entryResult.booking.slotNumber}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Vehicle Plate</span>
                    <strong style={{ color: 'var(--accent-ai)', fontFamily: 'monospace' }}>{entryResult.booking.vehicleNumber}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Barrier Status</span>
                    <strong style={{ color: 'var(--color-vacant)' }}>🟢 Barrier OPEN</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Slot Status Updated</span>
                    <span className="badge badge-occupied">Marked as Occupied</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. EXIT TERMINAL */}
      {activeKioskMode === 'exit' && (
        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.04), var(--bg-card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
              <LogOut size={20} color="var(--color-occupied)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Gate 2 • Exit Kiosk
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                Scanned on exiting. Calculates parked duration & settles bill.
                <strong style={{ color: 'var(--accent-ai)', display: 'block' }}>
                  Rule: Slot is marked as VACANT only if there is no upcoming booking on that place!
                </strong>
              </p>
            </div>
          </div>

          {/* Quick Select Currently Parked Vehicles */}
          {activeBookings.length > 0 && (
            <div style={{ marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                🚗 One-Click Test: Pick an active parked vehicle to exit:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {activeBookings.map(b => (
                  <button
                    key={b._id}
                    onClick={() => {
                      setExitCode(b.bookingCode);
                      handleExitScan(b.bookingCode);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  >
                    <span>{b.userName} ({b.vehicleNumber} • Slot {b.slotNumber})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Scan Exit QR or enter Booking Code (e.g. APS-712891)"
              value={exitCode}
              onChange={(e) => setExitCode(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}
            />
            <button
              onClick={() => handleExitScan()}
              disabled={exitLoading}
              className="btn btn-danger"
              style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }}
            >
              <Scan size={16} />
              <span>{exitLoading ? 'Calculating...' : 'Verify Exit'}</span>
            </button>
          </div>

          {/* Exit Scan Result View */}
          {exitResult && (
            <div style={{
              background: exitResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${exitResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {exitResult.success ? <CheckCircle size={20} color="var(--color-vacant)" /> : <AlertTriangle size={20} color="var(--color-occupied)" />}
                <strong style={{ color: exitResult.success ? 'var(--color-vacant)' : 'var(--color-occupied)', fontSize: '1rem' }}>
                  {exitResult.message}
                </strong>
              </div>

              {exitResult.booking && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Parked Duration</span>
                    <strong style={{ color: 'var(--text-main)' }}>{exitResult.booking.actualHours} Hours</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Final Payment</span>
                    <strong style={{ color: 'var(--color-vacant)' }}>₹{exitResult.booking.finalAmount} (Settled)</strong>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Slot Status Transition</span>
                    <span className={`badge ${exitResult.slotStatusAfterExit === 'vacant' ? 'badge-vacant' : 'badge-reserved'}`}>
                      {exitResult.slotStatusAfterExit.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block' }}>Upcoming Booking Check</span>
                    <strong style={{ color: exitResult.upcomingBookingSummary ? 'var(--color-reserved)' : 'var(--color-vacant)', fontSize: '0.8rem' }}>
                      {exitResult.upcomingBookingSummary 
                        ? `Yes: ${exitResult.upcomingBookingSummary.bookingCode}` 
                        : 'None: Area marked Vacant'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. ALPR COMPUTER VISION TERMINAL */}
      {activeKioskMode === 'alpr' && (
        <div className="card" style={{ border: '1px solid rgba(14, 165, 233, 0.4)', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.04), var(--bg-card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
              <Camera size={20} color="var(--accent-ai)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Automatic License Plate Recognition (ALPR/OCR)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                Computer vision camera captures vehicle license plate and checks database for active or upcoming reservations.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Detected Vehicle Plate Number:
              </label>
              <input
                type="text"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                placeholder="e.g. MP 04 ZB 8899"
                style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.05em' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Gate Camera Location:
              </label>
              <select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)}>
                {venues.map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {['MP 04 ZB 8899', 'MP 04 CB 4521', 'MP 04 CD 3344', 'MH 12 AB 9988'].map(p => (
              <button
                key={p}
                onClick={() => setPlateInput(p)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleVerifyPlate}
            disabled={alprLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            <Sparkles size={16} />
            <span>{alprLoading ? 'Processing Computer Vision OCR...' : 'Run ALPR Gate Match'}</span>
          </button>

          {/* ALPR Result */}
          {alprResult && (
            <div style={{
              marginTop: '1.25rem',
              background: alprResult.verified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${alprResult.verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: alprResult.verified ? 'var(--color-vacant)' : 'var(--color-occupied)' }}>
                  {alprResult.verified ? 'Plate Verified • Booking Active' : 'Unregistered Vehicle'}
                </span>
                <span className="badge badge-ai">
                  Confidence: {alprResult.matchConfidence}%
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                {alprResult.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
