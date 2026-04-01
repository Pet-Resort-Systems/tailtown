# Custom React Hooks

This directory contains custom React hooks that can be used throughout the application for common tasks.

## Available Hooks

### `useApiError`

A hook for handling API errors in a standardized way.

```typescript
import { useApiError } from '../hooks';

const MyComponent = () => {
  const { errorMessage, errorDetails, handleError, clearError } = useApiError();
  
  // Use the error state and handlers in your component
};
```

### `useDataFetching`

A hook for fetching data from an API with standardized error handling and loading states.

```typescript
import { useDataFetching } from '../hooks';
import { customerApiClient } from '../services/api';

const MyComponent = () => {
  const { 
    data, 
    loading, 
    error, 
    fetchData, 
    refresh 
  } = useDataFetching({
    apiClient: customerApiClient,
    endpoint: '/api/customers/123',
    context: 'customer-details'
  });
  
  // Use data, loading, and error in your component
};
```

### `usePaginatedData`

A hook for fetching paginated data with support for pagination controls.

```typescript
import { usePaginatedData } from '../hooks';
import { customerApiClient } from '../services/api';

const MyComponent = () => {
  const { 
    data, 
    loading, 
    error, 
    pagination, 
    goToPage, 
    nextPage, 
    prevPage 
  } = usePaginatedData({
    apiClient: customerApiClient,
    endpoint: '/api/customers',
    limit: 10,
    context: 'customer-list'
  });
  
  // Use data, loading, error, and pagination in your component
};
```

### `useMutation`

A hook for performing mutation operations (create, update, delete) with standardized error handling and loading states.

```typescript
import { useMutation } from '../hooks';
import { customerApiClient } from '../services/api';

const MyComponent = () => {
  const { 
    data, 
    loading, 
    error, 
    mutate, 
    reset 
  } = useMutation({
    apiClient: customerApiClient,
    endpoint: '/api/customers',
    method: 'POST',
    onSuccess: (data) => {
      console.log('Customer created:', data);
    },
    context: 'create-customer'
  });
  
  const handleCreateCustomer = async (customer) => {
    try {
      await mutate(customer);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
  
  // Use mutate, loading, error, and reset in your component
};
```

## Combining Hooks

These hooks are designed to work together. For example, you can use `usePaginatedData` to fetch a list of customers, `useMutation` to create a new customer, and `useApiError` to handle errors from both operations.

```typescript
import { usePaginatedData, useMutation, useApiError } from '../hooks';
import { customerApiClient } from '../services/api';

const CustomerList = () => {
  const { errorMessage, handleError } = useApiError();
  
  const { 
    data: customers, 
    loading, 
    refresh 
  } = usePaginatedData({
    apiClient: customerApiClient,
    endpoint: '/api/customers',
    onError: handleError
  });
  
  const { 
    mutate: createCustomer,
    loading: creating 
  } = useMutation({
    apiClient: customerApiClient,
    endpoint: '/api/customers',
    onSuccess: refresh,
    onError: handleError
  });
  
  // Use customers, loading, creating, and errorMessage in your component
};
```
