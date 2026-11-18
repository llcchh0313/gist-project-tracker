import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleAlert, Clock3, Download, ExternalLink, FileText, FolderOpen,
  History, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, MoreHorizontal,
  Paperclip, PauseCircle, Plus, Search, Settings2, ShieldCheck, Sparkles, Trash2,
  Upload, Users, X
} from 'lucide-react';
import { configured, isAllowedEmail, supabase } from './supabase';
import { DEMO_PROJECTS, DEMO_UPDATES } from './demo';
import {
  CATEGORIES, STAGES, STATUSES,
  type Attachment, type AuditLog, type Category, type Project, type ProjectInput,
  type ProjectUpdate, type Stage, type Status
} from './types';

type Toast = { text: string; error?: boolean } | null;
const stageIndex = (s: Stage) => STAGES.findIndex(v => v.id === s);
const stageLabel = (s: Stage) => STAGES.find(v => v.id === s)?.label ?? s;
const statusLabel = (s: Status) => STATUSES.find(v => v.id === s)?.label ?? s;
const date = (s: string | null) => s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '미정';
const inputDate = (s: string | null) => s || '';
const routeFromHash = () => (location.hash || '#/').replace(/^#/, '');
const navigate = (path: string) => { location.hash = path; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const formatBytes = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const defaultInput: ProjectInput = {
  title: '', summary: '', description: '', category: '교내 행사', owner: '',
  start_date: null, end_date: null, stage: 'planning', status: 'planned', is_published: true,
};

function IconMark() {
  return <span className="logo-mark"><span className="mark-dot mark-dot-a"/><span className="mark-dot mark-dot-b"/><span className="mark-dot mark-dot-c"/><span className="mark-dot mark-dot-d"/></span>;
}
function StageBadge({ stage }: { stage: Stage }) { return <span className={`stage-pill stage-${stage}`}>{stageLabel(stage)}</span>; }
function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-pill status-${status}`}>{status === 'done' ? <CheckCircle2 size={13}/> : status === 'paused' ? <PauseCircle size={13}/> : <span className="status-dot"/>}{statusLabel(status)}</span>;
}
function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return <div className="empty"><FolderOpen size={32}/><strong>{title}</strong><p>{body}</p>{children}</div>;
}
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="닫기" onClick={onClose}><X size={20}/></button></div>
      <div className="modal-content">{children}</div>
    </section>
  </div>;
}
function FormField({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return <label className="field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function ProjectEditor({ initial, onSave, onClose }: {
  initial: Project | null;
  onSave: (input: ProjectInput, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectInput>(initial ? {
    title: initial.title, summary: initial.summary, description: initial.description,
    category: initial.category, owner: initial.owner, start_date: initial.start_date,
    end_date: initial.end_date, stage: initial.stage, status: initial.status, is_published: initial.is_published,
  } : defaultInput);
  const [saving, setSaving] = useState(false);
  const put = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm(old => ({ ...old, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ ...form, title: form.title.trim(), summary: form.summary.trim(), description: form.description.trim(), owner: form.owner.trim() }, initial?.id); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="edit-form">
    <div className="fields-grid">
      <FormField label="사업명 *"><input required maxLength={100} value={form.title} onChange={e => put('title', e.target.value)} placeholder="예: 학생 복지 개선 사업"/></FormField>
      <FormField label="분류"><select value={form.category} onChange={e => put('category', e.target.value as Category)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></FormField>
    </div>
    <FormField label="한 줄 소개 *" help="사업 목록 카드에 노출됩니다."><input required maxLength={240} value={form.summary} onChange={e => put('summary', e.target.value)} placeholder="이 사업이 하는 일을 간단히 설명해주세요."/></FormField>
    <FormField label="사업 설명 *" help="사업 목적, 추진 배경, 주요 내용, 기대 효과 등을 자유롭게 작성하세요."><textarea required rows={6} maxLength={10000} value={form.description} onChange={e => put('description', e.target.value)} placeholder="사업의 목표와 세부 설명을 입력하세요."/></FormField>
    <div className="fields-grid">
      <FormField label="담당 부서 / 담당자"><input maxLength={120} value={form.owner} onChange={e => put('owner', e.target.value)} placeholder="예: 복지국"/></FormField>
      <FormField label="진행 단계"><select value={form.stage} onChange={e => put('stage', e.target.value as Stage)}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FormField>
      <FormField label="사업 시작일"><input type="date" value={inputDate(form.start_date)} onChange={e => put('start_date', e.target.value || null)}/></FormField>
      <FormField label="사업 종료 예정일"><input type="date" min={form.start_date || undefined} value={inputDate(form.end_date)} onChange={e => put('end_date', e.target.value || null)}/></FormField>
      <FormField label="진행 상태"><select value={form.status} onChange={e => put('status', e.target.value as Status)}>{STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FormField>
      <div className="field"><span>열람 권한</span><label className="check-line"><input type="checkbox" checked={form.is_published} onChange={e => put('is_published', e.target.checked)}/><span>GIST 구성원에게 공개</span></label><small>해제하면 관리자에게만 표시됩니다.</small></div>
    </div>
    <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>취소</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : initial ? '변경사항 저장' : '사업 등록' } <ArrowRight size={16}/></button></div>
  </form>;
}
function Login({ onSignIn, loading }: { onSignIn: (email: string, token?: string) => Promise<void>; loading: boolean }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    try { await onSignIn(email); setSent(true); } catch { /* A toast is shown by App */ }
  };
  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    try { await onSignIn(email, token); } catch { /* A toast is shown by App */ }
  };
  return <div className="login-wrap"><div className="login-card">
    <div className="login-icon"><ShieldCheck size={25}/></div>
    <div className="eyebrow">GIST COMMUNITY ONLY</div>
    <h1>학교 이메일로<br/>안전하게 접속하세요.</h1>
    <p className="login-desc">GIST 구성원만 사업 현황을 확인할 수 있습니다. 이메일 인증이 완료되면 열람 권한이 부여됩니다.</p>
    <form onSubmit={submitEmail} className="login-form">
      <FormField label="학교 이메일 주소"><input type="email" required value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} placeholder="name@gm.gist.ac.kr"/></FormField>
      <button className="btn btn-primary login-button" disabled={loading || !isAllowedEmail(email)} type="submit">{loading ? '요청 중…' : sent ? '인증 메일 다시 받기' : '인증 메일 보내기'} <Mail size={17}/></button>
    </form>
    {sent && <form onSubmit={submitOtp} className="otp-form"><div className="email-sent"><CheckCircle2 size={17}/> 이메일을 확인하세요. 인증 링크를 누르거나 아래에 6자리 코드를 입력하세요.</div><FormField label="인증 코드"><input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={token} onChange={e => setToken(e.target.value)} placeholder="6자리 코드"/></FormField><button className="btn btn-outline login-button" disabled={loading || token.trim().length < 6} type="submit">코드 확인 <ArrowRight size={16}/></button></form>}
    <p className="login-foot"><LockKeyhole size={14}/> 학교 메일 외 다른 계정은 접근할 수 없습니다.</p>
  </div><div className="login-side"><span className="login-number">01 — 04</span><div><Sparkles size={24}/><h2>학생회의 과정이<br/>모두의 기록이 됩니다.</h2><p>사업의 기획부터 추진, 결과까지<br/>한 곳에서 확인하는 GIST 사업 아카이브.</p></div><span className="login-side-bottom">STUDENT COUNCIL · PROJECT ARCHIVE</span></div></div>;
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(configured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoAdmin, setDemoAdmin] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => [...DEMO_PROJECTS]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>(() => [...DEMO_UPDATES]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<Project | 'new' | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [menuOpen, setMenuOpen] = useState(false);
  const [authWorking, setAuthWorking] = useState(false);
  const admin = configured ? isAdmin : demoAdmin;
  const authorized = !configured || (user !== null && !!user.email_confirmed_at && isAllowedEmail(user.email || ''));
  const projectId = route.startsWith('/projects/') ? route.split('/')[2] : null;
  const selectedProject = projects.find(p => p.id === projectId) ?? null;
  const isAdminPage = route === '/admin';

  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  useEffect(() => { if (toast) { const id = window.setTimeout(() => setToast(null), 4500); return () => clearTimeout(id); } }, [toast]);
  useEffect(() => { const onHash = () => { setRoute(routeFromHash()); setMenuOpen(false); }; window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const check = async () => {
      const { data, error } = await supabase!.auth.getUser();
      if (!alive) return;
      if (error && !error.message.toLowerCase().includes('session')) notify(error.message, true);
      setUser(data.user ?? null);
      setChecking(false);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { window.setTimeout(() => { if (alive) void check(); }, 0); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [notify]);

  const reloadProjects = useCallback(async () => {
    if (!supabase || !authorized) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setProjects((data ?? []) as Project[]);
    } catch (e) { notify('사업 목록을 불러오지 못했습니다: ' + (e as Error).message, true); }
    finally { setLoading(false); }
  }, [authorized, notify]);

  useEffect(() => {
    if (!configured) return;
    if (!authorized || !user || !supabase) { setProjects([]); setUpdates([]); setAttachments([]); setIsAdmin(false); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (alive) setIsAdmin(!error && !!data);
    })();
    void reloadProjects();
    return () => { alive = false; };
  }, [authorized, user?.id, reloadProjects]);

  const reloadDetails = useCallback(async (id: string) => {
    if (!supabase || !authorized) return;
    const [{ data: u, error: ue }, { data: a, error: ae }] = await Promise.all([
      supabase.from('project_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('attachments').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ]);
    if (ue || ae) { notify(`기록을 불러오지 못했습니다: ${(ue || ae)?.message}`, true); return; }
    setUpdates(old => [...old.filter(item => item.project_id !== id), ...((u ?? []) as ProjectUpdate[])]);
    setAttachments(old => [...old.filter(item => item.project_id !== id), ...((a ?? []) as Attachment[])]);
  }, [authorized, notify]);
  useEffect(() => { if (projectId) void reloadDetails(projectId); }, [projectId, reloadDetails]);

  const reloadAudits = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const { data, error } = await supabase.from('audit_logs').select('id,table_name,action,row_id,actor_id,created_at').order('created_at', { ascending: false }).limit(50);
    if (error) { notify('수정 이력을 가져올 수 없습니다: ' + error.message, true); return; }
    setAudits((data ?? []) as AuditLog[]);
  }, [isAdmin, notify]);
  useEffect(() => { if (isAdminPage && isAdmin) void reloadAudits(); }, [isAdminPage, isAdmin, reloadAudits]);

  const login = async (email: string, token?: string) => {
    if (!supabase) return;
    if (!isAllowedEmail(email)) { notify('GIST 학교 이메일만 사용할 수 있습니다.', true); throw Error('잘못된 도메인'); }
    setAuthWorking(true);
    try {
      if (token) {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
        if (error) throw error;
        notify('학교 이메일 인증이 완료되었습니다.');
      } else {
        const redirect = window.location.origin + import.meta.env.BASE_URL;
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
        if (error) throw error;
        notify('인증 이메일을 발송했습니다. 메일함을 확인해주세요.');
      }
    } catch (e) { notify((e as Error).message, true); throw e; }
    finally { setAuthWorking(false); }
  };
  const logout = async () => { if (supabase) { await supabase.auth.signOut(); setUser(null); setProjects([]); setUpdates([]); setAttachments([]); setIsAdmin(false); navigate('/'); } };
  const saveProject = async (input: ProjectInput, id?: string) => {
    if (!admin) throw Error('관리자 권한이 없습니다.');
    try {
      if (supabase) {
        const query = id ? supabase.from('projects').update(input).eq('id', id) : supabase.from('projects').insert(input);
        const { error } = await query;
        if (error) throw error;
        await reloadProjects();
      } else {
        if (id) setProjects(old => old.map(p => p.id === id ? { ...p, ...input, updated_at: new Date().toISOString() } : p));
        else setProjects(old => [{ ...input, id: `demo-${crypto.randomUUID()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...old]);
      }
      setEditor(null); notify(id ? '사업을 수정했습니다.' : '새 사업을 등록했습니다.');
    } catch (e) { notify('저장 실패: ' + (e as Error).message, true); throw e; }
  };
  const deleteProject = async (p: Project) => {
    if (!admin || !confirm(`‘${p.title}’ 사업과 모든 추진 기록을 삭제할까요? 복원할 수 없습니다.`)) return;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('attachments').select('storage_path').eq('project_id', p.id);
        if (error) throw error;
        const paths = (data ?? []).map(f => f.storage_path as string);
        if (paths.length) { const removed = await supabase.storage.from('project-files').remove(paths); if (removed.error) throw removed.error; }
        const del = await supabase.from('projects').delete().eq('id', p.id);
        if (del.error) throw del.error;
        await reloadProjects();
      } else setProjects(old => old.filter(row => row.id !== p.id));
      notify('사업을 삭제했습니다.'); navigate('/admin');
    } catch (e) { notify('삭제 실패: ' + (e as Error).message, true); }
  };
  const addUpdate = async (projectId: string, stage: Stage, body: string, next_action: string) => {
    if (!admin) throw Error('관리자 권한이 없습니다.');
    try {
      if (supabase) {
        const { error } = await supabase.from('project_updates').insert({ project_id: projectId, stage, body: body.trim(), next_action: next_action.trim() });
        if (error) throw error;
        await reloadDetails(projectId);
        await reloadProjects();
      } else setUpdates(old => [{ id: crypto.randomUUID(), project_id: projectId, stage, body: body.trim(), next_action: next_action.trim(), created_at: new Date().toISOString() }, ...old]);
      notify('추진 기록을 등록했습니다.');
    } catch (e) { notify('기록 등록 실패: ' + (e as Error).message, true); throw e; }
  };
  const removeUpdate = async (item: ProjectUpdate) => {
    if (!admin || !confirm('이 추진 기록을 삭제할까요?')) return;
    if (supabase) { const { error } = await supabase.from('project_updates').delete().eq('id', item.id); if (error) { notify(error.message, true); return; } void reloadDetails(item.project_id); }
    else setUpdates(old => old.filter(u => u.id !== item.id));
    notify('기록을 삭제했습니다.');
  };
  const uploadFile = async (projectId: string, file: File, visible: boolean) => {
    if (!supabase || !admin) throw Error('실제 파일 업로드는 Supabase에 연결한 뒤 사용할 수 있습니다.');
    if (file.size > 10 * 1024 * 1024) throw Error('파일은 10MB 이하만 업로드할 수 있습니다.');
    const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_').slice(0, 120);
    const path = `${projectId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('project-files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) throw upErr;
    const { error } = await supabase.from('attachments').insert({ project_id: projectId, filename: file.name, storage_path: path, size_bytes: file.size, mime_type: file.type || 'application/octet-stream', visible_to_students: visible });
    if (error) { await supabase.storage.from('project-files').remove([path]); throw error; }
    await reloadDetails(projectId); notify('파일을 업로드했습니다.');
  };
  const downloadFile = async (attachment: Attachment) => {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from('project-files').createSignedUrl(attachment.storage_path, 60, { download: attachment.filename });
    if (error || !data) { notify(error?.message || '파일 링크 생성 실패', true); return; }
    window.location.href = data.signedUrl;
  };
  const removeFile = async (attachment: Attachment) => {
    if (!supabase || !admin || !confirm(`‘${attachment.filename}’ 파일을 삭제할까요?`)) return;
    const { error } = await supabase.storage.from('project-files').remove([attachment.storage_path]);
    if (error) { notify(error.message, true); return; }
    const result = await supabase.from('attachments').delete().eq('id', attachment.id);
    if (result.error) { notify(result.error.message, true); return; }
    await reloadDetails(attachment.project_id); notify('파일을 삭제했습니다.');
  };
  const filtered = useMemo(() => projects.filter(p =>
    (admin || p.is_published) &&
    (category === '전체' || p.category === category) &&
    (statusFilter === '전체' || p.status === statusFilter) &&
    [p.title, p.summary, p.description, p.owner].join(' ').toLowerCase().includes(search.toLowerCase())
  ), [projects, admin, category, statusFilter, search]);
  const visibleProjects = useMemo(() => projects.filter(p => admin || p.is_published), [projects, admin]);
  const counts = { all: visibleProjects.length, active: visibleProjects.filter(p => p.status === 'active').length, done: visibleProjects.filter(p => p.status === 'done').length, planned: visibleProjects.filter(p => p.status === 'planned').length };

  const showApp = !checking && authorized;
  return <>
    <header className="topbar"><div className="topbar-inner"><button className="brand" onClick={() => navigate('/')} aria-label="GIST 사업 아카이브 홈"><IconMark/><span><strong>GIST 사업 아카이브</strong><small>STUDENT COUNCIL PROJECT TRACKER</small></span></button>
      <nav className={`topnav ${menuOpen ? 'nav-open' : ''}`} aria-label="주 메뉴"><button className={route === '/' ? 'nav-active' : ''} onClick={() => navigate('/')}><LayoutDashboard size={16}/> 사업 현황</button>{admin && <button className={isAdminPage ? 'nav-active' : ''} onClick={() => navigate('/admin')}><Settings2 size={16}/> 관리자</button>}</nav>
      <div className="header-right">{!configured && <span className="demo-tag">DEMO</span>}{configured && user && <span className="user-email">{user.email}</span>}{configured && user && <button className="btn btn-header" onClick={() => void logout()}><LogOut size={16}/> 로그아웃</button>}{!configured && <button className="btn btn-header" onClick={() => setDemoAdmin(v => !v)}>{demoAdmin ? <><Users size={15}/> 학생 보기</> : <><ShieldCheck size={15}/> 관리자 체험</>}</button>}<button className="menu-button" aria-label="메뉴" onClick={() => setMenuOpen(v => !v)}><Menu size={22}/></button></div>
    </div></header>
    {!configured && <div className="demo-banner"><Sparkles size={16}/> <span>현재 <strong>체험 모드</strong>입니다. 예시 사업은 실제 GIST 학생회 현황이 아닙니다. Supabase 연결 후 실제 학교 이메일 인증이 적용됩니다.</span></div>}
    {checking ? <div className="loading-screen"><div className="spinner"/> 사용자 확인 중…</div> : !showApp ? <Login onSignIn={login} loading={authWorking}/> : <>
      {isAdminPage ? admin ? <AdminDashboard projects={projects} audits={audits} onCreate={() => setEditor('new')} onEdit={setEditor} onDelete={deleteProject}/> : <div className="page-wrap"><Empty title="관리자 전용 페이지" body="사업 정보 편집은 승인된 학생회장 계정만 사용할 수 있습니다."/></div>
      : projectId ? selectedProject ? <ProjectDetails key={projectId} project={selectedProject} updates={updates.filter(u => u.project_id === projectId)} attachments={attachments.filter(a => a.project_id === projectId)} admin={admin} configured={configured} onEdit={() => setEditor(selectedProject)} onUpdate={addUpdate} onRemoveUpdate={removeUpdate} onUpload={uploadFile} onDownload={downloadFile} onRemoveFile={removeFile}/> : <div className="page-wrap"><Empty title={loading ? '사업 정보를 불러오는 중' : '사업을 찾을 수 없습니다'} body="존재하지 않거나 열람 권한이 없는 사업입니다."><button className="btn btn-outline" onClick={() => navigate('/')}>목록으로 가기</button></Empty></div>
      : <main><div className="hero"><div className="hero-inner"><div className="hero-content"><span className="hero-kicker"><span className="hero-kicker-dot"/> GIST STUDENT COUNCIL</span><h1>학생회의 모든 사업,<br/><em>과정부터 결과까지.</em></h1><p>무엇을 계획하고, 어디까지 진행했는지.<br/>GIST 학생회를 더 투명하게 연결하는 사업 아카이브입니다.</p><div className="hero-cta"><button className="btn btn-white" onClick={() => document.getElementById('project-list')?.scrollIntoView({ behavior: 'smooth' })}>사업 둘러보기 <ArrowRight size={17}/></button><span><CheckCircle2 size={16}/> GIST 인증 사용자 전용</span></div></div><div className="hero-art" aria-hidden="true"><div className="hero-art-glow"/><div className="hero-floating"><div className="floating-overline"><Activity size={15}/> PROJECT PROGRESS <MoreHorizontal size={20}/></div><div className="floating-heading">사업 추진 현황</div><div className="floating-track"><span/><span/><span/><span/></div><div className="floating-meta"><span>기획 · 준비 · 추진 · 결과</span><b>04 STAGES</b></div></div><div className="hero-ring hero-ring-a"/><div className="hero-ring hero-ring-b"/></div></div></div>
      <div className="page-wrap"><div className="stats-row"><Stat icon={<FolderOpen size={20}/>} number={counts.all} label="전체 사업"/><Stat icon={<Activity size={20}/>} number={counts.active} label="진행 중"/><Stat icon={<CheckCircle2 size={20}/>} number={counts.done} label="완료"/><Stat icon={<Clock3 size={20}/>} number={counts.planned} label="진행 예정"/></div>
      <section id="project-list" className="section"><div className="section-heading"><div><span className="eyebrow blue">PROJECT DIRECTORY</span><h2>사업 현황 살펴보기</h2><p>학생회가 추진하는 다양한 사업과 진행 상황을 확인하세요.</p></div>{admin && <button className="btn btn-primary" onClick={() => setEditor('new')}><Plus size={18}/> 사업 등록</button>}</div>
      <div className="filters"><div className="search-field"><Search size={19}/><input aria-label="사업 검색" placeholder="사업명, 담당 부서, 설명으로 검색" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="검색 지우기"><X size={16}/></button>}</div><select aria-label="사업 분류" value={category} onChange={e => setCategory(e.target.value)}><option>전체</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><select aria-label="진행 상태" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="전체">전체 상태</option>{STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      <div className="result-line">총 <strong>{filtered.length}</strong>개의 사업</div>
      {filtered.length ? <div className="project-grid">{filtered.map(p => <ProjectCard key={p.id} project={p} admin={admin} onClick={() => navigate(`/projects/${p.id}`)}/>)}</div> : <Empty title="일치하는 사업이 없습니다" body="검색어나 필터를 변경해보세요."/>}
      </section>
      <section className="info-strip"><div className="info-icon"><BookOpen size={22}/></div><div><h3>사업 진행 단계는 어떻게 표시되나요?</h3><p>모든 사업은 기획 → 준비·승인 → 추진 중 → 결과·평가의 4단계로 관리됩니다. 사업 상세 화면에서는 각 단계의 추진 기록도 볼 수 있습니다.</p></div><span>4-STEP PROCESS</span></section>
      </div></main>}
    </>}
    <footer className="footer"><div className="footer-inner"><div><IconMark/><strong>GIST 사업 아카이브</strong></div><span>학생회 사업 추진 현황 관리 · {configured ? '학교 구성원 인증' : '체험용 가상 데이터'}</span><span>© {new Date().getFullYear()} Project Archive</span></div></footer>
    {editor && <Modal title={editor === 'new' ? '새 사업 등록' : '사업 정보 수정'} onClose={() => setEditor(null)} wide><ProjectEditor initial={editor === 'new' ? null : editor} onSave={saveProject} onClose={() => setEditor(null)}/></Modal>}
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status">{toast.error ? <CircleAlert size={18}/> : <CheckCircle2 size={18}/>}<span>{toast.text}</span><button onClick={() => setToast(null)} aria-label="닫기"><X size={16}/></button></div>}
  </>;
}

function Stat({ icon, number, label }: { icon: ReactNode; number: number; label: string }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><div><strong>{number.toString().padStart(2, '0')}</strong><span>{label}</span></div></div>;
}
function ProjectCard({ project: p, admin, onClick }: { project: Project; admin: boolean; onClick: () => void }) {
  const idx = stageIndex(p.stage);
  return <button className="project-card" onClick={onClick}><div className="card-top"><span className="category-label"><span className="tiny-square"/>{p.category}</span><StatusBadge status={p.status}/></div><div className="card-body"><h3>{p.title}</h3><p>{p.summary}</p>{admin && !p.is_published && <span className="private-tag"><LockKeyhole size={12}/> 미공개</span>}</div><div className="card-progress"><div className="progress-header"><span>진행 단계</span><StageBadge stage={p.stage}/></div><div className="step-bars">{STAGES.map((stage, i) => <span key={stage.id} className={i <= idx ? 'step-on' : ''}/>)}</div></div><div className="card-bottom"><span><CalendarDays size={15}/> {date(p.updated_at)} 업데이트</span><span className="card-go"><ArrowRight size={19}/></span></div></button>;
}
function DetailTimeline({ stage, status }: { stage: Stage; status: Status }) {
  const idx = stageIndex(stage);
  return <div className="detail-timeline">{STAGES.map((s, i) => <div className={`timeline-step ${i < idx ? 'step-done' : ''} ${i === idx ? 'step-current' : ''}`} key={s.id}><div className="step-node">{i < idx || (status === 'done' && i === idx) ? <Check size={17}/> : String(i + 1).padStart(2, '0')}</div><div><strong>{s.label}</strong><span>{s.description}</span>{i === idx && <em>{status === 'done' ? '완료됨' : status === 'paused' ? '현재 보류' : '현재 단계'}</em>}</div></div>)}</div>;
}
function ProjectDetails({ project: p, updates, attachments, admin, configured: live, onEdit, onUpdate, onRemoveUpdate, onUpload, onDownload, onRemoveFile }: {
  project: Project; updates: ProjectUpdate[]; attachments: Attachment[]; admin: boolean; configured: boolean; onEdit: () => void;
  onUpdate: (id: string, stage: Stage, body: string, next: string) => Promise<void>;
  onRemoveUpdate: (item: ProjectUpdate) => void; onUpload: (id: string, file: File, visible: boolean) => Promise<void>;
  onDownload: (item: Attachment) => void; onRemoveFile: (item: Attachment) => void;
}) {
  const [note, setNote] = useState(''); const [next, setNext] = useState(''); const [noteStage, setNoteStage] = useState<Stage>(p.stage);
  const [sending, setSending] = useState(false); const [file, setFile] = useState<File | null>(null);
  const [fileVisible, setFileVisible] = useState(true); const [uploading, setUploading] = useState(false);
  const sorted = [...updates].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const addNote = async (e: FormEvent) => { e.preventDefault(); if (!note.trim()) return; setSending(true); try { await onUpdate(p.id, noteStage, note, next); setNote(''); setNext(''); } catch { /* error toast in App */ } finally { setSending(false); } };
  const sendFile = async (e: FormEvent) => { e.preventDefault(); if (!file) return; setUploading(true); try { await onUpload(p.id, file, fileVisible); setFile(null); const input = document.getElementById('document-upload') as HTMLInputElement | null; if (input) input.value = ''; } catch (err) { alert((err as Error).message); } finally { setUploading(false); } };
  return <main className="detail-page page-wrap"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={16}/> 전체 사업</button>
    <div className="detail-heading"><div><span className="eyebrow blue">PROJECT OVERVIEW <span className="middot">·</span> {p.category}</span><div className="detail-title-line"><h1>{p.title}</h1><StatusBadge status={p.status}/></div><p>{p.summary}</p></div>{admin && <button className="btn btn-outline" onClick={onEdit}><Settings2 size={17}/> 사업 정보 수정</button>}</div>
    <div className="detail-layout"><div className="detail-main"><section className="content-panel"><div className="panel-heading"><div><span className="panel-eyebrow">01 / ABOUT</span><h2>사업 소개</h2></div><FileText size={22}/></div><div className="description">{p.description || '등록된 설명이 없습니다.'}</div><div className="project-meta"><div><span>담당 부서</span><strong>{p.owner || '미지정'}</strong></div><div><span>시작일</span><strong>{date(p.start_date)}</strong></div><div><span>종료 예정일</span><strong>{date(p.end_date)}</strong></div></div></section>
    <section className="content-panel"><div className="panel-heading"><div><span className="panel-eyebrow">02 / ACTIVITY LOG</span><h2>추진 기록 <span className="count-mini">{sorted.length}</span></h2></div><History size={22}/></div><p className="panel-hint">새로운 진행 사항이 생길 때마다 날짜별로 기록됩니다. 최신 기록이 먼저 표시됩니다.</p>
      {sorted.length ? <div className="activity-list">{sorted.map(u => <article className="activity-item" key={u.id}><span className="activity-point"/><div className="activity-card"><div className="activity-head"><div><StageBadge stage={u.stage}/><time>{date(u.created_at)}</time></div>{admin && <button className="item-delete" onClick={() => onRemoveUpdate(u)} aria-label="기록 삭제"><Trash2 size={15}/></button>}</div><p>{u.body}</p>{u.next_action && <div className="next-action"><ArrowRight size={14}/><span><strong>다음 작업</strong> · {u.next_action}</span></div>}</div></article>)}</div> : <Empty title="등록된 추진 기록이 없습니다" body="사업 담당자가 추진 과정을 등록하면 이곳에 표시됩니다."/>}
      {admin && <form className="update-form" onSubmit={addNote}><h3><Plus size={17}/> 새로운 추진 기록 추가</h3><FormField label="기록할 단계"><select value={noteStage} onChange={e => setNoteStage(e.target.value as Stage)}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></FormField><FormField label="상세 내용 *"><textarea rows={4} required value={note} onChange={e => setNote(e.target.value)} maxLength={10000} placeholder="오늘 진행된 작업, 협의 내용, 결정 사항, 지연 사유 등을 기록하세요."/></FormField><FormField label="다음 작업 (선택)"><input value={next} maxLength={500} onChange={e => setNext(e.target.value)} placeholder="예: 다음 회의에서 계획 확정"/></FormField><button className="btn btn-primary" type="submit" disabled={sending || !note.trim()}>{sending ? '등록 중…' : '기록 등록'} <Plus size={16}/></button></form>}
    </section>
    <section className="content-panel"><div className="panel-heading"><div><span className="panel-eyebrow">03 / DOCUMENTS</span><h2>관련 문서 <span className="count-mini">{attachments.length}</span></h2></div><Paperclip size={22}/></div><p className="panel-hint">공개 허용된 사업 문서만 열람할 수 있습니다. 모든 파일은 비공개 저장소에 보관됩니다.</p>{attachments.length ? <div className="attachments">{attachments.map(a => <div className="attachment" key={a.id}><span className="attachment-icon"><FileText size={18}/></span><div><strong title={a.filename}>{a.filename}</strong><span>{formatBytes(a.size_bytes)} · {date(a.created_at)} {admin && !a.visible_to_students && '· 관리자 전용'}</span></div><button aria-label="파일 내려받기" onClick={() => onDownload(a)}><Download size={18}/></button>{admin && <button aria-label="파일 삭제" onClick={() => onRemoveFile(a)}><Trash2 size={17}/></button>}</div>)}</div> : <Empty title="등록된 문서가 없습니다" body="관리자가 공개한 자료가 이곳에 표시됩니다."/>}
      {admin && <form className="upload-form" onSubmit={sendFile}><h3><Upload size={18}/> 첨부파일 등록</h3><input id="document-upload" type="file" accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.hwp,.hwpx" onChange={e => setFile(e.target.files?.[0] || null)} disabled={!live}/><label className="check-line"><input type="checkbox" checked={fileVisible} onChange={e => setFileVisible(e.target.checked)}/><span>일반 학생에게 공개</span></label><p className="form-help">1개 파일 최대 10MB. 비공개 문서는 학생 계정에서 다운로드할 수 없습니다. {live ? '' : '(체험 모드에서는 업로드 불가)'}</p><button className="btn btn-outline" disabled={!live || !file || uploading} type="submit">{uploading ? '업로드 중…' : '파일 업로드'} <Upload size={15}/></button></form>}
    </section></div><aside className="detail-aside"><div className="side-panel"><span className="panel-eyebrow">PROJECT PROCESS</span><h3>추진 진행도</h3><DetailTimeline stage={p.stage} status={p.status}/><div className="side-status"><span>현재 진행 단계</span><StageBadge stage={p.stage}/></div></div><div className="side-hint"><ShieldCheck size={20}/><div><strong>투명하게 기록되는 사업</strong><p>사업 진행 내용은 시간순으로 보관되며, 학생회장 계정만 변경할 수 있습니다.</p></div></div></aside></div>
  </main>;
}
function AdminDashboard({ projects, audits, onCreate, onEdit, onDelete }: {
  projects: Project[]; audits: AuditLog[]; onCreate: () => void; onEdit: (p: Project) => void; onDelete: (p: Project) => void;
}) {
  return <main className="page-wrap admin-page"><div className="admin-heading"><div><span className="eyebrow blue">ADMIN WORKSPACE</span><h1>사업 운영 대시보드</h1><p>사업 등록, 단계 관리, 추진 기록 및 문서 관리를 진행하세요.</p></div><button className="btn btn-primary" onClick={onCreate}><Plus size={17}/> 새 사업 등록</button></div><div className="admin-tips"><ShieldCheck size={21}/><div><strong>학생회장 관리자 계정</strong><span>이 화면과 데이터 변경 권한은 승인된 관리자만 사용할 수 있습니다. 변경사항은 수정 이력에 기록됩니다.</span></div></div>
    <section className="admin-table-wrap"><h2>전체 사업 <span className="count-mini">{projects.length}</span></h2>{projects.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>사업명</th><th>분류</th><th>진행 단계</th><th>상태</th><th>공개</th><th>관리</th></tr></thead><tbody>{projects.map(p => <tr key={p.id}><td><button className="table-link" onClick={() => navigate(`/projects/${p.id}`)}>{p.title} <ExternalLink size={13}/></button></td><td>{p.category}</td><td><StageBadge stage={p.stage}/></td><td><StatusBadge status={p.status}/></td><td>{p.is_published ? <span className="published">공개</span> : <span className="not-published">비공개</span>}</td><td><div className="table-actions"><button onClick={() => onEdit(p)} aria-label={`${p.title} 수정`}><Settings2 size={17}/></button><button onClick={() => onDelete(p)} aria-label={`${p.title} 삭제`}><Trash2 size={16}/></button><button onClick={() => navigate(`/projects/${p.id}`)} aria-label={`${p.title} 상세`}><ChevronRight size={18}/></button></div></td></tr>)}</tbody></table></div> : <Empty title="사업이 없습니다" body="첫 번째 사업을 등록해보세요."/>}</section>
    <section className="admin-table-wrap audit-box"><h2>최근 수정 이력 <span className="count-mini">{audits.length}</span></h2><p>운영 중 변경된 사업 정보·기록·문서 이력을 조회합니다.</p>{audits.length ? <div className="audit-list">{audits.slice(0, 20).map(a => <div className="audit-item" key={a.id}><span className="audit-dot"/><span>{({projects:'사업 정보',project_updates:'추진 기록',attachments:'문서 정보'} as Record<string,string>)[a.table_name] || a.table_name} · {({INSERT:'추가',UPDATE:'수정',DELETE:'삭제'} as Record<string,string>)[a.action] || a.action}</span><time>{date(a.created_at)}</time></div>)}</div> : <p className="audit-empty">{!configured ? '체험 모드에서는 서버 수정 이력을 제공하지 않습니다.' : '표시할 수정 이력이 없습니다.'}</p>}</section>
  </main>;
}
