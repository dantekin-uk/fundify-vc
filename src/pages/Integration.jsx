import React, { useState } from 'react';
import { usePayment } from '../context/PaymentContext';
import PaymentCardDisplay from '../components/PaymentCardDisplay';
import { CreditCardIcon, BanknotesIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';

const colorOptions = [
  { name: 'indigo', label: 'Indigo', hex: '#4F46E5' },
  { name: 'blue', label: 'Blue', hex: '#2563EB' },
  { name: 'purple', label: 'Purple', hex: '#9333EA' },
  { name: 'green', label: 'Green', hex: '#16A34A' },
  { name: 'cyan', label: 'Cyan', hex: '#0891B2' },
  { name: 'pink', label: 'Pink', hex: '#EC4899' },
  { name: 'orange', label: 'Orange', hex: '#EA580C' },
  { name: 'red', label: 'Red', hex: '#DC2626' }
];

export default function Integration() {
  const { paymentMethods, addCard, addMpesa, deletePaymentMethod, setDefaultPaymentMethod } = usePayment();
  const [activeTab, setActiveTab] = useState('cards');
  const [cardSuccess, setCardSuccess] = useState(false);
  const [mpesaSuccess, setMpesaSuccess] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    color: 'indigo'
  });
  const [mpesaForm, setMpesaForm] = useState({
    tillNumber: '',
    phoneNumber: '',
    color: 'green'
  });

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!cardForm.cardNumber || !cardForm.cardholderName || !cardForm.expiryMonth || !cardForm.expiryYear) {
      alert('Please fill all card details');
      return;
    }
    if (cardForm.cardNumber.length < 4) {
      alert('Please enter valid card details');
      return;
    }
    addCard(cardForm);
    setCardForm({
      cardNumber: '',
      cardholderName: '',
      expiryMonth: '',
      expiryYear: '',
      color: 'indigo'
    });
    setCardSuccess(true);
    setTimeout(() => setCardSuccess(false), 3000);
  };

  const handleAddMpesa = (e) => {
    e.preventDefault();
    if (!mpesaForm.tillNumber || !mpesaForm.phoneNumber) {
      alert('Please fill all MPesa details');
      return;
    }
    addMpesa(mpesaForm);
    setMpesaForm({
      tillNumber: '',
      phoneNumber: '',
      color: 'green'
    });
    setMpesaSuccess(true);
    setTimeout(() => setMpesaSuccess(false), 3000);
  };

  const cardPayments = paymentMethods.filter(m => m.type === 'card');
  const mpesaPayments = paymentMethods.filter(m => m.type === 'mpesa');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-slate-100">
            Payment Methods
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add and manage your payment methods for receiving funds
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'cards'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Debit/Credit Cards
          </div>
        </button>
        <button
          onClick={() => setActiveTab('mpesa')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'mpesa'
              ? 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
              : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5" />
            M-Pesa
          </div>
        </button>
      </div>

      {/* Cards Tab */}
      {activeTab === 'cards' && (
        <div className="space-y-6">
          {/* Success Message */}
          {cardSuccess && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">Card saved successfully!</p>
                <p className="text-sm text-green-700 dark:text-green-300">Your card is now available on your dashboard.</p>
              </div>
            </div>
          )}

          {/* Existing Cards */}
          {cardPayments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Your Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cardPayments.map((card) => (
                  <PaymentCardDisplay
                    key={card.id}
                    payment={card}
                    onDelete={deletePaymentMethod}
                    onSetDefault={setDefaultPaymentMethod}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add Card Form */}
          <form onSubmit={handleAddCard} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Add New Card</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Cardholder Name"
                value={cardForm.cardholderName}
                onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Card Number (last 4 digits shown)"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                maxLength="16"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select
                value={cardForm.expiryMonth}
                onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>

              <select
                value={cardForm.expiryYear}
                onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              >
                <option value="">Year</option>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={cardForm.color}
                onChange={(e) => setCardForm({ ...cardForm, color: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 md:col-span-2"
              >
                <option value="">Select Color</option>
                {colorOptions.map((color) => (
                  <option key={color.name} value={color.name}>{color.label}</option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full">
              Add Card
            </Button>
          </form>
        </div>
      )}

      {/* MPesa Tab */}
      {activeTab === 'mpesa' && (
        <div className="space-y-6">
          {/* Success Message */}
          {mpesaSuccess && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">M-Pesa account saved successfully!</p>
                <p className="text-sm text-green-700 dark:text-green-300">Your account is now available on your dashboard.</p>
              </div>
            </div>
          )}

          {/* Existing MPesa */}
          {mpesaPayments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Your M-Pesa Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mpesaPayments.map((mpesa) => (
                  <PaymentCardDisplay
                    key={mpesa.id}
                    payment={mpesa}
                    onDelete={deletePaymentMethod}
                    onSetDefault={setDefaultPaymentMethod}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add MPesa Form */}
          <form onSubmit={handleAddMpesa} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Add M-Pesa Account</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Till Number"
                value={mpesaForm.tillNumber}
                onChange={(e) => setMpesaForm({ ...mpesaForm, tillNumber: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={mpesaForm.phoneNumber}
                onChange={(e) => setMpesaForm({ ...mpesaForm, phoneNumber: e.target.value })}
                className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>

            <select
              value={mpesaForm.color}
              onChange={(e) => setMpesaForm({ ...mpesaForm, color: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
            >
              <option value="">Select Color</option>
              {colorOptions.map((color) => (
                <option key={color.name} value={color.name}>{color.label}</option>
              ))}
            </select>

            <Button type="submit" className="w-full">
              Add M-Pesa Account
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
