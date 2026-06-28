import React from 'react';
import './LegalCenter.css';

const CodeOfConduct = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Code of Conduct</span>
          <span className="lang-hi" lang="hi">आचार संहिता</span>
        </h1>
      </header>

      <section id="code-of-conduct" className="legal-section">
        <p>
          <strong>Kapil Aggarwal</strong> (proprietor of investkaps) is a SEBI Registered
          Research Analyst vide Registration Number <strong>INH000016834</strong> dated on
          <strong> June 25, 2024</strong>
        </p>
        <p>
          In accordance to Regulation 24 (2) of the SEBI (Research Analyst) Regulations, 2014,
          I shall maintain the following the Code of Conduct:
        </p>
        <ol className="legal-ordered-list">
          <li>I shall act honestly and in good faith.</li>
          <li>I shall act with due skill, care and diligence and shall ensure that the research report is prepared after thorough analysis.</li>
          <li>I shall effectively address conflict of interest which may affect the impartiality of research analysis and research report and shall make appropriate disclosures to address the same.</li>
          <li>I shall not engage in insider trading or front running of my own research report.</li>
          <li>I shall maintain confidentiality of report till the report is made public.</li>
          <li>I am engaged in research analysis and shall observe high professional standard while preparing research report.</li>
          <li>I shall comply with all regulatory requirements applicable to the conduct of its business activities.</li>
          <li>I shall bear primary responsibility of senior management for ensuring the maintenance of appropriate standards of conduct and adherence to proper procedures.</li>
        </ol>
      </section>
    </div>
  </div>
);

export default CodeOfConduct;
