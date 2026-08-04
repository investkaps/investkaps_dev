import React from 'react';
import { Link } from 'react-router-dom';
import './LegalCenter.css';

const CONTACT = {
  name: 'Kapil Aggarwal',
  address: 'A-144, Vivek Vihar, Phase-1, Delhi-110095',
  phone: '+91-8076283540',
  phoneTel: '+918076283540',
  emailRA: 'investkaps@gmail.com',
  emailIA: 'investkaps.ia@gmail.com',
  hours: 'Mon–Fri 9:00 AM–5:00 PM; Sat 11:00 AM–1:00 PM',
};

const DESIGNATIONS = [
  'Customer Care',
  'Head of Customer Care',
  'Compliance Officer',
  'CEO',
  'Principal Officer',
  'Nodal Officer / Grievance Officer',
];

const GrievanceRedressalEscalationMatrix = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Grievance Redressal / Escalation Matrix</span>
          <span className="lang-hi" lang="hi">शिकायत निवारण / एस्केलेशन मैट्रिक्स</span>
        </h1>
      </header>

      <section id="grievance-redressal-escalation-matrix" className="legal-section">
        <p className="intro-text">
          Investors may use the following escalation matrix for complaints, service issues, or
          grievance redressal related to Research Analyst (RA) and Investment Adviser (IA)
          services provided by InvestKaps.
        </p>

        <div className="registration-note legal-note-box" style={{ marginBottom: '1.25rem' }}>
          <p><strong>SEBI RA Registration:</strong> INH000016834 &nbsp;|&nbsp; <strong>BSE RA Enlistment:</strong> 6226</p>
          <p style={{ marginBottom: 0 }}>
            <strong>SEBI IA Registration:</strong> INA000022190 &nbsp;|&nbsp; <strong>BSE IA Enlistment:</strong> 2484
          </p>
        </div>

        <div className="legal-table-shell">
          <div
            className="legal-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Grievance redressal escalation matrix"
          >
            <table className="legal-table legal-table--escalation">
              <thead>
                <tr>
                  <th>Details of Designation</th>
                  <th>Contact Person Name</th>
                  <th>Physical Address</th>
                  <th>Contact No.</th>
                  <th>Email ID</th>
                  <th>Working Hours for Complaints</th>
                </tr>
              </thead>
              <tbody>
                {DESIGNATIONS.map((role) => (
                  <tr key={role}>
                    <td>{role}</td>
                    <td>{CONTACT.name}</td>
                    <td>{CONTACT.address}</td>
                    <td>
                      <a href={`tel:${CONTACT.phoneTel}`}>{CONTACT.phone}</a>
                    </td>
                    <td>
                      <div>
                        <strong>RA:</strong>{' '}
                        <a href={`mailto:${CONTACT.emailRA}`}>{CONTACT.emailRA}</a>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <strong>IA:</strong>{' '}
                        <a href={`mailto:${CONTACT.emailIA}`}>{CONTACT.emailIA}</a>
                      </div>
                    </td>
                    <td>{CONTACT.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grievance-step" style={{ marginTop: '1.75rem' }}>
          <h3>Escalation Process</h3>
          <p>
            <strong>Step 1:</strong> Contact Kapil Aggarwal / Grievance Officer at{' '}
            <a href={`mailto:${CONTACT.emailRA}`}>{CONTACT.emailRA}</a> (RA) or{' '}
            <a href={`mailto:${CONTACT.emailIA}`}>{CONTACT.emailIA}</a> (IA), or call{' '}
            <a href={`tel:${CONTACT.phoneTel}`}>{CONTACT.phone}</a>. The grievance shall be
            reviewed and responded to as per applicable SEBI requirements. See also our{' '}
            <Link to="/grievance-redressal">Grievance Redressal</Link> page for response timelines.
          </p>
          <p>
            <strong>Step 2:</strong> If the response is not satisfactory, investors may lodge a
            complaint on SEBI SCORES at{' '}
            <a href="https://scores.sebi.gov.in" target="_blank" rel="noopener noreferrer">
              scores.sebi.gov.in
            </a>
            .
          </p>
          <p>
            <strong>Step 3:</strong> Investors may use the Online Dispute Resolution platform at{' '}
            <a href="https://smartodr.in" target="_blank" rel="noopener noreferrer">
              smartodr.in
            </a>{' '}
            for online conciliation or arbitration, where applicable.
          </p>
        </div>

        <div className="legal-contact-cta">
          <h3>Need Help?</h3>
          <p>
            Primary Contact / Grievances / Principal Officer / Nodal Officer:{' '}
            <strong>{CONTACT.name}</strong>. Full contact details are also listed on our{' '}
            <Link to="/contact">Contact Us</Link> page.
          </p>
          <a href={`mailto:${CONTACT.emailRA}`}>Email Us</a>
        </div>
      </section>
    </div>
  </div>
);

export default GrievanceRedressalEscalationMatrix;
