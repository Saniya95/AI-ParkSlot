import React, { useState, useEffect } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Clock, Sparkles } from 'lucide-react';

export default function DemandForecastModal({ venue, onClose }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venue) return;
    const fetchForecast = async () => {
      try {
        const res = await fetch(`/api/ai/demand/${venue._id}`);
        const data = await res.json();
        if (data.success) {
          setForecast(data.data);
        }
      } catch (err) {
        console.error('Forecast fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [venue]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.15)', padding: '0.5rem', borderRadius: '8px' }}>
              <TrendingUp size={22} color="var(--accent-ai)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                AI Demand Prediction • {venue.name}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                Predictive occupancy modeling based on historical traffic & category algorithms.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--accent-ai)' }}>
              <Sparkles size={24} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 0.5rem', display: 'block' }} />
              <p style={{ fontSize: '0.85rem' }}>Computing 24-hour neural occupancy curve...</p>
            </div>
          ) : forecast ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Summary card */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Current Congestion Index</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: forecast.demandLevel === 'HIGH_DEMAND' ? 'var(--color-occupied)' : 'var(--color-vacant)' }}>
                      {forecast.currentPredictedOccupancy}%
                    </span>
                    <span className={`badge ${forecast.demandLevel === 'HIGH_DEMAND' ? 'badge-occupied' : 'badge-vacant'}`}>
                      {forecast.demandLevel.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Identified Peak Window</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {forecast.peakHoursSummary}
                  </div>
                </div>
              </div>

              {/* AI Recommendation Advice */}
              <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <Sparkles size={18} color="var(--accent-ai)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                  <strong>AI Travel Advisory:</strong> {forecast.recommendationTip}
                </p>
              </div>

              {/* 24-Hour Visual Bar Histogram */}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  24-Hour Occupancy Forecast:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px', alignItems: 'flex-end', height: '110px', background: 'var(--bg-secondary)', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  {forecast.hourlyForecast.map((hourItem) => {
                    const isCurrent = hourItem.hour === forecast.currentHour;
                    const isHigh = hourItem.predictedOccupancy > 75;

                    return (
                      <div
                        key={hourItem.hour}
                        title={`${hourItem.timeLabel}: ${hourItem.predictedOccupancy}% occupancy`}
                        style={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          alignItems: 'center'
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${hourItem.predictedOccupancy}%`,
                            background: isCurrent 
                              ? 'var(--accent-ai)' 
                              : isHigh 
                              ? 'var(--color-occupied)' 
                              : 'var(--color-vacant)',
                            borderRadius: '2px',
                            transition: 'height 0.3s ease',
                            opacity: isCurrent ? 1 : 0.75
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  <span>00:00 (Midnight)</span>
                  <span>12:00 (Noon)</span>
                  <span>23:00 (Night)</span>
                </div>
              </div>

              <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Close Forecast
              </button>

            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)' }}>No forecast data available.</p>
          )}
        </div>

      </div>
    </div>
  );
}
