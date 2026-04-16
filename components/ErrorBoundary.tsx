import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress fontfaceobserver timeout errors - KIỂM TRA KỸ
    const errorMessage = String(error.message || '');
    const errorStack = String(error.stack || '');
    const errorName = String(error.name || '');
    const errorInfoStr = String(errorInfo.componentStack || '');
    const errorStr = String(error || '');
    
    // Kiểm tra TẤT CẢ các dấu hiệu của fontfaceobserver timeout
    const hasTimeout = (
      errorMessage.includes('timeout exceeded') ||
      errorMessage.includes('6000ms') ||
      errorMessage.includes('6000') ||
      errorStack.includes('timeout exceeded') ||
      errorStack.includes('6000ms') ||
      errorStack.includes('6000') ||
      errorName.includes('timeout') ||
      errorStr.includes('timeout exceeded') ||
      errorStr.includes('6000ms')
    );
    
    const hasFontfaceObserver = (
      errorMessage.includes('fontfaceobserver') ||
      errorStack.includes('fontfaceobserver') ||
      errorStack.includes('fontfaceobserver.standalone') ||
      errorInfoStr.includes('fontfaceobserver') ||
      errorStr.includes('fontfaceobserver')
    );
    
    if (hasTimeout && hasFontfaceObserver) {
      // Silently ignore - reset state và không log
      this.setState({ hasError: false });
      return;
    }

    // Log other errors normally
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Don't show error UI for fontfaceobserver errors
      return this.props.children;
    }

    return this.props.children;
  }
}

