import React, { useEffect, useState } from 'react';
import { Info, Search, ChevronLeft, ChevronRight, Layers, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { mlService } from '../../services';
import { Badge, Button, EmptyState, LoadingState } from '../../components/ui';
import { CLUSTER_COLORS, CONTINUITY_META } from './MlConstants';

/* ===================== TAB C: STUDENT CONTINUITY ANALYSIS ===================== */
export const ContinuityTab: React.FC<{
  onPredictStudent?: (nim: string, internalId: string) => void;
}> = ({ onPredictStudent }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [eligibleFilter, setEligibleFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await mlService.getStudentsContinuity({
          status: statusFilter || undefined,
          eligibleFor: eligibleFilter || undefined,
          search: search.trim() || undefined,
          page,
          size: 30,
        });
        if (active) setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [statusFilter, eligibleFilter, search, page]);

  const summary = data?.summary || {};
  const periods = data?.periods || [];
  const students = data?.students || [];

  return (
    <div className="space-y-5">
      {/* Methodology Banner */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-4 px-5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-coral-50 text-coral-600 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-obsidian">Prinsip Kontinuitas Data Historis:</strong> Ketidakhadiran mahasiswa pada suatu periode (
          <span className="font-mono font-bold text-slate-500">ABSEN</span>) diperlakukan sebagai <strong>data tidak terobservasi (missing)</strong>,{' '}
          <strong>BUKAN 0 poin</strong>. Status <code className="text-[11px] bg-[#F4F5F7] px-1.5 py-0.5 rounded">INACTIVE_OR_GRADUATED_UNCONFIRMED</code>{' '}
          menunjukkan mahasiswa tidak lagi muncul di laporan terbaru tanpa mengklaim kelulusan resmi.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {Object.entries(CONTINUITY_META).map(([key, meta]) => {
          const cnt = summary?.category_breakdown?.[key] ?? 0;
          const active = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatusFilter(active ? '' : key);
                setPage(0);
              }}
              className={`text-left rounded-2xl p-3 border transition ${
                active
                  ? 'bg-obsidian text-white border-obsidian shadow-soft'
                  : 'bg-white border-[#ECEEF2] hover:border-obsidian/30 shadow-card'
              }`}
            >
              <p className="text-xl font-extrabold tabular-nums">{cnt.toLocaleString('id-ID')}</p>
              <p className={`text-[11px] font-bold mt-1 leading-tight ${active ? 'text-coral-300' : 'text-obsidian'}`}>
                {meta.short}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search & Eligibility Toolbar + Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: '', label: 'Semua Kelayakan' },
              { id: 'clustering', label: `Layak Clustering (${summary.clustering_eligible_students ?? 0})` },
              { id: 'prediction', label: `Layak Latih Prediksi (${summary.prediction_training_eligible_students ?? 0})` },
              { id: 'inference', label: `Layak Prediksi Mendatang (${summary.future_inference_eligible_students ?? 0})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setEligibleFilter(item.id);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  eligibleFilter === item.id
                    ? 'bg-obsidian text-white'
                    : 'bg-[#F4F5F7] text-slate-600 hover:bg-[#E6E8EE]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Cari NIM, nama, atau ID..."
              className="pl-8 pr-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full w-60 focus:outline-none focus:bg-white"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState message="Memuat riwayat kontinuitas mahasiswa..." />
        ) : students.length === 0 ? (
          <EmptyState message="Tidak ada mahasiswa yang cocok dengan filter kontinuitas saat ini." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-1.5 text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400">
                    <th className="px-3 pb-1">Mahasiswa</th>
                    <th className="px-3 pb-1">Lini Masa Kehadiran ({periods.length} Periode)</th>
                    <th className="px-3 pb-1 text-center">Obs / Hilang</th>
                    <th className="px-3 pb-1 text-right">Rata / Terbaru</th>
                    <th className="px-3 pb-1">Status Kontinuitas</th>
                    <th className="px-3 pb-1 text-right">Kelayakan ML</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu: any) => {
                    const meta = CONTINUITY_META[stu.continuity_status] || {
                      short: stu.continuity_status,
                      color: 'slate' as const,
                    };
                    return (
                      <tr key={stu.internal_student_id} className="bg-[#F8F9FB] hover:bg-[#EFF1F6] transition">
                        <td className="px-3 py-2.5 rounded-l-2xl">
                          <p className="font-bold text-obsidian">{stu.student_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {stu.nim || 'TANPA NIM'} • {stu.study_program}
                          </p>
                          {stu.identity_warning && (
                            <p className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate" title={stu.identity_warning}>
                              ⚠ {stu.identity_warning}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {(stu.presence_history || []).map((h: any) => (
                              <div
                                key={h.reporting_date}
                                title={`${h.reporting_date} (${h.academic_semester}): ${
                                  h.status === 'PRESENT' ? `${h.total_points} poin` : 'Tidak Terobservasi (Missing)'
                                }`}
                                className={`min-w-[44px] px-1.5 py-1 rounded-lg text-center border text-[10px] font-bold tabular-nums ${
                                  h.status === 'PRESENT'
                                    ? h.total_points === 0
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : h.total_points >= 80
                                      ? 'bg-coral-50 border-coral-200 text-coral-700'
                                      : 'bg-white border-[#DDE1E8] text-obsidian'
                                    : 'bg-slate-100 border-dashed border-slate-300 text-slate-400'
                                }`}
                              >
                                {h.status === 'PRESENT' ? h.total_points : '—'}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">
                          <span className="font-bold text-obsidian">{stu.total_observed_periods}</span>
                          <span className="text-slate-400"> / {stu.missing_periods_count}</span>
                          {stu.return_events > 0 && (
                            <p className="text-[10px] text-sky-600 font-semibold">↻ {stu.return_events}× kembali</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                          <span className="font-bold text-obsidian">{stu.observed_avg_points ?? '-'}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="font-extrabold text-coral-600">{stu.latest_observed_points ?? '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge color={meta.color} dot>
                            {meta.short}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 rounded-r-2xl text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {stu.clustering_eligible && <Badge color="slate">Cluster</Badge>}
                            {stu.future_inference_eligible && onPredictStudent ? (
                              <button
                                type="button"
                                onClick={() => onPredictStudent(stu.nim || '', stu.internal_student_id)}
                                className="px-2.5 py-1 rounded-full bg-obsidian text-white text-[10px] font-bold hover:bg-coral-600 transition"
                              >
                                Prediksi →
                              </button>
                            ) : (
                              <Badge color="amber">Non-Prediksi</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>
                Menampilkan halaman <strong>{(data?.page ?? 0) + 1}</strong> dari <strong>{Math.max(1, data?.total_pages ?? 1)}</strong> (total{' '}
                {(data?.total_elements ?? 0).toLocaleString('id-ID')} mahasiswa)
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page + 1 >= (data?.total_pages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ===================== TAB D: UNSUPERVISED CLUSTERING ANALYSIS ===================== */
export const ClusteringTab: React.FC<{
  clusters: any;
  onNavigateTraining: () => void;
}> = ({ clusters, onNavigateTraining }) => {
  if (!clusters || !clusters.available) {
    return (
      <EmptyState
        message="Belum ada hasil klastering. Latih model clustering di tab Pusat Pelatihan Model."
        action={
          <Button variant="coral" size="sm" onClick={onNavigateTraining}>
            Latih Model Clustering
          </Button>
        }
      />
    );
  }

  const profiles = clusters.cluster_profiles || [];
  const kCurve = clusters.k_evaluation_curve || [];
  const algos = clusters.algorithm_comparison || [];
  const scatterSample = clusters.scatter_sample || [];
  const m = clusters.metrics || {};

  // Group scatter sample by cluster_id for distinct colors
  const scatterByCluster: Record<number, any[]> = {};
  for (const pt of scatterSample) {
    (scatterByCluster[pt.cluster_id] ||= []).push(pt);
  }

  const clusterColorMap: Record<number, string> = {};
  profiles.forEach((p: any, idx: number) => {
    clusterColorMap[p.cluster_id] = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
  });

  return (
    <div className="space-y-6">
      {/* Ethical Disclaimer Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 px-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="block mb-0.5">Disclaimer Metodologi Unsupervised Learning:</strong>
          {clusters.ethics_disclaimer}
        </div>
      </div>

      {/* Selected Clustering Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Model Aktif', value: clusters.model?.algorithm || '-', sub: clusters.model?.version || '' },
          { label: 'Jumlah Klaster (K)', value: clusters.recommended_k, sub: clusters.quality_verdict },
          { label: 'Silhouette Score', value: m.silhouette_score, sub: 'Makin tinggi makin terpisah' },
          { label: 'Davies-Bouldin', value: m.davies_bouldin_index, sub: 'Makin rendah makin baik' },
          { label: 'Calinski-Harabasz', value: m.calinski_harabasz_score, sub: 'Rasio varians antar klaster' },
          { label: 'Mahasiswa Dikelompokkan', value: (clusters.total_assigned_students ?? 0).toLocaleString('id-ID'), sub: `Min klaster: ${m.min_cluster_pct}%` },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-[#ECEEF2] shadow-card p-4">
            <p className="text-lg font-extrabold text-obsidian tabular-nums truncate">{card.value}</p>
            <p className="text-[11px] font-bold text-slate-700 mt-1">{card.label}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1: K=2..8 Curve & Cluster Size Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
          <h3 className="text-sm font-extrabold text-obsidian">Evaluasi Kandidat K (K-Means K = 2..8)</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Silhouette Score (kiri, lebih tinggi lebih baik) & Davies-Bouldin Index (kanan, lebih rendah lebih baik).
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kCurve} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                <XAxis dataKey="k" tickFormatter={(v) => `K=${v}`} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #ECEEF2', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="silhouette_score" name="Silhouette Score" stroke="#F55B2A" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="davies_bouldin_index" name="Davies-Bouldin Index" stroke="#161618" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
          <h3 className="text-sm font-extrabold text-obsidian">Distribusi Mahasiswa & Rata-rata Poin per Profil Klaster</h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Jumlah mahasiswa pada tiap profil (diurutkan dari rata-rata poin terendah ke tertinggi).
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={profiles.map((p: any, idx: number) => ({
                  name: `C${p.cluster_id}`,
                  label: p.label,
                  students: p.student_count,
                  avgPoints: p.avg_points,
                  color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
                }))}
                margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any, name: any, props: any) =>
                    name === 'students' ? [`${v} mahasiswa (avg ${props.payload.avgPoints} pts)`, props.payload.label] : [v, name]
                  }
                  contentStyle={{ borderRadius: 14, border: '1px solid #ECEEF2', fontSize: 12 }}
                />
                <Bar dataKey="students" name="students" radius={[8, 8, 0, 0]}>
                  {profiles.map((p: any, idx: number) => (
                    <Cell key={p.cluster_id} fill={CLUSTER_COLORS[idx % CLUSTER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PCA 2D Scatter Visualization */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-extrabold text-obsidian">Visualisasi Proyeksi PCA 2D Profil Klaster Mahasiswa</h3>
            <p className="text-[11px] text-slate-400">
              Menampilkan sampel {scatterSample.length} mahasiswa pada 2 komponen utama PCA (menjelaskan{' '}
              {(clusters.pca_explained_variance_pct || []).reduce((a: number, b: number) => a + b, 0).toFixed(1)}% varians fitur).
            </p>
          </div>
          <Badge color="slate">ID Klaster bersifat arbitrer</Badge>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
              <XAxis type="number" dataKey="pca_x" name="PCA-1" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="pca_y" name="PCA-2" tick={{ fontSize: 11 }} />
              <ZAxis range={[28, 28]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#ECEEF2] shadow-lg rounded-2xl p-3 text-xs">
                      <p className="font-bold text-obsidian">{p.cluster_label}</p>
                      <p className="text-[11px] text-slate-500 font-mono">NIM: {p.nim || '-'}</p>
                      <p className="text-[11px] text-slate-700 mt-1">
                        Rata-rata: <strong>{p.mean_points} pts</strong> • Terbaru: <strong>{p.latest_points} pts</strong> •{' '}
                        {p.observed_periods_count} periode
                      </p>
                    </div>
                  );
                }}
              />
              {profiles.map((prof: any) => (
                <Scatter
                  key={prof.cluster_id}
                  name={`C${prof.cluster_id}: ${prof.label.slice(0, 28)}`}
                  data={scatterByCluster[prof.cluster_id] || []}
                  fill={clusterColorMap[prof.cluster_id]}
                  fillOpacity={0.72}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Cluster Profiles Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-coral-500" />
          <h3 className="text-sm font-extrabold text-obsidian">Profil Karakteristik Tiap Klaster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                <th className="py-2 pr-3">Klaster & Label Deskriptif</th>
                <th className="py-2 pr-3 text-right">Mahasiswa (%)</th>
                <th className="py-2 pr-3 text-right">Rata / Median</th>
                <th className="py-2 pr-3 text-right">Q25 – Q75 (Maks)</th>
                <th className="py-2 pr-3 text-right">Rata Obs.</th>
                <th className="py-2">Interpretasi Statistik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7]">
              {profiles.map((p: any, idx: number) => (
                <tr key={p.cluster_id} className="hover:bg-[#FAFBFD]">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}
                      />
                      <div>
                        <p className="font-bold text-obsidian">{p.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Cluster ID #{p.cluster_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                    <strong>{p.student_count}</strong> ({p.percentage}%)
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                    <strong className="text-coral-600">{p.avg_points}</strong> / {p.median_points}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap text-slate-600">
                    {p.q25_points}–{p.q75_points} ({p.max_points})
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{p.avg_observed_periods} per.</td>
                  <td className="py-3 text-slate-600 max-w-sm leading-relaxed">{p.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comparative Clustering Algorithms */}
        {algos.length > 1 && (
          <div className="pt-4 border-t border-[#F0F1F4]">
            <p className="text-xs font-extrabold text-obsidian mb-2">Perbandingan Algoritma Clustering</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                    <th className="py-2 pr-3">Algoritma</th>
                    <th className="py-2 pr-3 text-right">K</th>
                    <th className="py-2 pr-3 text-right">Silhouette</th>
                    <th className="py-2 pr-3 text-right">Davies-Bouldin</th>
                    <th className="py-2 pr-3 text-right">Calinski-Harabasz</th>
                    <th className="py-2">Catatan Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F5F7]">
                  {algos.map((a: any) => (
                    <tr key={a.algorithm}>
                      <td className="py-2 pr-3 font-bold text-obsidian">
                        {a.algorithm} {a.is_recommended && <Badge color="green">Direkomendasikan</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{a.k}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{a.silhouette_score ?? '-'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{a.davies_bouldin_index ?? '-'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{a.calinski_harabasz_score ?? '-'}</td>
                      <td className="py-2 text-slate-500">{a.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
