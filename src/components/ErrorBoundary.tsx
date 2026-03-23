import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-red-50/50 rounded-lg border border-red-200 m-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-lg font-bold text-red-700">Ocorreu um erro no ecrã</h2>
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded w-full break-words max-h-48 overflow-auto font-mono">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </div>
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-bold shadow-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
