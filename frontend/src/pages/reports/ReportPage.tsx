import React, { useEffect, useState } from 'react';
import {
  Download,
  Calendar,
  Save,
  FileSpreadsheet,
  UserCheck,
  CheckCircle2,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { semesterService, reportService, authService } from '../../services';
import type { SemesterSetting } from '../../types';
import { Button, Input, Badge, LoadingState } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';

type ExportType = 'students' | 'predictions' | 'follow-ups' | 'welfare' | 'pdf-archive';

export const ReportPage: React.FC = () => {
  const { user, updateLocalUser } = useAuth();
  const [semester, setSemester] = useState<SemesterSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSemester, setSavingSemester] = useState(false);
  const [semesterSavedMsg, setSemesterSavedMsg] = useState<string | null>(null);

  const [finalLimitInput, setFinalLimitInput] = useState<string>('');
  const [selectedExport, setSelectedExport] = useState<ExportType>('students');
  const [downloading, setDownloading] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    semesterService
      .get()
      .then((s) => {
        setSemester(s);
        setFinalLimitInput(s.finalPointLimit != null ? String(s.finalPointLimit) : '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester) return;
    setSavingSemester(true);
    setSemesterSavedMsg(null);
    try {
      const parsedLimit = finalLimitInput.trim() === '' ? null : Math.max(0, Number(finalLimitInput));
      const updated = await semesterService.update(
        {
          ...semester,
          finalPointLimit: parsedLimit,
        },
        true
      );
      setSemester(updated);
      setSemesterSavedMsg('Pengaturan semester disimpan dan analisis risiko otomatis diperbarui.');
    } catch {
      alert('Gagal menyimpan pengaturan semester.');
    } finally {
      setSavingSemester(false);
    }
  };

  const exportItems: Array<{
    type: ExportType;
    title: string;
    desc: string;
    filename: string;
  }> = [
    {
      type: 'students',
      title: 'Rekap Mahasiswa & Poin Sabat',
      desc: 'Seluruh mahasiswa, prodi, poin terbaru, perubahan, dan kategori tempat tinggal.',
      filename: 'rekap_mahasiswa_poin',
    },
    {
      type: 'predictions',
      title: 'Hasil Deteksi Risiko & Proyeksi',
      desc: 'Pengelompokan klaster dinamis, persentil, proyeksi akhir semester, dan status batas final.',
      filename: 'rekap_deteksi_risiko',
    },
    {
      type: 'follow-ups',
      title: 'Rekap Pembinaan & Konseling',
      desc: 'Riwayat konseling, topik permasalahan, rencana tindak lanjut, dan evaluasi.',
      filename: 'rekap_pembinaan',
    },
    {
      type: 'welfare',
      title: 'Rekap Kesejahteraan & Keamanan',
      desc: 'Seluruh laporan kendala kos, kesehatan, finansial, dan status penyelesaiannya.',
      filename: 'rekap_kesejahteraan',
    },
    {
      type: 'pdf-archive',
      title: 'Ringkasan Arsip Laporan PDF',
      desc: 'Riwayat seluruh file PDF yang diunggah beserta tren rata-rata dan poin tertinggi.',
      filename: 'arsip_laporan_pdf',
    },
  ];

  const handleDownloadSelected = async () => {
    const item = exportItems.find((i) => i.type === selectedExport) || exportItems[0];
    setDownloading(true);
    try {
      const blob = await reportService.downloadExcel(item.type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh file laporan.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await authService.updateProfile({
        fullName,
        email,
        newPassword: newPassword || undefined,
      });
      updateLocalUser(updated);
      setNewPassword('');
      setProfileMsg('Profil akun User berhasil diperbarui.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui profil akun.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !semester) return <LoadingState />;

  const selectedMeta = exportItems.find((i) => i.type === selectedExport)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">Laporan & Pengaturan Semester</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Atur jadwal tutup absen semester (1 minggu sebelum libur), tetapkan batas poin final opsional, dan unduh laporan resmi.
        </p>
      </div>

      {/* Semester Cutoff & Optional Final Point Limit */}
      <form
        data-guide="semester-form"
        onSubmit={handleSaveSemester}
        className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F1F4] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coral-50 text-coral-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-obsidian">Jadwal Semester & Batas Akhir Poin</h2>
              <p className="text-xs text-slate-400">
                Digunakan untuk menghitung proyeksi poin menjelang penutupan absen semester
              </p>
            </div>
          </div>
          <Badge color={semester.attendanceClosed ? 'green' : 'coral'} dot>
            {semester.attendanceClosed ? 'Pengambilan Absen Ditutup' : 'Pengambilan Absen Berjalan'}
          </Badge>
        </div>

        {semesterSavedMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{semesterSavedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Input
            label="Nama Semester"
            required
            value={semester.semesterName}
            onChange={(e) => setSemester({ ...semester, semesterName: e.target.value })}
          />
          <Input
            label="Tanggal Mulai Semester"
            type="date"
            required
            value={semester.semesterStartDate}
            onChange={(e) => setSemester({ ...semester, semesterStartDate: e.target.value })}
          />
          <Input
            label="Perkiraan Tutup Absen"
            type="date"
            required
            value={semester.attendanceCutoffDate}
            onChange={(e) => setSemester({ ...semester, attendanceCutoffDate: e.target.value })}
          />
          <Input
            label="Tanggal Akhir Semester"
            type="date"
            required
            value={semester.semesterEndDate}
            onChange={(e) => setSemester({ ...semester, semesterEndDate: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#EFF1F5]">
            <Input
              label="Batas Poin Final Semester (Opsional)"
              type="number"
              min={0}
              placeholder="Kosongkan selama absen masih berjalan..."
              value={finalLimitInput}
              onChange={(e) => setFinalLimitInput(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Selama dikosongkan, sistem menggunakan pengelompokan klaster dinamis tanpa batas kaku.
            </p>
          </div>

          <div className="bg-[#F7F8FA] rounded-2xl p-4 border border-[#EFF1F5] flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-obsidian flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-coral-500" />
                Status Penutupan Pengambilan Absen
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Aktifkan apabila pengambilan absen resmi sudah dihentikan menjelang libur semester.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={semester.attendanceClosed}
                onChange={(e) => setSemester({ ...semester, attendanceClosed: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-obsidian" />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={savingSemester} icon={<Save className="w-3.5 h-3.5" />}>
            Simpan Pengaturan Semester
          </Button>
        </div>
      </form>

      {/* Clean Single-CTA Export Section (Zero Duplicate "Unduh CSV" Buttons!) */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-obsidian">Pusat Unduh Laporan Resmi (Excel .xlsx)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih jenis laporan di bawah ini lalu klik tombol unduh untuk mendapatkan file Excel rapi &amp; terstruktur
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            loading={downloading}
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadSelected}
            className="whitespace-nowrap shrink-0"
          >
            Unduh Excel: {selectedMeta.title}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {exportItems.map((item) => {
            const active = selectedExport === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setSelectedExport(item.type)}
                className={`text-left rounded-2xl p-4 border transition flex items-start justify-between gap-3 ${
                  active
                    ? 'bg-obsidian text-white border-obsidian shadow-soft'
                    : 'bg-[#F7F8FA] border-[#EFF1F5] hover:border-obsidian/25 text-obsidian'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileSpreadsheet className={`w-4 h-4 shrink-0 ${active ? 'text-coral-400' : 'text-coral-500'}`} />
                    <h3 className="text-xs font-bold truncate">{item.title}</h3>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.desc}
                  </p>
                </div>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    active ? 'bg-coral-gradient text-white' : 'bg-white border border-[#E6E8EE] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Profile Card */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 sm:p-7 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-obsidian text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-obsidian">Pengaturan Akun (Peran Tunggal: User)</h2>
            <p className="text-xs text-slate-400">Username login: <strong>{user?.username}</strong></p>
          </div>
        </div>

        {profileMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            {profileMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Nama Tampilan" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Kata Sandi Baru (Opsional)"
            type="password"
            placeholder="Kosongkan jika tidak diganti"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={savingProfile} icon={<Save className="w-3.5 h-3.5" />}>
            Simpan Profil Akun
          </Button>
        </div>
      </form>
    </div>
  );
};
