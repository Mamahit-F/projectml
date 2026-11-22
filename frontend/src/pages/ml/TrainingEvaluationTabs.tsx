import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Sparkles, Sliders, Award, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
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
} from 'recharts';
import { mlService } from '../../services';
import { Badge, Button, EmptyState, Input } from '../../components/ui';
import { FEATURE_LABELS, fmtDateTime } from './MlConstants';

/* ===================== TAB E: MODEL TRAINING CENTER & SELECTION ===================== */
export const TrainingTab: React.FC<{
  modelsData: any;
  onRefreshAll: () => Promise<void>;
}> = ({ modelsData, onRefreshAll }) => {
  // Clustering config
  const [kMin, setKMin] = useState(2);
  const [kMax, setKMax] = useState(8);
  const [preferredK, setPreferredK] = useState<string>('');

  // Supervised config
  const [supTask, setSupTask] = useState<'BOTH' | 'REGRESSION' | 'CLASSIFICATION'>('BOTH');
  const [nEstimators, setNEstimators] = useState(200);
  const [maxDepth, setMaxDepth] = useState(10);
  const [useCustomThresh, setUseCustomThresh] = useState(false);
  const [lowMax, setLowMax] = useState(10);
  const [medMax, setMedMax] = useState(45);

  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleTrainClustering = async () => {
    setBusy('clustering');
    setFeedback(null);
    try {
      const res = await mlService.trainClustering({
        k_min: kMin,
        k_max: kMax,
        preferred_k: preferredK ? Number(preferredK) : null,
        include_alternatives: true,
      });
      await onRefreshAll();
      setFeedback({
        type: 'ok',
        text: `Clustering selesai (K=${res.recommended_k}, Silhouette=${res.metrics?.silhouette_score}). Model baru tersimpan sebagai CANDIDATE — tinjau lalu klik 'Aktifkan' di tabel bawah bila layak.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.response?.data?.message || 'Pelatihan clustering gagal.' });
    } finally {
      setBusy(null);
    }
  };

  const handleTrainSupervised = async () => {
    setBusy('supervised');
    setFeedback(null);
    try {
      const res = await mlService.trainPrediction({
        task: supTask,
        hyperparameters: { n_estimators: nEstimators, max_depth: maxDepth },
        custom_thresholds: useCustomThresh ? { low_max: lowMax, medium_max: medMax } : null,
      });
      await onRefreshAll();
      const count = res.registered_models?.length || 0;
      setFeedback({
        type: 'ok',
        text: `Pelatihan supervised (${supTask}) selesai dengan validasi kronologis (${count} model kandidat terdaftar). Model aktif sebelumnya TIDAK ditimpa otomatis.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.response?.data?.message || 'Pelatihan prediksi supervised gagal.' });
    } finally {
      setBusy(null);
    }
  };

  const handleSelectModel = async (modelId: string) => {
    setBusy(modelId);
    setFeedback(null);
    try {
      await mlService.selectModel(modelId, 'Diaktifkan secara eksplisit melalui Pusat Pelatihan Model StudentInsight.');
      await onRefreshAll();
      setFeedback({ type: 'ok', text: `Model ${modelId} sekarang menjadi model AKTIF untuk inferensi.` });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.response?.data?.message || 'Gagal mengaktifkan model.' });
    } finally {
      setBusy(null);
    }
  };

  const models = modelsData?.models || [];

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-xs border flex items-start gap-2.5 ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Two Training Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clustering Trainer */}
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-coral-600">Pipeline A • Unsupervised</span>
              <h3 className="text-sm font-extrabold text-obsidian mt-0.5">Latih Penemuan Pola Mahasiswa (Clustering)</h3>
            </div>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">
            Mengevaluasi K-Means (rentang K), Agglomerative Clustering, dan DBSCAN menggunakan StandardScaler dengan seed reproduksibel (42).
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="K Minimum"
              type="number"
              min={2}
              max={8}
              value={kMin}
              onChange={(e) => setKMin(Number(e.target.value))}
            />
            <Input
              label="K Maksimum"
              type="number"
              min={2}
              max={10}
              value={kMax}
              onChange={(e) => setKMax(Number(e.target.value))}
            />
            <Input
              label="K Pilihan (Opsional)"
              type="number"
              min={2}
              max={10}
              placeholder="Otomatis"
              value={preferredK}
              onChange={(e) => setPreferredK(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            loading={busy === 'clustering'}
            disabled={busy !== null}
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
            onClick={handleTrainClustering}
          >
            Mulai Pelatihan Clustering
          </Button>
        </div>

        {/* Supervised Prediction Trainer */}
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-coral-600">Pipeline B • Supervised Temporal</span>
              <h3 className="text-sm font-extrabold text-obsidian mt-0.5">Latih Prediksi Poin Periode Mendatang</h3>
            </div>
            <Sparkles className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-xs text-slate-500">
            Menggunakan pemisahan kronologis (Train: T1–T3 → Uji: T4) dan Expanding-Window Temporal CV tanpa kebocoran data masa depan.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tugas ML</label>
              <select
                value={supTask}
                onChange={(e) => setSupTask(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-2xl text-obsidian font-semibold"
              >
                <option value="BOTH">Regresi & Klasifikasi</option>
                <option value="REGRESSION">Hanya Regresi</option>
                <option value="CLASSIFICATION">Hanya Klasifikasi</option>
              </select>
            </div>
            <Input
              label="RF n_estimators"
              type="number"
              min={50}
              max={500}
              step={50}
              value={nEstimators}
              onChange={(e) => setNEstimators(Number(e.target.value))}
            />
            <Input
              label="RF max_depth"
              type="number"
              min={3}
              max={20}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
            />
          </div>

          <div className="bg-[#F8F9FB] rounded-2xl p-3 border border-[#ECEEF2] space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-obsidian cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomThresh}
                onChange={(e) => setUseCustomThresh(e.target.checked)}
                className="rounded accent-obsidian"
              />
              Gunakan batas ambang klasifikasi kustom (default: otomatis dari kuantil Q50/Q80 data latih)
            </label>
            {useCustomThresh && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Input label="Batas Atas LOW (poin)" type="number" min={1} value={lowMax} onChange={(e) => setLowMax(Number(e.target.value))} />
                <Input label="Batas Atas MEDIUM (poin)" type="number" min={5} value={medMax} onChange={(e) => setMedMax(Number(e.target.value))} />
              </div>
            )}
          </div>

          <Button
            variant="coral"
            loading={busy === 'supervised'}
            disabled={busy !== null}
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
            onClick={handleTrainSupervised}
          >
            Mulai Pelatihan Supervised Temporal
          </Button>
        </div>
      </div>

      {/* Model Registry & Manual Activation Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-obsidian flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-coral-500" />
              Registri Model Terversi & Seleksi Model Aktif ({models.length} artefak)
            </h3>
            <p className="text-[11px] text-slate-400">
              Model baru yang dilatih tidak pernah menimpa model produksi secara diam-diam. Tinjau metrik lalu klik <strong>Aktifkan</strong>.
            </p>
          </div>
        </div>

        {models.length === 0 ? (
          <EmptyState message="Belum ada artefak model tersimpan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                  <th className="py-2 pr-3">Model & Versi</th>
                  <th className="py-2 pr-3">Tipe</th>
                  <th className="py-2 pr-3">Dataset</th>
                  <th className="py-2 pr-3">Metrik Evaluasi</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {models.map((m: any) => (
                  <tr key={m.model_id} className={m.is_selected ? 'bg-emerald-50/40' : 'hover:bg-[#FAFBFD]'}>
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-obsidian">
                        {m.algorithm} <span className="text-slate-400 font-normal">({m.version})</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.model_id}</p>
                      <p className="text-[10px] text-slate-400">{fmtDateTime(m.trained_at)}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge color={m.model_type === 'CLUSTERING' ? 'blue' : m.model_type === 'REGRESSION' ? 'coral' : 'dark'}>
                        {m.model_type}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-600">{m.dataset_version}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {m.model_type === 'CLUSTERING' && (
                          <>
                            <Badge color="slate">Sil {m.evaluation_metrics?.silhouette_score}</Badge>
                            <Badge color="slate">DBI {m.evaluation_metrics?.davies_bouldin_index}</Badge>
                          </>
                        )}
                        {m.model_type === 'REGRESSION' && (
                          <>
                            <Badge color="slate">MAE {m.evaluation_metrics?.mae}</Badge>
                            <Badge color="slate">RMSE {m.evaluation_metrics?.rmse}</Badge>
                            <Badge color="coral">R² {m.evaluation_metrics?.r2}</Badge>
                          </>
                        )}
                        {m.model_type === 'CLASSIFICATION' && (
                          <>
                            <Badge color="coral">Macro F1 {m.evaluation_metrics?.macro_f1}</Badge>
                            <Badge color="slate">BalAcc {m.evaluation_metrics?.balanced_accuracy}</Badge>
                            <Badge color="blue">HighRec {m.evaluation_metrics?.high_class_recall}</Badge>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      {m.is_selected ? (
                        <Badge color="green" dot>
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge color={m.adequate ? 'slate' : 'amber'}>{m.status}</Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {m.is_selected ? (
                        <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Terpilih
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy === m.model_id}
                          disabled={busy !== null}
                          onClick={() => handleSelectModel(m.model_id)}
                        >
                          Aktifkan Model
                        </Button>
                      )}
                    </td>
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

/* ===================== TAB F: MODEL EVALUATION ===================== */
export const EvaluationTab: React.FC<{ evaluation: any }> = ({ evaluation }) => {
  if (!evaluation || (!evaluation.regression && !evaluation.classification)) {
    return <EmptyState message="Belum ada evaluasi model supervised. Jalankan pelatihan model terlebih dahulu." />;
  }

  const reg = evaluation.regression;
  const cls = evaluation.classification;
  const tv = reg?.details?.temporal_validation || cls?.details?.temporal_validation;

  const regComp = reg?.details?.comparison_table || [];
  const clsComp = cls?.details?.comparison_table || [];
  const regAvp = reg?.details?.actual_vs_predicted_sample || [];
  const regResiduals = reg?.details?.test_metrics?.residual_distribution || [];
  const regFeatImp = (reg?.details?.feature_importance || []).slice(0, 10);
  const clsFeatImp = (cls?.details?.feature_importance || []).slice(0, 10);
  const cm = cls?.details?.test_metrics?.confusion_matrix || [];
  const classes = cls?.details?.test_metrics?.classes || ['LOW', 'MEDIUM', 'HIGH'];
  const perClass = cls?.details?.test_metrics?.per_class || {};

  return (
    <div className="space-y-6">
      {/* Temporal Validation Architecture Banner */}
      {tv && (
        <div className="bg-obsidian text-white rounded-3xl p-5 shadow-soft space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-coral-400">
                Anti-Leakage Temporal Evaluation
              </span>
              <h3 className="text-base font-extrabold mt-0.5">{tv.strategy_name}</h3>
            </div>
            <Badge color="coral">Random Split: TIDAK DIGUNAKAN</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {(tv.transition_breakdown || []).map((t: any) => (
              <div
                key={t.transition_index}
                className={`rounded-2xl p-3 border ${
                  t.split_role === 'TEST_HOLDOUT'
                    ? 'bg-coral-500/15 border-coral-400/50'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{t.split_role === 'TEST_HOLDOUT' ? 'HOLDOUT TEST' : `TRAIN T${t.transition_index}`}</span>
                  <span className="text-[10px] text-slate-300">{t.is_same_semester ? 'Dalam Sem.' : 'Lintas Sem.'}</span>
                </div>
                <p className="font-mono text-[11px] text-slate-200 mt-1">{t.source_date} → {t.target_date}</p>
                <p className="text-[11px] text-slate-300 mt-1">
                  <strong>{t.sample_count}</strong> sampel • Target mean: {t.target_mean_points} pts
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== REGRESSION EVALUATION ==================== */}
      {reg && (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-coral-600">
                Target Regresi: next_period_total_points
              </span>
              <h3 className="text-base font-extrabold text-obsidian">
                Evaluasi Model Regresi — Aktif: {reg.model?.algorithm} ({reg.model?.version})
              </h3>
            </div>
            <Badge color={reg.details?.model_adequate ? 'green' : 'amber'} dot>
              {reg.details?.model_adequate ? 'LAYAK & MELAMPAUI BASELINE' : 'PERLU KEHATI-HATIAN'}
            </Badge>
          </div>

          <p className="text-xs text-slate-600">{reg.model?.selection_reason}</p>

          {/* Regression Model Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                  <th className="py-2 pr-3">Model / Baseline</th>
                  <th className="py-2 pr-3 text-right">Test MAE</th>
                  <th className="py-2 pr-3 text-right">Test RMSE</th>
                  <th className="py-2 pr-3 text-right">Test R²</th>
                  <th className="py-2 pr-3 text-right">CV Mean RMSE</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {regComp.map((r: any) => (
                  <tr key={r.algorithm} className={r.is_recommended ? 'bg-coral-50/40 font-semibold' : ''}>
                    <td className="py-2.5 pr-3 text-obsidian font-bold">{r.algorithm}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{r.test_mae}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-bold">{r.test_rmse}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-coral-600 font-bold">{r.test_r2}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{r.cv_mean_rmse}</td>
                    <td className="py-2.5 text-right">
                      {r.is_recommended ? <Badge color="green">Rekomendasi</Badge> : <Badge color="slate">Kandidat</Badge>}
                    </td>
                  </tr>
                ))}
                {Object.entries(reg.details?.baselines || {}).map(([bName, bVal]: [string, any]) => (
                  <tr key={bName} className="text-slate-400 bg-[#FAFBFD]">
                    <td className="py-2 pr-3 italic">{bName}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{bVal.mae}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{bVal.rmse}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{bVal.r2}</td>
                    <td className="py-2 pr-3 text-right">-</td>
                    <td className="py-2 text-right"><Badge color="slate">Baseline</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts: Actual vs Predicted + Residual Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            <div className="bg-[#FAFBFD] rounded-2xl border border-[#EEF0F4] p-4">
              <h4 className="text-xs font-extrabold text-obsidian mb-1">Aktual vs Prediksi (Holdout Test T4)</h4>
              <p className="text-[11px] text-slate-400 mb-3">Sebaran nilai aktual P5 (sumbu X) terhadap prediksi model (sumbu Y).</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EAEE" />
                    <XAxis type="number" dataKey="actual" name="Aktual" tick={{ fontSize: 10 }} />
                    <YAxis type="number" dataKey="predicted" name="Prediksi" tick={{ fontSize: 10 }} />
                    <ZAxis range={[24, 24]} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                    <Scatter name="Sampel Uji" data={regAvp} fill="#F55B2A" fillOpacity={0.65} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#FAFBFD] rounded-2xl border border-[#EEF0F4] p-4">
              <h4 className="text-xs font-extrabold text-obsidian mb-1">Distribusi Residual (Aktual − Prediksi)</h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Mean residual: {reg.details?.test_metrics?.mean_residual} • Median |Error|: {reg.details?.test_metrics?.median_abs_error} poin.
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regResiduals} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EAEE" />
                    <XAxis dataKey="bin_label" tick={{ fontSize: 9 }} interval={1} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="count" name="Jumlah Sampel" fill="#161618" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Subgroup Metrics & Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-extrabold text-obsidian mb-2">Evaluasi Subgrup Riwayat Mahasiswa (Uji T4)</h4>
              <div className="space-y-2">
                {Object.entries(reg.details?.subgroup_metrics || {}).map(([sg, val]: [string, any]) => (
                  <div key={sg} className="bg-[#F8F9FB] rounded-2xl p-3 flex items-center justify-between text-xs border border-[#EEF0F4]">
                    <div>
                      <p className="font-bold text-obsidian">{sg}</p>
                      <p className="text-[10px] text-slate-400">{val.n_samples} sampel uji</p>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <Badge color="slate">MAE {val.mae}</Badge>
                      <Badge color="slate">RMSE {val.rmse}</Badge>
                      <Badge color="coral">R² {val.r2}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-obsidian mb-2">Top Fitur Paling Berpengaruh (Regresi)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regFeatImp.slice(0, 7).map((f: any) => ({
                      name: (FEATURE_LABELS[f.feature] || f.feature).slice(0, 26),
                      importance: Number((f.importance * 100).toFixed(1)),
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F4" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Bobot Relatif']} />
                    <Bar dataKey="importance" fill="#F55B2A" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CLASSIFICATION EVALUATION ==================== */}
      {cls && (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-coral-600">
                Target Klasifikasi: next_period_point_tier (LOW / MEDIUM / HIGH)
              </span>
              <h3 className="text-base font-extrabold text-obsidian">
                Evaluasi Model Klasifikasi — Aktif: {cls.model?.algorithm} ({cls.model?.version})
              </h3>
            </div>
            <Badge color={cls.details?.model_adequate ? 'green' : 'amber'} dot>
              {cls.details?.model_adequate ? 'LAYAK & MELAMPAUI BASELINE' : 'PERLU KEHATI-HATIAN'}
            </Badge>
          </div>

          {cls.details?.thresholds && (
            <div className="bg-[#F8F9FB] rounded-2xl p-3.5 border border-[#ECEEF2] text-xs text-slate-600">
              <strong className="text-obsidian">Penentuan Ambang Kelas ({cls.details.thresholds.method}):</strong>{' '}
              {cls.details.thresholds.rationale}
            </div>
          )}

          {/* Classification Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-[#ECEEF2]">
                  <th className="py-2 pr-3">Model / Baseline</th>
                  <th className="py-2 pr-3 text-right">Accuracy</th>
                  <th className="py-2 pr-3 text-right">Macro Prec</th>
                  <th className="py-2 pr-3 text-right">Macro Rec</th>
                  <th className="py-2 pr-3 text-right">Macro F1</th>
                  <th className="py-2 pr-3 text-right">Weighted F1</th>
                  <th className="py-2 pr-3 text-right">Balanced Acc</th>
                  <th className="py-2 text-right">HIGH Recall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {clsComp.map((c: any) => (
                  <tr key={c.algorithm} className={c.is_recommended ? 'bg-coral-50/40 font-semibold' : ''}>
                    <td className="py-2.5 pr-3 font-bold text-obsidian">{c.algorithm}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{(c.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{(c.precision_macro * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{(c.recall_macro * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-bold text-coral-600">{(c.macro_f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{(c.weighted_f1 * 100).toFixed(1)}%</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-bold">{(c.balanced_accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-sky-700">{(c.high_class_recall * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {Object.entries(cls.details?.baselines || {}).map(([bName, bVal]: [string, any]) => (
                  <tr key={bName} className="text-slate-400 bg-[#FAFBFD]">
                    <td className="py-2 pr-3 italic">{bName}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.precision_macro * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.recall_macro * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.macro_f1 * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.weighted_f1 * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(bVal.balanced_accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right tabular-nums">{(bVal.high_class_recall * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confusion Matrix & Per-Class Performance + Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            <div className="bg-[#FAFBFD] rounded-2xl border border-[#EEF0F4] p-4 space-y-3">
              <h4 className="text-xs font-extrabold text-obsidian">Confusion Matrix (Baris = Aktual, Kolom = Prediksi)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] text-slate-400">
                      <th className="p-2 text-left">Aktual \ Pred</th>
                      {classes.map((c: string) => (
                        <th key={c} className="p-2 font-bold text-obsidian">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cm.map((row: number[], rIdx: number) => {
                      const rowSum = row.reduce((a, b) => a + b, 0) || 1;
                      return (
                        <tr key={classes[rIdx]}>
                          <td className="p-2 text-left font-bold text-obsidian">{classes[rIdx]}</td>
                          {row.map((val: number, cIdx: number) => {
                            const isDiag = rIdx === cIdx;
                            const pct = Math.round((val / rowSum) * 100);
                            return (
                              <td
                                key={cIdx}
                                className={`p-2.5 rounded-xl border border-white font-bold tabular-nums ${
                                  isDiag
                                    ? 'bg-obsidian text-white'
                                    : val > 50
                                    ? 'bg-coral-100 text-coral-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {val} <span className="text-[10px] font-normal opacity-80">({pct}%)</span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-Class Table */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {classes.map((c: string) => {
                  const pc = perClass[c] || {};
                  return (
                    <div key={c} className="bg-white rounded-xl p-2.5 border border-[#ECEEF2]">
                      <p className="text-[11px] font-extrabold text-obsidian">{c} <span className="text-slate-400 font-normal">(n={pc.support})</span></p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        P: {((pc.precision || 0) * 100).toFixed(1)}% • R: <strong>{((pc.recall || 0) * 100).toFixed(1)}%</strong> • F1: <strong>{((pc.f1_score || 0) * 100).toFixed(1)}%</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#FAFBFD] rounded-2xl border border-[#EEF0F4] p-4">
              <h4 className="text-xs font-extrabold text-obsidian mb-2">Top Fitur Paling Berpengaruh (Klasifikasi)</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={clsFeatImp.slice(0, 7).map((f: any) => ({
                      name: (FEATURE_LABELS[f.feature] || f.feature).slice(0, 26),
                      importance: Number((f.importance * 100).toFixed(1)),
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EAEE" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={145} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Bobot Relatif']} />
                    <Bar dataKey="importance" fill="#161618" radius={[0, 6, 6, 0]}>
                      {clsFeatImp.slice(0, 7).map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? '#F55B2A' : '#161618'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Limitations Box */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 text-xs text-amber-900 space-y-1">
            <p className="font-extrabold">Keterbatasan & Catatan Ilmiah:</p>
            <ul className="list-disc pl-4 space-y-1">
              {(cls.details?.limitations || []).map((lim: string, i: number) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
