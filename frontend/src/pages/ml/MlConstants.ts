export const CONTINUITY_META: Record<
  string,
  { label: string; short: string; color: 'green' | 'blue' | 'amber' | 'coral' | 'slate' | 'red' | 'dark'; chartColor: string }
> = {
  CONTINUOUSLY_OBSERVED: {
    label: 'Terobservasi Berkelanjutan',
    short: 'Berkelanjutan',
    color: 'green',
    chartColor: '#10B981',
  },
  TEMPORARY_GAP_RETURNED: {
    label: 'Jeda Sementara & Kembali',
    short: 'Jeda & Kembali',
    color: 'blue',
    chartColor: '#0EA5E9',
  },
  NEWLY_OBSERVED: {
    label: 'Baru Terobservasi',
    short: 'Baru Muncul',
    color: 'dark',
    chartColor: '#161618',
  },
  INTERMITTENT_OBSERVATION: {
    label: 'Observasi Intermiten',
    short: 'Intermiten',
    color: 'amber',
    chartColor: '#F59E0B',
  },
  INACTIVE_OR_GRADUATED_UNCONFIRMED: {
    label: 'Tidak Muncul / Lulus (Belum Terkonfirmasi)',
    short: 'Hilang (Unconfirmed)',
    color: 'slate',
    chartColor: '#64748B',
  },
  INSUFFICIENT_HISTORY: {
    label: 'Riwayat Tidak Memadai',
    short: 'Riwayat Minim',
    color: 'amber',
    chartColor: '#D97706',
  },
  IDENTITY_UNCERTAIN: {
    label: 'Identitas Belum Pasti (Review)',
    short: 'Identitas Ambigu',
    color: 'red',
    chartColor: '#EF4444',
  },
};

export const CLUSTER_COLORS = [
  '#10B981', // emerald
  '#0EA5E9', // sky
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#F55B2A', // coral
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#161618', // obsidian
];

export const FEATURE_LABELS: Record<string, string> = {
  current_points: 'Poin Periode Saat Ini',
  current_period_percentile: 'Persentil dalam Periode T',
  current_points_to_period_mean: 'Rasio Poin / Rata-rata Periode T',
  current_is_zero: 'Status 0 Poin di Periode T',
  prev_points: 'Poin Periode Observasi Sebelumnya',
  has_prev_observation: 'Memiliki Observasi Sebelumnya',
  last_point_change: 'Selisih Poin Terakhir',
  historical_mean_points: 'Rata-rata Poin Historis (<= T)',
  historical_max_points: 'Maksimum Poin Historis (<= T)',
  historical_min_points: 'Minimum Poin Historis (<= T)',
  historical_std_points: 'Standar Deviasi Poin Historis',
  historical_mean_percentile: 'Rata-rata Persentil Historis',
  historical_max_percentile: 'Maksimum Persentil Historis',
  historical_percentile_trend: 'Tren Kemiringan Persentil',
  observed_periods_so_far: 'Jumlah Periode Terobservasi',
  missing_periods_so_far: 'Jumlah Periode Tidak Terobservasi',
  freq_positive_periods_so_far: 'Frekuensi Periode Berpoin (>0)',
  freq_high_point_periods_so_far: 'Frekuensi Periode Poin Tinggi (>=Q75)',
  freq_point_increases_so_far: 'Frekuensi Kenaikan Poin',
  current_period_position_in_semester: 'Posisi Snapshot dalam Semester',
  is_same_semester_transition: 'Transisi dalam Semester Sama',
  days_to_next_period: 'Jarak Hari ke Periode Berikutnya',
};

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
