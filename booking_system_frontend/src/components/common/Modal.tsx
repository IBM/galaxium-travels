import type { ReactNode } from 'react';
import { Modal as CarbonModal } from '@carbon/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  // Map custom sizes to Carbon sizes
  const carbonSize = size === 'sm' ? 'xs' : size === 'lg' ? 'lg' : 'md';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CarbonModal
            open={isOpen}
            onRequestClose={onClose}
            modalHeading={title}
            size={carbonSize}
            passiveModal
          >
            {children}
          </CarbonModal>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Made with Bob
