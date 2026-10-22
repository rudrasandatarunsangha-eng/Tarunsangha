import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  TrendingDown, 
  Save, 
  AlertCircle, 
  Building2, 
  Layers, 
  ShoppingBag,
  History,
  FileText
} from 'lucide-react';
import { Expense, PaymentMode, ClubSettings, Program } from '../types/club.ts';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClubSettings;
  activeYear: number;
  programs?: Program[];
  expenses?: Expense[];
  preSelectedProgramId?: string;
  expenseToEdit?: Expense | null;
  onSaveExpense: (expenseData: Partial<Expense>) => Promise<void>;
}

// 11 Program Expense categories specified in requirements
export const PROGRAM_EXPENSE_CATEGORIES: string[] = [
  'Stage and Pandal',
  'Sound System',
  'Light and Electricity',
  'Artist / Cultural Troupe Fees',
  'Food and Refreshments',
  'Prizes and Mementos',
  'Printing and Banners',
  'Volunteer and Labour',
  'Transportation',
  'Hall / Ground Rent',
  'Other Program Expenses',
];

// 12 Local Expense categories specified in requirements
export const DEFAULT_LOCAL_EXPENSE_CATEGORIES: string[] = [
  'Mudikhana / Grocery',
  'Electricity',
  'Labour',
  'Stage and Pandal',
  'Sound System',
  'Transport',
  'Decoration',
  'Food and Refreshments',
  'Cleaning',
  'Office Expenses',
  'Maintenance and Repair',
  'Other Expenses',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  settings,
  activeYear,
  programs = [],
  expenses = [],
  preSelectedProgramId,
  expenseToEdit,
  onSaveExpense,
}) => {
  // Authoritative single state variable for Expense Type: 'PROGRAM' | 'LOCAL'
  const [expenseType, setExpenseType] = useState<'PROGRAM' | 'LOCAL'>('PROGRAM');
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(preSelectedProgramId || '');
  const [organizerName, setOrganizerName] = useState<string>('');
  const [paidTo, setPaidTo] = useState('');
  const [enteredBy, setEnteredBy] = useState(settings.treasurerName || 'Treasurer');
  const [approvedBy, setApprovedBy] = useState(settings.secretaryName || 'Secretary');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'CANCELLED'>('PAID');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [financialYear, setFinancialYear] = useState<number>(activeYear);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billRef, setBillRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Ref to track modal session and prevent unwanted automatic form resets
  const initializedKeyRef = useRef<string | null>(null);

  // Keep latest references for initialization without re-triggering effects
  const programsRef = useRef(programs);
  programsRef.current = programs;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeYearRef = useRef(activeYear);
  activeYearRef.current = activeYear;

  // Active category list based on expenseType and settings
  const availableCategories = useMemo(() => {
    if (expenseType === 'LOCAL') {
      const customList = settings.customLocalExpenseCategories && settings.customLocalExpenseCategories.length > 0
        ? settings.customLocalExpenseCategories
        : DEFAULT_LOCAL_EXPENSE_CATEGORIES;
      return customList;
    }
    return PROGRAM_EXPENSE_CATEGORIES;
  }, [expenseType, settings.customLocalExpenseCategories]);

  // Program-wise totals and history for the selected program (ONLY when Program Expense)
  const selectedProgramDetails = useMemo(() => {
    if (expenseType !== 'PROGRAM' || !selectedProgramId) return null;
    const prog = programs.find(p => p.id === selectedProgramId);
    if (!prog) return null;

    const programExpenses = expenses.filter(e => e.programId === prog.id);
    const totalSpent = programExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      program: prog,
      totalSpent,
      expenseCount: programExpenses.length,
      history: programExpenses.slice(0, 5),
    };
  }, [expenseType, selectedProgramId, programs, expenses]);

  // STABLE INITIALIZATION: only runs when modal opens or target edit ID changes
  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null;
      return;
    }

    const currentKey = expenseToEdit ? `edit_${expenseToEdit.id}` : `new_${preSelectedProgramId || 'default'}`;
    if (initializedKeyRef.current === currentKey) {
      // Already initialized for this open session; do NOT reset or overwrite user typing!
      return;
    }
    initializedKeyRef.current = currentKey;

    const currentSettings = settingsRef.current;
    const currentPrograms = programsRef.current;
    const currentYearVal = activeYearRef.current;

    if (expenseToEdit) {
      // Determine if existing record is PROGRAM or LOCAL
      const rawType = expenseToEdit.expenseType;
      const isLocal = rawType === 'LOCAL' || rawType === 'Local Expense' || 
        (!expenseToEdit.programId && expenseToEdit.programName === 'General Club Operating Expense (No Program)');
      const resolvedType: 'PROGRAM' | 'LOCAL' = isLocal ? 'LOCAL' : 'PROGRAM';

      setExpenseType(resolvedType);
      setTitle(expenseToEdit.title || '');
      setAmount(expenseToEdit.amount || '');
      setSelectedProgramId(resolvedType === 'PROGRAM' ? (expenseToEdit.programId || '') : '');
      setOrganizerName(expenseToEdit.organizerName || (resolvedType === 'LOCAL' ? 'General Club Committee' : ''));
      setPaidTo(expenseToEdit.paidTo || '');
      setEnteredBy(expenseToEdit.enteredBy || currentSettings.treasurerName || 'Treasurer');
      setApprovedBy(expenseToEdit.approvedBy || currentSettings.secretaryName || 'Secretary');
      setPaymentMode(expenseToEdit.paymentMode || 'Cash');
      setPaymentStatus(expenseToEdit.paymentStatus || 'PAID');
      setPaidAmount(expenseToEdit.paidAmount !== undefined ? expenseToEdit.paidAmount : (expenseToEdit.amount || ''));
      setFinancialYear(expenseToEdit.financialYear || currentYearVal);
      setDate(expenseToEdit.date || new Date().toISOString().split('T')[0]);
      setBillRef(expenseToEdit.billRef || '');
      setRemarks(expenseToEdit.remarks || '');

      const currentCats = resolvedType === 'LOCAL'
        ? (currentSettings.customLocalExpenseCategories && currentSettings.customLocalExpenseCategories.length > 0 
            ? currentSettings.customLocalExpenseCategories 
            : DEFAULT_LOCAL_EXPENSE_CATEGORIES)
        : PROGRAM_EXPENSE_CATEGORIES;

      if (currentCats.includes(expenseToEdit.category)) {
        setSelectedCategory(expenseToEdit.category);
        setCustomCategory('');
      } else {
        setSelectedCategory('__CUSTOM__');
        setCustomCategory(expenseToEdit.category);
      }
    } else {
      // New Expense creation: Default to PROGRAM
      const initProgId = preSelectedProgramId || '';
      const resolvedType: 'PROGRAM' | 'LOCAL' = 'PROGRAM';
      setExpenseType(resolvedType);
      setTitle('');
      setAmount('');
      setSelectedProgramId(initProgId);

      if (initProgId) {
        const found = currentPrograms.find(p => p.id === initProgId);
        setOrganizerName(found ? (found.organizerName || '') : '');
      } else if (currentPrograms.length > 0) {
        setSelectedProgramId(currentPrograms[0].id);
        setOrganizerName(currentPrograms[0].organizerName || '');
      } else {
        setOrganizerName('');
      }

      setSelectedCategory(PROGRAM_EXPENSE_CATEGORIES[0] || 'Stage and Pandal');
      setCustomCategory('');
      setPaidTo('');
      setEnteredBy(currentSettings.treasurerName || 'Treasurer');
      setApprovedBy(currentSettings.secretaryName || 'Secretary');
      setPaymentMode('Cash');
      setPaymentStatus('PAID');
      setPaidAmount('');
      setFinancialYear(currentYearVal);
      setDate(new Date().toISOString().split('T')[0]);
      setBillRef('');
      setRemarks('');
    }
    setError('');
  }, [isOpen, expenseToEdit, preSelectedProgramId]);

  // Authoritative Expense Type switcher - invoked only by explicit user click or dropdown selection
  const handleExpenseTypeChange = (newType: 'PROGRAM' | 'LOCAL') => {
    setExpenseType(newType);
    setError('');

    const targetCats = newType === 'LOCAL'
      ? (settings.customLocalExpenseCategories && settings.customLocalExpenseCategories.length > 0
          ? settings.customLocalExpenseCategories
          : DEFAULT_LOCAL_EXPENSE_CATEGORIES)
      : PROGRAM_EXPENSE_CATEGORIES;

    // Adjust selected category only if current category does not exist in target list
    if (!targetCats.includes(selectedCategory) && selectedCategory !== '__CUSTOM__') {
      setSelectedCategory(targetCats[0] || (newType === 'LOCAL' ? 'Mudikhana / Grocery' : 'Stage and Pandal'));
    }

    if (newType === 'LOCAL') {
      setSelectedProgramId('');
      if (!organizerName.trim() || organizerName === (programs.find(p => p.id === selectedProgramId)?.organizerName)) {
        setOrganizerName('General Club Committee');
      }
    } else {
      // PROGRAM requires selection of an existing program
      if (!selectedProgramId && programs.length > 0) {
        setSelectedProgramId(programs[0].id);
        setOrganizerName(programs[0].organizerName || '');
      }
    }
  };

  // Program selection change (does NOT touch expenseType)
  const handleProgramChange = (progId: string) => {
    setSelectedProgramId(progId);
    if (!progId) {
      setOrganizerName('');
    } else {
      const prog = programs.find(p => p.id === progId);
      if (prog) {
        setOrganizerName(prog.organizerName || '');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Expense description / purpose is mandatory.');
      return;
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    if (!paidTo.trim()) {
      setError('Vendor or payee person name is required.');
      return;
    }

    // Program Expense requires selection of an existing program
    if (expenseType === 'PROGRAM') {
      if (!selectedProgramId) {
        setError('Program Expense requires selection of an existing saved Program / Event.');
        return;
      }
      const progExists = programs.some(p => p.id === selectedProgramId);
      if (!progExists) {
        setError('Selected program does not exist. Please choose an existing program.');
        return;
      }
    }

    const finalCategory = selectedCategory === '__CUSTOM__' 
      ? (customCategory.trim() || 'Other Expenses')
      : selectedCategory;

    const matchedProgram = expenseType === 'PROGRAM' 
      ? programs.find(p => p.id === selectedProgramId) 
      : undefined;

    setIsSubmitting(true);
    try {
      await onSaveExpense({
        id: expenseToEdit?.id,
        // Authoritative expenseType persisted as 'PROGRAM' | 'LOCAL'
        expenseType,
        programId: expenseType === 'PROGRAM' ? selectedProgramId : undefined,
        programName: expenseType === 'PROGRAM' 
          ? (matchedProgram ? matchedProgram.name : undefined)
          : 'General Club Operating Expense (No Program)',
        organizerName: expenseType === 'PROGRAM' 
          ? (organizerName.trim() || (matchedProgram ? matchedProgram.organizerName : 'General Club Committee'))
          : (organizerName.trim() || 'General Club Committee'),
        title: title.trim(),
        amount: Number(amount),
        category: finalCategory,
        paidTo: paidTo.trim(),
        enteredBy: enteredBy.trim(),
        approvedBy: approvedBy.trim(),
        paymentMode,
        paymentStatus,
        paidAmount: paymentStatus === 'PARTIALLY_PAID' && paidAmount !== '' ? Number(paidAmount) : Number(amount),
        financialYear: Number(financialYear),
        date,
        billRef: billRef.trim(),
        remarks: remarks.trim(),
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense voucher');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-rose-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <TrendingDown className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {expenseToEdit ? 'Edit Expense Voucher' : 'Record Program Local Expense'}
              </h3>
              <p className="text-xs text-rose-200">
                Official debit voucher linked to club events or local operating accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: MANDATORY EXPENSE TYPE SELECTION DROPDOWN     */}
          {/* ======================================================== */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="expense-type-select" 
                className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5"
              >
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Expense Type (Mandatory) *</span>
              </label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 font-bold">
                {expenseType === 'PROGRAM' ? 'Event Budget Debit' : 'General Operating Overhead'}
              </span>
            </div>

            {/* Mandatory Dropdown */}
            <div>
              <select
                id="expense-type-select"
                value={expenseType}
                onChange={(e) => handleExpenseTypeChange(e.target.value as 'PROGRAM' | 'LOCAL')}
                className="w-full bg-slate-800 border-2 border-rose-500/80 text-white font-bold rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
              >
                <option value="PROGRAM">Program Expense</option>
                <option value="LOCAL">Local Expense</option>
              </select>
            </div>

            {/* Quick Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleExpenseTypeChange('PROGRAM')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                  expenseType === 'PROGRAM'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-2 ring-rose-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Program Expense</span>
              </button>

              <button
                type="button"
                onClick={() => handleExpenseTypeChange('LOCAL')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                  expenseType === 'LOCAL'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-2 ring-rose-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Local Expense</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              {expenseType === 'PROGRAM'
                ? 'Links this voucher directly to an existing festival, tournament, or cultural program.'
                : 'General club operating expense (No program linkage required: electricity, groceries, repairs).'}
            </p>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: PROGRAM EXPENSE CONDITIONAL FIELDS            */}
          {/* ======================================================== */}
          {expenseType === 'PROGRAM' && (
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-indigo-950 text-xs flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Linked Program / Event (Required) *</span>
                </label>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded-full">
                  {programs.length} Events Available
                </span>
              </div>

              {programs.length === 0 ? (
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold">
                  No programs found in records. Please register a Program under "Programs & Events" tab first, or record as a Local Expense.
                </div>
              ) : (
                <select
                  required
                  value={selectedProgramId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs sm:text-sm"
                >
                  <option value="">-- Choose an Existing Program / Event * --</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} • {p.name} ({p.programDate}) — {p.organizerName}
                    </option>
                  ))}
                </select>
              )}

              {/* Program-wise totals and history */}
              {selectedProgramDetails && (
                <div className="p-3 bg-white rounded-xl border border-indigo-100 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-50">
                    <span className="text-slate-500">Program Contract Budget:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{selectedProgramDetails.program.totalContractAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-50">
                    <span className="text-slate-500">Total Expenses Recorded So Far:</span>
                    <span className="font-mono font-black text-rose-600">
                      ₹{selectedProgramDetails.totalSpent.toLocaleString('en-IN')} ({selectedProgramDetails.expenseCount} vouchers)
                    </span>
                  </div>

                  {selectedProgramDetails.history.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-600 mb-1">
                        <History className="w-3 h-3 text-indigo-500" />
                        <span>Recent Program Vouchers:</span>
                      </div>
                      <div className="space-y-1">
                        {selectedProgramDetails.history.map(h => (
                          <div key={h.id} className="flex justify-between text-[11px] text-slate-600">
                            <span className="truncate max-w-[240px]">• {h.voucherNo}: {h.title}</span>
                            <span className="font-mono font-bold text-slate-900">₹{h.amount.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Organizer Name Field */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Organizer / Responsible Committee
                </label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="Organizer Name or Committee"
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: LOCAL EXPENSE CONDITIONAL FIELDS              */}
          {/* ======================================================== */}
          {expenseType === 'LOCAL' && (
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-emerald-950 text-xs flex items-center space-x-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>Linked Program</span>
                </label>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  General Club Expense
                </span>
              </div>
              <input
                type="text"
                disabled
                value="General Club Operating Expense (No Program)"
                className="w-full bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold cursor-not-allowed"
              />
              <p className="text-[11px] text-emerald-800">
                Operating club bills are not tied to any event contract and settle against general club operating reserves.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Organizer / Committee Responsible
                </label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="General Club Committee"
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Description / Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expense Description / Purpose *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={expenseType === 'LOCAL' 
                ? "e.g. Monthly club room electricity bill & repair of ceiling fan"
                : "e.g. Stage wooden framework, carpet hire & floral gate"}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {expenseType === 'LOCAL' ? 'Local Expense Category *' : 'Program Expense Category *'}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-xs sm:text-sm"
              >
                {availableCategories.map((cat, idx) => (
                  <option key={cat} value={cat}>
                    {expenseType === 'LOCAL' ? `${idx + 1}. ${cat}` : `${idx + 1}. ${cat}`}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Custom Expense Category...</option>
              </select>

              {selectedCategory === '__CUSTOM__' && (
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name..."
                  className="mt-2 w-full bg-white border border-rose-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount ({settings.currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-400">
                  {settings.currency}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 3500"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Paid To & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid To (Vendor / Person) *</label>
              <input
                type="text"
                required
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="e.g. Dutta Grocery Store / West Bengal State Electricity"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="UPI / GPay / PhonePe">UPI / PhonePe / GPay</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Payment Status & Paid Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              >
                <option value="PAID">PAID (Full Settlement)</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="PENDING">PENDING (Unpaid / Credit Memo)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Amount Paid So Far ({settings.currency})
              </label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                disabled={paymentStatus === 'PAID'}
                onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={paymentStatus === 'PAID' ? 'Full amount settled' : 'Amount paid'}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {/* Date, Financial Year & Bill Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Financial Year</label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              >
                {(settings.financialYears && settings.financialYears.length > 0 ? settings.financialYears : [2024, 2025]).map(yr => (
                  <option key={yr} value={yr}>
                    FY {yr - 1}-{yr} ({yr})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bill / Receipt Ref</label>
              <input
                type="text"
                value={billRef}
                onChange={(e) => setBillRef(e.target.value)}
                placeholder="e.g. BILL-99201"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Entered By & Approved By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entered By</label>
              <input
                type="text"
                value={enteredBy}
                onChange={(e) => setEnteredBy(e.target.value)}
                placeholder="Accountant / Treasurer name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Approved By</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Secretary / President name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks & Details</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Original physical merchant cash memo filed in club ledger"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : expenseToEdit ? 'Update Expense Voucher' : 'Save Expense Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
