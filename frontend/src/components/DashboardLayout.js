import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { FileText, FileSpreadsheet, Calendar, Package, Users, LogOut, LayoutDashboard, Menu, X, TrendingUp, UserCog } from 'lucide-react';

export default function DashboardLayout({ children, showBackToDashboard = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard', adminOnly: false },
    { name: 'Leads', path: '/leads', icon: Users, testId: 'nav-leads', adminOnly: true },
    { name: 'Offertes', path: '/quotes', icon: FileText, testId: 'nav-quotes', adminOnly: true },
    { name: 'Projecten', path: '/projects', icon: FileSpreadsheet, testId: 'nav-projects', adminOnly: false },
    { name: 'Facturen', path: '/invoices', icon: FileText, testId: 'nav-invoices', adminOnly: true },
    { name: 'Financiën', path: '/finances', icon: TrendingUp, testId: 'nav-finances', adminOnly: true },
    { name: 'Kalender', path: '/calendar', icon: Calendar, testId: 'nav-calendar', adminOnly: true },
    { name: 'Materialen', path: '/materials', icon: Package, testId: 'nav-materials', adminOnly: true },
    { name: 'Werkmannen', path: '/workers', icon: UserCog, testId: 'nav-workers', adminOnly: true },
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
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full hidden sm:block" />
              )}
              <span className="hidden md:inline" style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>{user?.name}</span>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{color: '#64748B'}}
                title="Uitloggen"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                {user?.picture && (
                  <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <div className="font-semibold" style={{color: '#1E3A8A'}}>{user?.name}</div>
                  <div className="text-xs" style={{color: '#64748B'}}>{user?.email}</div>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    data-testid={item.testId}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left"
                    style={isActive ? {
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                      fontWeight: '600'
                    } : {
                      color: '#64748B'
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8">
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
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}