import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, CheckCircle2, XCircle, Edit3, AlertCircle } from 'lucide-react';
import { attendanceService } from '../../services';
import type { AttendanceRule } from '../../types';
import { Button, LoadingState, Modal, Input, Badge } from '../../components/ui';

export const AttendanceRules: React.FC = () => {
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<AttendanceRule | null>(null);
  const [isMandatory, setIsMandatory] = useState(true);
  const [points, setPoints] = useState(5);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getRules();
      setRules(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleEditClick = (rule: AttendanceRule) => {
    setEditingRule(rule);
    setIsMandatory(rule.isMandatory);
    setPoints(rule.violationPoints || 5);
  };

  const handleSave = async () => {
    if (!editingRule) return;
    try {
      await attendanceService.updateRule(editingRule.id, {
        isMandatory,
        violationPoints: points,
      });
      setEditingRule(null);
      fetchRules();
    } catch (err) {
      alert('Gagal memperbarui aturan kehadiran.');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Konfigurasi Aturan Kewajiban Ibadah</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Aturan dinamis kewajiban ibadah & bobot poin pelanggaran per kategori tempat tinggal mahasiswa
        </p>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold">Konfigurasi Fleksibel (Dynamic Attendance Matrix):</p>
          <p className="mt-0.5 text-amber-700 leading-relaxed">
            Admin dapat mengubah status kewajiban (Wajib / Tidak Wajib) dan bobot poin pelanggaran untuk setiap jenis kegiatan secara dinamis tanpa perlu mengubah source code.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Kategori Tempat Tinggal</th>
                <th className="py-3 px-4 font-semibold">Jenis Kegiatan Ibadah</th>
                <th className="py-3 px-4 font-semibold text-center">Status Kewajiban</th>
                <th className="py-3 px-4 font-semibold text-center">Bobot Poin Absen</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      rule.residenceCategoryName?.includes('Dekat')
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {rule.residenceCategoryName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{rule.eventType}</td>
                  <td className="py-3.5 px-4 text-center">
                    {rule.isMandatory ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Wajib
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-slate-400" /> Opsional
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-red-600">
                    {rule.isMandatory ? `+${rule.violationPoints || 5} Poin` : '0 Poin'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button size="sm" variant="secondary" icon={<Edit3 className="w-3 h-3" />} onClick={() => handleEditClick(rule)}>
                      Ubah
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editingRule} onClose={() => setEditingRule(null)} title="Ubah Konfigurasi Aturan Ibadah" size="sm">
        {editingRule && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Kategori & Kegiatan:</p>
              <p className="text-sm font-bold text-slate-800">{editingRule.residenceCategoryName} - {editingRule.eventType}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isMandatory"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="isMandatory" className="text-xs font-semibold text-slate-700">
                Wajib Diikuti Mahasiswa
              </label>
            </div>

            {isMandatory && (
              <Input
                label="Bobot Poin Jika Tidak Hadir (Tanpa Keterangan)"
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setEditingRule(null)}>Batal</Button>
              <Button onClick={handleSave} className="bg-emerald-700 hover:bg-emerald-800 text-white">Simpan Perubahan</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
