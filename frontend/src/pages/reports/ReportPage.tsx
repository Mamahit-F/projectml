import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, CheckCircle } from 'lucide-react';
import { reportService } from '../../services';
import { Button, Input, Select } from '../../components/ui';

export const ReportPage: React.FC = () => {
  const [reportType, setReportType] = useState('attendance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let blob: Blob;
      let filename = `laporan_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;

      if (reportType === 'attendance') {
        blob = await reportService.downloadAttendanceReport(undefined, startDate || undefined, endDate || undefined);
      } else if (reportType === 'violations') {
        blob = await reportService.downloadViolationReport(startDate || undefined, endDate || undefined);
      } else {
        blob = await reportService.downloadStudentReport();
      }

      // Trigger download in browser
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh laporan. Periksa ketersediaan data.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pusat Laporan & Ekspor Data</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unduh rekapitulasi presensi, pelanggaran poin, dan direktori mahasiswa outsider Universitas Klabat
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">Pilih Jenis Laporan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'attendance', title: 'Rekapitulasi Presensi', desc: 'Daftar kehadiran & ketidakhadiran ibadah' },
              { id: 'violations', title: 'Rekap Poin Pelanggaran', desc: 'Rincian poin kedisiplinan & koreksi manual' },
              { id: 'students', title: 'Master Mahasiswa Outsider', desc: 'Data lengkap mahasiswa, kategori, & kontak' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setReportType(item.id)}
                className={`p-4 rounded-xl border text-left transition ${
                  reportType === item.id
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <FileText className={`w-5 h-5 mb-2 ${reportType === item.id ? 'text-emerald-700' : 'text-slate-400'}`} />
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        {reportType !== 'students' && (
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-2">Rentang Tanggal (Opsional):</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Tanggal Awal"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Tanggal Akhir"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Format file output: CSV / Excel terkompresi
          </p>
          <Button
            onClick={handleDownload}
            loading={downloading}
            icon={<Download className="w-4 h-4" />}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Unduh Laporan Resmi
          </Button>
        </div>
      </div>
    </div>
  );
};
