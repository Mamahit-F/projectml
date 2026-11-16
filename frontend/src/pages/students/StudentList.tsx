import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, QrCode, ShieldAlert } from 'lucide-react';
import { studentService, residenceService } from '../../services';
import type { Student, ResidenceCategory } from '../../types';
import { Button, Badge, LoadingState, EmptyState } from '../../components/ui';

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<ResidenceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, catRes] = await Promise.all([
        studentService.getAll({
          page,
          size: 10,
          search: search || undefined,
          categoryId: selectedCategory,
          status: selectedStatus,
        }),
        residenceService.getAll().catch(() => []),
      ]);
      setStudents(studentsRes.content);
      setTotalPages(studentsRes.totalPages);
      setCategories(catRes);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Mahasiswa Outsider</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap mahasiswa Outsider Dekat dan Outsider Jauh Universitas Klabat
          </p>
        </div>
        <Link to="/students/new">
          <Button icon={<Plus className="w-4 h-4" />} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            Tambah Mahasiswa
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari berdasarkan NIM atau Nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">Cari</Button>
        </form>

        <div className="flex gap-2">
          <select
            value={selectedCategory || ''}
            onChange={(e) => {
              setSelectedCategory(e.target.value ? Number(e.target.value) : undefined);
              setPage(0);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">Semua Kategori Tempat Tinggal</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus || ''}
            onChange={(e) => {
              setSelectedStatus(e.target.value || undefined);
              setPage(0);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="GRADUATED">Lulus</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : students.length === 0 ? (
          <EmptyState message="Tidak ada data mahasiswa ditemukan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">NIM</th>
                  <th className="py-3 px-4 font-semibold">Nama Mahasiswa</th>
                  <th className="py-3 px-4 font-semibold">Program Studi</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold text-center">Poin Pelanggaran</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">{student.nim}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{student.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{student.programStudy}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        student.residenceCategoryName?.includes('Dekat')
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {student.residenceCategoryName || 'Outsider'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                        student.totalViolationPoints > 20
                          ? 'bg-red-100 text-red-700'
                          : student.totalViolationPoints > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {student.totalViolationPoints}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge color={student.status === 'ACTIVE' ? 'green' : 'gray'}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/students/${student.id}`}>
                        <Button size="sm" variant="secondary" icon={<Eye className="w-3.5 h-3.5" />}>
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Halaman {page + 1} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
