import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './LegalCenter.css';

const sections = [
  { id: 'contact-us', title: 'Contact Us' },
  { id: 'privacy-policy', title: 'Privacy Policy' },
  { id: 'disclaimers', title: 'Disclaimers' },
  { id: 'terms-and-conditions', title: 'Terms and Conditions' },
  { id: 'investor-charter', title: 'Investor Charter' },
  { id: 'valid-upi', title: 'Valid UPI' },
  { id: 'faqs', title: 'FAQs' },
  { id: 'complaints-and-audit', title: 'Complaints and Audit' },
  { id: 'cancellations-and-refunds', title: 'Cancellations and Refunds' },
  { id: 'grievance-redressal', title: 'Grievance Redressal' },
  { id: 'code-of-conduct', title: 'Code of Conduct' }
];

const LegalCenter = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const sectionId = location.hash.replace('#', '');
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="legal-center-page">
      <div className="legal-center-container">
        <header className="legal-center-header">
          <h1 className="legal-center-title">Legal and Compliance Center</h1>
        </header>

        <nav className="legal-center-nav" aria-label="Legal sections navigation">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="legal-nav-link">
              {section.title}
            </a>
          ))}
        </nav>

        <main className="legal-sections">
          <section id="contact-us" className="legal-section legal-contact-section">
            <div className="contact-page-header">
              <h1 className="contact-main-title">Contact Us</h1>
              <p className="contact-main-subtitle">Get in touch with our team of financial experts</p>
            </div>

            <div className="primary-contact-banner">
              <h2 className="primary-contact-title">We are right here:</h2>
              <p className="primary-contact-subtitle">
                <strong>Primary Contact/Grievances/Principal Officer/Nodal Officer:</strong> Kapil Aggarwal
              </p>
              <div className="registration-info">
                <h4 className="registration-heading">Research Analyst</h4>
                <p><strong>SEBI Registration:</strong> INH000016834</p>
                <p><strong>BSE Enlistment:</strong> 6226</p>
              </div>
              <div className="registration-info">
                <h4 className="registration-heading">Investment Advisor</h4>
                <p><strong>SEBI Registration:</strong> INA000022190</p>
                <p><strong>BSE Enlistment:</strong> -</p>
              </div>
              <p className="contact-tagline">
                Reach out at below details with any queries about the services, feedback or any complaints.
              </p>
            </div>

            <div className="contact-info-grid">
              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <i className="fab fa-whatsapp"></i>
                </div>
                <h3 className="contact-info-title">Message on WhatsApp</h3>
                <a href="https://wa.me/918076283540" target="_blank" rel="noopener noreferrer" className="whatsapp-link" aria-label="Chat on WhatsApp at +91-8076283540">
                  +91-8076283540
                </a>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <i className="contact-icon-location"></i>
                </div>
                <h3 className="contact-info-title">Visit Us</h3>
                <p className="contact-info-text">
                  A-144, Vivek Vihar, Phase-1,<br />
                  Delhi-110095
                </p>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <i className="contact-icon-phone"></i>
                </div>
                <h3 className="contact-info-title">Call Us</h3>
                <p className="contact-info-text">
                  <a href="tel:+918076283540" aria-label="Call +91-8076283540">+91-8076283540</a>
                </p>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <i className="contact-icon-email"></i>
                </div>
                <h3 className="contact-info-title">For RA Services</h3>
                <p className="contact-info-text">
                  <a href="mailto:investkaps@gmail.com">investkaps@gmail.com</a>
                </p>
              </div>

              <div className="contact-info-card">
                <div className="contact-info-icon">
                  <i className="contact-icon-email"></i>
                </div>
                <h3 className="contact-info-title">For IA Services</h3>
                <p className="contact-info-text">
                  <a href="mailto:investkaps_ia@gmail.com">investkaps_ia@gmail.com</a>
                </p>
              </div>
            </div>

            <div className="office-hours-content">
              <div className="section-header">
                <span className="section-subtitle">Visit Us</span>
                <h2 className="section-title">Office Hours</h2>
              </div>

              <div className="hours-grid">
                <div className="hours-item">
                  <div className="day">Monday - Friday</div>
                  <div className="time">9:00 AM - 5:00 PM</div>
                </div>

                <div className="hours-item">
                  <div className="day">Saturday</div>
                  <div className="time">11:00 AM - 1:00 PM</div>
                </div>

                <div className="hours-item">
                  <div className="day">Sunday</div>
                  <div className="time">Closed</div>
                </div>
              </div>
            </div>
          </section>

          <section id="privacy-policy" className="legal-section">
            <h2>Privacy Policy</h2>
            <p>
              investkaps offers independent equity research services to retail clients as well as 
              corporate clients on subscription basis.
            </p>
            <p>
              Use of the information herein is at one's own risk. This is not an offer to sell or 
              solicitation to buy any securities and investkaps (owner of website, www.investkaps.com) 
              will not be liable for any losses incurred or investment(s) made or decisions taken/or 
              not taken based on the information provided herein. Information contained herein does not 
              constitute a personal recommendation or take into account the particular investment 
              objectives, financial situations, or needs of individual investors. Before acting on any 
              recommendation, investors should consider whether it is suitable for their particular 
              circumstances and, if necessary, seek an independent professional advice.
            </p>
            <p>
              All content and information is provided on an "As is" basis by www.investkaps.com. 
              Information herein is believed to be reliable but www.investkaps.com does not warrant 
              its completeness or accuracy and expressly disclaims all warranties and conditions of 
              any kind, whether express or implied. www.investkaps.com, its proprietor may hold shares 
              in the company/ies discussed herein.
            </p>
            <ul className="legal-list">
              <li>
                We take KYC documents from our clients, i.e. name, email, phone number, PAN Card, 
                State before they sign up for our services. This is taken through a third party partner.
              </li>
              <li>
                We retain records relating to the services that we provide so that we are better able 
                to assist our clients with their needs and to comply with professional guidelines or 
                requirements of law.
              </li>
              <li>
                We maintain physical, electronic, and procedural safeguards that comply with federal 
                and state regulation/act to guard our clients' non-public personal information.
              </li>
              <li>
                We protect the confidentiality of clients' Mobile Number, Name, and Address & Email Id 
                to prohibit unlawful disclosure of our data, and limit access to our clients' data in 
                the same manner as we do all other non-public personal information.
              </li>
              <li>
                Documents and information containing any non public personal information are safeguarded 
                and not disclosed to anyone, unless authorized by the client or required by law.
              </li>
              <li>
                We restrict access of client data only to those employees and partners who are involved 
                in offering and administering the products and services we offer.
              </li>
              <li>
                We train our employees in the importance of maintaining confidentiality and customer privacy.
              </li>
              <li>
                We have agreements with our partners which to safeguard client confidentiality and 
                customer privacy.
              </li>
              <li>
                We destroy, erase or make unreadable documentation containing Clients data and/or other 
                non-public personal information prior to its disposal.
              </li>
              <li>
                We continuously monitor and make adjustments to this Client Personal Information 
                Protection Policy as necessary.
              </li>
            </ul>
            <p>
              investkaps has a contractual arrangement with vendors whereby the vendors provide 
              technology solutions and related back-end infrastructure along with support for back-office 
              related operations & processes. The vendors do not provide any investment advice or 
              recommendation nor does it make any claim of returns or performance with respect to any 
              advice or recommendation.
            </p>
          </section>

          <section id="disclaimers" className="legal-section">
            <h2>Disclaimers</h2>
            <iframe
              src="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112859/Disclaimers.pdf"
              title="Disclaimer Document"
              className="legal-pdf-frame"
            />
            <div className="legal-download-link">
              <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112859/Disclaimers.pdf" target="_blank" rel="noopener noreferrer">
                Download the PDF
              </a>
            </div>
          </section>

          <section id="terms-and-conditions" className="legal-section">
            <h2>Terms and Conditions</h2>
            <ul className="legal-list">
              <li>I, Kapil Aggarwal, am registered with SEBI as an Individual Research Analyst under the registration number <strong>INH000016834</strong>, effective from <strong>June 25, 2024</strong>.</li>
              <li>I offer paid research services to my clients based on this certification. Opinions expressed otherwise regarding specific securities are not investment advice and shall not be treated as recommendations. Neither I nor my associates/employees shall be liable for any losses incurred based on such opinions.</li>
              <li>Any matter displayed outside a research report is purely for Illustrative, Knowledge and Informational purposes and shall not be treated as advice or opinion of any kind.</li>
              <li>I make no warranties or guarantees regarding the accuracy, completeness, or timeliness of the information such information, including data such as news, prices, and analysis.</li>
              <li>Paid clients receive detailed research reports and detailed analysis of all my research. For stock/company-specific investment recommendations, please refer Services Page.</li>
            </ul>
            <div className="legal-warning-box">
              <p><strong>Investment in the securities market is subject to market risks. Read all the related documents carefully before investing.</strong></p>
              <p>Registration granted by SEBI and certification from NISM in no way guarantee the performance of the intermediary or provide any assurance of returns to investors.</p>
            </div>
            <p>
              By visiting our site you are agreeing to be bound by the following terms and conditions. 
              We may change these terms and conditions at any time. Your continued use of www.investkaps.com 
              means that you accept any new or modified terms and conditions that we come up with.
            </p>
            <p>
              By registering, you certify that all information you provide, now or in the future, is 
              accurate and complete. www.investkaps.com reserves the right, in its sole discretion, to 
              deny you access to this website or any portion thereof without notice for the following reasons:
            </p>
            <ul className="legal-list">
              <li>Immediately by www.investkaps.com for any unauthorized access or use by you</li>
              <li>Immediately by www.investkaps.com if you assign or transfer (or attempt the same) any rights granted to you under this Agreement</li>
              <li>Immediately, if you violate any of the other terms and conditions of this User Agreement</li>
            </ul>
            <p>I agree to receive periodic research reports and to be added to the Telegram channel/s for updates and further communications.</p>
            <p>
              www.investkaps.com hereby grants you a limited, non-exclusive, non-assignable and 
              non-transferable license to access www.investkaps.com and to join the Telegram channel/s, 
              provided and expressly conditioned upon your agreement that all such access and use shall 
              be governed by all of the terms and conditions set forth in this User Agreement.
            </p>
            <p>
              All information on www.investkaps.com and the Telegram channel/s is the proprietary and 
              confidential property of www.investkaps.com and cannot be repeated for any reason outside 
              www.investkaps.com and the Telegram channel/s.
            </p>
            <div className="legal-note-box">
              <h4>Important:</h4>
              <ul>
                <li>You agree not to repeat or rebroadcast in any way any of the recommendations made on www.investkaps.com or on the Telegram channel/s for any reason whatsoever.</li>
                <li>You may not resell, redistribute, broadcast or transfer the information without separately and specifically authorized in writing by www.investkaps.com prior to such use.</li>
                <li>You may not remove, alter or obscure any copyright, legal or proprietary notices in or on any portions of www.investkaps.com or the Telegram channel.</li>
              </ul>
            </div>
            <p>
              You expressly agree that use of the website and the Telegram channel/s is at your sole risk. 
              The contents, information, software, products, features, and services published on this website 
              and the Telegram channel may include inaccuracies or typographical errors.
            </p>
            <p>
              www.investkaps.com and/or its associated entities make no representations about the suitability 
              of the contents, information, software, products, features and services contained on this website 
              and the Telegram channel for any purpose. All such contents are provided "as is" without warranty 
              of any kind.
            </p>
            <div className="legal-disclaimer-box">
              <p>
                <strong>In no event shall www.investkaps.com and/or its associated entities be liable for any 
                direct, indirect, punitive, incidental, special or consequential damages arising out of or in 
                any way connected with the use of this website or the Telegram channel.</strong>
              </p>
            </div>
            <p>
              Neither www.investkaps.com nor the Telegram channel/s shall be liable for any loss or liability 
              resulting, directly or indirectly, from delays or interruptions due to electronic or mechanical 
              equipment failures, telephone interconnect problems, defects, weather, strikes, walkouts, fire, 
              acts of God, riots, armed conflicts, acts of war, or other like causes.
            </p>
            <p>
              You acknowledge that the information provided through www.investkaps.com and the Telegram 
              channel/s is compiled from sources which are beyond the control of www.investkaps.com. Though 
              such information is recognized to be generally reliable, the parties acknowledge that inaccuracies 
              may occur.
            </p>
            <p>
              www.investkaps.com expressly disclaims any and all warranties, whether express, oral, implied, 
              statutory or otherwise, of any kind to the users and/or any third party, including any implied 
              warranties of consistency, timeliness, completeness, merchantability and fitness for a particular purpose.
            </p>
            <p>
              The links in this site and the Telegram channel/s will allow you to leave www.investkaps.com 
              and the Telegram channel/s respectively. The linked sites are not under the control of 
              www.investkaps.com or the Telegram channel/s. www.investkaps.com has not reviewed, nor approved 
              these sites and is not responsible for the contents or omissions of any linked site.
            </p>
            <p>
              You shall indemnify, defend and hold harmless www.investkaps.com and the Telegram channel/s 
              from any and all claims and losses imposed on, incurred by or asserted as a result of or related to:
            </p>
            <ul className="legal-list">
              <li>Your access and use of www.investkaps.com and the Telegram channel/s</li>
              <li>Any non-compliance by user with the terms and conditions hereof</li>
              <li>Any third party actions related to users receipt and use of the information, whether authorized or unauthorized</li>
            </ul>
            <p>
              If www.investkaps.com takes action to enforce any of the provisions of this User Agreement, 
              including collection of any amounts due hereunder, www.investkaps.com shall be entitled to 
              recover from you (and you agree to pay), in addition to all sums to which it is entitled or 
              any other relief, at law or in equity, reasonable and necessary attorney's fees and any costs 
              of any litigation.
            </p>
            <p>
              Investkaps has a contractual arrangement with vendors whereby the vendors provides technology 
              solutions and related back-end infrastructure along with support for back-office related operations 
              & processes. The vendors do not provide any investment advice or recommendation nor does it make 
              any claim of returns or performance with respect to any advice or recommendation.
            </p>
            <p>
              This User Agreement constitutes the entire agreement between the parties, and no other agreement, 
              written or oral, exists between you and www.investkaps.com and the Telegram channel/s.
            </p>
            <p>
              By using the Information on www.investkaps.com and the Telegram channel/s, you assume full 
              responsibility for any and all gains and losses, financial, emotional or otherwise, experienced, 
              suffered or incurred by you.
            </p>
            <p>
              This User Agreement and the license rights granted hereunder shall remain in full force and 
              effect unless terminated or cancelled for any of the following reasons:
            </p>
            <ul className="legal-list">
              <li>Immediately by www.investkaps.com or the Telegram channel/s for any unauthorized access or use by you</li>
              <li>Immediately by www.investkaps.com or the Telegram channel/s if you assign or transfer any rights granted to you under this Agreement</li>
              <li>Immediately, if you violate any of the other terms and conditions of this User Agreement</li>
            </ul>
            <div className="legal-refund-box">
              <p><strong>Regardless of the reason for cancellation or termination of this User Agreement, the fee charged if any for access to www.investkaps.com and the Telegram channel/s is non-refundable for any reason.</strong></p>
            </div>
            <p>
              All disputes, differences and questions of any nature which at any time arise between the 
              parties to this agreement shall be referred to the sole Arbitrator under the Arbitration and 
              Conciliation Act, 1996. The sole Arbitrator shall be appointed by the proprietor of www.investkaps.com.
            </p>
            <p>
              The Arbitration Proceedings shall be held at <strong>Delhi, India</strong>. The laws prevailing 
              in India shall alone apply to the Arbitration Proceedings between the parties.
            </p>
            <p>
              Both the Parties agree that all claims, differences and disputes shall be subject to the 
              <strong> exclusive jurisdiction of the Courts of Delhi only</strong>.
            </p>
            <div className="legal-refund-policy-box">
              <p>
                www.investkaps.com follows a strict no refund policy, and in no case any refunds will be 
                made, nor can the subscription be transferred to any other party.
              </p>
            </div>
            <p>
              I, Kapil Aggarwal (proprietor of investkaps), am registered with SEBI as Individual Research 
              Analyst, in accordance of which I provide Research Analyst services to my clients.
            </p>
            <ul className="legal-list">
              <li>I am not affiliated with any other intermediaries or receive any brokerage or commission from any third party.</li>
              <li>The SEBI has issued no penalties/directions under the SEBI Act or any other regulatory body.</li>
              <li>I do not recommend any stock broker or other intermediary to a client.</li>
              <li>Investment in equity shares has its own risks. I do not vouch for the consistency or the completeness of information.</li>
              <li>I do not provide any promise or assurance of favourable view for a particular industry or sector or business group in any manner.</li>
              <li>I or any person related might be holding positions in the stocks recommended.</li>
              <li>Any Client, third party or anyone else have no rights to forward or share my calls or SMS or Reports or Any Information Provided by me to/with anyone.</li>
              <li>I ensure that if a client wants an opinion on a specific position, such suggestion/view shall be considered as an opinion (not advice).</li>
              <li>Investment in securities market are subject to market risks. Read all the related documents carefully before investing.</li>
              <li>Registration granted by SEBI and certification from NISM is no way guarantee performance of the intermediary or provide any assurance of returns to investors.</li>
            </ul>
            <div className="final-note">
              <p>
                By accessing www.investkaps.com, joining the Telegram channel/s, or any of its associate/group 
                sites, you have read, understood, and agree to be legally bound by the terms of the disclaimer 
                and user agreement.
              </p>
              <p>
                I reserve the right to make changes to our site and these disclaimers, terms, and conditions 
                at any time.
              </p>
            </div>
          </section>

          <section id="investor-charter" className="legal-section">
            <h2>Investor Charter</h2>
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

            <ul className="legal-list">
              <li>To publish research report based on the research activities of the RA</li>
              <li>To provide an independent unbiased view on securities.</li>
              <li>To offer unbiased recommendation, disclosing the financial interests in recommended securities.</li>
              <li>To provide research recommendation, based on analysis of publicly available information and known observations.</li>
              <li>To conduct audit annually</li>
              <li>To ensure that all advertisements/marketing/promotional material are in adherence to the provisions of the Advertisement Code for Research Analysts.</li>
              <li>To maintain records of interactions, with all clients including prospective clients (prior to onboarding), where any conversation related to the research services has taken place.</li>
            </ul>

            <p className="section-note">(No Indicative Timelines)</p>
            <div className="legal-subsection">
              <h3>Onboarding of Clients</h3>
              <ul className="legal-list">
                <li>Sharing of terms and conditions of research services</li>
                <li>Completing KYC of clients</li>
              </ul>
            </div>
            <div className="legal-subsection">
              <h3>Disclosure to Clients</h3>
              <ul className="legal-list">
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

            <div className="legal-subsection">
              <h3>Grievance Redressal Mechanism</h3>
              <h4>1. Filing Complaint with Research Analyst</h4>
              <p>
                In case of any grievance/complaint, an investor should approach the concerned research 
                analyst who shall strive to redress the grievance immediately, but not later than 
                <strong> 21 days</strong> of the receipt of the grievance.
              </p>
              <h4>2. Filing Complaint on SCORES or with RAASB</h4>
              <p>
                A web based centralized grievance redressal system of SEBI for facilitating effective 
                grievance redressal in time-bound manner.
              </p>
              <p>
                <a href="https://scores.sebi.gov.in" target="_blank" rel="noopener noreferrer">Visit SCORES Portal →</a>
              </p>
              <ul className="legal-list">
                <li>First review done by designated body (RAASB)</li>
                <li>Second review done by SEBI</li>
              </ul>
              <h4>3. SMART ODR Platform</h4>
              <p>
                If the Investor is not satisfied with the resolution provided by the Market Participants, 
                then the investor has the option to file the complaint/grievance on SMART ODR platform 
                for its resolution through online conciliation or arbitration.
              </p>
              <address className="legal-address">
                Office of Investor Assistance and Education,<br />
                Securities and Exchange Board of India,<br />
                SEBI Bhavan. Plot No. C4-A, 'G' Block,<br />
                Bandra-Kurla Complex, Bandra (E),<br />
                Mumbai – 400 051.
              </address>
            </div>

            <div className="legal-subsection">
              <h3>Rights of Investors</h3>
              <ul className="legal-list">
                <li>Right to Privacy and Confidentiality</li>
                <li>Right to Transparent Practices</li>
                <li>Right to fair and Equitable Treatment</li>
                <li>Right to Adequate Information</li>
                <li>Right to Initial and Continuing Disclosure</li>
                <li>Right to Fair &amp; True Advertisement</li>
                <li>Right to Awareness about Service Parameters and Turnaround Times</li>
                <li>Right to be heard and Satisfactory Grievance Redressal</li>
                <li>Right to Exit from Financial product or service</li>
                <li>Right to receive clear guidance and caution notice when dealing in Complex and High-Risk Financial Products and Services</li>
                <li>Additional Rights to vulnerable consumers</li>
                <li>Right to provide feedback on the financial products and services used</li>
                <li>Right against coercive, unfair, and one-sided clauses in financial agreements</li>
                <li>Right to enforceability and holding the Research Analyst responsible for monitoring, enforcing investor rights.</li>
              </ul>
            </div>

            <div className="legal-subsection">
              <h3>Do's and Don'ts</h3>
              <div className="dos-donts-grid">
                <div className="dos-section">
                  <h4>✓ Do's</h4>
                  <ul className="legal-list">
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
                  <h4>✗ Don'ts</h4>
                  <ul className="legal-list">
                    <li>Do not provide funds for investment to the Research Analyst</li>
                    <li>Don't fall prey to luring advertisements or market rumors.</li>
                    <li>Do not get attracted to limited-period discounts or other incentives, gifts, etc., offered by the Research Analyst.</li>
                    <li>Do not share login credentials and passwords of your trading and demat accounts with the Research Analyst.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="valid-upi" className="legal-section">
            <h2>Valid UPI</h2>
            <h3>SEBI Validated @Valid UPI Handles</h3>
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

          <section id="faqs" className="legal-section">
            <h2>FAQs</h2>
            <div className="faq-item">
              <h3>I have many basic questions about SEBI RAs in general. Where can I know more about them?</h3>
              <p>
                <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112860/FAQs.pdf" target="_blank" rel="noopener noreferrer">Click here</a>.
              </p>
            </div>
            <div className="faq-item">
              <h3>I know about SEBI RAs but I want to know more about investkaps, its offerings and how to subscribe. Where can I know more?</h3>
              <p>
                <a href="https://res.cloudinary.com/dh9pmvu5j/image/upload/v1767112860/FAQs.pdf" target="_blank" rel="noopener noreferrer">Click here</a>.
              </p>
            </div>
            <div className="faq-item">
              <h3>How do I verify genuine Research Analyst so as to not fall prey to impersonation fraud?</h3>
              <p>
                Please refer to <a href="#complaints-and-audit">Complaints and Audit</a> and ensure the correct registered RA details including contact number on <a href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=14" target="_blank" rel="noopener noreferrer">SEBI website</a>.
              </p>
            </div>
          </section>

          <section id="complaints-and-audit" className="legal-section">
            <h2>Complaints and Audit</h2>
            <p>
              We are pleased to inform you that in full compliance with SEBI regulations, 
              our audit for FY25 is duly completed. You may access the Auditor's Report by <a href="/audit.png" target="_blank" rel="noopener noreferrer">clicking here</a>.
            </p>
            <p>
              <strong>investkaps</strong> maintains highest level of internal governance, 
              code of ethics and regulatory compliances and will continue to do so.
            </p>
            <h3>Data for the Month Ending March 2026</h3>
            <div className="legal-table-shell">
              <div className="legal-table-wrap">
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
              <div className="legal-table-wrap">
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
              <div className="legal-table-wrap">
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

          <section id="cancellations-and-refunds" className="legal-section">
            <h2>Cancellations and Refunds</h2>
            <div className="legal-alert-box">
              <h3>No Refund Policy</h3>
              <p>
                There is no provision for any refund or cancellations for the services offered by 
                investkaps through its website <strong>www.investkaps.com</strong>, its subdomains 
                or its associate or affiliate channels.
              </p>
            </div>
            <h3>Before You Subscribe</h3>
            <p>
              Therefore, I request you to read through all the information including frequently asked 
              questions (FAQs) about the scope of the service before subscribing. Thereafter, if you 
              have any queries, then please feel free to write to me at{' '}
              <a href="mailto:support@investkaps.com">support@investkaps.com</a>{' '}
              before you make any purchase.
            </p>
            <div className="legal-agreement-box">
              <h3>Your Agreement</h3>
              <p>
                By availing of services, you agree to the condition of no cancellations or refunds.
              </p>
            </div>
            <div className="legal-support-box">
              <h3>Have Questions?</h3>
              <p>
                Please contact us before making any purchase decision. We're here to help clarify 
                any doubts you may have about our services.
              </p>
              <a href="mailto:support@investkaps.com">Contact Support</a>
            </div>
          </section>

          <section id="grievance-redressal" className="legal-section">
            <h2>Grievance Redressal</h2>
            <p className="intro-text">Here are the steps a client can follow in case of grievance or feedback:</p>
            <div className="grievance-step">
              <h3>Contact Us Directly</h3>
              <p>
                If you are not satisfied with my services or would like a discussion on the matter 
                or pass on a feedback, please reach out on the details mentioned in contact us 
                section through either email or phone or whatsapp.
              </p>
              <p><strong>First Response:</strong> Within 24 hours seeking further details if any.</p>
              <p><strong>Resolution Timeline:</strong> Best possible resolution or atleast any update within 7 working days after thoroughly revisiting all aspects of your submission.</p>
            </div>
            <div className="grievance-step">
              <h3>Escalate to SEBI</h3>
              <p>
                Under the unfortunate circumstances wherein if you do not hear back as per above 
                timelines or your complaint is not resolved to satisfaction, you may refer your 
                complaint to the regulator through below mechanisms established by The Securities 
                and Exchange Board of India (SEBI).
              </p>
              <h4>SCORES</h4>
              <p>SEBI Complaints Redress System</p>
              <a href="https://www.scores.sebi.gov.in" target="_blank" rel="noopener noreferrer">www.scores.sebi.gov.in</a>
              <h4>ODR Portal</h4>
              <p>Online Dispute Resolution</p>
              <a href="https://www.smartodr.in" target="_blank" rel="noopener noreferrer">www.smartodr.in</a>
            </div>
            <div className="legal-contact-cta">
              <h3>Need Help?</h3>
              <p>
                We are committed to resolving your concerns promptly and fairly. Please don't 
                hesitate to reach out to us.
              </p>
              <a href="/legal#contact-us">Contact Us</a>
            </div>
          </section>

          <section id="code-of-conduct" className="legal-section">
            <h2>Code of Conduct</h2>
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
        </main>
      </div>
    </div>
  );
};

export default LegalCenter;
