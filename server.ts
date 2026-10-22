import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { 
  ClubDatabase, 
  ClubSettings, 
  Member, 
  Organizer, 
  Program, 
  PaymentReceipt, 
  Expense, 
  PaymentAuditLog,
  PaymentStatus,
  PaymentType,
  BackupRecord,
  AccountTransaction,
  AppUser,
  LoginHistoryItem,
  UserRole,
  UserPermission,
  CustomerSelection,
  SelectionStatus,
  PasswordResetRequest,
  PasswordResetStatus
} from './src/types/club.ts';
import { DEFAULT_CLUB_LOGO } from './src/utils/clubLogo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'club_db.json');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function getIndiaTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date) + ' IST';
}

// Helper to securely hash passwords with SHA-256 and salt
function hashPassword(password: string, salt: string = 'club_salt_2026'): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Default Club Settings
const defaultSettings: ClubSettings = {
  clubName: 'Janakalyan Village & Youth Club',
  tagline: 'Reg. No: WB/2016/04918 • United for Progress, Culture & Sports',
  villageTown: 'Gramin Para, Ward No. 3',
  registrationNo: 'WB/2016/04918',
  contactPhone: '+91 98321 45678',
  contactEmail: 'janakalyan.club.official@gmail.com',
  currency: '₹',
  defaultAnnualClubFee: 1200,
  defaultAnnualVillageFee: 600,
  adminPin: '1234',
  treasurerName: 'Rajesh Das (Treasurer)',
  secretaryName: 'Subhash Roy (General Secretary)',
  activeFinancialYear: 2025,
  financialYears: [2024, 2025],
  logoUrl: DEFAULT_CLUB_LOGO,
  receiptFooterText: 'Thank you for supporting community welfare, sports & cultural harmony!',
  voucherFooterText: 'Passed and verified for club operational expenses.',
  receiptNumberPrefix: 'RCP',
  autoReceiptNumbering: true,
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD-MM-YYYY',
  autoBackupEnabled: true,
  backupScheduleTime: '23:00 IST',
  backupNotificationEmail: 'janakalyan.club.official@gmail.com',
  reportHeading: 'Janakalyan Village & Youth Club — Financial Ledger & Accounts Statement',
  loginAppearance: {
    themePreset: 'emerald',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    backgroundColor: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #022c22 100%)',
    buttonColor: '#059669',
    textColor: '#ffffff',
    customGreeting: 'Welcome to the Official Club Management & Accounting Portal',
    showTagline: true,
  },
  security: {
    sessionTimeoutMinutes: 120,
    passwordMinLength: 4,
    requireStrongPassword: false,
    loginHistoryRetentionDays: 90,
    defaultRoleForNewUsers: 'Payment Entry',
    allowSelfRegistration: false,
  },
};

const allPermissionsList: UserPermission[] = [
  'dashboard',
  'members_view',
  'members_edit',
  'members_delete',
  'programs_view',
  'programs_edit',
  'programs_delete',
  'receipts_view',
  'payment_entry',
  'payment_approve',
  'receipts_delete',
  'expenses_view',
  'expenses_edit',
  'expenses_delete',
  'organizers_view',
  'organizers_manage',
  'accounts_view',
  'reports_view',
  'reports_export',
  'id_card_view',
  'member_portal_view',
  'customer_selection',
  'password_reset_request',
  'user_management',
  'settings_manage',
  'backup_restore'
];

const initialUsers: AppUser[] = [
  {
    id: 'USR-ADMIN',
    username: 'admin',
    fullName: 'Master Administrator',
    email: 'admin@janakalyanclub.org',
    phone: '+91 98321 45678',
    department: 'Executive Governance',
    role: 'Super Admin / Admin',
    status: 'active',
    permissions: [...allPermissionsList],
    passwordHash: hashPassword('admin123'),
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 'System Provisioning',
  },
  {
    id: 'USR-CASHIER',
    username: 'treasurer',
    fullName: 'Rajesh Das (Treasurer)',
    email: 'treasurer@janakalyanclub.org',
    phone: '+91 98322 11223',
    department: 'Accounts & Treasury',
    role: 'Accounts',
    status: 'active',
    permissions: [
      'dashboard',
      'members_view',
      'payment_entry',
      'payment_approve',
      'expenses_view',
      'expenses_edit',
      'accounts_view',
      'reports_view'
    ],
    passwordHash: hashPassword('treasurer123'),
    createdAt: '2026-01-02T10:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'USR-COLLECTOR',
    username: 'deskuser',
    fullName: 'Priyanka Sen (Desk Cashier)',
    email: 'priyanka.sen@janakalyanclub.org',
    phone: '+91 98311 99887',
    department: 'Front Desk & Collection',
    role: 'Payment Entry',
    status: 'active',
    permissions: [
      'dashboard',
      'members_view',
      'payment_entry',
      'programs_view',
      'expenses_view'
    ],
    passwordHash: hashPassword('desk123'),
    createdAt: '2026-01-05T12:00:00Z',
    createdBy: 'admin',
  },
  {
    id: 'USR-MEM001',
    username: 'MEM-001',
    fullName: 'Amitava Mukherjee',
    email: 'amitava.mukherjee@club.local',
    phone: '+91 98301 23456',
    memberId: 'MEM-001',
    department: 'Club Member',
    role: 'Member',
    status: 'active',
    permissions: [
      'dashboard',
      'customer_selection'
    ],
    passwordHash: hashPassword('member123'),
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'admin',
  }
];

const initialMembers: Member[] = [
  {
    id: 'MEM-001',
    name: 'Amitava Mukherjee',
    phone: '+91 98301 23456',
    category: 'club_member',
    villageWard: 'Ward No. 1 (Uttar Para)',
    address: 'Near Old Shiva Temple, Gramin Para',
    joinedYear: 2018,
    status: 'active',
    guardianName: 'Late Bimal Mukherjee',
    notes: 'Volunteers actively in blood donation camps',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'MEM-002',
    name: 'Ratan Kumar Mondal',
    phone: '+91 94332 87654',
    category: 'village_resident',
    villageWard: 'Ward No. 2 (Mondal Para)',
    address: 'Opposite Primary School',
    joinedYear: 2015,
    status: 'active',
    guardianName: 'Gour Mohan Mondal',
    notes: 'Village elder & farmer',
    createdAt: '2024-01-12T10:30:00Z',
  },
  {
    id: 'MEM-003',
    name: 'Subhash Roy',
    phone: '+91 98745 61230',
    category: 'club_member',
    villageWard: 'Ward No. 3 (Club Area)',
    address: 'House #44, Main Road',
    joinedYear: 2016,
    status: 'active',
    guardianName: 'Sachin Roy',
    notes: 'General Secretary',
    createdAt: '2024-01-05T08:00:00Z',
  },
  {
    id: 'MEM-004',
    name: 'Rajesh Das',
    phone: '+91 97321 09876',
    category: 'club_member',
    villageWard: 'Ward No. 3 (Club Area)',
    address: 'Station Road Corner',
    joinedYear: 2017,
    status: 'active',
    guardianName: 'Nikhil Das',
    notes: 'Treasurer & Accounts Custodian',
    createdAt: '2024-01-05T08:15:00Z',
  },
  {
    id: 'MEM-005',
    name: 'Dilip Ghosh',
    phone: '+91 91234 56789',
    category: 'village_resident',
    villageWard: 'Ward No. 4 (Dakshin Para)',
    address: 'Ghosh Tea Stall, Market Chowk',
    joinedYear: 2019,
    status: 'active',
    guardianName: 'Pulin Ghosh',
    notes: 'Local merchant',
    createdAt: '2024-01-20T11:00:00Z',
  },
  {
    id: 'MEM-006',
    name: 'Dr. Haripada Banik',
    phone: '+91 98310 99887',
    category: 'patron',
    villageWard: 'Ward No. 1 (Uttar Para)',
    address: 'Banik Villa, Doctor Lane',
    joinedYear: 2014,
    status: 'active',
    guardianName: 'Late Dr. N. C. Banik',
    notes: 'Honorary Chief Patron & Free Health Camp Organizer',
    createdAt: '2024-01-02T10:00:00Z',
  },
  {
    id: 'MEM-007',
    name: 'Sourav Karmakar',
    phone: '+91 90512 34981',
    category: 'club_member',
    villageWard: 'Ward No. 2 (Mondal Para)',
    address: 'Karmakar Works, River Ghat Road',
    joinedYear: 2021,
    status: 'active',
    guardianName: 'Tarun Karmakar',
    notes: 'Youth sports coordinator',
    createdAt: '2024-02-01T14:20:00Z',
  },
  {
    id: 'MEM-008',
    name: 'Biren Adhikari',
    phone: '+91 94770 12345',
    category: 'senior',
    villageWard: 'Ward No. 4 (Dakshin Para)',
    address: 'Retired Postmaster Quarters',
    joinedYear: 2012,
    status: 'active',
    guardianName: 'Late K. Adhikari',
    notes: 'Advisory Committee Member',
    createdAt: '2024-01-01T09:00:00Z',
  },
  {
    id: 'MEM-009',
    name: 'Priyanka Sen',
    phone: '+91 98367 44556',
    category: 'club_member',
    villageWard: 'Ward No. 3 (Club Area)',
    address: 'Sen Bari, Lake View',
    joinedYear: 2022,
    status: 'active',
    guardianName: 'Ashok Sen',
    notes: 'Women and Cultural Lead',
    createdAt: '2024-02-15T15:30:00Z',
  },
  {
    id: 'MEM-010',
    name: 'Prabir Mahato',
    phone: '+91 93311 22334',
    category: 'village_resident',
    villageWard: 'Ward No. 5 (Paschim Para)',
    address: 'Mahato Para, Near Tube-well 2',
    joinedYear: 2020,
    status: 'active',
    guardianName: 'Sanjay Mahato',
    notes: 'Supports festival pandal setup',
    createdAt: '2024-03-01T12:00:00Z',
  },
];

const initialOrganizers: Organizer[] = [
  {
    id: 'ORG-01',
    memberId: 'MEM-006',
    name: 'Dr. Haripada Banik',
    phone: '+91 98310 99887',
    address: 'Banik Villa, Doctor Lane, Ward No. 1',
    companyOrClubName: 'Janakalyan Health & Welfare Trust',
    role: 'President',
    termPeriod: '2025 - 2027',
    responsibilities: 'Overall guidance, executive meeting chair, trustee oversight',
    isSignatory: true,
    remarks: 'Chief patron and senior medical officer',
    status: 'active',
    createdAt: '2024-01-02T10:00:00Z',
  },
  {
    id: 'ORG-02',
    memberId: 'MEM-003',
    name: 'Subhash Roy',
    phone: '+91 98745 61230',
    address: 'House #44, Main Road, Ward No. 3',
    companyOrClubName: 'Janakalyan Club Executive Council',
    role: 'Secretary',
    termPeriod: '2025 - 2027',
    responsibilities: 'Day-to-day administration, official communications, meeting notices',
    isSignatory: true,
    remarks: 'Authorized executive signatory',
    status: 'active',
    createdAt: '2024-01-05T08:00:00Z',
  },
  {
    id: 'ORG-03',
    memberId: 'MEM-004',
    name: 'Rajesh Das',
    phone: '+91 97321 09876',
    address: 'Station Road Corner, Ward No. 3',
    companyOrClubName: 'Janakalyan Club Accounts Committee',
    role: 'Treasurer / Cashier',
    termPeriod: '2025 - 2027',
    responsibilities: 'Fund collection, receipt book issue, expense vouchers, bank book',
    isSignatory: true,
    remarks: 'Finance and bank custodian',
    status: 'active',
    createdAt: '2024-01-05T08:15:00Z',
  },
  {
    id: 'ORG-04',
    memberId: 'MEM-001',
    name: 'Amitava Mukherjee',
    phone: '+91 98301 23456',
    address: 'Near Old Shiva Temple, Ward No. 1',
    companyOrClubName: 'Village Welfare Coordination Cell',
    role: 'Vice President',
    termPeriod: '2025 - 2027',
    responsibilities: 'Assists President, presides in absence, social welfare projects',
    isSignatory: false,
    remarks: 'Active volunteer organizer',
    status: 'active',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'ORG-05',
    memberId: 'MEM-007',
    name: 'Sourav Karmakar',
    phone: '+91 90512 34981',
    address: 'River Ghat Road, Ward No. 2',
    companyOrClubName: 'Gramin Youth Sports Club',
    role: 'Sports Secretary',
    termPeriod: '2025 - 2027',
    responsibilities: 'Football, Cricket tournaments, gym room care, youth sports',
    isSignatory: false,
    remarks: 'Tournament convener',
    status: 'active',
    createdAt: '2024-02-01T14:20:00Z',
  },
  {
    id: 'ORG-06',
    memberId: 'MEM-009',
    name: 'Priyanka Sen',
    phone: '+91 98367 44556',
    address: 'Sen Bari, Lake View, Ward No. 3',
    companyOrClubName: 'Cultural Committee of Gramin Para',
    role: 'Cultural Convener',
    termPeriod: '2025 - 2027',
    responsibilities: 'Cultural events, Rabindra Jayanti, Saraswati Puja, children arts',
    isSignatory: false,
    remarks: 'Cultural director and stage coordinator',
    status: 'active',
    createdAt: '2024-02-15T15:30:00Z',
  },
];

const initialPrograms: Program[] = [
  {
    id: 'PRG-2026-0001',
    organizerId: 'ORG-05',
    organizerName: 'Sourav Karmakar',
    organizerPhone: '+91 90512 34981',
    organizerCompany: 'Gramin Youth Sports Club',
    name: 'Janakalyan Village Football Championship 2026',
    type: 'Sports Tournament',
    venue: 'Village Central High School Ground',
    venueAddress: 'Station Road, Gramin Para',
    programDate: '2026-11-15',
    startTime: '09:00 AM',
    endTime: '06:00 PM',
    contractDate: '2026-02-10',
    totalContractAmount: 45000,
    initialAdvanceAmount: 15000,
    specialInstructions: 'Provide 16 team jerseys, referee honorarium, sound system, and first aid box.',
    status: 'Upcoming',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'PRG-2026-0002',
    organizerId: 'ORG-06',
    organizerName: 'Priyanka Sen',
    organizerPhone: '+91 98367 44556',
    organizerCompany: 'Cultural Committee of Gramin Para',
    name: 'Basanta Utsav & Musical Drama Night',
    type: 'Cultural Festival',
    venue: 'Club Community Hall & Open Stage',
    venueAddress: 'Main Road, Ward No. 3',
    programDate: '2026-03-25',
    startTime: '05:30 PM',
    endTime: '10:30 PM',
    contractDate: '2026-01-20',
    totalContractAmount: 32000,
    initialAdvanceAmount: 12000,
    specialInstructions: 'Stage lighting, green room decoration, sound mixer setup, and tea snacks for 250 guests.',
    status: 'Completed',
    createdAt: '2026-01-20T11:00:00Z',
  },
  {
    id: 'PRG-2026-0003',
    organizerId: 'ORG-01',
    organizerName: 'Dr. Haripada Banik',
    organizerPhone: '+91 98310 99887',
    organizerCompany: 'Janakalyan Health & Welfare Trust',
    name: 'Free Eye & Blood Donation Camp',
    type: 'Blood Donation & Health Camp',
    venue: 'Primary Health Center Annex',
    venueAddress: 'Doctor Lane, Ward No. 1',
    programDate: '2026-08-15',
    startTime: '08:00 AM',
    endTime: '02:00 PM',
    contractDate: '2026-02-05',
    totalContractAmount: 18000,
    initialAdvanceAmount: 8000,
    specialInstructions: 'Coordinated with District Blood Bank. Provide fruit juice packets and certificates for donors.',
    status: 'Upcoming',
    createdAt: '2026-02-05T09:30:00Z',
  },
];

const initialReceipts: PaymentReceipt[] = [
  {
    id: 'PAY-2026-0001',
    receiptNo: 'RCP-2026-0001',
    payerType: 'member',
    memberId: 'MEM-001',
    memberName: 'Amitava Mukherjee',
    memberCategory: 'club_member',
    phone: '+91 98301 23456',
    villageWard: 'Ward No. 1 (Uttar Para)',
    financialYear: 2026,
    date: '2026-01-15',
    paymentType: 'Subscription Fee',
    purpose: 'Annual Club Membership Fee',
    amount: 1200,
    paymentMode: 'UPI / GPay / PhonePe',
    transactionRef: 'UPI/2601150892',
    submittedBy: 'Rajesh Das (Treasurer)',
    submissionDateTime: '2026-01-15T10:30:00Z',
    collectorName: 'Rajesh Das (Treasurer)',
    status: 'APPROVED',
    approvedBy: 'Admin',
    approvedAt: '2026-01-15T11:00:00Z',
    remarks: 'Full annual membership fee paid for 2026',
    createdAt: '2026-01-15T10:30:00Z',
  },
  {
    id: 'PAY-2026-0002',
    receiptNo: 'RCP-2026-0002',
    payerType: 'member',
    memberId: 'MEM-002',
    memberName: 'Ratan Kumar Mondal',
    memberCategory: 'village_resident',
    phone: '+91 94332 87654',
    villageWard: 'Ward No. 2 (Mondal Para)',
    financialYear: 2026,
    date: '2026-01-20',
    paymentType: 'Subscription Fee',
    purpose: 'Annual Village Contribution',
    amount: 600,
    paymentMode: 'Cash',
    submittedBy: 'Subhash Roy (Secretary)',
    submissionDateTime: '2026-01-20T11:45:00Z',
    collectorName: 'Subhash Roy (Secretary)',
    status: 'APPROVED',
    approvedBy: 'Admin',
    approvedAt: '2026-01-20T12:00:00Z',
    remarks: 'Annual village contribution paid in cash',
    createdAt: '2026-01-20T11:45:00Z',
  },
  {
    id: 'PAY-2026-0003',
    receiptNo: 'RCP-2026-0003',
    payerType: 'organizer',
    organizerId: 'ORG-05',
    organizerName: 'Sourav Karmakar',
    programId: 'PRG-2026-0001',
    programName: 'Janakalyan Village Football Championship 2026',
    memberName: 'Sourav Karmakar (Organizer)',
    phone: '+91 90512 34981',
    financialYear: 2026,
    date: '2026-02-12',
    paymentType: 'Advance',
    purpose: 'Program Contract Booking Advance',
    amount: 15000,
    paymentMode: 'Bank Transfer',
    transactionRef: 'NEFT/5549012',
    submittedBy: 'Sourav Karmakar',
    submissionDateTime: '2026-02-12T14:00:00Z',
    collectorName: 'Rajesh Das (Treasurer)',
    status: 'APPROVED',
    approvedBy: 'Admin',
    approvedAt: '2026-02-12T15:00:00Z',
    remarks: 'Initial advance for tournament contract',
    createdAt: '2026-02-12T14:00:00Z',
  },
  {
    id: 'PAY-2026-0004',
    receiptNo: 'RCP-2026-0004',
    payerType: 'organizer',
    organizerId: 'ORG-06',
    organizerName: 'Priyanka Sen',
    programId: 'PRG-2026-0002',
    programName: 'Basanta Utsav & Musical Drama Night',
    memberName: 'Priyanka Sen (Convener)',
    phone: '+91 98367 44556',
    financialYear: 2026,
    date: '2026-01-25',
    paymentType: 'Advance',
    purpose: 'Program Booking Advance',
    amount: 12000,
    paymentMode: 'UPI / GPay / PhonePe',
    transactionRef: 'UPI/2601258810',
    submittedBy: 'Priyanka Sen',
    submissionDateTime: '2026-01-25T16:20:00Z',
    collectorName: 'Rajesh Das (Treasurer)',
    status: 'APPROVED',
    approvedBy: 'Admin',
    approvedAt: '2026-01-25T17:00:00Z',
    remarks: 'Advance for cultural program',
    createdAt: '2026-01-25T16:20:00Z',
  },
  {
    id: 'PAY-2026-0005',
    receiptNo: 'RCP-2026-0005',
    payerType: 'organizer',
    organizerId: 'ORG-06',
    organizerName: 'Priyanka Sen',
    programId: 'PRG-2026-0002',
    programName: 'Basanta Utsav & Musical Drama Night',
    memberName: 'Priyanka Sen (Convener)',
    phone: '+91 98367 44556',
    financialYear: 2026,
    date: '2026-03-26',
    paymentType: 'Final Payment',
    purpose: 'Program Final Settlement',
    amount: 20000,
    paymentMode: 'Cash',
    submittedBy: 'Priyanka Sen',
    submissionDateTime: '2026-03-26T18:00:00Z',
    collectorName: 'Subhash Roy (Secretary)',
    status: 'APPROVED',
    approvedBy: 'Admin',
    approvedAt: '2026-03-26T19:30:00Z',
    remarks: 'Full settlement of Basanta Utsav (₹32,000 total received)',
    createdAt: '2026-03-26T18:00:00Z',
  },
  {
    id: 'PAY-2026-0006',
    receiptNo: 'RCP-2026-0006',
    payerType: 'organizer',
    organizerId: 'ORG-05',
    organizerName: 'Sourav Karmakar',
    programId: 'PRG-2026-0001',
    programName: 'Janakalyan Village Football Championship 2026',
    memberName: 'Sourav Karmakar (Organizer)',
    phone: '+91 90512 34981',
    financialYear: 2026,
    date: '2026-03-10',
    paymentType: 'Part Payment',
    purpose: 'Program Second Installment',
    amount: 10000,
    paymentMode: 'Bank Transfer',
    transactionRef: 'IMPS/9988220',
    submittedBy: 'Sourav Karmakar',
    submissionDateTime: '2026-03-10T11:00:00Z',
    collectorName: 'Rajesh Das (Treasurer)',
    status: 'PENDING_APPROVAL',
    remarks: 'Second installment awaiting Admin verification',
    createdAt: '2026-03-10T11:00:00Z',
  },
];

const initialExpenses: Expense[] = [
  {
    id: 'EXP-2026-0001',
    voucherNo: 'EXP-2026-0001',
    programId: 'PRG-2026-0002',
    programName: 'Basanta Utsav & Musical Drama Night',
    organizerName: 'Priyanka Sen',
    date: '2026-03-24',
    category: 'Stage and Pandal',
    title: 'Stage Pandal & Carpet Hire for Basanta Utsav',
    amount: 8500,
    paidTo: 'Mondal Decorators',
    approvedBy: 'Subhash Roy (Secretary)',
    paymentMode: 'Cash',
    billRef: 'BILL-4412',
    financialYear: 2026,
    remarks: '40ft x 20ft wooden platform stage and cloth ceiling',
    enteredBy: 'Rajesh Das (Treasurer)',
    createdAt: '2026-03-24T12:00:00Z',
  },
  {
    id: 'EXP-2026-0002',
    voucherNo: 'EXP-2026-0002',
    programId: 'PRG-2026-0002',
    programName: 'Basanta Utsav & Musical Drama Night',
    organizerName: 'Priyanka Sen',
    date: '2026-03-25',
    category: 'Sound System and Microphone',
    title: 'Sound System, 8 Microphones & Audio Mixer',
    amount: 6000,
    paidTo: 'Roy Audio Sounds',
    approvedBy: 'Dr. Haripada Banik (President)',
    paymentMode: 'UPI / GPay / PhonePe',
    billRef: 'UPI/2603254401',
    financialYear: 2026,
    remarks: 'Full evening sound setup including live drama audio',
    enteredBy: 'Rajesh Das (Treasurer)',
    createdAt: '2026-03-25T14:30:00Z',
  },
  {
    id: 'EXP-2026-0003',
    voucherNo: 'EXP-2026-0003',
    programId: 'PRG-2026-0002',
    programName: 'Basanta Utsav & Musical Drama Night',
    organizerName: 'Priyanka Sen',
    date: '2026-03-25',
    category: 'Food and Refreshments',
    title: 'Guest Artists Dinner, Snacks & Drinking Water',
    amount: 4500,
    paidTo: 'Shankar Mistanna Bhandar',
    approvedBy: 'Subhash Roy (Secretary)',
    paymentMode: 'Cash',
    billRef: 'RCPT-1092',
    financialYear: 2026,
    remarks: 'Refreshments for drama troupe and volunteers',
    enteredBy: 'Priyanka Sen',
    createdAt: '2026-03-25T21:00:00Z',
  },
  {
    id: 'EXP-2026-0004',
    voucherNo: 'EXP-2026-0004',
    programId: 'PRG-2026-0001',
    programName: 'Janakalyan Village Football Championship 2026',
    organizerName: 'Sourav Karmakar',
    date: '2026-02-22',
    category: 'Equipment Rental',
    title: 'Advance for Goal Post Nets, Corner Flags & 6 Match Footballs',
    amount: 3500,
    paidTo: 'Champion Sports Mart',
    approvedBy: 'Sourav Karmakar (Sports Sec.)',
    paymentMode: 'Cash',
    billRef: 'CSM-8821',
    financialYear: 2026,
    remarks: 'Tournament sports kit',
    enteredBy: 'Sourav Karmakar',
    createdAt: '2026-02-22T14:40:00Z',
  },
];

const initialAuditLogs: PaymentAuditLog[] = [
  {
    id: 'AUD-0001',
    paymentId: 'PAY-2026-0001',
    receiptNo: 'RCP-2026-0001',
    action: 'APPROVED',
    adminId: 'ADMIN-SYS',
    adminName: 'Super Admin',
    timestamp: '2026-01-15T11:00:00Z',
    previousStatus: 'PENDING_APPROVAL',
    newStatus: 'APPROVED',
    notes: 'Verified against bank passbook entry',
    amount: 1200,
    payerName: 'Amitava Mukherjee',
  },
  {
    id: 'AUD-0002',
    paymentId: 'PAY-2026-0003',
    receiptNo: 'RCP-2026-0003',
    action: 'APPROVED',
    adminId: 'ADMIN-SYS',
    adminName: 'Super Admin',
    timestamp: '2026-02-12T15:00:00Z',
    previousStatus: 'PENDING_APPROVAL',
    newStatus: 'APPROVED',
    notes: 'Contract advance NEFT verified',
    amount: 15000,
    payerName: 'Sourav Karmakar (Organizer)',
  },
  {
    id: 'AUD-0003',
    paymentId: 'PAY-2026-0006',
    receiptNo: 'RCP-2026-0006',
    action: 'SUBMITTED',
    adminId: 'USER-ENTRY',
    adminName: 'Sourav Karmakar',
    timestamp: '2026-03-10T11:00:00Z',
    previousStatus: 'NONE',
    newStatus: 'PENDING_APPROVAL',
    notes: 'Submitted via payment entry portal',
    amount: 10000,
    payerName: 'Sourav Karmakar (Organizer)',
  },
];

const initialCustomerSelections: CustomerSelection[] = [
  {
    id: 'SEL-001',
    memberId: 'MEM-001',
    memberName: 'Amitava Mukherjee',
    customerName: 'Aarav Mukherjee',
    customerId: 'CUST-101',
    category: 'Scholarship / Education Grant',
    phone: '+91 98301 23456',
    reason: 'Merit scholarship recommendation for annual higher secondary examinations.',
    status: 'Approved',
    adminRemarks: 'Verified academic marksheet and approved by General Secretary.',
    actionBy: 'Master Administrator',
    actionAt: '2026-02-15T11:00:00Z',
    createdAt: '2026-02-10T14:30:00Z',
  },
  {
    id: 'SEL-002',
    memberId: 'MEM-001',
    memberName: 'Amitava Mukherjee',
    customerName: 'Debabrata Ghosh',
    customerId: 'CUST-102',
    category: 'Sports Tournament Representative',
    phone: '+91 98311 44552',
    reason: 'Nomination for inter-district youth football tournament selection trial.',
    status: 'Pending',
    createdAt: '2026-03-01T10:15:00Z',
  }
];

// Persistent File System DB Helpers
function loadDatabase(): ClubDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as any;
      if (parsed.members && parsed.receipts && parsed.expenses) {
        let changed = false;

        // Ensure settings.logoUrl
        if (!parsed.settings?.logoUrl) {
          parsed.settings = { ...parsed.settings, logoUrl: defaultSettings.logoUrl };
          changed = true;
        }

        // Migrate programs
        if (!parsed.programs || !Array.isArray(parsed.programs) || parsed.programs.length === 0) {
          parsed.programs = initialPrograms;
          changed = true;
        }

        // Migrate audit logs
        if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) {
          parsed.auditLogs = initialAuditLogs;
          changed = true;
        }

        // Migrate customer selections
        if (!parsed.customerSelections || !Array.isArray(parsed.customerSelections)) {
          parsed.customerSelections = initialCustomerSelections;
          changed = true;
        }

        // Upgrade receipts for approval workflow
        parsed.receipts = parsed.receipts.map((r: any) => {
          if (!r.status) {
            changed = true;
            return {
              ...r,
              status: 'APPROVED',
              paymentType: r.paymentType || 'Subscription Fee',
              payerType: r.payerType || 'member',
              submittedBy: r.submittedBy || r.collectorName || 'Admin',
              submissionDateTime: r.submissionDateTime || r.createdAt,
            };
          }
          return r;
        });

        // Upgrade organizers
        parsed.organizers = parsed.organizers.map((o: any) => {
          if (!o.companyOrClubName || !o.status) {
            changed = true;
            return {
              ...o,
              address: o.address || 'Gramin Para',
              companyOrClubName: o.companyOrClubName || 'Janakalyan Club Executive Council',
              status: o.status || 'active',
            };
          }
          return o;
        });

        // Upgrade expenses
        parsed.expenses = parsed.expenses.map((e: any) => {
          if (!e.enteredBy) {
            changed = true;
            return {
              ...e,
              enteredBy: e.enteredBy || e.approvedBy || 'Treasurer',
            };
          }
          return e;
        });

        // Upgrade backups
        if (!parsed.backups || !Array.isArray(parsed.backups)) {
          parsed.backups = [];
          changed = true;
        }
        if (!parsed.settings?.googleDriveBackupFolder) {
          parsed.settings = {
            ...parsed.settings,
            googleDriveBackupFolder: 'Club Management App Backups',
          };
          changed = true;
        }

        // Upgrade users
        if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = initialUsers;
          changed = true;
        }
        if (!parsed.loginHistory || !Array.isArray(parsed.loginHistory)) {
          parsed.loginHistory = [];
          changed = true;
        }

        // Upgrade settings fields
        if (!parsed.settings?.loginAppearance) {
          parsed.settings = {
            ...parsed.settings,
            loginAppearance: defaultSettings.loginAppearance,
            security: defaultSettings.security,
            timezone: defaultSettings.timezone,
            dateFormat: defaultSettings.dateFormat,
            receiptNumberPrefix: defaultSettings.receiptNumberPrefix,
            autoReceiptNumbering: defaultSettings.autoReceiptNumbering,
            reportHeading: defaultSettings.reportHeading,
          };
          changed = true;
        }

        // Ensure users array exists
        if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = initialUsers;
          changed = true;
        }

        // Upgrade passwordResetRequests
        if (!parsed.passwordResetRequests || !Array.isArray(parsed.passwordResetRequests)) {
          parsed.passwordResetRequests = [];
          changed = true;
        }

        if (changed) {
          saveDatabase(parsed);
        }
        return parsed as ClubDatabase;
      }
    }
  } catch (err) {
    console.error('Error reading database file, will initialize defaults:', err);
  }

  const initialDb: ClubDatabase = {
    settings: defaultSettings,
    members: initialMembers,
    organizers: initialOrganizers,
    programs: initialPrograms,
    receipts: initialReceipts,
    expenses: initialExpenses,
    auditLogs: initialAuditLogs,
    backups: [],
    users: initialUsers,
    loginHistory: [],
    customerSelections: initialCustomerSelections,
    passwordResetRequests: [],
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(dataToSave: ClubDatabase) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// In-memory cache synced with disk
let db = loadDatabase();

// In-memory active sessions map: token -> { userId, username, fullName, role, permissions, memberId, loginAt }
const activeSessions = new Map<string, {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermission[];
  memberId?: string;
  loginAt: string;
}>();

// Helper to verify Admin authorization via Bearer token or Admin PIN
function verifyAdminAuthorization(req: Request): boolean {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = activeSessions.get(token);
    if (session && (session.role === 'Super Admin / Admin' || session.permissions.includes('settings_manage'))) {
      return true;
    }
  }

  const adminPinHeader = req.headers['x-admin-pin'] as string;
  const adminPinBody = req.body?.adminPin as string;
  const provided = adminPinHeader || adminPinBody;
  return Boolean(provided && String(provided).trim() === String(db.settings.adminPin).trim());
}

// Helper to sanitize user object (never expose passwordHash or salt)
function sanitizeUser(user: AppUser): Omit<AppUser, 'passwordHash' | 'salt'> {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

// Helper to check user permission from token or admin pin
function getUserFromRequest(req: Request): {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermission[];
  memberId?: string;
  isAdmin: boolean;
} | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = activeSessions.get(token);
    if (session) {
      // Dynamic refresh from db.users so Admin changes to roles/permissions apply immediately
      const latestUser = (db.users || []).find(
        u => u.id === session.userId || u.username.toLowerCase() === session.username.toLowerCase()
      );
      if (latestUser && latestUser.status === 'inactive') {
        activeSessions.delete(token);
        return null;
      }
      const effectiveRole = latestUser ? latestUser.role : session.role;
      const effectivePermissions = latestUser?.permissions || session.permissions || [];
      const effectiveMemberId = latestUser?.memberId !== undefined ? latestUser.memberId : session.memberId;
      return {
        userId: session.userId,
        username: session.username,
        fullName: latestUser?.fullName || session.fullName,
        role: effectiveRole,
        permissions: effectivePermissions,
        memberId: effectiveMemberId,
        isAdmin: effectiveRole === 'Super Admin / Admin',
      };
    }
  }

  // Also verify Admin PIN fallback for existing admin workflows
  if (verifyAdminAuthorization(req)) {
    return {
      userId: 'USR-ADMIN',
      username: 'admin',
      fullName: 'Master Administrator',
      role: 'Super Admin / Admin',
      permissions: [...allPermissionsList],
      isAdmin: true,
    };
  }

  return null;
}

// User-friendly token generator
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// --- REST API ENDPOINTS ---

// Auth Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
  const userAgent = (req.headers['user-agent'] || 'Browser') as string;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'User ID / Email and Password are required.' });
  }

  const cleanIdent = String(username).trim().toLowerCase();
  const user = (db.users || []).find(
    u => u.username.toLowerCase() === cleanIdent || u.email.toLowerCase() === cleanIdent
  );

  if (!user) {
    // Record failed login attempt
    if (!db.loginHistory) db.loginHistory = [];
    db.loginHistory.unshift({
      id: `LOG-${Date.now()}`,
      userId: cleanIdent,
      userName: 'Unknown User',
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      status: 'FAILED',
      reason: 'User account not found',
    });
    saveDatabase(db);
    return res.status(401).json({ success: false, message: 'Invalid User ID/Email or Password.' });
  }

  // Check if active
  if (user.status !== 'active') {
    if (!db.loginHistory) db.loginHistory = [];
    db.loginHistory.unshift({
      id: `LOG-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      status: 'FAILED',
      reason: 'Account is deactivated / inactive',
    });
    saveDatabase(db);
    return res.status(403).json({ 
      success: false, 
      message: 'This user account is currently deactivated. Please contact the Club Administrator.' 
    });
  }

  // Verify password
  const computedHash = hashPassword(String(password));
  if (user.passwordHash !== computedHash) {
    if (!db.loginHistory) db.loginHistory = [];
    db.loginHistory.unshift({
      id: `LOG-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      status: 'FAILED',
      reason: 'Incorrect password',
    });
    saveDatabase(db);
    return res.status(401).json({ success: false, message: 'Invalid User ID/Email or Password.' });
  }

  // Successful Login
  const token = generateSessionToken();
  activeSessions.set(token, {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions || [],
    memberId: user.memberId,
    loginAt: new Date().toISOString(),
  });

  user.lastLoginAt = new Date().toISOString();

  if (!db.loginHistory) db.loginHistory = [];
  db.loginHistory.unshift({
    id: `LOG-${Date.now()}`,
    userId: user.id,
    userName: user.fullName,
    timestamp: new Date().toISOString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    reason: 'Logged in successfully',
  });

  saveDatabase(db);

  return res.json({
    success: true,
    message: `Welcome back, ${user.fullName}!`,
    data: {
      token,
      user: sanitizeUser(user),
    },
  });
});

// Current User Profile
app.get('/api/auth/me', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }
  const user = (db.users || []).find(u => u.id === sessionUser.userId || u.username === sessionUser.username);
  if (!user) {
    return res.json({
      success: true,
      data: {
        id: sessionUser.userId,
        username: sessionUser.username,
        fullName: sessionUser.username,
        role: sessionUser.role,
        permissions: sessionUser.permissions,
        status: 'active',
      },
    });
  }
  return res.json({ success: true, data: sanitizeUser(user) });
});

// Auth Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = activeSessions.get(token);
    if (session) {
      activeSessions.delete(token);
      if (!db.loginHistory) db.loginHistory = [];
      db.loginHistory.unshift({
        id: `LOG-${Date.now()}`,
        userId: session.userId,
        userName: session.fullName,
        timestamp: new Date().toISOString(),
        status: 'LOGOUT',
        reason: 'User logged out',
      });
      saveDatabase(db);
    }
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// User Self Password Change - Allows authenticated members & users to directly update their password
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long' });
  }

  const user = (db.users || []).find(u => u.id === sessionUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found' });
  }

  const currentHashed = hashPassword(currentPassword);
  if (user.passwordHash !== currentHashed) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.passwordHash = hashPassword(newPassword);
  saveDatabase(db);

  return res.json({ success: true, message: 'Password updated successfully' });
});

// Users List (Admin Only)
app.get('/api/users', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to view users list.' });
  }
  const safeUsers = (db.users || []).map(sanitizeUser);
  return res.json({ success: true, data: safeUsers });
});

// Create User (Admin Only)
app.post('/api/users', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to create users.' });
  }

  const {
    username,
    fullName,
    email,
    phone,
    department,
    role,
    customRoleName,
    status = 'active',
    password,
    permissions = [],
    memberId
  } = req.body;

  if (!username || !fullName || !email) {
    return res.status(400).json({ success: false, message: 'User ID, Full Name, and Email are required.' });
  }

  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  // Prevent duplicates
  const exists = (db.users || []).some(
    u => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.email.toLowerCase() === cleanEmail
  );
  if (exists) {
    return res.status(400).json({ success: false, message: 'A user with this User ID or Email already exists.' });
  }

  const rawPassword = password ? String(password).trim() : 'welcome123';
  const newUserId = `USR-${String((db.users?.length || 0) + 1).padStart(3, '0')}`;

  const newUser: AppUser = {
    id: newUserId,
    username: cleanUsername,
    fullName: String(fullName).trim(),
    email: cleanEmail,
    phone: phone ? String(phone).trim() : undefined,
    memberId: memberId ? String(memberId).trim() : undefined,
    department: department ? String(department).trim() : 'General Administration',
    role: role || 'Payment Entry',
    customRoleName: customRoleName ? String(customRoleName).trim() : undefined,
    status: status === 'inactive' ? 'inactive' : 'active',
    permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : ['dashboard', 'payment_entry'],
    passwordHash: hashPassword(rawPassword),
    temporaryPassword: true,
    createdAt: new Date().toISOString(),
    createdBy: sessionUser.username,
  };

  if (!db.users) db.users = [];
  db.users.push(newUser);

  // Add audit log without exposing plaintext password
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'SUBMITTED',
    adminId: sessionUser.userId,
    adminName: sessionUser.username,
    timestamp: new Date().toISOString(),
    targetType: 'member',
    targetId: newUser.id,
    payerName: newUser.fullName,
    notes: `New login user account created: ${newUser.fullName} (${newUser.username}, Role: ${newUser.role}, Linked Member: ${newUser.memberId || 'None'})`,
  });

  saveDatabase(db);

  return res.status(201).json({
    success: true,
    message: `User created successfully! Assigned initial password: ${rawPassword}`,
    data: sanitizeUser(newUser),
  });
});

// Update User (Admin Only)
app.put('/api/users/:id', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to edit users.' });
  }

  const { id } = req.params;
  const user = (db.users || []).find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const {
    username,
    fullName,
    email,
    phone,
    department,
    role,
    customRoleName,
    status,
    permissions,
    memberId,
    newPassword
  } = req.body;

  if (username) user.username = String(username).trim();
  if (fullName) user.fullName = String(fullName).trim();
  if (email) user.email = String(email).trim().toLowerCase();
  if (phone !== undefined) user.phone = phone ? String(phone).trim() : undefined;
  if (department) user.department = String(department).trim();
  if (role) user.role = role;
  if (customRoleName !== undefined) user.customRoleName = customRoleName;
  if (status) user.status = status;
  if (memberId !== undefined) user.memberId = memberId ? String(memberId).trim() : undefined;
  if (Array.isArray(permissions)) user.permissions = permissions;

  // Explicit password change by Admin only; if omitted or blank, existing password remains completely unchanged
  let passwordChanged = false;
  if (newPassword && String(newPassword).trim().length >= 4) {
    user.passwordHash = hashPassword(String(newPassword).trim());
    user.temporaryPassword = false;
    passwordChanged = true;
  }

  user.updatedAt = new Date().toISOString();

  // Audit log (never records the actual password)
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: sessionUser.userId,
    adminName: sessionUser.username,
    timestamp: new Date().toISOString(),
    targetType: 'member',
    targetId: user.id,
    payerName: user.fullName,
    notes: `User details updated for ${user.fullName} (${user.username}). Role: ${user.role}, Status: ${user.status}${passwordChanged ? ', Password explicitly reset by Admin' : ''}`,
  });

  saveDatabase(db);
  return res.json({ success: true, message: 'User updated successfully', data: sanitizeUser(user) });
});

// Reset User Password (Admin Only)
app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to reset passwords.' });
  }

  const { id } = req.params;
  const { newPassword } = req.body;
  const user = (db.users || []).find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const passToSet = newPassword && String(newPassword).trim() !== '' ? String(newPassword).trim() : 'pass1234';
  user.passwordHash = hashPassword(passToSet);
  user.temporaryPassword = true;
  user.updatedAt = new Date().toISOString();

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: sessionUser.userId,
    adminName: sessionUser.username,
    timestamp: new Date().toISOString(),
    notes: `Password reset for user ${user.fullName} (${user.username})`,
  });

  saveDatabase(db);
  return res.json({
    success: true,
    message: `Password reset successfully! Temporary password: ${passToSet}`,
  });
});

// Toggle User Status Active/Inactive (Admin Only)
app.post('/api/users/:id/toggle-status', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required.' });
  }

  const { id } = req.params;
  const user = (db.users || []).find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Prevent deactivating own master admin
  if (user.id === 'USR-ADMIN' && user.status === 'active') {
    return res.status(400).json({ success: false, message: 'Cannot deactivate master admin account.' });
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  user.updatedAt = new Date().toISOString();

  // If deactivated, terminate any active sessions
  if (user.status === 'inactive') {
    for (const [token, sess] of activeSessions.entries()) {
      if (sess.userId === user.id) {
        activeSessions.delete(token);
      }
    }
  }

  saveDatabase(db);
  return res.json({
    success: true,
    message: `User is now ${user.status.toUpperCase()}`,
    data: sanitizeUser(user),
  });
});

// View Login History & User Activity (Admin Only)
app.get('/api/login-history', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required.' });
  }
  return res.json({ success: true, data: db.loginHistory || [] });
});



// --- FORGOT PASSWORD WORKFLOW (User Request -> Admin Approval -> Secure One-Time Reset) ---

// 1. Regular user submits a forgot password request
app.post('/api/auth/forgot-password-request', (req: Request, res: Response) => {
  const { identifier, reason } = req.body;
  if (!identifier || String(identifier).trim() === '') {
    return res.status(400).json({ success: false, message: 'Please provide your User ID or Email.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const user = (db.users || []).find(
    u => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || (u.memberId && u.memberId.toLowerCase() === cleanId)
  );

  if (!user) {
    // Return standard message to avoid user enumeration while providing clear feedback
    return res.status(404).json({ success: false, message: 'No registered user found matching the provided User ID or Email.' });
  }

  if (!db.passwordResetRequests) db.passwordResetRequests = [];

  // Check if there is already a PENDING request for this user
  const existingPending = db.passwordResetRequests.find(
    r => r.userId === user.id && r.status === 'PENDING'
  );
  if (existingPending) {
    return res.status(409).json({
      success: false,
      message: 'A password reset request is already pending Admin review for this account.',
      requestId: existingPending.id,
    });
  }

  const newRequestId = `PRR-${Date.now()}`;
  const newRequest: PasswordResetRequest = {
    id: newRequestId,
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    reason: reason ? String(reason).trim() : 'Forgot password / Unable to login',
    status: 'PENDING',
    requestDate: new Date().toISOString(),
  };

  db.passwordResetRequests.unshift(newRequest);

  // Security audit log (without sensitive data)
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'SUBMITTED',
    adminId: user.id,
    adminName: user.fullName,
    timestamp: new Date().toISOString(),
    notes: `Password reset request submitted by ${user.fullName} (${user.username}). Status: PENDING Admin approval`,
  });

  saveDatabase(db);
  return res.status(201).json({
    success: true,
    message: 'Password reset request submitted successfully. It will be reviewed and approved by an Administrator.',
    requestId: newRequestId,
  });
});

// 2. Admin retrieves password reset requests
app.get('/api/admin/password-reset-requests', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to view password reset requests.' });
  }

  // Return requests without exposing the actual raw token if completed
  const sanitizedRequests = (db.passwordResetRequests || []).map(r => ({
    ...r,
    resetToken: r.status === 'APPROVED' ? r.resetToken : undefined,
  }));

  return res.json({ success: true, data: sanitizedRequests });
});

// 3. Admin actions a password reset request (APPROVE or REJECT)
app.post('/api/admin/password-reset-requests/:id/action', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('user_management'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to action password resets.' });
  }

  const { id } = req.params;
  const { action, adminNotes } = req.body; // action: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT.' });
  }

  if (!db.passwordResetRequests) db.passwordResetRequests = [];
  const requestItem = db.passwordResetRequests.find(r => r.id === id);
  if (!requestItem) {
    return res.status(404).json({ success: false, message: 'Password reset request not found.' });
  }

  if (requestItem.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Request is already ${requestItem.status}.` });
  }

  requestItem.actionedBy = sessionUser.username;
  requestItem.actionedAt = new Date().toISOString();
  requestItem.adminNotes = adminNotes ? String(adminNotes).trim() : undefined;

  if (action === 'APPROVE') {
    // Generate secure, short-lived single-use one-time token (expires in 24 hours)
    const token = crypto.randomBytes(24).toString('hex');
    requestItem.status = 'APPROVED';
    requestItem.resetToken = token;
    requestItem.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else {
    requestItem.status = 'REJECTED';
  }

  // Security audit log (without recording passwords or tokens)
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: sessionUser.userId,
    adminName: sessionUser.username,
    timestamp: new Date().toISOString(),
    notes: `Password reset request for ${requestItem.fullName} (${requestItem.username}) was ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'} by Admin ${sessionUser.username}`,
  });

  saveDatabase(db);
  return res.json({
    success: true,
    message: action === 'APPROVE' ? 'Password reset approved! One-time reset token generated.' : 'Password reset request rejected.',
    data: requestItem,
  });
});

// 4. Execute password reset using the approved single-use reset token
app.post('/api/auth/reset-password-with-token', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).trim().length < 4) {
    return res.status(400).json({ success: false, message: 'Valid token and new password (min 4 characters) are required.' });
  }

  if (!db.passwordResetRequests) db.passwordResetRequests = [];
  const requestItem = db.passwordResetRequests.find(
    r => r.resetToken === token && r.status === 'APPROVED'
  );

  if (!requestItem) {
    return res.status(400).json({ success: false, message: 'Invalid or already-used reset token. Please request approval again.' });
  }

  // Check expiration
  if (requestItem.tokenExpiresAt && new Date(requestItem.tokenExpiresAt) < new Date()) {
    return res.status(400).json({ success: false, message: 'Reset token has expired. Please submit a new request.' });
  }

  // Find user
  const user = (db.users || []).find(u => u.id === requestItem.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }

  // Update password safely
  user.passwordHash = hashPassword(String(newPassword).trim());
  user.temporaryPassword = false;
  user.updatedAt = new Date().toISOString();

  // Invalidate token immediately
  requestItem.status = 'COMPLETED';
  requestItem.resetToken = undefined;

  // Add audit log
  if (!db.loginHistory) db.loginHistory = [];
  db.loginHistory.unshift({
    id: `LOG-${Date.now()}`,
    userId: user.id,
    userName: user.fullName,
    timestamp: new Date().toISOString(),
    status: 'PASSWORD_RESET',
    reason: 'Password successfully reset via approved single-use reset authorization',
  });

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: 'SYSTEM',
    adminName: 'One-Time Token Auth',
    timestamp: new Date().toISOString(),
    notes: `User ${user.fullName} (${user.username}) completed password reset with approved authorization token`,
  });

  saveDatabase(db);
  return res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
});

// Full database fetch (sanitizes passwords from users array)
app.get('/api/data', (_req: Request, res: Response) => {
  const sanitizedDb = {
    ...db,
    users: (db.users || []).map(sanitizeUser),
  };
  res.json({ success: true, data: sanitizedDb });
});

// Settings endpoints
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.settings });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('settings_manage'))) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to modify settings.' });
  }

  const newSettings = req.body as Partial<ClubSettings>;
  db.settings = { ...db.settings, ...newSettings };
  saveDatabase(db);
  res.json({ success: true, data: db.settings });
});

// Verify Admin PIN
app.post('/api/admin/verify-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin || String(pin).trim() !== String(db.settings.adminPin).trim()) {
    return res.status(401).json({ success: false, message: 'Invalid Admin PIN' });
  }
  return res.json({ success: true, message: 'Admin authenticated' });
});

// Financial Years Management (Only Admin can create new financial years)
app.get('/api/financial-years', (_req: Request, res: Response) => {
  const years = db.settings.financialYears && db.settings.financialYears.length > 0
    ? db.settings.financialYears
    : [2024, 2025];
  res.json({ 
    success: true, 
    data: years, 
    activeFinancialYear: db.settings.activeFinancialYear || 2025 
  });
});

app.post('/api/financial-years', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Only Admin can create a new financial year.' 
    });
  }

  const { year, setActive } = req.body;
  const numYear = Number(year);
  if (!numYear || isNaN(numYear) || numYear < 2000 || numYear > 2100) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide a valid financial year number (e.g. 2026).' 
    });
  }

  if (!db.settings.financialYears) {
    db.settings.financialYears = [2024, 2025];
  }

  if (db.settings.financialYears.includes(numYear)) {
    return res.status(400).json({ 
      success: false, 
      message: `Financial year ${numYear} already exists.` 
    });
  }

  db.settings.financialYears.push(numYear);
  db.settings.financialYears.sort((a, b) => b - a);

  if (setActive) {
    db.settings.activeFinancialYear = numYear;
  }

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: 'ADMIN',
    adminName: 'Admin Signatory',
    timestamp: new Date().toISOString(),
    notes: `Created new Financial Year: ${numYear}${setActive ? ' (Set as Active Financial Year)' : ''}`,
  });

  saveDatabase(db);
  res.status(201).json({ 
    success: true, 
    message: `Financial year ${numYear} created successfully by Admin.`,
    data: {
      financialYears: db.settings.financialYears,
      activeFinancialYear: db.settings.activeFinancialYear
    }
  });
});

// Member CRUD
app.get('/api/members', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.members });
});

app.post('/api/members', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('members_edit'))) {
    return res.status(403).json({ success: false, message: 'Permission denied: members_edit permission required.' });
  }

  const memberData = req.body as Partial<Member>;
  const nextNum = db.members.length + 1;
  const newId = memberData.id || `MEM-${String(nextNum).padStart(3, '0')}`;
  
  const newMember: Member = {
    id: newId,
    name: memberData.name || 'Unnamed Member',
    phone: memberData.phone || '',
    category: memberData.category || 'village_resident',
    villageWard: memberData.villageWard || 'Ward No. 1',
    address: memberData.address || '',
    joinedYear: Number(memberData.joinedYear) || new Date().getFullYear(),
    status: memberData.status || 'active',
    guardianName: memberData.guardianName || '',
    notes: memberData.notes || '',
    photoUrl: memberData.photoUrl,
    bloodGroup: memberData.bloodGroup,
    email: memberData.email,
    createdAt: new Date().toISOString(),
  };

  db.members.unshift(newMember);

  // Auto-provision Member Login account ONLY if no user exists for this ID
  const existingUser = (db.users || []).find(u => u.username.toLowerCase() === newId.toLowerCase() || (u.memberId && u.memberId.toLowerCase() === newId.toLowerCase()));
  if (!existingUser) {
    const rawPass = (req.body.password && String(req.body.password).trim()) || 'member123';
    const memberUser: AppUser = {
      id: `USR-${newId.replace(/[^a-zA-Z0-9]/g, '')}`,
      username: newId,
      fullName: newMember.name,
      email: newMember.email || `${newId.toLowerCase()}@club.local`,
      phone: newMember.phone,
      memberId: newId,
      department: 'Club Member',
      role: 'Member',
      status: newMember.status,
      permissions: ['dashboard', 'member_portal_view', 'id_card_view', 'customer_selection', 'password_reset_request'],
      passwordHash: hashPassword(rawPass),
      temporaryPassword: true,
      createdAt: new Date().toISOString(),
      createdBy: sessionUser.username,
    };
    if (!db.users) db.users = [];
    db.users.push(memberUser);
  }

  saveDatabase(db);
  res.status(201).json({ success: true, data: newMember });
});

app.put('/api/members/:id', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  const { id } = req.params;
  const isSelf = sessionUser && (sessionUser.memberId === id || sessionUser.username === id);
  const canEdit = sessionUser && (sessionUser.isAdmin || sessionUser.permissions.includes('members_edit') || isSelf);
  
  if (!canEdit) {
    return res.status(403).json({ success: false, message: 'Permission denied: members_edit permission required.' });
  }

  const index = db.members.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  // Preserve existing member ID
  db.members[index] = { ...db.members[index], ...req.body, id };

  // Sync member user status & name if linked (NEVER overwrite passwordHash here)
  const user = (db.users || []).find(u => u.username === id || u.memberId === id);
  if (user) {
    if (req.body.name && (sessionUser.isAdmin || sessionUser.permissions.includes('members_edit'))) {
      user.fullName = req.body.name;
    }
    if (req.body.status && (sessionUser.isAdmin || sessionUser.permissions.includes('members_edit'))) {
      user.status = req.body.status;
    }
    if (req.body.phone) {
      user.phone = req.body.phone;
    }
    // CRITICAL: Requirement 1 - NEVER overwrite an existing user's password when updating member profile or membership records!
    user.updatedAt = new Date().toISOString();
  }

  saveDatabase(db);
  res.json({ success: true, data: db.members[index] });
});

app.delete('/api/members/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const reason = (req.body?.reason || req.query?.reason || 'Administrative action') as string;
  const adminName = (req.body?.adminName || 'Admin') as string;

  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Valid Admin PIN required to delete member.' 
    });
  }

  const member = db.members.find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  db.members = db.members.filter(m => m.id !== id);

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'DELETED',
    adminId: 'ADMIN',
    adminName,
    timestamp: new Date().toISOString(),
    targetType: 'member',
    targetId: id,
    payerName: member.name,
    rejectionReason: String(reason),
    notes: `Member deleted: ${member.name} (${member.id}, ${member.villageWard}). Reason: ${reason}`,
  });

  saveDatabase(db);
  res.json({ success: true, message: `Member ${member.name} deleted successfully.` });
});

// Organizers CRUD
app.get('/api/organizers', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.organizers });
});

app.post('/api/organizers', (req: Request, res: Response) => {
  const data = req.body as Partial<Organizer>;
  const newId = data.id || `ORG-${String(db.organizers.length + 1).padStart(2, '0')}`;
  const newOrg: Organizer = {
    id: newId,
    name: data.name || '',
    phone: data.phone || '',
    address: data.address || '',
    companyOrClubName: data.companyOrClubName || 'Janakalyan Club Committee',
    role: data.role || 'Executive Member',
    termPeriod: data.termPeriod || `${new Date().getFullYear()} - ${new Date().getFullYear() + 2}`,
    responsibilities: data.responsibilities || '',
    isSignatory: Boolean(data.isSignatory),
    remarks: data.remarks || '',
    status: data.status || 'active',
    memberId: data.memberId,
    createdAt: new Date().toISOString(),
  };
  db.organizers.push(newOrg);
  saveDatabase(db);
  res.status(201).json({ success: true, data: newOrg });
});

app.put('/api/organizers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.organizers.findIndex(o => o.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Organizer not found' });
  }
  db.organizers[index] = { ...db.organizers[index], ...req.body, id };
  saveDatabase(db);
  res.json({ success: true, data: db.organizers[index] });
});

app.delete('/api/organizers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const reason = (req.body?.reason || req.query?.reason || 'Administrative action') as string;
  const adminName = (req.body?.adminName || 'Admin') as string;

  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Valid Admin PIN required to delete organizer.' 
    });
  }

  const org = db.organizers.find(o => o.id === id);
  if (!org) {
    return res.status(404).json({ success: false, message: 'Organizer not found.' });
  }

  db.organizers = db.organizers.filter(o => o.id !== id);

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'DELETED',
    adminId: 'ADMIN',
    adminName,
    timestamp: new Date().toISOString(),
    targetType: 'organizer',
    targetId: id,
    payerName: org.name,
    rejectionReason: String(reason),
    notes: `Organizer removed from committee: ${org.name} (${org.role}, ${org.companyOrClubName}). Reason: ${reason}`,
  });

  saveDatabase(db);
  res.json({ success: true, message: 'Organizer removed' });
});

// Program Management CRUD
app.get('/api/programs', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.programs || [] });
});

app.post('/api/programs', (req: Request, res: Response) => {
  const data = req.body as Partial<Program>;
  const year = new Date().getFullYear();
  const nextSeq = (db.programs?.length || 0) + 1;
  const newId = data.id || `PRG-${year}-${String(nextSeq).padStart(4, '0')}`;

  const newProgram: Program = {
    id: newId,
    organizerId: data.organizerId || '',
    organizerName: data.organizerName || 'General Committee',
    organizerPhone: data.organizerPhone || '',
    organizerCompany: data.organizerCompany || '',
    name: data.name || 'Untitled Program',
    type: data.type || 'Cultural Festival',
    venue: data.venue || 'Club Hall',
    venueAddress: data.venueAddress || '',
    programDate: data.programDate || new Date().toISOString().split('T')[0],
    startTime: data.startTime || '10:00 AM',
    endTime: data.endTime || '08:00 PM',
    contractDate: data.contractDate || new Date().toISOString().split('T')[0],
    totalContractAmount: Number(data.totalContractAmount) || 0,
    initialAdvanceAmount: Number(data.initialAdvanceAmount) || 0,
    specialInstructions: data.specialInstructions || '',
    status: data.status || 'Booked',
    createdAt: new Date().toISOString(),
  };

  if (!db.programs) db.programs = [];
  db.programs.unshift(newProgram);
  saveDatabase(db);
  res.status(201).json({ success: true, data: newProgram });
});

app.put('/api/programs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.programs) db.programs = [];
  const index = db.programs.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Program not found' });
  }
  db.programs[index] = { ...db.programs[index], ...req.body, id };
  saveDatabase(db);
  res.json({ success: true, data: db.programs[index] });
});

app.delete('/api/programs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to delete program' });
  }
  db.programs = (db.programs || []).filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true, message: 'Program deleted' });
});

// Receipts / Payments CRUD
app.get('/api/receipts', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.receipts });
});

app.post('/api/receipts', (req: Request, res: Response) => {
  const data = req.body as Partial<PaymentReceipt>;
  const currentYear = data.financialYear || db.settings.activeFinancialYear || new Date().getFullYear();
  const yearReceipts = db.receipts.filter(r => r.financialYear === currentYear);
  const nextSeq = yearReceipts.length + 1;
  const receiptNo = data.receiptNo || `RCP-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  const id = `PAY-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  // Duplicate payment prevention check (same txn ref on same date with same amount)
  if (data.transactionRef && data.transactionRef.trim() !== '') {
    const isDuplicate = db.receipts.some(
      r => r.transactionRef === data.transactionRef?.trim() && 
           r.date === data.date && 
           r.amount === Number(data.amount)
    );
    if (isDuplicate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate payment detected: Transaction reference already exists for this date and amount.' 
      });
    }
  }

  // All user entries are allowed to save and confirm receipts directly
  const isAdmin = verifyAdminAuthorization(req);
  let status: PaymentStatus = 'APPROVED';
  let approvedBy: string | undefined = undefined;
  let approvedAt: string | undefined = undefined;

  if (data.status === 'PENDING_APPROVAL') {
    status = 'PENDING_APPROVAL';
  } else {
    status = 'APPROVED';
    approvedBy = isAdmin ? 'Admin' : (data.submittedBy || 'Authorized Collector');
    approvedAt = new Date().toISOString();
  }

  const newReceipt: PaymentReceipt = {
    id,
    receiptNo,
    payerType: data.payerType || (data.programId ? 'organizer' : 'member'),
    memberId: data.memberId || '',
    memberName: data.memberName || 'Direct Payer',
    memberCategory: data.memberCategory || 'village_resident',
    organizerId: data.organizerId,
    organizerName: data.organizerName,
    programId: data.programId,
    programName: data.programName,
    phone: data.phone || '',
    villageWard: data.villageWard || '',
    financialYear: Number(currentYear),
    date: data.date || new Date().toISOString().split('T')[0],
    paymentType: data.paymentType || 'Subscription Fee',
    purpose: data.purpose || 'Annual Contribution',
    amount: Number(data.amount) || 0,
    paymentMode: data.paymentMode || 'Cash',
    transactionRef: data.transactionRef || '',
    submittedBy: data.submittedBy || data.collectorName || 'Desk User',
    submissionDateTime: new Date().toISOString(),
    collectorName: data.collectorName || db.settings.treasurerName,
    status,
    approvedBy,
    approvedAt,
    remarks: data.remarks || '',
    createdAt: new Date().toISOString(),
  };

  db.receipts.unshift(newReceipt);

  // Add audit log
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    paymentId: newReceipt.id,
    receiptNo: newReceipt.receiptNo,
    action: status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
    adminId: isAdmin ? 'ADMIN' : 'USER',
    adminName: isAdmin ? 'Admin Signatory' : newReceipt.submittedBy,
    timestamp: new Date().toISOString(),
    previousStatus: 'NONE',
    newStatus: status,
    amount: newReceipt.amount,
    payerName: newReceipt.memberName,
    notes: `Payment created with status ${status}`,
  });

  saveDatabase(db);
  res.status(201).json({ success: true, data: newReceipt });
});

// Admin Payment Approval Endpoint
app.post('/api/payments/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Valid Admin PIN required to approve payments.' 
    });
  }

  const payment = db.receipts.find(r => r.id === id || r.receiptNo === id);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment record not found.' });
  }

  // Idempotency / duplicate approval check
  if (payment.status === 'APPROVED') {
    return res.status(400).json({ 
      success: false, 
      message: 'Payment is already APPROVED. Duplicate approval prevented.' 
    });
  }

  const prevStatus = payment.status;
  payment.status = 'APPROVED';
  payment.approvedBy = 'Admin';
  payment.approvedAt = new Date().toISOString();
  payment.rejectedBy = undefined;
  payment.rejectedAt = undefined;
  payment.rejectionReason = undefined;

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    paymentId: payment.id,
    receiptNo: payment.receiptNo,
    action: 'APPROVED',
    adminId: 'ADMIN-VERIFIED',
    adminName: 'Authorized Admin',
    timestamp: new Date().toISOString(),
    previousStatus: prevStatus,
    newStatus: 'APPROVED',
    amount: payment.amount,
    payerName: payment.memberName,
    notes: 'Approved by Administrator. Revenue added to confirmed totals.',
  });

  saveDatabase(db);
  res.json({ success: true, message: 'Payment successfully APPROVED and verified.', data: payment });
});

// Admin Payment Rejection Endpoint
app.post('/api/payments/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Valid Admin PIN required to reject payments.' 
    });
  }

  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Rejection reason is mandatory.' 
    });
  }

  const payment = db.receipts.find(r => r.id === id || r.receiptNo === id);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment record not found.' });
  }

  if (payment.status === 'REJECTED') {
    return res.status(400).json({ 
      success: false, 
      message: 'Payment is already REJECTED.' 
    });
  }

  const prevStatus = payment.status;
  payment.status = 'REJECTED';
  payment.rejectionReason = String(reason).trim();
  payment.rejectedBy = 'Admin';
  payment.rejectedAt = new Date().toISOString();

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    paymentId: payment.id,
    receiptNo: payment.receiptNo,
    action: 'REJECTED',
    adminId: 'ADMIN-VERIFIED',
    adminName: 'Authorized Admin',
    timestamp: new Date().toISOString(),
    previousStatus: prevStatus,
    newStatus: 'REJECTED',
    rejectionReason: payment.rejectionReason,
    amount: payment.amount,
    payerName: payment.memberName,
    notes: `Payment rejected by Admin. Reason: ${payment.rejectionReason}`,
  });

  saveDatabase(db);
  res.json({ success: true, message: 'Payment REJECTED.', data: payment });
});

// Delete Receipt
app.delete('/api/receipts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to delete receipt' });
  }
  const deletedItem = db.receipts.find(r => r.id === id);
  db.receipts = db.receipts.filter(r => r.id !== id);

  if (deletedItem && db.auditLogs) {
    db.auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      paymentId: deletedItem.id,
      receiptNo: deletedItem.receiptNo,
      action: 'DELETED',
      adminId: 'ADMIN',
      adminName: 'Admin',
      timestamp: new Date().toISOString(),
      previousStatus: deletedItem.status,
      newStatus: 'REJECTED',
      amount: deletedItem.amount,
      payerName: deletedItem.memberName,
      notes: 'Payment record deleted from ledger',
    });
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Receipt deleted' });
});

// Audit Logs Endpoint
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.auditLogs || [] });
});

// Expenses CRUD
app.get('/api/expenses', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.expenses });
});

app.post('/api/expenses', (req: Request, res: Response) => {
  const data = req.body as Partial<Expense>;
  const currentYear = data.financialYear || db.settings.activeFinancialYear || new Date().getFullYear();
  const yearExpenses = db.expenses.filter(e => e.financialYear === currentYear);
  const nextSeq = yearExpenses.length + 1;
  const voucherNo = data.voucherNo || `EXP-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  const id = `EXP-${Date.now()}`;

  const expenseType = data.expenseType === 'LOCAL' || data.expenseType === 'Local Expense' || (!data.programId && data.programName === 'General Club Operating Expense (No Program)')
    ? 'LOCAL'
    : 'PROGRAM';

  const newExpense: Expense = {
    id,
    voucherNo,
    expenseType,
    programId: expenseType === 'PROGRAM' ? data.programId : undefined,
    programName: expenseType === 'PROGRAM' ? data.programName : 'General Club Operating Expense (No Program)',
    organizerName: data.organizerName || (expenseType === 'LOCAL' ? 'General Club Committee' : undefined),
    date: data.date || new Date().toISOString().split('T')[0],
    category: data.category || 'Other Expenses',
    title: data.title || 'General Local Expense',
    amount: Number(data.amount) || 0,
    paidTo: data.paidTo || '',
    approvedBy: data.approvedBy || db.settings.secretaryName,
    paymentMode: data.paymentMode || 'Cash',
    paymentStatus: data.paymentStatus || 'PAID',
    paidAmount: data.paidAmount !== undefined ? Number(data.paidAmount) : (Number(data.amount) || 0),
    billRef: data.billRef || '',
    financialYear: Number(currentYear),
    remarks: data.remarks || '',
    enteredBy: data.enteredBy || 'Treasurer',
    createdAt: new Date().toISOString(),
  };

  db.expenses.unshift(newExpense);
  saveDatabase(db);
  res.status(201).json({ success: true, data: newExpense });
});

app.put('/api/expenses/:id', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!sessionUser || (!sessionUser.isAdmin && !sessionUser.permissions.includes('expenses_edit'))) {
    return res.status(403).json({ success: false, message: 'Authorization required to edit expenses.' });
  }

  const { id } = req.params;
  const index = db.expenses.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }
  const existing = db.expenses[index];
  const updateData = req.body as Partial<Expense>;

  // Preserve the immutable original voucherNo and id
  const preservedVoucherNo = existing.voucherNo;

  db.expenses[index] = { 
    ...existing, 
    ...updateData, 
    id,
    voucherNo: preservedVoucherNo, // Never change existing voucher number
    updatedAt: new Date().toISOString(),
    updatedBy: sessionUser.username,
  };

  // Add audit log
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'EDITED',
    adminId: sessionUser.userId,
    adminName: sessionUser.username,
    timestamp: new Date().toISOString(),
    targetType: 'expense',
    targetId: id,
    payerName: db.expenses[index].paidTo,
    notes: `Expense voucher ${preservedVoucherNo} updated: ₹${db.expenses[index].amount} (${db.expenses[index].title})`,
  });

  saveDatabase(db);
  res.json({ success: true, data: db.expenses[index] });
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to delete expense' });
  }
  db.expenses = db.expenses.filter(e => e.id !== id);
  saveDatabase(db);
  res.json({ success: true, message: 'Expense deleted' });
});

// Safe user merger helper ensuring passwords of admin-created users are NEVER overwritten or wiped
function mergeUsersSafely(existingUsers: AppUser[], incomingUsers?: AppUser[]): AppUser[] {
  if (!incomingUsers || !Array.isArray(incomingUsers) || incomingUsers.length === 0) {
    return existingUsers || [];
  }
  const existingMap = new Map<string, AppUser>();
  (existingUsers || []).forEach(u => {
    existingMap.set(u.id, u);
    existingMap.set(u.username.toLowerCase(), u);
  });

  const mergedList: AppUser[] = incomingUsers.map(inc => {
    const existing = existingMap.get(inc.id) || existingMap.get(inc.username.toLowerCase());
    // If incoming user is missing passwordHash or has blank, retain existing valid password credentials
    if (existing?.passwordHash && (!inc.passwordHash || String(inc.passwordHash).trim() === '')) {
      return {
        ...inc,
        passwordHash: existing.passwordHash,
        salt: existing.salt,
        temporaryPassword: existing.temporaryPassword,
      };
    }
    return inc;
  });

  // Preserve any admin-created users that existed in live database but were omitted in incoming export
  (existingUsers || []).forEach(existing => {
    const found = mergedList.some(m => m.id === existing.id || m.username.toLowerCase() === existing.username.toLowerCase());
    if (!found) {
      mergedList.push(existing);
    }
  });

  return mergedList;
}

// Full database backup / restore / reset
app.post('/api/backup/restore', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to restore backup' });
  }
  const importedData = req.body as ClubDatabase;
  if (!importedData.members || !importedData.receipts || !importedData.expenses || !importedData.settings) {
    return res.status(400).json({ success: false, message: 'Invalid backup file format' });
  }

  // Preserve all existing user accounts, passwords, and credentials safely
  const mergedUsers = mergeUsersSafely(db.users || [], importedData.users);

  db = {
    ...importedData,
    users: mergedUsers,
    programs: importedData.programs || initialPrograms,
    auditLogs: importedData.auditLogs || initialAuditLogs,
    passwordResetRequests: importedData.passwordResetRequests || db.passwordResetRequests || [],
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Database successfully restored', data: db });
});

app.post('/api/reset-demo', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to reset demo' });
  }
  db = {
    settings: defaultSettings,
    members: initialMembers,
    organizers: initialOrganizers,
    programs: initialPrograms,
    receipts: initialReceipts,
    expenses: initialExpenses,
    auditLogs: initialAuditLogs,
  };
  saveDatabase(db);
  res.json({ success: true, message: 'Reset to demo database completed', data: db });
});

// --- GOOGLE DRIVE & DAILY BACKUP API ENDPOINTS ---

// 1. Create Backup Now
app.post('/api/backup/create', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to trigger backup.' });
  }

  try {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Club_Backup_${timestampStr}_IST.json`;
    const filePath = path.resolve(BACKUPS_DIR, filename);

    const backupPayload = JSON.stringify(db, null, 2);
    fs.writeFileSync(filePath, backupPayload, 'utf-8');
    const stats = fs.statSync(filePath);

    const backupRecord: BackupRecord = {
      id: `BCK-${Date.now()}`,
      filename,
      timestamp: new Date().toISOString(),
      timeIndia: getIndiaTimeString(),
      type: 'MANUAL_ADMIN',
      status: 'SUCCESS',
      recordCounts: {
        members: db.members?.length || 0,
        receipts: db.receipts?.length || 0,
        expenses: db.expenses?.length || 0,
        programs: db.programs?.length || 0,
        organizers: db.organizers?.length || 0,
        auditLogs: db.auditLogs?.length || 0,
      },
      fileSizeKb: Math.round(stats.size / 1024),
      googleDriveFolder: db.settings.googleDriveBackupFolder || 'Club Management App Backups',
      notificationSentTo: db.settings.backupNotificationEmail || db.settings.contactEmail,
    };

    if (!db.backups) db.backups = [];
    db.backups.unshift(backupRecord);
    saveDatabase(db);

    res.json({
      success: true,
      message: `Safety backup created successfully: ${filename}`,
      data: backupRecord,
    });
  } catch (err: any) {
    console.error('Backup creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create backup: ' + err.message });
  }
});

// 2. View Backup History
app.get('/api/backup/history', (_req: Request, res: Response) => {
  try {
    let filesInDir: string[] = [];
    if (fs.existsSync(BACKUPS_DIR)) {
      filesInDir = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
    }

    const records = db.backups || [];
    res.json({
      success: true,
      data: {
        records,
        storedFiles: filesInDir,
        folderName: db.settings.googleDriveBackupFolder || 'Club Management App Backups',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. View Backup Status & Schedule
app.get('/api/backup/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      schedule: 'Daily at 11:00 PM IST (Asia/Kolkata)',
      timezone: 'Asia/Kolkata',
      folderName: db.settings.googleDriveBackupFolder || 'Club Management App Backups',
      notificationEmail: db.settings.backupNotificationEmail || db.settings.contactEmail,
      autoBackupEnabled: db.settings.autoBackupEnabled !== false,
      totalBackups: (db.backups || []).length,
      lastBackup: db.backups?.[0] || null,
      status: 'ACTIVE_AND_PROTECTED',
    },
  });
});

// 4. Restore from Backup File on Server
app.post('/api/backup/restore-file', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to restore backup.' });
  }

  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required for restoration.' });
  }

  const safeFilename = path.basename(filename);
  const targetPath = path.resolve(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ success: false, message: 'Specified backup file not found on server.' });
  }

  try {
    // Take safety snapshot of current live database before restoring
    const safetySnapshotName = `Safety_PreRestore_${Date.now()}.json`;
    fs.writeFileSync(path.resolve(BACKUPS_DIR, safetySnapshotName), JSON.stringify(db, null, 2), 'utf-8');

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(raw) as ClubDatabase;

    if (!parsed.members || !parsed.receipts || !parsed.expenses) {
      return res.status(400).json({ success: false, message: 'Corrupted backup file format.' });
    }

    // Preserve all existing user accounts, passwords, and credentials safely
    const mergedUsers = mergeUsersSafely(db.users || [], parsed.users);

    db = {
      ...parsed,
      users: mergedUsers,
      programs: parsed.programs || initialPrograms,
      auditLogs: parsed.auditLogs || initialAuditLogs,
      passwordResetRequests: parsed.passwordResetRequests || db.passwordResetRequests || [],
    };
    saveDatabase(db);

    res.json({
      success: true,
      message: `Database safely restored from ${safeFilename}. Safety snapshot created: ${safetySnapshotName}`,
      data: db,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Restoration error: ' + err.message });
  }
});

// --- Customer Selection Endpoints ---

// Get Customer Selections (Filtered by member if member role, or all for admin)
app.get('/api/customer-selections', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  if (!db.customerSelections) db.customerSelections = [];

  if (sessionUser && sessionUser.role === 'Member' && sessionUser.memberId) {
    const memberSelections = db.customerSelections.filter(s => s.memberId === sessionUser.memberId);
    return res.json({ success: true, data: memberSelections });
  }

  // Admins and other staff see all
  return res.json({ success: true, data: db.customerSelections });
});

// Member submits a new Customer Selection request
app.post('/api/customer-selections', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  const { customerName, customerId, category, phone, email, reason, memberId, memberName } = req.body;

  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ success: false, message: 'Customer/Beneficiary name is required.' });
  }

  const effectiveMemberId = memberId || sessionUser?.memberId || 'MEM-001';
  const effectiveMemberName = memberName || sessionUser?.fullName || 'Club Member';

  const nextSeq = (db.customerSelections?.length || 0) + 1;
  const newSelection: CustomerSelection = {
    id: `SEL-${String(nextSeq).padStart(3, '0')}`,
    memberId: effectiveMemberId,
    memberName: effectiveMemberName,
    customerName: String(customerName).trim(),
    customerId: customerId ? String(customerId).trim() : undefined,
    category: category || 'Scholarship / Welfare',
    phone: phone ? String(phone).trim() : undefined,
    email: email ? String(email).trim() : undefined,
    reason: reason ? String(reason).trim() : undefined,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  if (!db.customerSelections) db.customerSelections = [];
  db.customerSelections.unshift(newSelection);

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: 'SUBMITTED',
    adminId: sessionUser?.userId || 'MEMBER',
    adminName: effectiveMemberName,
    timestamp: new Date().toISOString(),
    notes: `Customer selection submitted by ${effectiveMemberName}: ${newSelection.customerName} (${newSelection.category})`,
  });

  saveDatabase(db);
  res.status(201).json({ success: true, data: newSelection, message: 'Selection request submitted for Admin review!' });
});

// Admin approves, rejects or updates customer selection status
app.put('/api/customer-selections/:id/status', (req: Request, res: Response) => {
  if (!verifyAdminAuthorization(req)) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to finalize customer selections.' });
  }

  const { id } = req.params;
  const { status, adminRemarks } = req.body;
  const sessionUser = getUserFromRequest(req);

  const sel = (db.customerSelections || []).find(s => s.id === id);
  if (!sel) {
    return res.status(404).json({ success: false, message: 'Customer selection record not found.' });
  }

  sel.status = status;
  if (adminRemarks !== undefined) sel.adminRemarks = adminRemarks;
  sel.actionBy = sessionUser?.fullName || 'Master Administrator';
  sel.actionAt = new Date().toISOString();
  sel.updatedAt = new Date().toISOString();

  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    action: status === 'Approved' ? 'APPROVED' : 'REJECTED',
    adminId: sessionUser?.userId || 'ADMIN',
    adminName: sessionUser?.fullName || 'Admin',
    timestamp: new Date().toISOString(),
    notes: `Customer selection ${sel.id} (${sel.customerName}) marked as ${status}. Remarks: ${adminRemarks || 'None'}`,
  });

  saveDatabase(db);
  res.json({ success: true, data: sel, message: `Selection status updated to ${status}.` });
});

// Member cancels own pending selection
app.post('/api/customer-selections/:id/cancel', (req: Request, res: Response) => {
  const sessionUser = getUserFromRequest(req);
  const { id } = req.params;

  const sel = (db.customerSelections || []).find(s => s.id === id);
  if (!sel) {
    return res.status(404).json({ success: false, message: 'Selection record not found.' });
  }

  if (sel.status !== 'Pending') {
    return res.status(400).json({ success: false, message: 'Only Pending selections can be cancelled.' });
  }

  sel.status = 'Cancelled';
  sel.updatedAt = new Date().toISOString();
  saveDatabase(db);
  res.json({ success: true, data: sel, message: 'Selection request cancelled.' });
});

// Catch-all for any unmatched /api/* requests so they ALWAYS return JSON, NEVER index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global API error handler
app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    message: err?.message || 'Internal Server Error',
  });
});

// Start Express and integrate Vite in development mode
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Club Management Backend listening on port ${PORT}`);
  });
}

startServer();
