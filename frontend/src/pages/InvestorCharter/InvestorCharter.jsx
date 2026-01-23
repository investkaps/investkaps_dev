import React from 'react';
import './InvestorCharter.css';

const InvestorCharter = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Investor Charter</h1>
        
        {/* Vision and Mission */}
        <section className="policy-section">
          <h2>A. Vision and Mission Statements for Investors</h2>
          <div className="vision-mission-grid">
            <div className="vm-card">
              <div className="vm-icon">🎯</div>
              <h3>Vision</h3>
              <p>Invest with knowledge & safety.</p>
            </div>
            <div className="vm-card">
              <div className="vm-icon">🚀</div>
              <h3>Mission</h3>
              <p>
                Every investor should be able to invest in right investment products based on their 
                needs, manage and monitor them to meet their goals, access reports and enjoy financial wellness.
              </p>
            </div>
          </div>
        </section>

        {/* Business Details */}
        <section className="policy-section">
          <h2>B. Details of Business Transacted by the Research Analyst</h2>
          <ul className="charter-list">
            <li>To publish research report based on the research activities of the RA</li>
            <li>To provide an independent unbiased view on securities.</li>
            <li>To offer unbiased recommendation, disclosing the financial interests in recommended securities.</li>
            <li>To provide research recommendation, based on analysis of publicly available information and known observations.</li>
            <li>To conduct audit annually</li>
            <li>To ensure that all advertisements/marketing/promotional material are in adherence to the provisions of the Advertisement Code for Research Analysts.</li>
            <li>To maintain records of interactions, with all clients including prospective clients (prior to onboarding), where any conversation related to the research services has taken place.</li>
          </ul>
        </section>

        {/* Services Provided */}
        <section className="policy-section">
          <h2>C. Details of Services Provided to Investors</h2>
          <p className="section-note">(No Indicative Timelines)</p>
          
          <div className="service-category">
            <h3>Onboarding of Clients</h3>
            <ul className="charter-list">
              <li>Sharing of terms and conditions of research services</li>
              <li>Completing KYC of clients</li>
            </ul>
          </div>

          <div className="service-category">
            <h3>Disclosure to Clients</h3>
            <ul className="charter-list">
              <li>To disclose, information that is material for the client to make an informed decision, including details of its business activity, disciplinary history, the terms and conditions of research services, details of associates, risks and conflicts of interest, if any</li>
              <li>To disclose the extent of use of Artificial Intelligence tools in providing research services</li>
              <li>To disclose, while distributing a third party research report, any material conflict of interest of such third party research provider or provide web address that directs a recipient to the relevant disclosures</li>
              <li>To disclose any conflict of interest of the activities of providing research services with other activities of the research analyst.</li>
              <li>To distribute research reports and recommendations to the clients without discrimination.</li>
              <li>To maintain confidentiality w.r.t publication of the research report until made available in the public domain.</li>
              <li>To respect data privacy rights of clients and take measures to protect unauthorized use of their confidential information</li>
              <li>To disclose the timelines for the services provided by the research analyst to clients and ensure adherence to the said timelines</li>
              <li>To provide clear guidance and adequate caution notice to clients when providing recommendations for dealing in complex and high-risk financial products/services</li>
              <li>To treat all clients with honesty and integrity</li>
              <li>To ensure confidentiality of information shared by investors unless such information is required to be provided in furtherance of discharging legal obligations or investors have provided specific consent to share such information.</li>
            </ul>
          </div>
        </section>

        {/* Grievance Redressal */}
        <section className="policy-section">
          <h2>D. Details of Grievance Redressal Mechanism</h2>
          
          <div className="grievance-method">
            <h3>1. Filing Complaint with Research Analyst</h3>
            <p>
              In case of any grievance/complaint, an investor should approach the concerned research 
              analyst who shall strive to redress the grievance immediately, but not later than 
              <strong> 21 days</strong> of the receipt of the grievance.
            </p>
          </div>

          <div className="grievance-method">
            <h3>2. Filing Complaint on SCORES or with RAASB</h3>
            
            <div className="complaint-option">
              <h4>i. SCORES 2.0</h4>
              <p>
                A web based centralized grievance redressal system of SEBI for facilitating effective 
                grievance redressal in time-bound manner.
              </p>
              <a 
                href="https://scores.sebi.gov.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="portal-link"
              >
                Visit SCORES Portal →
              </a>
              
              <div className="review-levels">
                <p><strong>Two level review for complaint/grievance:</strong></p>
                <ul>
                  <li>First review done by designated body (RAASB)</li>
                  <li>Second review done by SEBI</li>
                </ul>
              </div>
            </div>

            <div className="complaint-option">
              <h4>ii. Email to RAASB</h4>
              <p>Email to designated email ID of RAASB</p>
            </div>
          </div>

          <div className="grievance-method">
            <h3>3. SMART ODR Platform</h3>
            <p>
              If the Investor is not satisfied with the resolution provided by the Market Participants, 
              then the investor has the option to file the complaint/grievance on SMART ODR platform 
              for its resolution through online conciliation or arbitration.
            </p>
          </div>

          <div className="physical-address">
            <h4>Physical Complaints Address:</h4>
            <address>
              Office of Investor Assistance and Education,<br />
              Securities and Exchange Board of India,<br />
              SEBI Bhavan. Plot No. C4-A, 'G' Block,<br />
              Bandra-Kurla Complex, Bandra (E),<br />
              Mumbai – 400 051.
            </address>
          </div>
        </section>

        {/* Rights of Investors */}
        <section className="policy-section">
          <h2>E. Rights of Investors</h2>
          <ul className="rights-list">
            <li>Right to Privacy and Confidentiality</li>
            <li>Right to Transparent Practices</li>
            <li>Right to fair and Equitable Treatment</li>
            <li>Right to Adequate Information</li>
            <li>Right to Initial and Continuing Disclosure
              <ul>
                <li>Right to receive information about all the statutory and regulatory disclosures</li>
              </ul>
            </li>
            <li>Right to Fair & True Advertisement</li>
            <li>Right to Awareness about Service Parameters and Turnaround Times</li>
            <li>Right to be informed of the timelines for each service</li>
            <li>Right to be Heard and Satisfactory Grievance Redressal</li>
            <li>Right to have timely redressal</li>
            <li>Right to Exit from Financial product or service</li>
            <li>Right to receive clear guidance and caution notice when dealing in Complex and High-Risk Financial Products and Services</li>
            <li>Additional Rights to vulnerable consumers
              <ul>
                <li>Right to get access to services in a suitable manner even if differently abled</li>
              </ul>
            </li>
            <li>Right to provide feedback on the financial products and services used</li>
            <li>Right against coercive, unfair, and one-sided clauses in financial agreements</li>
            <li>Right to enforceability and holding the Research Analyst responsible for monitoring, enforcing investor rights.</li>
          </ul>
        </section>

        {/* Expectations from Investors */}
        <section className="policy-section">
          <h2>F. Expectations from the Investors (Responsibilities)</h2>
          
          <div className="dos-donts-grid">
            <div className="dos-section">
              <h3 className="dos-title">✓ Do's</h3>
              <ul className="charter-list">
                <li>Always deal with SEBI registered Research Analyst.</li>
                <li>Ensure that the Research Analyst has a valid registration certificate.</li>
                <li>Check for SEBI registration number. Please refer to the list of all SEBI registered Research Analysts at: <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14" target="_blank" rel="noopener noreferrer">SEBI Website</a></li>
                <li>Always pay attention towards disclosures made in the research reports before investing.</li>
                <li>Pay your Research Analyst through banking channels only and maintain duly signed receipts mentioning the details of your payments.</li>
                <li>Before buying securities or applying for public offers, check for the research recommendation provided by your Research Analyst.</li>
                <li>Ask all relevant questions and clear your doubts with your Research Analyst before acting on the recommendation.</li>
                <li>Seek clarifications and guidance on research recommendations from your Research Analyst, especially if it involves complex and high risk financial products and services.</li>
                <li>Always be aware that you have the right to stop availing the service of a Research Analyst as per the terms of service agreed between you and your Research Analyst.</li>
                <li>Always be aware that you have the right to provide feedback to your Research Analyst in respect of the services received.</li>
                <li>Always be aware that you will not be bound by any clause, prescribed by the Research Analyst, which is contravening any regulatory provisions.</li>
                <li>Inform SEBI about Research Analysts offering assured or guaranteed returns.</li>
                <li>Report any fraudulent persons or social media handles.</li>
              </ul>
            </div>

            <div className="donts-section">
              <h3 className="donts-title">✗ Don'ts</h3>
              <ul className="charter-list">
                <li>Do not provide funds for investment to the Research Analyst</li>
                <li>Don't fall prey to luring advertisements or market rumors.</li>
                <li>Do not get attracted to limited-period discounts or other incentives, gifts, etc., offered by the Research Analyst.</li>
                <li>Do not share login credentials and passwords of your trading and demat accounts with the Research Analyst.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InvestorCharter;
