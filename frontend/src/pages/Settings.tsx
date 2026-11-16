import React from 'react';
import { Settings as SettingsIcon, Server, Database, Shield, BrainCircuit, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pengaturan & Informasi Sistem</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Parameter operasional, status integrasi backend Spring Boot & ML Service
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Backend Server (Java Spring Boot)</h3>
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <p><span className="font-semibold text-slate-700">Versi:</span> Spring Boot 3.3.5 / Java 17 LTS</p>
            <p><span className="font-semibold text-slate-700">REST API Prefix:</span> /api/v1</p>
            <p><span className="font-semibold text-slate-700">Autentikasi:</span> Stateless JWT (JJwt 0.12.6)</p>
            <p><span className="font-semibold text-slate-700">Audit Logging:</span> Aktif (Tabel audit_logs)</p>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Database Engine (PostgreSQL)</h3>
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <p><span className="font-semibold text-slate-700">Database:</span> studentinsight_db</p>
            <p><span className="font-semibold text-slate-700">Migration Tool:</span> Flyway Migration (V1 + V2)</p>
            <p><span className="font-semibold text-slate-700">Total Tabel:</span> 16 Tabel Relasional</p>
            <p><span className="font-semibold text-slate-700">Status Integritas:</span> Foreign Keys, Not Null, Unique Constraints</p>
          </div>
        </div>

        {/* Machine Learning Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Machine Learning Service (Python)</h3>
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <p><span className="font-semibold text-slate-700">Framework:</span> Python FastAPI + Scikit-Learn</p>
            <p><span className="font-semibold text-slate-700">Model Terpilih:</span> Random Forest Classifier</p>
            <p><span className="font-semibold text-slate-700">Macro F1 Score:</span> 0.7179 (High Risk Recall: 73.68%)</p>
            <p><span className="font-semibold text-slate-700">Pencegahan Kebocoran:</span> Non-leakage temporal split</p>
          </div>
        </div>

        {/* Active Account Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-800">Sesi Akun Saat Ini</h3>
          </div>
          <div className="text-xs space-y-2 text-slate-600">
            <p><span className="font-semibold text-slate-700">Nama:</span> {user?.fullName}</p>
            <p><span className="font-semibold text-slate-700">Username:</span> {user?.username}</p>
            <p><span className="font-semibold text-slate-700">Role Akses:</span> {user?.role}</p>
            <p><span className="font-semibold text-slate-700">Email:</span> {user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
