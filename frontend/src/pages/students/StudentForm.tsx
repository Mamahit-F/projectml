import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { studentService } from '../../services';
import type { ResidenceCategory } from '../../types';
import { Button, Input, Select, Textarea, LoadingState } from '../../components/ui';

export const StudentForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ResidenceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nim, setNim] = useState('');
  const [fullName, setFullName] = useState('');
  const [studyProgram, setStudyProgram] = useState('Informatika');
  const [faculty, setFaculty] = useState('Fakultas Ilmu Komputer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [residenceCategoryId, setResidenceCategoryId] = useState<string>('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [latestSabbathPoints, setLatestSabbathPoints] = useState<number>(0);

  useEffect(() => {
    if (!id) {
      navigate('/students', { replace: true });
      return;
    }
    studentService.getResidenceCategories().then(setCategories).catch(() => {});
    studentService
      .getById(Number(id))
      .then((s) => {
        setNim(s.nim);
        setFullName(s.fullName);
        setStudyProgram(s.studyProgram);
        setFaculty(s.faculty);
        setPhoneNumber(s.phoneNumber || '');
        setResidenceCategoryId(s.residenceCategory ? String(s.residenceCategory.id) : '');
        setCurrentAddress(s.currentAddress || '');
        setStatus(s.status || 'ACTIVE');
        setLatestSabbathPoints(s.latestSabbathPoints || 0);
      })
      .catch(() => navigate('/students', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await studentService.update(Number(id), {
        fullName,
        studyProgram,
        faculty,
        phoneNumber: phoneNumber || null,
        residenceCategoryId: residenceCategoryId ? Number(residenceCategoryId) : null,
        currentAddress: currentAddress || null,
        status,
        latestSabbathPoints: Number(latestSabbathPoints) || 0,
      });
      navigate(`/students/${id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan data mahasiswa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>
          Kembali
        </Button>
        <div>
          <h1 className="text-xl font-extrabold text-obsidian">Lengkapi Profil Mahasiswa</h1>
          <p className="text-xs text-slate-500">
            Lengkapi kategori tempat tinggal (Outsider Dekat / Jauh), alamat kos, dan nomor telepon
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nomor Registrasi / NIM" disabled value={nim} />
          <Input label="Nama Lengkap" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Program Studi" required value={studyProgram} onChange={(e) => setStudyProgram(e.target.value)} />
          <Input label="Fakultas" required value={faculty} onChange={(e) => setFaculty(e.target.value)} />
          <Select
            label="Kategori Tempat Tinggal (Opsional)"
            value={residenceCategoryId}
            onChange={(e) => setResidenceCategoryId(e.target.value)}
            options={[
              { value: '', label: '— Belum Ditentukan —' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Input
            label="Nomor Telepon Mahasiswa"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
          <Input
            label="Poin Sabat Terbaru"
            type="number"
            min={0}
            value={latestSabbathPoints}
            onChange={(e) => setLatestSabbathPoints(Number(e.target.value))}
          />
          <Select
            label="Status Mahasiswa"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'PROBATION', label: 'Dalam Pembinaan Khusus' },
              { value: 'INACTIVE', label: 'Tidak Aktif' },
              { value: 'GRADUATED', label: 'Lulus' },
            ]}
          />
        </div>

        <Textarea
          label="Alamat Tempat Tinggal / Indekos"
          rows={2}
          value={currentAddress}
          onChange={(e) => setCurrentAddress(e.target.value)}
          placeholder="Nama kos, jalan, kelurahan/kecamatan..."
        />

        <div className="flex justify-end gap-2.5 pt-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={saving} icon={<Save className="w-3.5 h-3.5" />}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
};
