import React from 'react';
import styles from './progress-card.module.css';

export interface ProgressCardProps {
  title?: string;
  description?: string;
  estimatedSeconds?: number;
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title = 'Criando seu rascunho de aula com IA...',
  description = 'Aguarde enquanto combinamos as habilidades da BNCC e estruturamos seu plano pedagógico.',
  estimatedSeconds = 45,
  className,
}) => {
  return (
    <div className={`${styles.card} ${className || ''}`} role="status" aria-live="polite">
      <div className={styles.header}>
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinner} />
        </div>
        <div className={styles.titleWrapper}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} />
      </div>
      <div className={styles.footer}>
        <span className={styles.timeNotice}>
          Isso pode levar até {estimatedSeconds} segundos.
        </span>
        <span className={styles.statusLabel}>Processando...</span>
      </div>
    </div>
  );
};
