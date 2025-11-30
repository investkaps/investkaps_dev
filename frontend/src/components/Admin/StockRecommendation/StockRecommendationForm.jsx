import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import stockRecommendationAPI from '../../../services/stockRecommendationAPI';
import { adminAPI } from '../../../services/api';

const FormContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #333;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const TextArea = styled.textarea`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-height: 100px;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const Button = styled.button`
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
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #e53935;
  font-size: 14px;
  margin-top: 4px;
`;

const SubscriptionSelector = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: ${props => props.checked ? '#e6f0ff' : 'white'};
  transition: all 0.2s;

  &:hover {
    background-color: #f0f7ff;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
`;

const StockRecommendationForm = ({ recommendation = null, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    stockSymbol: '',
    stockName: '',
    currentPrice: '',
    targetPrice: '',
    stopLoss: '',
    recommendationType: 'buy',
    timeFrame: 'short_term',
    description: '',
    rationale: '',
    riskLevel: 'moderate',
    targetSubscriptions: [],
    status: 'draft',
    expiresAt: ''
  });
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await adminAPI.getAllSubscriptions();
        setSubscriptions(response.data || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      }
    };

    fetchSubscriptions();
  }, []);

  // If editing, populate form with recommendation data
  useEffect(() => {
    if (recommendation) {
      const expiresAt = recommendation.expiresAt 
        ? new Date(recommendation.expiresAt).toISOString().split('T')[0]
        : '';
      
      setFormData({
        title: recommendation.title || '',
        stockSymbol: recommendation.stockSymbol || '',
        stockName: recommendation.stockName || '',
        currentPrice: recommendation.currentPrice || '',
        targetPrice: recommendation.targetPrice || '',
        stopLoss: recommendation.stopLoss || '',
        recommendationType: recommendation.recommendationType || 'buy',
        timeFrame: recommendation.timeFrame || 'short_term',
        description: recommendation.description || '',
        rationale: recommendation.rationale || '',
        riskLevel: recommendation.riskLevel || 'moderate',
        targetSubscriptions: recommendation.targetSubscriptions?.map(sub => 
          typeof sub === 'object' ? sub._id : sub
        ) || [],
        status: recommendation.status || 'draft',
        expiresAt
      });
    }
  }, [recommendation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    if (value === '' || !isNaN(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubscriptionToggle = (subscriptionId) => {
    setFormData(prev => {
      const isSelected = prev.targetSubscriptions.includes(subscriptionId);
      
      if (isSelected) {
        return {
          ...prev,
          targetSubscriptions: prev.targetSubscriptions.filter(id => id !== subscriptionId)
        };
      } else {
        return {
          ...prev,
          targetSubscriptions: [...prev.targetSubscriptions, subscriptionId]
        };
      }
    });
  };

  const validateForm = () => {
    if (!formData.title) return 'Title is required';
    if (!formData.stockSymbol) return 'Stock symbol is required';
    if (!formData.stockName) return 'Stock name is required';
    if (!formData.currentPrice) return 'Current price is required';
    if (!formData.targetPrice) return 'Target price is required';
    if (!formData.description) return 'Description is required';
    if (!formData.rationale) return 'Rationale is required';
    if (formData.targetSubscriptions.length === 0) return 'Select at least one subscription';
    
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Convert string values to numbers
      const dataToSubmit = {
        ...formData,
        currentPrice: parseFloat(formData.currentPrice),
        targetPrice: parseFloat(formData.targetPrice),
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined
      };
      
      let response;
      
      if (recommendation) {
        // Update existing recommendation
        response = await stockRecommendationAPI.updateRecommendation(
          recommendation._id,
          dataToSubmit
        );
      } else {
        // Create new recommendation
        response = await stockRecommendationAPI.createRecommendation(dataToSubmit);
      }
      
      if (response.success) {
        onSuccess(response.data);
      } else {
        setError(response.error || 'Failed to save recommendation');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving the recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <h2>{recommendation ? 'Edit Stock Recommendation' : 'Create New Stock Recommendation'}</h2>
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="title">Title</Label>
          <Input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a descriptive title"
            required
          />
        </FormGroup>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="stockSymbol">Stock Symbol</Label>
            <Input
              type="text"
              id="stockSymbol"
              name="stockSymbol"
              value={formData.stockSymbol}
              onChange={handleChange}
              placeholder="e.g., RELIANCE"
              required
            />
          </FormGroup>
          
          <FormGroup style={{ flex: 2 }}>
            <Label htmlFor="stockName">Stock Name</Label>
            <Input
              type="text"
              id="stockName"
              name="stockName"
              value={formData.stockName}
              onChange={handleChange}
              placeholder="e.g., Reliance Industries Ltd."
              required
            />
          </FormGroup>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="currentPrice">Current Price (₹)</Label>
            <Input
              type="text"
              id="currentPrice"
              name="currentPrice"
              value={formData.currentPrice}
              onChange={handleNumberChange}
              placeholder="0.00"
              required
            />
          </FormGroup>
          
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="targetPrice">Target Price (₹)</Label>
            <Input
              type="text"
              id="targetPrice"
              name="targetPrice"
              value={formData.targetPrice}
              onChange={handleNumberChange}
              placeholder="0.00"
              required
            />
          </FormGroup>
          
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="stopLoss">Stop Loss (₹) (Optional)</Label>
            <Input
              type="text"
              id="stopLoss"
              name="stopLoss"
              value={formData.stopLoss}
              onChange={handleNumberChange}
              placeholder="0.00"
            />
          </FormGroup>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="recommendationType">Recommendation Type</Label>
            <Select
              id="recommendationType"
              name="recommendationType"
              value={formData.recommendationType}
              onChange={handleChange}
              required
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="hold">Hold</option>
            </Select>
          </FormGroup>
          
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="timeFrame">Time Frame</Label>
            <Select
              id="timeFrame"
              name="timeFrame"
              value={formData.timeFrame}
              onChange={handleChange}
              required
            >
              <option value="short_term">Short Term</option>
              <option value="medium_term">Medium Term</option>
              <option value="long_term">Long Term</option>
            </Select>
          </FormGroup>
          
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="riskLevel">Risk Level</Label>
            <Select
              id="riskLevel"
              name="riskLevel"
              value={formData.riskLevel}
              onChange={handleChange}
              required
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </Select>
          </FormGroup>
        </div>
        
        <FormGroup>
          <Label htmlFor="description">Description</Label>
          <TextArea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide a detailed description of the recommendation"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="rationale">Rationale</Label>
          <TextArea
            id="rationale"
            name="rationale"
            value={formData.rationale}
            onChange={handleChange}
            placeholder="Explain the reasoning behind this recommendation"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
          <Input
            type="date"
            id="expiresAt"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleChange}
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Target Subscriptions</Label>
          <SubscriptionSelector>
            <p>Select which subscription tiers should receive this recommendation:</p>
            <CheckboxGroup>
              {subscriptions.map(subscription => (
                <CheckboxLabel 
                  key={subscription._id} 
                  checked={formData.targetSubscriptions.includes(subscription._id)}
                >
                  <input
                    type="checkbox"
                    checked={formData.targetSubscriptions.includes(subscription._id)}
                    onChange={() => handleSubscriptionToggle(subscription._id)}
                  />
                  {subscription.name}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </SubscriptionSelector>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          {formData.status === 'published' && (
            <p style={{ fontSize: '14px', color: '#666' }}>
              Publishing will make this recommendation visible to users with the selected subscriptions.
            </p>
          )}
        </FormGroup>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <ButtonGroup>
          <Button type="button" onClick={onCancel} style={{ backgroundColor: '#f5f5f5', color: '#333' }}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : recommendation ? 'Update Recommendation' : 'Create Recommendation'}
          </Button>
        </ButtonGroup>
      </Form>
    </FormContainer>
  );
};

export default StockRecommendationForm;
