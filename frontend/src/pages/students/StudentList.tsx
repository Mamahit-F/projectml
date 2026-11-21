import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { studentService } from '../../services';
import type { Student } from '../../types';
import { Button, LoadingState, EmptyState, RiskBadge } from '../../components/ui';

export const StudentList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [studyProgram, setStudyProgram] = useState(searchParams.get('studyProgram') || '');
  const [riskCategory, setRiskCategory] = useState(searchParams.get('risk') || '');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    studentService.getStudyPrograms().then(setStudyPrograms).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await studentService.getAll({
        search: search || undefined,
        studyProgram: studyProgram || undefined,
        riskCategory: riskCategory || undefined,
        page,
        size: 20,
        sortBy: 'latestSabbathPoints',
        direction: 'desc',
      });
      setStudents(res.content || []);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 200);
    return () => clearTimeout(timer);
  }, [search, studyProgram, riskCategory, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-obsidian">Direktori Mahasiswa</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {totalElements.toLocaleString('id-ID')} mahasiswa terdata • Urutan otomatis dari Poin Sabat tertinggi
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari berdasarkan Nama, Nomor Registrasi (NIM), atau Prodi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full focus:outline-none focus:bg-white focus:border-obsidian"
          />
        </div>

        <select
          value={studyProgram}
          onChange={(e) => {
            setStudyProgram(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full font-semibold text-obsidian focus:outline-none"
        >
          <option value="">Semua Program Studi</option>
          {studyPrograms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={riskCategory}
          onChange={(e) => {
            setRiskCategory(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2.5 text-xs bg-[#F7F8FA] border border-[#E6E8EE] rounded-full font-semibold text-obsidian focus:outline-none"
        >
          <option value="">Semua Tingkat Risiko</option>
          <option value="HIGH">Risiko Tinggi</option>
          <option value="MEDIUM">Risiko Sedang</option>
          <option value="LOW">Risiko Rendah</option>
          <option value="SAFE">Aman (0 Poin)</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-[#ECEEF2] shadow-card p-6">
        {loading ? (
          <LoadingState message="Memuat daftar mahasiswa..." />
        ) : students.length === 0 ? (
          <EmptyState
            message="Belum ada data mahasiswa yang sesuai filter. Anda dapat mengunggah PDF poin dari Village Dean untuk mengisi direktori secara otomatis."
            action={
              <Button variant="coral" size="sm" onClick={() => navigate('/pdf-reports')}>
                Unggah PDF Poin
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[11px] font-semibold text-slate-400">
                    <th className="px-3 pb-1">Mahasiswa</th>
                    <th className="px-3 pb-1">Program Studi & Fakultas</th>
                    <th className="px-3 pb-1">Tempat Tinggal</th>
                    <th className="px-3 pb-1 text-right">Poin Sabat</th>
                    <th className="px-3 pb-1 text-right">Proyeksi</th>
                    <th className="px-3.5 pb-1 text-right">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="bg-[#F8F9FB] hover:bg-[#EFF1F6] transition cursor-pointer group"
                    >
                      <td className="px-3.5 py-3 rounded-l-2xl">
                        <p className="text-xs font-bold text-obsidian group-hover:text-coral-600 transition">
                          {s.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.nim}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-obsidian">{s.studyProgram}</p>
                        <p className="text-[11px] text-slate-400">{s.faculty}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {s.residenceCategory?.name || (
                          <span className="text-slate-400 italic">Belum dilengkapi</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className="text-sm font-extrabold text-obsidian tabular-nums">
                          {s.latestSabbathPoints}
                        </span>
                        {s.pointsDelta !== 0 && (
                          <span
                            className={`ml-1 text-[10px] font-bold ${
                              s.pointsDelta > 0 ? 'text-coral-600' : 'text-emerald-600'
                            }`}
                          >
                            {s.pointsDelta > 0 ? `+${s.pointsDelta}` : s.pointsDelta}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                        {s.projectedEndPoints != null ? `~${Math.round(s.projectedEndPoints)}` : '-'}
                      </td>
                      <td className="px-3.5 py-3 rounded-r-2xl text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <RiskBadge risk={s.riskCategory} />
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-obsidian transition" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-5 pt-4 border-t border-[#F0F1F4] flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Halaman <strong>{page + 1}</strong> dari <strong>{totalPages}</strong> ({totalElements} mahasiswa)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
