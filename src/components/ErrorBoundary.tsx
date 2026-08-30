import React from 'react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
}

/** Catches render crashes so students never see a blank white screen. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MathLift error boundary:', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-card/95 border border-border rounded-2xl p-8 text-center animate-fade-in">
            <h1 className="text-2xl font-semibold text-foreground mb-3">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              MathLift hit an unexpected error. Your progress is saved in the cloud — tap below to
              return home and continue.
            </p>
            <Button type="button" onClick={this.handleReset} size="lg">
              Return Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
