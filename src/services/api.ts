import { 
  ClubDatabase, 
  ClubSettings, 
  Member, 
  Organizer, 
  Program, 
  PaymentReceipt, 
  Expense, 
  PaymentAuditLog,
  AppUser,
  LoginHistoryItem,
  BackupRecord,
  CustomerSelection,
  SelectionStatus,
  PasswordResetRequest
} from '../types/club.ts';

const LOCAL_STORAGE_KEY = 'gramin_club_cache_v1';
const AUTH_TOKEN_KEY = 'club_auth_token_v1';

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function getAuthHeaders(adminPin?: string): Record<string, string> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (adminPin) {
    headers['x-admin-pin'] = adminPin;
  }
  return headers;
}

/**
 * Robust JSON fetch wrapper that never throws "Unexpected token '<'"
 * If the response is HTML (gateway error, 404, 500, or proxy page), it extracts a human-readable error.
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Connection error: ${netErr?.message || 'Server unreachable'}`);
  }

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON response (e.g. HTML error from proxy or web server)
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<head')) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Unexpected HTML response'}`);
    }
    throw new Error(`Invalid response format from server (${res.status}): ${text.substring(0, 80)}`);
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed with status ${res.status}`);
  }

  return json;
}

// Authentication Service Functions
export async function loginUser(username: string, password: string): Promise<{ token: string; user: AppUser }> {
  const json = await safeFetchJson<{ success: boolean; message: string; data: { token: string; user: AppUser } }>(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }
  );
  setStoredAuthToken(json.data.token);
  return json.data;
}

export async function fetchCurrentUser(): Promise<AppUser | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  try {
    const json = await safeFetchJson<{ success: boolean; data: AppUser }>('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await safeFetchJson('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // ignore network errors on logout
  } finally {
    setStoredAuthToken(null);
  }
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  await safeFetchJson('/api/auth/change-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// User Management Service Functions
export async function getUsersList(adminPin?: string): Promise<AppUser[]> {
  const json = await safeFetchJson<{ success: boolean; data: AppUser[] }>('/api/users', {
    headers: getAuthHeaders(adminPin),
  });
  return json.data;
}

export async function createUser(
  userData: Partial<AppUser> & { password?: string },
  adminPin?: string
): Promise<{ user: AppUser; message: string }> {
  const json = await safeFetchJson<{ success: boolean; message: string; data: AppUser }>('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify(userData),
  });
  return { user: json.data, message: json.message };
}

export async function updateUser(
  id: string, 
  userData: Partial<AppUser> & { password?: string; memberId?: string; username?: string }, 
  adminPin?: string
): Promise<AppUser> {
  const json = await safeFetchJson<{ success: boolean; data: AppUser }>(
    `/api/users/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify(userData),
    }
  );
  return json.data;
}

export async function resetUserPassword(id: string, newPassword?: string, adminPin?: string): Promise<string> {
  const json = await safeFetchJson<{ success: boolean; message: string }>(
    `/api/users/${encodeURIComponent(id)}/reset-password`,
    {
      method: 'POST',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify({ newPassword }),
    }
  );
  return json.message;
}

export async function toggleUserStatus(id: string, adminPin?: string): Promise<AppUser> {
  const json = await safeFetchJson<{ success: boolean; data: AppUser }>(
    `/api/users/${encodeURIComponent(id)}/toggle-status`,
    {
      method: 'POST',
      headers: getAuthHeaders(adminPin),
    }
  );
  return json.data;
}

export async function getLoginHistory(adminPin?: string): Promise<LoginHistoryItem[]> {
  const json = await safeFetchJson<{ success: boolean; data: LoginHistoryItem[] }>('/api/login-history', {
    headers: getAuthHeaders(adminPin),
  });
  return json.data;
}

export async function getFullData(): Promise<ClubDatabase> {
  try {
    const json = await safeFetchJson<{ success: boolean; data: ClubDatabase }>('/api/data', {
      headers: getAuthHeaders(),
    });
    if (json.success && json.data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
      return json.data;
    }
  } catch (err) {
    console.warn('Backend fetch failed, falling back to local cache:', err);
  }

  // Fallback to cache if server is unreachable
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  throw new Error('Unable to load club database');
}

export async function saveSettings(settings: Partial<ClubSettings>, adminPin?: string): Promise<ClubSettings> {
  const json = await safeFetchJson<{ success: boolean; data: ClubSettings }>('/api/settings', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify(settings),
  });
  return json.data;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    const json = await safeFetchJson<{ success: boolean }>('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return json.success === true;
  } catch {
    return false;
  }
}

// Members
export async function addMember(member: Partial<Member>, adminPin?: string): Promise<Member> {
  const json = await safeFetchJson<{ success: boolean; data: Member }>('/api/members', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify(member),
  });
  return json.data;
}

export async function updateMember(id: string, member: Partial<Member>, adminPin?: string): Promise<Member> {
  const json = await safeFetchJson<{ success: boolean; data: Member }>(
    `/api/members/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify(member),
    }
  );
  return json.data;
}

export async function deleteMember(id: string, adminPin?: string, reason?: string): Promise<void> {
  await safeFetchJson(`/api/members/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify({ reason: reason || 'Administrative action' }),
  });
}

// Organizers
export async function addOrganizer(organizer: Partial<Organizer>): Promise<Organizer> {
  const json = await safeFetchJson<{ success: boolean; data: Organizer }>('/api/organizers', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(organizer),
  });
  return json.data;
}

export async function updateOrganizer(id: string, organizer: Partial<Organizer>): Promise<Organizer> {
  const json = await safeFetchJson<{ success: boolean; data: Organizer }>(
    `/api/organizers/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(organizer),
    }
  );
  return json.data;
}

export async function deleteOrganizer(id: string, adminPin?: string): Promise<void> {
  await safeFetchJson(`/api/organizers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(adminPin),
  });
}

// Programs (Events & Contracts)
export async function addProgram(program: Partial<Program>): Promise<Program> {
  const json = await safeFetchJson<{ success: boolean; data: Program }>('/api/programs', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(program),
  });
  return json.data;
}

export async function updateProgram(id: string, program: Partial<Program>): Promise<Program> {
  const json = await safeFetchJson<{ success: boolean; data: Program }>(
    `/api/programs/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(program),
    }
  );
  return json.data;
}

export async function deleteProgram(id: string, adminPin?: string): Promise<void> {
  await safeFetchJson(`/api/programs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(adminPin),
  });
}

// Payments / Receipts
export async function addReceipt(receipt: Partial<PaymentReceipt>, adminPin?: string): Promise<PaymentReceipt> {
  const json = await safeFetchJson<{ success: boolean; data: PaymentReceipt }>('/api/receipts', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify(receipt),
  });
  return json.data;
}

export async function approvePayment(id: string, adminPin?: string): Promise<PaymentReceipt> {
  const json = await safeFetchJson<{ success: boolean; data: PaymentReceipt }>(
    `/api/payments/${encodeURIComponent(id)}/approve`,
    {
      method: 'POST',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify({ adminPin }),
    }
  );
  return json.data;
}

export async function rejectPayment(id: string, reason: string, adminPin?: string): Promise<PaymentReceipt> {
  const json = await safeFetchJson<{ success: boolean; data: PaymentReceipt }>(
    `/api/payments/${encodeURIComponent(id)}/reject`,
    {
      method: 'POST',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify({ reason, adminPin }),
    }
  );
  return json.data;
}

export async function deleteReceipt(id: string, adminPin?: string): Promise<void> {
  await safeFetchJson(`/api/receipts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(adminPin),
  });
}

export async function getAuditLogs(): Promise<PaymentAuditLog[]> {
  const json = await safeFetchJson<{ success: boolean; data: PaymentAuditLog[] }>('/api/audit-logs');
  return json.data;
}

// Expenses
export async function addExpense(expense: Partial<Expense>): Promise<Expense> {
  const json = await safeFetchJson<{ success: boolean; data: Expense }>('/api/expenses', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(expense),
  });
  return json.data;
}

export async function updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
  const json = await safeFetchJson<{ success: boolean; data: Expense }>(
    `/api/expenses/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(expense),
    }
  );
  return json.data;
}

export async function deleteExpense(id: string, adminPin?: string): Promise<void> {
  await safeFetchJson(`/api/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(adminPin),
  });
}

// Google Drive & Server Backups
export async function createServerBackup(adminPin?: string): Promise<BackupRecord> {
  const json = await safeFetchJson<{ success: boolean; data: BackupRecord }>('/api/backup/create', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
  });
  return json.data;
}

export async function getBackupHistory(adminPin?: string): Promise<{ records: BackupRecord[]; storedFiles: string[]; folderName: string }> {
  const json = await safeFetchJson<{ success: boolean; data: { records: BackupRecord[]; storedFiles: string[]; folderName: string } }>(
    '/api/backup/history',
    {
      headers: getAuthHeaders(adminPin),
    }
  );
  return json.data;
}

export async function getBackupStatus(): Promise<any> {
  const json = await safeFetchJson<{ success: boolean; data: any }>('/api/backup/status');
  return json.data;
}

export async function restoreBackupFile(filename: string, adminPin?: string): Promise<ClubDatabase> {
  const json = await safeFetchJson<{ success: boolean; data: ClubDatabase }>('/api/backup/restore-file', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify({ filename }),
  });
  return json.data;
}

// Database backup & demo reset
export async function restoreDatabase(database: ClubDatabase, adminPin?: string): Promise<ClubDatabase> {
  const json = await safeFetchJson<{ success: boolean; data: ClubDatabase }>('/api/backup/restore', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(adminPin ? { 'x-admin-pin': adminPin } : {}),
    },
    body: JSON.stringify(database),
  });
  return json.data;
}

export async function resetToDemo(adminPin?: string): Promise<ClubDatabase> {
  const json = await safeFetchJson<{ success: boolean; data: ClubDatabase }>('/api/reset-demo', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(adminPin ? { 'x-admin-pin': adminPin } : {}),
    },
  });
  return json.data;
}

// Financial Years Management API (Only Admin can create new financial years)
export async function getFinancialYears(): Promise<{ financialYears: number[]; activeFinancialYear: number }> {
  const json = await safeFetchJson<{ success: boolean; data: number[]; activeFinancialYear: number }>('/api/financial-years');
  return {
    financialYears: json.data || [2024, 2025],
    activeFinancialYear: json.activeFinancialYear || 2025,
  };
}

export async function createFinancialYear(
  year: number,
  setActive: boolean = true,
  adminPin?: string
): Promise<{ financialYears: number[]; activeFinancialYear: number; message: string }> {
  const json = await safeFetchJson<{ 
    success: boolean; 
    message: string; 
    data: { financialYears: number[]; activeFinancialYear: number } 
  }>('/api/financial-years', {
    method: 'POST',
    headers: getAuthHeaders(adminPin),
    body: JSON.stringify({ year, setActive }),
  });
  return {
    financialYears: json.data.financialYears,
    activeFinancialYear: json.data.activeFinancialYear,
    message: json.message,
  };
}

// User / Member Change Password
export async function changeSelfPassword(currentPassword: string, newPassword: string): Promise<string> {
  const json = await safeFetchJson<{ success: boolean; message: string }>('/api/auth/change-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return json.message;
}

// Customer Selection APIs
export async function getCustomerSelections(): Promise<CustomerSelection[]> {
  const json = await safeFetchJson<{ success: boolean; data: CustomerSelection[] }>('/api/customer-selections', {
    headers: getAuthHeaders(),
  });
  return json.data || [];
}

export async function submitCustomerSelection(
  data: Partial<CustomerSelection>
): Promise<{ selection: CustomerSelection; message: string }> {
  const json = await safeFetchJson<{ success: boolean; data: CustomerSelection; message: string }>(
    '/api/customer-selections',
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  return { selection: json.data, message: json.message };
}

export async function updateCustomerSelectionStatus(
  id: string,
  status: SelectionStatus,
  adminRemarks?: string,
  adminPin?: string
): Promise<{ selection: CustomerSelection; message: string }> {
  const json = await safeFetchJson<{ success: boolean; data: CustomerSelection; message: string }>(
    `/api/customer-selections/${id}/status`,
    {
      method: 'PUT',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify({ status, adminRemarks }),
    }
  );
  return { selection: json.data, message: json.message };
}

export async function cancelCustomerSelection(id: string): Promise<{ selection: CustomerSelection; message: string }> {
  const json = await safeFetchJson<{ success: boolean; data: CustomerSelection; message: string }>(
    `/api/customer-selections/${id}/cancel`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return { selection: json.data, message: json.message };
}

// Password Reset Request & Approval APIs
export async function submitForgotPasswordRequest(
  identifier: string,
  reason?: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  return await safeFetchJson<{ success: boolean; message: string; requestId?: string }>(
    '/api/auth/forgot-password-request',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, reason }),
    }
  );
}

export async function getPasswordResetRequests(adminPin?: string): Promise<PasswordResetRequest[]> {
  const json = await safeFetchJson<{ success: boolean; data: PasswordResetRequest[] }>(
    '/api/admin/password-reset-requests',
    {
      headers: getAuthHeaders(adminPin),
    }
  );
  return json.data || [];
}

export async function actionPasswordResetRequest(
  id: string,
  action: 'APPROVE' | 'REJECT',
  adminNotes?: string,
  adminPin?: string
): Promise<{ success: boolean; message: string; data: PasswordResetRequest }> {
  return await safeFetchJson<{ success: boolean; message: string; data: PasswordResetRequest }>(
    `/api/admin/password-reset-requests/${encodeURIComponent(id)}/action`,
    {
      method: 'POST',
      headers: getAuthHeaders(adminPin),
      body: JSON.stringify({ action, adminNotes }),
    }
  );
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return await safeFetchJson<{ success: boolean; message: string }>(
    '/api/auth/reset-password-with-token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    }
  );
}

