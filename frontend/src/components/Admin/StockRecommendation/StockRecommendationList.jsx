import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import stockRecommendationAPI from '../../../services/stockRecommendationAPI';

const ListContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: #f5f5f5;
  
  th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #333;
    border-bottom: 2px solid #ddd;
  }
`;

const TableBody = styled.tbody`
  tr {
    border-bottom: 1px solid #eee;
    
    &:hover {
      background-color: #f9f9f9;
    }
  }
  
  td {
    padding: 12px 16px;
    vertical-align: middle;
  }
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

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
  
  &:hover {
    color: #0b73ff;
  }
  
  &.delete:hover {
    color: #e53935;
  }
  
  &.send:hover {
    color: #43a047;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 8px;
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

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
`;

const PageInfo = styled.div`
  font-size: 14px;
  color: #666;
`;

const PageButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PageButton = styled.button`
  background-color: ${props => props.active ? '#0b73ff' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background-color: ${props => props.active ? '#0a5dd0' : '#e0e0e0'};
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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

const StockRecommendationList = ({ onEdit, onView }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      
      const response = await stockRecommendationAPI.getAllRecommendations(filters, page, 10);
      
      if (response.success) {
        setRecommendations(response.data);
        setTotalPages(response.totalPages);
        setTotalItems(response.total);
      } else {
        setError(response.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching recommendations');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRecommendations();
  }, [page, statusFilter]);
  
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recommendation?')) {
      return;
    }
    
    try {
      const response = await stockRecommendationAPI.deleteRecommendation(id);
      
      if (response.success) {
        // Refresh the list
        fetchRecommendations();
      } else {
        setError(response.error || 'Failed to delete recommendation');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while deleting the recommendation');
    }
  };
  
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
  
  return (
    <ListContainer>
      <h2>Stock Recommendations</h2>
      
      <FilterGroup>
        <FilterSelect 
          value={statusFilter} 
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1); // Reset to first page when filter changes
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </FilterSelect>
      </FilterGroup>
      
      {loading ? (
        <p>Loading recommendations...</p>
      ) : error ? (
        <p style={{ color: '#e53935' }}>{error}</p>
      ) : recommendations.length === 0 ? (
        <EmptyState>
          <h3>No recommendations found</h3>
          <p>Create a new recommendation to get started.</p>
        </EmptyState>
      ) : (
        <>
          <Table>
            <TableHead>
              <tr>
                <th>Stock</th>
                <th>Recommendation</th>
                <th>Price Info</th>
                <th>Time Frame</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {recommendations.map(recommendation => (
                <tr key={recommendation._id}>
                  <td>
                    <div>
                      <strong>{recommendation.stockSymbol}</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {recommendation.stockName}
                    </div>
                  </td>
                  <td>
                    <RecommendationType type={recommendation.recommendationType}>
                      {formatRecommendationType(recommendation.recommendationType)}
                    </RecommendationType>
                  </td>
                  <td>
                    <div>Current: ₹{recommendation.currentPrice.toFixed(2)}</div>
                    <div>Target: ₹{recommendation.targetPrice.toFixed(2)}</div>
                    {recommendation.stopLoss && (
                      <div>Stop Loss: ₹{recommendation.stopLoss.toFixed(2)}</div>
                    )}
                  </td>
                  <td>{formatTimeFrame(recommendation.timeFrame)}</td>
                  <td>
                    <StatusBadge status={recommendation.status}>
                      {recommendation.status}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(recommendation.publishedAt)}</td>
                  <td>
                    <ActionGroup>
                      <ActionButton 
                        title="View Details" 
                        onClick={() => onView(recommendation)}
                      >
                        <FaEye />
                      </ActionButton>
                      <ActionButton 
                        title="Edit" 
                        onClick={() => onEdit(recommendation)}
                      >
                        <FaEdit />
                      </ActionButton>
                      <ActionButton 
                        className="delete" 
                        title="Delete" 
                        onClick={() => handleDelete(recommendation._id)}
                      >
                        <FaTrash />
                      </ActionButton>
                    </ActionGroup>
                  </td>
                </tr>
              ))}
            </TableBody>
          </Table>
          
          <Pagination>
            <PageInfo>
              Showing {recommendations.length} of {totalItems} recommendations
            </PageInfo>
            <PageButtons>
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
            </PageButtons>
          </Pagination>
        </>
      )}
    </ListContainer>
  );
};

export default StockRecommendationList;
