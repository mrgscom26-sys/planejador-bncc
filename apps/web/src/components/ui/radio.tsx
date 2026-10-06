import React from 'react';
import styles from './radio.module.css';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, id, className, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label htmlFor={inputId} className={`${styles.container} ${className || ''}`}>
        <div className={styles.radioWrapper}>
          <input
            ref={ref}
            type="radio"
            id={inputId}
            className={styles.input}
            {...props}
          />
          <span className={styles.customRadio} aria-hidden="true">
            <span className={styles.innerDot} />
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

Radio.displayName = 'Radio';
