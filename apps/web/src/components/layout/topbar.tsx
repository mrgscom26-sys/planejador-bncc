'use client';

import React from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { Badge } from '../ui/badge';
import styles from './topbar.module.css';

export interface TopbarProps {
  title?: string;
  onMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, onMenuToggle }) => {
  const { user, logout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        {onMenuToggle && (
          <button
            type="button"
            className={styles.menuBtn}
            onClick={onMenuToggle}
            aria-label="Alternar menu lateral"
          >
            <Menu size={22} />
          </button>
        )}
        {title && <h2 className={styles.pageTitle}>{title}</h2>}
      </div>

      <div className={styles.rightSection}>
        {user && (
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              <User size={16} />
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>
                <Badge variant="primary" size="sm">
                  {user.role}
                </Badge>
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className={styles.logoutBtn}
              title="Encerrar sessão"
              aria-label="Sair da conta"
            >
              <LogOut size={16} />
              <span className={styles.logoutText}>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
