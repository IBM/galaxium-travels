import { LogoGithub, Favorite } from '@carbon/icons-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto border-t border-ui-03 bg-ui-01">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-text-02 text-sm">
            © {currentYear} Galaxium Travels. All rights reserved.
          </div>

          {/* Made with love */}
          <div className="flex items-center gap-2 text-text-02 text-sm">
            <span>Made with</span>
            <Favorite size={16} className="text-support-01" />
            <span>for space travelers</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-02 hover:text-link-01 transition-colors"
            >
              <LogoGithub size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Made with Bob
