import { apiFetch } from './client';
import type { Report, ReportStatus, ReportTargetType } from '../types';

export function createReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  subTargetId?: string;
  reason: string;
}): Promise<void> {
  return apiFetch<void>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listReports(status: ReportStatus = 'pending'): Promise<Report[]> {
  return apiFetch<Report[]>(`/api/reports?status=${status}`);
}

export function updateReportStatus(id: string, status: 'resolved' | 'dismissed'): Promise<Report> {
  return apiFetch<Report>(`/api/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function removeReportedContent(id: string): Promise<Report> {
  return apiFetch<Report>(`/api/reports/${id}/remove-content`, {
    method: 'POST',
  });
}
