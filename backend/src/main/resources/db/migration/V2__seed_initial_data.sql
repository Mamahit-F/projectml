-- ====================================================================
-- Flyway Database Migration: V2__seed_initial_data.sql
-- Project: StudentInsight
-- Initial Demo & Seed Data (Academic Demonstration)
-- ====================================================================

-- 1. SEED USERS (BCrypt hash for 'password123': $2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG)
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at) VALUES
(1, 'admin', 'admin@unklab.ac.id', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Administrator StudentInsight', 'ROLE_ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'staff', 'staff@unklab.ac.id', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Petugas Presensi Lapangan', 'ROLE_STAFF', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'dean', 'dean@unklab.ac.id', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'Pdt. R. Sumendap (Village Dean)', 'ROLE_VILLAGE_DEAN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER SEQUENCE users_id_seq RESTART WITH 10;

-- 2. SEED RESIDENCE CATEGORIES
INSERT INTO residence_categories (id, code, name, max_distance_meters, description, is_active, created_at, updated_at) VALUES
(1, 'OUTSIDER_DEKAT', 'Outsider Dekat', 700, 'Mahasiswa outsider yang bertempat tinggal di sekitar radius 600 - 700 meter dari kampus.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'OUTSIDER_JAUH', 'Outsider Jauh', NULL, 'Mahasiswa outsider yang bertempat tinggal di luar batas area radius 700 meter dari kampus.', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER SEQUENCE residence_categories_id_seq RESTART WITH 10;

-- 3. SEED ATTENDANCE RULES (DYNAMIC ATTENDANCE OBLIGATIONS)
-- Outsider Dekat: Wajib Jumat Malam, Sabtu Pagi, Sabtu Sore, WOP Pagi & Malam, WOP Puncak
INSERT INTO attendance_rules (residence_category_id, event_type, is_mandatory, point_penalty_weight, notes, is_active, created_at, updated_at) VALUES
(1, 'FRIDAY_VESPER', TRUE, 5, 'Kewajiban Ibadah Vesper Jumat Malam untuk Outsider Dekat', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'SABBATH_MORNING', TRUE, 5, 'Kewajiban Ibadah Sabbath Pagi untuk Outsider Dekat', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'SABBATH_AFTERNOON', TRUE, 5, 'Kewajiban Ibadah Sabbath Sore (AY) untuk Outsider Dekat', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'WOP_MORNING', TRUE, 5, 'Kewajiban Week of Prayer Pagi untuk Outsider Dekat', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'WOP_EVENING', TRUE, 5, 'Kewajiban Week of Prayer Malam untuk Outsider Dekat', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'WOP_CULMINATION', TRUE, 10, 'Kewajiban Ibadah Puncak WOP Sabtu untuk Outsider Dekat (Bobot Tinggi)', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Outsider Jauh: Wajib Ibadah Sabtu Pagi & WOP Pagi (termasuk kegiatan puncak Sabtu Pagi)
INSERT INTO attendance_rules (residence_category_id, event_type, is_mandatory, point_penalty_weight, notes, is_active, created_at, updated_at) VALUES
(2, 'FRIDAY_VESPER', FALSE, 0, 'Opsional bagi Outsider Jauh dengan pertimbangan jarak dan transportasi malam', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'SABBATH_MORNING', TRUE, 5, 'Kewajiban Utama Ibadah Sabbath Pagi untuk Outsider Jauh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'SABBATH_AFTERNOON', FALSE, 0, 'Opsional bagi Outsider Jauh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'WOP_MORNING', TRUE, 5, 'Kewajiban WOP Pagi untuk Outsider Jauh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'WOP_EVENING', FALSE, 0, 'Opsional bagi Outsider Jauh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'WOP_CULMINATION', TRUE, 10, 'Kewajiban Ibadah Puncak WOP Sabtu Pagi untuk Outsider Jauh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. SEED VIOLATION POINT RULES (DEMO CONFIGURATION)
INSERT INTO violation_point_rules (id, violation_type, description, default_points, is_system_demo, created_at, updated_at) VALUES
(1, 'UNEXCUSED_ABSENCE_REGULAR', 'Alpa / Ketidakhadiran tanpa izin pada ibadah rutin wajib', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'UNEXCUSED_ABSENCE_CULMINATION', 'Alpa pada Ibadah Puncak WOP / Upacara Khusus', 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'CONSECUTIVE_ABSENCE_PENALTY', 'Penalti akumulasi 3 kali alpa berturut-turut', 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER SEQUENCE violation_point_rules_id_seq RESTART WITH 10;

-- 5. SEED SAMPLE STUDENTS
INSERT INTO students (id, nim, full_name, study_program, faculty, phone_number, residence_category_id, current_address, status, qr_token, total_violation_points, created_at, updated_at) VALUES
(1, '105022110001', 'Kevin Jonathan Runtu', 'Informatika', 'Fakultas Ilmu Komputer', '081244556677', 1, 'Kost Filadelfia, Jl. Arnold Mononutu No. 12, Airmadidi', 'ACTIVE', 'QR-STU-001-A1B2C3D4', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '105022110002', 'Grace Natalia Wowor', 'Sistem Informasi', 'Fakultas Ilmu Komputer', '081399887766', 1, 'Kost Maranatha, Depan Gerbang Belakang UNKLAB', 'ACTIVE', 'QR-STU-002-E5F6G7H8', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '105012010015', 'Michael Bryan Lengkey', 'Manajemen', 'Fakultas Ekonomi dan Bisnis', '082155667788', 2, 'Perum Griya Indah Blok C/14, Paniki Dua, Manado', 'ACTIVE', 'QR-STU-003-I9J0K1L2', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '105032210044', 'Sarah Jessica Mamahit', 'Keperawatan', 'Fakultas Keperawatan', '085211223344', 1, 'Kost Hermon, Jl. Kampus No. 5, Airmadidi Atas', 'ACTIVE', 'QR-STU-004-M3N4O5P6', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '105022010089', 'David Samuel Mandey', 'Informatika', 'Fakultas Ilmu Komputer', '087811992233', 2, 'Jl. Raya Minahasa Utara Km. 18, Kauditan', 'ACTIVE', 'QR-STU-005-Q7R8S9T0', 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '105012110033', 'Priscilia Angela Pangemanan', 'Akuntansi', 'Fakultas Ekonomi dan Bisnis', '089677889900', 1, 'Kost Sion, Lorong Pioneer Airmadidi', 'ACTIVE', 'QR-STU-006-U1V2W3X4', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER SEQUENCE students_id_seq RESTART WITH 10;

-- 6. SEED EMERGENCY CONTACTS
INSERT INTO emergency_contacts (student_id, contact_name, relationship, phone_number, address, created_at, updated_at) VALUES
(1, 'Herman Runtu', 'Ayah', '0811432001', 'Tomohon Barat, Sulawesi Utara', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Meity Wowor-Kandou', 'Ibu', '0812443002', 'Tondano Selatan, Minahasa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Johan Lengkey', 'Wali / Paman', '0821334003', 'Perumahan Griya Paniki, Manado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Debby Mamahit', 'Ibu', '0852445004', 'Kotamobagu, Sulawesi Utara', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Alexander Mandey', 'Ayah', '0878336005', 'Kauditan Satu, Minahasa Utara', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Vera Pangemanan', 'Ibu', '0896557006', 'Bitung Tengah, Kota Bitung', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. SEED SAMPLE WORSHIP EVENTS
INSERT INTO worship_events (id, title, event_type, event_date, start_time, end_time, location, status, description, created_at, updated_at) VALUES
(1, 'Ibadah Vesper Jumat Malam', 'FRIDAY_VESPER', CURRENT_DATE - INTERVAL '7 days', '18:30:00', '20:00:00', 'Pioneer Chapel UNKLAB', 'COMPLETED', 'Ibadah pembukaan Sabat mingguan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Ibadah Sabbath Pagi', 'SABBATH_MORNING', CURRENT_DATE - INTERVAL '6 days', '09:00:00', '11:30:00', 'Fernandez Hall UNKLAB', 'COMPLETED', 'Kebaktian Khotbah Sabat Pagi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Ibadah Sabbath Sore (AY Service)', 'SABBATH_AFTERNOON', CURRENT_DATE - INTERVAL '6 days', '16:00:00', '17:30:00', 'Pioneer Chapel UNKLAB', 'COMPLETED', 'Kegiatan Adventist Youth dan Sabat Petang', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Ibadah Vesper Jumat Malam Berjalan', 'FRIDAY_VESPER', CURRENT_DATE, '18:30:00', '20:00:00', 'Pioneer Chapel UNKLAB', 'ONGOING', 'Ibadah Vesper Jumat Malam Aktif Hari Ini', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Ibadah Sabbath Pagi Besok', 'SABBATH_MORNING', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '11:30:00', 'Fernandez Hall UNKLAB', 'SCHEDULED', 'Ibadah Sabat Raya', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER SEQUENCE worship_events_id_seq RESTART WITH 10;

-- 8. SEED ATTENDANCES
INSERT INTO attendances (student_id, worship_event_id, status, recorded_method, check_in_time, verified_by_user_id, notes, created_at, updated_at) VALUES
-- Event 1: Friday Vesper (Outsider Dekat wajib, Outsider Jauh tidak wajib)
(1, 1, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '7 days', 2, 'Tepat waktu via scan QR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 1, 'ABSENT', 'MANUAL_INPUT', NULL, 2, 'Tidak hadir tanpa keterangan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 1, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '7 days', 2, 'Tepat waktu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 1, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '7 days', 2, 'Tepat waktu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Event 2: Sabbath Morning (Semua wajib)
(1, 2, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '6 days', 2, 'Hadir di Fernandez Hall', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '6 days', 2, 'Hadir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 2, 'EXCUSED', 'MANUAL_INPUT', NULL, 2, 'Izin sakit dengan surat dokter terlampir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 2, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '6 days', 2, 'Hadir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 2, 'ABSENT', 'MANUAL_INPUT', NULL, 2, 'Tidak hadir tanpa konfirmasi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 2, 'PRESENT', 'QR_SCAN', CURRENT_TIMESTAMP - INTERVAL '6 days', 2, 'Hadir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 9. SEED VIOLATION POINTS
INSERT INTO violation_points (student_id, worship_event_id, points, reason, status, created_at, updated_at) VALUES
(2, 1, 5, 'Alpa pada Ibadah Vesper Jumat Malam', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP),
(5, 2, 5, 'Alpa pada Ibadah Sabbath Pagi', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP);

-- 10. SEED WELFARE REPORTS
INSERT INTO welfare_reports (student_id, report_type, priority, status, description, reported_by_user_id, assigned_to_user_id, created_at, updated_at) VALUES
(5, 'HOUSING', 'HIGH', 'IN_REVIEW', 'Mahasiswa mengeluhkan kendala banjir di sekitar indekos dan minimnya penerangan jalan saat malam hari.', 2, 3, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
(3, 'HEALTH', 'MEDIUM', 'RESOLVED', 'Mahasiswa sempat dirawat karena demam berdarah dan membutuhkan dispensasi peribadatan.', 2, 3, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP);

-- 11. SEED FOLLOW UP RECORDS
INSERT INTO follow_up_records (student_id, conducted_by_user_id, counseling_date, topics_discussed, action_plan, status, evaluation_result, created_at, updated_at) VALUES
(5, 3, CURRENT_DATE - INTERVAL '2 days', 'Evaluasi absensi berulang pada hari Sabat dan kendala transportasi jarak jauh.', 'Mahasiswa setuju untuk berangkat lebih awal bersama rekan komuter dan melapor jika terjadi kendala kendaraan.', 'FOLLOW_UP_NEEDED', 'Mahasiswa menunjukkan sikap kooperatif dan berjanji memperbaiki kehadiran.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
