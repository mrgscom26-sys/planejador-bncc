import React from 'react';
import styles from './chip.module.css';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  title?: string;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, onRemove, title, className }) => {
  return (
    <span className={`${styles.chip} ${className || ''}`} title={title}>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={styles.removeBtn}
          aria-label={`Remover ${label}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};
