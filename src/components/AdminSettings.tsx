import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Info, 
  FileSpreadsheet,
  Lock,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Palette,
  Eye,
  Sliders,
  CreditCard,
  HardDrive,
  FileText,
  Clock,
  Tag,
  Plus,
  X
} from 'lucide-react';
import { ClubDatabase, ClubSettings, LoginAppearanceSettings, SecuritySettings, UserRole } from '../types/club.ts';
import { exportDatabaseBackupJson, exportFullMembersPaymentHistoryAuditCsv } from '../utils/exportTools.ts';
import { DEFAULT_CLUB_LOGO, processUploadedLogo } from '../utils/clubLogo.ts';
import { createServerBackup, getBackupHistory, restoreBackupFile } from '../services/api.ts';
import { DEFAULT_LOCAL_EXPENSE_CATEGORIES } from './ExpenseModal.tsx';

interface AdminSettingsProps {
  settings: ClubSettings;
  db: ClubDatabase;
  onSaveSettings: (newSettings: Partial<ClubSettings>) => Promise<void>;
  onRestoreBackup: (importedDb: ClubDatabase) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

type SettingsSection = 
  | 'profile' 
  | 'login_appearance' 
  | 'security' 
  | 'accounts_payments' 
  | 'backup' 
  | 'receipt_reports' 
  | 'general';

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  db,
  onSaveSettings,
  onRestoreBackup,
  onResetDemo,
}) => {
  const isBn = false;

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [formData, setFormData] = useState<ClubSettings>({ ...settings });
  const [newPin, setNewPin] = useState(settings.adminPin);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showLoginPreview, setShowLoginPreview] = useState(false);
  const [newYearInput, setNewYearInput] = useState<number>(2026);
  const [newYearMsg, setNewYearMsg] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryMsg, setCategoryMsg] = useState('');

  // Appearance state defaults
  const appearance: LoginAppearanceSettings = formData.loginAppearance || {
    themePreset: 'emerald',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    backgroundColor: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #022c22 100%)',
    buttonColor: '#059669',
    textColor: '#ffffff',
    customGreeting: 'Welcome to the Official Club Management & Accounting Portal',
    showTagline: true,
  };

  // Security state defaults
  const security: SecuritySettings = formData.security || {
    sessionTimeoutMinutes: 120,
    passwordMinLength: 4,
    requireStrongPassword: false,
    loginHistoryRetentionDays: 90,
    defaultRoleForNewUsers: 'Payment Entry',
    allowSelfRegistration: false,
  };

  const handleInputChange = (field: keyof ClubSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field: keyof LoginAppearanceSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      loginAppearance: {
        ...(prev.loginAppearance || appearance),
        [field]: value,
      },
    }));
  };

  const handleSecurityChange = (field: keyof SecuritySettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      security: {
        ...(prev.security || security),
        [field]: value,
      },
    }));
  };

  const handleThemePresetSelect = (preset: 'emerald' | 'indigo' | 'sunset' | 'ocean' | 'royal') => {
    let primary = '#059669';
    let secondary = '#0f172a';
    let bg = 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #022c22 100%)';
    let btn = '#059669';

    if (preset === 'indigo') {
      primary = '#6366f1';
      secondary = '#0f172a';
      bg = 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #1e1b4b 100%)';
      btn = '#4f46e5';
    } else if (preset === 'sunset') {
      primary = '#f59e0b';
      secondary = '#1c1917';
      bg = 'linear-gradient(135deg, #1c1917 0%, #78350f 50%, #451a03 100%)';
      btn = '#d97706';
    } else if (preset === 'ocean') {
      primary = '#0284c7';
      secondary = '#082f49';
      bg = 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0c4a6e 100%)';
      btn = '#0284c7';
    } else if (preset === 'royal') {
      primary = '#9333ea';
      secondary = '#1e1b4b';
      bg = 'linear-gradient(135deg, #1e1b4b 0%, #581c87 50%, #3b0764 100%)';
      btn = '#9333ea';
    }

    setFormData(prev => ({
      ...prev,
      loginAppearance: {
        ...(prev.loginAppearance || appearance),
        themePreset: preset,
        primaryColor: primary,
        secondaryColor: secondary,
        backgroundColor: bg,
        buttonColor: btn,
        textColor: '#ffffff',
      },
    }));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      setErrorMsg('');
      const optimizedLogoUrl = await processUploadedLogo(file);
      setFormData(prev => ({ ...prev, logoUrl: optimizedLogoUrl }));
      setSuccessMsg('Logo uploaded and optimized successfully! Click "Save All Settings" to commit.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload logo image');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleUseDefaultEmblem = () => {
    setFormData(prev => ({ ...prev, logoUrl: DEFAULT_CLUB_LOGO }));
    setSuccessMsg('Default official club emblem selected.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: undefined }));
    setSuccessMsg('Logo removed.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await onSaveSettings({
        ...formData,
        adminPin: newPin.trim() || formData.adminPin,
      });
      setIsSaving(false);
      setSuccessMsg('All club settings, themes, and policies saved and applied automatically!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update settings');
      setIsSaving(false);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.members || !parsed.receipts || !parsed.expenses) {
          throw new Error('Invalid club backup file structure.');
        }
        if (window.confirm('Restore database from this backup file? Existing data will be safely updated.')) {
          await onRestoreBackup(parsed);
          setSuccessMsg('Database restored successfully from backup file!');
        }
      } catch (err: any) {
        setErrorMsg('Failed to restore backup: ' + (err.message || 'Corrupted file'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDemoData = async () => {
    if (window.confirm('Are you sure you want to reset all records to default demo data?')) {
      try {
        await onResetDemo();
        setSuccessMsg('Demo data reset successfully.');
      } catch (err: any) {
        setErrorMsg('Reset failed: ' + err.message);
      }
    }
  };

  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleCreateServerBackupNow = async () => {
    setIsBackingUp(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const record = await createServerBackup(newPin.trim() || formData.adminPin);
      setSuccessMsg(`Server safety snapshot created: ${record.filename} (${record.fileSizeKb} KB).`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to trigger server backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const navSections: { id: SettingsSection; label: string; icon: any }[] = [
    { id: 'profile', label: 'Club Profile', icon: Settings },
    { id: 'login_appearance', label: 'Login Appearance & Themes', icon: Palette },
    { id: 'security', label: 'Security & PIN', icon: ShieldCheck },
    { id: 'accounts_payments', label: 'Accounts & Payments', icon: CreditCard },
    { id: 'backup', label: 'Google Drive Backup', icon: HardDrive },
    { id: 'receipt_reports', label: 'Receipts & Reports', icon: FileText },
    { id: 'general', label: 'General & Timezone', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Comprehensive Club Configuration</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure club identification, login branding & gradients, security policies, fees, and persistent backup schedules.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setFormData({ ...settings })}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel / Revert
          </button>

          <button
            type="button"
            onClick={() => setShowLoginPreview(true)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Preview Login</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
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

      {/* Settings Navigation Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60 text-xs font-bold scrollbar-none">
        {navSections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION CONTENT */}

      {/* 1. CLUB PROFILE */}
      {activeSection === 'profile' && (
        <div className="space-y-6">
          {/* Logo Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Official Club Logo & Emblem</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Appears on Login, Receipts, PDFs & Reports
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center pt-2">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Active Logo
                </span>
                {formData.logoUrl ? (
                  <div className="text-center">
                    <img
                      src={formData.logoUrl}
                      alt="Club Logo Preview"
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 object-contain rounded-2xl bg-white p-2 border border-slate-200 shadow-md mx-auto"
                    />
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-2 inline-block">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-200/60 border border-slate-300 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-7 h-7 mb-1" />
                    <span className="text-[10px] font-medium">No Logo</span>
                  </div>
                )}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`md:col-span-2 border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                  dragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isUploadingLogo ? 'Processing...' : 'Upload Club Logo File'}
                  </h4>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <label className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition-all active:scale-95">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleUseDefaultEmblem}
                      className="inline-flex items-center space-x-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Default Official Crest</span>
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center space-x-1 text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-xl text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">PNG, JPG, WebP, SVG • Max 5MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Identification Details */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Club Profile & Legal Entity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Club Full Name *</label>
                <input
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => handleInputChange('clubName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registration / Societies No.</label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Village, Town & Ward</label>
                <input
                  type="text"
                  value={formData.villageTown}
                  onChange={(e) => handleInputChange('villageTown', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motto / Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Mobile Phone</label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOGIN PAGE APPEARANCE & THEMES */}
      {activeSection === 'login_appearance' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">Login Page Appearance & Color Palette</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowLoginPreview(true)}
              className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Modal Preview</span>
            </button>
          </div>

          {/* Theme Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Choose Pre-Configured Vibrant Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'emerald', label: 'Emerald Forest', color: '#059669', bg: 'bg-emerald-700' },
                { id: 'indigo', label: 'Indigo Night', color: '#4f46e5', bg: 'bg-indigo-700' },
                { id: 'sunset', label: 'Golden Sunset', color: '#d97706', bg: 'bg-amber-700' },
                { id: 'ocean', label: 'Ocean Blue', color: '#0284c7', bg: 'bg-sky-700' },
                { id: 'royal', label: 'Royal Purple', color: '#9333ea', bg: 'bg-purple-700' },
              ].map((thm) => (
                <button
                  key={thm.id}
                  type="button"
                  onClick={() => handleThemePresetSelect(thm.id as any)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    appearance.themePreset === thm.id
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${thm.bg} mx-auto mb-1.5 shadow`} />
                  <span className="text-xs font-bold text-slate-800 block">{thm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Granular Color Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Brand Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={appearance.primaryColor}
                  onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={appearance.primaryColor}
                  onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Button Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={appearance.buttonColor}
                  onChange={(e) => handleAppearanceChange('buttonColor', e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={appearance.buttonColor}
                  onChange={(e) => handleAppearanceChange('buttonColor', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Secondary / Dark Base</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={appearance.secondaryColor}
                  onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                />
                <input
                  type="text"
                  value={appearance.secondaryColor}
                  onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Custom Portal Greeting</label>
              <input
                type="text"
                value={appearance.customGreeting || ''}
                onChange={(e) => handleAppearanceChange('customGreeting', e.target.value)}
                placeholder="Welcome to the Official Club Management & Accounting Portal"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div className="sm:col-span-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-slate-800 text-xs sm:text-sm">Show Quick Login Account Badges</span>
                <span className="text-xs text-slate-500">
                  When enabled, shows one-click test login badges (Admin, Accounts, Collection) on the login screen. Turn OFF to hide.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appearance.showQuickLoginButtons ?? false}
                  onChange={(e) => handleAppearanceChange('showQuickLoginButtons', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECURITY & PIN */}
      {activeSection === 'security' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-900">Security Policies & Admin Master PIN</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Master PIN (4 to 8 Digits)</label>
              <input
                type="text"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Protects master actions and approvals.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Session Inactivity Timeout (Minutes)</label>
              <input
                type="number"
                min={15}
                max={480}
                value={security.sessionTimeoutMinutes}
                onChange={(e) => handleSecurityChange('sessionTimeoutMinutes', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Role for New Users</label>
              <select
                value={security.defaultRoleForNewUsers}
                onChange={(e) => handleSecurityChange('defaultRoleForNewUsers', e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
              >
                <option value="Payment Entry">Payment Entry</option>
                <option value="Accounts">Accounts</option>
                <option value="Member Management">Member Management</option>
                <option value="Reports">Reports</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Login History Retention (Days)</label>
              <input
                type="number"
                min={30}
                max={365}
                value={security.loginHistoryRetentionDays}
                onChange={(e) => handleSecurityChange('loginHistoryRetentionDays', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. ACCOUNTS & PAYMENTS */}
      {activeSection === 'accounts_payments' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">Annual Membership Tariffs & Receipt Numbering</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Annual Fee: Club Core Member ({formData.currency})
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={formData.defaultAnnualClubFee}
                onChange={(e) => handleInputChange('defaultAnnualClubFee', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Annual Fee: Village Resident ({formData.currency})
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={formData.defaultAnnualVillageFee}
                onChange={(e) => handleInputChange('defaultAnnualVillageFee', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Number Prefix</label>
              <input
                type="text"
                value={formData.receiptNumberPrefix || 'RCP'}
                onChange={(e) => handleInputChange('receiptNumberPrefix', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Treasurer / Cashier Signatory</label>
              <input
                type="text"
                value={formData.treasurerName}
                onChange={(e) => handleInputChange('treasurerName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Secretary / President Signatory</label>
              <input
                type="text"
                value={formData.secretaryName}
                onChange={(e) => handleInputChange('secretaryName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Local Expense Categories Management */}
          <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>Local Expense Categories Management</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configures the category options in the Local Expense dropdown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleInputChange('customLocalExpenseCategories', [...DEFAULT_LOCAL_EXPENSE_CATEGORIES]);
                  setCategoryMsg('Reset to 12 default Local Expense categories.');
                  setTimeout(() => setCategoryMsg(''), 4000);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold"
              >
                Reset to Standard 12 Categories
              </button>
            </div>

            {/* List of active categories */}
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
              {(formData.customLocalExpenseCategories && formData.customLocalExpenseCategories.length > 0 
                ? formData.customLocalExpenseCategories 
                : DEFAULT_LOCAL_EXPENSE_CATEGORIES
              ).map((cat, idx) => {
                const isDefault = DEFAULT_LOCAL_EXPENSE_CATEGORIES.includes(cat);
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-xs"
                  >
                    <span>{idx + 1}. {cat}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = formData.customLocalExpenseCategories && formData.customLocalExpenseCategories.length > 0 
                          ? formData.customLocalExpenseCategories 
                          : [...DEFAULT_LOCAL_EXPENSE_CATEGORIES];
                        const updated = current.filter(c => c !== cat);
                        handleInputChange('customLocalExpenseCategories', updated);
                      }}
                      className="ml-1 text-slate-400 hover:text-rose-600 p-0.5 rounded"
                      title="Remove category"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Add new category form */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New category name (e.g. Generator Fuel & Hire)..."
                className="flex-1 min-w-[200px] bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newCategoryInput.trim();
                  if (!trimmed) return;
                  const current = formData.customLocalExpenseCategories && formData.customLocalExpenseCategories.length > 0 
                    ? formData.customLocalExpenseCategories 
                    : [...DEFAULT_LOCAL_EXPENSE_CATEGORIES];
                  if (current.includes(trimmed)) {
                    setCategoryMsg(`Category "${trimmed}" already exists.`);
                    return;
                  }
                  const updated = [...current, trimmed];
                  handleInputChange('customLocalExpenseCategories', updated);
                  setNewCategoryInput('');
                  setCategoryMsg(`Added "${trimmed}"! Remember to save settings.`);
                  setTimeout(() => setCategoryMsg(''), 4000);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
            {categoryMsg && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                {categoryMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. BACKUP & GOOGLE DRIVE */}
      {activeSection === 'backup' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Google Drive & Automated Daily Backups</h3>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Google Drive 11:00 PM IST Scheduled Protection:</p>
                <p className="text-slate-600 mt-1">
                  Dedicated Google Drive destination folder: <strong>{formData.googleDriveBackupFolder || 'Club Management App Backups'}</strong>. All tables (members, payments, vouchers, organizers, programs, audit trails, and users) are safeguarded with atomic JSON backups and one-click Google Sheets CSV exports.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Google Drive Folder Name</label>
              <input
                type="text"
                value={formData.googleDriveBackupFolder || 'Club Management App Backups'}
                onChange={(e) => handleInputChange('googleDriveBackupFolder', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Backup Notification Email</label>
              <input
                type="email"
                value={formData.backupNotificationEmail || formData.contactEmail}
                onChange={(e) => handleInputChange('backupNotificationEmail', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Backup Action Controls */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isBackingUp}
              onClick={handleCreateServerBackupNow}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isBackingUp ? 'Creating Safety Snapshot...' : 'Create Backup Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportDatabaseBackupJson(db)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (.JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => exportFullMembersPaymentHistoryAuditCsv(db.members, db.receipts, settings, settings.activeFinancialYear)}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              title="Export complete members list and payment history to CSV format for external audits"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Audit Export (Members + Payments CSV)</span>
            </button>

            <label className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Restore from JSON File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-rose-600" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. RECEIPTS & REPORTS */}
      {activeSection === 'receipt_reports' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Receipt & Report Custom Text</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
              <textarea
                rows={2}
                value={formData.receiptFooterText || ''}
                onChange={(e) => handleInputChange('receiptFooterText', e.target.value)}
                placeholder="Thank you for supporting community welfare, sports & cultural harmony!"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Voucher Footer Note</label>
              <textarea
                rows={2}
                value={formData.voucherFooterText || ''}
                onChange={(e) => handleInputChange('voucherFooterText', e.target.value)}
                placeholder="Passed and verified for club operational expenses."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Accounts Statement Heading</label>
              <input
                type="text"
                value={formData.reportHeading || ''}
                onChange={(e) => handleInputChange('reportHeading', e.target.value)}
                placeholder="Janakalyan Village & Youth Club — Financial Ledger & Accounts Statement"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. GENERAL & TIMEZONE */}
      {activeSection === 'general' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Regional Formats & Active Financial Year</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Financial Year</label>
              <select
                value={formData.activeFinancialYear}
                onChange={(e) => handleInputChange('activeFinancialYear', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              >
                {(formData.financialYears && formData.financialYears.length > 0 ? formData.financialYears : [2024, 2025]).map(yr => (
                  <option key={yr} value={yr}>
                    FY {yr - 1}-{yr} ({yr}) {yr === formData.activeFinancialYear ? '— Current' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">System Timezone</label>
              <input
                type="text"
                disabled
                value={formData.timezone || 'Asia/Kolkata'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-mono font-medium"
              />
            </div>
          </div>

          {/* Admin Financial Years Ledger Control */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">Financial Years Ledger Control</h4>
                <p className="text-[11px] text-slate-500">Only authorized Administrators can create new accounting years.</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(formData.financialYears || [2024, 2025]).map(yr => (
                  <span 
                    key={yr} 
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      yr === formData.activeFinancialYear
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    FY {yr - 1}-{yr} ({yr})
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Add New Financial Year:</label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={newYearInput}
                onChange={(e) => {
                  setNewYearInput(Number(e.target.value));
                  setNewYearMsg('');
                }}
                className="w-28 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  const years = formData.financialYears || [2024, 2025];
                  if (!newYearInput || isNaN(newYearInput)) {
                    setNewYearMsg('Please enter a valid year number.');
                    return;
                  }
                  if (years.includes(newYearInput)) {
                    setNewYearMsg(`Year ${newYearInput} is already registered.`);
                    return;
                  }
                  const updatedYears = [...years, newYearInput].sort((a, b) => b - a);
                  handleInputChange('financialYears', updatedYears);
                  setNewYearMsg(`FY ${newYearInput - 1}-${newYearInput} added! Remember to save settings.`);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                + Add Financial Year
              </button>
              {newYearMsg && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {newYearMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE LOGIN PREVIEW MODAL */}
      {showLoginPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md space-y-2">
            <div className="flex items-center justify-between text-white pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Login Preview (Simulated)
              </span>
              <button
                onClick={() => setShowLoginPreview(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="rounded-3xl p-7 border border-white/10 shadow-2xl text-white relative overflow-hidden"
              style={{
                background: appearance.backgroundColor.includes('gradient')
                  ? appearance.backgroundColor
                  : `linear-gradient(135deg, ${appearance.secondaryColor} 0%, ${appearance.backgroundColor} 100%)`,
              }}
            >
              <div className="text-center space-y-3 pb-5 border-b border-white/10">
                <div className="flex justify-center">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 object-contain rounded-2xl bg-white/10 p-1.5 border border-white/20 shadow-lg"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl"
                      style={{ backgroundColor: appearance.primaryColor }}
                    >
                      {formData.clubName.charAt(0) || 'C'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{formData.clubName}</h3>
                  <p className="text-[11px] text-slate-300">{formData.villageTown}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="bg-white/10 rounded-xl p-2.5 text-xs text-slate-400 border border-white/10">
                  User ID / Email input
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 text-xs text-slate-400 border border-white/10">
                  Password input ••••••••
                </div>
                <button
                  type="button"
                  style={{ backgroundColor: appearance.buttonColor }}
                  className="w-full text-white font-bold py-2.5 rounded-xl shadow-lg text-xs"
                >
                  Secure Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
