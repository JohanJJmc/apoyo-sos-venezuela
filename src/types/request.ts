export type RequestStatus = "pending" | "resolved";

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface SupportReport {
  id: string;
  requestId: string;
  supporterId: string;
  supporterName?: string;
  supporterPhone?: string;
  details?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  anonymous?: boolean;
  status: "pending_confirmation" | "confirmed" | "rejected" | "partial";
  createdAt: string;
}

export interface Request {
  id: string;
  category: string;
  item: string;
  quantity: number;
  description?: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  status: RequestStatus;
  partialSupport: boolean;
  createdAt: string;
  createdBy: string;
  requesterName?: string;
  requesterPhone?: string;
  requesterAnonymous?: boolean;
  address?: string;
  comments: Comment[];
  supportReports: SupportReport[];
}

export interface Filters {
  showPending: boolean;
  showResolved: boolean;
  category: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
