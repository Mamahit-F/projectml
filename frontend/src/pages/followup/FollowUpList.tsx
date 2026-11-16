import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Calendar, UserCheck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { followUpService, studentService } from '../../services';
import type { FollowUp, Student } from '../../types';
import { Button, LoadingState, EmptyState, Modal, Input, Select, Textarea } from '../../components/ui';

export const FollowUpList: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [followUpType, setFollowUpType] = useState('PASTORAL_COUNSELING');
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextActionRequired, setNextActionRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, sRes] = await Promise.all([
        followUpService.getAll({ size: 20 }),
        studentService.getAll({ size: 50 }).then((r) => r.content).catch(() => []),
      ]);
      setFollowUps(fRes.content);
      setStudents(sRes);
      if (sRes.length > 0) setSelectedStudentId(sRes[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await followUpService.create({
        studentId: selectedStudentId,
        followUpType,
        followUpDate,
        notes,
        outcome,
        nextActionRequired,
      });
      setIsCreateOpen(false);
      setNotes('');
      setOutcome('');
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan catatan evaluasi pembinaan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Evaluasi & Tindak Lanjut Pembinaan (Village Dean)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan bimbingan pastoral, konseling kedisiplinan, dan evaluasi hasil pembinaan mahasiswa
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          className="bg-purple-800 hover:bg-purple-900 text-white"
          onClick={() => setIsCreateOpen(true)}
        >
          Catat Hasil Konseling / Binaan
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : followUps.length === 0 ? (
          <EmptyState message="Belum ada riwayat pembinaan / konseling pastoral tercatat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Mahasiswa Binaan</th>
                  <th className="py-3 px-4 font-semibold">Jenis Konseling</th>
                  <th className="py-3 px-4 font-semibold">Catatan Pembinaan</th>
                  <th className="py-3 px-4 font-semibold">Hasil / Komitmen Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold text-center">Tindak Lanjut Lanjutan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{f.followUpDate}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{f.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{f.studentNim}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {f.followUpType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">{f.notes}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs font-medium">{f.outcome || '-'}</td>
                    <td className="py-3.5 px-4 text-center">
                      {f.nextActionRequired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Perlu Pantauan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Pencatatan Bimbingan & Pembinaan Mahasiswa">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Pilih Mahasiswa"
            required
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            options={students.map((s) => ({ value: s.id, label: `${s.fullName} (${s.nim}) - ${s.totalViolationPoints} Poin` }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Jenis Pembinaan / Bimbingan"
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value)}
              options={[
                { value: 'PASTORAL_COUNSELING', label: 'Bimbingan Rohani / Pastoral' },
                { value: 'DISCIPLINARY_CALL', label: 'Panggilan Disiplin Poin Tinggi' },
                { value: 'HOME_VISITATION', label: 'Kunjungan Tempat Tinggal (Kos)' },
                { value: 'PARENT_COORDINATION', label: 'Koordinasi dengan Orang Tua' },
              ]}
            />
            <Input
              label="Tanggal Pertemuan"
              type="date"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Catatan Hasil Konseling / Pembinaan"
            required
            rows={3}
            placeholder="Jelaskan kendala yang dialami mahasiswa dan saran pembinaan yang diberikan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Input
            label="Komitmen Mahasiswa / Rencana Tindak Lanjut"
            placeholder="Contoh: Berkomitmen hadir tepat waktu setiap Vesper dan Sabat Pagi"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="nextAction"
              checked={nextActionRequired}
              onChange={(e) => setNextActionRequired(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <label htmlFor="nextAction" className="text-xs font-semibold text-slate-700">
              Perlu evaluasi lanjutan pekan depan
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} className="bg-purple-800 hover:bg-purple-900 text-white">
              Simpan Hasil Pembinaan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
