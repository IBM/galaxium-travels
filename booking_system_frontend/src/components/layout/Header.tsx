import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header as CarbonHeader, HeaderName, HeaderNavigation, HeaderMenuItem, HeaderGlobalBar, HeaderGlobalAction } from '@carbon/react';
import { Rocket, User, Logout } from '@carbon/icons-react';
import { useUser } from '../../hooks/useUser';
import { Button } from '../common';
import { UserIdentification } from '../user/UserIdentification';

export const Header = () => {
  const location = useLocation();
  const { user, logout } = useUser();
  const [showUserModal, setShowUserModal] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <CarbonHeader aria-label="Galaxium Travels">
        <HeaderName as={Link} to="/" prefix="">
          <div className="flex items-center gap-2">
            <Rocket size={24} />
            <span>Galaxium Travels</span>
          </div>
        </HeaderName>
        
        <HeaderNavigation aria-label="Main navigation">
          <HeaderMenuItem
            as={Link}
            to="/"
            isActive={isActive('/')}
          >
            Home
          </HeaderMenuItem>
          <HeaderMenuItem
            as={Link}
            to="/flights"
            isActive={isActive('/flights')}
          >
            Flights
          </HeaderMenuItem>
          {user && (
            <HeaderMenuItem
              as={Link}
              to="/bookings"
              isActive={isActive('/bookings')}
            >
              My Bookings
            </HeaderMenuItem>
          )}
        </HeaderNavigation>

        <HeaderGlobalBar>
          {user ? (
            <>
              <div className="flex items-center gap-2 px-4 text-text-02">
                <User size={16} />
                <span className="hidden md:inline">{user.name}</span>
              </div>
              <HeaderGlobalAction
                aria-label="Logout"
                onClick={logout}
                tooltipAlignment="end"
              >
                <Logout size={20} />
              </HeaderGlobalAction>
            </>
          ) : (
            <div className="px-4">
              {location.pathname === '/' ? (
                <Link to="/flights">
                  <Button size="sm">Book a Flight</Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowUserModal(true)}
                >
                  Login
                </Button>
              )}
            </div>
          )}
        </HeaderGlobalBar>
      </CarbonHeader>
      
      {/* User Identification Modal */}
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
