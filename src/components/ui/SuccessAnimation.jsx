import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';

const SuccessAnimation = ({ 
  show, 
  message = "Successfully added!", 
  duration = 3000,
  onComplete,
  type = 'default' // 'default', 'funder', 'income', 'expense', 'project'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay before starting animation
      setTimeout(() => setIsVisible(true), 50);
      
      // Auto hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
          if (onComplete) onComplete();
        }, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!shouldRender) return null;

  const getIconColor = () => {
    switch (type) {
      case 'funder': return 'text-blue-600';
      case 'income': return 'text-emerald-600';
      case 'expense': return 'text-amber-600';
      case 'project': return 'text-purple-600';
      default: return 'text-emerald-600';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'funder': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'income': return 'bg-emerald-100 dark:bg-emerald-900/30';
      case 'expense': return 'bg-amber-100 dark:bg-amber-900/30';
      case 'project': return 'bg-purple-100 dark:bg-purple-900/30';
      default: return 'bg-emerald-100 dark:bg-emerald-900/30';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'funder': return 'border-blue-200 dark:border-blue-800';
      case 'income': return 'border-emerald-200 dark:border-emerald-800';
      case 'expense': return 'border-amber-200 dark:border-amber-800';
      case 'project': return 'border-purple-200 dark:border-purple-800';
      default: return 'border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={`
          transform transition-all duration-300 ease-out
          ${isVisible 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-75 opacity-0 translate-y-4'
          }
        `}
      >
        <div className={`
          relative flex items-center gap-3 px-6 py-4 rounded-2xl border-2 shadow-2xl
          ${getBgColor()} ${getBorderColor()}
          backdrop-blur-sm
        `}>
          {/* Animated sparkles */}
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -left-1">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse delay-75" />
          </div>
          
          {/* Success icon with animation */}
          <div className="relative">
            <CheckCircle className={`
              w-8 h-8 ${getIconColor()}
              transform transition-transform duration-500
              ${isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}
            `} />
            {/* Ring animation */}
            <div className={`
              absolute inset-0 rounded-full border-2 ${getIconColor().replace('text', 'border')}
              animate-ping opacity-75
            `} />
          </div>
          
          {/* Success message */}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
              {message}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
      
      {/* Overlay fade effect */}
      <div 
        className={`
          absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  );
};

export default SuccessAnimation;
