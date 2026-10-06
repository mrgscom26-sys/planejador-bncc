import React from 'react';
import styles from './banner.module.css';

export interface BannerProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  children,
  action,
  onClose,
  className,
}) => {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`${styles.banner} ${styles[variant]} ${className || ''}`}
    >
      <div className={styles.iconWrapper}>
        {variant === 'info' && 'ℹ️'}
        {variant === 'success' && '✓'}
        {variant === 'warning' && '⚠️'}
        {variant === 'danger' && '✕'}
      </div>
      <div className={styles.content}>
        {title && <h4 className={styles.title}>{title}</h4>}
        <div className={styles.message}>{children}</div>
      </div>
      {action && <div className={styles.actionWrapper}>{action}</div>}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Fechar aviso"
        >
          &times;
        </button>
      )}
    </div>
  );
};
