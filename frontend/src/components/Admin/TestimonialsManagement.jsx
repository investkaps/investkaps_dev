import React, { useState, useEffect } from 'react';
import { testimonialsAPI, extractError } from '../../services/api';
import './TestimonialsManagement.css';

export default function TestimonialsManagement() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newValues, setNewValues] = useState({ name: '', occupation: '', text: '', showOnHome: false });
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await testimonialsAPI.adminGetAll();
      setTestimonials(res.data || []);
    } catch (err) {
      const { message } = extractError(err);
      setError(message || 'Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!newValues.name.trim() || !newValues.occupation.trim() || !newValues.text.trim()) {
      alert('Name, occupation and text are required');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: newValues.name.trim(),
        occupation: newValues.occupation.trim(),
        text: newValues.text.trim(),
        showOnHome: !!newValues.showOnHome,
      };
      const res = await testimonialsAPI.adminCreate(payload);
      setTestimonials(t => [res.data, ...t]);
      setNewValues({ name: '', occupation: '', text: '', showOnHome: false });
    } catch (err) {
      alert(err.message || 'Failed to create testimonial');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleShow = async (id, current) => {
    setSavingId(id);
    try {
      const res = await testimonialsAPI.adminPatch(id, { showOnHome: !current });
      setTestimonials(t => t.map(x => x._id === id ? res.data : x));
    } catch (err) {
      alert(err.message || 'Failed to update');
    } finally {
      setSavingId(null);
    }
  };

  // Inline edit handlers
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', occupation: '', text: '' });

  const startEdit = (t) => {
    setEditingId(t._id);
    setEditValues({ name: t.name || '', occupation: t.occupation || '', text: t.text || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ name: '', occupation: '', text: '' });
  };

  const saveEdit = async (id) => {
    setSavingId(id);
    try {
      const payload = {
        name: editValues.name,
        occupation: editValues.occupation,
        text: editValues.text,
      };
      const res = await testimonialsAPI.adminPatch(id, payload);
      setTestimonials(t => t.map(x => x._id === id ? res.data : x));
      setEditingId(null);
    } catch (err) {
      alert(err.message || 'Failed to save changes');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    setSavingId(id);
    try {
      await testimonialsAPI.adminDelete(id);
      setTestimonials(t => t.filter(x => x._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete');
    } finally {
      setSavingId(null);
    }
  };

  // User submissions modal/view
  const [viewing, setViewing] = useState(null);
  const openView = (t) => setViewing(t);
  const closeView = () => setViewing(null);

  const promoteToMain = async (t) => {
    try {
      // Approve and mark showOnHome
      await testimonialsAPI.adminPatch(t._id, { status: 'approved', showOnHome: true });
      await fetchAll();
      closeView();
    } catch (err) {
      alert(err.message || 'Failed to promote testimonial');
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h2>Testimonials</h2>
      <div className="tm-actions">
        <button className="tm-add-btn" onClick={() => setModalOpen(true)}>Add Testimonial</button>
      </div>

      {modalOpen && (
        <div className="tm-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <div className="tm-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="tm-modal-header">
              <h3>Create Testimonial</h3>
              <button className="tm-modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <div className="tm-modal-body">
              <label>Name
                <input placeholder="Name" value={newValues.name} onChange={(e) => setNewValues(v => ({ ...v, name: e.target.value }))} />
              </label>
              <label>Occupation
                <input placeholder="Occupation" value={newValues.occupation} onChange={(e) => setNewValues(v => ({ ...v, occupation: e.target.value }))} />
              </label>
              <label>Testimonial
                <textarea placeholder="Testimonial text" value={newValues.text} onChange={(e) => setNewValues(v => ({ ...v, text: e.target.value }))} rows={6} />
              </label>
              <label className="tm-inline">
                <input type="checkbox" checked={newValues.showOnHome} onChange={(e) => setNewValues(v => ({ ...v, showOnHome: e.target.checked }))} /> Show on home
              </label>
            </div>

            <div className="tm-modal-footer">
              <button className="tm-btn tm-btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="tm-btn tm-btn-primary" onClick={async () => { await handleCreate(); setModalOpen(false); }}> {creating ? 'Creating…' : 'Create'} </button>
            </div>
          </div>
        </div>
      )}
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && testimonials.length === 0 && <p>No testimonials yet.</p>}

      {/* View Modal */}
      {viewing && (
        <div className="tm-modal-backdrop" onMouseDown={() => closeView()}>
          <div className="tm-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="tm-modal-header">
              <h3>View Testimonial</h3>
              <button className="tm-modal-close" onClick={() => closeView()}>×</button>
            </div>
            <div className="tm-modal-body">
              <div><strong>Name:</strong> {viewing.name}</div>
              <div><strong>Email:</strong> {viewing.user?.email || '—'}</div>
              <div><strong>Occupation:</strong> {viewing.occupation}</div>
              <div><strong>Testimonial:</strong> {viewing.text}</div>
              <div><strong>Source:</strong> {viewing.source}</div>
              <div><strong>Status:</strong> {viewing.status}</div>
              <div><strong>Show On Home:</strong> {viewing.showOnHome ? 'Yes' : 'No'}</div>
            </div>
            <div className="tm-modal-footer">
              <button className="tm-btn tm-btn-primary" onClick={() => promoteToMain(viewing)}>Promote to Main</button>
              <button className="tm-btn tm-btn-ghost" onClick={() => closeView()}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="tm-modal-backdrop" onMouseDown={() => cancelEdit()}>
          <div className="tm-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="tm-modal-header">
              <h3>Edit Testimonial</h3>
              <button className="tm-modal-close" onClick={() => cancelEdit()}>×</button>
            </div>
            <div className="tm-modal-body">
              <label>Name
                <input placeholder="Name" value={editValues.name} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))} />
              </label>
              <label>Occupation
                <input placeholder="Occupation" value={editValues.occupation} onChange={(e) => setEditValues(v => ({ ...v, occupation: e.target.value }))} />
              </label>
              <label>Testimonial
                <textarea placeholder="Testimonial text" value={editValues.text} onChange={(e) => setEditValues(v => ({ ...v, text: e.target.value }))} rows={6} />
              </label>
            </div>
            <div className="tm-modal-footer">
              <button className="tm-btn tm-btn-ghost" onClick={() => cancelEdit()}>Cancel</button>
              <button className="tm-btn tm-btn-primary" onClick={() => saveEdit(editingId)} disabled={savingId === editingId}>{savingId === editingId ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {testimonials.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>All testimonials</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Occupation</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Source</th>
                <th style={{ padding: '8px' }}>Requested</th>
                <th style={{ padding: '8px' }}>Show On Home</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map(t => (
                <tr key={t._id} style={{ borderBottom: '1px solid #f6f6f6' }}>
                  <td style={{ padding: '8px' }}>{t.name}</td>
                  <td style={{ padding: '8px' }}>{t.occupation}</td>
                  <td style={{ padding: '8px' }}>{t.user?.email || '—'}</td>
                  <td style={{ padding: '8px' }}>{t.source}</td>
                  <td style={{ padding: '8px' }}>{t.requestedShowOnHome ? 'Yes' : '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="checkbox"
                      checked={!!t.showOnHome}
                      onChange={() => handleToggleShow(t._id, !!t.showOnHome)}
                      disabled={savingId === t._id}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tm-table-btn view" onClick={() => openView(t)}>View</button>
                      <button className="tm-table-btn reject" onClick={() => {
                        const reason = window.prompt('Enter rejection reason to send to user:');
                        if (!reason) return;
                        (async () => {
                          try {
                            await testimonialsAPI.adminPatch(t._id, { status: 'rejected', rejectionReason: reason });
                            await fetchAll();
                            alert('Testimonial rejected and user notified on dashboard.');
                          } catch (err) {
                            alert(err.message || 'Failed to reject testimonial');
                          }
                        })();
                      }}>Reject</button>
                      <button className="tm-table-btn edit" onClick={() => startEdit(t)} disabled={savingId === t._id}>Edit</button>
                      <button className="tm-table-btn delete" onClick={() => handleDelete(t._id)} disabled={savingId === t._id}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
