import { Github } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-space-dark/50 backdrop-blur-sm">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <p className="eyebrow">© {currentYear} Galaxium Travels. All rights reserved.</p>
        <p className="eyebrow">Made for space travelers</p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="text-star-white/50 transition-colors hover:text-star-white"
        >
          <Github size={18} />
        </a>
      </div>
    </footer>
  );
};

// Made with Bob
