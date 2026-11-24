import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useUser } from '../../hooks/useUserContext';
import { Button } from '../common';
import { UserIdentification } from '../user/UserIdentification';

export const Header = () => {
  const location = useLocation();
  const { user, logout } = useUser();
  const [showUserModal, setShowUserModal] = useState(false);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/flights', label: 'Flights' },
    ...(user ? [{ to: '/bookings', label: 'My Bookings' }] : []),
  ];

  const nav = links.map(({ to, label }) => (
    <Link
      key={to}
      to={to}
      aria-current={location.pathname === to ? 'page' : undefined}
      className={clsx(
        'text-[11px] font-medium uppercase tracking-[0.2em] transition-colors',
        location.pathname === to ? 'text-star-white' : 'text-star-white/50 hover:text-star-white'
      )}
    >
      {label}
    </Link>
  ));

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-space-dark/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-star-white shadow-[0_0_12px_rgba(249,250,251,0.9)]" aria-hidden />
            <span className="text-lg font-semibold tracking-tight text-star-white">
              Galaxium <span className="font-normal text-star-white/55">Travels</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-8 md:flex">{nav}</nav>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="eyebrow hidden md:inline">{user.name}</span>
                <Button variant="secondary" size="sm" onClick={logout}>
                  <LogOut size={13} />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </>
            ) : location.pathname === '/' ? (
              <Link to="/flights" className="btn-secondary px-4 py-2 text-[10px]">
                Book a Flight
              </Link>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setShowUserModal(true)}>
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="mt-4 flex items-center gap-6 border-t border-white/10 pt-4 md:hidden">{nav}</nav>
      </div>
    </header>

    {/* User Identification Modal - Outside header for proper z-index */}
    <UserIdentification
      isOpen={showUserModal}
      onClose={() => setShowUserModal(false)}
      onSuccess={() => {
        setShowUserModal(false);
      }}
    />
    </>
  );
};

// Made with Bob
