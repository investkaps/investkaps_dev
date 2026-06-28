import React from 'react';
import './LegalCenter.css';

const ComplaintsAndAudit = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Complaints and Audit</span>
          <span className="lang-hi" lang="hi">शिकायत और ऑडिट</span>
        </h1>
      </header>

      <section id="complaints-and-audit" className="legal-section">
        <p>
          We are pleased to inform you that in full compliance with SEBI regulations,
          our audit for FY25 is duly completed. You may access the <a href="/audit.png" target="_blank" rel="noopener noreferrer">Auditor's Report for FY25</a>.
        </p>
        <p>
          <strong>investkaps</strong> maintains highest level of internal governance,
          code of ethics and regulatory compliances and will continue to do so.
        </p>
        <h3>Data for the Month Ending March 2026</h3>
        <div className="legal-table-shell">
          <div className="legal-table-wrap" tabIndex={0} role="region" aria-label="Complaints and audit data table">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Received from</th>
                  <th>Pending at the end of last month</th>
                  <th>Received</th>
                  <th>Resolved</th>
                  <th>Total Pending</th>
                  <th>Pending complaints &gt; 3 months</th>
                  <th>Average Resolution time (in days)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Directly from Investors</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>SEBI (SCORES)</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Other Sources</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td colSpan="2"><strong>Grand Total</strong></td>
                  <td><strong>0</strong></td>
                  <td><strong>0</strong></td>
                  <td><strong>0</strong></td>
                  <td><strong>0</strong></td>
                  <td><strong>0</strong></td>
                  <td><strong>-</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <h3>Trend of Monthly Disposal of Complaints</h3>
        <div className="legal-table-shell">
          <div className="legal-table-wrap" tabIndex={0} role="region" aria-label="Monthly complaints disposal trend table">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Month</th>
                  <th>Carried forward from previous month</th>
                  <th>Received</th>
                  <th>Resolved</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Q4 FY2025-26</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
                <tr><td>2</td><td>Q3 FY2025-26</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
                <tr><td>3</td><td>Q2 FY2025-26</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
                <tr><td>4</td><td>Q1 FY2025-26</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <h3>Trend of Annual Disposal of Complaints</h3>
        <div className="legal-table-shell">
          <div className="legal-table-wrap" tabIndex={0} role="region" aria-label="Annual complaints disposal trend table">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Year</th>
                  <th>Carried forward from previous year</th>
                  <th>Received</th>
                  <th>Resolved</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>2025-26</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
                <tr><td>2</td><td>2024-25</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export default ComplaintsAndAudit;
