import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale, 
  PieChart, 
  Download,
  Building2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Wallet,
  Receipt as ReceiptIcon,
  User,
  Eye,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  Tag,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { ClubDatabase, ClubSettings, Program, PaymentReceipt } from '../types/club.ts';
import { 
  exportReceiptsCsv, 
  exportExpensesCsv, 
  exportMembersCsv, 
  exportDayWiseCollectionCsv, 
  exportMemberLedgerCsv,
  exportCustomerSelectionsCsv,
  exportFullMembersPaymentHistoryAuditCsv,
  exportMembersPaymentAuditSummaryCsv,
  DayCollectionRow 
} from '../utils/exportTools.ts';

interface ReportsProps {
  db: ClubDatabase;
  activeYear: number;
  onViewReceipt?: (receipt: PaymentReceipt) => void;
}

export const Reports: React.FC<ReportsProps> = ({ db, activeYear, onViewReceipt }) => {
  const isBn = false;

  const { receipts, expenses, members, programs = [], settings } = db;
  const availableYears = settings.financialYears && settings.financialYears.length > 0
    ? settings.financialYears
    : [2024, 2025];

  const [reportYear, setReportYear] = useState<number>(activeYear);
  const [activeReportTab, setActiveReportTab] = useState<
    'agm_statement' | 'day_wise_collection' | 'expense_analysis' | 'program_pnl' | 'customer_selections' | 'member_ledgers'
  >('day_wise_collection');
  const [selectedLedgerMemberId, setSelectedLedgerMemberId] = useState<string>(members[0]?.id || '');

  // Expense Analysis Filter States
  const [expenseReportYear, setExpenseReportYear] = useState<number | 'all'>(activeYear);
  const [expenseReportType, setExpenseReportType] = useState<'all' | 'PROGRAM' | 'LOCAL'>('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'CANCELLED'>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseSubView, setExpenseSubView] = useState<'overview' | 'category' | 'program' | 'daily_monthly' | 'vendor' | 'year_wise'>('overview');

  // Day-wise collection filters
  const [dayWiseYear, setDayWiseYear] = useState<number | 'all'>(activeYear);
  const [datePeriod, setDatePeriod] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'APPROVED' | 'all'>('APPROVED');
  const [dayWiseSearch, setDayWiseSearch] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Toggle expand/collapse day receipts
  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const expandAllDates = () => {
    const next: Record<string, boolean> = {};
    dayWiseGroups.forEach(g => { next[g.date] = true; });
    setExpandedDates(next);
  };

  const collapseAllDates = () => {
    setExpandedDates({});
  };

  // Distinct collectors list
  const allCollectors = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach(r => {
      if (r.collectorName && r.collectorName.trim()) set.add(r.collectorName.trim());
      if (r.submittedBy && r.submittedBy.trim()) set.add(r.submittedBy.trim());
    });
    return Array.from(set).sort();
  }, [receipts]);

  // Distinct payment modes
  const allPaymentModes = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach(r => {
      if (r.paymentMode) set.add(r.paymentMode);
    });
    return Array.from(set);
  }, [receipts]);

  // Filter receipts for day-wise report
  const filteredDayWiseReceipts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const currentMonthPrefix = today.substring(0, 7);

    return receipts.filter(r => {
      // Financial Year filter
      if (dayWiseYear !== 'all' && r.financialYear !== dayWiseYear) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter === 'APPROVED' && r.status !== 'APPROVED') {
        return false;
      }

      // Collector filter
      if (selectedCollector !== 'all') {
        const matchesCollector = 
          (r.collectorName && r.collectorName.trim() === selectedCollector) ||
          (r.submittedBy && r.submittedBy.trim() === selectedCollector);
        if (!matchesCollector) return false;
      }

      // Payment Mode filter
      if (selectedPaymentMode !== 'all' && r.paymentMode !== selectedPaymentMode) {
        return false;
      }

      // Date range filter
      const receiptDate = r.date;
      if (datePeriod === 'today') {
        if (receiptDate !== today) return false;
      } else if (datePeriod === 'yesterday') {
        if (receiptDate !== yesterday) return false;
      } else if (datePeriod === 'last7') {
        if (receiptDate < sevenDaysAgo || receiptDate > today) return false;
      } else if (datePeriod === 'thisMonth') {
        if (!receiptDate.startsWith(currentMonthPrefix)) return false;
      } else if (datePeriod === 'custom') {
        if (customStartDate && receiptDate < customStartDate) return false;
        if (customEndDate && receiptDate > customEndDate) return false;
      }

      // Search Query filter
      if (dayWiseSearch.trim()) {
        const q = dayWiseSearch.toLowerCase().trim();
        const matches = 
          r.receiptNo.toLowerCase().includes(q) ||
          r.memberName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          (r.villageWard && r.villageWard.toLowerCase().includes(q)) ||
          r.purpose.toLowerCase().includes(q) ||
          (r.transactionRef && r.transactionRef.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [
    receipts, 
    dayWiseYear, 
    selectedStatusFilter, 
    selectedCollector, 
    selectedPaymentMode, 
    datePeriod, 
    customStartDate, 
    customEndDate, 
    dayWiseSearch
  ]);

  // Group receipts by day
  const dayWiseGroups = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dayOfWeek: string;
      formattedDate: string;
      receipts: PaymentReceipt[];
      receiptCount: number;
      cashAmount: number;
      digitalAmount: number;
      bankAmount: number;
      totalAmount: number;
      collectors: string[];
      purposes: string[];
    }>();

    filteredDayWiseReceipts.forEach(r => {
      const d = r.date || 'Unknown Date';
      if (!map.has(d)) {
        let dayOfWeek = '';
        let formattedDate = d;
        try {
          const dt = new Date(d);
          if (!isNaN(dt.getTime())) {
            dayOfWeek = dt.toLocaleDateString('en-IN', { weekday: 'long' });
            formattedDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        } catch {
          // ignore parsing error
        }

        map.set(d, {
          date: d,
          dayOfWeek,
          formattedDate,
          receipts: [],
          receiptCount: 0,
          cashAmount: 0,
          digitalAmount: 0,
          bankAmount: 0,
          totalAmount: 0,
          collectors: [],
          purposes: [],
        });
      }

      const item = map.get(d)!;
      item.receipts.push(r);
      item.receiptCount += 1;

      const amt = r.paymentType === 'Refund' ? -r.amount : r.amount;
      if (r.paymentMode === 'Cash') {
        item.cashAmount += amt;
      } else if (r.paymentMode === 'UPI / GPay / PhonePe') {
        item.digitalAmount += amt;
      } else {
        item.bankAmount += amt;
      }
      item.totalAmount += amt;

      const coll = r.collectorName || r.submittedBy;
      if (coll && !item.collectors.includes(coll)) {
        item.collectors.push(coll);
      }
      if (r.purpose && !item.purposes.includes(r.purpose)) {
        item.purposes.push(r.purpose);
      }
    });

    // Sort descending by date (newest first)
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredDayWiseReceipts]);

  // Overall Statistics for Day-Wise Report
  const dayWiseStats = useMemo(() => {
    let totalCollected = 0;
    let totalCash = 0;
    let totalDigital = 0;
    let totalBank = 0;
    let peakDay = { date: 'None', amount: 0, dayOfWeek: '' };

    dayWiseGroups.forEach(g => {
      totalCollected += g.totalAmount;
      totalCash += g.cashAmount;
      totalDigital += g.digitalAmount;
      totalBank += g.bankAmount;
      if (g.totalAmount > peakDay.amount) {
        peakDay = { date: g.formattedDate, amount: g.totalAmount, dayOfWeek: g.dayOfWeek };
      }
    });

    const activeDaysCount = dayWiseGroups.length;
    const avgPerDay = activeDaysCount > 0 ? Math.round(totalCollected / activeDaysCount) : 0;

    return {
      totalCollected,
      totalCash,
      totalDigital,
      totalBank,
      totalReceipts: filteredDayWiseReceipts.length,
      activeDaysCount,
      avgPerDay,
      peakDay,
    };
  }, [dayWiseGroups, filteredDayWiseReceipts]);

  // Export Day-Wise Collection CSV
  const handleExportDayWiseCsv = () => {
    const rows: DayCollectionRow[] = dayWiseGroups.map(g => ({
      date: g.formattedDate,
      dayOfWeek: g.dayOfWeek,
      receiptCount: g.receiptCount,
      cashAmount: g.cashAmount,
      digitalAmount: g.digitalAmount,
      bankAmount: g.bankAmount,
      totalAmount: g.totalAmount,
      collectors: g.collectors.join('; '),
      purposes: g.purposes.join('; '),
    }));
    exportDayWiseCollectionCsv(rows, dayWiseYear === 'all' ? 'All_Years' : `FY_${dayWiseYear}`);
  };

  // --- EXISTING AGM FINANCIAL SUMMARY COMPUTATIONS ---
  const approvedReceipts = receipts.filter(r => r.status === 'APPROVED');
  const pendingReceipts = receipts.filter(r => r.status === 'PENDING_APPROVAL');

  const yearApprovedReceipts = approvedReceipts.filter(r => r.financialYear === reportYear);
  const yearExpenses = expenses.filter(e => e.financialYear === reportYear);

  const calcNetReceived = (list: typeof receipts) => {
    return list.reduce((sum, r) => r.paymentType === 'Refund' ? sum - r.amount : sum + r.amount, 0);
  };

  const clubFees = calcNetReceived(
    yearApprovedReceipts.filter(r => r.purpose === 'Annual Club Membership Fee')
  );

  const villageFees = calcNetReceived(
    yearApprovedReceipts.filter(r => r.purpose === 'Annual Village Contribution')
  );

  const programReceipts = calcNetReceived(
    yearApprovedReceipts.filter(r => Boolean(r.programId) || r.payerType === 'organizer')
  );

  const otherDonations = Math.max(
    0,
    calcNetReceived(yearApprovedReceipts) - (clubFees + villageFees + programReceipts)
  );

  const totalIncome = calcNetReceived(yearApprovedReceipts);
  const totalPendingIncome = pendingReceipts
    .filter(r => r.financialYear === reportYear)
    .reduce((s, r) => s + r.amount, 0);

  const isProgramExpense = (e: typeof expenses[0]) => {
    return e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
  };

  const yearProgramExpenses = yearExpenses.filter(isProgramExpense);
  const yearLocalExpenses = yearExpenses.filter(e => !isProgramExpense(e));

  const totalProgramExpense = yearProgramExpenses.reduce((s, e) => s + e.amount, 0);
  const totalLocalExpense = yearLocalExpenses.reduce((s, e) => s + e.amount, 0);

  const programExpenseByHead: Record<string, number> = {};
  yearProgramExpenses.forEach(e => {
    programExpenseByHead[e.category] = (programExpenseByHead[e.category] || 0) + e.amount;
  });

  const localExpenseByHead: Record<string, number> = {};
  yearLocalExpenses.forEach(e => {
    localExpenseByHead[e.category] = (localExpenseByHead[e.category] || 0) + e.amount;
  });

  const totalExpense = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const netSurplus = totalIncome - totalExpense;

  const lifetimeTotalIncome = calcNetReceived(approvedReceipts);
  const lifetimeTotalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const lifetimeNetReserve = lifetimeTotalIncome - lifetimeTotalExpense;

  // Program summaries
  const programSummaries = programs.map((prog) => {
    const progPayments = receipts.filter(r => r.programId === prog.id);
    const progExpenses = expenses.filter(e => e.programId === prog.id);

    const approvedProgPayments = progPayments.filter(r => r.status === 'APPROVED');
    const pendingProgPayments = progPayments.filter(r => r.status === 'PENDING_APPROVAL');
    const rejectedProgPayments = progPayments.filter(r => r.status === 'REJECTED');

    const totalApprovedReceived = calcNetReceived(approvedProgPayments);
    const totalAdvanceAmount = approvedProgPayments
      .filter(r => r.paymentType === 'Advance')
      .reduce((s, r) => s + r.amount, 0);
    const totalSubsequentPayments = Math.max(0, totalApprovedReceived - totalAdvanceAmount);
    const totalPendingApproval = pendingProgPayments.reduce((s, r) => s + r.amount, 0);
    const totalRejected = rejectedProgPayments.reduce((s, r) => s + r.amount, 0);
    const totalRefunds = approvedProgPayments
      .filter(r => r.paymentType === 'Refund')
      .reduce((s, r) => s + r.amount, 0);

    const remainingBalanceDue = Math.max(0, prog.totalContractAmount - totalApprovedReceived);
    const totalLocalExpenses = progExpenses.reduce((s, e) => s + e.amount, 0);

    const expectedProfit = prog.totalContractAmount - totalLocalExpenses;
    const actualProfit = totalApprovedReceived - totalLocalExpenses;

    let paymentStatus: 'FULLY RECEIVED' | 'PARTIALLY RECEIVED' | 'PAYMENT PENDING' | 'OVERPAYMENT' = 'PAYMENT PENDING';
    if (totalApprovedReceived > prog.totalContractAmount && prog.totalContractAmount > 0) {
      paymentStatus = 'OVERPAYMENT';
    } else if (totalApprovedReceived === prog.totalContractAmount && prog.totalContractAmount > 0) {
      paymentStatus = 'FULLY RECEIVED';
    } else if (totalApprovedReceived > 0) {
      paymentStatus = 'PARTIALLY RECEIVED';
    }

    return {
      program: prog,
      totalContractAmount: prog.totalContractAmount,
      totalAdvanceAmount,
      totalSubsequentPayments,
      totalApprovedReceived,
      totalPendingApproval,
      totalRejected,
      totalRefunds,
      remainingBalanceDue,
      paymentStatus,
      totalLocalExpenses,
      expectedProfit,
      actualProfit,
      paymentsCount: progPayments.length,
      expensesCount: progExpenses.length,
    };
  });

  // --- COMPREHENSIVE EXPENSE ANALYTICS & AUDIT COMPUTATIONS ---
  const expenseAnalytics = useMemo(() => {
    // 1. Filtered expenses
    const filtered = expenses.filter(e => {
      // Year filter
      if (expenseReportYear !== 'all' && e.financialYear !== expenseReportYear) {
        return false;
      }
      // Type filter
      const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
      if (expenseReportType === 'PROGRAM' && !isProg) return false;
      if (expenseReportType === 'LOCAL' && isProg) return false;

      // Status filter
      const status = e.paymentStatus || 'PAID';
      if (expenseStatusFilter !== 'all' && status !== expenseStatusFilter) return false;

      // Search
      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase().trim();
        const matches = 
          e.title.toLowerCase().includes(q) ||
          e.paidTo.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.voucherNo && e.voucherNo.toLowerCase().includes(q)) ||
          (e.billRef && e.billRef.toLowerCase().includes(q)) ||
          (e.programName && e.programName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });

    // 2. High-level aggregates
    let totalBilled = 0;
    let totalProgramBilled = 0;
    let totalLocalBilled = 0;
    let totalSettledPaid = 0;
    let totalPendingLiability = 0;

    let programVoucherCount = 0;
    let localVoucherCount = 0;

    const statusCounts = {
      PAID: { count: 0, amount: 0 },
      PARTIALLY_PAID: { count: 0, amount: 0, paid: 0, pending: 0 },
      PENDING: { count: 0, amount: 0 },
      CANCELLED: { count: 0, amount: 0 },
    };

    filtered.forEach(e => {
      const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
      const amt = Number(e.amount) || 0;
      totalBilled += amt;
      if (isProg) {
        totalProgramBilled += amt;
        programVoucherCount += 1;
      } else {
        totalLocalBilled += amt;
        localVoucherCount += 1;
      }

      const st = e.paymentStatus || 'PAID';
      if (st === 'PAID') {
        statusCounts.PAID.count += 1;
        statusCounts.PAID.amount += amt;
        totalSettledPaid += amt;
      } else if (st === 'PARTIALLY_PAID') {
        const pAmt = e.paidAmount !== undefined ? Number(e.paidAmount) : amt;
        const pendAmt = Math.max(0, amt - pAmt);
        statusCounts.PARTIALLY_PAID.count += 1;
        statusCounts.PARTIALLY_PAID.amount += amt;
        statusCounts.PARTIALLY_PAID.paid += pAmt;
        statusCounts.PARTIALLY_PAID.pending += pendAmt;
        totalSettledPaid += pAmt;
        totalPendingLiability += pendAmt;
      } else if (st === 'PENDING') {
        statusCounts.PENDING.count += 1;
        statusCounts.PENDING.amount += amt;
        totalPendingLiability += amt;
      } else if (st === 'CANCELLED') {
        statusCounts.CANCELLED.count += 1;
        statusCounts.CANCELLED.amount += amt;
      }
    });

    // 3. Category-wise breakdown
    const categoryMap: Record<string, {
      category: string;
      isProgram: boolean;
      count: number;
      totalBilled: number;
      settledPaid: number;
      pendingLiability: number;
    }> = {};

    filtered.forEach(e => {
      const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
      const cat = e.category || 'Other Expenses';
      const amt = Number(e.amount) || 0;
      const st = e.paymentStatus || 'PAID';
      const paidPortion = st === 'PAID' ? amt : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : amt) : 0;
      const pendPortion = st === 'PENDING' ? amt : st === 'PARTIALLY_PAID' ? Math.max(0, amt - paidPortion) : 0;

      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          isProgram: isProg,
          count: 0,
          totalBilled: 0,
          settledPaid: 0,
          pendingLiability: 0,
        };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].totalBilled += amt;
      categoryMap[cat].settledPaid += paidPortion;
      categoryMap[cat].pendingLiability += pendPortion;
    });

    const categoryList = Object.values(categoryMap).sort((a, b) => b.totalBilled - a.totalBilled);

    // 4. Program-wise breakdown
    const programMap: Record<string, {
      id: string;
      name: string;
      organizer: string;
      date: string;
      contractAmount: number;
      count: number;
      totalBilled: number;
      settledPaid: number;
      pendingLiability: number;
    }> = {};

    programs.forEach(p => {
      programMap[p.id] = {
        id: p.id,
        name: p.name,
        organizer: p.organizerName,
        date: p.programDate,
        contractAmount: p.totalContractAmount,
        count: 0,
        totalBilled: 0,
        settledPaid: 0,
        pendingLiability: 0,
      };
    });
    programMap['general'] = {
      id: 'general',
      name: 'General Club Operating Expense (No Program)',
      organizer: 'General Club Committee',
      date: 'Ongoing Operating',
      contractAmount: 0,
      count: 0,
      totalBilled: 0,
      settledPaid: 0,
      pendingLiability: 0,
    };

    filtered.forEach(e => {
      const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
      const key = (isProg && e.programId) ? e.programId : 'general';
      const amt = Number(e.amount) || 0;
      const st = e.paymentStatus || 'PAID';
      const paidPortion = st === 'PAID' ? amt : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : amt) : 0;
      const pendPortion = st === 'PENDING' ? amt : st === 'PARTIALLY_PAID' ? Math.max(0, amt - paidPortion) : 0;

      if (!programMap[key]) {
        programMap[key] = {
          id: key,
          name: e.programName || 'Unknown Program',
          organizer: e.organizerName || 'General Club Committee',
          date: e.date,
          contractAmount: 0,
          count: 0,
          totalBilled: 0,
          settledPaid: 0,
          pendingLiability: 0,
        };
      }
      programMap[key].count += 1;
      programMap[key].totalBilled += amt;
      programMap[key].settledPaid += paidPortion;
      programMap[key].pendingLiability += pendPortion;
    });

    const programList = Object.values(programMap)
      .filter(p => p.count > 0 || p.contractAmount > 0)
      .sort((a, b) => b.totalBilled - a.totalBilled);

    // 5. Daily & Monthly Breakdown
    const dailyMap: Record<string, {
      date: string;
      dayOfWeek: string;
      vouchers: number;
      totalBilled: number;
      settledPaid: number;
      vendors: Set<string>;
      categories: Set<string>;
    }> = {};

    const monthlyMap: Record<string, {
      monthKey: string;
      label: string;
      vouchers: number;
      totalBilled: number;
      settledPaid: number;
      pendingLiability: number;
    }> = {};

    filtered.forEach(e => {
      const dateStr = e.date || 'Unknown';
      const amt = Number(e.amount) || 0;
      const st = e.paymentStatus || 'PAID';
      const paidPortion = st === 'PAID' ? amt : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : amt) : 0;
      const pendPortion = st === 'PENDING' ? amt : st === 'PARTIALLY_PAID' ? Math.max(0, amt - paidPortion) : 0;

      if (!dailyMap[dateStr]) {
        let dow = '';
        try {
          const d = new Date(dateStr);
          dow = d.toLocaleDateString('en-IN', { weekday: 'short' });
        } catch { dow = ''; }
        dailyMap[dateStr] = {
          date: dateStr,
          dayOfWeek: dow,
          vouchers: 0,
          totalBilled: 0,
          settledPaid: 0,
          vendors: new Set(),
          categories: new Set(),
        };
      }
      dailyMap[dateStr].vouchers += 1;
      dailyMap[dateStr].totalBilled += amt;
      dailyMap[dateStr].settledPaid += paidPortion;
      if (e.paidTo) dailyMap[dateStr].vendors.add(e.paidTo);
      if (e.category) dailyMap[dateStr].categories.add(e.category);

      const mKey = dateStr.slice(0, 7);
      if (!monthlyMap[mKey]) {
        let mLabel = mKey;
        try {
          const [yyyy, mm] = mKey.split('-');
          const d = new Date(Number(yyyy), Number(mm) - 1, 1);
          mLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } catch {}
        monthlyMap[mKey] = {
          monthKey: mKey,
          label: mLabel,
          vouchers: 0,
          totalBilled: 0,
          settledPaid: 0,
          pendingLiability: 0,
        };
      }
      monthlyMap[mKey].vouchers += 1;
      monthlyMap[mKey].totalBilled += amt;
      monthlyMap[mKey].settledPaid += paidPortion;
      monthlyMap[mKey].pendingLiability += pendPortion;
    });

    const dailyList = Object.values(dailyMap)
      .map(d => ({ ...d, vendorsList: Array.from(d.vendors), categoriesList: Array.from(d.categories) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const monthlyList = Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // 6. Financial Year-wise comparison across all expenses
    const fyMap: Record<number, {
      year: number;
      vouchers: number;
      programBilled: number;
      localBilled: number;
      totalBilled: number;
      settledPaid: number;
      pendingLiability: number;
    }> = {};

    expenses.forEach(e => {
      const yr = Number(e.financialYear) || 2025;
      const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
      const amt = Number(e.amount) || 0;
      const st = e.paymentStatus || 'PAID';
      const paidPortion = st === 'PAID' ? amt : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : amt) : 0;
      const pendPortion = st === 'PENDING' ? amt : st === 'PARTIALLY_PAID' ? Math.max(0, amt - paidPortion) : 0;

      if (!fyMap[yr]) {
        fyMap[yr] = {
          year: yr,
          vouchers: 0,
          programBilled: 0,
          localBilled: 0,
          totalBilled: 0,
          settledPaid: 0,
          pendingLiability: 0,
        };
      }
      fyMap[yr].vouchers += 1;
      if (isProg) fyMap[yr].programBilled += amt;
      else fyMap[yr].localBilled += amt;
      fyMap[yr].totalBilled += amt;
      fyMap[yr].settledPaid += paidPortion;
      fyMap[yr].pendingLiability += pendPortion;
    });

    const fyList = Object.values(fyMap).sort((a, b) => b.year - a.year);

    // 7. Vendor-wise payments
    const vendorMap: Record<string, {
      vendorName: string;
      vouchers: number;
      totalBilled: number;
      settledPaid: number;
      pendingLiability: number;
      categories: Set<string>;
      paymentModes: Set<string>;
    }> = {};

    filtered.forEach(e => {
      const vName = e.paidTo?.trim() || 'Unspecified Payee';
      const amt = Number(e.amount) || 0;
      const st = e.paymentStatus || 'PAID';
      const paidPortion = st === 'PAID' ? amt : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : amt) : 0;
      const pendPortion = st === 'PENDING' ? amt : st === 'PARTIALLY_PAID' ? Math.max(0, amt - paidPortion) : 0;

      if (!vendorMap[vName]) {
        vendorMap[vName] = {
          vendorName: vName,
          vouchers: 0,
          totalBilled: 0,
          settledPaid: 0,
          pendingLiability: 0,
          categories: new Set(),
          paymentModes: new Set(),
        };
      }
      vendorMap[vName].vouchers += 1;
      vendorMap[vName].totalBilled += amt;
      vendorMap[vName].settledPaid += paidPortion;
      vendorMap[vName].pendingLiability += pendPortion;
      if (e.category) vendorMap[vName].categories.add(e.category);
      if (e.paymentMode) vendorMap[vName].paymentModes.add(e.paymentMode);
    });

    const vendorList = Object.values(vendorMap)
      .map(v => ({ ...v, categoriesList: Array.from(v.categories), paymentModesList: Array.from(v.paymentModes) }))
      .sort((a, b) => b.totalBilled - a.totalBilled);

    return {
      filtered,
      totalBilled,
      totalProgramBilled,
      totalLocalBilled,
      totalSettledPaid,
      totalPendingLiability,
      programVoucherCount,
      localVoucherCount,
      statusCounts,
      categoryList,
      programList,
      dailyList,
      monthlyList,
      fyList,
      vendorList,
    };
  }, [expenses, programs, expenseReportYear, expenseReportType, expenseStatusFilter, expenseSearchQuery]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Financial Reports & Statements</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified accounts for AGM, Day-Wise Collection Register, and Program P&L Settlement.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => exportFullMembersPaymentHistoryAuditCsv(members, receipts, settings, reportYear)}
            className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
            title="Export complete member roster joined with full payment history and dues into CSV for external audits"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Audit Export (Members + Payments CSV)</span>
          </button>

          {activeReportTab === 'day_wise_collection' ? (
            <button
              onClick={handleExportDayWiseCsv}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Day-Wise to CSV</span>
            </button>
          ) : (
            <button
              onClick={() => exportReceiptsCsv(receipts)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export to Google Sheets</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Tab Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveReportTab('day_wise_collection')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'day_wise_collection'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day-Wise Payment Collection Report</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            activeReportTab === 'day_wise_collection' 
              ? 'bg-emerald-800/80 text-emerald-100' 
              : 'bg-slate-100 text-slate-700'
          }`}>
            {dayWiseGroups.length} Days
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('agm_statement')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'agm_statement'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>AGM Annual Financial Statement (FY {reportYear})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('expense_analysis')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'expense_analysis'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Expense Audit & Analytics</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            activeReportTab === 'expense_analysis'
              ? 'bg-rose-800/80 text-rose-100'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {expenses.length} Vouchers
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('member_ledgers')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'member_ledgers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Member Ledgers & Dues Audit</span>
        </button>

        <button
          onClick={() => setActiveReportTab('customer_selections')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'customer_selections'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Customer Selection Register ({db.customerSelections?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('program_pnl')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeReportTab === 'program_pnl'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Program & Event P&L Settlement ({programs.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAY-WISE PAYMENT COLLECTION REPORT               */}
      {/* ======================================================== */}
      {activeReportTab === 'day_wise_collection' && (
        <div className="space-y-6">
          {/* Printable Header (Visible only when printing) */}
          <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-2xl font-black text-slate-900 uppercase">{settings.clubName}</h1>
            <p className="text-xs text-slate-600">{settings.villageTown} • Reg: {settings.registrationNo} • Phone: {settings.contactPhone}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs uppercase rounded">
              Daily Payment Collection Register • FY {dayWiseYear === 'all' ? 'All Financial Years' : dayWiseYear}
            </div>
          </div>

          {/* Filter Bar (Hidden when printing) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Collection Report Filter Criteria</h3>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Matching: <strong className="text-slate-800">{filteredDayWiseReceipts.length}</strong> receipts across <strong className="text-emerald-700">{dayWiseGroups.length}</strong> collection days
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Financial Year */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Financial Year:</label>
                <select
                  value={dayWiseYear}
                  onChange={(e) => setDayWiseYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Financial Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      FY {yr - 1}-{yr} ({yr})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Period Preset */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Date Period:</label>
                <select
                  value={datePeriod}
                  onChange={(e) => setDatePeriod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Dates in Period</option>
                  <option value="today">Today Only</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Collector / Cashier */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Collected By / Desk Officer:</label>
                <select
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Collectors</option>
                  {allCollectors.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Mode:</label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Modes (Cash + Digital)</option>
                  {allPaymentModes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Range Row (if selected) */}
            {datePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">From Date:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">To Date:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Search & Status Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search receipt #, member, ward, remark..."
                  value={dayWiseSearch}
                  onChange={(e) => setDayWiseSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-end">
                <span className="text-slate-500">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
                >
                  <option value="APPROVED">Approved Receipts Only</option>
                  <option value="all">All Entries (Approved & Pending)</option>
                </select>

                <button
                  onClick={expandAllDates}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  title="Expand all day breakdowns"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllDates}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  title="Collapse all day breakdowns"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Period Collection */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-4 shadow-sm border border-emerald-700 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-bold block">
                Total Collection
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {settings.currency} {dayWiseStats.totalCollected.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-100/90 mt-1 block">
                {dayWiseStats.totalReceipts} confirmed payments
              </span>
            </div>

            {/* Cash in Hand */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Cash in Hand
              </span>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {settings.currency} {dayWiseStats.totalCash.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Physical Cash Desk
              </span>
            </div>

            {/* Digital & UPI */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                UPI & QR Digital
              </span>
              <div className="text-xl font-bold text-indigo-700 mt-1">
                {settings.currency} {dayWiseStats.totalDigital.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Instant Online Mode
              </span>
            </div>

            {/* Bank / Cheque */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Bank / Cheque
              </span>
              <div className="text-xl font-bold text-sky-700 mt-1">
                {settings.currency} {dayWiseStats.totalBank.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Bank Transfers
              </span>
            </div>

            {/* Active Collection Days */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Collection Days
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {dayWiseStats.activeDaysCount} Days
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Avg: {settings.currency}{dayWiseStats.avgPerDay.toLocaleString()} / day
              </span>
            </div>

            {/* Peak Day Collection */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Peak Day Record
              </span>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {settings.currency} {dayWiseStats.peakDay.amount.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 truncate" title={dayWiseStats.peakDay.date}>
                {dayWiseStats.peakDay.date || 'None'}
              </span>
            </div>
          </div>

          {/* Daily Collection Entries Register */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Day-by-Day Collection Register</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Sorted by most recent collection date
              </span>
            </div>

            {dayWiseGroups.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-sm">No payment collections found matching the selected filter criteria.</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting a different date period or clearing filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {dayWiseGroups.map((group) => {
                  const isExpanded = !!expandedDates[group.date];
                  return (
                    <div key={group.date} className="transition-colors hover:bg-slate-50/50">
                      {/* Day Header Row */}
                      <div 
                        onClick={() => toggleDateExpand(group.date)}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        {/* Left: Date & Badges */}
                        <div className="flex items-start sm:items-center space-x-3">
                          <button
                            type="button"
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 mt-0.5 sm:mt-0"
                            aria-label="Expand day details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-slate-900 text-base sm:text-lg">
                                {group.formattedDate}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {group.dayOfWeek}
                              </span>
                              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                                {group.receiptCount} {group.receiptCount === 1 ? 'receipt' : 'receipts'}
                              </span>
                            </div>

                            {/* Collectors & Category Head summary */}
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                              {group.collectors.length > 0 && (
                                <span className="flex items-center space-x-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>Collected by: <strong className="text-slate-700">{group.collectors.join(', ')}</strong></span>
                                </span>
                              )}
                              {group.purposes.length > 0 && (
                                <span className="text-slate-400">• {group.purposes.slice(0, 2).join(', ')}{group.purposes.length > 2 ? ` +${group.purposes.length - 2}` : ''}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amounts Breakdown & Total Day Collection */}
                        <div className="flex flex-wrap items-center md:justify-end gap-3 sm:gap-4 pl-7 sm:pl-0">
                          {/* Cash & Digital Breakdown Pill */}
                          <div className="text-right text-xs">
                            <div className="text-slate-600 font-medium">
                              Cash: <strong className="text-slate-900">₹{group.cashAmount.toLocaleString()}</strong>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              UPI / Bank: <strong className="text-slate-700">₹{(group.digitalAmount + group.bankAmount).toLocaleString()}</strong>
                            </div>
                          </div>

                          {/* Net Total Collection for the Day */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-1.5 text-right">
                            <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                              Day Total
                            </span>
                            <span className="text-base sm:text-lg font-black text-emerald-800">
                              {settings.currency} {group.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Receipt Drilldown Table */}
                      {isExpanded && (
                        <div className="bg-slate-50/80 p-3 sm:p-5 border-t border-slate-200">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-inner">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="py-2.5 px-3">Receipt No</th>
                                  <th className="py-2.5 px-3">Payer / Member</th>
                                  <th className="py-2.5 px-3">Area / Ward</th>
                                  <th className="py-2.5 px-3">Purpose / Account</th>
                                  <th className="py-2.5 px-3">Payment Mode</th>
                                  <th className="py-2.5 px-3">Collector</th>
                                  <th className="py-2.5 px-3 text-right">Amount</th>
                                  <th className="py-2.5 px-3 text-center">Status</th>
                                  {onViewReceipt && <th className="py-2.5 px-3 text-center print:hidden">Action</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {group.receipts.map((rcpt) => (
                                  <tr key={rcpt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                      {rcpt.receiptNo}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="font-semibold text-slate-900">{rcpt.memberName}</div>
                                      <div className="text-[11px] text-slate-400">{rcpt.memberId || rcpt.phone}</div>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      {rcpt.villageWard || '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-800">
                                      {rcpt.purpose}
                                      {rcpt.programName && (
                                        <div className="text-[10px] text-indigo-600">Event: {rcpt.programName}</div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="font-semibold text-slate-700">{rcpt.paymentMode}</span>
                                      {rcpt.transactionRef && (
                                        <div className="text-[10px] text-slate-400 font-mono">Ref: {rcpt.transactionRef}</div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      {rcpt.collectorName || rcpt.submittedBy}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                      {rcpt.paymentType === 'Refund' ? `-₹${rcpt.amount.toLocaleString()}` : `₹${rcpt.amount.toLocaleString()}`}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                        rcpt.status === 'APPROVED' 
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : rcpt.status === 'PENDING_APPROVAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {rcpt.status || 'APPROVED'}
                                      </span>
                                    </td>
                                    {onViewReceipt && (
                                      <td className="py-2.5 px-3 text-center print:hidden">
                                        <button
                                          onClick={() => onViewReceipt(rcpt)}
                                          className="p-1 rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold"
                                          title="View Receipt Statement"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Printable Signatures Footer */}
          <div className="hidden print:block pt-16 mt-8 border-t border-slate-300 text-xs">
            <div className="grid grid-cols-3 gap-8 text-center font-bold text-slate-800">
              <div className="border-t border-slate-400 pt-2">
                <div>Prepared By</div>
                <div className="text-[10px] font-normal text-slate-500">Front Desk Cashier / Collector</div>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <div>Checked & Verified</div>
                <div className="text-[10px] font-normal text-slate-500">{settings.treasurerName}</div>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <div>Authorized Signatory</div>
                <div className="text-[10px] font-normal text-slate-500">{settings.secretaryName}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AGM STATEMENT                                     */}
      {/* ======================================================== */}
      {activeReportTab === 'agm_statement' && (
        <>
          {/* Printable Report Header */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
            <div className="text-center pb-6 border-b border-slate-200">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {settings.clubName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                {settings.villageTown} • Reg. No: {settings.registrationNo}
              </p>
              <div className="inline-block px-4 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full font-bold text-xs mt-3">
                Annual Financial Statement & Income-Expenditure Account (FY {reportYear})
              </div>
            </div>

            {/* Financial Health KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Total Confirmed Inflow
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {settings.currency} {totalIncome.toLocaleString()}
                </div>
                {totalPendingIncome > 0 && (
                  <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
                    +{settings.currency}{totalPendingIncome.toLocaleString()} awaiting approval
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                  Total Program & Local Outflows
                </span>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  {settings.currency} {totalExpense.toLocaleString()}
                </div>
                <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">
                  {yearExpenses.length} expense vouchers
                </span>
              </div>

              <div className={`p-4 rounded-xl border ${
                netSurplus >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Net FY Surplus / (Deficit)
                </span>
                <div className={`text-2xl font-black mt-1 ${
                  netSurplus >= 0 ? 'text-indigo-700' : 'text-amber-700'
                }`}>
                  {settings.currency} {netSurplus.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Reserve: {settings.currency}{lifetimeNetReserve.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Inflow vs Outflow Ledger Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Income Side */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                  <span>INCOME / RECEIPTS (CREDIT)</span>
                  <span className="text-emerald-700">₹{totalIncome.toLocaleString()}</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Annual Club Membership Fees</span>
                    <strong className="text-slate-900">₹{clubFees.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Annual Village Welfare Contributions</span>
                    <strong className="text-slate-900">₹{villageFees.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Program & Event Organizer Receipts</span>
                    <strong className="text-slate-900">₹{programReceipts.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Other Donations, Grants & Sponsors</span>
                    <strong className="text-slate-900">₹{otherDonations.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Expense Side */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                  <span>EXPENDITURE / OUTFLOWS (DEBIT)</span>
                  <span className="text-rose-700">₹{totalExpense.toLocaleString()}</span>
                </h3>
                <div className="space-y-4 text-xs">
                  {/* Subsection A: Program Expenses */}
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 space-y-1.5">
                    <div className="flex justify-between font-bold text-indigo-950 pb-1 border-b border-indigo-50">
                      <span>A. Programs & Cultural Events</span>
                      <span className="text-indigo-700">₹{totalProgramExpense.toLocaleString()}</span>
                    </div>
                    {Object.keys(programExpenseByHead).length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-1">No program event expenses in FY {reportYear}.</p>
                    ) : (
                      Object.entries(programExpenseByHead).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between py-0.5 text-slate-600">
                          <span>{cat}</span>
                          <strong className="text-slate-800 font-mono">₹{amt.toLocaleString()}</strong>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Subsection B: Local Operating Expenses */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1.5">
                    <div className="flex justify-between font-bold text-emerald-950 pb-1 border-b border-emerald-50">
                      <span>B. General Club Local Operations</span>
                      <span className="text-emerald-700">₹{totalLocalExpense.toLocaleString()}</span>
                    </div>
                    {Object.keys(localExpenseByHead).length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-1">No local operating expenses in FY {reportYear}.</p>
                    ) : (
                      Object.entries(localExpenseByHead).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between py-0.5 text-slate-600">
                          <span>{cat}</span>
                          <strong className="text-slate-800 font-mono">₹{amt.toLocaleString()}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signatory Box */}
            <div className="pt-12 mt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
              <div>
                <div className="font-bold text-slate-800">{settings.treasurerName}</div>
                <div>Treasurer / Cashier</div>
              </div>
              <div>
                <div className="font-bold text-slate-800">{settings.secretaryName}</div>
                <div>General Secretary / Executive Signatory</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PROGRAM P&L SETTLEMENT REPORT                     */}
      {/* ======================================================== */}
      {activeReportTab === 'program_pnl' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Program Contract Settlement & Event P&L Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive financial audit tracking advance receipts, subsequent installments, local vendor expenses, and net profit per event.
            </p>
          </div>

          {programSummaries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No programs or cultural events recorded in the system.
            </div>
          ) : (
            <div className="space-y-5">
              {programSummaries.map((ps) => {
                const profitPositive = ps.actualProfit >= 0;
                return (
                  <div 
                    key={ps.program.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-base text-slate-900">{ps.program.name}</h4>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            ps.paymentStatus === 'FULLY RECEIVED' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : ps.paymentStatus === 'OVERPAYMENT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ps.paymentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Organizer: <strong className="text-slate-700">{ps.program.organizerName}</strong> • Date: {ps.program.programDate}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 block">Total Contract Value</span>
                        <span className="text-lg font-black text-slate-900">₹{ps.totalContractAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 font-semibold block">Confirmed Inflow</span>
                        <span className="font-bold text-base text-emerald-700 mt-0.5 block">
                          ₹{ps.totalApprovedReceived.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Adv: ₹{ps.totalAdvanceAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 font-semibold block">Local Expenses</span>
                        <span className="font-bold text-base text-rose-700 mt-0.5 block">
                          ₹{ps.totalLocalExpenses.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ps.expensesCount} vouchers passed
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 font-semibold block">Remaining Due</span>
                        <span className="font-bold text-base text-amber-600 mt-0.5 block">
                          ₹{ps.remainingBalanceDue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ps.totalPendingApproval > 0 ? `₹${ps.totalPendingApproval.toLocaleString()} pending` : 'All cleared'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <span className={`font-semibold block ${profitPositive ? 'text-indigo-700' : 'text-amber-700'}`}>
                          Actual Net Profit
                        </span>
                        <span className={`font-bold text-base mt-0.5 block ${profitPositive ? 'text-indigo-600' : 'text-amber-600'}`}>
                          ₹{ps.actualProfit.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Expected: ₹{ps.expectedProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MEMBER LEDGERS & DUES AUDIT                       */}
      {/* ======================================================== */}
      {activeReportTab === 'member_ledgers' && (
        <div className="space-y-6">
          {/* Full Membership & Payment History Audit Card */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h4 className="text-base font-bold text-white tracking-tight">Full Members & Payment History Audit Register</h4>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-indigo-400/30">
                  Audit Grade CSV
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Export all {members.length} members joined with their complete payment history ({receipts.length} total receipts), annual dues assessments, receipt numbers, payment modes, and cashier audit logs into CSV format for external auditing, record-keeping, and general meetings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => exportFullMembersPaymentHistoryAuditCsv(members, receipts, settings, activeYear)}
                className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                title="Download full transaction-level audit ledger for all members"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                <span>Export Full Audit Ledger (CSV)</span>
              </button>
              <button
                onClick={() => exportMembersPaymentAuditSummaryCsv(members, receipts, settings, activeYear)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                title="Download 1-row-per-member dues & payment summary report"
              >
                <Download className="w-4 h-4 text-indigo-300" />
                <span>Summary Dues Roster (CSV)</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Member Individual Ledger & Accounts Audit</h3>
              <p className="text-xs text-slate-500">
                Inspect running debit/credit balances, fees assessed, and payments for any member.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-600 font-semibold">Select Member:</span>
                <select
                  value={selectedLedgerMemberId}
                  onChange={(e) => setSelectedLedgerMemberId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLedgerMemberId && (
                <button
                  onClick={() => {
                    const selMem = members.find(m => m.id === selectedLedgerMemberId);
                    if (!selMem) return;
                    const memRecs = receipts.filter(r => r.memberId === selMem.id && r.financialYear === activeYear);
                    const expectedFee = selMem.category === 'club_member'
                      ? settings.defaultAnnualClubFee
                      : (settings.defaultAnnualResidentFee ?? settings.defaultAnnualVillageFee);
                    
                    const rows = [
                      {
                        date: `${activeYear - 1}-04-01`,
                        txnId: `ASSESS-${activeYear}`,
                        receiptNo: 'LEDGER-DUE',
                        description: `Annual Membership Assessment (FY ${activeYear - 1}-${activeYear})`,
                        type: 'Membership Subscription',
                        mode: 'System Billing',
                        debit: expectedFee,
                        credit: 0,
                        balance: expectedFee,
                        status: 'Assessed',
                        collector: settings.treasurerName,
                      },
                      ...memRecs.map(r => ({
                        date: r.date,
                        txnId: r.id,
                        receiptNo: r.receiptNo,
                        description: r.purpose || 'Membership Subscription',
                        type: r.paymentType || 'Subscription',
                        mode: r.paymentMode,
                        debit: 0,
                        credit: r.amount,
                        balance: 0,
                        status: r.status,
                        collector: r.collectorName || r.submittedBy,
                      }))
                    ];
                    exportMemberLedgerCsv(selMem.name, selMem.id, rows);
                  }}
                  className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Member Ledger</span>
                </button>
              )}
            </div>
          </div>

          {/* Member Ledger Table */}
          {(() => {
            const currentMem = members.find(m => m.id === selectedLedgerMemberId) || members[0];
            if (!currentMem) return <p className="text-slate-400">No member selected</p>;

            const memReceipts = receipts.filter(r => r.memberId === currentMem.id);
            const fee = currentMem.category === 'club_member'
              ? settings.defaultAnnualClubFee
              : (settings.defaultAnnualResidentFee ?? settings.defaultAnnualVillageFee);
            const totalPaidCurrentYear = memReceipts
              .filter(r => r.financialYear === activeYear && r.status === 'APPROVED')
              .reduce((sum, r) => sum + r.amount, 0);
            const dues = Math.max(0, fee - totalPaidCurrentYear);

            return (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{currentMem.name} ({currentMem.id})</h4>
                    <p className="text-slate-500">{currentMem.villageWard} • Joined {currentMem.joinedYear}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-bold">
                      Assessed: ₹{fee.toLocaleString('en-IN')}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl font-bold">
                      Paid: ₹{totalPaidCurrentYear.toLocaleString('en-IN')}
                    </span>
                    <span className={`px-3 py-1 rounded-xl font-bold ${
                      dues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-700'
                    }`}>
                      Outstanding Dues: ₹{dues.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-3">Receipt No</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Particulars / Head</th>
                        <th className="py-3 px-3">Mode</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Collector</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Receipt Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memReceipts.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{r.receiptNo}</td>
                          <td className="py-3 px-3 text-slate-700 font-mono">{r.date}</td>
                          <td className="py-3 px-3 text-slate-900 font-medium">{r.purpose}</td>
                          <td className="py-3 px-3 text-slate-600">{r.paymentMode}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600">₹{r.amount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-slate-600">{r.collectorName}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onViewReceipt && onViewReceipt(r)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CUSTOMER SELECTION REGISTER (ADMIN CONTROL)       */}
      {/* ======================================================== */}
      {activeReportTab === 'customer_selections' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer Selection & Nomination Register</h3>
              <p className="text-xs text-slate-500">
                Audit list of member selections submitted for scholarships, sports trials, or delegations.
              </p>
            </div>

            <button
              onClick={() => {
                if (db.customerSelections && db.customerSelections.length > 0) {
                  exportCustomerSelectionsCsv(db.customerSelections);
                }
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Selections to CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            {(!db.customerSelections || db.customerSelections.length === 0) ? (
              <p className="text-center py-8 text-slate-400">No customer selections recorded yet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">ID</th>
                      <th className="py-3 px-3">Submitted By Member</th>
                      <th className="py-3 px-3">Customer / Beneficiary</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Admin Remarks</th>
                      <th className="py-3 px-3">Actioned By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db.customerSelections.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600">{s.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{s.memberName} ({s.memberId})</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{s.customerName}</td>
                        <td className="py-3 px-3 text-slate-700">{s.category}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{s.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            s.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            s.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">{s.adminRemarks || '—'}</td>
                        <td className="py-3 px-3 text-slate-500 font-medium">{s.actionBy || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: COMPREHENSIVE EXPENSE AUDIT & ANALYTICS REPORT     */}
      {/* ======================================================== */}
      {activeReportTab === 'expense_analysis' && (
        <div className="space-y-6">
          {/* Printable Header */}
          <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-2xl font-black text-slate-900 uppercase">{settings.clubName}</h1>
            <p className="text-xs text-slate-600">
              {settings.villageTown} • Reg: {settings.registrationNo} • Phone: {settings.contactPhone}
            </p>
            <div className="inline-block mt-2 px-3 py-1 bg-rose-50 border border-rose-300 text-rose-900 font-bold text-xs uppercase rounded">
              Official Expense Audit & Outflow Analysis Register • FY {expenseReportYear === 'all' ? 'All Years' : expenseReportYear}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-slate-800 text-sm">Expense Report Filters</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{expenseAnalytics.filtered.length}</strong> of {expenses.length} vouchers
                </span>
                <button
                  type="button"
                  onClick={() => exportExpensesCsv(expenseAnalytics.filtered)}
                  className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Expense CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Financial Year */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Financial Year:</label>
                <select
                  value={expenseReportYear}
                  onChange={(e) => setExpenseReportYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Financial Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      FY {yr - 1}-{yr} ({yr})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Type */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Expense Type:</label>
                <select
                  value={expenseReportType}
                  onChange={(e) => setExpenseReportType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Types (Program & Local)</option>
                  <option value="PROGRAM">Program Expenses Only</option>
                  <option value="LOCAL">Local Club Operating Expenses Only</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Status:</label>
                <select
                  value={expenseStatusFilter}
                  onChange={(e) => setExpenseStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="PAID">Paid (Settled)</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PENDING">Pending (Unpaid)</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Search Keywords:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    placeholder="Vendor, description, voucher #..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Sub-view selection buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
              {[
                { id: 'overview', label: 'Executive Overview' },
                { id: 'category', label: 'Category Summary' },
                { id: 'program', label: 'Program-wise Summary' },
                { id: 'daily_monthly', label: 'Daily & Monthly Outflow' },
                { id: 'year_wise', label: 'Financial Year Comparison' },
                { id: 'vendor', label: 'Vendor Payments Register' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExpenseSubView(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    expenseSubView === tab.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Callout: Unpaid bills must not be treated as settled funds */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Financial Reporting Discipline Rule:</span> Only approved, settled payments (₹{expenseAnalytics.totalSettledPaid.toLocaleString('en-IN')}) are included as finalized debits in net surplus calculations. Outstanding unpaid bills (₹{expenseAnalytics.totalPendingLiability.toLocaleString('en-IN')}) are recorded as pending liabilities and are not treated as settled funds.
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Program Expenses */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-900">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Program Expenses</span>
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                ₹{expenseAnalytics.totalProgramBilled.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-indigo-600 mt-1 font-medium">
                {expenseAnalytics.programVoucherCount} festival & event vouchers
              </span>
            </div>

            {/* Total Local Expenses */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Local Expenses</span>
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                ₹{expenseAnalytics.totalLocalBilled.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 font-medium">
                {expenseAnalytics.localVoucherCount} general operating bills
              </span>
            </div>

            {/* Finalized Settled Paid */}
            <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-900">
                <span className="text-[11px] font-bold uppercase tracking-wider">Settled Funds (Approved Paid)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-rose-700 mt-2">
                ₹{expenseAnalytics.totalSettledPaid.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 mt-1">
                Settled through cash, UPI, bank
              </span>
            </div>

            {/* Outstanding Pending Liabilities */}
            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-900">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Outstandings</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                ₹{expenseAnalytics.totalPendingLiability.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-amber-700 mt-1 font-medium">
                Unpaid bills awaiting clearance
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SUB-VIEW 1: EXECUTIVE OVERVIEW & PAYMENT STATUS AUDIT    */}
          {/* ======================================================== */}
          {expenseSubView === 'overview' && (
            <div className="space-y-5">
              {/* Payment Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-emerald-800 font-bold block uppercase tracking-wider text-[10px]">Fully Settled (Paid)</span>
                  <span className="text-lg font-black text-emerald-700 mt-1 block">
                    ₹{expenseAnalytics.statusCounts.PAID.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500 text-[10px]">{expenseAnalytics.statusCounts.PAID.count} vouchers fully settled</span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                  <span className="text-indigo-800 font-bold block uppercase tracking-wider text-[10px]">Partially Paid</span>
                  <span className="text-lg font-black text-indigo-700 mt-1 block">
                    ₹{expenseAnalytics.statusCounts.PARTIALLY_PAID.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Paid: ₹{expenseAnalytics.statusCounts.PARTIALLY_PAID.paid.toLocaleString('en-IN')} • Due: ₹{expenseAnalytics.statusCounts.PARTIALLY_PAID.pending.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="text-amber-800 font-bold block uppercase tracking-wider text-[10px]">Pending (Unpaid Credit)</span>
                  <span className="text-lg font-black text-amber-700 mt-1 block">
                    ₹{expenseAnalytics.statusCounts.PENDING.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500 text-[10px]">{expenseAnalytics.statusCounts.PENDING.count} vouchers awaiting payment</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-700 font-bold block uppercase tracking-wider text-[10px]">Cancelled / Voided</span>
                  <span className="text-lg font-black text-slate-700 mt-1 block">
                    ₹{expenseAnalytics.statusCounts.CANCELLED.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-500 text-[10px]">{expenseAnalytics.statusCounts.CANCELLED.count} vouchers cancelled</span>
                </div>
              </div>

              {/* Vouchers Register Table */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Filtered Expense Vouchers Audit Register</h4>
                  <span className="text-xs text-slate-500 font-semibold">{expenseAnalytics.filtered.length} total entries</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Voucher & Date</th>
                        <th className="p-3">Expense Type</th>
                        <th className="p-3">Linked Event / Account</th>
                        <th className="p-3">Category & Description</th>
                        <th className="p-3">Vendor / Payee</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                        <th className="p-3 text-right">Settled Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {expenseAnalytics.filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No expense vouchers match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        expenseAnalytics.filtered.map(e => {
                          const isProg = e.expenseType === 'PROGRAM' || e.expenseType === 'Program Expense' || (Boolean(e.programId) && e.programId !== 'general');
                          const st = e.paymentStatus || 'PAID';
                          const paidPortion = st === 'PAID' ? e.amount : st === 'PARTIALLY_PAID' ? (e.paidAmount !== undefined ? Number(e.paidAmount) : e.amount) : 0;
                          return (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-mono font-bold text-rose-700 block">{e.voucherNo || e.id}</span>
                                <span className="text-[10px] text-slate-400">{e.date} • FY {e.financialYear}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isProg ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {isProg ? 'Program' : 'Local'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-800 block truncate max-w-[180px]">
                                  {e.programName || (isProg ? 'Program Expense' : 'General Club Operating Expense (No Program)')}
                                </span>
                                <span className="text-[10px] text-slate-400">{e.organizerName || 'General Committee'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-900 block">{e.title}</span>
                                <span className="text-[11px] text-slate-500 font-normal">Head: {e.category}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-slate-800 block">{e.paidTo}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Ref: {e.billRef || '—'}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                  st === 'PARTIALLY_PAID' ? 'bg-indigo-100 text-indigo-800' :
                                  st === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {st}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                ₹{e.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                ₹{paidPortion.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-VIEW 2: CATEGORY-WISE EXPENSE SUMMARY                */}
          {/* ======================================================== */}
          {expenseSubView === 'category' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Category-wise Expense Summary & Head Allocation</h4>
                  <p className="text-xs text-slate-500">Breakdown of outflows by expenditure heads with settled vs pending audit</p>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {expenseAnalytics.categoryList.length} Active Categories
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Rank & Category Head</th>
                      <th className="p-3">Primary Type</th>
                      <th className="p-3 text-center">Vouchers</th>
                      <th className="p-3 text-right">Total Billed (₹)</th>
                      <th className="p-3 text-right">Settled Paid (₹)</th>
                      <th className="p-3 text-right">Pending Due (₹)</th>
                      <th className="p-3 text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {expenseAnalytics.categoryList.map((cat, idx) => {
                      const pct = expenseAnalytics.totalBilled > 0 
                        ? ((cat.totalBilled / expenseAnalytics.totalBilled) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={cat.category} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-slate-900">{idx + 1}. {cat.category}</span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.isProgram ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {cat.isProgram ? 'Program' : 'Local'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{cat.count}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{cat.totalBilled.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            ₹{cat.settledPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-700">
                            ₹{cat.pendingLiability.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-600">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-VIEW 3: PROGRAM-WISE EXPENSE SUMMARY                 */}
          {/* ======================================================== */}
          {expenseSubView === 'program' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Program-wise Expense Summary & Budget Ledger</h4>
                  <p className="text-xs text-slate-500">Event-wise expenses debited against program budget contracts</p>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {expenseAnalytics.programList.length} Accounts Tracked
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Program / Event Account</th>
                      <th className="p-3">Organizer / In-Charge</th>
                      <th className="p-3 text-center">Vouchers</th>
                      <th className="p-3 text-right">Contract Budget (₹)</th>
                      <th className="p-3 text-right">Expenses Debited (₹)</th>
                      <th className="p-3 text-right">Settled Paid (₹)</th>
                      <th className="p-3 text-right">Pending Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {expenseAnalytics.programList.map(prog => (
                      <tr key={prog.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{prog.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{prog.id} • {prog.date}</span>
                        </td>
                        <td className="p-3 text-slate-700">{prog.organizer}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{prog.count}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {prog.contractAmount > 0 ? `₹${prog.contractAmount.toLocaleString('en-IN')}` : 'Operating'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700">
                          ₹{prog.totalBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{prog.settledPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          ₹{prog.pendingLiability.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-VIEW 4: DAILY AND MONTHLY EXPENSES                   */}
          {/* ======================================================== */}
          {expenseSubView === 'daily_monthly' && (
            <div className="space-y-6">
              {/* Monthly Aggregation */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Monthly Expense Trend & Outflow Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {expenseAnalytics.monthlyList.map(m => (
                    <div key={m.monthKey} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                        <span>{m.label}</span>
                        <span className="text-slate-500 font-normal">{m.vouchers} vouchers</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Outflow:</span>
                        <strong className="text-slate-900 font-mono">₹{m.totalBilled.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Settled Paid:</span>
                        <strong className="font-mono">₹{m.settledPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      {m.pendingLiability > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Pending Payable:</span>
                          <strong className="font-mono">₹{m.pendingLiability.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Outflow Register */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Daily Expense Outflow Register
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Expense Date</th>
                        <th className="p-3 text-center">Vouchers</th>
                        <th className="p-3">Payees / Vendors</th>
                        <th className="p-3">Expense Heads</th>
                        <th className="p-3 text-right">Total Amount (₹)</th>
                        <th className="p-3 text-right">Settled Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {expenseAnalytics.dailyList.map(d => (
                        <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{d.date}</span>
                            <span className="text-[10px] text-slate-400">{d.dayOfWeek}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{d.vouchers}</td>
                          <td className="p-3 text-slate-700 truncate max-w-[200px]">
                            {d.vendorsList.slice(0, 3).join(', ')}{d.vendorsList.length > 3 ? ` +${d.vendorsList.length - 3} more` : ''}
                          </td>
                          <td className="p-3 text-slate-600 truncate max-w-[200px]">
                            {d.categoriesList.slice(0, 3).join(', ')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700">
                            ₹{d.totalBilled.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            ₹{d.settledPaid.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-VIEW 5: FINANCIAL YEAR-WISE EXPENSES                */}
          {/* ======================================================== */}
          {expenseSubView === 'year_wise' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Financial Year-wise Expense Comparison</h4>
                  <p className="text-xs text-slate-500">Historical comparison of Program vs Local expenditures across accounting years</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Financial Year</th>
                      <th className="p-3 text-center">Vouchers</th>
                      <th className="p-3 text-right">Program Expenses (₹)</th>
                      <th className="p-3 text-right">Local Expenses (₹)</th>
                      <th className="p-3 text-right">Total Outflow (₹)</th>
                      <th className="p-3 text-right">Settled Paid (₹)</th>
                      <th className="p-3 text-right">Pending Liabilities (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {expenseAnalytics.fyList.map(fy => (
                      <tr key={fy.year} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          FY {fy.year - 1}-{fy.year} ({fy.year})
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{fy.vouchers}</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-700">
                          ₹{fy.programBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{fy.localBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          ₹{fy.totalBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{fy.settledPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          ₹{fy.pendingLiability.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-VIEW 6: VENDOR-WISE PAYMENTS                         */}
          {/* ======================================================== */}
          {expenseSubView === 'vendor' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Vendor & Payee Payment Ledger</h4>
                  <p className="text-xs text-slate-500">Summary of total billings, settled payments, and pending dues by vendor</p>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {expenseAnalytics.vendorList.length} Vendors Recorded
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Vendor / Payee Name</th>
                      <th className="p-3 text-center">Bills</th>
                      <th className="p-3">Categories Supplied</th>
                      <th className="p-3 text-right">Total Invoiced (₹)</th>
                      <th className="p-3 text-right">Settled Paid (₹)</th>
                      <th className="p-3 text-right">Pending Payable (₹)</th>
                      <th className="p-3">Payment Modes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {expenseAnalytics.vendorList.map(v => (
                      <tr key={v.vendorName} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{v.vendorName}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{v.vouchers}</td>
                        <td className="p-3 text-slate-600 truncate max-w-[200px]">
                          {v.categoriesList.join(', ')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{v.totalBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">
                          ₹{v.settledPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          ₹{v.pendingLiability.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {v.paymentModesList.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
