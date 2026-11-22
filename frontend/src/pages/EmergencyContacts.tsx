import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Plus, Search, MapPin, ArrowUpRight, UserRound } from 'lucide-react';
import { emergencyContactService } from '../services';
import type { EmergencyContact } from '../types';
import {
  Button,
  LoadingState,
  EmptyState,
  Modal,
  Input,
  Select,
  Textarea,
  RiskBadge,
  StudentSearchSelect,
} from '../components/ui';

export const EmergencyContacts: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add contact modal
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Orang Tua');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const list = await emergencyContactService.getAll(search || undefined);
      setContacts(list);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadContacts, 200);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      alert('Pilih mahasiswa terlebih dahulu.');
      return;
    }
    setSaving(true);
    try {
      await emergencyContactService.create({
        studentId,
        contactName,
        relationship,
        phoneNumber,
        address,
      });
      setIsOpen(false);
      setStudentId(null);
      setContactName('');
      setPhoneNumber('');
      setAddress('');
      loadContacts();
    } catch {
      alert('Gagal menambah kontak darurat.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">Direktori Kontak Darurat</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pilar Keamanan • Akses cepat nomor orang tua/wali dan alamat kos mahasiswa di luar asrama
          </p>
        </div>
        <div data-guide="emergency-action">
          <Button variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsOpen(true)}>
            Tambah Kontak Wali
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama mahasiswa, NIM, nama wali, atau nomor telepon..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white focus:border-obsidian"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <LoadingState />
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-8">
          <EmptyState
            message="Belum ada kontak darurat yang cocok. Tambahkan kontak wali terutama bagi mahasiswa berpoin tinggi."
            action={
              <Button variant="coral" size="sm" onClick={() => setIsOpen(true)}>
                Tambah Kontak Pertama
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 flex flex-col justify-between hover:border-obsidian/25 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <button
                    onClick={() => c.studentId && navigate(`/students/${c.studentId}`)}
                    className="text-left group"
                  >
                    <p className="text-sm font-extrabold text-obsidian group-hover:text-coral-600 inline-flex items-center gap-1">
                      {c.studentName} <ArrowUpRight className="w-3.5 h-3.5" />
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {c.studentNim} • {c.studyProgram}
                    </p>
                  </button>
                  <RiskBadge risk={c.riskCategory} />
                </div>

                <div className="bg-[#F7F8FA] rounded-2xl p-3.5 space-y-2 border border-[#EFF1F5]">
                  <div className="flex items-center gap-2 text-xs">
                    <UserRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold text-obsidian">{c.contactName}</span>
                    <span className="text-slate-400">({c.relationship})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <PhoneCall className="w-3.5 h-3.5 text-coral-500 shrink-0" />
                    <a href={`tel:${c.phoneNumber}`} className="font-mono font-bold text-coral-600 hover:underline">
                      {c.phoneNumber}
                    </a>
                  </div>
                  {c.address && (
                    <div className="flex items-start gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F0F1F4] flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  Poin Sabat: <strong className="text-obsidian">{c.latestSabbathPoints ?? 0}</strong>
                </span>
                {c.studentId && (
                  <button
                    onClick={() => navigate(`/students/${c.studentId}`)}
                    className="font-bold text-obsidian hover:text-coral-600"
                  >
                    Lihat Profil & Kos →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Contact */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Tambah Kontak Darurat Orang Tua / Wali">
        <form onSubmit={handleAdd} className="space-y-4">
          <StudentSearchSelect
            label="Pilih Mahasiswa"
            value={studentId}
            onChange={(id) => setStudentId(id)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Orang Tua / Wali" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Select
              label="Hubungan"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              options={[
                { value: 'Orang Tua', label: 'Orang Tua' },
                { value: 'Saudara', label: 'Saudara' },
                { value: 'Teman', label: 'Teman' },
              ]}
            />
          </div>
          <Input label="Nomor Telepon Aktif" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="08xxxxxxxxxx" />
          <Textarea label="Alamat Wali" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" loading={saving}>Simpan Kontak</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
