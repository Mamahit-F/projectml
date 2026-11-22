import React, { useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Search,
  Users,
  Calendar,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Badge, Button, EmptyState } from '../../components/ui';
import { CONTINUITY_META, fmtDateTime } from './MlConstants';

/* ===================== TAB A: ML OVERVIEW ===================== */
export const OverviewTab: React.FC<{
  status: any;
  summary: any;
  onNavigateTab: (tab: string) => void;
}> = ({ status, summary, onNavigateTab }) => {
  if (!summary) {
    return (
      <EmptyState message="Dataset historis belum diproses. Klik tombol 'Proses Data Historis' di atas untuk memindai seluruh laporan." />
    );
  }

  const cont = summary.continuity_summary || {};
  const ident = summary.identity_summary || {};
  const selected = status?.selected_models || {};

  const continuityBarData = Object.entries(cont.category_breakdown || {}).map(([key, count]) => ({
    key,
    name: CONTINUITY_META[key]?.short || key,
    fullLabel: CONTINUITY_META[key]?.label || key,
    count: Number(count),
    color: CONTINUITY_META[key]?.chartColor || '#64748B',
  }));

  const periodChartData = (summary.periods || []).map((p: any) => ({
    date: p.reporting_date,
    label: p.folder_name,
    mean: p.mean_points,
    median: p.median_points,
    p95: p.p95_points,
    max: p.max_points,
    records: p.records_extracted,
    zeroPct: p.zero_point_pct,
  }));

  const kpis = [
    {
      label: 'Periode Laporan Historis',
      value: cont.total_reporting_periods ?? 0,
      sub: `${summary.files_succeeded}/${summary.files_discovered} file (${summary.pdf_files_count} PDF, ${summary.xlsx_files_count} XLSX)`,
      icon: Calendar,
      featured: false,
    },
    {
      label: 'Total Mahasiswa Unik',
      value: (ident.unique_students_total ?? 0).toLocaleString('id-ID'),
      sub: `${ident.unique_verified_students ?? 0} terverifikasi • ${ident.unique_uncertain_entities ?? 0} perlu review`,
      icon: Users,
      featured: true,
    },
    {
      label: 'Total Rekaman Historis',
      value: (summary.total_records ?? 0).toLocaleString('id-ID'),
      sub: `Versi dataset: ${summary.dataset_version}`,
      icon: Database,
      featured: false,
    },
    {
      label: 'Layak Clustering / Pelatihan',
      value: `${cont.clustering_eligible_students ?? 0} / ${cont.prediction_training_eligible_students ?? 0}`,
      sub: `${cont.future_inference_eligible_students ?? 0} layak prediksi periode mendatang`,
      icon: Layers,
      featured: false,
    },
  ];

  const continuityHighlights = [
    { label: 'Terobservasi Berkelanjutan', value: cont.continuously_observed ?? 0, color: 'green' as const },
    { label: 'Riwayat Tidak Lengkap (Ada Absen)', value: cont.incomplete_history_students ?? 0, color: 'amber' as const },
    { label: 'Jeda Sementara & Kembali', value: cont.temporary_gap_returned ?? 0, color: 'blue' as const },
    { label: 'Baru Terobservasi', value: cont.newly_observed ?? 0, color: 'dark' as const },
    {
      label: 'Hilang Permanen (Kelulusan Belum Terkonfirmasi)',
      value: cont.inactive_or_graduated_unconfirmed ?? 0,
      color: 'slate' as const,
    },
    { label: 'Identitas Belum Pasti (Karantina)', value: cont.identity_uncertain ?? 0, color: 'red' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={`rounded-3xl p-5 border shadow-card ${
                k.featured ? 'bg-obsidian text-white border-obsidian' : 'bg-white border-[#ECEEF2]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    k.featured ? 'bg-coral-gradient text-white' : 'bg-[#F4F5F7] text-obsidian'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                {k.featured && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-coral-200">
                    Kualitas: {summary.quality_status}
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold mt-4 tabular-nums tracking-tight">{k.value}</p>
              <p className={`text-xs font-bold mt-1 ${k.featured ? 'text-white' : 'text-obsidian'}`}>{k.label}</p>
              <p className={`text-[11px] mt-0.5 ${k.featured ? 'text-slate-300' : 'text-slate-400'}`}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Continuity Breakdown Strip */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-obsidian">Ringkasan Kontinuitas & Kelayakan Historis</h3>
            <p className="text-[11px] text-slate-400">
              Catatan: Mahasiswa yang tidak muncul di periode terbaru diklasifikasikan sebagai belum terkonfirmasi (BUKAN kelulusan resmi) dan ketidakhadiran tidak pernah dianggap 0 poin.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onNavigateTab('continuity')}>
            Buka Analisis Kontinuitas
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {continuityHighlights.map((item) => (
            <div key={item.label} className="bg-[#F8F9FB] rounded-2xl p-3.5 border border-[#EEF0F4]">
              <p className="text-xl font-extrabold text-obsidian tabular-nums">{item.value.toLocaleString('id-ID')}</p>
              <div className="mt-1.5">
                <Badge color={item.color} dot>
                  {item.label.length > 26 ? item.label.slice(0, 26) + '…' : item.label}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Selected Models Summary */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-coral-500" />
            <h3 className="text-sm font-extrabold text-obsidian">Model Aktif Terpilih & Status Pelatihan</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Pelatihan terakhir: {fmtDateTime(status?.latest_training_run?.completed_at)}
            </span>
            <Button size="sm" variant="secondary" onClick={() => onNavigateTab('training')}>
              Kelola Model
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['CLUSTERING', 'REGRESSION', 'CLASSIFICATION'] as const).map((mtype) => {
            const m = selected[mtype];
            return (
              <div key={mtype} className="rounded-2xl border border-[#ECEEF2] bg-[#FAFBFD] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">{mtype}</span>
                  {m ? (
                    <Badge color="green" dot>
                      ACTIVE • {m.version}
                    </Badge>
                  ) : (
                    <Badge color="amber">Belum Dipilih</Badge>
                  )}
                </div>
                {m ? (
                  <>
                    <p className="text-sm font-extrabold text-obsidian mt-2">{m.algorithm}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{m.model_id}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {mtype === 'CLUSTERING' && (
                        <>
                          <Badge color="slate">Sil: {m.evaluation_metrics?.silhouette_score}</Badge>
                          <Badge color="slate">DBI: {m.evaluation_metrics?.davies_bouldin_index}</Badge>
                        </>
                      )}
                      {mtype === 'REGRESSION' && (
                        <>
                          <Badge color="slate">RMSE: {m.evaluation_metrics?.rmse}</Badge>
                          <Badge color="slate">MAE: {m.evaluation_metrics?.mae}</Badge>
                          <Badge color="coral">R²: {m.evaluation_metrics?.r2}</Badge>
                        </>
                      )}
                      {mtype === 'CLASSIFICATION' && (
                        <>
                          <Badge color="coral">Macro F1: {m.evaluation_metrics?.macro_f1}</Badge>
                          <Badge color="slate">BalAcc: {m.evaluation_metrics?.balanced_accuracy}</Badge>
                          <Badge color="blue">High Rec: {m.evaluation_metrics?.high_class_recall}</Badge>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">
                    Latih dan tinjau evaluasi model terlebih dahulu sebelum mengaktifkan.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row: Historical Point Trend & Continuity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
          <h3 className="text-sm font-extrabold text-obsidian">Tren Akumulasi Poin Antar Periode Laporan</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Perbandingan rata-rata, median, dan persentil ke-95 secara kronologis ({periodChartData.length} periode).
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodChartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #ECEEF2', fontSize: 12 }} />
                <Area type="monotone" dataKey="p95" name="Persentil 95" stroke="#F55B2A" fill="#FFE5DC" strokeWidth={2} />
                <Area type="monotone" dataKey="mean" name="Rata-rata Poin" stroke="#161618" fill="#E2E8F0" strokeWidth={2} />
                <Area type="monotone" dataKey="median" name="Median Poin" stroke="#0EA5E9" fill="#E0F2FE" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
          <h3 className="text-sm font-extrabold text-obsidian">Distribusi Kategori Kontinuitas Mahasiswa</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Klasifikasi kehadiran historis algoritmik untuk {ident.unique_students_total ?? 0} entitas mahasiswa unik.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={continuityBarData} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#334155' }} />
                <Tooltip
                  formatter={(v: any, _n: any, props: any) => [`${v} mahasiswa`, props.payload.fullLabel]}
                  contentStyle={{ borderRadius: 14, border: '1px solid #ECEEF2', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {continuityBarData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== TAB B: DATASET MANAGEMENT & QUALITY ===================== */
export const DatasetTab: React.FC<{
  summary: any;
  quality: any;
  processing: boolean;
  onReprocess: (useCache: boolean) => void;
}> = ({ summary, quality, processing, onReprocess }) => {
  const [fileSearch, setFileSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  if (!summary || !quality) {
    return <EmptyState message="Data kualitas belum tersedia. Jalankan pemrosesan dataset terlebih dahulu." />;
  }

  const files = (summary.file_reports || []).filter((f: any) => {
    if (periodFilter && f.reporting_date !== periodFilter) return false;
    if (!fileSearch.trim()) return true;
    const q = fileSearch.toLowerCase();
    return (
      f.file_name.toLowerCase().includes(q) ||
      f.detected_faculty.toLowerCase().includes(q) ||
      f.reporting_date.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Control & Quality Status */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-obsidian">Manajemen Sumber Data Historis (Read-Only)</h3>
            <Badge color={quality.overall_status === 'HEALTHY' ? 'green' : quality.overall_status === 'VALID_WITH_WARNINGS' ? 'amber' : 'red'} dot>
              {quality.overall_status}
            </Badge>
            <Badge color="slate">{summary.dataset_version}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Direktori sumber: <code className="text-[11px] bg-[#F4F5F7] px-2 py-0.5 rounded-lg">{summary.root_dir}</code>
            {' • '}Diperbarui: {fmtDateTime(summary.processed_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={processing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => onReprocess(true)}
          >
            Deteksi & Proses File Baru
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={processing}
            onClick={() => onReprocess(false)}
          >
            Ekstrak Ulang Penuh (Tanpa Cache)
          </Button>
        </div>
      </div>

      {/* Audit Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'File Berhasil', value: `${summary.files_succeeded}/${summary.files_discovered}`, tone: 'text-emerald-600' },
          { label: 'File Gagal', value: quality.files_failed, tone: quality.files_failed > 0 ? 'text-red-600' : 'text-obsidian' },
          { label: 'Konflik NIM-Nama', value: quality.nim_name_conflicts_count, tone: 'text-amber-600' },
          { label: 'NIM Kosong', value: quality.missing_nim_records, tone: 'text-amber-600' },
          { label: 'Duplikat', value: quality.within_file_duplicates + quality.within_period_duplicates, tone: 'text-obsidian' },
          { label: 'Poin Negatif / Null', value: quality.negative_point_records + quality.missing_point_records, tone: 'text-emerald-600' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#ECEEF2] p-4 shadow-card">
            <p className={`text-2xl font-extrabold tabular-nums ${m.tone}`}>{m.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Quality Warnings & Issues */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-obsidian flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-coral-500" />
          Temuan Audit Kualitas Data & Resolusi Identitas
        </h3>
        <div className="space-y-2.5">
          {(quality.issues || []).map((iss: any) => (
            <div
              key={iss.code}
              className={`rounded-2xl p-3.5 border text-xs flex items-start gap-3 ${
                iss.severity === 'ERROR'
                  ? 'bg-red-50/70 border-red-200 text-red-900'
                  : iss.severity === 'WARNING'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-[#F8F9FB] border-[#E6E8EE] text-slate-700'
              }`}
            >
              {iss.severity === 'INFO' ? (
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <span>{iss.code}</span>
                  <Badge color={iss.severity === 'ERROR' ? 'red' : iss.severity === 'WARNING' ? 'amber' : 'blue'}>
                    {iss.count} kasus
                  </Badge>
                </div>
                <p className="mt-1 leading-relaxed">{iss.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sample NIM-Name Conflicts (Quarantined) */}
        {(quality.nim_conflicts_sample || []).length > 0 && (
          <div className="pt-3 border-t border-[#F0F1F4]">
            <p className="text-xs font-bold text-obsidian mb-2">
              Sampel Konflik NIM-Nama yang Dikarantina ({quality.nim_name_conflicts_count} total — tidak digabung otomatis):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                    <th className="py-2 pr-3">NIM</th>
                    <th className="py-2 pr-3">Tanggal & File</th>
                    <th className="py-2 pr-3">Nama Konsensus (Periode Lain)</th>
                    <th className="py-2 pr-3">Nama pada File Ini</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F5F7]">
                  {quality.nim_conflicts_sample.slice(0, 8).map((c: any, idx: number) => (
                    <tr key={`${c.nim}-${idx}`}>
                      <td className="py-2 pr-3 font-mono font-bold text-obsidian">{c.nim}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        <span className="font-semibold text-obsidian">{c.reporting_date}</span> • {c.source_file.split('/').pop()}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{c.expected_canonical_name}</td>
                      <td className="py-2 pr-3 text-coral-600 font-semibold">{c.observed_name}</td>
                      <td className="py-2">
                        <Badge color="red">{c.conflict_type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Period Statistical Distributions & Outliers */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
        <h3 className="text-sm font-extrabold text-obsidian mb-3">Distribusi Statistik & Audit Outlier per Periode</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                <th className="py-2 pr-3">Tanggal Laporan</th>
                <th className="py-2 pr-3 text-right">Rekaman</th>
                <th className="py-2 pr-3 text-right">0 Poin (%)</th>
                <th className="py-2 pr-3 text-right">Q1 / Med / Q3</th>
                <th className="py-2 pr-3 text-right">Mean ± SD</th>
                <th className="py-2 pr-3 text-right">P95 / Maks</th>
                <th className="py-2 text-right">Outlier (&gt;1.5×IQR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7]">
              {(quality.period_distributions || []).map((d: any) => (
                <tr key={d.reporting_date} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 pr-3 font-bold text-obsidian">{d.reporting_date}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{d.record_count}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {d.zero_point_count} ({d.zero_point_pct}%)
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {d.q1} / <strong>{d.median}</strong> / {d.q3}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {d.mean} ± {d.std}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {d.p95} / <strong className="text-coral-600">{d.max}</strong>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    <Badge color="slate">{d.iqr_outlier_count} valid high-point</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* File Processing Log Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-obsidian">
              Log Ekstraksi File Sumber ({files.length} dari {summary.files_discovered} file)
            </h3>
            <p className="text-[11px] text-slate-400">
              Setiap file diverifikasi checksum SHA-256 sehingga pemrosesan ulang hanya mem-parsing file baru atau berubah.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full font-semibold text-obsidian"
            >
              <option value="">Semua Periode</option>
              {(summary.periods || []).map((p: any) => (
                <option key={p.reporting_date} value={p.reporting_date}>
                  {p.reporting_date} ({p.academic_semester})
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Cari file / fakultas..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full w-48"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                <th className="py-2 pr-3">File Sumber</th>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Fakultas</th>
                <th className="py-2 pr-3 text-right">Rekaman</th>
                <th className="py-2 pr-3 text-right">Rata / Maks</th>
                <th className="py-2 pr-3 text-right">Dup / Inv / Null</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7]">
              {files.map((f: any) => (
                <tr key={f.relative_path} className="hover:bg-[#FAFBFD]">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      {f.file_type === 'xlsx' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-coral-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-obsidian max-w-xs truncate" title={f.file_name}>
                          {f.file_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          SHA256: {f.file_sha256.slice(0, 10)} {f.cache_hit ? '• cached' : '• parsed'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap font-semibold text-obsidian">{f.reporting_date}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{f.detected_faculty}</td>
                  <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{f.extracted_records}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                    {f.avg_points} / {f.max_points}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">
                    {f.duplicate_records} / {f.invalid_records} / {f.missing_values}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <Badge
                      color={
                        f.extraction_status === 'SUCCESS'
                          ? 'green'
                          : f.extraction_status === 'SUCCESS_WITH_WARNINGS'
                          ? 'amber'
                          : 'red'
                      }
                      dot
                    >
                      {f.extraction_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
