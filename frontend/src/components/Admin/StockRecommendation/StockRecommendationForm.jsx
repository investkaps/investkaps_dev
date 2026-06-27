import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import stockRecommendationAPI from '../../../services/stockRecommendationAPI';
import { adminAPI } from '../../../services/api';
import SymbolAutocomplete from '../SymbolAutocomplete';

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

const NfoTag = styled.span`
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
`;

const NFO_EXCHANGES = ['NFO', 'BFO', 'CDS', 'MCX'];

const EMPTY_FORM = {
  title: '',
  stockSymbol: '',
  stockName: '',
  exchange: 'NSE',
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
  expiresAt: '',
  // NFO extras (populated from autocomplete)
  expiry: '',
  strike: '',
  lotSize: '',
  instrumentType: '',
};

const StockRecommendationForm = ({ recommendation = null, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (recommendation) {
      const expiresAt = recommendation.expiresAt
        ? new Date(recommendation.expiresAt).toISOString().split('T')[0]
        : '';

      setFormData({
        title: recommendation.title || '',
        stockSymbol: recommendation.stockSymbol || '',
        stockName: recommendation.stockName || '',
        exchange: recommendation.exchange || 'NSE',
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
        expiresAt,
        expiry: recommendation.expiry || '',
        strike: recommendation.strike || '',
        lotSize: recommendation.lotSize || '',
        instrumentType: recommendation.instrumentType || '',
      });
    }
  }, [recommendation]);

  const isNFO = NFO_EXCHANGES.includes(formData.exchange);

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

  // Called when admin picks a symbol from the autocomplete dropdown
  const handleSymbolSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      stockSymbol: item.symbol,
      stockName: item.name || prev.stockName,
      exchange: item.exchange || prev.exchange,
      // NFO fields from instruments collection
      expiry: item.expiry || '',
      strike: item.strike || '',
      lotSize: item.lotSize || '',
      instrumentType: item.instrumentType || '',
    }));
  };

  const handleSubscriptionToggle = (subscriptionId) => {
    setFormData(prev => {
      const isSelected = prev.targetSubscriptions.includes(subscriptionId);
      return {
        ...prev,
        targetSubscriptions: isSelected
          ? prev.targetSubscriptions.filter(id => id !== subscriptionId)
          : [...prev.targetSubscriptions, subscriptionId],
      };
    });
  };

  const validateForm = () => {
    if (!formData.title) return 'Title is required';
    if (!formData.stockSymbol) return 'Stock symbol is required';
    if (!formData.stockName) return 'Stock name is required';
    if (!formData.exchange) return 'Exchange is required';
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
      const dataToSubmit = {
        ...formData,
        currentPrice: parseFloat(formData.currentPrice),
        targetPrice: parseFloat(formData.targetPrice),
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
        strike: formData.strike ? parseFloat(formData.strike) : undefined,
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : undefined,
      };

      // Strip empty NFO fields so they don't pollute equity records
      if (!isNFO) {
        delete dataToSubmit.expiry;
        delete dataToSubmit.strike;
        delete dataToSubmit.lotSize;
        delete dataToSubmit.instrumentType;
      }

      const response = recommendation
        ? await stockRecommendationAPI.updateRecommendation(recommendation._id, dataToSubmit)
        : await stockRecommendationAPI.createRecommendation(dataToSubmit);

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

        {/* Symbol search + exchange row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <FormGroup style={{ flex: 2 }}>
            <Label>Stock Symbol</Label>
            <SymbolAutocomplete
              value={formData.stockSymbol}
              onChange={(val) => setFormData(prev => ({ ...prev, stockSymbol: val }))}
              onSelect={handleSymbolSelect}
              placeholder="Search NSE / BSE / NFO symbol…"
            />
          </FormGroup>

          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="exchange">Exchange</Label>
            <Select
              id="exchange"
              name="exchange"
              value={formData.exchange}
              onChange={handleChange}
              required
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="NFO">NFO</option>
              <option value="BFO">BFO</option>
              <option value="CDS">CDS</option>
              <option value="MCX">MCX</option>
            </Select>
          </FormGroup>
        </div>

        <FormGroup>
          <Label htmlFor="stockName">
            Stock / Instrument Name
            {isNFO && <NfoTag>F&O</NfoTag>}
          </Label>
          <Input
            type="text"
            id="stockName"
            name="stockName"
            value={formData.stockName}
            onChange={handleChange}
            placeholder="Auto-filled from symbol search"
            required
          />
        </FormGroup>

        {/* NFO detail fields — shown only when exchange is NFO/BFO/CDS/MCX */}
        {isNFO && (
          <div style={{ display: 'flex', gap: '16px', background: '#fffdf0', border: '1px solid #fde68a', borderRadius: 6, padding: '12px 16px' }}>
            <FormGroup style={{ flex: 2 }}>
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                type="text"
                id="expiry"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                placeholder="e.g. 26-DEC-2024"
              />
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="strike">Strike Price</Label>
              <Input
                type="text"
                id="strike"
                name="strike"
                value={formData.strike}
                onChange={handleNumberChange}
                placeholder="e.g. 25000"
              />
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="lotSize">Lot Size</Label>
              <Input
                type="text"
                id="lotSize"
                name="lotSize"
                value={formData.lotSize}
                onChange={handleNumberChange}
                placeholder="e.g. 50"
              />
            </FormGroup>
            <FormGroup style={{ flex: 1 }}>
              <Label htmlFor="instrumentType">Type</Label>
              <Select
                id="instrumentType"
                name="instrumentType"
                value={formData.instrumentType}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="CE">CE (Call)</option>
                <option value="PE">PE (Put)</option>
                <option value="FUT">FUT (Future)</option>
              </Select>
            </FormGroup>
          </div>
        )}

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
