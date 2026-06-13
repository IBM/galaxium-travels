import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`bg-space-dark/95 backdrop-blur-xl border-2 border-cosmic-purple/30 rounded-2xl shadow-2xl shadow-cosmic-purple/20 w-full ${sizeClasses[size]} my-8 p-6`}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-cosmic-purple/20">
                  <h2 className="text-2xl font-bold bg-cosmic-gradient bg-clip-text text-transparent">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-star-white/70 hover:text-cosmic-purple transition-colors p-1 hover:bg-white/5 rounded-lg"
                    aria-label="Close modal"
                  >
                    <X size={24} />
                  </button>
                </div>
              )}
              
              {/* Content */}
              <div>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Made with Bob
