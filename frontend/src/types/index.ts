export type Role = 'USER';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ResidenceCategory {
  id: number;
  code: string;
  name: string;
  maxDistanceMeters?: number;
  description?: string;
  active: boolean;
}

export interface EmergencyContact {
  id: number;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  address?: string;
  studentId?: number;
  studentNim?: string;
  studentName?: string;
  studyProgram?: string;
  latestSabbathPoints?: number;
  riskCategory?: string;
  currentAddress?: string;
}

export interface Student {
  id: number;
  nim: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  studyProgram: string;
  faculty: string;
  phoneNumber?: string;
  residenceCategory?: ResidenceCategory | null;
  currentAddress?: string;
  status: string;
  totalViolationPoints: number;
  latestSabbathPoints: number;
  previousSabbathPoints?: number | null;
  pointsDelta: number;
  riskCategory: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
  projectedEndPoints?: number | null;
  emergencyContacts?: EmergencyContact[];
  createdAt?: string;
}

export interface StudentPointHistoryItem {
  id: number;
  pdfReportId: number;
  fileName: string;
  reportDate: string;
  periodLabel: string;
  sabbathPoints: number;
  pointsDelta: number;
  riskCategory: string;
  projectedEndPoints?: number;
  percentileRank?: number;
}

export interface PdfReportSummary {
  id: number;
  fileName: string;
  facultyName: string;
  reportDate: string;
  periodLabel: string;
  totalStudents: number;
  zeroPointStudents: number;
  studentsWithPoints: number;
  maxPoints: number;
  avgPoints: number;
  notes?: string;
  createdAt: string;
}

export interface PdfPreviewRecord {
  row_number: number;
  nim: string;
  last_name: string;
  first_name: string;
  full_name: string;
  study_program: string;
  sabbath_points: number;
}

export interface PdfPreviewResponse {
  file_name: string;
  detected_faculty: string;
  total_pages: number;
  total_rows: number;
  zero_point_count: number;
  with_point_count: number;
  max_points: number;
  avg_points: number;
  median_points: number;
  prodi_summary: Array<{
    study_program: string;
    total_students: number;
    zero_point_students: number;
    students_with_points: number;
    avg_points: number;
    max_points: number;
  }>;
  warnings: string[];
  records: PdfPreviewRecord[];
}

export interface SemesterSetting {
  id?: number;
  semesterName: string;
  semesterStartDate: string;
  attendanceCutoffDate: string;
  semesterEndDate: string;
  finalPointLimit?: number | null;
  attendanceClosed: boolean;
  daysRemainingUntilCutoff?: number;
  semesterProgressPercent?: number;
  updatedAt?: string;
}

export interface PredictionSummary {
  totalPredicted: number;
  safeCount: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  safePercentage: number;
  lowRiskPercentage: number;
  mediumRiskPercentage: number;
  highRiskPercentage: number;
  exceedsFinalLimitCount: number;
  analysisMode: string;
  modelName: string;
  latestReportDate?: string | null;
  attendanceCutoffDate?: string | null;
  finalPointLimit?: number | null;
  attendanceClosed: boolean;
  clusterRanges: Record<string, { min: number; max: number }>;
}

export interface StudentPrediction {
  id: number;
  studentId: number;
  studentNim: string;
  studentName: string;
  studyProgram: string;
  faculty?: string;
  residenceCategory?: string | null;
  currentPoints: number;
  pointsDelta: number;
  projectedEndPoints?: number | null;
  percentileRank: number;
  riskCategory: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | string;
  probLow: number;
  probMedium: number;
  probHigh: number;
  modelName: string;
  modelVersion: string;
  analysisMode: string;
  exceedsFinalLimit: boolean;
  hasEmergencyContact: boolean;
  predictedAt: string;
}

export interface WelfareReport {
  id: number;
  studentId: number;
  studentNim: string;
  studentName: string;
  reportType: string;
  priority: string;
  status: string;
  description: string;
  reportedByName?: string;
  assignedToName?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface FollowUp {
  id: number;
  studentId: number;
  studentNim: string;
  studentName: string;
  conductedByUserName?: string;
  counselingDate: string;
  topicsDiscussed: string;
  actionPlan: string;
  status: string;
  evaluationResult?: string;
  createdAt: string;
}

export interface DashboardOverview {
  totalStudents: number;
  zeroPointStudents: number;
  studentsWithPoints: number;
  maxPoints: number;
  avgPoints: number;
  medianPoints: number;
  totalPdfReports: number;
  openWelfareReports: number;
  activeFollowUps: number;
  emergencyContactsCount: number;
  latestPdfReport?: PdfReportSummary | null;
  semesterSetting?: SemesterSetting | null;
  predictionSummary?: PredictionSummary | null;
  prodiBreakdown: Array<{
    studyProgram: string;
    totalStudents: number;
    zeroPointStudents: number;
    studentsWithPoints: number;
    highRiskCount: number;
    avgPoints: number;
    maxPoints: number;
  }>;
  pointDistribution: Record<string, number>;
  snapshotTrend: Array<{
    reportId: number;
    reportDate: string;
    periodLabel: string;
    totalStudents: number;
    studentsWithPoints: number;
    avgPoints: number;
    maxPoints: number;
  }>;
  priorityStudents: Student[];
  recentActivities: Array<{
    id: string;
    type: 'WELFARE' | 'FOLLOW_UP';
    studentId: number;
    studentName: string;
    subtitle: string;
    status: string;
    createdAt: string;
  }>;
}
