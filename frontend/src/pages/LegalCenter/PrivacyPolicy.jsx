import React from 'react';
import './LegalCenter.css';

const PrivacyPolicy = () => (
  <div className="legal-center-page">
    <div className="legal-center-container">
      <header className="legal-center-header">
        <h1 className="legal-center-title">
          <span className="lang-en" lang="en">Privacy Policy</span>
          <span className="lang-hi" lang="hi">गोपनीयता नीति</span>
        </h1>
      </header>

      <section id="privacy-policy" className="legal-section">
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
            We protect the confidentiality of clients' Mobile Number, Name, and Address &amp; Email Id
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
          related operations &amp; processes. The vendors do not provide any investment advice or
          recommendation nor does it make any claim of returns or performance with respect to any
          advice or recommendation.
        </p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicy;
