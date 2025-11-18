import React, { createContext, useContext, useState, useEffect } from 'react';

const PaymentContext = createContext();

export function PaymentProvider({ children }) {
  const [paymentMethods, setPaymentMethods] = useState(() => {
    try {
      const saved = localStorage.getItem('paymentMethods');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading payment methods:', e);
      return [];
    }
  });

  // Persist to localStorage whenever paymentMethods changes
  useEffect(() => {
    try {
      localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
    } catch (e) {
      console.error('Error saving payment methods:', e);
    }
  }, [paymentMethods]);

  const addCard = (cardData) => {
    const newCard = {
      id: Date.now().toString(),
      type: 'card',
      cardNumber: cardData.cardNumber,
      cardholderName: cardData.cardholderName,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      color: cardData.color || 'indigo',
      isDefault: paymentMethods.length === 0,
      createdAt: new Date()
    };
    setPaymentMethods([...paymentMethods, newCard]);
    return newCard;
  };

  const addMpesa = (mpesaData) => {
    const newMpesa = {
      id: Date.now().toString(),
      type: 'mpesa',
      tillNumber: mpesaData.tillNumber,
      phoneNumber: mpesaData.phoneNumber,
      color: mpesaData.color || 'green',
      isDefault: paymentMethods.length === 0,
      createdAt: new Date()
    };
    setPaymentMethods([...paymentMethods, newMpesa]);
    return newMpesa;
  };

  const deletePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
  };

  const setDefaultPaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.map(m => ({
      ...m,
      isDefault: m.id === id
    })));
  };

  const getDefaultPaymentMethod = () => {
    return paymentMethods.find(m => m.isDefault) || paymentMethods[0] || null;
  };

  const value = {
    paymentMethods,
    addCard,
    addMpesa,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    getDefaultPaymentMethod
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayment() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayment must be used within a PaymentProvider');
  return ctx;
}
