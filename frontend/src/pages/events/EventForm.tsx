import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { eventService } from '../../services';
import { Button, Input, Select, Textarea } from '../../components/ui';

export const EventForm: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('FRIDAY_VESPER');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [location, setLocation] = useState('Pioneer Chapel UNKLAB');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await eventService.create({
        title,
        eventType: eventType as any,
        eventDate,
        startTime,
        endTime,
        location,
        description,
        status: 'SCHEDULED',
      });
      navigate('/events');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat kegiatan ibadah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Batal dan Kembali
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Jadwalkan Kegiatan Ibadah</h1>
        <p className="text-xs text-slate-500 mb-6">
          Sistem akan mencocokkan kewajiban kehadiran otomatis berdasarkan kategori Outsider Dekat / Jauh.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama / Judul Kegiatan Ibadah"
            required
            placeholder="Contoh: Vesper Jumat Malam Pekan 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Jenis Kegiatan (Event Type)"
              required
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              options={[
                { value: 'FRIDAY_VESPER', label: 'Ibadah Jumat Malam (Vesper)' },
                { value: 'SABBATH_MORNING', label: 'Ibadah Sabat Pagi' },
                { value: 'SABBATH_AFTERNOON', label: 'Ibadah Sabat Sore (AY)' },
                { value: 'WOP_MORNING', label: 'WOP Pagi (Week of Prayer)' },
                { value: 'WOP_EVENING', label: 'WOP Malam' },
                { value: 'WOP_CULMINATION', label: 'WOP Puncak Sabat Pagi' },
              ]}
            />
            <Input
              label="Lokasi Kegiatan"
              placeholder="Pioneer Chapel / Lapangan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tanggal Kegiatan"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              label="Waktu Mulai"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Waktu Selesai"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Textarea
            label="Keterangan Tambahan / Pembicara"
            rows={2}
            placeholder="Tema khotbah atau instruksi untuk petugas..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/events')}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={loading}
              icon={<Save className="w-4 h-4" />}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Simpan Jadwal Ibadah
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
