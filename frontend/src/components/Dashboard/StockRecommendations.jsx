import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';

const Container = styled.div`
  margin-bottom: 32px;
`;

const RecommendationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const RecommendationCard = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #eee;
`;

const StockSymbol = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #333;
`;

const StockName = styled.div`
  font-size: 14px;
  color: #666;
  margin-top: 4px;
`;

const CardBody = styled.div`
  padding: 16px;
`;

const PriceInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const PriceColumn = styled.div`
  text-align: center;
`;

const PriceLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const PriceValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const RecommendationInfo = styled.div`
  margin-bottom: 16px;
`;

const RecommendationLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`;

const RecommendationType = styled.div`
  font-size: 16px;
  font-weight: 700;
  
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

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const InfoItem = styled.div``;

const InfoLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
`;

const InfoValue = styled.div`
  font-size: 14px;
  color: #333;
`;

const Description = styled.div`
  margin-top: 16px;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
`;

const ViewMoreButton = styled.button`
  display: block;
  width: 100%;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-top: 1px solid #eee;
  padding: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 0;
  color: #666;
  
  p {
    margin-top: 8px;
    font-size: 14px;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`;

const PageButton = styled.button`
  background-color: ${props => props.active ? '#0b73ff' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 0 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background-color: ${props => props.active ? '#0a5dd0' : '#e0e0e0'};
  }
`;

const DetailModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const StockRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const response = await stockRecommendationAPI.getUserRecommendations(page, 6);
        
        if (response.success) {
          setRecommendations(response.data);
          setTotalPages(response.totalPages);
        } else {
          setError(response.error || 'Failed to fetch recommendations');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching recommendations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [user, page]);
  
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
  
  
  const handleViewMore = (recommendation) => {
    setSelectedRecommendation(recommendation);
  };
  
  const closeModal = () => {
    setSelectedRecommendation(null);
  };
  
  if (loading) {
    return <p>Loading stock recommendations...</p>;
  }
  
  if (error) {
    return <p style={{ color: '#e53935' }}>{error}</p>;
  }
  
  return (
    <Container>
      <h2>Stock Recommendations</h2>
      
      {recommendations.length === 0 ? (
        <EmptyState>
          <h3>No recommendations available</h3>
          <p>Check back later for stock recommendations based on your subscription.</p>
        </EmptyState>
      ) : (
        <>
          <RecommendationGrid>
            {recommendations.map(recommendation => (
              <RecommendationCard key={recommendation._id}>
                <CardHeader>
                  <StockSymbol>{recommendation.stockSymbol}</StockSymbol>
                  <StockName>{recommendation.stockName}</StockName>
                </CardHeader>
                
                <CardBody>
                  <PriceInfo>
                    <PriceColumn>
                      <PriceLabel>Current Price</PriceLabel>
                      <PriceValue>₹{recommendation.currentPrice.toFixed(2)}</PriceValue>
                    </PriceColumn>
                    
                    <PriceColumn>
                      <PriceLabel>Target Price</PriceLabel>
                      <PriceValue>₹{recommendation.targetPrice.toFixed(2)}</PriceValue>
                    </PriceColumn>
                    
                    {recommendation.stopLoss && (
                      <PriceColumn>
                        <PriceLabel>Stop Loss</PriceLabel>
                        <PriceValue>₹{recommendation.stopLoss.toFixed(2)}</PriceValue>
                      </PriceColumn>
                    )}
                  </PriceInfo>
                  
                  <RecommendationInfo>
                    <RecommendationLabel>Recommendation</RecommendationLabel>
                    <RecommendationType type={recommendation.recommendationType}>
                      {formatRecommendationType(recommendation.recommendationType)}
                    </RecommendationType>
                  </RecommendationInfo>
                  
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>Time Frame</InfoLabel>
                      <InfoValue>{formatTimeFrame(recommendation.timeFrame)}</InfoValue>
                    </InfoItem>
                    
                    <InfoItem>
                      <InfoLabel>Published</InfoLabel>
                      <InfoValue>{formatDate(recommendation.publishedAt)}</InfoValue>
                    </InfoItem>
                    
                    {recommendation.expiresAt && (
                      <InfoItem>
                        <InfoLabel>Expires</InfoLabel>
                        <InfoValue>{formatDate(recommendation.expiresAt)}</InfoValue>
                      </InfoItem>
                    )}
                  </InfoGrid>
                  
                  <Description>
                    {recommendation.description.length > 100
                      ? `${recommendation.description.substring(0, 100)}...`
                      : recommendation.description}
                  </Description>
                </CardBody>
                
                <div style={{ display: 'flex', gap: '10px', padding: '0 20px 20px' }}>
                  <ViewMoreButton onClick={() => handleViewMore(recommendation)}>
                    View Details
                  </ViewMoreButton>
                  {recommendation.pdfReport && recommendation.pdfReport.url && (
                    <ViewMoreButton 
                      as="a" 
                      href={recommendation.pdfReport.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ backgroundColor: '#dc2626', textDecoration: 'none', textAlign: 'center' }}
                    >
                      Download PDF
                    </ViewMoreButton>
                  )}
                </div>
              </RecommendationCard>
            ))}
          </RecommendationGrid>
          
          {totalPages > 1 && (
            <Pagination>
              <PageButton 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </PageButton>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <PageButton 
                  key={pageNum}
                  active={pageNum === page}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </PageButton>
              ))}
              
              <PageButton 
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
      
      {selectedRecommendation && (
        <DetailModal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{selectedRecommendation.title}</ModalTitle>
              <CloseButton onClick={closeModal}>&times;</CloseButton>
            </ModalHeader>
            
            <div>
              <h3>{selectedRecommendation.stockName} ({selectedRecommendation.stockSymbol})</h3>
              
              <PriceInfo>
                <PriceColumn>
                  <PriceLabel>Current Price</PriceLabel>
                  <PriceValue>₹{selectedRecommendation.currentPrice.toFixed(2)}</PriceValue>
                </PriceColumn>
                
                <PriceColumn>
                  <PriceLabel>Target Price</PriceLabel>
                  <PriceValue>₹{selectedRecommendation.targetPrice.toFixed(2)}</PriceValue>
                </PriceColumn>
                
                {selectedRecommendation.stopLoss && (
                  <PriceColumn>
                    <PriceLabel>Stop Loss</PriceLabel>
                    <PriceValue>₹{selectedRecommendation.stopLoss.toFixed(2)}</PriceValue>
                  </PriceColumn>
                )}
                
                <PriceColumn>
                  <PriceLabel>Potential Return</PriceLabel>
                  <PriceValue>
                    {(((selectedRecommendation.targetPrice - selectedRecommendation.currentPrice) / 
                      selectedRecommendation.currentPrice) * 100).toFixed(2)}%
                  </PriceValue>
                </PriceColumn>
              </PriceInfo>
              
              <InfoGrid style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <InfoItem>
                  <InfoLabel>Recommendation</InfoLabel>
                  <InfoValue>
                    <RecommendationType type={selectedRecommendation.recommendationType}>
                      {formatRecommendationType(selectedRecommendation.recommendationType)}
                    </RecommendationType>
                  </InfoValue>
                </InfoItem>
                
                <InfoItem>
                  <InfoLabel>Time Frame</InfoLabel>
                  <InfoValue>{formatTimeFrame(selectedRecommendation.timeFrame)}</InfoValue>
                </InfoItem>
              </InfoGrid>
              
              <div style={{ marginTop: '24px' }}>
                <h4>Description</h4>
                <p>{selectedRecommendation.description}</p>
              </div>
              
              <div style={{ marginTop: '24px' }}>
                <h4>Rationale</h4>
                <p>{selectedRecommendation.rationale}</p>
              </div>
              
              {selectedRecommendation.pdfReport && selectedRecommendation.pdfReport.url && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <a 
                    href={selectedRecommendation.pdfReport.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}
                  >
                    📄 Download Full Report (PDF)
                  </a>
                </div>
              )}
            </div>
          </ModalContent>
        </DetailModal>
      )}
    </Container>
  );
};

export default StockRecommendations;
