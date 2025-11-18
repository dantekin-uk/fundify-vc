import { forwardRef } from 'react';

const FormInput = forwardRef(({ label, id, error, className = '', ...props }, ref) => {
  return (
    <div className={`form-field mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`form-control w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus-ring-brand ring-1 ring-gray-100 dark:ring-0
          ${error ? 'border-red-500' : 'border-gray-300'}
          bg-white text-gray-900 placeholder:text-gray-400
          dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:border-slate-700`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-rose-300">{error}</p>}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
