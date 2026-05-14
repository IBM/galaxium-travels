import type { ReactNode } from 'react';
import { Content, Theme } from '@carbon/react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <Theme theme="g100">
      <div className="min-h-screen flex flex-col">
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#262626',
              color: '#f4f4f4',
              border: '1px solid #525252',
            },
            success: {
              iconTheme: {
                primary: '#42be65',
                secondary: '#f4f4f4',
              },
            },
            error: {
              iconTheme: {
                primary: '#fa4d56',
                secondary: '#f4f4f4',
              },
            },
          }}
        />
        
        {/* Header */}
        <Header />
        
        {/* Main content */}
        <Content className="flex-1">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </Content>
        
        {/* Footer */}
        <Footer />
      </div>
    </Theme>
  );
};

// Made with Bob
