import React, { useState, useEffect } from 'react';
import { QrCode, CheckCircle, AlertCircle, Calendar, UserCheck, Shield, Camera } from 'lucide-react';
import { attendanceService, eventService, studentService } from '../../services';
import type { WorshipEvent, Attendance, Student } from '../../types';
import { Button, Input, Select, Badge, LoadingState } from '../../components/ui';

export const QRScanner: React.FC = () => {
  const [events, setEvents] = useState<WorshipEvent[]>([]);
  const [sampleStudents, setSampleStudents] = useState<Student[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<Attendance | null>(null);
  const [scanHistory, setScanHistory] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventService.getAll({ size: 20 }).then((res) => {
      const activeEvents = res.content.filter((e) => e.status === 'ONGOING' || e.status === 'SCHEDULED');
      const sorted = [...activeEvents].sort((a, b) => (a.status === 'ONGOING' ? -1 : b.status === 'ONGOING' ? 1 : 0));
      setEvents(sorted);
      if (sorted.length > 0) {
        setSelectedEventId(sorted[0].id);
      }
    });
    studentService.getAll({ size: 4, status: 'ACTIVE' }).then((res) => {
      setSampleStudents(res.content || []);
    }).catch(() => {});
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !qrToken.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await attendanceService.scanQr(qrToken.trim(), selectedEventId);
      setLastScanned(result);
      setScanHistory((prev) => [result, ...prev]);
      setQrToken('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memproses QR Code. Pastikan QR valid dan belum tercatat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pindai QR Code Presensi Ibadah</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan QR Code aman mahasiswa untuk mencatat kehadiran peribadatan secara real-time
        </p>
      </div>

      {/* Select Event */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <label className="block text-xs font-bold text-slate-800 mb-2">
          Pilih Kegiatan Ibadah Berlangsung:
        </label>
        {events.length === 0 ? (
          <p className="text-xs text-amber-600">Tidak ada jadwal ibadah aktif saat ini.</p>
        ) : (
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.eventDate} - {e.startTime}) • {e.eventType}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Scanner & Manual Input Box */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <QrCode className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Pemindaian Token Presensi Mahasiswa</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Gunakan barcode scanner, kamera, atau input token QR terenkripsi mahasiswa di bawah ini:
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleScanSubmit} className="mt-6 max-w-md mx-auto flex gap-2">
          <input
            type="text"
            required
            autoFocus
            placeholder="Scan atau tempel Token QR di sini (contoh: QR-STU-...)"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <Button
            type="submit"
            loading={loading}
            disabled={!selectedEventId}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 rounded-xl text-xs font-semibold shrink-0"
          >
            Catat Hadir
          </Button>
        </form>

        {/* Quick Simulator Buttons for Testing */}
        {sampleStudents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">
              Simulasi Cepat Token Mahasiswa Aktif:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {sampleStudents.map((stu) => (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => setQrToken(stu.qrToken)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-600"
                >
                  {stu.fullName.split(' ')[0]} ({stu.nim.slice(-5)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Last Scanned Feedback Card */}
      {lastScanned && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Presensi Berhasil Dicatat!</p>
              <p className="text-sm font-bold text-emerald-950 mt-0.5">{lastScanned.studentName}</p>
              <p className="text-[11px] text-emerald-700 font-mono">
                NIM: {lastScanned.studentNim} • {(lastScanned as any).studentResidenceName || lastScanned.residenceCategoryName}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-full">
            HADIR (QR)
          </span>
        </div>
      )}

      {/* Session History List */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Riwayat Pemindaian Sesi Ini ({scanHistory.length} Mahasiswa)
          </h3>
          <div className="divide-y divide-slate-100">
            {scanHistory.map((s: any, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{s.studentName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {s.studentNim} • {s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString('id-ID') : s.scannedAt || 'Baru saja'}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {s.recordedMethod || s.method}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
