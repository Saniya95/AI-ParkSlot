import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Car, 
  Bike, 
  Zap, 
  Accessibility, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Compass, 
  Layers, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export default function SlotGrid({ 
  venue, 
  slots, 
  onBack, 
  onSelectSlot, 
  onRunAiRecommend,
  aiRecommendation,
  loadingAi
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');

  const filteredSlots = slots.filter((s) => {
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    const matchesFloor = floorFilter === 'all' || s.floor === floorFilter;
    return matchesType && matchesFloor;
  });

  const getSlotTypeIcon = (type) => {
    switch (type) {
      case 'bike': return <Bike size={18} />;
      case 'ev': return <Zap size={18} color="#0ea5e9" />;
      case 'handicap': return <Accessibility size={18} color="#f59e0b" />;
      default: return <Car size={18} />;
    }
  };

  const floors = ['all', ...new Set(slots.map(s => s.floor))];

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to All Venues</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-vacant)' }} />
              <span>Vacant ({slots.filter(s => s.status === 'vacant').length})</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-reserved)' }} />
              <span>Reserved ({slots.filter(s => s.status === 'reserved').length})</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-occupied)' }} />
              <span>Occupied ({slots.filter(s => s.status === 'occupied').length})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Venue Overview & AI Recommendation Trigger Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-secondary))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{venue.name}</h2>
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{venue.category}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>{venue.address}</p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>🚗 Car: ₹{venue.ratesPerHour?.car}/hr</span>
              <span>🛵 Bike: ₹{venue.ratesPerHour?.bike}/hr</span>
              <span>⚡ EV Charging: ₹{venue.ratesPerHour?.ev}/hr</span>
            </div>
          </div>

          {/* AI Recommender Trigger */}
          <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-ai)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Sparkles size={16} />
                <span>AI Intelligent Slot Recommender</span>
              </span>
              <button 
                onClick={onRunAiRecommend} 
                disabled={loadingAi}
                className="btn btn-primary btn-sm"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                {loadingAi ? 'Analyzing...' : 'Find Best Slot'}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Evaluates proximity to entrance/emergency OPD, EV charging ports, and zone traffic to pick your optimal space.
            </p>

            {/* AI Recommendation Result Box */}
            {aiRecommendation && aiRecommendation.recommendedSlot && (
              <div style={{ marginTop: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--accent-ai)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--accent-ai)', fontWeight: 700, fontSize: '0.9rem' }}>
                    Recommended: Slot {aiRecommendation.recommendedSlot.slotNumber}
                  </span>
                  <span className="badge badge-ai" style={{ fontSize: '0.7rem' }}>
                    Score: {aiRecommendation.score}%
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {aiRecommendation.reasoning}
                </p>
                <button
                  onClick={() => onSelectSlot(aiRecommendation.recommendedSlot)}
                  className="btn btn-success btn-sm"
                  style={{ width: '100%', fontSize: '0.78rem' }}
                >
                  Book Recommended Slot Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Vehicle Type Filters */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Slots' },
            { id: 'car', label: 'Cars', icon: Car },
            { id: 'bike', label: 'Two-Wheelers', icon: Bike },
            { id: 'ev', label: 'EV Charging', icon: Zap },
            { id: 'handicap', label: 'Accessible / Priority', icon: Accessibility }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className="btn btn-secondary btn-sm"
                style={{
                  borderRadius: '9999px',
                  borderColor: typeFilter === tab.id ? 'var(--accent-ai)' : 'var(--border-subtle)',
                  background: typeFilter === tab.id ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg-secondary)',
                  color: typeFilter === tab.id ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Floor Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={15} color="var(--text-dim)" />
          <select 
            value={floorFilter} 
            onChange={(e) => setFloorFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.35rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
          >
            {floors.map((fl) => (
              <option key={fl} value={fl}>
                {fl === 'all' ? 'All Floors / Levels' : fl}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Slot Lifecycle Explainer Notice */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.65rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Sparkles size={15} color="var(--accent-ai)" />
          <span><strong>Lifecycle Guarantee:</strong> Booking from home immediately locks the slot in <strong>RESERVED</strong> hold. Only becomes <strong>OCCUPIED</strong> when your Entry QR is scanned at the gate barrier.</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-vacant" style={{ fontSize: '0.68rem' }}>1. Vacant (Bookable)</span>
          <span className="badge badge-reserved" style={{ fontSize: '0.68rem' }}>2. Reserved (In-Transit)</span>
          <span className="badge badge-occupied" style={{ fontSize: '0.68rem' }}>3. Occupied (Parked)</span>
        </div>
      </div>

      {/* Interactive Slot Grid */}
      <div className="slot-grid">
        {filteredSlots.map((slot) => {
          const isVacant = slot.status === 'vacant';
          const isReserved = slot.status === 'reserved';
          const isOccupied = slot.status === 'occupied';
          const isRecommended = aiRecommendation?.recommendedSlot?._id === slot._id;

          let statusClass = 'vacant';
          let statusBadge = <span className="badge badge-vacant">Vacant</span>;

          if (isReserved) {
            statusClass = 'reserved';
            statusBadge = <span className="badge badge-reserved">Reserved (In-Transit)</span>;
          } else if (isOccupied) {
            statusClass = 'occupied';
            statusBadge = <span className="badge badge-occupied">Occupied (Parked)</span>;
          } else if (slot.status === 'maintenance') {
            statusClass = 'maintenance';
            statusBadge = <span className="badge badge-maint">Maintenance</span>;
          }

          return (
            <div
              key={slot._id}
              className={`slot-item ${statusClass} ${isRecommended ? 'ai-recommended ai-pulse' : ''}`}
              onClick={() => {
                if (isVacant) {
                  onSelectSlot(slot);
                } else if (isReserved) {
                  alert(`Slot ${slot.slotNumber} is currently RESERVED for vehicle ${slot.activeVehicleNumber || 'in-transit'}. Please choose a vacant green slot or use AI Recommendations!`);
                } else if (isOccupied) {
                  alert(`Slot ${slot.slotNumber} is currently OCCUPIED by a vehicle inside the facility.`);
                }
              }}
              style={{
                cursor: isVacant ? 'pointer' : 'not-allowed',
                opacity: isVacant ? 1 : 0.8
              }}
            >
              {/* Top slot header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {slot.floor.replace('Floor', '').trim()}
                </span>
                <span style={{ color: isRecommended ? 'var(--accent-ai)' : 'var(--text-muted)' }}>
                  {getSlotTypeIcon(slot.type)}
                </span>
              </div>

              {/* Slot Code */}
              <div style={{ margin: '0.4rem 0' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.05em' }}>
                  {slot.slotNumber}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {slot.distanceFromEntrance}m from Gate
                </div>
                {slot.activeVehicleNumber && (
                  <div style={{ fontSize: '0.68rem', color: isOccupied ? 'var(--color-occupied)' : 'var(--color-reserved)', marginTop: '2px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {slot.activeVehicleNumber}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div style={{ width: '100%' }}>
                {statusBadge}
                {isVacant && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-vacant)', marginTop: '4px', fontWeight: 600 }}>
                    Click to Book
                  </div>
                )}
                {isReserved && (
                  <div style={{ fontSize: '0.64rem', color: 'var(--color-reserved)', marginTop: '3px' }}>
                    Held for Driver
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
