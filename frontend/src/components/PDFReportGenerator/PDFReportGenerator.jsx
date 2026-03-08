import React, { useState, useEffect, useRef } from 'react';
import './PDFReportGenerator.css';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';

const DEFAULT_DISCLAIMER =
  'This report is for informational purposes only and should not be considered as financial advice. Investment in securities market are subject to market risks. Please read all the related documents carefully before investing. Past performance is not indicative of future returns. Please consider your specific investment requirements, risk tolerance, goal, time frame, risk and reward balance and the cost associated with the investment before choosing a fund, or designing a portfolio that suits your needs. Performance and returns of any investment portfolio can neither be predicted nor guaranteed.';

const PDFReportGenerator = ({ recommendation, onClose }) => {
  const [formData, setFormData] = useState({
    companyAbout: '',
    technicalReason: '',
    summary: '',
    disclaimer: DEFAULT_DISCLAIMER
  });

  // Chart / analysis image to embed in the generated PDF
  const [chartImage, setChartImage]           = useState(null);
  const [chartImagePreview, setChartImagePreview] = useState(null);

  // Generate state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Refs for hidden file inputs
  const chartImageRef = useRef(null);

  // Pre-fill form
  useEffect(() => {
    if (recommendation) {
      setFormData(prev => ({
        ...prev,
        companyAbout:    recommendation.description || '',
        technicalReason: recommendation.rationale   || '',
        summary:         recommendation.description || ''
      }));
    }
  }, [recommendation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Chart image ────────────────────────────────────────────────────────────
  const handleChartImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setChartImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setChartImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeChartImage = () => {
    setChartImage(null);
    setChartImagePreview(null);
    if (chartImageRef.current) chartImageRef.current.value = '';
  };

  // ── Generate & download (unsigned draft) ──────────────────────────────────
  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      setError('');

      const fd = new FormData();
      fd.append('companyAbout',    formData.companyAbout);
      fd.append('technicalReason', formData.technicalReason);
      fd.append('summary',         formData.summary);
      fd.append('disclaimer',      formData.disclaimer);
      if (chartImage) fd.append('chartImage', chartImage);

      await stockRecommendationAPI.generatePDFReport(recommendation._id, fd);
    } catch (err) {
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!recommendation) return null;

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="pdf-modal-header">
          <h2>PDF Report</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="pdf-modal-body">

          {error && <div className="error-message">{error}</div>}

          {/* ── Stock preview ─────────────────────────────────────────────── */}
          <div className="stock-info-preview">
            <div className="preview-header">
              <h3>{recommendation.stockSymbol}</h3>
              <span className={`rec-badge ${recommendation.recommendationType}`}>
                {recommendation.recommendationType.toUpperCase()}
              </span>
            </div>
            <p className="stock-name">{recommendation.stockName}</p>
            <div className="price-grid">
              <div className="price-item">
                <span className="label">LTP</span>
                <span className="value">₹{recommendation.currentPrice}</span>
              </div>
              <div className="price-item">
                <span className="label">Target</span>
                <span className="value target">₹{recommendation.targetPrice}</span>
              </div>
              <div className="price-item">
                <span className="label">Stop Loss</span>
                <span className="value stoploss">₹{recommendation.stopLoss || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* ── Section divider ───────────────────────────────────────────── */}
          <div className="pdf-section-title">Fill in report details &amp; generate PDF</div>

          {/* ── Editable text fields ──────────────────────────────────────── */}
          <div className="pdf-form">
            <div className="form-group">
              <label htmlFor="companyAbout">About the Company</label>
              <textarea id="companyAbout" name="companyAbout" value={formData.companyAbout}
                onChange={handleChange} rows="4" placeholder="Enter company information..." required />
            </div>

            <div className="form-group">
              <label htmlFor="technicalReason">Technical Analysis</label>
              <textarea id="technicalReason" name="technicalReason" value={formData.technicalReason}
                onChange={handleChange} rows="5" placeholder="Enter technical analysis and reasoning..." required />
            </div>

            <div className="form-group">
              <label htmlFor="summary">Summary</label>
              <textarea id="summary" name="summary" value={formData.summary}
                onChange={handleChange} rows="4" placeholder="Enter summary of the recommendation..." required />
            </div>

            <div className="form-group">
              <label htmlFor="disclaimer">Disclaimer</label>
              <textarea id="disclaimer" name="disclaimer" value={formData.disclaimer}
                onChange={handleChange} rows="5" placeholder="Enter disclaimer text..." required />
            </div>

            {/* ── Chart image upload ──────────────────────────────────────── */}
            <div className="form-group">
              <label>Chart / Analysis Image <span className="optional-tag">(optional — embedded in PDF)</span></label>
              <div
                className={`image-upload-area ${chartImagePreview ? 'has-image' : ''}`}
                onClick={() => chartImageRef.current?.click()}
              >
                {chartImagePreview ? (
                  <img src={chartImagePreview} alt="Chart preview" className="chart-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <span className="upload-icon">📊</span>
                    <span className="upload-label">Click to upload a chart or image</span>
                    <span className="upload-hint">PNG, JPG, WebP · max 15 MB</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={chartImageRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChartImageChange}
                style={{ display: 'none' }}
              />
              {chartImage && (
                <button type="button" className="remove-image-btn" onClick={removeChartImage}>
                  ✕ Remove image
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="pdf-modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Close
          </button>
          <button
            className="generate-btn"
            onClick={handleGeneratePDF}
            disabled={loading || !formData.companyAbout || !formData.technicalReason || !formData.summary}
          >
            {loading ? 'Generating…' : '⬇ Generate & Download PDF'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PDFReportGenerator;
