import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../Services/api';

const OrganizationProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    sector: '',
    address: '',
    phone: '',
    dateOfFoundation: '',
    description: '',
    size: '',
    website: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get('/users/me');
      const data = response.data;
      setProfile({
        name: data.name || '',
        email: data.email || '',
        sector: data.sector || '',
        address: data.address || '',
        phone: data.phone || '',
        dateOfFoundation: data.dateOfFoundation || '',
        description: data.description || '',
        size: data.size || '',
        website: data.website || '',
      });
      // If no sector yet — it's a new profile
      if (!data.sector) setIsNewProfile(true);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile.sector) { setError('Please select a sector'); return; }
    if (!profile.name) { setError('Organization name is required'); return; }

    try {
      setSaving(true);
      setError('');

      // Save profile
      await API.put('/users/me', profile);

      // If new profile — auto-create this year's evaluation
      if (isNewProfile) {
        const currentYear = new Date().getFullYear();
        await API.post('/evaluations', {
          name: `Annual ${currentYear}`,
          period: `Annual ${currentYear}`,
          description: `Governance evaluation for ${currentYear}`,
        });
        setSuccess('Profile saved! Your annual evaluation has been created.');
        setTimeout(() => navigate('/organization/dashboard'), 1500);
      } else {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const styles = {
    page: { minHeight: '100vh', background: '#f9fafb', padding: '32px 24px' },
    container: { maxWidth: '720px', margin: '0 auto' },
    header: { marginBottom: '32px' },
    title: { fontSize: '26px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' },
    subtitle: { fontSize: '15px', color: '#6b7280' },
    card: { background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '20px' },
    sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    fullWidth: { gridColumn: '1 / -1' },
    formGroup: { marginBottom: '0' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
    select: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white', cursor: 'pointer' },
    textarea: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' },
    error: { padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' },
    success: { padding: '12px 16px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontSize: '14px', marginBottom: '20px' },
    newBanner: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', color: 'white' },
    bannerTitle: { fontSize: '18px', fontWeight: '700', marginBottom: '6px' },
    bannerText: { fontSize: '14px', opacity: 0.9 },
    submitBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    cancelBtn: { padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginRight: '12px' },
    required: { color: '#dc2626', marginLeft: '2px' },
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⏳</div><p>Loading profile...</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏢 Organization Profile</h1>
          <p style={styles.subtitle}>
            {isNewProfile
              ? 'Complete your profile to activate your annual governance evaluation.'
              : 'Manage your organization information.'}
          </p>
        </div>

        {/* New profile banner */}
        {isNewProfile && (
          <div style={styles.newBanner}>
            <div style={styles.bannerTitle}>👋 Welcome! One more step...</div>
            <div style={styles.bannerText}>
              Fill in your organization details below. Once saved, your annual governance evaluation will be automatically created and ready for you on the dashboard.
            </div>
          </div>
        )}

        {error && <div style={styles.error}>⚠️ {error}</div>}
        {success && <div style={styles.success}>✅ {success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Basic Information</div>
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Name <span style={styles.required}>*</span></label>
                <input type="text" name="name" style={styles.input} value={profile.name} onChange={handleChange}
                  placeholder="Enter organization name" required
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input type="email" name="email" style={{ ...styles.input, background: '#f9fafb', color: '#6b7280' }}
                  value={profile.email} disabled />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Sector <span style={styles.required}>*</span></label>
                <select name="sector" style={styles.select} value={profile.sector} onChange={handleChange} required>
                  <option value="">Select sector</option>
                  <option value="PUBLIC">🏛️ Public</option>
                  <option value="PRIVATE">🏢 Private</option>
                  <option value="CIVIL_SOCIETY">🤝 Civil Society</option>
                  <option value="NGO">🌍 NGO</option>
                  <option value="INTERNATIONAL">🌐 International</option>
                  <option value="OTHER">📋 Other</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Size</label>
                <select name="size" style={styles.select} value={profile.size} onChange={handleChange}>
                  <option value="">Select size</option>
                  <option value="MICRO">Micro (1–9 employees)</option>
                  <option value="SMALL">Small (10–49 employees)</option>
                  <option value="MEDIUM">Medium (50–249 employees)</option>
                  <option value="LARGE">Large (250+ employees)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Foundation</label>
                <input type="date" name="dateOfFoundation" style={styles.input}
                  value={profile.dateOfFoundation} onChange={handleChange}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Website</label>
                <input type="url" name="website" style={styles.input}
                  value={profile.website} onChange={handleChange}
                  placeholder="https://example.com"
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>

              <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                <label style={styles.label}>Description</label>
                <textarea name="description" style={styles.textarea}
                  value={profile.description} onChange={handleChange}
                  placeholder="Brief description of your organization's mission and activities..." />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Contact Information</div>
            <div style={styles.grid}>
              <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                <label style={styles.label}>Address</label>
                <input type="text" name="address" style={styles.input}
                  value={profile.address} onChange={handleChange}
                  placeholder="Full address"
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input type="tel" name="phone" style={styles.input}
                  value={profile.phone} onChange={handleChange}
                  placeholder="+216 XX XXX XXX"
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!isNewProfile && (
              <button type="button" style={styles.cancelBtn}
                onClick={() => navigate('/organization/dashboard')}>
                Cancel
              </button>
            )}
            <button type="submit" style={styles.submitBtn} disabled={saving}>
              {saving ? '⏳ Saving...' : isNewProfile ? '🚀 Save & Start Evaluation' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationProfilePage;