import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again later.";
      
      // Check if it's a Firestore permission error (JSON string)
      try {
        if (this.state.error?.message) {
          const errorData = JSON.parse(this.state.error.message);
          if (errorData.error && errorData.error.includes('insufficient permissions')) {
            errorMessage = "You don't have permission to access this data. Please check your account settings or contact support.";
          }
        }
      } catch (e) {
        // Not a JSON error, use default or error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Application Error</h1>
            <p className="text-muted-foreground mb-8">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity w-full"
            >
              <RefreshCcw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
