import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Phone,
  Plus,
  Trash2,
  HeartHandshake,
  MessageSquareHeart,
  PhoneCall,
  TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { studentService, followUpService, welfareService, predictionService } from '../../services';
import type { Student, StudentPointHistoryItem, FollowUp, WelfareReport, StudentPrediction } from '../../types';
import { Button, LoadingState, RiskBadge, Badge, Modal, Input, Select, Textarea } from '../../components/ui';

export const StudentDetail: React.FC = () => {
  const { id } = useParams();
  const studentId = Number(id);
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StudentPointHistoryItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [welfareReports, setWelfareReports] = useState<WelfareReport[]>([]);
  const [prediction, setPrediction] = useState<StudentPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'followup' | 'welfare' | 'emergency'>('followup');

  // Modals
  const [openFollowUpModal, setOpenFollowUpModal] = useState(false);
  const [openWelfareModal, setOpenWelfareModal] = useState(false);
  const [openContactModal, setOpenContactModal] = useState(false);

  // Follow-up form
  const [counselingDate, setCounselingDate] = useState(new Date().toISOString().slice(0, 10));
  const [topics, setTopics] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [followStatus, setFollowStatus] = useState('SCHEDULED');

  // Welfare form
  const [reportType, setReportType] = useState('HOUSING');
  const [priority, setPriority] = useState('MEDIUM');
  const [welfareDesc, setWelfareDesc] = useState('');

  // Contact form
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Orang Tua');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, h, f, w, p] = await Promise.all([
        studentService.getById(studentId),
        studentService.getPointHistory(studentId).catch(() => []),
        followUpService.getByStudent(studentId).catch(() => []),
        welfareService.getByStudent(studentId).catch(() => []),
        predictionService.getByStudent(studentId).catch(() => null),
      ]);
      setStudent(s);
      setHistory(h);
      setFollowUps(f);
      setWelfareReports(w);
      setPrediction(p);
    } catch {
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) loadAll();
  }, [studentId]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await followUpService.create({
        studentId,
        counselingDate,
        topicsDiscussed: topics,
        actionPlan,
        status: followStatus,
      });
      setOpenFollowUpModal(false);
      setTopics('');
      setActionPlan('');
      loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddWelfare = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await welfareService.create({
        studentId,
        reportType,
        priority,
        description: welfareDesc,
      });
      setOpenWelfareModal(false);
      setWelfareDesc('');
      loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await studentService.addEmergencyContact(studentId, {
        contactName,
        relationship,
        phoneNumber: contactPhone,
        address: contactAddress,
      });
      setOpenContactModal(false);
      setContactName('');
      setContactPhone('');
      setContactAddress('');
      loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Hapus kontak darurat ini?')) return;
    await studentService.deleteEmergencyContact(studentId, contactId);
    loadAll();
  };

  if (loading || !student) return <LoadingState message="Memuat profil terpadu mahasiswa..." />;

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate('/students')}>
          Kembali ke Direktori
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Edit3 className="w-3.5 h-3.5" />}
          onClick={() => navigate(`/students/${student.id}/edit`)}
        >
          Lengkapi Alamat / Kategori Kos
        </Button>
      </div>

      {/* Hero Profile Bento */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <RiskBadge risk={student.riskCategory} size="md" />
              <Badge color="slate">{student.studyProgram}</Badge>
              <Badge color="slate">{student.residenceCategory?.name || 'Tempat tinggal belum dilengkapi'}</Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-obsidian tracking-tight">{student.fullName}</h1>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Nomor Registrasi: {student.nim} • {student.faculty}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#F0F1F4] text-xs">
            <div className="flex items-start gap-2.5 bg-[#F7F8FA] rounded-2xl p-3">
              <MapPin className="w-4 h-4 text-coral-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Tempat Tinggal / Kos</p>
                <p className="text-obsidian font-medium mt-0.5">
                  {student.currentAddress || 'Belum diisi — klik "Lengkapi Alamat"'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-[#F7F8FA] rounded-2xl p-3">
              <Phone className="w-4 h-4 text-obsidian shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor HP Mahasiswa</p>
                <p className="text-obsidian font-medium mt-0.5">{student.phoneNumber || 'Belum diisi'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Points & Projection Hero */}
        <div className="xl:col-span-5 grid grid-cols-2 gap-4">
          <div className="bg-coral-gradient text-white rounded-3xl p-6 shadow-coral flex flex-col justify-between">
            <span className="text-xs font-semibold text-white/90">Poin Sabat Terbaru</span>
            <div className="mt-4">
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">{student.latestSabbathPoints}</p>
              <p className="text-xs text-white/85 mt-1">
                {student.pointsDelta > 0
                  ? `Naik +${student.pointsDelta} dari laporan sebelumnya`
                  : student.pointsDelta < 0
                  ? `Turun ${student.pointsDelta} poin`
                  : 'Stabil / laporan pertama'}
              </p>
            </div>
          </div>

          <div className="bg-obsidian text-white rounded-3xl p-6 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-300">Proyeksi Akhir Semester</span>
            <div className="mt-4">
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                {student.projectedEndPoints != null ? `~${Math.round(student.projectedEndPoints)}` : student.latestSabbathPoints}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {prediction?.percentileRank && prediction.percentileRank > 0
                  ? `Persentil ke-${Math.round(prediction.percentileRank)}`
                  : 'Perkiraan hingga tutup absen'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Point History Chart */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-obsidian flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-coral-500" />
                Riwayat Perkembangan Poin Antar-PDF
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tercatat pada {history.length} arsip laporan PDF Village Dean
              </p>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="studentPts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F55B2A" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F55B2A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F4" />
                <XAxis dataKey="reportDate" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161618', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="sabbathPoints" name="Poin Sabat" stroke="#F55B2A" strokeWidth={2.5} fill="url(#studentPts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3-Pillar Unified Tabs (Pembinaan, Kesejahteraan, Kontak Darurat) */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F4] pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'followup' as const, label: `Pembinaan & Konseling (${followUps.length})`, icon: MessageSquareHeart },
              { id: 'welfare' as const, label: `Kesejahteraan & Keamanan (${welfareReports.length})`, icon: HeartHandshake },
              { id: 'emergency' as const, label: `Kontak Darurat Wali (${student.emergencyContacts?.length || 0})`, icon: PhoneCall },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${
                    activeTab === t.id
                      ? 'bg-obsidian text-white'
                      : 'bg-[#F4F5F7] text-slate-600 hover:bg-[#E8EAEE]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div>
            {activeTab === 'followup' && (
              <Button size="sm" variant="coral" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setOpenFollowUpModal(true)}>
                Catat Pembinaan
              </Button>
            )}
            {activeTab === 'welfare' && (
              <Button size="sm" variant="coral" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setOpenWelfareModal(true)}>
                Buat Laporan Kesejahteraan
              </Button>
            )}
            {activeTab === 'emergency' && (
              <Button size="sm" variant="coral" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setOpenContactModal(true)}>
                Tambah Kontak Wali
              </Button>
            )}
          </div>
        </div>

        {/* Tab 1: Follow-ups */}
        {activeTab === 'followup' && (
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan pembinaan untuk mahasiswa ini.</p>
            ) : (
              followUps.map((f) => (
                <div key={f.id} className="p-4 rounded-2xl bg-[#F8F9FB] border border-[#EFF1F5] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-obsidian">{f.counselingDate}</span>
                      <Badge color={f.status === 'COMPLETED' ? 'green' : 'amber'}>{f.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold">{f.topicsDiscussed}</p>
                    <p className="text-xs text-slate-500">Rencana tindak lanjut: {f.actionPlan}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Welfare */}
        {activeTab === 'welfare' && (
          <div className="space-y-3">
            {welfareReports.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada laporan kendala kesejahteraan atau keamanan kos.</p>
            ) : (
              welfareReports.map((w) => (
                <div key={w.id} className="p-4 rounded-2xl bg-[#F8F9FB] border border-[#EFF1F5] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge color="dark">{w.reportType}</Badge>
                      <Badge color={w.priority === 'URGENT' || w.priority === 'HIGH' ? 'coral' : 'amber'}>{w.priority}</Badge>
                      <Badge color={w.status === 'RESOLVED' ? 'green' : 'blue'}>{w.status}</Badge>
                    </div>
                    <p className="text-xs text-obsidian font-medium mt-1">{w.description}</p>
                    {w.resolutionNotes && (
                      <p className="text-xs text-emerald-700">Penyelesaian: {w.resolutionNotes}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Emergency Contacts */}
        {activeTab === 'emergency' && (
          <div className="space-y-3">
            {!student.emergencyContacts || student.emergencyContacts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada kontak darurat orang tua/wali tersimpan.</p>
            ) : (
              student.emergencyContacts.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[#F8F9FB] border border-[#EFF1F5] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-obsidian">
                      {c.contactName} <span className="text-slate-400 font-medium">({c.relationship})</span>
                    </p>
                    <p className="text-xs font-mono font-semibold text-coral-600 mt-0.5">{c.phoneNumber}</p>
                    {c.address && <p className="text-[11px] text-slate-500 mt-0.5">{c.address}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteContact(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Add Follow-Up */}
      <Modal open={openFollowUpModal} onClose={() => setOpenFollowUpModal(false)} title="Catat Sesi Pembinaan / Konseling">
        <form onSubmit={handleAddFollowUp} className="space-y-4">
          <Input label="Tanggal Pertemuan" type="date" required value={counselingDate} onChange={(e) => setCounselingDate(e.target.value)} />
          <Textarea label="Topik / Kendala yang Dibahas" required rows={2} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Contoh: Evaluasi ketidakhadiran Sabat dan kendala transportasi..." />
          <Textarea label="Rencana Tindak Lanjut" required rows={2} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} placeholder="Contoh: Komitmen hadir bersama rekan dan pemantauan 2 minggu..." />
          <Select
            label="Status"
            value={followStatus}
            onChange={(e) => setFollowStatus(e.target.value)}
            options={[
              { value: 'SCHEDULED', label: 'Dijadwalkan' },
              { value: 'FOLLOW_UP_NEEDED', label: 'Perlu Pemantauan Lanjutan' },
              { value: 'COMPLETED', label: 'Selesai' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpenFollowUpModal(false)}>Batal</Button>
            <Button type="submit" variant="primary" loading={submitting}>Simpan Catatan</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Welfare */}
      <Modal open={openWelfareModal} onClose={() => setOpenWelfareModal(false)} title="Buat Laporan Kesejahteraan / Keamanan">
        <form onSubmit={handleAddWelfare} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Jenis Kendala"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={[
                { value: 'HOUSING', label: 'Tempat Tinggal / Kos' },
                { value: 'SECURITY', label: 'Keamanan Lingkungan' },
                { value: 'HEALTH', label: 'Kesehatan' },
                { value: 'FINANCIAL', label: 'Finansial / Makan' },
                { value: 'GENERAL_AID', label: 'Bantuan Umum' },
              ]}
            />
            <Select
              label="Prioritas"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'LOW', label: 'Rendah' },
                { value: 'MEDIUM', label: 'Sedang' },
                { value: 'HIGH', label: 'Tinggi' },
                { value: 'URGENT', label: 'Mendesak' },
              ]}
            />
          </div>
          <Textarea label="Deskripsi Kendala" required rows={3} value={welfareDesc} onChange={(e) => setWelfareDesc(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpenWelfareModal(false)}>Batal</Button>
            <Button type="submit" variant="coral" loading={submitting}>Simpan Laporan</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Contact */}
      <Modal open={openContactModal} onClose={() => setOpenContactModal(false)} title="Tambah Kontak Darurat Orang Tua / Wali">
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input label="Nama Kontak" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Select
            label="Hubungan"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            options={[
              { value: 'Orang Tua', label: 'Orang Tua' },
              { value: 'Saudara', label: 'Saudara' },
              { value: 'Teman', label: 'Teman' },
            ]}
          />
          <Input label="Nomor Telepon Aktif" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <Textarea label="Alamat Wali" rows={2} value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpenContactModal(false)}>Batal</Button>
            <Button type="submit" variant="primary" loading={submitting}>Simpan Kontak</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
