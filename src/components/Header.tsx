import React, { useState } from 'react';
import { 
  Users, 
  Receipt, 
  TrendingDown, 
  Award, 
  Calendar, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  PlusCircle, 
  Menu, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  CalendarCheck,
  UserCheck,
  LogOut,
  UserCog,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { ClubSettings, AppUser } from '../types/club.ts';

export type NavTab = 
  | 'dashboard' 
  | 'member_portal'
  | 'members' 
  | 'programs'
  | 'approvals'
  | 'receipts' 
  | 'yearly_summary' 
  | 'expenses' 
  | 'organizers' 
  | 'reports' 
  | 'users'
  | 'settings';

interface HeaderProps {
  settings: ClubSettings;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isAdminUnlocked: boolean;
  currentUser?: AppUser | null;
  pendingApprovalsCount?: number;
  onOpenPinModal: () => void;
  onQuickPayment: () => void;
  onLogout?: () => void;
  activeYear: number;
  onYearChange: (year: number) => void;
  onCreateFinancialYear?: (year: number) => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  syncStatus?: 'Synced' | 'Syncing' | 'Not Synced' | 'Sync Failed';
  lastSyncTime?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  setActiveTab,
  isAdminUnlocked,
  currentUser,
  pendingApprovalsCount = 0,
  onOpenPinModal,
  onQuickPayment,
  onLogout,
  activeYear,
  onYearChange,
  onCreateFinancialYear,
  onRefresh,
  isRefreshing = false,
  syncStatus = 'Synced',
  lastSyncTime = null,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isCreateYearModalOpen, setIsCreateYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState<number>(2026);
  const [newYearError, setNewYearError] = useState('');
  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const availableYears = settings.financialYears && settings.financialYears.length > 0 
    ? settings.financialYears 
    : [2024, 2025];

  const isSuperAdmin = isAdminUnlocked || currentUser?.role === 'Super Admin / Admin';
  const perms = currentUser?.permissions || [];

  const allNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: BarChart3, visible: isSuperAdmin || perms.includes('dashboard') },
    { id: 'member_portal' as NavTab, label: 'Member Portal', icon: CreditCard, visible: isSuperAdmin || perms.includes('member_portal_view') || Boolean(currentUser?.memberId) },
    { id: 'members' as NavTab, label: 'Members', icon: Users, visible: isSuperAdmin || perms.includes('members_view') || perms.includes('members_edit') },
    { id: 'programs' as NavTab, label: 'Programs & Events', icon: CalendarCheck, visible: isSuperAdmin || perms.includes('programs_view') || perms.includes('programs_edit') },
    { 
      id: 'approvals' as NavTab, 
      label: 'Approvals', 
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      visible: isSuperAdmin || perms.includes('payment_approve'),
    },
    { id: 'receipts' as NavTab, label: 'Payments & Receipts', icon: Receipt, visible: isSuperAdmin || perms.includes('receipts_view') || perms.includes('payment_entry') },
    { id: 'yearly_summary' as NavTab, label: 'Member Dues', icon: Calendar, visible: isSuperAdmin || perms.includes('accounts_view') || perms.includes('reports_view') || perms.includes('members_view') },
    { id: 'expenses' as NavTab, label: 'Expenses', icon: TrendingDown, visible: isSuperAdmin || perms.includes('expenses_view') || perms.includes('expenses_edit') },
    { id: 'organizers' as NavTab, label: 'Organizers', icon: Award, visible: isSuperAdmin || perms.includes('organizers_view') || perms.includes('organizers_manage') },
    { id: 'reports' as NavTab, label: 'Reports', icon: FileSpreadsheet, visible: isSuperAdmin || perms.includes('reports_view') || perms.includes('reports_export') },
    { id: 'users' as NavTab, label: 'User Roles', icon: UserCog, visible: isSuperAdmin || perms.includes('user_management'), adminOnly: true },
    { id: 'settings' as NavTab, label: 'Admin Settings', icon: Settings, visible: isSuperAdmin || perms.includes('settings_manage'), adminOnly: true },
  ];

  const navItems = allNavItems.filter(item => item.visible);

  const handleTabClick = (tabId: NavTab) => {
    if (tabId === 'settings' && !isAdminUnlocked) {
      onOpenPinModal();
    } else {
      setActiveTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 print:hidden">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.clubName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-contain bg-white/10 p-0.5 border border-slate-700 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 font-black text-xl flex-shrink-0">
                {settings.clubName.charAt(0) || 'G'}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg sm:text-xl tracking-tight text-white leading-tight">
                  {settings.clubName}
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {settings.villageTown} • Reg: {settings.registrationNo}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Pending Approvals quick badge button if any pending */}
            {pendingApprovalsCount > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="hidden sm:flex items-center space-x-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all animate-pulse"
                title={`${pendingApprovalsCount} payments pending admin approval`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{pendingApprovalsCount} Pending</span>
              </button>
            )}

            {/* Year Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 text-xs">
              <span className="text-slate-400 mr-1.5 hidden sm:inline">Year:</span>
              <select
                aria-label="Financial Year"
                value={activeYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent font-semibold text-emerald-400 focus:outline-none cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    FY {yr - 1}-{yr} ({yr})
                  </option>
                ))}
              </select>

              {/* Only Admin can create new financial years */}
              <button
                type="button"
                onClick={() => {
                  if (!isAdminUnlocked) {
                    onOpenPinModal();
                  } else {
                    const maxYear = Math.max(...availableYears, 2025);
                    setNewYearInput(maxYear + 1);
                    setNewYearError('');
                    setIsCreateYearModalOpen(true);
                  }
                }}
                className="ml-1.5 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                title={isAdminUnlocked ? "Admin: Create New Financial Year" : "Admin required to create new financial year"}
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sync Now button with explicit manual trigger and status display */}
            {onRefresh && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-xs ${
                    syncStatus === 'Syncing'
                      ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                      : syncStatus === 'Sync Failed'
                      ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 hover:bg-rose-900/80'
                      : syncStatus === 'Not Synced'
                      ? 'bg-slate-800 border-amber-400 text-amber-300 hover:bg-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300'
                  }`}
                  title={lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Manual Data Sync with Server'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                  <span>Sync Now</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ml-0.5 ${
                    syncStatus === 'Synced' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : syncStatus === 'Syncing'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : syncStatus === 'Sync Failed'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-900 text-amber-300 border border-amber-700'
                  }`}>
                    {syncStatus}
                  </span>
                </button>
                {lastSyncTime && (
                  <span className="hidden xl:inline text-[10px] text-slate-400 font-mono" title={`Last Sync: ${lastSyncTime}`}>
                    Last: {lastSyncTime}
                  </span>
                )}
              </div>
            )}

            {/* Admin Badge */}
            <button
              onClick={() => {
                if (!isAdminUnlocked) {
                  onOpenPinModal();
                } else {
                  setActiveTab('settings');
                }
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isAdminUnlocked
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title={isAdminUnlocked ? 'Admin Mode Unlocked' : 'Click to Unlock Admin'}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isAdminUnlocked ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {isAdminUnlocked ? 'Admin OK' : 'Admin PIN'}
              </span>
            </button>

            {/* + Record Payment Fast Button (Only for users with payment_entry permission or Admin) */}
            {(isSuperAdmin || perms.includes('payment_entry')) && (
              <button
                onClick={onQuickPayment}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden xs:inline">+ Receipt</span>
              </button>
            )}

            {/* User Account & Logout */}
            {currentUser && (
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white max-w-[100px] truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-400">({currentUser.role})</span>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                title="Secure Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative"
              aria-label="Toggle navigation menu"
            >
              {pendingApprovalsCount > 0 && !mobileMenuOpen && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
              )}
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex space-x-1 py-2 overflow-x-auto text-xs sm:text-sm scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Admin Create Financial Year Modal */}
      {isCreateYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">Create Financial Year</h3>
              </div>
              <button
                onClick={() => setIsCreateYearModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                <div className="font-bold mb-0.5">Admin Security Policy</div>
                Only authorized Administrators can create a new financial accounting year for the club.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Financial Year (e.g. 2026, 2027):
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2050"
                  value={newYearInput}
                  onChange={(e) => {
                    setNewYearInput(Number(e.target.value));
                    setNewYearError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Format: FY {newYearInput - 1}-{newYearInput}
                </span>
              </div>

              {newYearError && (
                <div className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {newYearError}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateYearModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCreatingYear}
                  onClick={async () => {
                    if (!newYearInput || isNaN(newYearInput)) {
                      setNewYearError('Please enter a valid year number.');
                      return;
                    }
                    if (availableYears.includes(newYearInput)) {
                      setNewYearError(`Financial year ${newYearInput} already exists.`);
                      return;
                    }
                    setIsCreatingYear(true);
                    try {
                      if (onCreateFinancialYear) {
                        await onCreateFinancialYear(newYearInput);
                      }
                      setIsCreateYearModalOpen(false);
                    } catch (err: any) {
                      setNewYearError(err?.message || 'Failed to create financial year');
                    } finally {
                      setIsCreatingYear(false);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isCreatingYear ? 'Creating...' : '+ Create Year'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
