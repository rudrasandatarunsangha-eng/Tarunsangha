import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Lock, 
  Key, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  History, 
  Edit3, 
  Phone, 
  Mail, 
  Building2, 
  CheckCircle2, 
  XCircle,
  Filter,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Save
} from 'lucide-react';
import { AppUser, UserRole, UserPermission, LoginHistoryItem, ClubSettings, PasswordResetRequest, Member } from '../types/club.ts';
import { 
  getUsersList, 
  createUser, 
  updateUser, 
  resetUserPassword, 
  toggleUserStatus, 
  getLoginHistory,
  getPasswordResetRequests,
  actionPasswordResetRequest
} from '../services/api.ts';

interface UserManagementProps {
  currentUser: AppUser | null;
  settings: ClubSettings;
  members?: Member[];
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
  adminPin?: string;
}

const AVAILABLE_ROLES: UserRole[] = [
  'Super Admin / Admin',
  'Accounts',
  'Member Management',
  'Payment Entry',
  'Payment Approval',
  'Reports',
  'View Only Member',
  'Edit Permitted Modules Member',
  'Member',
  'Custom',
];

const ALL_PERMISSIONS: { key: UserPermission; label: string; group: string; isEdit?: boolean }[] = [
  { key: 'dashboard', label: 'View Dashboard & KPIs', group: 'General' },
  { key: 'members_view', label: 'View Member Directory', group: 'Members' },
  { key: 'members_edit', label: 'Add & Edit Members', group: 'Members', isEdit: true },
  { key: 'members_delete', label: 'Delete Members (Admin Only)', group: 'Members', isEdit: true },
  { key: 'id_card_view', label: 'View & Print Membership Card', group: 'Members' },
  { key: 'programs_view', label: 'View Programs & Events', group: 'Programs' },
  { key: 'programs_edit', label: 'Add & Edit Programs', group: 'Programs', isEdit: true },
  { key: 'programs_delete', label: 'Delete Programs', group: 'Programs', isEdit: true },
  { key: 'receipts_view', label: 'View Receipts & Payments', group: 'Finance' },
  { key: 'payment_entry', label: 'Enter Payment Receipts', group: 'Finance', isEdit: true },
  { key: 'payment_approve', label: 'Approve & Reject Payments', group: 'Finance', isEdit: true },
  { key: 'receipts_delete', label: 'Delete Receipts / Ledgers', group: 'Finance', isEdit: true },
  { key: 'expenses_view', label: 'View Local Expenses', group: 'Expenses' },
  { key: 'expenses_edit', label: 'Add & Edit Expenses', group: 'Expenses', isEdit: true },
  { key: 'expenses_delete', label: 'Delete Expenses', group: 'Expenses', isEdit: true },
  { key: 'organizers_view', label: 'View Organizers', group: 'Organizers' },
  { key: 'organizers_manage', label: 'Manage Organizers & Committee', group: 'Organizers', isEdit: true },
  { key: 'accounts_view', label: 'View Accounts & Ledgers', group: 'Finance' },
  { key: 'reports_view', label: 'Generate & View Reports', group: 'Reports' },
  { key: 'reports_export', label: 'Export Reports (PDF / Excel / Sheets)', group: 'Reports', isEdit: true },
  { key: 'member_portal_view', label: 'Access Member Portal', group: 'Member Portal' },
  { key: 'customer_selection', label: 'Submit Customer Selection Requests', group: 'Member Portal', isEdit: true },
  { key: 'password_reset_request', label: 'Request Password Reset from Admin', group: 'Security' },
  { key: 'user_management', label: 'Manage Login Users & Roles', group: 'Admin', isEdit: true },
  { key: 'settings_manage', label: 'Configure Club Settings & Themes', group: 'Admin', isEdit: true },
  { key: 'backup_restore', label: 'Google Drive Backup & Restore', group: 'Admin', isEdit: true },
];

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  settings,
  members = [],
  isAdminUnlocked,
  onOpenPinModal,
  adminPin,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'history'>('users');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password reset request actioning state
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [resettingUser, setResettingUser] = useState<AppUser | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState('');

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('General Operations');
  const [newRole, setNewRole] = useState<UserRole>('Payment Entry');
  const [newCustomRole, setNewCustomRole] = useState('');
  const [newPassword, setNewPassword] = useState('welcome123');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');
  const [newMemberId, setNewMemberId] = useState('');
  const [newPermissions, setNewPermissions] = useState<UserPermission[]>(['dashboard', 'payment_entry']);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const [userList, historyList, requestsList] = await Promise.all([
        getUsersList(adminPin),
        getLoginHistory(adminPin),
        getPasswordResetRequests(adminPin),
      ]);
      setUsers(userList);
      setLoginHistory(historyList);
      setResetRequests(requestsList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user management records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionResetRequest = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setActioningRequestId(id);
      setErrorMsg('');
      const res = await actionPasswordResetRequest(id, action, undefined, adminPin);
      setSuccessMsg(res.message);
      loadData();
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to action password reset request');
    } finally {
      setActioningRequestId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminPin]);

  // Role preset permission auto-assignment helper (Requirement 3: VIEW ONLY MEMBER, EDIT PERMITTED, CUSTOM)
  const handleRoleChangeForNewUser = (role: UserRole) => {
    setNewRole(role);
    if (role === 'Super Admin / Admin') {
      setNewPermissions(ALL_PERMISSIONS.map(p => p.key));
    } else if (role === 'View Only Member') {
      // Requirement 3 & 4: VIEW ONLY MEMBER
      // Can view only permitted modules, reports, membership card; cannot add/edit/delete/approve anything
      setNewPermissions([
        'dashboard',
        'members_view',
        'programs_view',
        'receipts_view',
        'expenses_view',
        'organizers_view',
        'accounts_view',
        'reports_view',
        'id_card_view',
        'member_portal_view',
        'password_reset_request'
      ]);
    } else if (role === 'Edit Permitted Modules Member') {
      // Requirement 3 & 4: EDIT PERMITTED MODULES MEMBER
      // Can view and edit permitted modules only
      setNewPermissions([
        'dashboard',
        'members_view',
        'programs_view',
        'receipts_view',
        'payment_entry',
        'expenses_view',
        'expenses_edit',
        'organizers_view',
        'accounts_view',
        'reports_view',
        'id_card_view',
        'member_portal_view',
        'customer_selection',
        'password_reset_request'
      ]);
    } else if (role === 'Member') {
      setNewPermissions([
        'dashboard',
        'member_portal_view',
        'id_card_view',
        'customer_selection',
        'password_reset_request'
      ]);
    } else if (role === 'Accounts') {
      setNewPermissions([
        'dashboard',
        'members_view',
        'payment_entry',
        'payment_approve',
        'expenses_view',
        'expenses_edit',
        'accounts_view',
        'reports_view',
        'reports_export'
      ]);
    } else if (role === 'Member Management') {
      setNewPermissions(['dashboard', 'members_view', 'members_edit', 'id_card_view', 'payment_entry']);
    } else if (role === 'Payment Entry') {
      setNewPermissions(['dashboard', 'members_view', 'receipts_view', 'payment_entry', 'programs_view']);
    } else if (role === 'Payment Approval') {
      setNewPermissions(['dashboard', 'receipts_view', 'payment_entry', 'payment_approve', 'reports_view']);
    } else if (role === 'Reports') {
      setNewPermissions(['dashboard', 'reports_view', 'reports_export', 'accounts_view', 'members_view']);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      u.department.toLowerCase().includes(q);

    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchQuery && matchRole && matchStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newEmail.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    try {
      setErrorMsg('');
      const res = await createUser({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        department: newDepartment.trim(),
        role: newRole,
        customRoleName: newRole === 'Custom' ? newCustomRole.trim() : undefined,
        password: newPassword.trim() || 'welcome123',
        permissions: newPermissions,
        status: newStatus,
        memberId: newMemberId.trim() || undefined,
      }, adminPin);

      setSuccessMsg(`User "${res.user.fullName}" created successfully! Initial Password: ${newPassword}`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewPhone('');
      setNewMemberId('');
      setNewStatus('active');
      setNewPassword('welcome123');
      loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setErrorMsg('');
      await updateUser(editingUser.id, {
        ...editingUser,
        username: editingUser.username.trim(),
        fullName: editingUser.fullName.trim(),
        email: editingUser.email.trim(),
        phone: editingUser.phone?.trim() || undefined,
        memberId: editingUser.memberId?.trim() || undefined,
        status: editingUser.status,
        permissions: editingUser.permissions,
        password: editPasswordInput.trim() ? editPasswordInput.trim() : undefined,
      }, adminPin);

      setSuccessMsg(`User "${editingUser.fullName}" updated successfully!${editPasswordInput.trim() ? ' Password explicitly reset.' : ''}`);
      setEditingUser(null);
      setEditPasswordInput('');
      loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    try {
      const updated = await toggleUserStatus(user.id, adminPin);
      setSuccessMsg(`User status changed to ${updated.status.toUpperCase()}`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle status');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      const msg = await resetUserPassword(resettingUser.id, newTemporaryPassword.trim(), adminPin);
      setSuccessMsg(msg);
      setResettingUser(null);
      setNewTemporaryPassword('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">User Creation & Role Permissions</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create staff accounts, assign granular module permissions, reset passwords, and audit login activity.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create New User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 shadow-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center space-x-2 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60 text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'requests' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Password Reset Requests</span>
          {resetRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
              {resetRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Login & Security History ({loginHistory.length})</span>
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, User ID, email, or department..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                aria-label="Filter by User Role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                {AVAILABLE_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                aria-label="Filter by Account Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const isSelf = currentUser?.id === user.id;
              return (
                <div 
                  key={user.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                    user.status === 'inactive' ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20 flex-shrink-0">
                        {user.fullName.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-bold text-slate-900 text-sm">{user.fullName}</h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-indigo-600 font-semibold mt-0.5">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      user.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {user.status}
                    </span>
                  </div>

                  {/* Info details */}
                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-medium text-slate-800">{user.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Role:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Mobile:</span>
                        <span className="font-medium text-slate-800">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">Permissions:</span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {user.permissions?.length || 0} Modules Allowed
                      </span>
                    </div>
                    {user.lastLoginAt && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Last Login:</span>
                        <span>{new Date(user.lastLoginAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setEditingUser({ ...user })}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Edit User Details & Permissions"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setResettingUser(user);
                          setNewTemporaryPassword('pass' + Math.floor(1000 + Math.random() * 9000));
                        }}
                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                        title="Reset Account Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(user)}
                      disabled={user.id === 'USR-ADMIN'}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                        user.status === 'active'
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PASSWORD RESET REQUESTS TAB (Requirement 2) */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">Forgot Password Requests & Approvals</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin review portal: Only authorized Admin can approve password resets. Approved users receive a secure one-time authorization token.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
              {resetRequests.filter(r => r.status === 'PENDING').length} Pending Requests
            </span>
          </div>

          {resetRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Key className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">No Password Reset Requests</p>
              <p className="text-xs text-slate-400 mt-0.5">When users submit forgot password requests from the login screen, they will appear here for Admin approval.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] uppercase border-b border-slate-200">
                    <th className="p-3">Request ID & Date</th>
                    <th className="p-3">Requester / User ID</th>
                    <th className="p-3">Account Name & Contact</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">One-Time Token</th>
                    <th className="p-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resetRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">{req.id}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {new Date(req.requestDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {req.username}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">{req.userId}</span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{req.fullName}</span>
                        <span className="text-[11px] text-slate-500">{req.email || req.phone || 'No direct contact info'}</span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <span className="text-slate-700 italic block leading-relaxed">{req.reason}</span>
                        {req.adminNotes && (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Note: {req.adminNotes}
                          </span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          req.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {req.status}
                        </span>
                        {req.actionedBy && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">By: {req.actionedBy}</span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {req.status === 'APPROVED' && req.resetToken ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <code className="text-[11px] font-mono bg-slate-900 text-emerald-300 px-2 py-0.5 rounded font-bold selection:bg-emerald-500">
                                {req.resetToken}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(req.resetToken || '');
                                  setSuccessMsg(`Copied one-time token for ${req.username} to clipboard!`);
                                  setTimeout(() => setSuccessMsg(''), 3000);
                                }}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                                title="Copy token to send to user"
                              >
                                Copy
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Single-use reset code</span>
                          </div>
                        ) : req.status === 'COMPLETED' ? (
                          <span className="text-[11px] text-slate-400 italic">Used & completed</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              disabled={actioningRequestId === req.id}
                              onClick={() => handleActionResetRequest(req.id, 'APPROVE')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={actioningRequestId === req.id}
                              onClick={() => handleActionResetRequest(req.id, 'REJECT')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Actioned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LOGIN HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Login Activity & Security Audit</h3>
              <p className="text-xs text-slate-500">Chronological history of successful and failed authentication attempts.</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {loginHistory.length} Attempts Logged
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold text-[11px] uppercase border-b border-slate-200">
                  <th className="p-3">Log ID & Time</th>
                  <th className="p-3">User Identifier</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Result Status</th>
                  <th className="p-3">IP Address / Client</th>
                  <th className="p-3">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loginHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">{item.id}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono font-bold text-indigo-600">
                      {item.userId}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-slate-900">
                      {item.userName}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'LOGOUT' ? 'bg-slate-100 text-slate-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {item.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.reason || 'Normal system login'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-600">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900">Create New Login User</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Linked Member Record */}
                <div className="sm:col-span-2 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
                  <label className="block font-bold text-indigo-950 mb-1">
                    Link Existing Member Record (Optional)
                  </label>
                  <select
                    value={newMemberId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setNewMemberId(selectedId);
                      if (selectedId) {
                        const found = members.find(m => m.id === selectedId);
                        if (found) {
                          if (!newFullName || newFullName === 'Unnamed Member') setNewFullName(found.name);
                          if (!newUsername) setNewUsername(found.id.toLowerCase().replace(/[^a-z0-9]/g, ''));
                          if (found.email && !newEmail) setNewEmail(found.email);
                          if (found.phone && !newPhone) setNewPhone(found.phone);
                        }
                      }
                    }}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None (Standalone Club Officer / Admin) --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} — {m.name} ({m.villageWard || m.category})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-700/80 mt-1">
                    Linking assigns this login to their member ID card, ledger, and customer nomination records.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User ID / Login Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. rahul_sharma or MEM-001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">The exact ID the member will use to log in.</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Member Name / Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +91 98321 00000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Role & Preset *</label>
                  <select
                    value={newRole}
                    onChange={(e) => handleRoleChangeForNewUser(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Active Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="active">Active (Permitted to log in)</option>
                    <option value="inactive">Inactive (Suspended)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. Executive Committee, General Member"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password * (Admin Assigned)</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Will remain permanently assigned until Admin changes or resets it.
                  </p>
                </div>

                {newRole === 'Custom' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Custom Role Title</label>
                    <input
                      type="text"
                      value={newCustomRole}
                      onChange={(e) => setNewCustomRole(e.target.value)}
                      placeholder="e.g. Sports Convener / Tournament Lead"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Granular Module Permissions Selector */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs sm:text-sm">
                      Allowed Modules & Permissions Configuration:
                    </label>
                    <p className="text-[11px] text-slate-500">Configure View-Only or Edit permission for each module individually</p>
                  </div>
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleRoleChangeForNewUser('View Only Member')}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 font-bold transition-colors"
                    >
                      Preset: View Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleChangeForNewUser('Edit Permitted Modules Member')}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 font-bold transition-colors"
                    >
                      Preset: Edit Permitted
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPermissions(ALL_PERMISSIONS.map(p => p.key))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPermissions([])}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-52 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = newPermissions.includes(perm.key);
                    return (
                      <label 
                        key={perm.key}
                        className={`flex items-center space-x-2 text-xs p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          isChecked 
                            ? 'bg-white border-indigo-200 text-slate-900 shadow-xs' 
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPermissions(prev => [...prev, perm.key]);
                            } else {
                              setNewPermissions(prev => prev.filter(k => k !== perm.key));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="flex-1 font-medium">{perm.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          perm.isEdit 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {perm.isEdit ? 'Edit' : 'View'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
                >
                  Create & Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Edit User Details: {editingUser.fullName}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Linked Member Record */}
                <div className="sm:col-span-2 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
                  <label className="block font-bold text-indigo-950 mb-1">
                    Linked Member Record (Optional)
                  </label>
                  <select
                    value={editingUser.memberId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, memberId: e.target.value || undefined })}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None (Standalone Club Officer / Admin) --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} — {m.name} ({m.villageWard || m.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User ID / Login Username *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Member Name / Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Role & Preset</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => {
                      const newR = e.target.value as UserRole;
                      if (newR === 'View Only Member') {
                        setEditingUser({
                          ...editingUser,
                          role: newR,
                          permissions: [
                            'dashboard',
                            'members_view',
                            'programs_view',
                            'receipts_view',
                            'expenses_view',
                            'organizers_view',
                            'accounts_view',
                            'reports_view',
                            'id_card_view',
                            'member_portal_view',
                            'password_reset_request'
                          ],
                        });
                      } else if (newR === 'Edit Permitted Modules Member') {
                        setEditingUser({
                          ...editingUser,
                          role: newR,
                          permissions: [
                            'dashboard',
                            'members_view',
                            'programs_view',
                            'receipts_view',
                            'payment_entry',
                            'expenses_view',
                            'expenses_edit',
                            'organizers_view',
                            'accounts_view',
                            'reports_view',
                            'id_card_view',
                            'member_portal_view',
                            'customer_selection',
                            'password_reset_request'
                          ],
                        });
                      } else {
                        setEditingUser({ ...editingUser, role: newR });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="active">Active (Can log in)</option>
                    <option value="inactive">Inactive (Suspended)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingUser.department}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Change Password (Admin Only)
                  </label>
                  <input
                    type="text"
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                    placeholder="Leave blank to preserve current password"
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-amber-700/80 mt-0.5">
                    If empty, the user's existing password credentials remain completely untouched.
                  </p>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs sm:text-sm">
                      Configure Allowed Modules & Access:
                    </label>
                    <p className="text-[11px] text-slate-500">Customize view vs edit permission for each module</p>
                  </div>
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditingUser({
                        ...editingUser,
                        permissions: [
                          'dashboard',
                          'members_view',
                          'programs_view',
                          'receipts_view',
                          'expenses_view',
                          'organizers_view',
                          'accounts_view',
                          'reports_view',
                          'id_card_view',
                          'member_portal_view',
                          'password_reset_request'
                        ]
                      })}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 font-bold transition-colors"
                    >
                      Preset: View Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({
                        ...editingUser,
                        permissions: [
                          'dashboard',
                          'members_view',
                          'programs_view',
                          'receipts_view',
                          'payment_entry',
                          'expenses_view',
                          'expenses_edit',
                          'organizers_view',
                          'accounts_view',
                          'reports_view',
                          'id_card_view',
                          'member_portal_view',
                          'customer_selection',
                          'password_reset_request'
                        ]
                      })}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 font-bold transition-colors"
                    >
                      Preset: Edit Permitted
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, permissions: ALL_PERMISSIONS.map(p => p.key) })}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, permissions: [] })}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-52 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = editingUser.permissions?.includes(perm.key);
                    return (
                      <label 
                        key={perm.key}
                        className={`flex items-center space-x-2 text-xs p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          isChecked 
                            ? 'bg-white border-indigo-200 text-slate-900 shadow-xs' 
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = editingUser.permissions || [];
                            if (e.target.checked) {
                              setEditingUser({ ...editingUser, permissions: [...cur, perm.key] });
                            } else {
                              setEditingUser({ ...editingUser, permissions: cur.filter(k => k !== perm.key) });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="flex-1 font-medium">{perm.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          perm.isEdit 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {perm.isEdit ? 'Edit' : 'View'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600">
                <Key className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Reset Account Password</h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set a temporary password for <strong>{resettingUser.fullName}</strong> (@{resettingUser.username}). They will use this password on their next sign-in.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Temporary Password:
                </label>
                <input
                  type="text"
                  required
                  value={newTemporaryPassword}
                  onChange={(e) => setNewTemporaryPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
