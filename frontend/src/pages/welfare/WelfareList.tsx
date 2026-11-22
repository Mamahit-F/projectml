import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { welfareService } from '../../services';
import type { WelfareReport } from '../../types';
import {
  Button,
  LoadingState,
  EmptyState,
  Modal,
  Select,
  Textarea,
  Badge,
  StudentSearchSelect,
} from '../../components/ui';

export const WelfareList: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<WelfareReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [reportType, setReportType] = useState('HOUSING');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Resolve modal
  const [viewingReport, setViewingReport] = useState<WelfareReport | null>(null);
  const [nextStatus, setNextStatus] = useState('RESOLVED');
  const [resolutionText, setResolutionText] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await welfareService.getAll({ status: statusFilter, size: 50 });
      setReports(res.content || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Silakan pilih mahasiswa terlebih dahulu.');
      return;
    }
    setCreating(true);
    try {
      await welfareService.create({
        studentId: selectedStudentId,
        reportType,
        priority,
        description,
      });
      setIsCreateOpen(false);
      setSelectedStudentId(null);
      setDescription('');
      fetchData();
    } catch {
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
        status: nextStatus,
        resolutionNotes: resolutionText,
      });
      setViewingReport(null);
      setResolutionText('');
      fetchData();
    } catch {
      alert('Gagal memperbarui status laporan.');
    } finally {
      setResolving(false);
    }
  };

  const typeLabel: Record<string, string> = {
    HOUSING: 'Tempat Tinggal / Kos',
    SECURITY: 'Keamanan Lingkungan',
    HEALTH: 'Kesehatan',
    FINANCIAL: 'Finansial / Ekonomi',
    GENERAL_AID: 'Bantuan Umum',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">
            Laporan Kesejahteraan & Keamanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pilar Kesejahteraan & Keamanan • Pencatatan kendala kos, kesehatan, finansial, dan keselamatan mahasiswa di luar asrama
          </p>
        </div>
        <div data-guide="welfare-action">
          <Button variant="coral" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsCreateOpen(true)}>
            Buat Laporan Kasus
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: undefined, label: 'Semua Status' },
          { id: 'OPEN', label: 'Terbuka (Open)' },
          { id: 'IN_REVIEW', label: 'Dalam Penanganan' },
          { id: 'RESOLVED', label: 'Terselesaikan' },
          { id: 'CLOSED', label: 'Ditutup' },
        ].map((st) => (
          <button
            key={String(st.id)}
            onClick={() => setStatusFilter(st.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
              statusFilter === st.id
                ? 'bg-obsidian text-white shadow-sm'
                : 'bg-white border border-[#ECEEF2] text-slate-600 hover:bg-[#F7F8FA]'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* List Card */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
        {loading ? (
          <LoadingState />
        ) : reports.length === 0 ? (
          <EmptyState message="Belum ada laporan kesejahteraan atau keamanan pada status ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="px-3 pb-1">Mahasiswa</th>
                  <th className="px-3 pb-1">Kategori & Prioritas</th>
                  <th className="px-3 pb-1">Deskripsi Kasus</th>
                  <th className="px-3 pb-1 text-center">Status</th>
                  <th className="px-3 pb-1 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((w) => (
                  <tr key={w.id} className="bg-[#F8F9FB] hover:bg-[#F0F2F6] transition">
                    <td className="px-3.5 py-3.5 rounded-l-2xl">
                      <button
                        onClick={() => navigate(`/students/${w.studentId}`)}
                        className="text-left group"
                      >
                        <p className="text-xs font-bold text-obsidian group-hover:text-coral-600 inline-flex items-center gap-1">
                          {w.studentName} <ArrowUpRight className="w-3 h-3" />
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{w.studentNim}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3.5 space-y-1">
                      <div>
                        <Badge color="dark">{typeLabel[w.reportType] || w.reportType}</Badge>
                      </div>
                      <div>
                        <Badge
                          color={
                            w.priority === 'URGENT'
                              ? 'red'
                              : w.priority === 'HIGH'
                              ? 'coral'
                              : w.priority === 'MEDIUM'
                              ? 'amber'
                              : 'slate'
                          }
                        >
                          Prioritas: {w.priority}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 max-w-md">
                      <p className="text-xs text-obsidian font-medium">{w.description}</p>
                      {w.resolutionNotes && (
                        <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                          Penanganan: {w.resolutionNotes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <Badge
                        color={
                          w.status === 'RESOLVED' || w.status === 'CLOSED'
                            ? 'green'
                            : w.status === 'OPEN'
                            ? 'coral'
                            : 'amber'
                        }
                        dot
                      >
                        {w.status}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3.5 rounded-r-2xl text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setViewingReport(w);
                          setNextStatus(w.status === 'OPEN' ? 'IN_REVIEW' : 'RESOLVED');
                          setResolutionText(w.resolutionNotes || '');
                        }}
                      >
                        Tindak Lanjut
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
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Buat Laporan Kesejahteraan / Keamanan">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <StudentSearchSelect
            label="Cari & Pilih Mahasiswa"
            value={selectedStudentId}
            onChange={(id) => setSelectedStudentId(id)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Jenis Kendala"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'HOUSING', label: 'Tempat Tinggal / Kos' },
                { value: 'SECURITY', label: 'Keamanan Lingkungan' },
                { value: 'HEALTH', label: 'Kesehatan' },
                { value: 'FINANCIAL', label: 'Finansial / Ekonomi' },
                { value: 'GENERAL_AID', label: 'Bantuan Umum' },
              ]}
            />
            <Select
              label="Tingkat Prioritas"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'LOW', label: 'Rendah' },
                { value: 'MEDIUM', label: 'Sedang' },
                { value: 'HIGH', label: 'Tinggi' },
                { value: 'URGENT', label: 'Mendesak (Urgent)' },
              ]}
            />
          </div>
          <Textarea
            label="Deskripsi Kondisi / Kendala"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan kendala keamanan, kos, kesehatan, atau bantuan yang dibutuhkan..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" variant="coral" loading={creating}>Simpan Laporan</Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title="Tindak Lanjut Kasus Kesejahteraan"
        subtitle={viewingReport ? `${viewingReport.studentName} (${viewingReport.studentNim})` : ''}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Perbarui Status Kasus"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            options={[
              { value: 'OPEN', label: 'Terbuka (Open)' },
              { value: 'IN_REVIEW', label: 'Sedang Ditangani (In Review)' },
              { value: 'RESOLVED', label: 'Selesai Ditangani (Resolved)' },
              { value: 'CLOSED', label: 'Ditutup (Closed)' },
            ]}
          />
          <Textarea
            label="Catatan Tindakan / Penyelesaian"
            rows={3}
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            placeholder="Catat bantuan yang telah diberikan atau hasil kunjungan kos..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setViewingReport(null)}>Batal</Button>
            <Button variant="primary" loading={resolving} onClick={handleResolveSubmit}>Simpan Status</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
