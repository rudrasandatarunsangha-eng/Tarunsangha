import React, { useState } from 'react';
import { 
  Award, 
  Plus, 
  Phone, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Check, 
  X, 
  Save,
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { Organizer, OrganizerRole, Member, ClubSettings } from '../types/club.ts';
import { createWhatsAppChatUrl } from '../utils/whatsapp.ts';

interface OrganizersListProps {
  organizers: Organizer[];
  members: Member[];
  settings: ClubSettings;
  isAdminUnlocked: boolean;
  onOpenPinModal: () => void;
  onSaveOrganizer: (org: Partial<Organizer>) => Promise<void>;
  onDeleteOrganizer: (id: string) => Promise<void>;
}

export const OrganizersList: React.FC<OrganizersListProps> = ({
  organizers,
  members,
  settings,
  isAdminUnlocked,
  onOpenPinModal,
  onSaveOrganizer,
  onDeleteOrganizer,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organizer | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organizer | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<OrganizerRole>('Executive Member');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyOrClubName, setCompanyOrClubName] = useState(settings.clubName);
  const [termPeriod, setTermPeriod] = useState('2025 - 2027');
  const [responsibilities, setResponsibilities] = useState('');
  const [isSignatory, setIsSignatory] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [remarks, setRemarks] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingOrg(null);
    setName('');
    setRole('Executive Member');
    setPhone('');
    setAddress(settings.villageTown || '');
    setCompanyOrClubName(settings.clubName);
    setTermPeriod('2025 - 2027');
    setResponsibilities('');
    setIsSignatory(false);
    setStatus('active');
    setRemarks('');
    setSelectedMemberId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (org: Organizer) => {
    setEditingOrg(org);
    setName(org.name);
    setRole(org.role);
    setPhone(org.phone);
    setAddress(org.address || '');
    setCompanyOrClubName(org.companyOrClubName || settings.clubName);
    setTermPeriod(org.termPeriod || '2025 - 2027');
    setResponsibilities(org.responsibilities || '');
    setIsSignatory(org.isSignatory);
    setStatus(org.status || 'active');
    setRemarks(org.remarks || '');
    setSelectedMemberId(org.memberId || '');
    setIsModalOpen(true);
  };

  const handleMemberSelect = (mId: string) => {
    setSelectedMemberId(mId);
    if (mId) {
      const found = members.find(m => m.id === mId);
      if (found) {
        setName(found.name);
        setPhone(found.phone || '');
        setAddress(found.address || found.villageWard || '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveOrganizer({
        ...(editingOrg ? { id: editingOrg.id } : {}),
        name: name.trim(),
        role,
        phone: phone.trim(),
        address: address.trim(),
        companyOrClubName: companyOrClubName.trim(),
        termPeriod: termPeriod.trim(),
        responsibilities: responsibilities.trim(),
        isSignatory,
        status,
        remarks: remarks.trim(),
        memberId: selectedMemberId || undefined,
      });
      setIsSubmitting(false);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleDelete = (org: Organizer) => {
    if (!isAdminUnlocked) {
      onOpenPinModal();
      return;
    }
    setOrgToDelete(org);
    setDeleteError('');
  };

  const handleWhatsApp = (phone: string, name: string, role: string) => {
    const text = `Namaskar ${name} ji (${role}), greetings regarding club executive duties for ${settings.clubName}.`;
    const url = createWhatsAppChatUrl(phone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Club Organizers & Executive Committee</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
              {organizers.length} Officials
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Governing body, authorized receipt signatories, program organizers and conveners for {settings.clubName}.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Organizer</span>
        </button>
      </div>

      {/* Grid of Committee Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizers.map((org) => {
          const isKeySignatory = org.isSignatory;
          const isActive = org.status !== 'inactive';

          return (
            <div
              key={org.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header ID, Role & Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {org.id}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {org.role}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isKeySignatory && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-0.5" /> Signatory
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Name & Organization */}
                <h3 className="font-bold text-lg text-slate-900 mt-1">{org.name}</h3>
                <p className="text-xs text-indigo-800 font-medium">
                  {org.companyOrClubName || settings.clubName}
                </p>

                {/* Term Period */}
                {org.termPeriod && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tenure: <span className="font-semibold text-slate-700">{org.termPeriod}</span>
                  </p>
                )}

                {/* Phone & Address */}
                <div className="space-y-1 mt-2.5 text-xs text-slate-600">
                  <div className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                    <span>{org.phone || 'No phone recorded'}</span>
                  </div>
                  {org.address && (
                    <div className="flex items-start">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-500">{org.address}</span>
                    </div>
                  )}
                </div>

                {/* Remarks & Responsibilities */}
                {(org.responsibilities || org.remarks) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {org.responsibilities && (
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong className="text-slate-500 text-[11px]">Duties: </strong>
                        {org.responsibilities}
                      </p>
                    )}
                    {org.remarks && (
                      <p className="text-[11px] text-slate-500 italic">
                        Note: {org.remarks}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {org.phone && (
                    <button
                      onClick={() => handleWhatsApp(org.phone, org.name, org.role)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Send WhatsApp message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(org)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit Official Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(org)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Official (Admin Mode Only)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Organizer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-lg">
                  {editingOrg ? `Edit Organizer (${editingOrg.id})` : 'Add New Organizer / Official'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              {/* Link from registered members */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Autofill from Registered Club Member
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Member or Type Manually --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                  ))}
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organizer Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Subhash Roy"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Company / Club / Committee Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Club / Committee Name
                </label>
                <input
                  type="text"
                  value={companyOrClubName}
                  onChange={(e) => setCompanyOrClubName(e.target.value)}
                  placeholder="e.g. Janakalyan Sports Committee"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Full Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Station Road, Uttar Para, Ward 3"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role, Tenure & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as OrganizerRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs sm:text-sm"
                  >
                    <option value="President">President</option>
                    <option value="Secretary">Secretary</option>
                    <option value="Treasurer / Cashier">Treasurer / Cashier</option>
                    <option value="Vice President">Vice President</option>
                    <option value="Assistant Secretary">Assistant Secretary</option>
                    <option value="Sports Secretary">Sports Secretary</option>
                    <option value="Cultural Convener">Cultural Convener</option>
                    <option value="Event Organizer">Event Organizer</option>
                    <option value="Executive Member">Executive Member</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenure Period</label>
                  <input
                    type="text"
                    value={termPeriod}
                    onChange={(e) => setTermPeriod(e.target.value)}
                    placeholder="e.g. 2025 - 2027"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsibilities & Role Details</label>
                <textarea
                  rows={2}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="e.g. Accounts custodian, program contract bookings, receipt verification"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any special remarks or committee notes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Signatory Checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isSignatory"
                  checked={isSignatory}
                  onChange={(e) => setIsSignatory(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="isSignatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Authorized Signatory (Appears on receipts & financial vouchers)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl shadow-md flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingOrg ? 'Update Organizer' : 'Save Organizer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Delete Official Confirmation</h3>
              </div>
              <button
                onClick={() => setOrgToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to remove this official from the committee?</p>
              <p>Name: <strong>{orgToDelete.name}</strong> ({orgToDelete.id})</p>
              <p>Designation: <strong>{orgToDelete.role}</strong></p>
              <p className="text-[11px] text-rose-700 mt-2 font-medium">
                This action is permanently recorded in the administrative audit log.
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
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
                    await onDeleteOrganizer(orgToDelete.id);
                    setOrgToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete organizer');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Official'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
