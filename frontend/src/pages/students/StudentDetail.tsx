import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, QrCode, ShieldAlert, Phone, MapPin,
  Calendar, CheckCircle, AlertTriangle, BrainCircuit, RefreshCw
} from 'lucide-react';
import { studentService, attendanceService, violationService, predictionService } from '../../services';
import type { Student, Attendance, ViolationPoint, StudentPrediction } from '../../types';
import { Button, Badge, LoadingState, Modal } from '../../components/ui';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [violations, setViolations] = useState<ViolationPoint[]>([]);
  const [prediction, setPrediction] = useState<StudentPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const fetchStudentData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const studentId = Number(id);
      const [sRes, aRes, vRes, pRes] = await Promise.all([
        studentService.getById(studentId),
        attendanceService.getAll({ studentId, size: 10 }).catch(() => ({ content: [] })),
        violationService.getByStudent(studentId).catch(() => []),
        predictionService.getByStudent(studentId).catch(() => null),
      ]);
      setStudent(sRes);
      setAttendances(aRes.content);
      setViolations(vRes);
      setPrediction(pRes);
    } catch (err) {
      console.error('Error fetching student detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleShowQr = async () => {
    if (!student) return;
    try {
      const b64 = await studentService.getQrCode(student.id);
      setQrBase64(b64);
      setQrModalOpen(true);
    } catch (err) {
      alert('Gagal membuat QR Code.');
    }
  };

  if (loading) return <LoadingState />;
  if (!student) return <div className="p-8 text-center text-slate-500">Mahasiswa tidak ditemukan.</div>;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/students" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Mahasiswa
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<QrCode className="w-3.5 h-3.5" />} onClick={handleShowQr}>
            Lihat QR Code
          </Button>
          <Link to={`/students/${student.id}/edit`}>
            <Button size="sm" icon={<Edit className="w-3.5 h-3.5" />} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Edit Data
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Card Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{student.fullName}</h1>
                <Badge color={student.status === 'ACTIVE' ? 'green' : 'gray'}>{student.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">NIM: {student.nim} • {student.programStudy}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {student.residenceCategoryName}
                </span>
                {student.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {student.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Poin Pelanggaran</p>
              <p className={`text-2xl font-bold mt-0.5 ${
                student.totalViolationPoints > 20 ? 'text-red-600' : 'text-slate-800'
              }`}>
                {student.totalViolationPoints} <span className="text-xs font-normal text-slate-400">Poin</span>
              </p>
            </div>
            {prediction && (
              <div>
                <p className="text-xs text-slate-400 font-medium">Prediksi Risiko ML</p>
                <div className="mt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    (prediction.riskCategory || prediction.riskLevel) === 'HIGH'
                      ? 'bg-red-100 text-red-700'
                      : (prediction.riskCategory || prediction.riskLevel) === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {prediction.riskCategory || prediction.riskLevel}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs / Sub-sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            Riwayat Presensi Terbaru
          </h2>
          {attendances.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Belum ada riwayat kehadiran tercatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Kegiatan</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendances.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-medium text-slate-800">{a.worshipEventTitle}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-500">{a.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Violations History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Riwayat Poin Pelanggaran
          </h2>
          {violations.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Tidak ada catatan pelanggaran untuk mahasiswa ini.</p>
          ) : (
            <div className="space-y-2.5">
              {violations.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{v.reason}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(v.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    +{v.points} Poin
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal open={qrModalOpen} onClose={() => setQrModalOpen(false)} title="QR Code Presensi Mahasiswa" size="sm">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          {qrBase64 ? (
            <img src={qrBase64} alt="QR Code" className="w-56 h-56 border p-2 rounded-xl bg-white shadow-inner mb-4" />
          ) : (
            <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <QrCode className="w-16 h-16 text-slate-300" />
            </div>
          )}
          <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">NIM: {student.nim}</p>
          <p className="text-[11px] text-slate-400 mt-2">
            Tunjukkan QR Code ini kepada petugas ibadah untuk pemindaian presensi.
          </p>
        </div>
      </Modal>
    </div>
  );
};
