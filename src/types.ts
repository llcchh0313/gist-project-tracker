export const STAGES = [
  { id: 'planning', label: '기획', description: '사업 방향과 목표 수립' },
  { id: 'preparing', label: '준비·승인', description: '예산, 협의, 세부 실행 계획' },
  { id: 'executing', label: '추진 중', description: '실제 진행 및 문제 해결' },
  { id: 'finished', label: '결과·평가', description: '사업 성과와 개선점 정리' },
] as const;
export type Stage = typeof STAGES[number]['id'];
export const CATEGORIES = ['교내 행사', '대외 행사', '학생 복지', '시설·환경', '제도·정책', '기타'] as const;
export type Category = typeof CATEGORIES[number];
export const STATUSES = [
  { id: 'planned', label: '예정' },
  { id: 'active', label: '진행 중' },
  { id: 'paused', label: '보류' },
  { id: 'done', label: '완료' },
] as const;
export type Status = typeof STATUSES[number]['id'];
export interface Project {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: Category;
  owner: string;
  start_date: string | null;
  end_date: string | null;
  stage: Stage;
  status: Status;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export interface ProjectUpdate {
  id: string;
  project_id: string;
  stage: Stage;
  body: string;
  next_action: string;
  created_at: string;
}
export interface Attachment {
  id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  visible_to_students: boolean;
  created_at: string;
}
export interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  row_id: string;
  actor_id: string | null;
  created_at: string;
}
