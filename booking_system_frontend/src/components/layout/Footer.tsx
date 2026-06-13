import { Github, Heart } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-space-dark/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-star-white/70 text-sm">
            © {currentYear} Galaxium Travels. All rights reserved.
          </div>

          {/* Made with love */}
          <div className="flex items-center gap-2 text-star-white/70 text-sm">
            <span>Made with</span>
            <Heart size={16} className="text-nebula-pink fill-nebula-pink" />
            <span>for space travelers</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-star-white/70 hover:text-cosmic-purple transition-colors"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Made with Bob
