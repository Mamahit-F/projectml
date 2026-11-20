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
  const [counselingDate, setCounselingDate] = useState(new Date().toISOString().split('T')[0]);
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('SCHEDULED');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, sRes] = await Promise.all([
        followUpService.getAll({ size: 20 }),
        studentService.getAll({ size: 50 }).then((r) => r.content).catch(() => []),
      ]);
      setFollowUps(fRes.content || []);
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
        counselingDate,
        topicsDiscussed,
        actionPlan,
        status: followUpStatus,
      });
      setIsCreateOpen(false);
      setTopicsDiscussed('');
      setActionPlan('');
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
                  <th className="py-3 px-3 font-semibold">Tanggal</th>
                  <th className="py-3 px-3 font-semibold">Mahasiswa Binaan</th>
                  <th className="py-3 px-3 font-semibold">Pembina</th>
                  <th className="py-3 px-3 font-semibold">Topik Konseling</th>
                  <th className="py-3 px-3 font-semibold">Rencana Tindak Lanjut</th>
                  <th className="py-3 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{f.counselingDate || f.followUpDate}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{f.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{f.studentNim}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{f.conductedByUserName || '-'}</td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs">{f.topicsDiscussed || f.notes}</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs font-medium">{f.actionPlan || f.outcome || '-'}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {f.status || (f.nextActionRequired ? 'FOLLOW_UP_NEEDED' : 'COMPLETED')}
                      </span>
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
              label="Status Sesi Bimbingan"
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value)}
              options={[
                { value: 'SCHEDULED', label: 'Terjadwal (SCHEDULED)' },
                { value: 'COMPLETED', label: 'Selesai (COMPLETED)' },
                { value: 'FOLLOW_UP_NEEDED', label: 'Perlu Tindak Lanjut' },
              ]}
            />
            <Input
              label="Tanggal Pertemuan"
              type="date"
              required
              value={counselingDate}
              onChange={(e) => setCounselingDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Topik & Catatan Hasil Konseling"
            required
            rows={3}
            placeholder="Jelaskan kendala yang dialami mahasiswa dan topik konseling yang dibahas..."
            value={topicsDiscussed}
            onChange={(e) => setTopicsDiscussed(e.target.value)}
          />

          <Textarea
            label="Komitmen Mahasiswa / Rencana Tindak Lanjut"
            required
            rows={2}
            placeholder="Contoh: Berkomitmen hadir tepat waktu setiap Vesper dan Sabat Pagi"
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
          />

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
