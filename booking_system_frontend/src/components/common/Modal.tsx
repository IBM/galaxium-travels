import type { ReactNode } from 'react';
import { Modal as CarbonModal, ModalHeader, ModalBody } from '@carbon/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  return (
    <CarbonModal
      open={isOpen}
      onRequestClose={onClose}
      size={size}
      preventCloseOnClickOutside={false}
    >
      {title && <ModalHeader title={title} />}
      <ModalBody>
        {children}
      </ModalBody>
    </CarbonModal>
  );
};

// Made with Bob
