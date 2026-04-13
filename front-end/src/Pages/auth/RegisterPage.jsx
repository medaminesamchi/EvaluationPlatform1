import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../Services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    sector: '',
    address: '',
    phone: '',
    dateOfFoundation: '',
    department: '',
    roleLevel: '',
    domainOfExpertise: '',
    organizationName: '',
    organizationEmail: '',
    faxNumber: '',
    employeeCount: '',
    position: '',
    grade: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.role) { setError('Please select a role'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'ORGANIZATION') {
        payload.organizationName = formData.organizationName;
        payload.organizationEmail = formData.organizationEmail;
        payload.sector = formData.sector;
        payload.address = formData.address;
        payload.phone = formData.phone;
        payload.faxNumber = formData.faxNumber;
        payload.employeeCount = formData.employeeCount;
        payload.position = formData.position;
        payload.grade = formData.grade;
        payload.dateOfFoundation = formData.dateOfFoundation || null;
      } else if (formData.role === 'EVALUATOR') {
        payload.department = formData.department;
        payload.roleLevel = formData.roleLevel;
        payload.domainOfExpertise = formData.domainOfExpertise;
      }

      const response = await authService.register(payload);

      if (response.token && response.user) {
        login(response.token, response.user);
        const role = response.user.role;
        // ✅ Org goes to profile page first to complete their profile
        // Profile page will auto-create their annual evaluation on save
        if (role === 'ORGANIZATION') navigate('/organization/profile');
        else if (role === 'EVALUATOR') navigate('/evaluator/dashboard');
        else navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    card: { background: 'white', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', textAlign: 'center' },
    subtitle: { fontSize: '15px', color: '#6b7280', textAlign: 'center', marginBottom: '28px' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', background: 'white', cursor: 'pointer' },
    sectionDivider: { fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '20px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' },
    error: { padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' },
    submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
    loginLink: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏛️ Create Account</h1>
        <p style={styles.subtitle}>Join the Governance Evaluation Platform</p>

        <form onSubmit={handleSubmit}>
          {error && <div style={styles.error}>⚠️ {error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name *</label>
            <input type="text" name="name" style={styles.input} value={formData.name} onChange={handleChange} placeholder="Enter your full name" required />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address *</label>
            <input type="email" name="email" style={styles.input} value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password *</label>
            <input type="password" name="password" style={styles.input} value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" required />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password *</label>
            <input type="password" name="confirmPassword" style={styles.input} value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>I am registering as *</label>
            <select name="role" style={styles.select} value={formData.role} onChange={handleChange} required>
              <option value="">Select your role</option>
              <option value="ORGANIZATION">🏢 Organization</option>
              <option value="EVALUATOR">🔍 Evaluator</option>
            </select>
          </div>

          {formData.role === 'ORGANIZATION' && (
            <>
              <div style={styles.sectionDivider}>Admin Profile Details</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Admin Position</label>
                <input type="text" name="position" style={styles.input} value={formData.position} onChange={handleChange} placeholder="e.g. Director, Manager" required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Admin Grade</label>
                <input type="text" name="grade" style={styles.input} value={formData.grade} onChange={handleChange} placeholder="e.g. Senior" required />
              </div>

              <div style={styles.sectionDivider}>Organization Details</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Name *</label>
                <input type="text" name="organizationName" style={styles.input} value={formData.organizationName} onChange={handleChange} placeholder="Official name" required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Email *</label>
                <input type="email" name="organizationEmail" style={styles.input} value={formData.organizationEmail} onChange={handleChange} placeholder="Contact email for the organization" required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Sector</label>
                <select name="sector" style={styles.select} value={formData.sector} onChange={handleChange}>
                  <option value="">Select sector</option>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="CIVIL_SOCIETY">Civil Society</option>
                  <option value="NGO">NGO</option>
                  <option value="INTERNATIONAL">International</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input type="text" name="address" style={styles.input} value={formData.address} onChange={handleChange} placeholder="Organization address" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input type="tel" name="phone" style={styles.input} value={formData.phone} onChange={handleChange} placeholder="+216 XX XXX XXX" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fax Number</label>
                <input type="tel" name="faxNumber" style={styles.input} value={formData.faxNumber} onChange={handleChange} placeholder="Fax number" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Number of Employees</label>
                <input type="number" name="employeeCount" style={styles.input} value={formData.employeeCount} onChange={handleChange} placeholder="e.g. 150" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Foundation</label>
                <input type="date" name="dateOfFoundation" style={styles.input} value={formData.dateOfFoundation} onChange={handleChange} />
              </div>
            </>
          )}

          {formData.role === 'EVALUATOR' && (
            <>
              <div style={styles.sectionDivider}>Professional Details</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Department *</label>
                <input type="text" name="department" style={styles.input} value={formData.department} onChange={handleChange} placeholder="Your department or institution" required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role Level</label>
                <select name="roleLevel" style={styles.select} value={formData.roleLevel} onChange={handleChange}>
                  <option value="">Select level</option>
                  <option value="JUNIOR">Junior</option>
                  <option value="SENIOR">Senior</option>
                  <option value="EXPERT">Expert</option>
                  <option value="LEAD">Lead</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Domain of Expertise *</label>
                <input type="text" name="domainOfExpertise" style={styles.input} value={formData.domainOfExpertise} onChange={handleChange} placeholder="e.g. Corporate Governance, Risk Management" required />
              </div>
            </>
          )}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '⏳ Creating account...' : '✅ Create Account'}
          </button>
        </form>

        <div style={styles.loginLink}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#667eea', fontWeight: '600' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;