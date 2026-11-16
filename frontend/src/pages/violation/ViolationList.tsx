import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Search, ShieldCheck, History, Sliders } from 'lucide-react';
import { violationService, studentService } from '../../services';
import type { ViolationPoint, ViolationPointRule, Student } from '../../types';
import { Button, LoadingState, EmptyState, Modal, Input, Select, Textarea } from '../../components/ui';

export const ViolationList: React.FC = () => {
  const [violations, setViolations] = useState<ViolationPoint[]>([]);
  const [rules, setRules] = useState<ViolationPointRule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Manual Adjustment Modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [adjustPoints, setAdjustPoints] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, rRes, sRes] = await Promise.all([
        violationService.getAll({ page, size: 20 }),
        violationService.getRules().catch(() => []),
        studentService.getAll({ size: 50 }).then((r) => r.content).catch(() => []),
      ]);
      setViolations(vRes.content);
      setRules(rRes);
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
  }, [page]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) return;
    setSavingAdjust(true);
    try {
      await violationService.adjust(selectedStudentId, {
        points: adjustPoints,
        reason: adjustReason,
        notes: adjustNotes,
      });
      setIsAdjustOpen(false);
      setAdjustReason('');
      setAdjustNotes('');
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan penyesuaian poin.');
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen & Riwayat Poin Pelanggaran</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan akumulasi poin ketidakhadiran ibadah wajib dan penyesuaian manual berizin
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          className="bg-red-700 hover:bg-red-800 text-white"
          onClick={() => setIsAdjustOpen(true)}
        >
          Penyesuaian Manual Poin
        </Button>
      </div>

      {/* Rules Notice Badge */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
        <Sliders className="w-5 h-5 shrink-0 text-slate-500 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Konfigurasi Bobot Poin [DEMO / UNVERIFIED]:</span>
          <p className="mt-0.5 text-slate-600">
            Sesuai ketentuan Fase 3 FR-09, bobot poin awal ini bersifat dinamis dan dapat diubah. Nilai poin resmi akan disesuaikan dengan surat keputusan resmi Village Dean Universitas Klabat.
          </p>
        </div>
      </div>

      {/* Violation History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : violations.length === 0 ? (
          <EmptyState message="Belum ada riwayat poin pelanggaran tercatat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold">Kegiatan Terkait</th>
                  <th className="py-3 px-4 font-semibold">Alasan / Jenis Pelanggaran</th>
                  <th className="py-3 px-4 font-semibold text-center">Poin</th>
                  <th className="py-3 px-4 font-semibold text-right">Tipe Entri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{v.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{v.studentNim}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {v.worshipEventTitle || 'Penyesuaian Manual Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{v.reason}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                        v.points > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {v.points > 0 ? `+${v.points}` : v.points} Poin
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        v.isManualAdjustment
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.isManualAdjustment ? 'Manual / Koreksi' : 'Otomatis Presensi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      <Modal open={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title="Penyesuaian Manual Poin Pelanggaran">
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <Select
            label="Pilih Mahasiswa"
            required
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            options={students.map((s) => ({ value: s.id, label: `${s.fullName} (${s.nim}) - ${s.totalViolationPoints} Poin Saat Ini` }))}
          />

          <Input
            label="Jumlah Poin (Gunakan tanda minus '-' untuk pengurangan / dispensasi)"
            type="number"
            required
            value={adjustPoints}
            onChange={(e) => setAdjustPoints(Number(e.target.value))}
            helper="Contoh: +5 untuk pelanggaran tambahan, atau -10 untuk keringanan setelah konseling."
          />

          <Input
            label="Alasan Penyesuaian"
            required
            placeholder="Contoh: Pelayanan kompensasi kebersihan / Surat dokter susulan"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />

          <Textarea
            label="Catatan Audit Log Tambahan"
            rows={2}
            placeholder="Keterangan otorisasi dari Village Dean..."
            value={adjustNotes}
            onChange={(e) => setAdjustNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsAdjustOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={savingAdjust} className="bg-red-700 hover:bg-red-800 text-white">
              Simpan & Catat Audit Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
