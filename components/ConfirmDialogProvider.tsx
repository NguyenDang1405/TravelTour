import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { setConfirmDialogRef } from '@/utils/toast';

interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface ConfirmDialogRef {
  show: (config: ConfirmConfig) => Promise<boolean>;
}

const ConfirmDialogProvider = forwardRef<ConfirmDialogRef>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig>({
    title: 'Xác nhận',
    message: '',
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showMethod = (newConfig: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(newConfig);
      setResolvePromise(() => resolve);
      setVisible(true);
    });
  };

  useImperativeHandle(ref, () => ({
    show: showMethod,
  }));

  // Set ref to global state immediately after mount and whenever ref changes
  useEffect(() => {
    // Wait a tick to ensure useImperativeHandle has set ref.current
    const timer = setTimeout(() => {
      if (ref && typeof ref === 'object' && 'current' in ref && ref.current) {
        console.log('✅ ConfirmDialogProvider - Setting ref to global state');
        setConfirmDialogRef(ref.current);
      } else {
        // Fallback: create ref object directly
        const refObject = {
          show: showMethod,
        };
        console.log('✅ ConfirmDialogProvider - Setting ref to global state (fallback)');
        setConfirmDialogRef(refObject);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [ref, showMethod]);

  const handleConfirm = () => {
    console.log('✅ ConfirmDialogProvider - handleConfirm called');
    setVisible(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  };

  const handleCancel = () => {
    console.log('❌ ConfirmDialogProvider - handleCancel called');
    setVisible(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  };

  return (
    <ConfirmDialog
      visible={visible}
      title={config.title}
      message={config.message}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      type={config.type}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
});

ConfirmDialogProvider.displayName = 'ConfirmDialogProvider';

export default ConfirmDialogProvider;

