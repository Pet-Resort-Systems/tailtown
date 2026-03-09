import React, { createContext, useContext, useState } from 'react';

// Define add-on interface
export interface AddOn {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Define product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Define enhanced CartItem interface for reservations
export interface CartItem {
  id: string;
  price: number;
  quantity?: number;
  // Reservation-specific fields
  serviceName?: string;
  serviceId?: string;
  serviceCategory?: string; // Service category (GROOMING, TRAINING, DAYCARE, BOARDING)
  customerId?: string;
  customerName?: string;
  petId?: string;
  petName?: string;
  startDate?: Date;
  endDate?: Date;
  suiteType?: string;
  resourceId?: string;
  resourceName?: string;
  addOns?: AddOn[];
  products?: Product[]; // NEW: Retail products
  notes?: string;
}

// Define cart state
interface CartState {
  items: CartItem[];
}

// Define context type with enhanced functions
interface ShoppingCartContextType {
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

// Create a default context value
const defaultContextValue: ShoppingCartContextType = {
  state: { items: [] },
  addItem: () => {},
  removeItem: () => {},
  updateItem: () => {},
  clearCart: () => {},
  getTotalPrice: () => 0
};

// Create context
const ShoppingCartContext = createContext<ShoppingCartContextType>(defaultContextValue);

// Provider component
export function ShoppingCartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ items: [] });

  const addItem = (item: CartItem) => {
    setState(prevState => ({
      items: [...prevState.items, item]
    }));
  };

  const removeItem = (itemId: string) => {
    setState(prevState => ({
      items: prevState.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, updates: Partial<CartItem>) => {
    setState(prevState => ({
      items: prevState.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const clearCart = () => {
    setState({ items: [] });
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => {
      let itemTotal = item.price || 0;
      
      // Add add-ons price
      if (item.addOns && item.addOns.length > 0) {
        itemTotal += item.addOns.reduce((addOnTotal, addOn) => 
          addOnTotal + (addOn.price * addOn.quantity), 0);
      }
      
      return total + itemTotal;
    }, 0);
  };

  return (
    <ShoppingCartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateItem,
        clearCart,
        getTotalPrice
      }}
    >
      {children}
    </ShoppingCartContext.Provider>
  );
}

// Custom hook to use the shopping cart context
export function useShoppingCart() {
  return useContext(ShoppingCartContext);
}
