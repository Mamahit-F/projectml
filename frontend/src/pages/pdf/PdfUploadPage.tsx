import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Sparkles,
  Search,
  Calendar,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';
import { pdfReportService } from '../../services';
import type { PdfPreviewResponse, PdfReportSummary } from '../../types';
import { Button, Input, Textarea, Badge, RiskBadge, LoadingState, Modal, EmptyState } from '../../components/ui';

export const PdfUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [facultyName, setFacultyName] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [notes, setNotes] = useState('');

  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PdfPreviewResponse | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [archives, setArchives] = useState<PdfReportSummary[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(true);
  const [syncingStudents, setSyncingStudents] = useState(false);

  // Archive detail modal
  const [viewingReport, setViewingReport] = useState<PdfReportSummary | null>(null);
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);

  const loadArchives = async () => {
    setLoadingArchives(true);
    try {
      const list = await pdfReportService.getAll();
      setArchives(list);
    } catch {
      setArchives([]);
    } finally {
      setLoadingArchives(false);
    }
  };

  useEffect(() => {
    loadArchives();
  }, []);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setSuccessMsg(null);
    setPreview(null);

    setPreviewing(true);
    try {
      const res = await pdfReportService.preview(file);
      setPreview(res);
      if (res.detected_faculty) {
        setFacultyName(res.detected_faculty);
      }
      if (!periodLabel) {
        setPeriodLabel(`Update ${reportDate}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membaca file PDF. Pastikan format tabel valid.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setError(null);
    try {
      const res = await pdfReportService.importPdf({
        file: selectedFile,
        reportDate,
        facultyName: facultyName || preview?.detected_faculty,
        periodLabel: periodLabel || `Update ${reportDate}`,
        notes,
      });
      setSuccessMsg(
        `Berhasil menyimpan ${res.report?.totalStudents || 0} data mahasiswa (${res.newStudentsCount} baru, ${res.updatedStudentsCount} diperbarui) dan langsung menganalisis risiko dinamis!`
      );
      setSelectedFile(null);
      setPreview(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadArchives();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengimpor dokumen PDF.');
    } finally {
      setImporting(false);
    }
  };

  const openReportViewer = async (report: PdfReportSummary) => {
    setViewingReport(report);
    setRecordSearch('');
    setLoadingRecords(true);
    try {
      const page = await pdfReportService.getRecords(report.id, { size: 1000 });
      setReportRecords(page.content || []);
    } catch {
      setReportRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleDeleteArchive = async (id: number) => {
    if (
      !confirm(
        'Hapus arsip laporan PDF ini? Data mahasiswa yang hanya berasal dari PDF ini juga akan ikut terhapus, dan poin mahasiswa yang juga ada di PDF lain akan otomatis disinkronkan ulang.'
      )
    ) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pdfReportService.delete(id);
      const deletedCount = res?.deletedStudentsCount ?? 0;
      const recalcCount = res?.recalculatedStudentsCount ?? 0;
      setSuccessMsg(
        `Arsip PDF "${res?.deletedFileName || ''}" berhasil dihapus. ${deletedCount} mahasiswa dari PDF ini ikut terhapus` +
          (recalcCount > 0 ? ` dan ${recalcCount} mahasiswa yang ada di PDF lain telah disinkronkan ulang.` : '.')
      );
      await loadArchives();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menghapus arsip PDF.');
    }
  };

  const handleSyncStudents = async () => {
    if (
      !confirm(
        'Sinkronkan seluruh data mahasiswa dengan arsip PDF saat ini? Mahasiswa yang tidak tercatat pada arsip PDF mana pun akan dihapus agar data benar-benar sinkron.'
      )
    ) {
      return;
    }
    setSyncingStudents(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pdfReportService.syncStudents();
      setSuccessMsg(
        `Sinkronisasi selesai: ${res?.removedOrphanStudentsCount ?? 0} data mahasiswa tanpa arsip PDF dihapus, ${res?.syncedStudentsCount ?? 0} mahasiswa tersinkronkan dengan ${res?.remainingReportsCount ?? 0} arsip PDF.`
      );
      await loadArchives();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyinkronkan data mahasiswa.');
    } finally {
      setSyncingStudents(false);
    }
  };

  const filteredPreviewRecords = (preview?.records || [])
    .filter((r) => {
      if (!previewSearch.trim()) return true;
      const q = previewSearch.toLowerCase();
      return (
        r.nim.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        r.study_program.toLowerCase().includes(q)
      );
    })
    .slice(0, 60);

  const filteredArchiveRecords = reportRecords.filter((r) => {
    if (!recordSearch.trim()) return true;
    const q = recordSearch.toLowerCase();
    return (
      String(r.nim || '').toLowerCase().includes(q) ||
      String(r.fullName || '').toLowerCase().includes(q) ||
      String(r.studyProgram || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">
            Unggah & Arsip Laporan PDF Poin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unggah dokumen PDF poin pelanggaran dari Village Dean untuk membaca data otomatis, membuat visualisasi, dan mendeteksi risiko.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => navigate('/dashboard')}>
              Lihat Dashboard
            </Button>
            <Button size="sm" variant="coral" onClick={() => navigate('/predictions')}>
              Lihat Deteksi Risiko
            </Button>
          </div>
        </div>
      )}

      {/* Upload & Metadata Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Dropzone Card */}
        <div data-guide="pdf-dropzone" className="xl:col-span-5 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileChange(f);
            }}
            className="border-2 border-dashed border-[#D5D9E2] hover:border-coral-500 bg-[#F7F8FA] hover:bg-coral-50/30 rounded-3xl p-8 text-center cursor-pointer transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <div className="w-14 h-14 rounded-2xl bg-obsidian group-hover:bg-coral-gradient text-white flex items-center justify-center mx-auto mb-4 transition shadow-soft">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-obsidian">
              {selectedFile ? selectedFile.name : 'Klik atau seret file PDF ke sini'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Mendukung tabel laporan poin Sabat multi-halaman (hingga 25 MB)
            </p>
            {previewing && (
              <p className="text-xs font-bold text-coral-600 mt-3 animate-pulse">
                Sedang membaca seluruh halaman PDF...
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Tanggal Pembaruan Laporan"
              type="date"
              required
              value={reportDate}
              onChange={(e) => {
                setReportDate(e.target.value);
                setPeriodLabel(`Update ${e.target.value}`);
              }}
            />
            <Input
              label="Label Periode"
              placeholder="Contoh: Update 6 November 2026"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>

          <Input
            label="Fakultas (Otomatis dari PDF)"
            placeholder="Contoh: Fakultas Ilmu Komputer"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
          />

          <Textarea
            label="Catatan Laporan (Opsional)"
            rows={2}
            placeholder="Contoh: Laporan email Village Dean menjelang ujian akhir..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button
            variant="coral"
            size="lg"
            disabled={!preview || previewing}
            loading={importing}
            icon={<Sparkles className="w-4 h-4" />}
            onClick={handleConfirmImport}
            className="w-full"
          >
            Simpan Data & Jalankan Analisis Risiko
          </Button>
        </div>

        {/* Live Preview Panel */}
        <div className="xl:col-span-7 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-obsidian">Pratinjau Hasil Pembacaan PDF</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Periksa ketepatan jumlah baris, prodi, dan angka poin sebelum disimpan ke sistem
              </p>
            </div>
            {preview && <Badge color="green" dot>{preview.total_pages} Halaman Terbaca</Badge>}
          </div>

          {previewing ? (
            <LoadingState message="Mengekstrak tabel poin mahasiswa dari dokumen PDF..." />
          ) : !preview ? (
            <EmptyState message="Pilih dokumen PDF di sebelah kiri untuk melihat pratinjau otomatis seluruh data mahasiswa dan sebaran per program studi." />
          ) : (
            <div className="space-y-4">
              {/* Quick Preview Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-obsidian text-white rounded-2xl p-3.5">
                  <p className="text-[10px] text-slate-300 font-semibold">Total Mahasiswa</p>
                  <p className="text-2xl font-extrabold mt-1 tabular-nums">{preview.total_rows}</p>
                </div>
                <div className="bg-coral-50 border border-coral-200/70 rounded-2xl p-3.5">
                  <p className="text-[10px] text-coral-700 font-semibold">Memiliki Poin</p>
                  <p className="text-2xl font-extrabold text-coral-600 mt-1 tabular-nums">
                    {preview.with_point_count}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200/70 rounded-2xl p-3.5">
                  <p className="text-[10px] text-emerald-700 font-semibold">Tertib (0 Poin)</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
                    {preview.zero_point_count}
                  </p>
                </div>
                <div className="bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl p-3.5">
                  <p className="text-[10px] text-slate-500 font-semibold">Maks / Rata-rata</p>
                  <p className="text-lg font-extrabold text-obsidian mt-1 tabular-nums">
                    {preview.max_points} <span className="text-xs font-semibold text-slate-400">/ {preview.avg_points}</span>
                  </p>
                </div>
              </div>

              {/* Prodi Breakdown Pills */}
              <div className="flex flex-wrap gap-2">
                {preview.prodi_summary.map((ps) => (
                  <div
                    key={ps.study_program}
                    className="px-3 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E6E8EE] text-[11px] font-semibold text-obsidian"
                  >
                    {ps.study_program}: <strong>{ps.total_students}</strong> mhs (Avg {ps.avg_points} pts)
                  </div>
                ))}
              </div>

              {preview.warnings.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Catatan Pembacaan:</strong> {preview.warnings.slice(0, 3).join(' • ')}
                </div>
              )}

              {/* Searchable Preview Table */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Cari di pratinjau..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Menampilkan {filteredPreviewRecords.length} dari {preview.total_rows} baris
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-[#ECEEF2]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FA] sticky top-0 text-[11px] text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">No. Reg</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Prodi</th>
                      <th className="py-2.5 px-3 text-right">Poin Sabat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F1F4]">
                    {filteredPreviewRecords.map((r) => (
                      <tr key={r.nim} className="hover:bg-[#F9FAFB]">
                        <td className="py-2 px-3 text-slate-400 tabular-nums">{r.row_number}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-obsidian">{r.nim}</td>
                        <td className="py-2 px-3 font-medium text-obsidian">{r.full_name}</td>
                        <td className="py-2 px-3 text-slate-500">{r.study_program}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums text-obsidian">
                          {r.sabbath_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Archive History Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-obsidian">Riwayat Arsip Laporan PDF</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Menghapus arsip PDF otomatis menghapus mahasiswa yang hanya berasal dari PDF tersebut & menyinkronkan ulang poin mahasiswa lainnya
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={syncingStudents}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleSyncStudents}
            >
              Sinkronkan Mahasiswa
            </Button>
            <Badge color="dark">{archives.length} Dokumen</Badge>
          </div>
        </div>

        {loadingArchives ? (
          <LoadingState />
        ) : archives.length === 0 ? (
          <EmptyState message="Belum ada arsip laporan PDF yang diunggah. Unggah PDF pertama Anda di atas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="px-3 pb-1">Tanggal & Periode</th>
                  <th className="px-3 pb-1">Fakultas & File</th>
                  <th className="px-3 pb-1 text-right">Mahasiswa</th>
                  <th className="px-3 pb-1 text-right">0 Poin / Berpoin</th>
                  <th className="px-3 pb-1 text-right">Maks / Rata-rata</th>
                  <th className="px-3 pb-1 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {archives.map((a) => (
                  <tr key={a.id} className="bg-[#F8F9FB] hover:bg-[#F0F2F6] transition">
                    <td className="px-3.5 py-3 rounded-l-2xl">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-coral-500" />
                        <span className="text-xs font-bold text-obsidian">{a.reportDate}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{a.periodLabel}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-bold text-obsidian">{a.facultyName}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3" /> {a.fileName}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-extrabold text-obsidian tabular-nums">
                      {a.totalStudents}
                    </td>
                    <td className="px-3 py-3 text-right text-xs tabular-nums">
                      <span className="text-emerald-700 font-bold">{a.zeroPointStudents}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-coral-600 font-bold">{a.studentsWithPoints}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-obsidian tabular-nums">
                      {a.maxPoints} <span className="text-slate-400 font-medium">/ {a.avgPoints}</span>
                    </td>
                    <td className="px-3.5 py-3 rounded-r-2xl text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        title="Lihat isi data laporan"
                        aria-label="Lihat isi data laporan"
                        onClick={() => openReportViewer(a)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#E6E8EE] text-obsidian hover:bg-obsidian hover:text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Hapus arsip PDF"
                        aria-label="Hapus arsip PDF"
                        onClick={() => handleDeleteArchive(a.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#E6E8EE] text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Records Inside Archive */}
      <Modal
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title={viewingReport ? `Isi Laporan: ${viewingReport.periodLabel}` : ''}
        subtitle={viewingReport ? `${viewingReport.facultyName} • ${viewingReport.reportDate} (${viewingReport.totalStudents} mahasiswa)` : ''}
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder="Cari nama / NIM / prodi..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white"
            />
          </div>

          {loadingRecords ? (
            <LoadingState />
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-2xl border border-[#ECEEF2]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] sticky top-0 text-[11px] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NIM</th>
                    <th className="py-2.5 px-3">Nama Mahasiswa</th>
                    <th className="py-2.5 px-3">Prodi</th>
                    <th className="py-2.5 px-3 text-right">Poin</th>
                    <th className="py-2.5 px-3 text-center">Risiko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F1F4]">
                  {filteredArchiveRecords.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setViewingReport(null);
                        navigate(`/students/${r.studentId}`);
                      }}
                      className="hover:bg-[#F7F8FA] cursor-pointer"
                    >
                      <td className="py-2 px-3 text-slate-400 tabular-nums">{r.rowNumber}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-obsidian">{r.nim}</td>
                      <td className="py-2 px-3 font-semibold text-obsidian">{r.fullName}</td>
                      <td className="py-2 px-3 text-slate-500">{r.studyProgram}</td>
                      <td className="py-2 px-3 text-right font-extrabold tabular-nums">{r.sabbathPoints}</td>
                      <td className="py-2 px-3 text-center">
                        <RiskBadge risk={r.riskCategory} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
