import React, { useEffect, useState } from 'react';
import { HeartHandshake, Plus, CheckCircle, Clock, AlertCircle, Eye, Shield } from 'lucide-react';
import { welfareService, studentService } from '../../services';
import type { WelfareReport, Student } from '../../types';
import { Button, LoadingState, EmptyState, Modal, Input, Select, Textarea, Badge } from '../../components/ui';

export const WelfareList: React.FC = () => {
  const [reports, setReports] = useState<WelfareReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [reportType, setReportType] = useState<string>('HEALTH');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail / Resolve Modal
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        welfareService.getAll({ status: statusFilter, size: 20 }),
        studentService.getAll({ size: 50 }).then((r) => r.content).catch(() => []),
      ]);
      setReports(wRes.content || []);
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
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await welfareService.create({
        studentId: selectedStudentId,
        reportType,
        priority,
        description,
      } as any);
      setIsCreateOpen(false);
      setDescription('');
      fetchData();
    } catch (err) {
      alert('Gagal membuat laporan kesejahteraan.');
    } finally {
      setCreating(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!viewingReport) return;
    setResolving(true);
    try {
      await welfareService.update(viewingReport.id, {
        status: 'RESOLVED',
        resolutionNotes: resolutionText,
      } as any);
      setViewingReport(null);
      setResolutionText('');
      fetchData();
    } catch (err) {
      alert('Gagal menyelesaikan laporan.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Laporan Bantuan & Kesejahteraan Mahasiswa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kondisi kesehatan, kendala tempat tinggal, ekonomi, dan keselamatan mahasiswa outsider
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
          onClick={() => setIsCreateOpen(true)}
        >
          Buat Laporan Kasus
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['SEMUA', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={(!statusFilter && st === 'SEMUA') || statusFilter === st ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter(st === 'SEMUA' ? undefined : st)}
          >
            {st}
          </Button>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : reports.length === 0 ? (
          <EmptyState message="Tidak ada laporan bantuan / kesejahteraan untuk filter ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 font-semibold">Tanggal</th>
                  <th className="py-3 px-3 font-semibold">Mahasiswa</th>
                  <th className="py-3 px-3 font-semibold">Kategori & Prioritas</th>
                  <th className="py-3 px-3 font-semibold">Deskripsi Masalah</th>
                  <th className="py-3 px-3 font-semibold text-center">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{r.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.studentNim}</p>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {r.reportType || r.category}
                      </span>
                      {r.priority && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.priority === 'HIGH' || r.priority === 'URGENT' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {r.priority}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[260px] truncate">
                      {r.title || r.description}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <Badge color={
                        r.status === 'RESOLVED' || r.status === 'CLOSED' ? 'green' :
                        r.status === 'OPEN' ? 'red' : 'yellow'
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setViewingReport(r);
                          setResolutionText(r.resolutionNotes || r.resolution || '');
                        }}
                      >
                        Detail
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
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Buat Laporan Bantuan & Kesejahteraan">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Pilih Mahasiswa Terkait"
            required
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
            options={students.map((s) => ({ value: s.id, label: `${s.fullName} (${s.nim})` }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Kategori Permasalahan"
              required
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'HEALTH', label: 'Kesehatan / Sakit Rawat' },
                { value: 'HOUSING', label: 'Tempat Tinggal / Indekos' },
                { value: 'FINANCIAL', label: 'Kendala Finansial / Makanan' },
                { value: 'SECURITY', label: 'Keamanan & Keselamatan' },
                { value: 'GENERAL_AID', label: 'Bantuan Umum Lainnya' },
              ]}
            />
            <Select
              label="Prioritas"
              required
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'LOW', label: 'LOW' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'URGENT', label: 'URGENT' },
              ]}
            />
          </div>

          <Textarea
            label="Deskripsi Lengkap Kondisi & Kebutuhan Bantuan"
            required
            rows={3}
            placeholder="Jelaskan kondisi mahasiswa, kebutuhan mendesak, atau tindakan darurat yang telah diambil..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" loading={creating} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Kirim Laporan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail / Resolve Modal */}
      <Modal open={!!viewingReport} onClose={() => setViewingReport(null)} title="Detail & Penanganan Laporan Kesejahteraan">
        {viewingReport && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="font-bold text-sm text-slate-900">
                {viewingReport.reportType || viewingReport.category} {viewingReport.priority ? `(${viewingReport.priority})` : ''}
              </p>
              <p className="text-slate-500 mt-1 font-mono">
                Mahasiswa: {viewingReport.studentName} ({viewingReport.studentNim}) • Status: {viewingReport.status}
              </p>
              <p className="mt-3 text-slate-700 leading-relaxed text-xs">{viewingReport.description}</p>
            </div>

            <Textarea
              label="Catatan Tindak Lanjut / Solusi (Village Dean)"
              rows={3}
              placeholder="Catatan bantuan yang telah diberikan (misal: dirujuk ke poliklinik, dibawakan ransum, dikontak orang tua)..."
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewingReport(null)}>Tutup</Button>
              {viewingReport.status !== 'RESOLVED' && (
                <Button
                  onClick={handleResolveSubmit}
                  loading={resolving}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Tandai Selesai / Ditangani (RESOLVED)
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
