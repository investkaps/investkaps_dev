import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaArrowLeft, FaEdit, FaFilePdf } from 'react-icons/fa';
import stockRecommendationAPI from '../../../services/stockRecommendationAPI';
import PDFReportGenerator from '../../PDFReportGenerator/PDFReportGenerator';

const DetailContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  color: #0b73ff;
  font-weight: 600;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: ${props => props.primary ? '#0b73ff' : props.pdf ? '#dc2626' : '#f5f5f5'};
  color: ${props => (props.primary || props.pdf) ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.primary ? '#0a5dd0' : props.pdf ? '#b91c1c' : '#e0e0e0'};
  }
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const InfoItem = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
`;

const Value = styled.div`
  font-size: 16px;
  color: #333;
  font-weight: 500;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    if (props.status === 'published') {
      return `
        background-color: #e6f7e6;
        color: #2e7d32;
      `;
    } else if (props.status === 'draft') {
      return `
        background-color: #e6f0ff;
        color: #0d47a1;
      `;
    } else {
      return `
        background-color: #f5f5f5;
        color: #757575;
      `;
    }
  }}
`;

const RecommendationType = styled.span`
  font-weight: 600;
  
  ${props => {
    if (props.type === 'buy') {
      return `color: #2e7d32;`;
    } else if (props.type === 'sell') {
      return `color: #c62828;`;
    } else {
      return `color: #f57c00;`;
    }
  }}
`;

const SubscriptionList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const SubscriptionTag = styled.span`
  background-color: #f5f5f5;
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const StatCard = styled.div`
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0b73ff;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #666;
`;

const StockRecommendationDetail = ({ recommendation, onBack, onEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailedRecommendation, setDetailedRecommendation] = useState(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  
  useEffect(() => {
    const fetchDetails = async () => {
      if (!recommendation || !recommendation._id) return;
      
      setLoading(true);
      try {
        const response = await stockRecommendationAPI.getRecommendation(recommendation._id);
        
        if (response.success) {
          setDetailedRecommendation(response.data);
        } else {
          setError(response.error || 'Failed to fetch recommendation details');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching recommendation details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [recommendation]);
  
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatRecommendationType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  const formatTimeFrame = (timeFrame) => {
    switch(timeFrame) {
      case 'short_term':
        return 'Short Term';
      case 'medium_term':
        return 'Medium Term';
      case 'long_term':
        return 'Long Term';
      default:
        return timeFrame;
    }
  };
  
  
  if (loading && !detailedRecommendation) {
    return <p>Loading recommendation details...</p>;
  }
  
  if (error) {
    return <p style={{ color: '#e53935' }}>{error}</p>;
  }
  
  if (!detailedRecommendation) {
    return <p>No recommendation details available</p>;
  }
  
  const viewCount = detailedRecommendation.viewedBy?.length || 0;
  
  return (
    <DetailContainer>
      <Header>
        <BackButton onClick={onBack}>
          <FaArrowLeft /> Back to List
        </BackButton>
        
        <ActionButtons>
          <Button onClick={() => onEdit(detailedRecommendation)}>
            <FaEdit /> Edit
          </Button>
          {detailedRecommendation.pdfReport && detailedRecommendation.pdfReport.url ? (
            <Button pdf onClick={() => window.open(detailedRecommendation.pdfReport.url, '_blank')}>
              <FaFilePdf /> View PDF
            </Button>
          ) : (
            <Button pdf onClick={() => setShowPDFModal(true)}>
              <FaFilePdf /> Generate PDF
            </Button>
          )}
        </ActionButtons>
      </Header>
      
      <h2>{detailedRecommendation.title}</h2>
      
      <Section>
        <SectionTitle>Stock Information</SectionTitle>
        <Grid>
          <InfoItem>
            <Label>Stock Symbol</Label>
            <Value>{detailedRecommendation.stockSymbol}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Stock Name</Label>
            <Value>{detailedRecommendation.stockName}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Recommendation</Label>
            <Value>
              <RecommendationType type={detailedRecommendation.recommendationType}>
                {formatRecommendationType(detailedRecommendation.recommendationType)}
              </RecommendationType>
            </Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Status</Label>
            <Value>
              <StatusBadge status={detailedRecommendation.status}>
                {detailedRecommendation.status}
              </StatusBadge>
            </Value>
          </InfoItem>
        </Grid>
      </Section>
      
      <Section>
        <SectionTitle>Price Information</SectionTitle>
        <Grid>
          <InfoItem>
            <Label>Current Price</Label>
            <Value>₹{detailedRecommendation.currentPrice.toFixed(2)}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Target Price</Label>
            <Value>₹{detailedRecommendation.targetPrice.toFixed(2)}</Value>
          </InfoItem>
          
          {detailedRecommendation.stopLoss && (
            <InfoItem>
              <Label>Stop Loss</Label>
              <Value>₹{detailedRecommendation.stopLoss.toFixed(2)}</Value>
            </InfoItem>
          )}
          
          <InfoItem>
            <Label>Potential Return</Label>
            <Value>
              {(((detailedRecommendation.targetPrice - detailedRecommendation.currentPrice) / 
                detailedRecommendation.currentPrice) * 100).toFixed(2)}%
            </Value>
          </InfoItem>
        </Grid>
      </Section>
      
      <Section>
        <SectionTitle>Investment Details</SectionTitle>
        <Grid>
          <InfoItem>
            <Label>Time Frame</Label>
            <Value>{formatTimeFrame(detailedRecommendation.timeFrame)}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Created At</Label>
            <Value>{formatDate(detailedRecommendation.createdAt)}</Value>
          </InfoItem>
          
          <InfoItem>
            <Label>Published At</Label>
            <Value>{formatDate(detailedRecommendation.publishedAt)}</Value>
          </InfoItem>
          
          {detailedRecommendation.expiresAt && (
            <InfoItem>
              <Label>Expires At</Label>
              <Value>{formatDate(detailedRecommendation.expiresAt)}</Value>
            </InfoItem>
          )}
        </Grid>
      </Section>
      
      <Section>
        <SectionTitle>Description</SectionTitle>
        <p>{detailedRecommendation.description}</p>
      </Section>
      
      <Section>
        <SectionTitle>Rationale</SectionTitle>
        <p>{detailedRecommendation.rationale}</p>
      </Section>
      
      <Section>
        <SectionTitle>Target Subscriptions</SectionTitle>
        <SubscriptionList>
          {detailedRecommendation.targetSubscriptions?.length > 0 ? (
            detailedRecommendation.targetSubscriptions.map(subscription => (
              <SubscriptionTag key={subscription._id}>
                {subscription.name}
              </SubscriptionTag>
            ))
          ) : (
            <p>No target subscriptions specified</p>
          )}
        </SubscriptionList>
      </Section>
      
      <Section>
        <SectionTitle>Recommendation Stats</SectionTitle>
        <StatsGrid>
          <StatCard>
            <StatValue>{viewCount}</StatValue>
            <StatLabel>Viewed by Users</StatLabel>
          </StatCard>
        </StatsGrid>
      </Section>
      
      {/* PDF Report Generator Modal */}
      {showPDFModal && (
        <PDFReportGenerator
          recommendation={detailedRecommendation}
          onClose={() => setShowPDFModal(false)}
        />
      )}
    </DetailContainer>
  );
};

export default StockRecommendationDetail;
