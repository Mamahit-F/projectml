import React, { useEffect, useState } from 'react';
import {
  Activity,
  Database,
  Users,
  Layers,
  Sliders,
  BarChart3,
  Sparkles,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { mlService } from '../../services';
import { Badge, Button, LoadingState } from '../../components/ui';
import { OverviewTab, DatasetTab } from './OverviewDatasetTabs';
import { ContinuityTab, ClusteringTab } from './ContinuityClusteringTabs';
import { TrainingTab, EvaluationTab } from './TrainingEvaluationTabs';
import { PredictionCenterTab, HistoryTab } from './PredictionHistoryTabs';

type TabKey = 'overview' | 'dataset' | 'continuity' | 'clustering' | 'training' | 'evaluation' | 'predict' | 'history';

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'overview', label: 'Ringkasan ML', icon: Activity },
  { key: 'dataset', label: 'Dataset & Kualitas', icon: Database },
  { key: 'continuity', label: 'Kontinuitas Mahasiswa', icon: Users },
  { key: 'clustering', label: 'Klastering Pola', icon: Layers },
  { key: 'training', label: 'Pelatihan & Model', icon: Sliders },
  { key: 'evaluation', label: 'Evaluasi Temporal', icon: BarChart3 },
  { key: 'predict', label: 'Pusat Prediksi', icon: Sparkles },
  { key: 'history', label: 'Riwayat ML', icon: Clock },
];

export const MlDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const [status, setStatus] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);
  const [clusters, setClusters] = useState<any>(null);
  const [modelsData, setModelsData] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);

  const [predictTarget, setPredictTarget] = useState<{ nim?: string; internalId?: string } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setBannerError(null);
    try {
      const st = await mlService.getStatus();
      setStatus(st);
      if (st?.ml_service_online === false) {
        setBannerError(st?.error || 'Layanan Python Machine Learning sedang tidak aktif.');
        return;
      }
      const [sum, qual, clu, mods, evalRes, hist] = await Promise.all([
        mlService.getDatasetSummary().catch(() => null),
        mlService.getDatasetQuality().catch(() => null),
        mlService.getClusters().catch(() => null),
        mlService.listModels().catch(() => null),
        mlService.getEvaluation().catch(() => null),
        mlService.getTrainingHistory().catch(() => null),
      ]);
      setSummary(sum);
      setQuality(qual);
      setClusters(clu);
      setModelsData(mods);
      setEvaluation(evalRes);
      setHistoryData(hist);
    } catch (err: any) {
      setBannerError(err.response?.data?.message || 'Gagal memuat dashboard Machine Learning.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleProcessData = async (useCache = true) => {
    setProcessing(true);
    setBannerError(null);
    setBannerSuccess(null);
    try {
      const res = await mlService.processData({ use_cache: useCache });
      await loadAll();
      setBannerSuccess(
        `Dataset historis berhasil diproses (${res.dataset_version}): ${res.extraction_summary?.files_succeeded}/${res.extraction_summary?.files_discovered} file, ${res.extraction_summary?.total_records_extracted} rekaman.`
      );
    } catch (err: any) {
      setBannerError(err.response?.data?.message || 'Gagal memproses direktori data historis.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Obsidian Hero Header */}
      <div className="bg-obsidian text-white rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -right-14 -top-14 w-64 h-64 rounded-full bg-coral-gradient opacity-20 blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-coral-gradient text-[11px] font-bold">
              Subsistem Machine Learning Historis v3.0
            </span>
            {status?.ml_service_online !== false ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ML Service Aktif
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-red-500/25 text-red-200 text-[11px] font-bold">
                ML Service Offline
              </span>
            )}
            {status?.latest_dataset_version && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200 text-[11px] font-mono">
                {status.latest_dataset_version}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-coral-400 shrink-0" />
            Analisis Historis, Kontinuitas, Clustering & Prediksi Poin Mahasiswa
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
            Pipeline end-to-end berbasis data historis riil (PDF & Excel): resolusi identitas hati-hati, pelacakan kontinuitas antar periode, penemuan profil pola poin (unsupervised), serta prediksi periode mendatang dengan validasi kronologis anti-kebocoran.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <div data-guide="ml-process-btn">
            <Button
              variant="secondary"
              size="md"
              loading={processing}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => handleProcessData(true)}
            >
              Proses Data Historis
            </Button>
          </div>
          <div data-guide="ml-predict-btn">
            <Button
              variant="coral"
              size="md"
              onClick={() => setActiveTab('predict')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Prediksi Mahasiswa
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {bannerError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Pemberitahuan Layanan ML</p>
            <p className="mt-0.5">{bannerError}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={loadAll}>
            Coba Lagi
          </Button>
        </div>
      )}

      {bannerSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bannerSuccess}</span>
        </div>
      )}

      {/* Horizontal Pill Tab Navigation */}
      <div data-guide="ml-tabs" className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-2 flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition ${
                active
                  ? 'bg-obsidian text-white shadow-soft'
                  : 'text-slate-600 hover:bg-[#F4F5F7] hover:text-obsidian'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-coral-400' : 'text-slate-400'}`} />
              <span>{t.label}</span>
              {t.key === 'dataset' && quality?.nim_name_conflicts_count > 0 && (
                <Badge color="amber">{quality.nim_name_conflicts_count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-10">
          <LoadingState message="Memuat subsistem Machine Learning historis..." />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              status={status}
              summary={summary}
              onNavigateTab={(tab) => setActiveTab(tab as TabKey)}
            />
          )}
          {activeTab === 'dataset' && (
            <DatasetTab
              summary={summary}
              quality={quality}
              processing={processing}
              onReprocess={handleProcessData}
            />
          )}
          {activeTab === 'continuity' && (
            <ContinuityTab
              onPredictStudent={(nim, internalId) => {
                setPredictTarget({ nim, internalId });
                setActiveTab('predict');
              }}
            />
          )}
          {activeTab === 'clustering' && (
            <ClusteringTab
              clusters={clusters}
              onNavigateTraining={() => setActiveTab('training')}
            />
          )}
          {activeTab === 'training' && (
            <TrainingTab modelsData={modelsData} onRefreshAll={loadAll} />
          )}
          {activeTab === 'evaluation' && <EvaluationTab evaluation={evaluation} />}
          {activeTab === 'predict' && <PredictionCenterTab initialStudent={predictTarget} />}
          {activeTab === 'history' && <HistoryTab historyData={historyData} />}
        </>
      )}
    </div>
  );
};
