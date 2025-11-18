import React from 'react';
import { CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const colorGradients = {
  indigo: 'from-indigo-600 to-indigo-800',
  blue: 'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green: 'from-green-600 to-green-800',
  cyan: 'from-cyan-600 to-cyan-800',
  pink: 'from-pink-600 to-pink-800',
  orange: 'from-orange-600 to-orange-800',
  red: 'from-red-600 to-red-800'
};

const textColors = {
  indigo: 'text-indigo-100',
  blue: 'text-blue-100',
  purple: 'text-purple-100',
  green: 'text-green-100',
  cyan: 'text-cyan-100',
  pink: 'text-pink-100',
  orange: 'text-orange-100',
  red: 'text-red-100'
};

export default function PaymentCardDisplay({ payment, onDelete, onSetDefault, size = 'default' }) {
  if (!payment) return null;

  const isCard = payment.type === 'card';
  const isMpesa = payment.type === 'mpesa';
  const gradient = colorGradients[payment.color] || colorGradients.indigo;
  const textColor = textColors[payment.color] || textColors.indigo;

  const cardHeight = size === 'small' ? 'h-48' : 'h-64';
  const padding = size === 'small' ? 'p-5' : 'p-8';

  if (isCard) {
    const maskedNumber = `•••• •••• •••• ${payment.cardNumber.slice(-4)}`;
    const expiryDisplay = `${String(payment.expiryMonth).padStart(2, '0')}/${payment.expiryYear.toString().slice(-2)}`;

    return (
      <div className={`relative w-full ${cardHeight} rounded-3xl bg-gradient-to-br ${gradient} ${padding} text-white shadow-2xl overflow-hidden group transform transition-all duration-300 hover:shadow-3xl hover:scale-105`}>
        {/* Decorative animated elements */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-white/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Glossy shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Top section - Icon and Badge */}
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
            {payment.isDefault && (
              <span className="text-xs font-bold bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/40">
                DEFAULT
              </span>
            )}
          </div>

          {/* Middle section - card number with better spacing */}
          <div className="space-y-1">
            <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Card Number</div>
            <div className="text-xl md:text-2xl font-mono font-semibold tracking-[0.15em] drop-shadow-lg">{maskedNumber}</div>
          </div>

          {/* Bottom section - Cardholder info */}
          <div className="flex items-end justify-between pt-2">
            <div>
              <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Card Holder</div>
              <div className="font-bold text-lg md:text-xl leading-tight">{payment.cardholderName}</div>
              <div className="text-xs opacity-75 mt-2 font-medium">Expires {expiryDisplay}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold opacity-60 uppercase tracking-widest">Visa</div>
            </div>
          </div>
        </div>

        {/* Action buttons on hover */}
        {size !== 'small' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl flex items-center justify-center gap-3 z-20">
            {!payment.isDefault && (
              <button
                onClick={() => onSetDefault?.(payment.id)}
                className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all duration-200 transform hover:scale-110 shadow-lg"
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => onDelete?.(payment.id)}
              className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all duration-200 transform hover:scale-110 shadow-lg"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isMpesa) {
    return (
      <div className={`relative w-full ${cardHeight} rounded-3xl bg-gradient-to-br ${gradient} ${padding} text-white shadow-2xl overflow-hidden group transform transition-all duration-300 hover:shadow-3xl hover:scale-105`}>
        {/* Decorative animated elements */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-white/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Glossy shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Top section - Icon and Badge */}
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
            {payment.isDefault && (
              <span className="text-xs font-bold bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/40">
                DEFAULT
              </span>
            )}
          </div>

          {/* Middle section - Till Number */}
          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Till Number</div>
            <div className="text-2xl font-mono font-bold tracking-[0.05em] drop-shadow-lg">{payment.tillNumber}</div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-widest mt-4">M-Pesa Account</div>
          </div>

          {/* Bottom section - Phone */}
          <div>
            <div className="text-xs font-semibold opacity-75 uppercase tracking-widest mb-1">Registered Phone</div>
            <div className="font-bold text-lg md:text-xl">{payment.phoneNumber}</div>
          </div>
        </div>

        {/* Action buttons on hover */}
        {size !== 'small' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl flex items-center justify-center gap-3 z-20">
            {!payment.isDefault && (
              <button
                onClick={() => onSetDefault?.(payment.id)}
                className="px-4 py-2 bg-white text-green-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all duration-200 transform hover:scale-110 shadow-lg"
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => onDelete?.(payment.id)}
              className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all duration-200 transform hover:scale-110 shadow-lg"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
