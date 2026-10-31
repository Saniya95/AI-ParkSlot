import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Car, 
  Clock, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  ShieldAlert, 
  Edit3, 
  RefreshCw,
  Users,
  Plus,
  Trash2,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';

export default function AdminDashboard({ venues, onRefreshAll, authToken }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?._id || '');
  const [venueSlots, setVenueSlots] = useState([]);
  const [activeSlotModal, setActiveSlotModal] = useState(null);
  const [activeSlotUpcoming, setActiveSlotUpcoming] = useState([]);
  const [updatingSlot, setUpdatingSlot] = useState(false);

  // Rate editing state
  const [editingRatesVenue, setEditingRatesVenue] = useState(null);
  const [newRates, setNewRates] = useState({ car: 40, bike: 20, ev: 60, handicap: 30 });
  const [rateMessage, setRateMessage] = useState('');

  // Location management state
  const [locationList, setLocationList] = useState([]);
  const [locationModal, setLocationModal] = useState(null); // null | 'add' | venueObj
  const [locForm, setLocForm] = useState({
    name: '',
    category: 'mall',
    address: '',
    city: 'Vidisha',
    description: '',
    totalSlots: 16,
    hourlyPrice: 40,
    imageUrl: '',
    isActive: true
  });
  const [uploadMode, setUploadMode] = useState('url'); // 'url' | 'file'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locActionError, setLocActionError] = useState('');
  const [locActionSuccess, setLocActionSuccess] = useState('');

  // Fetch all venues for admin (including inactive)
  const fetchAdminVenues = async () => {
    try {
      const res = await fetch('/api/venues?all=true', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setLocationList(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin venues:', err);
    }
  };

  // Fetch admin stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Registered Users state
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch all registered users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.success && data.users) {
        setRegisteredUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch registered users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch slots for selected venue
  const fetchVenueSlots = async (venueId) => {
    if (!venueId) return;
    try {
      const res = await fetch(`/api/slots/venue/${venueId}`);
      const data = await res.json();
      if (data.success) {
        setVenueSlots(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch venue slots:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAdminVenues();
    fetchUsers();
    if (selectedVenueId) fetchVenueSlots(selectedVenueId);
  }, [selectedVenueId, authToken]);

  // Handle manual slot appointment (Vacant, Occupied, Reserved, Maintenance)
  const handleAppointSlotStatus = async (slotId, status) => {
    setUpdatingSlot(true);
    try {
      const res = await fetch(`/api/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchVenueSlots(selectedVenueId);
        fetchStats();
        if (onRefreshAll) onRefreshAll();
        if (activeSlotModal) {
          setActiveSlotModal(prev => ({ ...prev, status }));
        }
      }
    } catch (err) {
      console.error('Slot status update error:', err);
    } finally {
      setUpdatingSlot(false);
    }
  };

  // Open slot details & fetch upcoming bookings for this specific slot
  const handleOpenSlotModal = async (slot) => {
    setActiveSlotModal(slot);
    try {
      const res = await fetch(`/api/slots/${slot._id}/upcoming`);
      const data = await res.json();
      if (data.success) {
        setActiveSlotUpcoming(data.data);
      }
    } catch (e) {
      setActiveSlotUpcoming([]);
    }
  };

  // Update venue tariff rates
  const handleSaveRates = async (venueId) => {
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/rates`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(newRates)
      });
      const data = await res.json();
      if (data.success) {
        setRateMessage('Tariffs updated successfully!');
        if (onRefreshAll) onRefreshAll();
        setTimeout(() => {
          setRateMessage('');
          setEditingRatesVenue(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Update rates error:', err);
    }
  };

  // Reassign an upcoming booking to a vacant slot
  const handleReassignUpcoming = async (bookingId, newSlotId) => {
    if (!newSlotId) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reassign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ newSlotId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchVenueSlots(selectedVenueId);
        fetchStats();
        if (activeSlotModal) handleOpenSlotModal(activeSlotModal);
        if (onRefreshAll) onRefreshAll();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cancel an upcoming booking as admin
  const handleAdminCancelBooking = async (bookingId) => {
    if (!confirm('Cancel this upcoming reservation and issue full refund?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { 
        method: 'POST',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchVenueSlots(selectedVenueId);
        fetchStats();
        if (activeSlotModal) handleOpenSlotModal(activeSlotModal);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Location Management Handlers
  const openAddLocation = () => {
    setLocForm({
      name: '',
      category: 'mall',
      address: '',
      city: 'Vidisha',
      description: '',
      totalSlots: 16,
      hourlyPrice: 40,
      imageUrl: '',
      isActive: true
    });
    setUploadMode('url');
    setLocActionError('');
    setLocationModal('add');
  };

  const openEditLocation = (venue) => {
    setLocForm({
      name: venue.name,
      category: venue.category || 'mall',
      address: venue.address,
      city: venue.city || 'Vidisha',
      description: venue.description || '',
      totalSlots: venue.totalSlots || 16,
      hourlyPrice: venue.ratesPerHour?.car || 40,
      imageUrl: venue.imageUrl || '',
      isActive: venue.isActive !== false
    });
    setUploadMode('url');
    setLocActionError('');
    setLocationModal(venue);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingImage(true);
      try {
        const res = await fetch('/api/venues/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({
            imageBase64: reader.result,
            filename: file.name
          })
        });
        const data = await res.json();
        if (data.success) {
          setLocForm(prev => ({ ...prev, imageUrl: data.url }));
        } else {
          alert(data.message || 'Image upload failed');
        }
      } catch (err) {
        alert('Upload error: ' + err.message);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocActionError('');
    try {
      const isEditing = locationModal && locationModal !== 'add';
      const url = isEditing ? `/api/venues/${locationModal._id}` : '/api/venues';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          name: locForm.name,
          category: locForm.category,
          address: locForm.address,
          city: locForm.city,
          description: locForm.description,
          totalSlots: Number(locForm.totalSlots),
          hourlyPrice: Number(locForm.hourlyPrice),
          imageUrl: locForm.imageUrl,
          isActive: locForm.isActive
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save location');
      }

      setLocActionSuccess(data.message || 'Location saved successfully!');
      setTimeout(() => setLocActionSuccess(''), 4000);
      setLocationModal(null);
      fetchAdminVenues();
      fetchStats();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      setLocActionError(err.message);
    }
  };

  const handleToggleActive = async (venue) => {
    try {
      const res = await fetch(`/api/venues/${venue._id}/toggle-active`, {
        method: 'PATCH',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminVenues();
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleDeleteLocation = async (venue) => {
    if (!confirm(`Are you sure you want to delete parking location '${venue.name}'? All associated slots will also be removed.`)) {
      return;
    }
    setLocActionError('');
    try {
      const res = await fetch(`/api/venues/${venue._id}`, {
        method: 'DELETE',
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete location');
      }

      setLocActionSuccess(data.message);
      setTimeout(() => setLocActionSuccess(''), 4000);
      fetchAdminVenues();
      fetchStats();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const effectiveVenues = locationList.length > 0 ? locationList : venues;
  const selectedVenue = effectiveVenues.find(v => v._id === selectedVenueId) || effectiveVenues[0] || venues[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Central Admin Management Dashboard
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: 0 }}>
            Full system authority: appoint slot states, manage upcoming reservations, live parking timers, & tariffs.
          </p>
        </div>

        <button 
          onClick={() => {
            fetchStats();
            fetchVenueSlots(selectedVenueId);
            fetchUsers();
            fetchAdminVenues();
          }} 
          className="btn btn-secondary btn-sm"
        >
          <RefreshCw size={14} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Total Network Capacity</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats.stats.totalSlots} Slots
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Across {stats.stats.totalVenues} venues</span>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--color-vacant)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Vacant Spaces</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-vacant)' }}>
              {stats.stats.vacantSlots} Free
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ready for instant booking</span>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--color-occupied)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Occupied / Parked</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-occupied)' }}>
              {stats.stats.occupiedSlots}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vehicles currently parked</span>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--color-reserved)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Upcoming Reservations</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-reserved)' }}>
              {stats.stats.upcomingBookings}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pre-booked from homes</span>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-ai)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>Total Revenue</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-ai)' }}>
              ₹{stats.stats.totalRevenue}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Settled digital payments</span>
          </div>

        </div>
      )}

      {/* Location Management Success / Error Alert */}
      {locActionSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} />
          <span>{locActionSuccess}</span>
        </div>
      )}
      {locActionError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{locActionError}</span>
        </div>
      )}

      {/* Dynamic Parking Locations Management Section */}
      <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Parking Locations Management
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
              Dynamic database management: add new destinations, adjust slot capacity, edit pricing, or toggle active status.
            </p>
          </div>
          <button
            onClick={openAddLocation}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem' }}
          >
            <Plus size={16} />
            <span>Add New Location</span>
          </button>
        </div>

        {effectiveVenues && effectiveVenues.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Location</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Category</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Address</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Total / Free Slots</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Hourly Tariff</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {effectiveVenues.map((venue) => {
                const isActive = venue.isActive !== false;
                return (
                  <tr key={venue._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={venue.imageUrl || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&auto=format&fit=crop&q=60'}
                          alt={venue.name}
                          style={{ width: '42px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                        <div>
                          <strong style={{ color: 'var(--text-main)', display: 'block' }}>{venue.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{venue.city || 'Vidisha'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="badge" style={{ textTransform: 'capitalize', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {venue.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {venue.address}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{venue.totalSlots} Slots</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-vacant)', display: 'block' }}>
                        {venue.vacantSlots !== undefined ? `${venue.vacantSlots} free` : 'Active in DB'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{venue.ratesPerHour?.car || 40}/hr
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <button
                        onClick={() => handleToggleActive(venue)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: 0
                        }}
                        title={`Click to set ${isActive ? 'Inactive' : 'Active'}`}
                      >
                        {isActive ? (
                          <span className="badge badge-vacant" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ToggleRight size={14} /> Active
                          </span>
                        ) : (
                          <span className="badge badge-maint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ToggleLeft size={14} /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEditLocation(venue)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                          title="Edit location details"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(venue)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                          title="Safely delete location"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No parking locations found.</p>
        )}
      </div>

      {/* Registered Users Management Section */}
      <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-ai)" />
              <span>Registered Users</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
              Live database records of registered accounts in MongoDB with verified registration timestamps.
            </p>
          </div>
          <span className="badge badge-ai">
            {registeredUsers.length} Registered Accounts
          </span>
        </div>

        {registeredUsers && registeredUsers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Name / User</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Email Address</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Phone Number</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Role</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Registration Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {registeredUsers.map((user) => (
                <tr key={user._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: user.role === 'admin' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: user.role === 'admin' ? '#facc15' : 'var(--accent-ai)',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block' }}>{user.name}</strong>
                        {user.vehicleNumber && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            {user.vehicleNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                    {user.phone || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`badge ${user.role === 'admin' ? 'badge-ai' : 'badge-vacant'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            {loadingUsers ? 'Loading registered users from database...' : 'No registered users found.'}
          </p>
        )}
      </div>

      {/* Add / Edit Location Modal */}
      {locationModal && (
        <div className="modal-overlay" onClick={() => setLocationModal(null)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {locationModal === 'add' ? 'Add New Parking Location' : `Edit: ${locationModal.name}`}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                  Persistent MongoDB-backed parking facility with auto-generated 2D floor slots.
                </p>
              </div>
              <button onClick={() => setLocationModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {locActionError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{locActionError}</span>
                </div>
              )}

              <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Location Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Super-Specialty Hospital"
                      value={locForm.name}
                      onChange={(e) => setLocForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Category *
                    </label>
                    <select
                      value={locForm.category}
                      onChange={(e) => setLocForm(prev => ({ ...prev, category: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="hospital">Hospital (Emergency Priority)</option>
                      <option value="mall">Mall & Retail</option>
                      <option value="campus">College & Campus</option>
                      <option value="commercial">Commercial & Tech Park</option>
                      <option value="transit">Transit & Transport Hub</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Civil Lines Main Road"
                      value={locForm.address}
                      onChange={(e) => setLocForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Vidisha"
                      value={locForm.city}
                      onChange={(e) => setLocForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of the parking venue, gate barriers, or amenities..."
                    value={locForm.description}
                    onChange={(e) => setLocForm(prev => ({ ...prev, description: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Total Parking Capacity (Slots) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={locForm.totalSlots}
                      onChange={(e) => setLocForm(prev => ({ ...prev, totalSlots: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Auto-generates floor slots in DB
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Hourly Rate (₹ INR) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={locForm.hourlyPrice}
                      onChange={(e) => setLocForm(prev => ({ ...prev, hourlyPrice: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Standard car hourly parking tariff
                    </span>
                  </div>
                </div>

                {/* Image Section */}
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Venue Image
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setUploadMode('url')}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          background: uploadMode === 'url' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                          color: uploadMode === 'url' ? 'var(--accent-ai)' : 'var(--text-dim)'
                        }}
                      >
                        Image URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('file')}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          background: uploadMode === 'file' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                          color: uploadMode === 'file' ? 'var(--accent-ai)' : 'var(--text-dim)'
                        }}
                      >
                        Upload from Computer
                      </button>
                    </div>
                  </div>

                  {uploadMode === 'url' ? (
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or paste image URL"
                      value={locForm.imageUrl}
                      onChange={(e) => setLocForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                      />
                      {uploadingImage && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-ai)', marginLeft: '0.5rem' }}>
                          Uploading...
                        </span>
                      )}
                    </div>
                  )}

                  {locForm.imageUrl && (
                    <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <img
                        src={locForm.imageUrl}
                        alt="Preview"
                        style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Preview</span>
                    </div>
                  )}
                </div>

                {/* Active Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    id="locIsActive"
                    checked={locForm.isActive}
                    onChange={(e) => setLocForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="locIsActive" style={{ fontSize: '0.825rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Active & Available on Public Booking Page
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    {locationModal === 'add' ? 'Create Location' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationModal(null)}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Live Active Parked Vehicles Table (Live Timers & Running Cost) */}
      <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Live Active Parked Vehicles (Time Occupied & Bill Monitor)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
              Real-time monitoring of vehicles occupying slots, parked duration, and accrued charges.
            </p>
          </div>
          <span className="badge badge-occupied">
            {stats?.activeVehicles?.length || 0} Vehicles Inside
          </span>
        </div>

        {stats?.activeVehicles?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Slot</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Vehicle Plate</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Driver</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Venue</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Check-In Time</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Occupied Time</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Current Cost</th>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.activeVehicles.map((vehicle) => (
                <tr key={vehicle._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: 'var(--color-occupied)' }}>
                    {vehicle.slotNumber}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                    {vehicle.vehicleNumber}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                    {vehicle.userName}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)' }}>
                    {vehicle.venueId?.name}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                    {vehicle.checkInTime ? new Date(vehicle.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-ai)', fontWeight: 600 }}>
                    {vehicle.minutesParked} mins ({Math.ceil(vehicle.minutesParked / 60 * 10) / 10} hrs)
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--color-vacant)' }}>
                    ₹{vehicle.liveEstimatedCost}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleAppointSlotStatus(vehicle.slotId?._id || vehicle.slotId, 'vacant')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                      title="Force Free Slot"
                    >
                      Force Free
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: '1rem 0' }}>
            No vehicles currently parked inside. Scan an Entry QR in the Gate Kiosk to test.
          </p>
        )}
      </div>

      {/* Manual Slot Manager (Appoint space as Vacant, Occupied, Reserved, Maintenance) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Slot Manager & State Appointer
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
              Click any slot to manually appoint its status or view upcoming reservations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Select Venue:</span>
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              {venues.map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Slot Grid for Admin Selection */}
        <div className="slot-grid">
          {venueSlots.map((slot) => {
            const hasUpcoming = slot.upcomingBookings && slot.upcomingBookings.length > 0;

            return (
              <div
                key={slot._id}
                className={`slot-item ${slot.status}`}
                onClick={() => handleOpenSlotModal(slot)}
                style={{ padding: '0.85rem 0.5rem', minHeight: '110px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  <span>{slot.floor?.split(' ')[0]}</span>
                  <span style={{ textTransform: 'capitalize' }}>{slot.type}</span>
                </div>

                <div style={{ margin: '0.35rem 0' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {slot.slotNumber}
                  </div>
                  {slot.activeVehicleNumber && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-ai)', fontFamily: 'monospace' }}>
                      {slot.activeVehicleNumber}
                    </div>
                  )}
                </div>

                <div style={{ width: '100%' }}>
                  <span className={`badge badge-${slot.status}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                    {slot.status}
                  </span>
                  {hasUpcoming && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--color-reserved)', marginTop: '2px' }}>
                      ● {slot.upcomingBookings.length} upcoming
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tariff Pricing Manager */}
      {selectedVenue && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Dynamic Tariff & Rate Configuration ({selectedVenue.name})
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
                Update hourly pricing for peak/off-peak adjustments.
              </p>
            </div>
            {rateMessage && (
              <span className="badge badge-vacant">{rateMessage}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                🚗 Car Rate (₹/hr)
              </label>
              <input
                type="number"
                defaultValue={selectedVenue.ratesPerHour?.car || 40}
                onChange={(e) => setNewRates(prev => ({ ...prev, car: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                🛵 Two-Wheeler Rate (₹/hr)
              </label>
              <input
                type="number"
                defaultValue={selectedVenue.ratesPerHour?.bike || 20}
                onChange={(e) => setNewRates(prev => ({ ...prev, bike: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                ⚡ EV Charging Bay Rate (₹/hr)
              </label>
              <input
                type="number"
                defaultValue={selectedVenue.ratesPerHour?.ev || 60}
                onChange={(e) => setNewRates(prev => ({ ...prev, ev: Number(e.target.value) }))}
              />
            </div>
            <div>
              <button
                onClick={() => handleSaveRates(selectedVenue._id)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Save New Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Slot Override Modal */}
      {activeSlotModal && (
        <div className="modal-overlay" onClick={() => setActiveSlotModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Manage Slot {activeSlotModal.slotNumber}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                  {activeSlotModal.floor} • {activeSlotModal.section} ({activeSlotModal.type})
                </p>
              </div>
              <span className={`badge badge-${activeSlotModal.status}`}>
                {activeSlotModal.status}
              </span>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Appoint Status Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                  Admin Action: Appoint Slot State:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    onClick={() => handleAppointSlotStatus(activeSlotModal._id, 'vacant')}
                    disabled={updatingSlot}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--color-vacant)', color: 'var(--color-vacant)' }}
                  >
                    Set as VACANT
                  </button>
                  <button
                    onClick={() => handleAppointSlotStatus(activeSlotModal._id, 'occupied')}
                    disabled={updatingSlot}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--color-occupied)', color: 'var(--color-occupied)' }}
                  >
                    Set as OCCUPIED
                  </button>
                  <button
                    onClick={() => handleAppointSlotStatus(activeSlotModal._id, 'reserved')}
                    disabled={updatingSlot}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--color-reserved)', color: 'var(--color-reserved)' }}
                  >
                    Set as RESERVED
                  </button>
                  <button
                    onClick={() => handleAppointSlotStatus(activeSlotModal._id, 'maintenance')}
                    disabled={updatingSlot}
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--color-maint)', color: 'var(--color-maint)' }}
                  >
                    Set to MAINTENANCE
                  </button>
                </div>
              </div>

              {/* Upcoming Bookings for this slot */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Manage Upcoming Bookings on Slot {activeSlotModal.slotNumber}:
                </label>
                {activeSlotUpcoming.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeSlotUpcoming.map(b => (
                      <div 
                        key={b._id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          fontSize: '0.825rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{b.userName}</strong>
                          <span style={{ color: 'var(--accent-ai)', fontFamily: 'monospace' }}>{b.vehicleNumber}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '0.65rem' }}>
                          <span>Arriving: {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="badge badge-reserved" style={{ fontSize: '0.65rem' }}>{b.bookingCode}</span>
                        </div>

                        {/* Admin Action: Reassign or Cancel this upcoming booking */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReassignUpcoming(b._id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', flex: 1 }}
                          >
                            <option value="">Move to Vacant Slot...</option>
                            {venueSlots
                              .filter(s => s.status === 'vacant' && s._id !== activeSlotModal._id)
                              .map(vac => (
                                <option key={vac._id} value={vac._id}>
                                  Slot {vac.slotNumber} ({vac.floor})
                                </option>
                              ))}
                          </select>

                          <button
                            onClick={() => handleAdminCancelBooking(b._id)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            Cancel & Refund
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', margin: 0 }}>
                    No upcoming bookings scheduled for this slot. When a driver exits, this slot will automatically turn Vacant!
                  </p>
                )}
              </div>

              <button
                onClick={() => setActiveSlotModal(null)}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
