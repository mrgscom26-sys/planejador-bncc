'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { BookOpen, PlusCircle, ShieldCheck, FileText } from 'lucide-react';
import styles from './sidebar.module.css';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Meus Planos',
      href: '/planos',
      icon: <FileText size={18} />,
      isActive: pathname === '/planos',
    },
    {
      label: 'Novo Plano',
      href: '/planos/novo',
      icon: <PlusCircle size={18} />,
      isActive: pathname === '/planos/novo',
    },
  ];

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} role="presentation" />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logoBadge}>
            <BookOpen size={20} color="#FFFFFF" />
          </div>
          <div className={styles.brandInfo}>
            <h1 className={styles.brandName}>Planejador</h1>
            <span className={styles.brandSubtitle}>BNCC Ensino Fundamental</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <span className={styles.navSectionTitle}>NAVEGAÇÃO</span>
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.href}>
                <NextLink
                  href={item.href}
                  onClick={onClose}
                  className={`${styles.navLink} ${item.isActive ? styles.active : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.privacyWidget}>
          <div className={styles.privacyHeader}>
            <ShieldCheck size={16} className={styles.privacyIcon} />
            <span className={styles.privacyTitle}>Privacidade Ativa</span>
          </div>
          <p className={styles.privacyText}>
            Seus planos e rascunhos pedagógicos são estritamente confidenciais e visíveis apenas para você.
          </p>
        </div>
      </aside>
    </>
  );
};
