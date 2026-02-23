import { useState, useCallback } from 'react';
import { IoMdSend } from 'react-icons/io';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      await onLogin(email, password, isSignUp);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, isSignUp, onLogin]);

  const toggleMode = useCallback(() => {
    setIsSignUp(prev => !prev);
    setError('');
  }, []);

  return (
    <div className="whatsapp-login-bg">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <IoMdSend />
          </div>
          <h1>WhatsApp Chat</h1>
          <p>Connect with your contacts instantly</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="login-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
          />
          
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
          
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          
          <div className="login-toggle">
            <button 
              type="button"
              onClick={toggleMode}
              disabled={loading}
            >
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
