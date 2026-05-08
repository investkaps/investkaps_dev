import React from 'react';
import './ServiceSelector.css';

/**
 * ServiceSelector
 * ───────────────
 * Shown to users who haven't yet chosen a service (RA / IA).
 * Props:
 *   selectedServices  – Set containing the selected service ('RA' | 'IA')
 *   onToggle(service) – selects a service for the initial onboarding flow
 *   onConfirm()       – confirms selection and begins onboarding
 *   hasActiveRa       – bool, if true IA constraint may apply
 */
const ServiceSelector = ({ selectedServices, onToggle, onConfirm, hasActiveRa }) => {
  const raSelected = selectedServices.has('RA');
  const iaSelected = selectedServices.has('IA');

  // IA restricted only if user has an ACTIVE RA subscription
  const iaRestricted = hasActiveRa;

  return (
    <div className="ss-overlay">
      <div className="ss-card">
        <div className="ss-header">
          <div className="ss-logo-wrap">
            <img src="/logo.png" alt="InvestKaps" className="ss-logo" />
          </div>
          <h1 className="ss-heading">Welcome to InvestKaps</h1>
          <p className="ss-subheading">
            Choose one service to start with. You can add the other later if your account is eligible.
          </p>
        </div>

        <div className="ss-options">
          {/* RA Card */}
          <button
            className={`ss-option ${raSelected ? 'ss-option-selected' : ''}`}
            onClick={() => onToggle('RA')}
            aria-pressed={raSelected}
            aria-checked={raSelected}
            role="radio"
            id="ss-ra-option"
          >
            <div className="ss-option-icon">📊</div>
            <div className="ss-option-body">
              <h2>Research Analyst</h2>
              <span className="ss-tag ss-tag-ra">RA</span>
              <p>
                Access curated stock recommendations, research reports, and market insights from our SEBI-registered research team.
              </p>
              <ul className="ss-feature-list">
                <li>✓ Stock & sector recommendations</li>
                <li>✓ Detailed research reports</li>
                <li>✓ Subscription-based access</li>
              </ul>
            </div>
            {raSelected && <span className="ss-check">✓</span>}
          </button>

          {/* IA Card */}
          <button
            className={`ss-option ${iaSelected ? 'ss-option-selected ss-option-selected-ia' : ''} ${iaRestricted ? 'ss-option-restricted' : ''}`}
            onClick={() => !iaRestricted && onToggle('IA')}
            aria-pressed={iaSelected}
            aria-checked={iaSelected}
            aria-disabled={iaRestricted}
            role="radio"
            id="ss-ia-option"
            title={iaRestricted ? 'IA onboarding is not available while you have an active RA subscription' : ''}
          >
            <div className="ss-option-icon">💼</div>
            <div className="ss-option-body">
              <h2>Investment Advisor</h2>
              <span className="ss-tag ss-tag-ia">IA</span>
              {iaRestricted && (
                <div className="ss-restricted-badge">
                  🔒 Not available with active RA subscription
                </div>
              )}
              <p>
                Receive personalised investment advice, portfolio management guidance, and goal-based financial planning from our SEBI-registered advisors.
              </p>
              <ul className="ss-feature-list">
                <li>✓ Personalised advisory</li>
                <li>✓ Portfolio management</li>
                <li>✓ Goal-based planning</li>
              </ul>
              <div className="ss-new-badge">New</div>
            </div>
            {iaSelected && <span className="ss-check ss-check-ia">✓</span>}
          </button>
        </div>

        {/* Confirm CTA */}
        <div className="ss-footer">
          <button
            className="ss-confirm-btn"
            onClick={onConfirm}
            disabled={selectedServices.size === 0}
            id="ss-confirm-btn"
          >
            {selectedServices.size === 0
              ? 'Select a service'
              : `Continue with ${[...selectedServices][0]} →`}
          </button>
          <p className="ss-note">
            Each service has its own onboarding path and agreement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelector;
