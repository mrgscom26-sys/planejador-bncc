'use client';

import React from 'react';
import { Modal } from '../../../../../components/feedback/modal';
import { Button } from '../../../../../components/ui/button';

export interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitModal: React.FC<ExitModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Você tem alterações não salvas"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Continuar editando
          </Button>
          <Button variant="danger" size="md" onClick={onConfirmExit}>
            Descartar e sair
          </Button>
        </>
      }
    >
      <p>
        Se sair agora, as alterações feitas neste rascunho de aula serão perdidas.
        Deseja sair mesmo assim ou continuar editando?
      </p>
    </Modal>
  );
};
