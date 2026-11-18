import type { Project, ProjectUpdate } from './types';
const now = new Date().toISOString();
export const DEMO_PROJECTS: Project[] = [
  { id: 'demo-1', title: '스타디움 운영', summary: '행사 준비부터 현장 운영까지, 추진 과정을 공유합니다.', description: '학생 참여를 높이기 위한 행사 운영 사업입니다. 일정·운영 인력·공간 배치·안전 안내와 같은 준비 과정을 투명하게 공유합니다.\n\n※ 이 정보는 사이트 시연을 위한 가상 예시이며 실제 학생회 사업 현황과 무관합니다.', category: '대외 행사', owner: '행사기획팀', start_date: '2026-10-01', end_date: '2026-12-15', stage: 'executing', status: 'active', is_published: true, created_at: now, updated_at: now },
  { id: 'demo-2', title: '루미에르 프로그램', summary: '문화 프로그램의 기획 및 운영 준비 현황입니다.', description: '학교 구성원이 참여할 수 있는 문화 프로그램을 구성하고, 참여 방식과 현장 운영 계획을 수립하는 사업입니다. 실제 진행 상황이 아닌 시연용 데이터입니다.', category: '교내 행사', owner: '문화교류팀', start_date: '2026-11-03', end_date: '2027-01-30', stage: 'preparing', status: 'active', is_published: true, created_at: now, updated_at: now },
  { id: 'demo-3', title: '학생 편의시설 개선', summary: '학생들의 생활환경 개선을 위한 의견을 수렴합니다.', description: '학생 설문을 통해 요구 사항을 수집하고, 개선 우선순위를 정하여 관계 부서와 협의합니다. 실제 진행 상황이 아닌 시연용 데이터입니다.', category: '시설·환경', owner: '복지정책팀', start_date: '2026-09-12', end_date: '2026-11-10', stage: 'finished', status: 'done', is_published: true, created_at: now, updated_at: now },
  { id: 'demo-4', title: '학내 소통 창구 정비', summary: '학생 의견 접수 및 피드백 체계 정비 사업입니다.', description: '학생들이 제안한 의견을 수집하고 답변 결과를 기록할 수 있도록 소통 창구를 정비합니다. 실제 진행 상황이 아닌 시연용 데이터입니다.', category: '제도·정책', owner: '대외협력팀', start_date: '2026-11-10', end_date: '2027-02-01', stage: 'planning', status: 'planned', is_published: true, created_at: now, updated_at: now },
];
export const DEMO_UPDATES: ProjectUpdate[] = [
  { id: 'demo-u1', project_id: 'demo-1', stage: 'planning', body: '사업 목표와 운영 방향을 정리하고 요구사항을 취합했습니다.', next_action: '운영 예산 및 장소 검토', created_at: '2026-10-05T09:00:00Z' },
  { id: 'demo-u2', project_id: 'demo-1', stage: 'preparing', body: '세부 일정과 운영 역할을 조율했습니다.', next_action: '참여 안내 및 최종 검토', created_at: '2026-10-22T09:00:00Z' },
  { id: 'demo-u3', project_id: 'demo-1', stage: 'executing', body: '운영 계획을 바탕으로 현장 진행을 준비하고 있습니다. 변동 사항은 이 기록란에 업데이트합니다.', next_action: '진행 상황 점검', created_at: '2026-11-12T09:00:00Z' },
  { id: 'demo-u4', project_id: 'demo-2', stage: 'preparing', body: '참여 프로그램 구성과 안내 방식을 검토 중입니다.', next_action: '일정 확정', created_at: '2026-11-13T09:00:00Z' },
  { id: 'demo-u5', project_id: 'demo-3', stage: 'finished', body: '시범 운영 결과를 취합하고 개선 방향을 정리했습니다.', next_action: '결과 공유', created_at: '2026-11-10T09:00:00Z' },
];
