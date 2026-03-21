import { Link, useLocation } from 'react-router-dom';
import { Rocket, User, LogOut } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { Button } from '../common';
import { motion } from 'framer-motion';

export const Header = () => {
  const location = useLocation();
  const { user, logout } = useUser();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 glass-card border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ duration: 0.3 }}
            >
              <Rocket className="text-cosmic-purple" size={32} />
            </motion.div>
            <span className="text-2xl font-bold bg-cosmic-gradient bg-clip-text text-transparent">
              Galaxium Travels
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'text-cosmic-purple'
                  : 'text-star-white/70 hover:text-star-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/flights"
              className={`text-sm font-medium transition-colors ${
                isActive('/flights')
                  ? 'text-cosmic-purple'
                  : 'text-star-white/70 hover:text-star-white'
              }`}
            >
              Flights
            </Link>
            {user && (
              <Link
                to="/bookings"
                className={`text-sm font-medium transition-colors ${
                  isActive('/bookings')
                    ? 'text-cosmic-purple'
                    : 'text-star-white/70 hover:text-star-white'
                }`}
              >
                My Bookings
              </Link>
            )}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <User size={16} className="text-cosmic-purple" />
                  <span className="text-star-white">{user.name}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={logout}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Link to="/flights">
                <Button size="sm">Book a Flight</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors ${
              isActive('/')
                ? 'text-cosmic-purple'
                : 'text-star-white/70 hover:text-star-white'
            }`}
          >
            Home
          </Link>
          <Link
            to="/flights"
            className={`text-sm font-medium transition-colors ${
              isActive('/flights')
                ? 'text-cosmic-purple'
                : 'text-star-white/70 hover:text-star-white'
            }`}
          >
            Flights
          </Link>
          {user && (
            <Link
              to="/bookings"
              className={`text-sm font-medium transition-colors ${
                isActive('/bookings')
                  ? 'text-cosmic-purple'
                  : 'text-star-white/70 hover:text-star-white'
              }`}
            >
              My Bookings
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

// Made with Bob
