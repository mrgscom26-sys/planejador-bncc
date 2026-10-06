import React from 'react';
import styles from './switch.module.css';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, id, className, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label htmlFor={inputId} className={`${styles.container} ${className || ''}`}>
        <div className={styles.switchWrapper}>
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={inputId}
            className={styles.input}
            {...props}
          />
          <span className={styles.track}>
            <span className={styles.thumb} />
          </span>
        </div>
        {(label || description) && (
          <div className={styles.labelWrapper}>
            {label && <span className={styles.label}>{label}</span>}
            {description && <span className={styles.description}>{description}</span>}
          </div>
        )}
      </label>
    );
  },
);

Switch.displayName = 'Switch';
