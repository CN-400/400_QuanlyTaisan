export type RequestStatus = 'Đề xuất' | 'Đang xử lý' | 'Từ chối' | 'Hoàn thành xử lý';

export type UrgencyLevel = 'Thấp' | 'Trung Bình' | 'Cao' | 'Rất Cao';

export type UserRole = 'ADMIN' | 'MANAGER' | 'PROCESSOR';

export interface UserAccount {
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canPrint?: boolean;
  createdAt?: string;
  lastLogin?: string;
  passwordChangedAt?: string;
}

export interface UserSession {
  token: string;
  username: string;
  role: UserRole;
  fullName: string;
  mustChangePassword?: boolean;
  expiresAt?: string;
}

export interface SystemLogEntry {
  timestamp: string;
  username: string;
  action: string;
  requestId?: string;
  result: string;
  detail?: string;
}

export interface RepairRequest {
  id: string; // Auto format: SC-YYYY-0001
  fullName: string; // Họ và tên
  department: string; // Phòng ban
  assetName: string; // Tên tài sản
  condition: string; // Tình trạng hỏng hóc
  reportDate: string; // Ngày báo hỏng (YYYY-MM-DD)
  proposal: string; // Đề xuất xử lý/sửa chữa
  urgency: UrgencyLevel; // Mức độ khẩn cấp
  status: RequestStatus; // Trạng thái
  handler?: string; // Họ tên cán bộ xử lý
  completionDate?: string; // Ngày hoàn thành
  note?: string; // Ghi chú
  createdAt: string; // ISO string timestamp
}

export interface ProcurementRequest {
  id: string; // Auto format: MS-YYYY-0001
  fullName: string; // Họ và tên
  department: string; // Phòng ban
  equipmentName: string; // Tên thiết bị (Dropdown)
  quantity: number; // Số lượng
  category: string; // Chủng loại / Quy cách
  reason: string; // Lý do đề xuất
  description: string; // Mô tả yêu cầu kỹ thuật
  requestDate: string; // Ngày đề nghị (YYYY-MM-DD)
  proposedDate: string; // Đề xuất thời gian mua
  handler?: string; // Cán bộ xử lý
  status: RequestStatus; // Trạng thái
  completionDate?: string; // Ngày hoàn thành
  note?: string; // Ghi chú
  createdAt: string; // ISO string timestamp
}

export type ActiveTab = 'home' | 'repair' | 'procurement' | 'admin' | 'guide';

export interface AppSettings {
  webAppUrl: string;
  autoSync: boolean;
  bankBranchName: string;
  managerEmail?: string;
  adminPassword?: string;
  token?: string;
  currentUser?: UserAccount;
}

