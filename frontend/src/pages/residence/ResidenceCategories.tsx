import React, { useEffect, useState } from 'react';
import { MapPin, CheckCircle, Info, Edit2 } from 'lucide-react';
import { residenceService } from '../../services';
import type { ResidenceCategory } from '../../types';
import { Button, LoadingState, Modal, Input } from '../../components/ui';

export const ResidenceCategories: React.FC = () => {
  const [categories, setCategories] = useState<ResidenceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ResidenceCategory | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(700);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const res = await residenceService.getAll();
      setCategories(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const handleSave = async () => {
    if (!editingCategory) return;
    try {
      await residenceService.update(editingCategory.id, {
        ...editingCategory,
        maxDistanceMeters: maxDistance,
      });
      setEditingCategory(null);
      fetchCats();
    } catch (err) {
      alert('Gagal memperbarui kategori.');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Kategori Tempat Tinggal Mahasiswa</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pengelompokan Outsider Dekat vs Outsider Jauh sebagai acuan aturan kehadiran peribadatan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {cat.code}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{cat.name}</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Batas Jarak Lingkungan Kampus</span>
                <span className="font-bold text-slate-800">
                  {cat.maxDistanceMeters ? `≤ ${cat.maxDistanceMeters} meter` : 'Di luar batas 700m'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  setEditingCategory(cat);
                  setMaxDistance(cat.maxDistanceMeters || 700);
                }}
              >
                Ubah Batas Jarak
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <p className="font-semibold">Catatan Kebijakan Outsider:</p>
          <p className="mt-0.5 text-emerald-700 leading-relaxed">
            Sesuai regulasi Universitas Klabat, mahasiswa Outsider Dekat tinggal dalam radius 600–700 meter dari kampus dan memiliki kewajiban ibadah penuh (Vesper, Sabat Pagi, Sabat Sore, serta WOP pagi & malam). Sedangkan Outsider Jauh berfokus pada Sabat Pagi dan WOP pagi.
          </p>
        </div>
      </div>

      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} title="Ubah Batas Jarak Kategori" size="sm">
        {editingCategory && (
          <div className="space-y-4">
            <Input
              label="Batas Maksimal Jarak (Meter)"
              type="number"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditingCategory(null)}>Batal</Button>
              <Button onClick={handleSave} className="bg-emerald-700 hover:bg-emerald-800 text-white">Simpan</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
