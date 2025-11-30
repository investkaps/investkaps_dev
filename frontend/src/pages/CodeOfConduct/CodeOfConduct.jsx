import React from 'react';
import './CodeOfConduct.css';

const CodeOfConduct = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Code of Conduct for Research Analyst</h1>
        
        <section className="policy-section">
          <div className="registration-info">
            <p>
              <strong>Kapil Aggarwal</strong> (proprietor of investkaps) is a SEBI Registered 
              Research Analyst vide Registration Number <strong>INH000016834</strong> dated on 
              <strong> June 25, 2024</strong>
            </p>
          </div>
        </section>

        <section className="policy-section">
          <p>
            In accordance to Regulation 24 (2) of the SEBI (Research Analyst) Regulations, 2014, 
            I shall maintain the following the Code of Conduct:
          </p>
        </section>

        <section className="policy-section">
          <div className="conduct-item">
            <h3>1. Honesty and Good Faith</h3>
            <p>I shall act honestly and in good faith.</p>
          </div>

          <div className="conduct-item">
            <h3>2. Diligence</h3>
            <p>
              I shall act with due skill, care and diligence and shall ensure that the research 
              report is prepared after thorough analysis.
            </p>
          </div>

          <div className="conduct-item">
            <h3>3. Conflict of Interest</h3>
            <p>
              I shall effectively address conflict of interest which may affect the impartiality 
              of research analysis and research report and shall make appropriate disclosures to 
              address the same.
            </p>
          </div>

          <div className="conduct-item">
            <h3>4. Insider Trading or Front Running</h3>
            <p>
              I shall not engage in insider trading or front running of my own research report.
            </p>
          </div>

          <div className="conduct-item">
            <h3>5. Confidentiality</h3>
            <p>
              I shall maintain confidentiality of report till the report is made public.
            </p>
          </div>

          <div className="conduct-item">
            <h3>6. Professional Standard</h3>
            <p>
              I am engaged in research analysis and shall observe high professional standard 
              while preparing research report.
            </p>
          </div>

          <div className="conduct-item">
            <h3>7. Compliance</h3>
            <p>
              I shall comply with all regulatory requirements applicable to the conduct of its 
              business activities.
            </p>
          </div>

          <div className="conduct-item">
            <h3>8. Responsibility of Senior Management</h3>
            <p>
              I shall bear primary responsibility of senior management for ensuring the maintenance 
              of appropriate standards of conduct and adherence to proper procedures.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CodeOfConduct;
