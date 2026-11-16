// ============================================================
// StudentInsight – TypeScript Types & Interfaces
// ============================================================

export type Role = 'ADMIN' | 'STAFF' | 'VILLAGE_DEAN' | 'ROLE_ADMIN' | 'ROLE_STAFF' | 'ROLE_VILLAGE_DEAN';
export type ResidenceType = 'OUTSIDER_DEKAT' | 'OUTSIDER_JAUH';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'DROPPED_OUT';
export type EventType = 'FRIDAY_VESPER' | 'SABBATH_MORNING' | 'SABBATH_AFTERNOON' | 'WOP_MORNING' | 'WOP_EVENING' | 'WOP_CULMINATION';
export type EventStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'SICK' | 'PENDING_VERIFICATION';
export type AttendanceMethod = 'QR_SCAN' | 'MANUAL' | 'SYSTEM';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type WelfareStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type WelfareCategory = 'HEALTH' | 'FINANCIAL' | 'ACADEMIC' | 'SOCIAL' | 'OTHER';

// ── Auth ────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  enabled?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

// ── Pagination ───────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ── Residence Category ───────────────────────────────────────
export interface ResidenceCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  maxDistanceMeters: number;
  active: boolean;
}

// ── Emergency Contact ─────────────────────────────────────────
export interface EmergencyContact {
  id: number;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  address?: string;
}

// ── Student ───────────────────────────────────────────────────
export interface Student {
  id: number;
  nim: string;
  fullName: string;
  programStudy: string;
  phoneNumber?: string;
  residenceCategoryId: number;
  residenceCategoryName: string;
  residenceAddress?: string;
  status: StudentStatus;
  qrToken: string;
  totalViolationPoints: number;
  emergencyContacts?: EmergencyContact[];
  createdAt: string;
  updatedAt: string;
}

// ── Worship Event ─────────────────────────────────────────────
export interface WorshipEvent {
  id: number;
  title: string;
  eventType: EventType;
  eventDate: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
  status: EventStatus;
  mandatoryForCategories: string[];
  totalPresent: number;
  totalExpected: number;
  createdAt: string;
}

// ── Attendance Rule ───────────────────────────────────────────
export interface AttendanceRule {
  id: number;
  residenceCategoryId: number;
  residenceCategoryName: string;
  eventType: EventType;
  isMandatory: boolean;
  violationPoints: number;
  description?: string;
}

// ── Attendance ────────────────────────────────────────────────
export interface Attendance {
  id: number;
  studentId: number;
  studentNim: string;
  studentName: string;
  worshipEventId: number;
  worshipEventTitle: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  scannedAt?: string;
  notes?: string;
  verifiedBy?: string;
  residenceCategoryName: string;
}

// ── Violation Point ───────────────────────────────────────────
export interface ViolationPoint {
  id: number;
  studentId: number;
  studentNim: string;
  studentName: string;
  worshipEventId?: number;
  worshipEventTitle?: string;
  points: number;
  reason: string;
  isManualAdjustment: boolean;
  adjustedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface ViolationPointRule {
  id: number;
  residenceCategoryId: number;
  residenceCategoryName: string;
  eventType: EventType;
  pointsPerAbsence: number;
  isDemoData: boolean;
}

// ── ML Prediction ─────────────────────────────────────────────
export interface StudentPrediction {
  studentId: number;
  studentNim: string;
  studentName: string;
  residenceCategoryName?: string;
  residenceCategory?: string;
  riskLevel?: RiskLevel;
  riskCategory?: RiskLevel;
  riskScore?: number;
  probLow?: number;
  probMedium?: number;
  probHigh?: number;
  modelName?: string;
  modelVersion?: string;
  totalAttendances?: number;
  totalAbsences?: number;
  absenceRate?: number;
  totalViolationPoints: number;
  consecutiveAbsences?: number;
  predictionNote?: string;
  predictedAt: string;
}

export interface PredictionSummary {
  totalStudents: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  modelAccuracy?: number;
  lastUpdated: string;
}

// ── Welfare Report ────────────────────────────────────────────
export interface WelfareReport {
  id: number;
  studentId: number;
  studentName: string;
  studentNim: string;
  category: WelfareCategory;
  title: string;
  description: string;
  status: WelfareStatus;
  reportedBy: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
}

// ── Follow-Up Record ─────────────────────────────────────────
export interface FollowUp {
  id: number;
  studentId: number;
  studentName: string;
  studentNim: string;
  notes: string;
  followUpType: string;
  followUpDate: string;
  conductedBy: string;
  outcome?: string;
  nextActionRequired: boolean;
  createdAt: string;
}

// ── User ───────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardOverview {
  totalStudents: number;
  totalOutsiderDekat: number;
  totalOutsiderJauh: number;
  totalEventsThisMonth: number;
  totalPresentToday: number;
  totalAbsentToday: number;
  highRiskStudents: number;
  openWelfareReports: number;
  recentAttendanceRate: number;
  topViolators: { studentName: string; nim: string; points: number }[];
  attendanceTrend: { date: string; present: number; absent: number }[];
  riskDistribution: { level: string; count: number }[];
  eventTypeDistribution: { type: string; count: number }[];
}

// ── API Generic Response ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
