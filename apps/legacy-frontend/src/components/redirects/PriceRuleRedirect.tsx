import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Component to handle redirects from old price-rules URLs to new settings/price-rules URLs
 */
const PriceRuleRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new URL structure
    navigate(`/settings/price-rules/${id}`);
  }, [id, navigate]);

  // Return null as this is just a redirect component
  return null;
};

export default PriceRuleRedirect;
