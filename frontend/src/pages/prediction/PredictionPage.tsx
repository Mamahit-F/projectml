import React, { useEffect, useState } from 'react';
import { BrainCircuit, Play, ShieldAlert, CheckCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { predictionService } from '../../services';
import type { StudentPrediction, PredictionSummary } from '../../types';
import { Button, LoadingState, EmptyState, Badge, StatCard } from '../../components/ui';

export const PredictionPage: React.FC = () => {
  const [predictions, setPredictions] = useState<StudentPrediction[]>([]);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string | undefined>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        predictionService.getAll({ riskLevel: riskFilter }),
        predictionService.getSummary().catch(() => null),
      ]);
      setPredictions(pRes);
      setSummary(sRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [riskFilter]);

  const handleRunPredictions = async () => {
    if (!confirm('Jalankan inferensi Machine Learning untuk seluruh mahasiswa aktif saat ini?')) return;
    setRunning(true);
    try {
      await predictionService.runPredictions();
      alert('Prediksi risiko Machine Learning berhasil diperbarui untuk seluruh mahasiswa!');
      fetchData();
    } catch (err) {
      alert('Gagal menjalankan prediksi ML.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold">Prediksi Risiko Ketidakhadiran (Machine Learning)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Model Random Forest Classifier (Macro F1: 0.718) — Deteksi dini risiko mahasiswa tanpa target leakage
          </p>
        </div>
        <Button
          onClick={handleRunPredictions}
          loading={running}
          icon={<Play className="w-4 h-4 fill-current" />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          Jalankan Batch Prediksi Sekarang
        </Button>
      </div>

      {/* Decision Support Principle Banner */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-semibold">Prinsip Sistem Pendukung Keputusan (Decision Support Only):</p>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            Sesuai Fase 1.3 & Fase 6.J prompt, hasil prediksi Machine Learning <strong>tidak boleh dijadikan dasar pemberian hukuman otomatis</strong>. Klasifikasi risiko berfungsi semata-mata sebagai indikator preventif bagi Village Dean untuk memberikan bimbingan dan pembinaan pastoral secara proaktif.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Mahasiswa Dianalisis"
            value={summary.totalStudents}
            icon={<BrainCircuit className="w-5 h-5 text-indigo-600" />}
          />
          <StatCard
            title="Risiko Tinggi (HIGH)"
            value={summary.highRisk}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            subtitle="Prioritas pembinaan Village Dean"
          />
          <StatCard
            title="Risiko Sedang (MEDIUM)"
            value={summary.mediumRisk}
            icon={<Info className="w-5 h-5 text-amber-600" />}
            subtitle="Pemantauan presensi berkala"
          />
          <StatCard
            title="Risiko Rendah (LOW)"
            value={summary.lowRisk}
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            subtitle="Tingkat kedisiplinan baik"
          />
        </div>
      )}

      {/* Table Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-700">Filter Tingkat Risiko:</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={!riskFilter ? 'primary' : 'secondary'}
            onClick={() => setRiskFilter(undefined)}
          >
            Semua
          </Button>
          <Button
            size="sm"
            variant={riskFilter === 'HIGH' ? 'primary' : 'secondary'}
            onClick={() => setRiskFilter('HIGH')}
            className={riskFilter === 'HIGH' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            HIGH Risk
          </Button>
          <Button
            size="sm"
            variant={riskFilter === 'MEDIUM' ? 'primary' : 'secondary'}
            onClick={() => setRiskFilter('MEDIUM')}
            className={riskFilter === 'MEDIUM' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            MEDIUM Risk
          </Button>
          <Button
            size="sm"
            variant={riskFilter === 'LOW' ? 'primary' : 'secondary'}
            onClick={() => setRiskFilter('LOW')}
            className={riskFilter === 'LOW' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            LOW Risk
          </Button>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : predictions.length === 0 ? (
          <EmptyState message="Belum ada data prediksi ML. Klik 'Jalankan Batch Prediksi Sekarang' di atas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold text-center">Tingkat Risiko</th>
                  <th className="py-3 px-4 font-semibold text-center">Tingkat Kehadiran</th>
                  <th className="py-3 px-4 font-semibold text-center">Absen Beruntun</th>
                  <th className="py-3 px-4 font-semibold text-center">Poin Pelanggaran</th>
                  <th className="py-3 px-4 font-semibold">Catatan Evaluasi Sistem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p: any) => {
                  const risk = p.riskCategory || p.riskLevel || 'LOW';
                  return (
                  <tr key={p.studentId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{p.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.studentNim}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{p.residenceCategory || p.residenceCategoryName}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        risk === 'HIGH' ? 'bg-red-100 text-red-700' :
                        risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {risk}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {p.probHigh ? `High: ${(p.probHigh * 100).toFixed(0)}%` : '0%'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                      {p.modelVersion ? `v${p.modelVersion}` : 'v1.0'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600">
                      {p.totalViolationPoints}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      Model {p.modelName || 'RandomForest'} memprediksi probabilitas ketidakhadiran.
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
