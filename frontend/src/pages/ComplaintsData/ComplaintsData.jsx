import React from 'react';
import './ComplaintsData.css';

const ComplaintsData = () => {
  return (
    <div className="complaints-data-page">
      <div className="complaints-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Complaints & Audit Data</h1>
          <p className="page-subtitle">Transparency and Compliance Reports</p>
        </div>

        {/* Audit Section */}
        <section className="audit-section">
          <h2 className="section-heading">Audit FY2024-25</h2>
          <p className="audit-text">
            We are pleased to inform you that in full compliance with SEBI regulations, 
            our audit for FY25 is duly completed. You may access the Auditor's Report by{' '}
            <a href="/audit.png" target="_blank" rel="noopener noreferrer" className="audit-link">clicking here</a>.
          </p>
          <p className="audit-text">
            <strong>investkaps</strong> maintains highest level of internal governance, 
            code of ethics and regulatory compliances and will continue to do so.
          </p>
        </section>

        {/* Table 1: Data for the Month Ending October 2025 */}
        <section className="table-section">
          <h2 className="table-title">Data for the Month Ending October 2025</h2>
          <div className="table-wrapper">
            <table className="complaints-table">
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
                <tr className="total-row">
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
        </section>

        {/* Table 2: Trend of Monthly Disposal of Complaints */}
        <section className="table-section">
          <h2 className="table-title">Trend of Monthly Disposal of Complaints</h2>
          <div className="table-wrapper">
            <table className="complaints-table">
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
                <tr>
                  <td>1</td>
                  <td>Sep & Oct 2025</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Q2 FY2025-26</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Q1 FY2025-26</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Table 3: Trend of Annual Disposal of Complaints */}
        <section className="table-section">
          <h2 className="table-title">Trend of Annual Disposal of Complaints</h2>
          <div className="table-wrapper">
            <table className="complaints-table">
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
                <tr>
                  <td>1</td>
                  <td>2024-25</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                  <td>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ComplaintsData;
