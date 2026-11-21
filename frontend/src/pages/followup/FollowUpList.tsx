import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, ArrowUpRight, Calendar } from 'lucide-react';
import { followUpService } from '../../services';
import type { FollowUp } from '../../types';
import {
  Button,
  LoadingState,
  EmptyState,
  Modal,
  Input,
  Select,
  Textarea,
  Badge,
  StudentSearchSelect,
} from '../../components/ui';

export const FollowUpList: React.FC = () => {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [counselingDate, setCounselingDate] = useState(new Date().toISOString().slice(0, 10));
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('SCHEDULED');
  const [saving, setSaving] = useState(false);

  // Update status modal
  const [updatingItem, setUpdatingItem] = useState<FollowUp | null>(null);
  const [nextStatus, setNextStatus] = useState('COMPLETED');
  const [evalNotes, setEvalNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await followUpService.getAll();
      setFollowUps(list);
    } catch {
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Silakan pilih mahasiswa terlebih dahulu.');
      return;
    }
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
      setSelectedStudentId(null);
      setTopicsDiscussed('');
      setActionPlan('');
      fetchData();
    } catch {
      alert('Gagal menyimpan catatan pembinaan.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!updatingItem) return;
    setSaving(true);
    try {
      await followUpService.updateStatus(updatingItem.id, nextStatus, evalNotes);
      setUpdatingItem(null);
      setEvalNotes('');
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const filtered = followUps.filter((f) => !statusFilter || f.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">Pembinaan & Konseling</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pilar Kedisiplinan • Catatan pemanggilan, pendampingan pastoral, dan evaluasi perkembangan mahasiswa
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsCreateOpen(true)}>
          Catat Sesi Pembinaan
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: '', label: `Semua (${followUps.length})` },
          { id: 'SCHEDULED', label: 'Dijadwalkan' },
          { id: 'FOLLOW_UP_NEEDED', label: 'Perlu Tindak Lanjut' },
          { id: 'COMPLETED', label: 'Selesai' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
              statusFilter === tab.id
                ? 'bg-obsidian text-white shadow-sm'
                : 'bg-white border border-[#ECEEF2] text-slate-600 hover:bg-[#F7F8FA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState message="Belum ada catatan pembinaan untuk status ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="px-3 pb-1">Tanggal</th>
                  <th className="px-3 pb-1">Mahasiswa</th>
                  <th className="px-3 pb-1">Topik & Rencana Tindak Lanjut</th>
                  <th className="px-3 pb-1 text-center">Status</th>
                  <th className="px-3 pb-1 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="bg-[#F8F9FB] hover:bg-[#F0F2F6] transition">
                    <td className="px-3.5 py-3.5 rounded-l-2xl whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-obsidian">
                        <Calendar className="w-3.5 h-3.5 text-coral-500" />
                        {f.counselingDate}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        onClick={() => navigate(`/students/${f.studentId}`)}
                        className="text-left group"
                      >
                        <p className="text-xs font-bold text-obsidian group-hover:text-coral-600 inline-flex items-center gap-1">
                          {f.studentName} <ArrowUpRight className="w-3 h-3" />
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{f.studentNim}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3.5 max-w-md">
                      <p className="text-xs font-semibold text-obsidian">{f.topicsDiscussed}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{f.actionPlan}</p>
                      {f.evaluationResult && (
                        <p className="text-[11px] text-emerald-700 font-medium mt-1">
                          Evaluasi: {f.evaluationResult}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <Badge
                        color={
                          f.status === 'COMPLETED'
                            ? 'green'
                            : f.status === 'FOLLOW_UP_NEEDED'
                            ? 'coral'
                            : 'amber'
                        }
                        dot
                      >
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3.5 rounded-r-2xl text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setUpdatingItem(f);
                          setNextStatus(f.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED');
                          setEvalNotes(f.evaluationResult || '');
                        }}
                      >
                        Evaluasi
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Catat Sesi Pembinaan Baru">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <StudentSearchSelect
            label="Pilih Mahasiswa Binaan"
            value={selectedStudentId}
            onChange={(id) => setSelectedStudentId(id)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal Konseling"
              type="date"
              required
              value={counselingDate}
              onChange={(e) => setCounselingDate(e.target.value)}
            />
            <Select
              label="Status"
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value)}
              options={[
                { value: 'SCHEDULED', label: 'Dijadwalkan' },
                { value: 'FOLLOW_UP_NEEDED', label: 'Perlu Pemantauan' },
                { value: 'COMPLETED', label: 'Selesai' },
              ]}
            />
          </div>
          <Textarea
            label="Topik / Permasalahan yang Dibahas"
            required
            rows={2}
            value={topicsDiscussed}
            onChange={(e) => setTopicsDiscussed(e.target.value)}
            placeholder="Contoh: Poin Sabat tinggi karena kendala transportasi dari luar kampus..."
          />
          <Textarea
            label="Rencana Tindak Lanjut"
            required
            rows={2}
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            placeholder="Contoh: Mahasiswa berkomitmen hadir dan melapor jika ada kendala..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" loading={saving}>Simpan Catatan</Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={!!updatingItem}
        onClose={() => setUpdatingItem(null)}
        title="Perbarui Evaluasi Pembinaan"
        subtitle={updatingItem ? `${updatingItem.studentName} (${updatingItem.studentNim})` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Status Pembinaan"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            options={[
              { value: 'SCHEDULED', label: 'Dijadwalkan' },
              { value: 'FOLLOW_UP_NEEDED', label: 'Perlu Pemantauan Lanjutan' },
              { value: 'COMPLETED', label: 'Selesai Dibina' },
            ]}
          />
          <Textarea
            label="Catatan Hasil Evaluasi"
            rows={3}
            value={evalNotes}
            onChange={(e) => setEvalNotes(e.target.value)}
            placeholder="Perkembangan kehadiran atau komitmen mahasiswa..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setUpdatingItem(null)}>Batal</Button>
            <Button variant="primary" loading={saving} onClick={handleUpdateStatus}>Simpan Evaluasi</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
