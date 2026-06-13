import { useState } from 'react';
import { Modal, Input, Button } from '../common';
import { getUserByCredentials, registerUser, isErrorResponse } from '../../services/api';
import { useUser } from '../../hooks/useUser';
import toast from 'react-hot-toast';

interface UserIdentificationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserIdentification = ({ isOpen, onClose, onSuccess }: UserIdentificationProps) => {
  const { setUser } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  //validate email addresses
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!validateEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      if (isNewUser) {
        // Register new user
        const result = await registerUser({ name: name.trim(), email: email.trim() });
        
        if (isErrorResponse(result)) {
          toast.error(result.details || result.error);
          return;
        }
        
        setUser(result);
        toast.success('Account created successfully!');
        onSuccess();
        onClose();
      } else {
        // Try to find existing user
        const result = await getUserByCredentials(name.trim(), email.trim());
        
        if (isErrorResponse(result)) {
          // User not found, suggest registration
          toast.error('User not found. Please register or check your credentials.');
          setIsNewUser(true);
          return;
        }
        
        setUser(result);
        toast.success(`Welcome back, ${result.name}!`);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.details || error.error || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setIsNewUser(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isNewUser ? 'Create Account' : 'Sign In'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-star-white/70 text-sm mb-4">
          {isNewUser
            ? 'Create an account to book your flight'
            : 'Enter your name and email to continue'}
        </p>

        <Input
          label="Name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="flex flex-col gap-3 pt-4">
          <Button type="submit" isLoading={isLoading} className="w-full">
            {isNewUser ? 'Create Account' : 'Continue'}
          </Button>

          <button
            type="button"
            onClick={() => setIsNewUser(!isNewUser)}
            className="text-sm text-cosmic-purple hover:text-nebula-pink transition-colors"
          >
            {isNewUser
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Made with Bob
