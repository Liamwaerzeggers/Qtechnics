import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple mock authentication
    if (credentials.username === 'admin' && credentials.password === 'maxq2024') {
      localStorage.setItem('maxq_admin', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Ongeldige gebruikersnaam of wachtwoord');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_maxq-showcase/artifacts/rn05emza_logo%20maxq.png" 
              alt="Max Q" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-[#202020]">Admin Login</h1>
            <p className="text-[#202020]/70 text-sm mt-2">Log in om projecten te beheren</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-[#202020] mb-2 block">Gebruikersnaam</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="pl-10"
                  placeholder="Gebruikersnaam"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[#202020] mb-2 block">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="pl-10"
                  placeholder="Wachtwoord"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#3a190b] hover:bg-[#500000] text-white py-3"
            >
              Inloggen
            </Button>
          </form>

          <p className="text-center text-xs text-[#202020]/50 mt-6">
            © 2026 Max Q - Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
