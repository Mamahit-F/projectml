import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BrainCircuit,
  Play,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
  Info,
  Search,
  ChevronRight,
  PhoneCall,
  Calendar,
} from 'lucide-react';
import { predictionService, studentService } from '../../services';
import type { PredictionSummary, StudentPrediction } from '../../types';
import { Button, LoadingState, EmptyState, RiskBadge, Badge } from '../../components/ui';

export const PredictionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState<StudentPrediction[]>([]);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [studyPrograms, setStudyPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [riskFilter, setRiskFilter] = useState<string | undefined>(searchParams.get('risk') || undefined);
  const [prodiFilter, setProdiFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, prodis] = await Promise.all([
        predictionService.getAll({
          riskLevel: riskFilter,
          studyProgram: prodiFilter,
          search: search || undefined,
        }),
        predictionService.getSummary().catch(() => null),
        studentService.getStudyPrograms().catch(() => []),
      ]);
      setPredictions(pRes);
      setSummary(sRes);
      setStudyPrograms(prodis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchData, 180);
    return () => clearTimeout(t);
  }, [riskFilter, prodiFilter, search]);

  const handleRunAnalysis = async () => {
    setRunning(true);
    try {
      await predictionService.runAnalysis();
      await fetchData();
    } catch {
      alert('Gagal menjalankan analisis risiko dinamis.');
    } finally {
      setRunning(false);
    }
  };

  const rangeText = (tier: string) => {
    const r = summary?.clusterRanges?.[tier];
    if (!r) return 'Belum ada data';
    if (r.min === r.max) return `${r.min} poin`;
    return `${r.min} – ${r.max} poin`;
  };

  return (
    <div className="space-y-6">
      {/* Dark Obsidian Hero Banner (Finexy accent) */}
      <div className="bg-obsidian text-white rounded-3xl p-6 sm:p-7 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-coral-gradient opacity-20 blur-2xl" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-coral-gradient text-[11px] font-bold">
              Pengelompokan Dinamis • Tanpa Batas Baku
            </span>
            {summary?.attendanceCutoffDate && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-slate-200 inline-flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-coral-400" />
                Proyeksi s.d. {summary.attendanceCutoffDate}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-coral-400 shrink-0" />
            Deteksi Risiko & Proyeksi Poin Akhir Semester
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            Sistem memisahkan mahasiswa 0 poin sebagai kelompok Aman, lalu mengelompokkan mahasiswa berpoin secara alami mengikuti sebaran laporan PDF terbaru serta memproyeksikan poin akhir menjelang tutup absen semester.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            variant="coral"
            size="lg"
            loading={running}
            icon={<Play className="w-4 h-4 fill-current" />}
            onClick={handleRunAnalysis}
          >
            Jalankan Analisis Ulang
          </Button>
        </div>
      </div>

      {/* Jobgio-Style Vertical Quick Stats Pill Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: 'HIGH',
            title: 'Risiko Tinggi',
            value: summary?.highRiskCount ?? 0,
            pct: `${summary?.highRiskPercentage ?? 0}%`,
            range: rangeText('HIGH'),
            featured: true,
            icon: AlertTriangle,
          },
          {
            key: 'MEDIUM',
            title: 'Risiko Sedang',
            value: summary?.mediumRiskCount ?? 0,
            pct: `${summary?.mediumRiskPercentage ?? 0}%`,
            range: rangeText('MEDIUM'),
            featured: false,
            icon: TrendingUp,
          },
          {
            key: 'LOW',
            title: 'Risiko Rendah',
            value: summary?.lowRiskCount ?? 0,
            pct: `${summary?.lowRiskPercentage ?? 0}%`,
            range: rangeText('LOW'),
            featured: false,
            icon: ShieldAlert,
          },
          {
            key: 'SAFE',
            title: 'Aman (0 Poin)',
            value: summary?.safeCount ?? 0,
            pct: `${summary?.safePercentage ?? 0}%`,
            range: '0 poin',
            featured: false,
            icon: CheckCircle2,
          },
        ].map((card) => {
          const Icon = card.icon;
          const active = riskFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setRiskFilter(active ? undefined : card.key)}
              className={`text-left rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                active
                  ? 'bg-obsidian text-white border-obsidian shadow-soft'
                  : card.featured
                  ? 'bg-white border-coral-200 shadow-card hover:border-coral-500'
                  : 'bg-white border-[#ECEEF2] shadow-card hover:border-obsidian/30'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    active
                      ? 'bg-coral-gradient text-white'
                      : card.featured
                      ? 'bg-obsidian text-white'
                      : 'bg-[#F4F5F7] text-obsidian'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-white/15 text-white'
                      : card.featured
                      ? 'bg-coral-50 text-coral-600'
                      : 'bg-[#F4F5F7] text-slate-600'
                  }`}
                >
                  {card.pct}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight tabular-nums">{card.value}</p>
                <p className={`text-xs font-bold mt-1 ${active ? 'text-white' : 'text-obsidian'}`}>{card.title}</p>
                <p className={`text-[11px] mt-0.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                  Rentang alami: {card.range}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Decision Support & Final Limit Info Banner */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-coral-50 text-coral-600 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-obsidian">Prinsip Peringatan Dini:</strong> Hasil klaster dinamis berfungsi sebagai pendukung keputusan pembinaan pastoral dan kepedulian kesejahteraan, bukan hukuman otomatis.
            {summary?.finalPointLimit != null && (
              <span className="ml-1 font-bold text-coral-600">
                Batas Final Semester aktif: {summary.finalPointLimit} poin ({summary.exceedsFinalLimitCount} mahasiswa melewati batas).
              </span>
            )}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate('/reports-settings')}>
          Atur Semester / Batas Final
        </Button>
      </div>

      {/* Filter Toolbar & Results Table */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: undefined, label: 'Semua' },
              { id: 'HIGH', label: 'Risiko Tinggi' },
              { id: 'MEDIUM', label: 'Risiko Sedang' },
              { id: 'LOW', label: 'Risiko Rendah' },
              { id: 'SAFE', label: 'Aman (0 Poin)' },
            ].map((tab) => (
              <button
                key={String(tab.id)}
                onClick={() => setRiskFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  riskFilter === tab.id
                    ? 'bg-obsidian text-white'
                    : 'bg-[#F4F5F7] text-slate-600 hover:bg-[#E8EAEE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={prodiFilter || ''}
              onChange={(e) => setProdiFilter(e.target.value || undefined)}
              className="px-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full font-semibold text-obsidian focus:outline-none"
            >
              <option value="">Semua Prodi</option>
              {studyPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / NIM..."
                className="pl-8 pr-3.5 py-2 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white w-48"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Memuat hasil deteksi risiko..." />
        ) : predictions.length === 0 ? (
          <EmptyState
            message="Belum ada hasil analisis risiko untuk filter ini. Unggah laporan PDF atau jalankan analisis ulang."
            action={
              <Button variant="coral" size="sm" onClick={() => navigate('/pdf-reports')}>
                Unggah Laporan PDF
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="px-3.5 pb-1">Mahasiswa</th>
                  <th className="px-3 pb-1">Prodi</th>
                  <th className="px-3 pb-1 text-right">Poin Saat Ini</th>
                  <th className="px-3 pb-1 text-right">Proyeksi Akhir</th>
                  <th className="px-3 pb-1 text-right">Persentil</th>
                  <th className="px-3.5 pb-1 text-right">Kategori Risiko</th>
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 120).map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/students/${p.studentId}`)}
                    className="bg-[#F8F9FB] hover:bg-[#EFF1F6] transition cursor-pointer group"
                  >
                    <td className="px-3.5 py-3 rounded-l-2xl">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs font-bold text-obsidian group-hover:text-coral-600 transition">
                            {p.studentName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.studentNim}</p>
                        </div>
                        {p.exceedsFinalLimit && <Badge color="red">Melewati Batas</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{p.studyProgram}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="text-sm font-extrabold text-obsidian tabular-nums">{p.currentPoints}</span>
                      {p.pointsDelta !== 0 && (
                        <span className={`ml-1 text-[10px] font-bold ${p.pointsDelta > 0 ? 'text-coral-600' : 'text-emerald-600'}`}>
                          {p.pointsDelta > 0 ? `+${p.pointsDelta}` : p.pointsDelta}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-coral-600 tabular-nums whitespace-nowrap">
                      {p.projectedEndPoints != null ? `~${Math.round(p.projectedEndPoints)} pts` : '-'}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {p.percentileRank > 0 ? `Top ${Math.max(1, Math.round(100 - p.percentileRank))}%` : 'Aman'}
                    </td>
                    <td className="px-3.5 py-3 rounded-r-2xl text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {p.hasEmergencyContact && (
                          <span
                            title="Memiliki Kontak Darurat"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </span>
                        )}
                        <RiskBadge risk={p.riskCategory} />
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-obsidian transition" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {predictions.length > 120 && (
              <p className="text-center text-xs text-slate-400 pt-3">
                Menampilkan 120 data teratas dari {predictions.length} mahasiswa. Gunakan filter atau pencarian untuk mempersempit hasil.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
