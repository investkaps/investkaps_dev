import React from 'react';
import './LegalCenter.css';

const ValidUPI = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Valid UPI</span>
          <span className="lang-hi" lang="hi">वैध UPI</span>
        </h1>
      </header>

      <section id="valid-upi" className="legal-section">
        <h2>SEBI Validated @Valid UPI Handles</h2>
        <p>
          A <strong>@valid UPI handle</strong> is an exclusive, standardized, and verified UPI ID
          introduced by the Securities and Exchange Board of India (SEBI) for collection of payments
          by registered intermediaries (including Research Analysts like investkaps), starting
          <strong> October 1st, 2025</strong>. It includes a username, a category tag (e.g., brk for
          brokers, mf for mutual funds, ra for Research Analysts), the mandatory @valid identifier,
          and the bank's name. To verify a @valid handle, check for a white "thumbs-up" icon inside
          a green triangle on the payment confirmation screen or QR code, which visually confirms authenticity.
        </p>
        <p>
          SEBI has made this initiative mandatory for all intermediaries to further enhance investor
          protection and provide investors with a secure, verified and transparent payment experience.
          Using @valid UPI handles for payments will ensure that your payments are always directed to
          verified SEBI-registered entities.
        </p>
        <h3>Our @Valid UPI Handle</h3>
        <p>
          We are pleased to inform you that we have already received @Valid UPI handles for our
          bank account.
        </p>
        <div className="legal-upi-grid">
          <div className="legal-upi-qr">
            <img src="/qrcode.png" alt="Valid UPI QR Code" className="legal-upi-qr-image" />
            <p className="legal-upi-qr-caption">Scan to pay with @Valid UPI</p>
          </div>
          <div className="legal-upi-handle">
            <p className="legal-upi-label">Our UPI Handle</p>
            <div className="legal-upi-id">investkaps.ra@validicici</div>
            <p className="legal-upi-note">For UPI payment directly to our bank account</p>
          </div>
        </div>
        <h3>Please Note</h3>
        <ul className="legal-list">
          <li>
            These @valid UPI IDs are only for payment towards research services, i.e. Subscription
            to any of our products.
          </li>
          <li>
            You do <strong>NOT</strong> need to remember or note them down. We will provide you with
            these whenever you need to make a payment to us.
          </li>
          <li>
            These UPI IDs may change in future if we change our payment gateway provider or bank account.
          </li>
          <li>
            While it is not mandatory to use UPI for making payments, SEBI strongly advises all
            individual investors to actively use the "@valid" UPI handles and verify payment details
            through SEBI Check before transferring funds.
          </li>
          <li>
            SEBI clarified that the @valid UPI handle is an additional payment option, not a replacement.
            Investors can still use NEFT, RTGS, IMPS, etc., but are encouraged to prefer @valid for
            added security.
          </li>
        </ul>
        <h3>What This Means for You?</h3>
        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon">💳</div>
            <h4>UPI Payments</h4>
            <p>
              Whenever you make payments for our subscriptions using UPI, you will now see the
              option to pay to our @Valid UPI handle.
            </p>
          </div>
          <div className="info-card">
            <div className="card-icon">🏦</div>
            <h4>Bank Transfer</h4>
            <p>
              Direct bank transfer mode will also remain available as before though we recommend
              you use UPI payments.
            </p>
          </div>
          <div className="info-card">
            <div className="card-icon">✨</div>
            <h4>Seamless Experience</h4>
            <p>
              This change is purely at the backend – there is no additional step required from
              your side. The payment experience remains the same.
            </p>
          </div>
        </div>
        <h3>How to Verify @Valid UPI?</h3>
        <p>The handle follows a specific pattern:</p>
        <p><code>[Username/Business Name].[Category Tag]@valid[Bank Name]</code></p>
        <ul className="legal-list">
          <li><strong>Username/Business Name:</strong> The intermediary's name.</li>
          <li><strong>Category Tag:</strong> A short code for the type of intermediary, such as <code>ra</code> for Research Analysts, <code>brk</code> for brokers or <code>mf</code> for mutual funds.</li>
          <li><strong>@valid:</strong> A unique identifier that confirms the handle is officially verified.</li>
          <li><strong>Bank Name:</strong> The name of the bank associated with the handle.</li>
        </ul>
        <p>
          On your payment screen, you will see a <strong>white thumbs-up icon inside a green triangle</strong>, which assures you that payment is being made to a verified SEBI-registered intermediary.
        </p>
        <h3>SEBI Check</h3>
        <p>
          SEBI Check enables investors to verify the authenticity of UPI IDs and linked bank
          account details, either by scanning a QR code or manually entering the UPI ID/bank
          account details. This will give you an additional and simple way to confirm that your
          payments are always directed to a genuine SEBI-registered intermediary.
        </p>
        <p>
          <a href="https://siportal.sebi.gov.in/intermediary/sebi-check" target="_blank" rel="noopener noreferrer">Visit SEBI Check Portal →</a>
        </p>
        <h3>Your Security is Our Priority</h3>
        <p>
          Always verify the @valid UPI handle before making payments. Look for the green
          triangle with thumbs-up icon and use SEBI Check portal for additional verification.
        </p>
      </section>
    </div>
  </div>
);

export default ValidUPI;
