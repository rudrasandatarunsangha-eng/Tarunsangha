export type MemberCategory = 'village_resident' | 'club_member' | 'patron' | 'senior';

export interface Member {
  id: string; // e.g., MEM-101
  name: string;
  phone: string;
  category: MemberCategory;
  villageWard: string; // e.g., Ward No. 3, Uttar Para
  address: string;
  joinedYear: number;
  status: 'active' | 'inactive';
  guardianName?: string;
  notes?: string;
  photoUrl?: string;
  bloodGroup?: string;
  email?: string;
  dob?: string;
  createdAt: string;
}

export type OrganizerRole = 
  | 'President' 
  | 'Secretary' 
  | 'Treasurer / Cashier' 
  | 'Vice President' 
  | 'Assistant Secretary' 
  | 'Cultural Convener' 
  | 'Sports Secretary' 
  | 'Event Organizer'
  | 'Executive Member';

export interface Organizer {
  id: string; // ORG-001
  memberId?: string;
  name: string; // Organizer Name
  phone: string; // Mobile Number
  address: string; // Full Address
  companyOrClubName: string; // Company / Club / Committee Name
  role: OrganizerRole;
  termPeriod?: string; // e.g. 2025-2027
  responsibilities?: string;
  isSignatory: boolean;
  remarks?: string; // Remarks
  status: 'active' | 'inactive'; // Active / Inactive status
  createdAt: string;
}

export type ProgramStatus = 'Booked' | 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';

export type ProgramType = 
  | 'Cultural Festival' 
  | 'Sports Tournament' 
  | 'Blood Donation & Health Camp' 
  | 'Religious Festival / Puja' 
  | 'Musical Night & Concert' 
  | 'Community Feast & Banquet' 
  | 'Youth & Education Workshop' 
  | 'Exhibition & Fair' 
  | 'Drama & Theatre' 
  | 'Other Event';

export interface Program {
  id: string; // PRG-2026-0001
  organizerId: string;
  organizerName: string;
  organizerPhone?: string;
  organizerCompany?: string;
  name: string; // Program Name
  type: string; // Program Type
  venue: string; // Program Venue
  venueAddress: string; // Address
  programDate: string; // YYYY-MM-DD
  startTime: string; // e.g. 10:00 AM
  endTime: string; // e.g. 09:00 PM
  contractDate: string; // YYYY-MM-DD
  totalContractAmount: number; // Total Contract Amount
  initialAdvanceAmount: number; // Initial Advance Amount
  specialInstructions?: string; // Special Instructions
  status: ProgramStatus; // Booked, Upcoming, In Progress, Completed, Cancelled
  createdAt: string;
}

export type PaymentMode = 'Cash' | 'UPI / GPay / PhonePe' | 'Bank Transfer' | 'Cheque';

export type PaymentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED';

export type PaymentType = 
  | 'Advance' 
  | 'Part Payment' 
  | 'Final Payment' 
  | 'Refund' 
  | 'Subscription Fee' 
  | 'Donation';

export type PaymentPurpose = 
  | 'Annual Club Membership Fee' 
  | 'Annual Village Contribution' 
  | 'Program Contract Booking'
  | 'Program Part Payment'
  | 'Program Final Settlement'
  | 'Durga Puja / Festival Fund' 
  | 'Sports Tournament Fund' 
  | 'Club Room / Library Development' 
  | 'Social Relief & Medical Help' 
  | 'Special Donation' 
  | 'Other';

export interface PaymentReceipt {
  id: string; // e.g. PAY-2026-0001
  receiptNo: string; // e.g. RCP-2026-0042
  payerType: 'member' | 'organizer' | 'direct';
  memberId?: string;
  memberName: string;
  memberCategory?: MemberCategory;
  organizerId?: string;
  organizerName?: string;
  programId?: string;
  programName?: string;
  phone: string;
  villageWard?: string;
  financialYear: number; // e.g. 2026
  date: string; // YYYY-MM-DD
  paymentType: PaymentType;
  purpose: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  submittedBy: string; // Submitted By
  submissionDateTime: string; // Submission Date and Time
  collectorName: string;
  status: PaymentStatus; // PENDING_APPROVAL | APPROVED | REJECTED | VOIDED
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  remarks?: string;
  createdAt: string;
}

export interface PaymentAuditLog {
  id: string; // AUD-0001
  paymentId?: string;
  receiptNo?: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'EDITED' | 'DELETED' | 'VOIDED' | 'RESTORED' | 'BACKUP_CREATED';
  adminId: string;
  adminName: string;
  timestamp: string;
  previousStatus?: PaymentStatus | 'NONE' | string;
  newStatus?: PaymentStatus | string;
  rejectionReason?: string;
  notes?: string;
  amount?: number;
  payerName?: string;
  targetType?: 'payment' | 'expense' | 'member' | 'program' | 'organizer' | 'database';
  targetId?: string;
}

export type ExpenseCategory = 
  | 'Stage and Pandal' 
  | 'Lighting and Electrical' 
  | 'Sound System and Microphone' 
  | 'Transport and Vehicle' 
  | 'Food and Refreshments' 
  | 'Labour and Workers' 
  | 'Decoration' 
  | 'Equipment Rental' 
  | 'Miscellaneous / Small Expenses' 
  | 'Other Expenses' 
  | string;

export interface Expense {
  id: string; // e.g. EXP-2026-0012
  voucherNo: string; // e.g. EXP-2026-0012
  expenseType?: 'PROGRAM' | 'LOCAL' | 'Program Expense' | 'Local Expense'; // Mandatory Expense Type: 'PROGRAM' | 'LOCAL'
  programId?: string; // Linked Program ID
  programName?: string;
  organizerName?: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  title: string; // Description
  amount: number;
  paidTo: string; // Vendor or person name
  approvedBy: string; // e.g. President / Treasurer
  paymentMode: PaymentMode;
  billRef?: string; // Bill / Receipt Reference
  financialYear: number;
  remarks?: string;
  enteredBy: string; // Entered By
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'CANCELLED';
  paidAmount?: number;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type UserRole = 
  | 'Super Admin / Admin'
  | 'Accounts'
  | 'Member Management'
  | 'Payment Entry'
  | 'Payment Approval'
  | 'Reports'
  | 'Member'
  | 'View Only Member'
  | 'Edit Permitted Modules Member'
  | 'Custom';

export type UserPermission = 
  | 'dashboard'
  | 'members_view'
  | 'members_edit'
  | 'members_delete'
  | 'programs_view'
  | 'programs_edit'
  | 'programs_delete'
  | 'receipts_view'
  | 'payment_entry'
  | 'payment_approve'
  | 'receipts_delete'
  | 'expenses_view'
  | 'expenses_edit'
  | 'expenses_delete'
  | 'organizers_view'
  | 'organizers_manage'
  | 'accounts_view'
  | 'reports_view'
  | 'reports_export'
  | 'id_card_view'
  | 'member_portal_view'
  | 'customer_selection'
  | 'password_reset_request'
  | 'user_management'
  | 'settings_manage'
  | 'backup_restore';

export type SelectionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface CustomerSelection {
  id: string; // e.g. SEL-001
  memberId: string; // ID of member submitting
  memberName: string;
  customerName: string; // Name of eligible customer / beneficiary / nominee / attendee selected
  customerId?: string;
  category: string; // e.g. 'Scholarship / Welfare', 'Sports Tournament Representative', 'Cultural Participant', 'Annual Event Delegate', 'Sub-Committee Representative'
  phone?: string;
  email?: string;
  reason?: string; // Member's justification/note
  status: SelectionStatus;
  adminRemarks?: string;
  actionBy?: string; // Admin who approved/rejected
  actionAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PasswordResetStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface PasswordResetRequest {
  id: string; // PRR-001
  userId: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  reason: string;
  status: PasswordResetStatus;
  requestDate: string; // ISO
  actionedBy?: string; // Admin username
  actionedAt?: string; // ISO
  adminNotes?: string;
  resetToken?: string; // One-time secure token when approved
  tokenExpiresAt?: string; // ISO timestamp
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  userName: string;
  timestamp: string; // ISO
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED' | 'PASSWORD_RESET' | 'LOGOUT';
  reason?: string;
}

export interface AppUser {
  id: string; // e.g. USR-001 or admin
  username: string; // login identifier / User ID
  fullName: string;
  email: string;
  phone?: string;
  memberId?: string;
  department: string;
  role: UserRole;
  customRoleName?: string;
  status: 'active' | 'inactive';
  permissions: UserPermission[];
  passwordHash?: string; // SHA-256 hex hash
  salt?: string;
  temporaryPassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface LoginAppearanceSettings {
  themePreset: 'emerald' | 'indigo' | 'sunset' | 'ocean' | 'royal' | 'custom';
  primaryColor: string; // Hex e.g. #059669
  secondaryColor: string; // Hex e.g. #0f172a
  backgroundColor: string; // Hex or gradient string
  buttonColor: string; // Hex
  textColor: string; // Hex
  customGreeting?: string;
  showTagline: boolean;
  showQuickLoginButtons?: boolean;
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  requireStrongPassword: boolean;
  loginHistoryRetentionDays: number;
  defaultRoleForNewUsers: UserRole;
  allowSelfRegistration: boolean;
}

export interface ClubSettings {
  clubName: string;
  tagline: string;
  villageTown: string;
  registrationNo: string;
  contactPhone: string;
  contactEmail: string;
  currency: string;
  defaultAnnualClubFee: number;
  defaultAnnualVillageFee: number;
  defaultAnnualResidentFee?: number;
  adminPin: string; // 4-digit security PIN
  treasurerName: string;
  secretaryName: string;
  activeFinancialYear: number;
  financialYears?: number[]; // e.g. [2024, 2025] - only Admin can create new financial years
  logoUrl?: string;
  googleDriveBackupFolder?: string; // e.g. 'Club Management App Backups'
  lastBackupDate?: string;
  // Extended Settings Modules
  receiptFooterText?: string;
  voucherFooterText?: string;
  receiptNumberPrefix?: string;
  autoReceiptNumbering?: boolean;
  timezone?: string; // default "Asia/Kolkata"
  dateFormat?: string; // default "DD-MM-YYYY"
  autoBackupEnabled?: boolean;
  backupScheduleTime?: string; // default "23:00 IST"
  backupNotificationEmail?: string;
  reportHeading?: string;
  customLocalExpenseCategories?: string[];
  loginAppearance?: LoginAppearanceSettings;
  security?: SecuritySettings;
}

export interface MemberYearlyStatus {
  member: Member;
  financialYear: number;
  targetFee: number;
  paidAmount: number;
  balanceDue: number;
  status: 'paid' | 'partial' | 'unpaid';
  lastPaymentDate?: string;
  receiptCount: number;
}

export interface ProgramFinancialSummary {
  program: Program;
  totalContractAmount: number;
  totalAdvanceAmount: number;
  totalSubsequentPayments: number;
  totalApprovedReceived: number;
  totalPendingApproval: number;
  totalRejected: number;
  totalRefunds: number;
  remainingBalanceDue: number;
  paymentStatus: 'FULLY RECEIVED' | 'PARTIALLY RECEIVED' | 'PAYMENT PENDING' | 'OVERPAYMENT';
  totalLocalExpenses: number;
  expectedProfit: number;
  actualProfit: number;
  paymentsList: PaymentReceipt[];
  expensesList: Expense[];
}

export interface BackupRecord {
  id: string; // BCK-20261010-230000
  filename: string;
  timestamp: string; // ISO
  timeIndia: string; // Asia/Kolkata formatted string e.g. "10-Oct-2026 11:00:00 PM IST"
  type: 'AUTOMATIC_DAILY' | 'MANUAL_ADMIN' | 'SAFETY_PRE_RESTORE';
  status: 'SUCCESS' | 'FAILED';
  recordCounts: {
    members: number;
    receipts: number;
    expenses: number;
    programs: number;
    organizers: number;
    auditLogs: number;
  };
  fileSizeKb: number;
  googleDriveFolder: string;
  googleDriveFileId?: string;
  notificationSentTo?: string;
  errorDetails?: string;
  checksum?: string;
}

export type AccountType = 'Cash in Hand' | 'Bank Account' | 'UPI & Digital';

export interface AccountTransaction {
  id: string; // TXN-2026-0001
  date: string;
  account: AccountType;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  partyName: string; // Member, Vendor, Donor, Organizer
  description: string;
  debit: number; // Outflow / Expense
  credit: number; // Inflow / Income
  refNo?: string;
  runningBalance: number;
  status: PaymentStatus;
  sourceType: 'receipt' | 'expense' | 'direct';
  sourceId: string;
  enteredBy: string;
}

export interface ClubDatabase {
  settings: ClubSettings;
  members: Member[];
  organizers: Organizer[];
  programs: Program[];
  receipts: PaymentReceipt[];
  expenses: Expense[];
  auditLogs: PaymentAuditLog[];
  backups?: BackupRecord[];
  users?: AppUser[];
  loginHistory?: LoginHistoryItem[];
  customerSelections?: CustomerSelection[];
  passwordResetRequests?: PasswordResetRequest[];
}
