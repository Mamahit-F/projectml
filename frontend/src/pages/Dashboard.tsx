import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  HeartHandshake,
  ArrowUpRight,
  Download,
  Search,
  Calendar,
  Users,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { dashboardService, predictionService, reportService } from '../services';
import type { DashboardOverview } from '../types';
import { Button, LoadingState, RiskBadge, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getOverview();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      await predictionService.runAnalysis();
      await loadOverview();
    } catch {
      alert('Gagal menjalankan analisis risiko.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQuickExport = async () => {
    setExporting(true);
    try {
      const blob = await reportService.downloadExcel('students');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap_poin_mahasiswa_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh laporan.');
    } finally {
      setExporting(false);
    }
  };

  if (loading || !data) {
    return <LoadingState message="Memuat ringkasan pemantauan mahasiswa..." />;
  }

  const pred = data.predictionSummary;
  const highRiskCount = pred?.highRiskCount ?? 0;
  const highRiskPct = pred?.highRiskPercentage ?? 0;
  const zeroPct =
    data.totalStudents > 0 ? Math.round((data.zeroPointStudents / data.totalStudents) * 1000) / 10 : 0;

  const shortProdiName = (name: string) => {
    if (name === 'Sistem Informasi') return 'Sistem Info';
    if (name === 'Teknologi Informasi') return 'Teknologi Info';
    return name.length > 15 ? name.slice(0, 15) + '…' : name;
  };

  const prodiChartData = (data.prodiBreakdown || []).map((p) => ({
    name: shortProdiName(p.studyProgram),
    fullName: p.studyProgram,
    berpoin: p.studentsWithPoints,
    risikoTinggi: p.highRiskCount,
    rataPoin: p.avgPoints,
  }));

  const distChartData = Object.entries(data.pointDistribution || {}).map(([label, count]) => ({
    label,
    count,
  }));

  const filteredPriority = (data.priorityStudents || []).filter((s) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.nim.toLowerCase().includes(q) ||
      s.studyProgram.toLowerCase().includes(q)
    );
  });

  const semester = data.semesterSetting;
  const progressPct = semester?.semesterProgressPercent ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-obsidian">
            Selamat Datang, {user?.fullName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {data.latestPdfReport
              ? `Data terbaru: ${data.latestPdfReport.facultyName} • Pembaruan ${data.latestPdfReport.reportDate} (${data.latestPdfReport.totalStudents} mahasiswa)`
              : 'Unggah dokumen PDF poin mahasiswa dari menu Unggah & Arsip PDF untuk memulai visualisasi.'}
          </p>
        </div>

        {semester && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#ECEEF2] shadow-card text-xs font-semibold text-obsidian self-start md:self-auto whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-coral-500 shrink-0" />
            <span>{semester.semesterName}</span>
            <span className="text-slate-300">•</span>
            <span className={semester.attendanceClosed ? 'text-emerald-600' : 'text-coral-600'}>
              {semester.attendanceClosed
                ? 'Absen Ditutup'
                : `${semester.daysRemainingUntilCutoff ?? 0} hari menuju tutup absen`}
            </span>
          </div>
        )}
      </div>

      {/* ROW 1: 3-Column Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Card 1 (Left): Total Students Hero + Single Primary Action + Prodi Summary */}
        <div data-guide="dashboard-summary" className="xl:col-span-4 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Total Mahasiswa Dipantau</span>
              <Link
                to="/pdf-reports"
                className="px-2.5 py-1 rounded-full bg-[#F4F5F7] hover:bg-obsidian hover:text-white text-[11px] font-bold text-obsidian transition whitespace-nowrap"
              >
                {data.totalPdfReports} Arsip PDF
              </Link>
            </div>

            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-obsidian tabular-nums">
                {data.totalStudents.toLocaleString('id-ID')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold whitespace-nowrap">
                {data.studentsWithPoints} berpoin
              </span>
            </div>

            {/* Single focused action button — no duplicate Upload PDF button */}
            <div className="mt-5">
              <Button
                variant="primary"
                size="md"
                loading={analyzing}
                icon={<BrainCircuit className="w-4 h-4" />}
                onClick={data.totalStudents > 0 ? handleRunAnalysis : () => navigate('/pdf-reports')}
                className="w-full whitespace-nowrap"
              >
                {data.totalStudents > 0 ? 'Perbarui Analisis Risiko' : 'Unggah PDF Pertama'}
              </Button>
            </div>
          </div>

          {/* Mini Prodi Cards */}
          <div className="mt-6 pt-5 border-t border-[#F0F1F4]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-obsidian">Ringkasan per Prodi</span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {data.prodiBreakdown.length} Prodi
              </span>
            </div>
            {data.prodiBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada data prodi.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.prodiBreakdown.slice(0, 3).map((p) => (
                  <div
                    key={p.studyProgram}
                    title={p.studyProgram}
                    className="bg-[#F7F8FA] rounded-2xl p-3 border border-[#EFF1F5] hover:border-obsidian/25 transition cursor-pointer min-w-0"
                    onClick={() => navigate(`/students?studyProgram=${encodeURIComponent(p.studyProgram)}`)}
                  >
                    <p className="text-[11px] font-bold text-slate-600 truncate">
                      {shortProdiName(p.studyProgram)}
                    </p>
                    <p className="text-lg font-extrabold text-obsidian mt-1 tabular-nums">
                      {p.totalStudents}
                    </p>
                    <p className="text-[10px] text-coral-600 font-semibold mt-0.5 whitespace-nowrap">
                      Avg {p.avgPoints} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2 (Center): 2x2 Hero Metric Tiles */}
        <div data-guide="dashboard-risk-tiles" className="xl:col-span-4 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 grid grid-cols-2 gap-3.5">
          {/* Highlighted Coral Card */}
          <div
            onClick={() => navigate('/predictions?risk=HIGH')}
            className="bg-coral-gradient text-white rounded-2xl p-4 flex flex-col justify-between shadow-coral cursor-pointer hover:opacity-95 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white/90 whitespace-nowrap">Risiko Tinggi</span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-white" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight tabular-nums">{highRiskCount}</p>
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold whitespace-nowrap">
                {highRiskPct}% prioritas
              </span>
            </div>
          </div>

          {/* Tile 2: Avg & Max Points */}
          <div className="bg-[#F7F8FA] rounded-2xl p-4 flex flex-col justify-between border border-[#EFF1F5]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Rata-rata Poin</span>
              <span className="w-8 h-8 rounded-full bg-white border border-[#E6E8EE] flex items-center justify-center text-obsidian shrink-0">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-obsidian tabular-nums">
                {data.avgPoints}
              </p>
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600 text-[10px] font-bold whitespace-nowrap">
                Maks {data.maxPoints} poin
              </span>
            </div>
          </div>

          {/* Tile 3: Safe Students */}
          <div
            onClick={() => navigate('/students?risk=SAFE')}
            className="bg-[#F7F8FA] rounded-2xl p-4 flex flex-col justify-between border border-[#EFF1F5] cursor-pointer hover:border-emerald-300 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Tertib (0 Poin)</span>
              <span className="w-8 h-8 rounded-full bg-white border border-[#E6E8EE] flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-obsidian tabular-nums">
                {data.zeroPointStudents}
              </p>
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold whitespace-nowrap">
                {zeroPct}% bebas poin
              </span>
            </div>
          </div>

          {/* Tile 4: Welfare & Follow-up */}
          <div
            onClick={() => navigate('/welfare')}
            className="bg-[#F7F8FA] rounded-2xl p-4 flex flex-col justify-between border border-[#EFF1F5] cursor-pointer hover:border-obsidian/20 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Kesejahteraan</span>
              <span className="w-8 h-8 rounded-full bg-white border border-[#E6E8EE] flex items-center justify-center text-obsidian shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-obsidian tabular-nums">
                {data.openWelfareReports}
              </p>
              <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E6E8EE] text-slate-600 text-[10px] font-bold whitespace-nowrap">
                {data.activeFollowUps} pembinaan
              </span>
            </div>
          </div>
        </div>

        {/* Card 3 (Right): Rounded Bar Chart */}
        <div className="xl:col-span-4 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-obsidian">Sebaran Poin per Prodi</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mahasiswa berpoin vs risiko tinggi
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold shrink-0">
              <span className="flex items-center gap-1 text-obsidian whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-obsidian" /> Berpoin
              </span>
              <span className="flex items-center gap-1 text-coral-600 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-coral-500" /> Tinggi
              </span>
            </div>
          </div>

          <div className="h-52 w-full">
            {prodiChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Unggah PDF untuk melihat grafik perbandingan prodi.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodiChartData} barGap={6} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#F7F8FA' }}
                    contentStyle={{
                      backgroundColor: '#161618',
                      border: 'none',
                      borderRadius: '14px',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      padding: '8px 12px',
                    }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                  <Bar dataKey="berpoin" name="Berpoin" fill="#161618" radius={[8, 8, 8, 8]} maxBarSize={24} />
                  <Bar dataKey="risikoTinggi" name="Risiko Tinggi" fill="#F55B2A" radius={[8, 8, 8, 8]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Left Progress & Recent Activities | Right Priority Students Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column */}
        <div className="xl:col-span-4 space-y-5">
          {/* Semester Cutoff Progress */}
          <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-obsidian">Progres Menuju Tutup Absen</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tutup absen: {semester?.attendanceCutoffDate || '-'}
                </p>
              </div>
              <Link to="/reports-settings" className="text-[11px] font-bold text-coral-600 hover:underline whitespace-nowrap">
                Atur
              </Link>
            </div>

            <div className="w-full h-4 rounded-full bg-stripe-muted overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-coral-gradient bg-stripe-coral transition-all duration-500"
                style={{ width: `${Math.max(6, Math.min(100, progressPct))}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 text-xs">
              <span className="font-bold text-obsidian whitespace-nowrap">{progressPct}% berjalan</span>
              <span className="text-slate-500 truncate">
                {semester?.finalPointLimit != null
                  ? `Batas Final: ${semester.finalPointLimit} Poin`
                  : 'Mode Klaster Dinamis'}
              </span>
            </div>
          </div>

          {/* Distribution or Multi-Snapshot Trend */}
          <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-obsidian">
                  {data.snapshotTrend.length >= 2 ? 'Tren Rata-rata Poin Antar-PDF' : 'Distribusi Rentang Poin'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {data.snapshotTrend.length >= 2
                    ? `${data.snapshotTrend.length} laporan PDF tercatat`
                    : 'Jumlah mahasiswa per kelompok poin'}
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-coral-500 shrink-0" />
            </div>

            <div className="h-40 w-full">
              {data.snapshotTrend.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.snapshotTrend} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="coralArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F55B2A" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F55B2A" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F4" />
                    <XAxis dataKey="reportDate" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161618', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="avgPoints" name="Rata-rata Poin" stroke="#F55B2A" strokeWidth={2.5} fill="url(#coralArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distChartData} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F4" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F7F8FA' }}
                      contentStyle={{ backgroundColor: '#161618', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Mahasiswa" fill="#161618" radius={[8, 8, 8, 8]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Welfare & Follow-ups */}
          <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-obsidian">Tindak Lanjut Terbaru</h3>
              <Link to="/follow-up" className="text-[11px] font-bold text-slate-400 hover:text-obsidian">
                Lihat Semua
              </Link>
            </div>
            {data.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada catatan pembinaan atau kesejahteraan.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => navigate(`/students/${act.studentId}`)}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F7F8FA] hover:bg-[#EFF1F5] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white border border-[#E6E8EE] flex items-center justify-center shrink-0 text-obsidian">
                        {act.type === 'WELFARE' ? (
                          <HeartHandshake className="w-4 h-4 text-coral-500" />
                        ) : (
                          <Users className="w-4 h-4 text-obsidian" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-obsidian truncate">{act.studentName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
                      </div>
                    </div>
                    <Badge
                      color={
                        act.status === 'RESOLVED' || act.status === 'COMPLETED'
                          ? 'green'
                          : act.status === 'OPEN'
                          ? 'coral'
                          : 'amber'
                      }
                    >
                      {act.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Priority Students Table (Clean clickable rows — no repeated Detail buttons!) */}
        <div className="xl:col-span-8 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-obsidian">Mahasiswa Prioritas Pembinaan</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik salah satu baris mahasiswa untuk membuka profil pembinaan & kontak wali
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Cari di daftar..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white focus:border-obsidian w-44"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={exporting}
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleQuickExport}
                className="whitespace-nowrap"
              >
                Ekspor Excel
              </Button>
            </div>
          </div>

          {filteredPriority.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs text-slate-400">Belum ada data mahasiswa.</p>
              <Button variant="coral" size="sm" className="mt-3" onClick={() => navigate('/pdf-reports')}>
                Unggah PDF Laporan Poin
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400">
                    <th className="px-3.5 pb-1">Mahasiswa</th>
                    <th className="px-3 pb-1">Program Studi</th>
                    <th className="px-3 pb-1 text-right">Poin Sabat</th>
                    <th className="px-3 pb-1 text-right">Proyeksi</th>
                    <th className="px-3.5 pb-1 text-right">Status Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPriority.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="bg-[#F8F9FB] hover:bg-[#EFF1F6] transition cursor-pointer group"
                    >
                      <td className="px-3.5 py-3 rounded-l-2xl">
                        <p className="text-xs font-bold text-obsidian group-hover:text-coral-600 transition">
                          {s.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.nim}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{s.studyProgram}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="text-sm font-extrabold text-obsidian tabular-nums">
                          {s.latestSabbathPoints}
                        </span>
                        {s.pointsDelta !== 0 && (
                          <span
                            className={`ml-1.5 text-[10px] font-bold ${
                              s.pointsDelta > 0 ? 'text-coral-600' : 'text-emerald-600'
                            }`}
                          >
                            {s.pointsDelta > 0 ? `+${s.pointsDelta}` : s.pointsDelta}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                        {s.projectedEndPoints != null ? `~${Math.round(s.projectedEndPoints)}` : '-'}
                      </td>
                      <td className="px-3.5 py-3 rounded-r-2xl text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <RiskBadge risk={s.riskCategory} />
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-obsidian transition" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#F0F1F4]">
            <span className="text-xs text-slate-400">
              Menampilkan 10 mahasiswa dengan poin tertinggi
            </span>
            <Link
              to="/students"
              className="text-xs font-bold text-obsidian hover:text-coral-600 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Lihat seluruh {data.totalStudents} mahasiswa <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
