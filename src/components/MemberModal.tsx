import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Member, MemberCategory } from '../types/club.ts';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  onSaveMember: (memberData: Partial<Member>) => Promise<void>;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  onSaveMember,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<MemberCategory>('village_resident');
  const [villageWard, setVillageWard] = useState('Ward No. 1 (Uttar Para)');
  const [guardianName, setGuardianName] = useState('');
  const [address, setAddress] = useState('');
  const [joinedYear, setJoinedYear] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setPhone(memberToEdit.phone || '');
      setCategory(memberToEdit.category);
      setVillageWard(memberToEdit.villageWard || 'Ward No. 1');
      setGuardianName(memberToEdit.guardianName || '');
      setAddress(memberToEdit.address || '');
      setJoinedYear(memberToEdit.joinedYear || new Date().getFullYear());
      setStatus(memberToEdit.status || 'active');
      setNotes(memberToEdit.notes || '');
      setPhotoUrl(memberToEdit.photoUrl || '');
      setBloodGroup(memberToEdit.bloodGroup || '');
      setEmailInput(memberToEdit.email || '');
      setPasswordInput('');
    } else {
      setName('');
      setPhone('');
      setCategory('village_resident');
      setVillageWard('Ward No. 1 (Uttar Para)');
      setGuardianName('');
      setAddress('');
      setJoinedYear(new Date().getFullYear());
      setStatus('active');
      setNotes('');
      setPhotoUrl('');
      setBloodGroup('');
      setEmailInput('');
      setPasswordInput('member123');
    }
    setError('');
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveMember({
        ...(memberToEdit ? { id: memberToEdit.id } : {}),
        name: name.trim(),
        phone: phone.trim(),
        category,
        villageWard: villageWard.trim(),
        guardianName: guardianName.trim(),
        address: address.trim(),
        joinedYear: Number(joinedYear),
        status,
        notes: notes.trim(),
        photoUrl: photoUrl.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        email: emailInput.trim() || undefined,
        ...(!memberToEdit && passwordInput.trim() ? { password: passwordInput.trim() } : {}),
      } as any);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save member details');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">
              {memberToEdit ? `Edit Member: ${memberToEdit.id}` : 'Register New Member'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Subir Kumar Mukherjee"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98301 23456"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category & Ward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Member Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MemberCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="village_resident">Village Resident (General)</option>
                <option value="club_member">Club Core Member (Youth / Active)</option>
                <option value="patron">Honorary Patron / Advisory</option>
                <option value="senior">Senior Citizen</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village Ward / Para</label>
              <input
                type="text"
                value={villageWard}
                onChange={(e) => setVillageWard(e.target.value)}
                placeholder="e.g. Ward No. 2 (Mondal Para)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Father / Guardian & Joined Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Father / Guardian Name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Late R. Mukherjee"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Joined Year</label>
              <input
                type="number"
                value={joinedYear}
                onChange={(e) => setJoinedYear(Number(e.target.value))}
                min="1950"
                max="2030"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Home Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Near Shiva Temple, House No. 24"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Membership Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Notes / Volunteer Role</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Assists with blood donation camp"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Member Photo & Blood Group (For ID Card) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="">Select (Optional)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                ID Card Photo (Upload or Paste URL)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... or click Upload"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate"
                />
                <label className="flex-shrink-0 cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        setPhotoUrl(dataUrl);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              {photoUrl && (
                <div className="mt-1.5 flex items-center space-x-2 text-xs text-emerald-600">
                  <img src={photoUrl} alt="Preview" className="w-6 h-6 rounded-md object-cover border" />
                  <span>Photo ready for ID card</span>
                </div>
              )}
            </div>
          </div>

          {/* Member User ID & Password Management (Admin Member Management) */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-indigo-950 text-xs">
                Member Portal Login Credentials
              </label>
              <span className="text-[10px] text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded font-mono">
                {memberToEdit ? `User ID: ${memberToEdit.id}` : 'Auto-generated on Save'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-700">
              {memberToEdit 
                ? 'User account credentials and permissions are managed in the User Roles panel. Existing passwords are preserved.' 
                : 'Admin can set an initial login password for this member account.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {!memberToEdit && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Initial Login Password
                  </label>
                  <input
                    type="text"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="e.g. member123"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Email (Optional notification ID)
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="member@gmail.com"
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : memberToEdit ? 'Update Member' : 'Register Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
