import { useState } from 'react';
import styled from 'styled-components';
import { FaPlus, FaSync } from 'react-icons/fa';
import StockRecommendationList from '../../components/Admin/StockRecommendation/StockRecommendationList';
import StockRecommendationForm from '../../components/Admin/StockRecommendation/StockRecommendationForm';
import StockRecommendationDetail from '../../components/Admin/StockRecommendation/StockRecommendationDetail';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';

const PageContainer = styled.div`
  padding: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #0b73ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #0a5dd0;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: #218838;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  svg {
    transition: transform 0.5s;
  }
  
  &.refreshing svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const StatusMessage = styled.div`
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-weight: 500;
  
  &.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;

const StockRecommendations = () => {
  const [view, setView] = useState('list'); // 'list', 'create', 'edit', 'detail'
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  
  const handleCreateClick = () => {
    setSelectedRecommendation(null);
    setView('create');
  };
  
  
  const handleEditClick = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setView('edit');
  };
  
  const handleViewClick = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setView('detail');
  };
  
  const handleFormSuccess = () => {
    setView('list');
  };
  
  const handleFormCancel = () => {
    setView('list');
  };
  
  const handleBackToList = () => {
    setView('list');
  };
  
  return (
    <PageContainer>
      <PageHeader>
        <Title>Stock Recommendations</Title>
        {view === 'list' && (
          <ButtonGroup>
            <CreateButton onClick={handleCreateClick}>
              <FaPlus /> Create Recommendation
            </CreateButton>
          </ButtonGroup>
        )}
      </PageHeader>
      
      {statusMessage && (
        <StatusMessage className={statusMessage.type}>
          {statusMessage.text}
        </StatusMessage>
      )}
      
      {view === 'list' && (
        <StockRecommendationList 
          onEdit={handleEditClick}
          onView={handleViewClick}
        />
      )}
      
      {(view === 'create' || view === 'edit') && (
        <StockRecommendationForm 
          recommendation={view === 'edit' ? selectedRecommendation : null}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
      
      {view === 'detail' && (
        <StockRecommendationDetail 
          recommendation={selectedRecommendation}
          onBack={handleBackToList}
          onEdit={handleEditClick}
        />
      )}
    </PageContainer>
  );
};

export default StockRecommendations;
