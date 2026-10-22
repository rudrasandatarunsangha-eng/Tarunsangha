import React, { useState, useEffect } from 'react';
import { 
  ClubDatabase, 
  Member, 
  PaymentReceipt, 
  Expense, 
  Organizer, 
  Program,
  ClubSettings,
  AppUser 
} from './types/club.ts';
import { 
  getFullData, 
  saveSettings, 
  verifyAdminPin, 
  fetchCurrentUser,
  logoutUser,
  addMember, 
  updateMember, 
  deleteMember, 
  addReceipt, 
  deleteReceipt, 
  approvePayment,
  rejectPayment,
  addExpense, 
  updateExpense,
  deleteExpense, 
  addOrganizer, 
  updateOrganizer, 
  deleteOrganizer, 
  addProgram,
  updateProgram,
  deleteProgram,
  restoreDatabase, 
  resetToDemo,
  createFinancialYear
} from './services/api.ts';
import { Header, NavTab } from './components/Header.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { MemberList } from './components/MemberList.tsx';
import { MemberModal } from './components/MemberModal.tsx';
import { MemberDetailModal } from './components/MemberDetailModal.tsx';
import { MemberIdCard } from './components/MemberIdCard.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';
import { ProgramList } from './components/ProgramList.tsx';
import { ProgramModal } from './components/ProgramModal.tsx';
import { ProgramDetailModal } from './components/ProgramDetailModal.tsx';
import { PaymentApprovalList } from './components/PaymentApprovalList.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { ReceiptViewModal } from './components/ReceiptViewModal.tsx';
import { ReceiptsList } from './components/ReceiptsList.tsx';
import { ExpenseList } from './components/ExpenseList.tsx';
import { ExpenseModal } from './components/ExpenseModal.tsx';
import { OrganizersList } from './components/OrganizersList.tsx';
import { YearlySummary } from './components/YearlySummary.tsx';
import { Reports } from './components/Reports.tsx';
import { UserManagement } from './components/UserManagement.tsx';
import { AdminSettings } from './components/AdminSettings.tsx';
import { AdminPinModal } from './components/AdminPinModal.tsx';
import { Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<ClubDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeYear, setActiveYear] = useState<number>(2025);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Security & Admin PIN Mode
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [verifiedAdminPin, setVerifiedAdminPin] = useState<string>('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Modals & Selectors
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preSelectedMemberId, setPreSelectedMemberId] = useState<string | undefined>(undefined);
  const [preSelectedProgramId, setPreSelectedProgramId] = useState<string | undefined>(undefined);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [idCardMember, setIdCardMember] = useState<Member | null>(null);

  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<Program | null>(null);
  const [detailProgram, setDetailProgram] = useState<Program | null>(null);

  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceipt | null>(null);
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Syncing' | 'Not Synced' | 'Sync Failed'>('Synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  // Load database and session on start or on explicit user action
  const refreshData = async (showFullSpinner = true) => {
    try {
      if (showFullSpinner) {
        setLoading(true);
      } else {
        setIsBackgroundSyncing(true);
        setSyncStatus('Syncing');
      }
      const [data, sessionUser] = await Promise.all([
        getFullData(),
        fetchCurrentUser(),
      ]);
      setDb(data);
      if (sessionUser) {
        setCurrentUser(sessionUser);
        if (sessionUser.role === 'Super Admin / Admin') {
          setIsAdminUnlocked(true);
          setVerifiedAdminPin(data.settings?.adminPin || '1234');
        }
      }
      if (data.settings?.activeFinancialYear) {
        setActiveYear(data.settings.activeFinancialYear);
      }
      setError(null);
      setSyncStatus('Synced');
      const nowStr = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date());
      setLastSyncTime(`${nowStr} IST`);
    } catch (err: any) {
      console.error('Failed to sync data:', err);
      setSyncStatus('Sync Failed');
      if (showFullSpinner) {
        setError(err?.message || 'Failed to connect to database');
      }
    } finally {
      if (showFullSpinner) {
        setLoading(false);
      }
      setIsBackgroundSyncing(false);
    }
  };

  // Requirement 1: Disable all automatic background sync, timer polling, and visibility-change triggers.
  // Data sync occurs ONLY on initial mount and when user explicitly clicks "Sync Now".
  useEffect(() => {
    refreshData(true);
  }, []);

  // Login handler
  const handleLoginSuccess = (user: AppUser, _token: string) => {
    setCurrentUser(user);
    if (user.role === 'Super Admin / Admin') {
      setIsAdminUnlocked(true);
      if (db?.settings?.adminPin) {
        setVerifiedAdminPin(db.settings.adminPin);
      }
      setActiveTab('dashboard');
    } else if (user.role === 'Member') {
      setActiveTab('member_portal');
    } else {
      setActiveTab('dashboard');
    }
    refreshData();
  };

  // Logout handler
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsAdminUnlocked(false);
    setVerifiedAdminPin('');
  };

  // Admin PIN Verify
  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    const ok = await verifyAdminPin(pin);
    if (ok) {
      setIsAdminUnlocked(true);
      setVerifiedAdminPin(pin);
    }
    return ok;
  };

  // Member CRUD
  const handleSaveMember = async (memberData: Partial<Member>) => {
    if (memberData.id) {
      const updated = await updateMember(memberData.id, memberData);
      setDb(prev => prev ? {
        ...prev,
        members: prev.members.map(m => m.id === updated.id ? updated : m),
      } : prev);
    } else {
      const created = await addMember(memberData);
      setDb(prev => prev ? {
        ...prev,
        members: [created, ...prev.members],
      } : prev);
    }
  };

  const handleDeleteMember = async (memberId: string, reason?: string) => {
    await deleteMember(memberId, verifiedAdminPin || undefined, reason);
    setDb(prev => prev ? {
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
    } : prev);
  };

  // Program Management CRUD
  const handleSaveProgram = async (programData: Partial<Program>) => {
    if (programData.id) {
      const updated = await updateProgram(programData.id, programData);
      setDb(prev => prev ? {
        ...prev,
        programs: (prev.programs || []).map(p => p.id === updated.id ? updated : p),
      } : prev);
    } else {
      const created = await addProgram(programData);
      setDb(prev => prev ? {
        ...prev,
        programs: [created, ...(prev.programs || [])],
      } : prev);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    await deleteProgram(programId, verifiedAdminPin || undefined);
    setDb(prev => prev ? {
      ...prev,
      programs: (prev.programs || []).filter(p => p.id !== programId),
    } : prev);
  };

  // Payment Receipt CRUD & Approvals
  const handleSavePayment = async (receiptData: Partial<PaymentReceipt>): Promise<PaymentReceipt> => {
    const saved = await addReceipt({
      ...receiptData,
      submittedBy: currentUser?.fullName || receiptData.submittedBy || 'Desk Officer',
    }, verifiedAdminPin || undefined);
    setDb(prev => prev ? {
      ...prev,
      receipts: [saved, ...prev.receipts],
    } : prev);
    return saved;
  };

  const handleApprovePayment = async (paymentId: string) => {
    const updated = await approvePayment(paymentId, verifiedAdminPin);
    setDb(prev => prev ? {
      ...prev,
      receipts: prev.receipts.map(r => r.id === updated.id ? updated : r),
    } : prev);
    const fresh = await getFullData();
    setDb(fresh);
  };

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    const updated = await rejectPayment(paymentId, reason, verifiedAdminPin);
    setDb(prev => prev ? {
      ...prev,
      receipts: prev.receipts.map(r => r.id === updated.id ? updated : r),
    } : prev);
    const fresh = await getFullData();
    setDb(fresh);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    await deleteReceipt(receiptId, verifiedAdminPin || undefined);
    setDb(prev => prev ? {
      ...prev,
      receipts: prev.receipts.filter(r => r.id !== receiptId),
    } : prev);
  };

  // Expense CRUD
  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (expenseData.id) {
      const updated = await updateExpense(expenseData.id, expenseData);
      setDb(prev => prev ? {
        ...prev,
        expenses: prev.expenses.map(e => e.id === updated.id ? updated : e),
      } : prev);
    } else {
      const saved = await addExpense({
        ...expenseData,
        enteredBy: currentUser?.fullName || expenseData.enteredBy || 'Treasurer',
      });
      setDb(prev => prev ? {
        ...prev,
        expenses: [saved, ...prev.expenses],
      } : prev);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId, verifiedAdminPin || undefined);
    setDb(prev => prev ? {
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId),
    } : prev);
  };

  // Organizer CRUD
  const handleSaveOrganizer = async (orgData: Partial<Organizer>) => {
    if (orgData.id) {
      const updated = await updateOrganizer(orgData.id, orgData);
      setDb(prev => prev ? {
        ...prev,
        organizers: prev.organizers.map(o => o.id === updated.id ? updated : o),
      } : prev);
    } else {
      const created = await addOrganizer(orgData);
      setDb(prev => prev ? {
        ...prev,
        organizers: [...prev.organizers, created],
      } : prev);
    }
  };

  const handleDeleteOrganizer = async (id: string) => {
    await deleteOrganizer(id, verifiedAdminPin || undefined);
    setDb(prev => prev ? {
      ...prev,
      organizers: prev.organizers.filter(o => o.id !== id),
    } : prev);
  };

  // Settings & Backups
  const handleSaveSettings = async (newSettings: Partial<ClubSettings>) => {
    const updated = await saveSettings(newSettings, verifiedAdminPin || undefined);
    setDb(prev => prev ? { ...prev, settings: updated } : prev);
  };

  const handleCreateFinancialYear = async (year: number) => {
    const res = await createFinancialYear(year, true, verifiedAdminPin || undefined);
    setActiveYear(year);
    setDb(prev => prev ? {
      ...prev,
      settings: {
        ...prev.settings,
        financialYears: res.financialYears,
        activeFinancialYear: res.activeFinancialYear,
      }
    } : prev);
  };

  const handleRestoreBackup = async (importedDb: ClubDatabase) => {
    const restored = await restoreDatabase(importedDb, verifiedAdminPin || undefined);
    setDb(restored);
  };

  const handleResetDemo = async () => {
    const reset = await resetToDemo(verifiedAdminPin || undefined);
    setDb(reset);
  };

  // Quick Action Helpers
  const handleQuickPayment = (memberId?: string, programId?: string) => {
    setPreSelectedMemberId(memberId);
    setPreSelectedProgramId(programId);
    setIsPaymentModalOpen(true);
  };

  const handleQuickExpense = (programId?: string) => {
    setExpenseToEdit(programId ? { programId } as any : null);
    setIsExpenseModalOpen(true);
  };

  const handleQuickMember = () => {
    setMemberToEdit(null);
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (m: Member) => {
    setMemberToEdit(m);
    setIsMemberModalOpen(true);
  };

  const handleQuickProgram = () => {
    setProgramToEdit(null);
    setIsProgramModalOpen(true);
  };

  const handleEditProgram = (p: Program) => {
    setProgramToEdit(p);
    setIsProgramModalOpen(true);
  };

  if (loading && !db) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
        <h2 className="text-lg font-bold">Connecting to Club Portal...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying persistent database & security policies</p>
      </div>
    );
  }

  if (error && !db) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl max-w-md text-center space-y-3 border border-slate-700">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold">Database Connection Error</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={() => refreshData(true)}
            className="flex items-center space-x-1.5 mx-auto bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (!db) return null;

  // If user is not logged in, display the redesigned colorful login page!
  if (!currentUser) {
    return (
      <LoginPage
        settings={db.settings}
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => {
          // Fallback guest viewer mode
          setCurrentUser({
            id: 'GUEST',
            username: 'guest',
            fullName: 'Guest Visitor',
            email: 'guest@club.local',
            department: 'Public Desk',
            role: 'Reports',
            status: 'active',
            permissions: ['dashboard', 'reports_view', 'members_view'],
            createdAt: new Date().toISOString(),
          });
        }}
      />
    );
  }

  const pendingApprovalsCount = db.receipts.filter(r => r.status === 'PENDING_APPROVAL').length;
  const isSuperAdmin = currentUser.role === 'Super Admin / Admin' || isAdminUnlocked;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        settings={db.settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminUnlocked={isSuperAdmin}
        currentUser={currentUser}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onQuickPayment={() => handleQuickPayment()}
        onLogout={handleLogout}
        activeYear={activeYear}
        onYearChange={setActiveYear}
        onCreateFinancialYear={handleCreateFinancialYear}
        onRefresh={() => refreshData(false)}
        isRefreshing={isBackgroundSyncing}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <Dashboard
            db={db}
            activeYear={activeYear}
            onQuickPayment={() => handleQuickPayment()}
            onQuickExpense={() => handleQuickExpense()}
            onQuickMember={handleQuickMember}
            onViewReceipt={(r) => setViewingReceipt(r)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* MEMBER PORTAL & MEMBERSHIP LEDGER */}
        {activeTab === 'member_portal' && (
          <CustomerPortal
            currentUser={currentUser}
            member={
              db.members.find(
                (m) =>
                  m.id === currentUser.memberId ||
                  m.id === currentUser.username ||
                  m.name.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim()
              ) || null
            }
            receipts={db.receipts}
            settings={db.settings}
            activeYear={activeYear}
            onViewReceipt={(r) => setViewingReceipt(r)}
            onRefreshData={() => refreshData(false)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* MEMBERS */}
        {activeTab === 'members' && (
          <MemberList
            members={db.members}
            receipts={db.receipts}
            settings={db.settings}
            activeYear={activeYear}
            onAddMember={handleQuickMember}
            onEditMember={handleEditMember}
            onViewMemberDetails={(m) => setDetailMember(m)}
            onRecordPaymentForMember={(m) => handleQuickPayment(m.id)}
            onDeleteMember={handleDeleteMember}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
            onOpenIdCard={(m) => setIdCardMember(m)}
          />
        )}

        {/* PROGRAMS & CONTRACTS */}
        {activeTab === 'programs' && (
          <ProgramList
            programs={db.programs || []}
            organizers={db.organizers || []}
            receipts={db.receipts || []}
            expenses={db.expenses || []}
            settings={db.settings}
            onAddProgram={handleQuickProgram}
            onEditProgram={handleEditProgram}
            onViewProgram={(p) => setDetailProgram(p)}
            onRecordPaymentForProgram={(p) => handleQuickPayment(undefined, p.id)}
            onRecordExpenseForProgram={(p) => handleQuickExpense(p.id)}
            onDeleteProgram={handleDeleteProgram}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {/* ADMIN PAYMENT APPROVALS */}
        {activeTab === 'approvals' && (
          <PaymentApprovalList
            receipts={db.receipts}
            auditLogs={db.auditLogs || []}
            settings={db.settings}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
            onApprovePayment={handleApprovePayment}
            onRejectPayment={handleRejectPayment}
            onViewReceipt={(r) => setViewingReceipt(r)}
          />
        )}

        {/* PAYMENTS & RECEIPTS */}
        {activeTab === 'receipts' && (
          <ReceiptsList
            receipts={db.receipts}
            settings={db.settings}
            activeYear={activeYear}
            onNewReceipt={() => handleQuickPayment()}
            onViewReceipt={(r) => setViewingReceipt(r)}
            onDeleteReceipt={handleDeleteReceipt}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {/* YEARLY SUMMARY & MEMBER DUES */}
        {activeTab === 'yearly_summary' && (
          <YearlySummary
            members={db.members}
            receipts={db.receipts}
            settings={db.settings}
            activeYear={activeYear}
            onRecordPaymentForMember={(m) => handleQuickPayment(m.id)}
            onViewMemberDetails={(m) => setDetailMember(m)}
          />
        )}

        {/* LOCAL PROGRAM & CLUB EXPENSES */}
        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={db.expenses}
            programs={db.programs || []}
            settings={db.settings}
            activeYear={activeYear}
            onAddExpense={() => handleQuickExpense()}
            onEditExpense={(e) => {
              setExpenseToEdit(e);
              setIsExpenseModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
          />
        )}

        {/* ORGANIZERS & OFFICIAL COMMITTEE */}
        {activeTab === 'organizers' && (
          <OrganizersList
            organizers={db.organizers}
            members={db.members}
            settings={db.settings}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
            onSaveOrganizer={handleSaveOrganizer}
            onDeleteOrganizer={handleDeleteOrganizer}
          />
        )}

        {/* COMPREHENSIVE REPORTS */}
        {activeTab === 'reports' && (
          <Reports
            db={db}
            activeYear={activeYear}
            onViewReceipt={(r) => setViewingReceipt(r)}
          />
        )}

        {/* ADMIN USER MANAGEMENT */}
        {activeTab === 'users' && (
          <UserManagement
            currentUser={currentUser}
            settings={db.settings}
            members={db.members}
            isAdminUnlocked={isSuperAdmin}
            onOpenPinModal={() => setIsPinModalOpen(true)}
            adminPin={verifiedAdminPin}
          />
        )}

        {/* ADMIN SETTINGS */}
        {activeTab === 'settings' && (
          <AdminSettings
            settings={db.settings}
            db={db}
            onSaveSettings={handleSaveSettings}
            onRestoreBackup={handleRestoreBackup}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-300">
            {db.settings.clubName} • {db.settings.villageTown}
          </p>
          <p className="text-[11px] text-slate-500">
            Reg. No: {db.settings.registrationNo} • Authenticated User: {currentUser.fullName} ({currentUser.role})
          </p>
        </div>
      </footer>

      {/* MODALS */}

      {/* Record Payment / Issue Receipt Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPreSelectedMemberId(undefined);
          setPreSelectedProgramId(undefined);
        }}
        members={db.members}
        programs={db.programs || []}
        receipts={db.receipts}
        settings={db.settings}
        activeYear={activeYear}
        isAdminUnlocked={isSuperAdmin}
        onSavePayment={handleSavePayment}
        onReceiptSuccess={(receipt: PaymentReceipt) => {
          setViewingReceipt(receipt);
        }}
        preSelectedMemberId={preSelectedMemberId}
        preSelectedProgramId={preSelectedProgramId}
      />

      {/* Program Add / Edit Modal */}
      <ProgramModal
        isOpen={isProgramModalOpen}
        onClose={() => {
          setIsProgramModalOpen(false);
          setProgramToEdit(null);
        }}
        organizers={db.organizers || []}
        programToEdit={programToEdit}
        settings={db.settings}
        onSaveProgram={handleSaveProgram}
      />

      {/* Program Detail / Summary Modal */}
      <ProgramDetailModal
        program={detailProgram}
        receipts={db.receipts || []}
        expenses={db.expenses || []}
        settings={db.settings}
        onClose={() => setDetailProgram(null)}
        onRecordPayment={() => {
          if (detailProgram) handleQuickPayment(undefined, detailProgram.id);
        }}
        onRecordExpense={() => {
          if (detailProgram) handleQuickExpense(detailProgram.id);
        }}
      />

      {/* Expense Add / Edit Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        programs={db.programs || []}
        settings={db.settings}
        activeYear={activeYear}
        onSaveExpense={handleSaveExpense}
      />

      {/* Add / Edit Member Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        memberToEdit={memberToEdit}
        onSaveMember={handleSaveMember}
      />

      {/* Member Details & History Modal */}
      <MemberDetailModal
        member={detailMember}
        receipts={db.receipts}
        settings={db.settings}
        activeYear={activeYear}
        onClose={() => setDetailMember(null)}
        onRecordPayment={(m) => handleQuickPayment(m.id)}
        onViewReceipt={(r) => setViewingReceipt(r)}
        onOpenIdCard={(m) => {
          setDetailMember(null);
          setIdCardMember(m);
        }}
      />

      {/* Member ID Card Printable Modal */}
      {idCardMember && (
        <MemberIdCard
          member={idCardMember}
          settings={db.settings}
          receipts={db.receipts}
          activeYear={activeYear}
          isOpen={!!idCardMember}
          onClose={() => setIdCardMember(null)}
          onUpdateMemberPhoto={async (memberId, photoUrl) => {
            await handleSaveMember({ id: memberId, photoUrl });
            setIdCardMember(prev => prev ? { ...prev, photoUrl } : null);
          }}
          onViewStatement={(m) => {
            setIdCardMember(null);
            setDetailMember(m);
          }}
        />
      )}

      {/* Receipt View & Print Modal */}
      <ReceiptViewModal
        receipt={viewingReceipt}
        settings={db.settings}
        onClose={() => setViewingReceipt(null)}
      />

      {/* Admin PIN Unlock Modal */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsAdminUnlocked(true);
          setIsPinModalOpen(false);
        }}
        verifyPinFn={handleVerifyPin}
      />
    </div>
  );
}
