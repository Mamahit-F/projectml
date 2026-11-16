import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Search, Filter, Edit, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { attendanceService, eventService } from '../../services';
import type { Attendance, WorshipEvent } from '../../types';
import { Button, Badge, LoadingState, EmptyState, Modal, Select, Textarea } from '../../components/ui';

export const AttendanceList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('eventId');

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<WorshipEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(
    eventIdParam ? Number(eventIdParam) : undefined
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Correction Modal
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<string>('EXCUSED');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');

  const fetchEvents = async () => {
    try {
      const res = await eventService.getAll({ size: 20 });
      setEvents(res.content);
      if (!selectedEventId && res.content.length > 0) {
        setSelectedEventId(res.content[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getAll({
        page,
        size: 15,
        eventId: selectedEventId,
        status: statusFilter,
      });
      setAttendances(res.content);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId !== undefined) {
      fetchAttendances();
    }
  }, [selectedEventId, statusFilter, page]);

  const handleCorrectionSubmit = async () => {
    if (!editingAttendance) return;
    try {
      await attendanceService.update(editingAttendance.id, {
        status: correctionStatus,
        notes: correctionNotes,
      });
      setEditingAttendance(null);
      fetchAttendances();
    } catch (err) {
      alert('Gagal memperbarui status presensi.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Presensi & Rekap Kehadiran</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar presensi kegiatan peribadatan dan verifikasi dispensasi izin/sakit
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Kegiatan Ibadah:</label>
          <select
            value={selectedEventId || ''}
            onChange={(e) => {
              setSelectedEventId(e.target.value ? Number(e.target.value) : undefined);
              setPage(0);
            }}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.eventDate}) • {e.eventType}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter Status:</label>
          <select
            value={statusFilter || ''}
            onChange={(e) => {
              setStatusFilter(e.target.value || undefined);
              setPage(0);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">Semua Status</option>
            <option value="PRESENT">Hadir (PRESENT)</option>
            <option value="ABSENT">Tidak Hadir (ABSENT)</option>
            <option value="EXCUSED">Izin Resmi (EXCUSED)</option>
            <option value="SICK">Sakit (SICK)</option>
            <option value="PENDING_VERIFICATION">Menunggu Verifikasi</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : attendances.length === 0 ? (
          <EmptyState message="Belum ada data presensi untuk filter kegiatan ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">NIM</th>
                  <th className="py-3 px-4 font-semibold">Nama Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold">Status Kehadiran</th>
                  <th className="py-3 px-4 font-semibold">Metode</th>
                  <th className="py-3 px-4 font-semibold">Keterangan / Verifikasi</th>
                  <th className="py-3 px-4 font-semibold text-right">Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{att.studentNim}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{att.studentName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{att.residenceCategoryName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                        att.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                        att.status === 'EXCUSED' ? 'bg-blue-100 text-blue-800' :
                        att.status === 'SICK' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{att.method}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {att.notes || (att.verifiedBy ? `Diverifikasi: ${att.verifiedBy}` : '-')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit className="w-3 h-3" />}
                        onClick={() => {
                          setEditingAttendance(att);
                          setCorrectionStatus(att.status);
                          setCorrectionNotes(att.notes || '');
                        }}
                      >
                        Koreksi
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Correction Modal */}
      <Modal open={!!editingAttendance} onClose={() => setEditingAttendance(null)} title="Koreksi Presensi Mahasiswa" size="sm">
        {editingAttendance && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">Mahasiswa:</p>
              <p className="text-sm font-bold text-slate-800">{editingAttendance.studentName} ({editingAttendance.studentNim})</p>
            </div>

            <Select
              label="Ubah Status Kehadiran"
              value={correctionStatus}
              onChange={(e) => setCorrectionStatus(e.target.value)}
              options={[
                { value: 'PRESENT', label: 'Hadir (PRESENT)' },
                { value: 'EXCUSED', label: 'Izin Disetujui (EXCUSED - 0 Poin)' },
                { value: 'SICK', label: 'Surat Sakit (SICK - 0 Poin)' },
                { value: 'ABSENT', label: 'Alpa / Tidak Hadir (ABSENT)' },
                { value: 'PENDING_VERIFICATION', label: 'Menunggu Surat Izin' },
              ]}
            />

            <Textarea
              label="Alasan Koreksi / Catatan Petugas"
              required
              rows={2}
              placeholder="Contoh: Menyerahkan surat sakit dari poliklinik..."
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditingAttendance(null)}>Batal</Button>
              <Button onClick={handleCorrectionSubmit} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Simpan Koreksi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
