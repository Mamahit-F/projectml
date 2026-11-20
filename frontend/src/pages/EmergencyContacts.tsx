import React, { useEffect, useState } from 'react';
import { ShieldAlert, Phone, MapPin, User, Search } from 'lucide-react';
import { studentService } from '../services';
import type { Student } from '../types';
import { Button, LoadingState, EmptyState } from '../components/ui';

export const EmergencyContacts: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await studentService.getAll({ size: 100, search: search || undefined });
      setStudents(res.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Buku Kontak Darurat Mahasiswa Outsider</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Akses terbatas Village Dean & Administrator untuk penanganan situasi darurat & keselamatan
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="max-w-md flex gap-2">
        <input
          type="text"
          placeholder="Cari mahasiswa atau kontak darurat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <Button type="submit" size="sm" variant="secondary">Cari</Button>
      </form>

      {/* Cards Grid */}
      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState message="Tidak ada data mahasiswa ditemukan." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s: any) => {
            const contact = s.emergencyContacts && s.emergencyContacts.length > 0 ? s.emergencyContacts[0] : null;
            const categoryName = s.residenceCategory?.name || s.residenceCategoryName || 'Outsider';
            const studyProgram = s.studyProgram || s.programStudy || '';
            const address = s.currentAddress || s.residenceAddress;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {s.nim}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {categoryName}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{s.fullName}</h3>
                  <p className="text-xs text-slate-500">{studyProgram}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{address || 'Alamat kos belum dicatat'}</span>
                    </div>
                    {s.phoneNumber && (
                      <div className="flex items-center gap-2 text-slate-600 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Mhs: {s.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 bg-red-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                  <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1">
                    Kontak Darurat (Wali / Orang Tua):
                  </p>
                  {contact ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900">{contact.contactName} ({contact.relationship})</p>
                      <a
                        href={`tel:${contact.phoneNumber}`}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-red-600 mt-1 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phoneNumber}
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Belum mendaftarkan kontak darurat.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
