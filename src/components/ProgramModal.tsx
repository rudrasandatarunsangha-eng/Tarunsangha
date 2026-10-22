import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Building2, 
  Clock, 
  IndianRupee, 
  FileText, 
  Save, 
  AlertCircle,
  MapPin,
  Phone
} from 'lucide-react';
import { Program, Organizer, ProgramStatus, ProgramType, ClubSettings } from '../types/club.ts';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programToEdit?: Program | null;
  organizers: Organizer[];
  settings: ClubSettings;
  onSaveProgram: (programData: Partial<Program>) => Promise<void>;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({
  isOpen,
  onClose,
  programToEdit,
  organizers,
  settings,
  onSaveProgram,
}) => {
  const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [organizerCompany, setOrganizerCompany] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Cultural Festival');
  const [venue, setVenue] = useState('Club Community Hall');
  const [venueAddress, setVenueAddress] = useState(settings.villageTown || '');
  const [programDate, setProgramDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('08:00 PM');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalContractAmount, setTotalContractAmount] = useState<number>(0);
  const [initialAdvanceAmount, setInitialAdvanceAmount] = useState<number>(0);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('Booked');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (programToEdit) {
      setSelectedOrganizerId(programToEdit.organizerId || '');
      setOrganizerName(programToEdit.organizerName);
      setOrganizerPhone(programToEdit.organizerPhone || '');
      setOrganizerCompany(programToEdit.organizerCompany || '');
      setName(programToEdit.name);
      setType(programToEdit.type);
      setVenue(programToEdit.venue);
      setVenueAddress(programToEdit.venueAddress);
      setProgramDate(programToEdit.programDate);
      setStartTime(programToEdit.startTime);
      setEndTime(programToEdit.endTime);
      setContractDate(programToEdit.contractDate);
      setTotalContractAmount(programToEdit.totalContractAmount);
      setInitialAdvanceAmount(programToEdit.initialAdvanceAmount);
      setSpecialInstructions(programToEdit.specialInstructions || '');
      setStatus(programToEdit.status);
    } else {
      setSelectedOrganizerId(organizers[0]?.id || '');
      if (organizers[0]) {
        setOrganizerName(organizers[0].name);
        setOrganizerPhone(organizers[0].phone);
        setOrganizerCompany(organizers[0].companyOrClubName);
      } else {
        setOrganizerName('');
        setOrganizerPhone('');
        setOrganizerCompany('');
      }
      setName('');
      setType('Cultural Festival');
      setVenue('Club Community Hall & Grounds');
      setVenueAddress(settings.villageTown || '');
      setProgramDate(new Date().toISOString().split('T')[0]);
      setStartTime('10:00 AM');
      setEndTime('08:00 PM');
      setContractDate(new Date().toISOString().split('T')[0]);
      setTotalContractAmount(25000);
      setInitialAdvanceAmount(10000);
      setSpecialInstructions('');
      setStatus('Booked');
    }
    setError('');
  }, [programToEdit, isOpen, organizers, settings]);

  const handleOrganizerChange = (orgId: string) => {
    setSelectedOrganizerId(orgId);
    if (orgId === 'custom') {
      setOrganizerName('');
      setOrganizerPhone('');
      setOrganizerCompany('');
    } else {
      const found = organizers.find(o => o.id === orgId);
      if (found) {
        setOrganizerName(found.name);
        setOrganizerPhone(found.phone);
        setOrganizerCompany(found.companyOrClubName);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Program Name is required.');
      return;
    }
    if (!organizerName.trim()) {
      setError('Organizer Name is required.');
      return;
    }
    if (totalContractAmount < 0) {
      setError('Contract amount cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveProgram({
        ...(programToEdit ? { id: programToEdit.id } : {}),
        organizerId: selectedOrganizerId === 'custom' ? '' : selectedOrganizerId,
        organizerName: organizerName.trim(),
        organizerPhone: organizerPhone.trim(),
        organizerCompany: organizerCompany.trim(),
        name: name.trim(),
        type,
        venue: venue.trim(),
        venueAddress: venueAddress.trim(),
        programDate,
        startTime,
        endTime,
        contractDate,
        totalContractAmount: Number(totalContractAmount),
        initialAdvanceAmount: Number(initialAdvanceAmount),
        specialInstructions: specialInstructions.trim(),
        status,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save program details');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-300" />
            <h3 className="font-bold text-lg">
              {programToEdit ? `Edit Program: ${programToEdit.name}` : 'Book / Add New Program Contract'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Organizer Selection */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
              1. Organizer & Contract Client Information
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Existing Organizer (Auto-populates details):
              </label>
              <select
                value={selectedOrganizerId}
                onChange={(e) => handleOrganizerChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">-- Choose Organizer --</option>
                {organizers.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.companyOrClubName || o.role}) • {o.phone}
                  </option>
                ))}
                <option value="custom">+ New / External Client Organizer</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organizer Name *</label>
                <input
                  type="text"
                  required
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Subhash Roy"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Committee Name</label>
                <input
                  type="text"
                  value={organizerCompany}
                  onChange={(e) => setOrganizerCompany(e.target.value)}
                  placeholder="e.g. Festival Committee"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section: Program Details */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              2. Event & Program Logistics
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Annual Winter Football Cup 2026"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Cultural Festival">Cultural Festival & Drama</option>
                  <option value="Sports Tournament">Sports Tournament / Match</option>
                  <option value="Blood Donation & Health Camp">Blood Donation & Health Camp</option>
                  <option value="Religious Festival / Puja">Religious Festival / Puja</option>
                  <option value="Musical Night & Concert">Musical Night & Concert</option>
                  <option value="Community Feast & Banquet">Community Feast & Banquet</option>
                  <option value="Youth & Education Workshop">Youth & Education Workshop</option>
                  <option value="Exhibition & Fair">Exhibition & Fair</option>
                  <option value="Other Event">Other Event</option>
                </select>
              </div>
            </div>

            {/* Venue & Venue Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program Venue *</label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. High School Playground"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue Full Address</label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="e.g. Station Road, Gramin Para, Ward 3"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Date and Timings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program Date *</label>
                <input
                  type="date"
                  required
                  value={programDate}
                  onChange={(e) => setProgramDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="e.g. 08:00 PM"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Contract & Financials */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
              3. Contract Financials & Terms
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Date</label>
                <input
                  type="date"
                  required
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Contract Amount ({settings.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={totalContractAmount}
                  onChange={(e) => setTotalContractAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Advance Agreed ({settings.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={initialAdvanceAmount}
                  onChange={(e) => setInitialAdvanceAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Program Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProgramStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
              >
                <option value="Booked">Booked (Contract Signed)</option>
                <option value="Upcoming">Upcoming (Scheduled)</option>
                <option value="In Progress">In Progress (Ongoing)</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions & Deliverables</label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Include stage lighting, PA system, 200 chairs, volunteer team, and generator backup."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3 flex-shrink-0">
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
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Contract...' : programToEdit ? 'Update Program' : 'Save & Book Program'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
