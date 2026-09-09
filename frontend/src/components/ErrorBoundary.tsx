import React from 'react';
import { AlertTriangle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  ERROR BOUNDARY — prevents white-screen crashes
//  Wrap any route or subtree; renders a localized recovery
//  panel instead of an empty document.
// ═══════════════════════════════════════════════════════════

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">حدث خطأ غير متوقع</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            تعذر عرض هذه الصفحة. حاول إعادة المحاولة، وإذا استمرت المشكلة قم بتحديث الصفحة أو
            التواصل مع الدعم.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors active:scale-[0.98]"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors active:scale-[0.98]"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
};
