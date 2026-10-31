import React, { useState } from 'react';
import { 
  Building2, 
  Hospital, 
  ShoppingBag, 
  GraduationCap, 
  MapPin, 
  Zap, 
  Clock, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Search
} from 'lucide-react';

export default function VenueList({ venues, onSelectVenue, onCheckDemand }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hospital': return <Hospital size={18} color="#ef4444" />;
      case 'mall': return <ShoppingBag size={18} color="#ec4899" />;
      case 'campus': return <GraduationCap size={18} color="#3b82f6" />;
      default: return <Building2 size={18} color="#10b981" />;
    }
  };

  const filteredVenues = venues.filter((v) => {
    if (v.isActive === false) return false;
    const matchesFilter = filter === 'all' || v.category === filter;
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          v.address.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      {/* Hero Banner with value prop */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(22, 28, 43, 0.9), rgba(15, 23, 42, 0.9))',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '750px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>
            <Sparkles size={14} />
            <span>AI-Driven Parking Pre-Booking • Zero Waiting Time</span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.25, marginBottom: '0.75rem' }}>
            Rest At Home. Reserve Your Spot. Drive In With Zero Hassle.
          </h1>
          <p style={{ fontSize: '0.975rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Heading to the hospital, shopping mall, or college campus? Check real-time vacancy from your couch, reserve guaranteed parking, and pass through gate barriers with automated Dual QR & ALPR plate scanning.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Destinations' },
            { id: 'hospital', label: 'Hospitals (Emergency Priority)' },
            { id: 'mall', label: 'Malls & Retail' },
            { id: 'campus', label: 'Colleges & Campuses' },
            { id: 'commercial', label: 'Tech Parks & Transit' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="btn btn-secondary btn-sm"
              style={{
                borderRadius: '9999px',
                borderColor: filter === tab.id ? 'var(--accent-ai)' : 'var(--border-subtle)',
                background: filter === tab.id ? 'rgba(14, 165, 233, 0.15)' : 'var(--bg-secondary)',
                color: filter === tab.id ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search destination or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Venues Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredVenues.map((venue) => {
          const occupancy = venue.occupancyPercentage || 0;
          const isHighDemand = occupancy > 70;

          return (
            <div 
              key={venue._id} 
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                overflow: 'hidden',
                padding: '0',
                border: '1px solid var(--border-subtle)'
              }}
              onClick={() => onSelectVenue(venue)}
            >
              {/* Image banner */}
              <div style={{ position: 'relative', height: '140px', background: '#1e293b' }}>
                <img 
                  src={venue.imageUrl || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=60'} 
                  alt={venue.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem' }}>
                  <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {getCategoryIcon(venue.category)}
                    <span style={{ textTransform: 'capitalize' }}>{venue.category}</span>
                  </span>
                </div>

                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCheckDemand(venue);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(4px)',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.72rem',
                      borderColor: 'rgba(14, 165, 233, 0.4)'
                    }}
                    title="View AI Demand Prediction Forecast"
                  >
                    <TrendingUp size={13} color="var(--accent-ai)" />
                    <span style={{ color: 'var(--accent-ai)' }}>AI Forecast</span>
                  </button>
                </div>
              </div>

              {/* Venue Info */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flexGrow: 1 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {venue.name}
                  </h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--text-dim)' }}>
                    <MapPin size={14} />
                    <span>{venue.address}</span>
                  </p>
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {venue.description}
                </p>

                {/* Real-time Occupancy Indicator */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Live Vacancy</span>
                    <span style={{ fontWeight: 700, color: venue.vacantSlots > 0 ? 'var(--color-vacant)' : 'var(--color-occupied)' }}>
                      {venue.vacantSlots} / {venue.totalSlots} Slots Free
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${occupancy}%`, 
                        height: '100%', 
                        background: isHighDemand ? 'var(--color-occupied)' : 'var(--color-vacant)',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>

                {/* Rates & Amenities */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Rates from: </span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>₹{venue.ratesPerHour?.car || 40}</strong>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/hr</span>
                  </div>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-ai)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Select Slot <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
