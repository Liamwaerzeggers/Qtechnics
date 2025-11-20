import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { FileText, FileSpreadsheet, Calendar, Package, Users, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children, showBackToDashboard = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { name: 'Leads', path: '/leads', icon: Users, testId: 'nav-leads' },
    { name: 'Offertes', path: '/quotes', icon: FileText, testId: 'nav-quotes' },
    { name: 'Materialen', path: '/materials', icon: Package, testId: 'nav-materials' },
    { name: 'Projecten', path: '/projects', icon: FileSpreadsheet, testId: 'nav-projects' },
    { name: 'Kalender', path: '/calendar', icon: Calendar, testId: 'nav-calendar' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b" style={{backgroundColor: 'white', borderColor: '#E2E8F0'}}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{color: '#1E40AF'}}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              {/* Logo */}
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/dashboard')}
                data-testid="dashboard-logo"
              >
                <img 
                  src="/qtechnics_logo.png" 
                  alt="Q Technics Logo" 
                  className="h-10 sm:h-12 w-auto"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user?.picture && (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <span style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>{user?.name}</span>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{color: '#64748B'}}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 hidden lg:block">
            <nav className="space-y-2 sticky top-24">
              {showBackToDashboard && location.pathname !== '/dashboard' && (
                <button
                  data-testid="back-to-dashboard-btn"
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-4 transition-all"
                  style={{
                    backgroundColor: '#DBEAFE',
                    color: '#1E40AF',
                    border: '2px solid #3B82F6'
                  }}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-semibold">← Terug naar Dashboard</span>
                </button>
              )}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    data-testid={item.testId}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? '#1E40AF' : 'transparent',
                      color: isActive ? 'white' : '#64748B',
                    }}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}