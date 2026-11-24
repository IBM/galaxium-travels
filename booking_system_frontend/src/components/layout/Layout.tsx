import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Starfield } from '../common/Starfield';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated starfield background */}
      <Starfield />
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(3, 7, 18, 0.85)',
            color: '#F9FAFB',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            fontSize: '13px',
            boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#F9FAFB',
            },
          },
          error: {
            iconTheme: {
              primary: '#EC4899',
              secondary: '#F9FAFB',
            },
          },
        }}
      />
      
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <main className="relative z-10 flex-1 pb-8 pt-36 md:pt-24">
        <div className="container mx-auto px-4">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

// Made with Bob
