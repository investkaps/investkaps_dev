import { useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import StockRecommendations from '../../components/Dashboard/StockRecommendations';

const PageContainer = styled.div`
  padding: 24px;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #666;
  margin: 8px 0 0 0;
  font-size: 16px;
`;

const UserRecommendations = () => {
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);
  
  if (!isAuthenticated) {
    return (
      <PageContainer>
        <p>Please log in to view your stock recommendations.</p>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <PageHeader>
        <Title>Your Stock Recommendations</Title>
        <Subtitle>
          Personalized stock recommendations based on your subscription plan
        </Subtitle>
      </PageHeader>
      
      <StockRecommendations />
    </PageContainer>
  );
};

export default UserRecommendations;
