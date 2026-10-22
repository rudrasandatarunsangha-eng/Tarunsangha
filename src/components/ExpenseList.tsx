import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, 
  Search, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  Calendar, 
  FileText,
  Building2,
  Edit2,
  Filter,
  DollarSign,
  PieChart,
  ArrowUpDown,
  Tag,
  ShoppingBag,
  X,
  Printer,
  Eye
} from 'lucide-react';
import { Expense, ExpenseCategory, ClubSettings, Program } from '../types/club.ts';
import { exportExpensesCsv } from '../utils/exportTools.ts';
import { ExpenseVoucherModal } from './ExpenseVoucherModal.tsx';

interface ExpenseListProps {
  expenses: Expense[];
  programs?: Program[];
  settings: ClubSettings;
  activeYear: number;
  onAddExpense: () => void;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  programs = [],
  settings,
  activeYear,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  isAdminUnlocked,
  onOpenPinModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState<'all' | 'PROGRAM' | 'LOCAL'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(activeYear);
  const [viewMode, setViewMode] = useState<'vouchers' | 'category_report' | 'program_report'>('vouchers');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isBn = false;

  const getExpenseType = (e: Expense): 'PROGRAM' | 'LOCAL' => {
    if (e.expenseType === 'LOCAL' || e.expenseType === 'Local Expense') return 'LOCAL';
    if (e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense') return 'PROGRAM';
    if (e.programId && e.programId !== 'general') return 'PROGRAM';
    return 'LOCAL';
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        e.voucherNo.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.paidTo.toLowerCase().includes(q) ||
        (e.organizerName && e.organizerName.toLowerCase().includes(q)) ||
        (e.programName && e.programName.toLowerCase().includes(q)) ||
        (e.billRef && e.billRef.toLowerCase().includes(q)) ||
        e.approvedBy.toLowerCase().includes(q);

      const expType = getExpenseType(e);
      const matchesType = selectedExpenseType === 'all' || expType === selectedExpenseType;
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      const matchesProgram = selectedProgramId === 'all' || 
        (selectedProgramId === 'general' ? !e.programId : e.programId === selectedProgramId);
      const matchesYear = selectedYear === 'all' || e.financialYear === selectedYear;

      return matchesSearch && matchesType && matchesCategory && matchesProgram && matchesYear;
    });
  }, [expenses, searchQuery, selectedExpenseType, selectedCategory, selectedProgramId, selectedYear]);

  const totalFilteredExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = (expense: Expense) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setExpenseToDelete(expense);
    setDeleteError('');
  };

  // Category aggregations
  const categoryAggregates = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredExpenses.forEach(e => {
      if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
      map[e.category].total += e.amount;
      map[e.category].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredExpenses]);

  // Program aggregations
  const programAggregates = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number; organizer: string }> = {};
    filteredExpenses.forEach(e => {
      const key = e.programId || 'general';
      const name = e.programName || (e.programId ? e.programId : 'General Club Operations');
      if (!map[key]) {
        map[key] = {
          name,
          total: 0,
          count: 0,
          organizer: e.organizerName || 'General Committee',
        };
      }
      map[key].total += e.amount;
      map[key].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredExpenses]);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-900">Local Program & Club Expense Vouchers</h2>
            <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
              {filteredExpenses.length} Vouchers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Program-wise and category-wise expense ledger for stage, sound, lighting, pandal, and refreshments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportExpensesCsv(expenses)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            title="Download CSV for Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Google Sheets</span>
          </button>

          <button
            onClick={onAddExpense}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense Voucher</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-rose-900 to-rose-950 text-white rounded-2xl p-4 shadow-sm border border-rose-800">
          <span className="text-[11px] text-rose-300 block uppercase tracking-wider font-semibold">
            Total Filtered Outflows
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {settings.currency} {totalFilteredExpense.toLocaleString()}
          </div>
          <span className="text-[11px] text-rose-200 mt-1 block">
            Across {filteredExpenses.length} verified vouchers
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Programs Tracked</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {programAggregates.length} Program Accounts
          </div>
          <span className="text-[11px] text-slate-500">
            {programs.length} total scheduled events in database
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Expense Categories</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {categoryAggregates.length} Active Categories
          </div>
          <span className="text-[11px] text-slate-500">
            Stage, sound, lighting, food, labour & misc
          </span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('vouchers')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            viewMode === 'vouchers'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Expense Vouchers ({filteredExpenses.length})</span>
        </button>

        <button
          onClick={() => setViewMode('category_report')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            viewMode === 'category_report'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Category-wise Report ({categoryAggregates.length})</span>
        </button>

        <button
          onClick={() => setViewMode('program_report')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            viewMode === 'program_report'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Program-wise Report ({programAggregates.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voucher #, title, vendor, program, bill ref..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Expense Type filter */}
          <div>
            <select
              value={selectedExpenseType}
              onChange={(e) => setSelectedExpenseType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Types (Program & Local)</option>
              <option value="PROGRAM">Program Expenses Only</option>
              <option value="LOCAL">Local Operating Only</option>
            </select>
          </div>

          {/* Program filter */}
          <div>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Programs & Operating</option>
              <option value="general">General Operating Only</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Expense Categories</option>
              <optgroup label="Program Categories">
                <option value="Stage and Pandal">Stage and Pandal</option>
                <option value="Sound System">Sound System</option>
                <option value="Light and Electricity">Light and Electricity</option>
                <option value="Artist / Cultural Troupe Fees">Artist / Cultural Fees</option>
                <option value="Food and Refreshments">Food and Refreshments</option>
                <option value="Prizes and Mementos">Prizes and Mementos</option>
                <option value="Printing and Banners">Printing and Banners</option>
                <option value="Volunteer and Labour">Volunteer and Labour</option>
                <option value="Transportation">Transportation</option>
                <option value="Hall / Ground Rent">Hall / Ground Rent</option>
                <option value="Other Program Expenses">Other Program Expenses</option>
              </optgroup>
              <optgroup label="Local Categories">
                <option value="Mudikhana / Grocery">Mudikhana / Grocery</option>
                <option value="Electricity">Electricity</option>
                <option value="Labour">Labour</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Office Expenses">Office Expenses</option>
                <option value="Maintenance and Repair">Maintenance and Repair</option>
                <option value="Other Expenses">Other Expenses</option>
              </optgroup>
            </select>
          </div>

          {/* Financial Year filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Financial Years</option>
              {(settings.financialYears && settings.financialYears.length > 0 ? settings.financialYears : [2024, 2025]).map(yr => (
                <option key={yr} value={yr}>
                  FY {yr - 1}-{yr} ({yr})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW: CATEGORY-WISE REPORT */}
      {viewMode === 'category_report' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-rose-600" />
            <span>Category-wise Expenditure Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categoryAggregates.map(([cat, info]) => {
              const pct = totalFilteredExpense > 0 ? ((info.total / totalFilteredExpense) * 100).toFixed(1) : '0';
              return (
                <div key={cat} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{cat}</span>
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                        {pct}%
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-1">
                      {info.count} voucher{info.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-lg font-black text-rose-700 mt-3">
                    {settings.currency} {info.total.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: PROGRAM-WISE REPORT */}
      {viewMode === 'program_report' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-rose-600" />
            <span>Program-wise Expenditure Ledger</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {programAggregates.map(([progKey, info]) => {
              const pct = totalFilteredExpense > 0 ? ((info.total / totalFilteredExpense) * 100).toFixed(1) : '0';
              return (
                <div key={progKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-rose-700 font-bold">
                        {progKey === 'general' ? 'GENERAL' : progKey}
                      </span>
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                        {pct}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-1">{info.name}</div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Organizer: {info.organizer} • {info.count} voucher{info.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-lg font-black text-rose-700 mt-3">
                    {settings.currency} {info.total.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: MAIN VOUCHERS TABLE */}
      {viewMode === 'vouchers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <TrendingDown className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">No expense vouchers match your filters</p>
              <p className="text-xs text-slate-400 mt-1">Click '+ Add Expense Voucher' to record an expenditure.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Voucher No & Date</th>
                    <th className="py-3 px-4">Program / Event</th>
                    <th className="py-3 px-4">Description & Category</th>
                    <th className="py-3 px-4">Paid To / Vendor</th>
                    <th className="py-3 px-4">Entered / Approved By</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Voucher No & Date & Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-rose-700">{e.voucherNo}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{e.date} (FY {e.financialYear})</div>
                        <div className="mt-1">
                          {getExpenseType(e) === 'PROGRAM' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              <span>Program Expense</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShoppingBag className="w-3 h-3 text-emerald-600" />
                              <span>Local Expense</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Linked Program */}
                      <td className="py-3.5 px-4">
                        {getExpenseType(e) === 'PROGRAM' && e.programId ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{e.programName || e.programId}</span>
                            <span className="text-[11px] text-slate-500">
                              Org: {e.organizerName || 'Assigned'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-emerald-900 text-xs block">General Club Operating</span>
                            <span className="text-[11px] text-slate-400 italic">No Program Linkage</span>
                          </div>
                        )}
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{e.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5 font-semibold">
                            {e.category}
                          </span>
                          {e.billRef && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              Ref: {e.billRef}
                            </span>
                          )}
                          {e.remarks && <div className="italic text-slate-400 text-[10px] mt-0.5">{e.remarks}</div>}
                        </div>
                      </td>

                      {/* Paid To */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{e.paidTo || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">{e.paymentMode}</div>
                      </td>

                      {/* Entered By / Approved By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">Appr: {e.approvedBy || settings.secretaryName}</div>
                        <div className="text-[11px] text-slate-400">By: {e.enteredBy || 'Treasurer'}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-base text-rose-600">
                          -{settings.currency}{e.amount.toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setSelectedVoucherForPrint(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={isBn ? "ভাউচার প্রিন্ট / দেখুন" : "View & Print Official Voucher"}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {onEditExpense && (
                            <button
                              onClick={() => onEditExpense(e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit Expense Voucher"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Voucher (Admin Protected)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Delete Expense Voucher</h3>
              </div>
              <button
                onClick={() => setExpenseToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to permanently delete this expense voucher?</p>
              <p>Voucher: <strong>{expenseToDelete.voucherNo}</strong></p>
              <p>Description: {expenseToDelete.title}</p>
              <p>Amount: <strong>{settings.currency} {expenseToDelete.amount.toLocaleString()}</strong></p>
              <p>Paid To: {expenseToDelete.paidTo}</p>
              <p className="text-[11px] text-rose-700 mt-2 font-medium">
                This transaction deletion will be permanently logged in administrative audit history.
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteExpense(expenseToDelete.id);
                    setExpenseToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete expense voucher');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Voucher View & Print Modal */}
      {selectedVoucherForPrint && (
        <ExpenseVoucherModal
          expense={selectedVoucherForPrint}
          settings={settings}
          onClose={() => setSelectedVoucherForPrint(null)}
        />
      )}
    </div>
  );
};
