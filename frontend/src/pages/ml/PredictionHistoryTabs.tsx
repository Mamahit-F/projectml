import React, { useEffect, useState } from 'react';
import { Search, Sparkles, AlertCircle, Clock, Database, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { mlService } from '../../services';
import { Badge, Button, EmptyState, LoadingState } from '../../components/ui';
import { CONTINUITY_META, FEATURE_LABELS, fmtDateTime } from './MlConstants';

/* ===================== TAB G: FUTURE PREDICTION CENTER ===================== */
export const PredictionCenterTab: React.FC<{
  initialStudent?: { nim?: string; internalId?: string } | null;
}> = ({ initialStudent }) => {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<{ nim?: string; internalId?: string } | null>(
    initialStudent || null
  );
  const [sameSemester, setSameSemester] = useState(false);
  const [expectedDays, setExpectedDays] = useState(120);
  const [allowInactivePreview, setAllowInactivePreview] = useState(false);

  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudent(initialStudent);
    }
  }, [initialStudent]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await mlService.getStudentsContinuity({
          search: query.trim() || undefined,
          page: 0,
          size: 15,
        });
        if (active) setCandidates(res.students || []);
      } catch {
        if (active) setCandidates([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  const runPrediction = async (target: { nim?: string; internalId?: string }, inactiveOverride = allowInactivePreview) => {
    setPredicting(true);
    setError(null);
    try {
      const res = await mlService.predictStudent({
        nim: target.nim || undefined,
        internal_student_id: target.internalId || undefined,
        next_is_same_semester: sameSemester,
        expected_days_to_next: expectedDays,
        allow_inactive_preview: inactiveOverride,
      });
      setPrediction(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menjalankan prediksi untuk mahasiswa ini.');
      setPrediction(null);
    } finally {
      setPredicting(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      runPrediction(selectedStudent);
    }
  }, [selectedStudent, sameSemester, expectedDays]);

  const historyChartData = (prediction?.student?.presence_history || []).map((h: any) => ({
    date: h.reporting_date,
    points: h.status === 'PRESENT' ? h.total_points : null,
    status: h.status,
  }));

  return (
    <div className="space-y-6">
      {/* Ethics Disclaimer */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 px-5 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Catatan Etika Prediksi:</strong> Estimasi prediksi periode mendatang dihasilkan oleh model statistik berdasarkan riwayat observasi poin sebelumnya. Hasil ini adalah <strong>perkiraan untuk dukungan pembinaan proaktif</strong>, BUKAN bukti atau kepastian pelanggaran di masa depan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Searchable Historical Student Picker */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-obsidian">1. Pilih Mahasiswa Historis</h3>
            <p className="text-[11px] text-slate-400">Cari dari seluruh entitas mahasiswa pada dataset historis.</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik NIM atau nama mahasiswa..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl focus:outline-none focus:bg-white"
            />
          </div>

          {/* Prediction Horizon Controls */}
          <div className="bg-[#F8F9FB] rounded-2xl p-3 border border-[#ECEEF2] space-y-2">
            <label className="block text-[11px] font-bold text-obsidian">Skenario Target Periode Berikutnya</label>
            <select
              value={sameSemester ? 'same' : 'next'}
              onChange={(e) => {
                const isSame = e.target.value === 'same';
                setSameSemester(isSame);
                setExpectedDays(isSame ? 36 : 120);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E6E8EE] rounded-xl font-semibold text-obsidian"
            >
              <option value="next">Semester Berikutnya / Lintas Semester (~120 hari)</option>
              <option value="same">Snapshot Akhir Semester Sama (~36 hari)</option>
            </select>
          </div>

          {/* Candidate List */}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {searching ? (
              <LoadingState message="Mencari mahasiswa..." />
            ) : candidates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Mahasiswa tidak ditemukan.</p>
            ) : (
              candidates.map((stu: any) => {
                const isSel = selectedStudent?.internalId === stu.internal_student_id;
                const meta = CONTINUITY_META[stu.continuity_status];
                return (
                  <button
                    key={stu.internal_student_id}
                    type="button"
                    onClick={() => {
                      setAllowInactivePreview(false);
                      setSelectedStudent({ nim: stu.nim, internalId: stu.internal_student_id });
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition ${
                      isSel
                        ? 'bg-obsidian text-white border-obsidian shadow-soft'
                        : 'bg-[#FAFBFD] border-[#EEF0F4] hover:border-obsidian/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold truncate">{stu.student_name}</p>
                      <span className={`text-xs font-extrabold tabular-nums ${isSel ? 'text-coral-300' : 'text-coral-600'}`}>
                        {stu.latest_observed_points ?? '-'} pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className={`text-[10px] font-mono ${isSel ? 'text-slate-300' : 'text-slate-400'}`}>
                        {stu.nim || 'TANPA NIM'} • {stu.presence_pattern}
                      </span>
                      <span className={`text-[10px] font-semibold ${isSel ? 'text-emerald-300' : 'text-slate-500'}`}>
                        {meta?.short || stu.continuity_status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Prediction Result & Historical Evidence */}
        <div className="lg:col-span-8 space-y-5">
          {!selectedStudent ? (
            <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-10">
              <EmptyState message="Pilih salah satu mahasiswa dari daftar di sebelah kiri untuk melihat riwayat poin historis dan menjalankan estimasi prediksi periode mendatang." />
            </div>
          ) : predicting ? (
            <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-10">
              <LoadingState message="Menghitung fitur historis dan menjalankan model prediksi aktif..." />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-xs text-red-800">{error}</div>
          ) : prediction && !prediction.eligible ? (
            <div className="bg-white rounded-3xl border border-amber-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-obsidian">{prediction.student?.student_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {prediction.student?.nim || 'TANPA NIM'} • {prediction.student?.faculty} • Pola: {prediction.student?.presence_pattern}
                  </p>
                </div>
                <Badge color="amber" dot>
                  {prediction.student?.continuity_status}
                </Badge>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-xs text-amber-900 border border-amber-200">
                <strong>Tidak Layak Prediksi Otomatis:</strong> {prediction.reason}
              </div>
              {prediction.student?.continuity_status !== 'IDENTITY_UNCERTAIN' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAllowInactivePreview(true);
                    runPrediction(selectedStudent, true);
                  }}
                >
                  Lihat Simulasi Historis (Opsional — Hanya Referensi)
                </Button>
              )}
            </div>
          ) : prediction ? (
            <>
              {/* Student Profile & Estimate Hero */}
              <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-obsidian">{prediction.student.student_name}</h3>
                      <Badge color={CONTINUITY_META[prediction.student.continuity_status]?.color || 'slate'} dot>
                        {CONTINUITY_META[prediction.student.continuity_status]?.short || prediction.student.continuity_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      NIM: <span className="font-mono font-bold text-obsidian">{prediction.student.nim}</span> •{' '}
                      {prediction.student.study_program} ({prediction.student.faculty}) • Terobservasi{' '}
                      <strong>{prediction.student.total_observed_periods}</strong> periode (hilang:{' '}
                      {prediction.student.missing_periods_count})
                    </p>
                  </div>
                  {prediction.cluster_profile && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 block font-bold">Profil Klaster Statistik</span>
                      <Badge color="blue">{prediction.cluster_profile.cluster_label}</Badge>
                    </div>
                  )}
                </div>

                {/* Regression & Classification Estimate Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prediction.regression_estimate && (
                    <div className="bg-obsidian text-white rounded-2xl p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-coral-300">
                          Estimasi Poin Periode Berikutnya (Regresi)
                        </span>
                        <TrendingUp className="w-4 h-4 text-coral-400" />
                      </div>
                      <p className="text-3xl font-extrabold tabular-nums">
                        ~{prediction.regression_estimate.predicted_next_points}{' '}
                        <span className="text-sm font-semibold text-slate-300">poin</span>
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Rentang referensi (±MAE uji):{' '}
                        <strong>
                          {prediction.regression_estimate.estimate_range_hint?.low} –{' '}
                          {prediction.regression_estimate.estimate_range_hint?.high} poin
                        </strong>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono pt-1">
                        Model: {prediction.regression_estimate.algorithm} ({prediction.regression_estimate.model_version})
                      </p>
                    </div>
                  )}

                  {prediction.classification_estimate && (
                    <div className="bg-[#FAFBFD] border border-[#ECEEF2] rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Estimasi Kategori Akumulasi (Klasifikasi)
                        </span>
                        <Sparkles className="w-4 h-4 text-coral-500" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-2xl font-extrabold ${
                            prediction.classification_estimate.predicted_category === 'HIGH'
                              ? 'text-coral-600'
                              : prediction.classification_estimate.predicted_category === 'MEDIUM'
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {prediction.classification_estimate.predicted_category}
                        </span>
                        {prediction.classification_estimate.confidence != null && (
                          <Badge color="dark">
                            Keyakinan: {(prediction.classification_estimate.confidence * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map((cls) => {
                          const prob = prediction.classification_estimate.probabilities?.[cls] ?? 0;
                          return (
                            <div key={cls} className="flex items-center gap-2 text-[11px]">
                              <span className="w-14 font-bold text-slate-600">{cls}</span>
                              <div className="flex-1 h-2 bg-[#E8EAEE] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cls === 'HIGH' ? 'bg-coral-500' : cls === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.round(prob * 100)}%` }}
                                />
                              </div>
                              <span className="w-11 text-right font-mono text-slate-600">{(prob * 100).toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Model: {prediction.classification_estimate.algorithm} ({prediction.classification_estimate.model_version})
                      </p>
                    </div>
                  )}
                </div>

                {/* Historical Trajectory Chart (Missing periods stay blank, NEVER 0!) */}
                <div className="bg-[#FAFBFD] rounded-2xl border border-[#EEF0F4] p-4">
                  <h4 className="text-xs font-extrabold text-obsidian mb-1">Riwayat Poin Observasi Mahasiswa</h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Periode tanpa batang berarti mahasiswa tidak terobservasi pada laporan tersebut (missing, bukan 0 poin).
                  </p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyChartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8EAEE" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: any) => (v == null ? ['Tidak Terobservasi', 'Status'] : [`${v} poin`, 'Poin Sabat'])}
                        />
                        <Bar dataKey="points" radius={[8, 8, 0, 0]}>
                          {historyChartData.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.points != null && entry.points >= 40 ? '#F55B2A' : '#161618'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Transparent Features Used */}
                <div>
                  <h4 className="text-xs font-extrabold text-obsidian mb-2">
                    Fitur Historis yang Digunakan Model (Tanpa Nama / NIM)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(prediction.features_used || {}).map(([k, v]: [string, any]) => (
                      <div key={k} className="bg-[#F8F9FB] rounded-xl px-3 py-2 border border-[#EEF0F4]">
                        <p className="text-[10px] text-slate-500 truncate" title={FEATURE_LABELS[k] || k}>
                          {FEATURE_LABELS[k] || k}
                        </p>
                        <p className="text-xs font-extrabold text-obsidian tabular-nums mt-0.5">
                          {v === null ? 'Tidak tersedia (imputed)' : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ===================== TAB H: ML TRAINING & DATASET HISTORY ===================== */
export const HistoryTab: React.FC<{ historyData: any }> = ({ historyData }) => {
  const runs = historyData?.training_runs || [];
  const datasets = historyData?.dataset_versions || [];

  return (
    <div className="space-y-6">
      {/* Training Runs Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-coral-500" />
          <h3 className="text-sm font-extrabold text-obsidian">Riwayat Eksekusi Pelatihan ML ({runs.length} run)</h3>
        </div>
        {runs.length === 0 ? (
          <EmptyState message="Belum ada riwayat pelatihan model." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                  <th className="py-2 pr-3">Run ID & Waktu</th>
                  <th className="py-2 pr-3">Tugas ML</th>
                  <th className="py-2 pr-3">Versi Dataset</th>
                  <th className="py-2 pr-3">Ringkasan Metrik / Error</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {runs.map((r: any) => (
                  <tr key={r.run_id} className="hover:bg-[#FAFBFD]">
                    <td className="py-2.5 pr-3">
                      <p className="font-mono font-bold text-obsidian">{r.run_id}</p>
                      <p className="text-[10px] text-slate-400">{fmtDateTime(r.completed_at || r.started_at)}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge color="dark">{r.task_type}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">{r.dataset_version || '-'}</td>
                    <td className="py-2.5 pr-3 text-[11px] text-slate-600 max-w-md">
                      {r.error ? (
                        <span className="text-red-600 font-semibold">{r.error}</span>
                      ) : (
                        <span className="font-mono text-[10px] break-all">
                          {JSON.stringify(r.metrics_summary || {}).slice(0, 160)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {r.status === 'COMPLETED' ? (
                        <Badge color="green" dot>
                          <CheckCircle2 className="w-3 h-3" /> COMPLETED
                        </Badge>
                      ) : (
                        <Badge color="red" dot>
                          <XCircle className="w-3 h-3" /> {r.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Versions Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-coral-500" />
          <h3 className="text-sm font-extrabold text-obsidian">Versi Dataset Historis ({datasets.length} versi)</h3>
        </div>
        {datasets.length === 0 ? (
          <EmptyState message="Belum ada versi dataset tersimpan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                  <th className="py-2 pr-3">Versi Dataset</th>
                  <th className="py-2 pr-3">Fingerprint</th>
                  <th className="py-2 pr-3 text-right">File</th>
                  <th className="py-2 pr-3 text-right">Rekaman</th>
                  <th className="py-2 pr-3 text-right">Mahasiswa Unik</th>
                  <th className="py-2 pr-3">Kualitas</th>
                  <th className="py-2 text-right">Waktu Proses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {datasets.map((ds: any) => (
                  <tr key={ds.dataset_version} className="hover:bg-[#FAFBFD]">
                    <td className="py-2.5 pr-3 font-mono font-bold text-obsidian">{ds.dataset_version}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">{ds.dataset_fingerprint}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{ds.files_succeeded}/{ds.files_discovered}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-bold">{ds.total_records}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{ds.unique_students}</td>
                    <td className="py-2.5 pr-3">
                      <Badge color={ds.quality_status === 'HEALTHY' ? 'green' : 'amber'}>{ds.quality_status}</Badge>
                    </td>
                    <td className="py-2.5 text-right text-slate-500 whitespace-nowrap">{fmtDateTime(ds.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
