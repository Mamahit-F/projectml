import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { studentService, residenceService } from '../../services';
import type { ResidenceCategory } from '../../types';
import { Button, Input, Select, Textarea } from '../../components/ui';

export const StudentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [nim, setNim] = useState('');
  const [fullName, setFullName] = useState('');
  const [studyProgram, setStudyProgram] = useState('');
  const [faculty, setFaculty] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [residenceCategoryId, setResidenceCategoryId] = useState<number>(1);
  const [currentAddress, setCurrentAddress] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Emergency Contact Form Fields
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Orang Tua');
  const [contactPhone, setContactPhone] = useState('');

  const [categories, setCategories] = useState<ResidenceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    residenceService.getAll().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !isEdit) {
        setResidenceCategoryId(cats[0].id);
      }
    });

    if (isEdit) {
      setLoading(true);
      studentService.getById(Number(id)).then((s: any) => {
        setNim(s.nim);
        setFullName(s.fullName);
        setStudyProgram(s.studyProgram || s.programStudy || '');
        setFaculty(s.faculty || '');
        setPhoneNumber(s.phoneNumber || '');
        setResidenceCategoryId(s.residenceCategory?.id || s.residenceCategoryId || 1);
        setCurrentAddress(s.currentAddress || s.residenceAddress || '');
        setStatus(s.status);

        if (s.emergencyContacts && s.emergencyContacts.length > 0) {
          const ec = s.emergencyContacts[0];
          setContactName(ec.contactName);
          setRelationship(ec.relationship);
          setContactPhone(ec.phoneNumber);
        }
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: any = {
      nim,
      fullName,
      studyProgram,
      faculty,
      phoneNumber,
      residenceCategoryId: Number(residenceCategoryId),
      currentAddress,
      status,
      emergencyContactName: contactName || undefined,
      emergencyRelationship: contactName ? relationship : undefined,
      emergencyPhone: contactName ? contactPhone : undefined,
    };

    try {
      if (isEdit) {
        await studentService.update(Number(id), payload);
      } else {
        await studentService.create(payload);
      }
      navigate('/students');
    } catch (err: any) {
      const validationMap = err.response?.data?.data;
      if (validationMap && typeof validationMap === 'object') {
        setError(Object.values(validationMap).join(', '));
      } else {
        setError(err.response?.data?.message || 'Gagal menyimpan data mahasiswa.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Batal dan Kembali
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {isEdit ? 'Ubah Data Mahasiswa' : 'Pendaftaran Mahasiswa Outsider Baru'}
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          Lengkapi data profil tempat tinggal dan kontak darurat mahasiswa.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Academic & Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="NIM (Nomor Induk Mahasiswa)"
              required
              disabled={isEdit}
              placeholder="Contoh: 105022110001"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
            />
            <Input
              label="Nama Lengkap"
              required
              placeholder="Nama sesuai KTP/KTM"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Program Studi"
              required
              placeholder="Contoh: Informatika / Sistem Informasi"
              value={studyProgram}
              onChange={(e) => setStudyProgram(e.target.value)}
            />
            <Input
              label="Fakultas"
              required
              placeholder="Contoh: Fakultas Ilmu Komputer"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
            />
            <Input
              label="Nomor WhatsApp / HP Mahasiswa"
              placeholder="08xxxxxxxxxx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          {/* Section: Residence Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Kategori Tempat Tinggal"
              required
              value={residenceCategoryId}
              onChange={(e) => setResidenceCategoryId(Number(e.target.value))}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            {isEdit && (
              <Select
                label="Status Mahasiswa"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'ACTIVE', label: 'Aktif' },
                  { value: 'INACTIVE', label: 'Nonaktif' },
                  { value: 'GRADUATED', label: 'Lulus' },
                ]}
              />
            )}
          </div>

          <Textarea
            label="Alamat Lengkap Tempat Tinggal (Kos / Rumah)"
            required
            rows={2}
            placeholder="Alamat detail kos, nomor kamar, nama pemilik kos..."
            value={currentAddress}
            onChange={(e) => setCurrentAddress(e.target.value)}
          />

          {/* Section: Emergency Contact */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Kontak Darurat (Wajib untuk Outsider)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Nama Kontak"
                placeholder="Nama Orang Tua / Wali"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <Input
                label="Hubungan"
                placeholder="Ayah / Ibu / Wali"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
              <Input
                label="No HP Darurat"
                placeholder="08xxxxxxxxxx"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/students')}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={loading}
              icon={<Save className="w-4 h-4" />}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Simpan Data Mahasiswa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
