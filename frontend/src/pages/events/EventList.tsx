import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Clock, MapPin, CheckCircle, Ban, AlertCircle } from 'lucide-react';
import { eventService } from '../../services';
import type { WorshipEvent } from '../../types';
import { Button, Badge, LoadingState, EmptyState } from '../../components/ui';

export const EventList: React.FC = () => {
  const [events, setEvents] = useState<WorshipEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await eventService.getAll({ page, size: 10 });
      setEvents(res.content);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page]);

  const handleCancel = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan kegiatan ibadah ini? Poin ketidakhadiran tidak akan dihitung jika kegiatan dibatalkan.')) return;
    try {
      await eventService.cancel(id);
      fetchEvents();
    } catch (err) {
      alert('Gagal membatalkan kegiatan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jadwal Kegiatan Peribadatan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola jadwal kebaktian, Vesper Jumat, Sabat, dan Week of Prayer (WOP)
          </p>
        </div>
        <Link to="/events/new">
          <Button icon={<Plus className="w-4 h-4" />} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            Buat Jadwal Ibadah
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState message="Belum ada jadwal kegiatan ibadah." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Kegiatan</th>
                  <th className="py-3 px-4 font-semibold">Jenis Ibadah</th>
                  <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                  <th className="py-3 px-4 font-semibold">Lokasi</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{event.title}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{event.eventType}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.eventDate} ({event.startTime})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{event.location || 'GKST / Pioneer Chapel'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge color={
                        event.status === 'COMPLETED' ? 'green' :
                        event.status === 'CANCELLED' ? 'red' :
                        event.status === 'ONGOING' ? 'blue' : 'yellow'
                      }>
                        {event.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link to={`/attendance?eventId=${event.id}`}>
                        <Button size="sm" variant="secondary">Presensi</Button>
                      </Link>
                      {event.status !== 'CANCELLED' && event.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleCancel(event.id)}
                        >
                          Batalkan
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
