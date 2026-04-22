import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { FileText, FileSpreadsheet, Calendar, Package, Users, LogOut, LayoutDashboard, Menu, X, TrendingUp, UserCog, ShieldCheck, PenTool, Building2, Tag, Wrench, ChevronDown, ShoppingCart, ClipboardList } from 'lucide-react';
import CelebrationModal from './CelebrationModal';
import WorkerTaskBanner from './WorkerTaskBanner';
import MaterialRequestBanner from './MaterialRequestBanner';
import TaskNotificationBar from './TaskNotificationBar';

export default function DashboardLayout({ children, showBackToDashboard = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [topMenuOpen, setTopMenuOpen] = React.useState(false);

  // SIDEBAR items - main navigation (overzichtelijk)
  const getSidebarItems = () => {
    if (user?.role === 'realtor' || user?.role === 'investor') {
      return [
        { name: 'Mijn Panden', path: '/realtor', icon: Building2, testId: 'nav-properties' },
      ];
    }
    
    // Worker specific navigation - simple menu (NL / UA bilingual)
    if (user?.role === 'worker') {
      return [
        { name: 'Dashboard / Панель', path: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
        { name: 'Projecten / Проєкти', path: '/projects', icon: FileSpreadsheet, testId: 'nav-projects' },
        { name: 'Materiaal / Матеріали', path: '/material-request', icon: Package, testId: 'nav-material-request' },
        { name: 'Kalender / Календар', path: '/calendar', icon: Calendar, testId: 'nav-calendar' },
      ];
    }
    
    return [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
      { name: 'Projecten', path: '/projects', icon: FileSpreadsheet, testId: 'nav-projects' },
      { name: 'Onderhoud', path: '/maintenance', icon: Wrench, testId: 'nav-maintenance' },
      { name: 'Financiën', path: '/finances', icon: TrendingUp, testId: 'nav-finances' },
      { name: 'Kalender', path: '/calendar', icon: Calendar, testId: 'nav-calendar' },
      { name: 'Materialen', path: '/materials', icon: Package, testId: 'nav-materials' },
      { name: 'Taken', path: '/tasks', icon: ClipboardList, testId: 'nav-tasks' },
      { name: 'Bestelcatalogus', path: '/material-catalog', icon: ShoppingCart, testId: 'nav-material-catalog' },
      { name: 'Werk Labels', path: '/work-labels', icon: Tag, testId: 'nav-work-labels' },
    ];
  };

  // TOP MENU items - secondary navigation (rechtsboven)
  const getTopMenuItems = () => {
    if (user?.role !== 'admin') return [];
    
    return [
      { name: 'Leads', path: '/leads', icon: Users, testId: 'nav-leads' },
      { name: 'Offertes', path: '/quotes', icon: FileText, testId: 'nav-quotes' },
      { name: 'Facturen', path: '/invoices', icon: FileText, testId: 'nav-invoices' },
      { name: 'Configurator', path: '/configurator', icon: PenTool, testId: 'nav-configurator', badge: 'PROTO' },
      { name: 'Werkmannen', path: '/workers', icon: UserCog, testId: 'nav-workers' },
      { name: 'Beheerders', path: '/admins', icon: ShieldCheck, testId: 'nav-admins' },
      { name: 'Tenants', path: '/tenants', icon: Building2, testId: 'nav-tenants' },
      { name: 'Panden', path: '/realtor', icon: Building2, testId: 'nav-realtor' },
    ];
  };

  const sidebarItems = getSidebarItems();
  const topMenuItems = getTopMenuItems();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Check if current path is in top menu
  const isTopMenuActive = topMenuItems.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
      {/* Worker/Admin Task Banner - shows pending tasks at the top of every page */}
      {(user?.role === 'worker' || user?.role === 'admin') && <WorkerTaskBanner user={user} />}
      
      {/* Material Request Banner - shows pending material requests for admins */}
      {user?.role === 'admin' && <MaterialRequestBanner user={user} />}
      
      {/* Celebration Modal - shows when there are new sales */}
      {user?.role === 'admin' && <CelebrationModal />}
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b" style={{backgroundColor: 'white', borderColor: '#E2E8F0'}}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{color: '#500000'}}
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
                  src="/maxq_logo.png" 
                  alt="Max Q Logo" 
                  className="h-10 sm:h-12 w-auto"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Top Menu Items - Horizontal for desktop */}
              {user?.role === 'admin' && (
                <div className="hidden lg:flex items-center space-x-1">
                  {topMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        data-testid={item.testId}
                        onClick={() => navigate(item.path)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all text-sm"
                        style={{
                          backgroundColor: isActive ? '#f5e6e6' : 'transparent',
                          color: isActive ? '#500000' : '#64748B',
                          fontWeight: isActive ? '600' : '400'
                        }}
                      >
                        <Icon size={16} />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="px-1 py-0.5 text-[9px] font-bold bg-yellow-400 text-yellow-900 rounded">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Dropdown for tablet - More menu */}
              {user?.role === 'admin' && (
                <div className="lg:hidden relative">
                  <button
                    onClick={() => setTopMenuOpen(!topMenuOpen)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm"
                    style={{
                      backgroundColor: isTopMenuActive ? '#f5e6e6' : 'transparent',
                      color: isTopMenuActive ? '#500000' : '#64748B',
                    }}
                  >
                    <span>Meer</span>
                    <ChevronDown size={16} className={`transition-transform ${topMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {topMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setTopMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50">
                        {topMenuItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <button
                              key={item.path}
                              data-testid={item.testId}
                              onClick={() => {
                                navigate(item.path);
                                setTopMenuOpen(false);
                              }}
                              className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                              style={{
                                backgroundColor: isActive ? '#f5e6e6' : 'transparent',
                                color: isActive ? '#500000' : '#64748B',
                              }}
                            >
                              <Icon size={16} />
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="ml-auto px-1 py-0.5 text-[9px] font-bold bg-yellow-400 text-yellow-900 rounded">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Divider */}
              {user?.role === 'admin' && (
                <div className="hidden sm:block h-6 w-px bg-gray-300" />
              )}

              {user?.picture && (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full hidden sm:block" />
              )}
              <span className="hidden md:inline text-sm" style={{color: '#64748B', fontFamily: 'Inter, sans-serif'}}>{user?.name}</span>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{color: '#64748B'}}
                title={user?.role === 'worker' ? 'Uitloggen / Вийти' : 'Uitloggen'}
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
                  <div className="font-semibold" style={{color: '#3a190b'}}>{user?.name}</div>
                  <div className="text-xs" style={{color: '#64748B'}}>{user?.email}</div>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Navigatie</p>
              {sidebarItems.map((item) => {
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
                      backgroundColor: '#f5e6e6',
                      color: '#500000',
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
              
              {user?.role === 'admin' && topMenuItems.length > 0 && (
                <>
                  <div className="border-t my-4" />
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Beheer</p>
                  {topMenuItems.map((item) => {
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
                          backgroundColor: '#f5e6e6',
                          color: '#500000',
                          fontWeight: '600'
                        } : {
                          color: '#64748B'
                        }}
                      >
                        <Icon size={20} />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-yellow-400 text-yellow-900 rounded">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8">
          {/* Sidebar - Compact & Clean */}
          <aside className="w-52 hidden lg:block">
            <nav className="space-y-1 sticky top-24">
              {showBackToDashboard && location.pathname !== '/dashboard' && (
                <button
                  data-testid="back-to-dashboard-btn"
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-4 transition-all"
                  style={{
                    backgroundColor: '#f5e6e6',
                    color: '#500000',
                    border: '2px solid #7a1f1f'
                  }}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-semibold text-sm">{user?.role === 'worker' ? '← Назад / Terug' : '← Terug'}</span>
                </button>
              )}
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    data-testid={item.testId}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? '#500000' : 'transparent',
                      color: isActive ? 'white' : '#64748B',
                    }}
                  >
                    <Icon size={20} />
                    {item.name.includes(' / ') ? (
                      <span className="font-medium text-left leading-tight">
                        <span className="block text-sm">{item.name.split(' / ')[0]}</span>
                        <span className="block text-xs opacity-70">{item.name.split(' / ')[1]}</span>
                      </span>
                    ) : (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <TaskNotificationBar />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}