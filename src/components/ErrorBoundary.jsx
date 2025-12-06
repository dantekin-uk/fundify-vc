import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Application Error</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Something went wrong. Please check your Firebase configuration and environment variables.
            </p>
            <details className="text-left bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-800 text-sm">
              <summary className="cursor-pointer font-semibold text-red-700 dark:text-red-400">
                Error Details
              </summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap break-words overflow-auto max-h-64 text-red-600 dark:text-red-300">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
