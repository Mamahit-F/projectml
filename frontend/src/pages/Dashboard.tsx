import React, { useEffect, useState } from 'react';
import {
  Users, MapPin, Calendar, AlertTriangle, ShieldCheck,
  BrainCircuit, HeartHandshake, TrendingUp, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { dashboardService } from '../services';
import type { DashboardOverview } from '../types';
import { StatCard, LoadingState, Button } from '../components/ui';

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <div className="p-8 text-center text-slate-500">Gagal memuat ringkasan dashboard.</div>;

  const d: any = data;
  const outsiderDekat = d.outsiderDekatCount ?? d.totalOutsiderDekat ?? 0;
  const outsiderJauh = d.outsiderJauhCount ?? d.totalOutsiderJauh ?? 0;
  const totalEvents = d.totalWorshipEvents ?? d.totalEventsThisMonth ?? 0;
  const highRiskCount = d.predictionSummary?.highRiskCount ?? d.highRiskStudents ?? 0;
  const openWelfare = d.openWelfareReports ?? 0;

  const riskChartData = d.riskDistribution || (d.predictionSummary
    ? [
        { level: 'LOW', count: d.predictionSummary.lowRiskCount || 0 },
        { level: 'MEDIUM', count: d.predictionSummary.mediumRiskCount || 0 },
        { level: 'HIGH', count: d.predictionSummary.highRiskCount || 0 },
      ].filter((item) => item.count > 0)
    : []);

  const violatorsList: any[] = d.topViolators || d.studentsNeedingEvaluation || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Dashboard Pengawasan Mahasiswa Outsider</h1>
          <p className="text-xs text-emerald-200 mt-1">
            Data analitik terintegrasi Universitas Klabat — Outsider Dekat & Jauh
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchOverview}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          className="bg-white/10 hover:bg-white/20 text-white border-none shrink-0"
        >
          Muat Ulang Data
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Mahasiswa Outsider"
          value={d.totalStudents ?? 0}
          icon={<Users className="w-6 h-6 text-emerald-600" />}
          subtitle={`Dekat: ${outsiderDekat} | Jauh: ${outsiderJauh}`}
        />
        <StatCard
          title="Kegiatan Ibadah"
          value={totalEvents}
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          subtitle={`Berjalan: ${d.ongoingEvents ?? 0} | Selesai: ${d.completedEvents ?? 0}`}
        />
        <StatCard
          title="Mahasiswa Berisiko Tinggi (ML)"
          value={highRiskCount}
          icon={<BrainCircuit className="w-6 h-6 text-red-600" />}
          subtitle={`Sedang: ${d.predictionSummary?.mediumRiskCount ?? 0} | Rendah: ${d.predictionSummary?.lowRiskCount ?? 0}`}
        />
        <StatCard
          title="Laporan Bantuan / Kasus"
          value={openWelfare}
          icon={<HeartHandshake className="w-6 h-6 text-amber-600" />}
          subtitle="Perlu tindak lanjut Village Dean"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-700" />
            Distribusi Tingkat Risiko Mahasiswa (Hasil ML)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskChartData}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {riskChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.level] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trend Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            Statistik Kehadiran vs Ketidakhadiran
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Tidak Hadir" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Violators & High Attention Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Mahasiswa dengan Poin Pelanggaran Tertinggi
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Nama Mahasiswa</th>
                <th className="pb-3 font-semibold">NIM</th>
                <th className="pb-3 font-semibold text-right">Total Poin</th>
                <th className="pb-3 font-semibold text-right">Status Evaluasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {violatorsList.length > 0 ? (
                violatorsList.map((v, idx) => {
                  const pts = v.totalViolationPoints ?? v.points ?? 0;
                  return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-medium text-slate-800">{v.fullName || v.studentName}</td>
                    <td className="py-3 text-slate-500">{v.nim}</td>
                    <td className="py-3 text-right font-bold text-red-600">{pts} Poin</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        pts >= 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {pts >= 20 ? 'Perlu Panggilan Binaan' : 'Pantauan Khusus'}
                      </span>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Belum ada data pelanggaran tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
