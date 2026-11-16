import React, { useEffect, useState } from 'react';
import { UserCog, Plus, ShieldCheck, CheckCircle, XCircle, KeyRound } from 'lucide-react';
import { userService } from '../../services';
import type { User } from '../../types';
import { Button, LoadingState, EmptyState, Modal, Input, Select, Badge } from '../../components/ui';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('STAFF');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.create({
        username,
        email,
        fullName,
        password,
        role: role as any,
      });
      setIsCreateOpen(false);
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menambahkan pengguna.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await userService.toggleEnabled(id);
      fetchUsers();
    } catch (err) {
      alert('Gagal mengubah status pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kelola Akun & Hak Akses Pengguna</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen akun Administrator, Petugas Presensi Ibadah, dan Village Dean
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
          onClick={() => setIsCreateOpen(true)}
        >
          Tambah Pengguna Baru
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState message="Tidak ada pengguna ditemukan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Lengkap</th>
                  <th className="py-3 px-4 font-semibold">Username</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Hak Akses (Role)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status Akun</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{u.username}</td>
                    <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        u.role === 'VILLAGE_DEAN' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge color={u.enabled ? 'green' : 'gray'}>
                        {u.enabled ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(u.id)}
                        className={u.enabled ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                      >
                        {u.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Pendaftaran Akun Pengguna Baru">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            required
            placeholder="Contoh: Pdt. Dr. John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Username"
              required
              placeholder="username_login"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Email UNKLAB"
              type="email"
              required
              placeholder="user@unklab.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Kata Sandi Awal"
              type="password"
              required
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select
              label="Peran Akun (Role)"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'STAFF', label: 'Petugas Presensi (STAFF)' },
                { value: 'VILLAGE_DEAN', label: 'Village Dean (Pembina)' },
                { value: 'ADMIN', label: 'Administrator Sistem' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
