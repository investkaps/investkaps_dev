import React from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <h1 className="policy-title">Privacy Policy</h1>
        
        <section className="policy-section">
          <h2>Disclosures</h2>
          <p>
            investkaps offers independent equity research services to retail clients as well as 
            corporate clients on subscription basis.
          </p>
        </section>

        <section className="policy-section">
          <h2>Use of Information</h2>
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
        </section>

        <section className="policy-section">
          <h2>Data Collection and Protection</h2>
          <ul className="policy-list">
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
        </section>

        <section className="policy-section">
          <h2>Third Party Vendors</h2>
          <p>
            investkaps has a contractual arrangement with vendors whereby the vendors provide 
            technology solutions and related back-end infrastructure along with support for back-office 
            related operations & processes. The vendors do not provide any investment advice or 
            recommendation nor does it make any claim of returns or performance with respect to any 
            advice or recommendation.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
