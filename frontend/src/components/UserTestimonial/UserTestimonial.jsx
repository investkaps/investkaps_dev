import React, { useState, useEffect } from 'react';
import './UserTestimonial.css';
import { useAuth } from '../../context/AuthContext';
import { testimonialsAPI, extractError } from '../../services/api';

export default function UserTestimonial() {
  const { currentUser, userReady } = useAuth();
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', occupation: '', text: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchMy = async () => {
      try {
        setLoading(true);
        const res = await testimonialsAPI.getMy();
        if (mounted) setExisting(res.data || null);
      } catch (err) {
        // don't treat absence as error — backend returns null data
        console.warn('Could not fetch my testimonial:', err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (userReady) {
      fetchMy();
    }
    return () => { mounted = false; };
  }, [userReady]);

  const validate = () => {
    setError(null);
    if (!form.name.trim() || !form.occupation.trim() || !form.text.trim()) {
      setError('Name, occupation and testimonial text are required.');
      return false;
    }
    if (form.text.trim().length < 20) {
      setError('Testimonial must be at least 20 characters.');
      return false;
    }
    if (form.text.trim().length > 1000) {
      setError('Testimonial cannot exceed 1000 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: form.name.trim(),
        occupation: form.occupation.trim(),
        text: form.text.trim(),
      };
      const res = await testimonialsAPI.submit(payload);
      setSuccess(res.message || 'Submitted — pending review');
      setExisting(res.data || null);
    } catch (err) {
      const { message } = extractError(err);
      setError(message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userReady) return null;

  return (
    <div className="user-testimonial">
      <h3>Your Testimonial</h3>

      {loading ? (
        <p>Loading...</p>
      ) : existing ? (
        <div className="existing-testimonial">
          <h4>{existing.name}</h4>
          <p className="occupation">{existing.occupation}</p>
          <p className="text">{existing.text}</p>
          <p className="note">You have already submitted a testimonial. It cannot be edited.</p>
        </div>
      ) : (
        <form className="testimonial-form" onSubmit={handleSubmit}>
          <p className="hint">Note: You cannot edit or replace your testimonial after submitting.</p>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your display name"
            />
          </label>

          <label>
            <span>Occupation</span>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="e.g. Senior Banker"
            />
          </label>

          <label>
            <span>Testimonial</span>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Write your testimonial (min 20 characters)"
              rows={6}
            />
          </label>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={submitting} className="submit-btn">
            {submitting ? 'Submitting…' : 'Submit Testimonial'}
          </button>
        </form>
      )}
    </div>
  );
}
