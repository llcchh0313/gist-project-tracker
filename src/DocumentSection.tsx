import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Download, FileText, FolderOpen, LockKeyhole, Paperclip, Pencil, Trash2, Upload, X } from 'lucide-react';
import { STAGES, type Attachment, type Stage } from './types';

export const ALLOWED_EXTENSIONS = new Set(['pdf','txt','doc','docx','xls','xlsx','ppt','pptx','hwp','hwpx','png','jpg','jpeg']);
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const stageName = (id: Stage) => STAGES.find(stage => stage.id === id)?.label || id;
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ko-KR');
const formatSize = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
export function validateDocument(file: File): void {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`지원하지 않는 파일 형식입니다: ${file.name}`);
  if (!file.size) throw new Error('내용이 없는 파일은 등록할 수 없습니다.');
  if (file.size > MAX_DOCUMENT_SIZE) throw new Error(`10MB를 초과하는 문서는 등록할 수 없습니다: ${file.name}`);
  if (file.name.length > 250) throw new Error('파일 이름은 250자 이하여야 합니다.');
}
interface Props {
  projectId: string;
  currentStage: Stage;
  attachments: Attachment[];
  admin: boolean;
  preview: boolean;
  onUpload: (id: string, file: File, visible: boolean, stage: Stage, description: string) => Promise<void>;
  onEdit: (item: Attachment, stage: Stage, description: string, visible: boolean) => Promise<void>;
  onDownload: (item: Attachment) => Promise<void>;
  onRemoveFile: (item: Attachment) => Promise<void>;
}
export default function DocumentSection({ projectId, currentStage, attachments, admin, preview, onUpload, onEdit, onDownload, onRemoveFile }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>(currentStage);
  const [description, setDescription] = useState('');
  const [visible, setVisible] = useState(true);
  const [filter, setFilter] = useState<'all' | Stage>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editStage, setEditStage] = useState<Stage>('executing');
  const [editDescription, setEditDescription] = useState('');
  const [editVisible, setEditVisible] = useState(true);
  const [editingBusy, setEditingBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const available = useMemo(() => attachments.filter(item => admin || item.visible_to_students), [attachments, admin]);
  const displayed = useMemo(() => available
    .filter(item => filter === 'all' || (item.stage || 'executing') === filter)
    .sort((a,b) => b.created_at.localeCompare(a.created_at)), [available, filter]);
  const handleSelect = (selection: FileList | null) => {
    setError('');
    const chosen = Array.from(selection || []);
    if (chosen.length > 5) { setFiles([]); setError('한 번에 최대 5개 파일을 선택할 수 있습니다.'); if (fileInput.current) fileInput.current.value = ''; return; }
    try { chosen.forEach(validateDocument); setFiles(chosen); }
    catch (err) { setFiles([]); setError((err as Error).message); if (fileInput.current) fileInput.current.value = ''; }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (files.length === 0 || saving) return;
    setSaving(true); setError('');
    let done = 0;
    try {
      for (const file of files) { await onUpload(projectId, file, visible, stage, description.trim()); done++; }
      setFiles([]); setDescription('');
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      setError(`${done}개 업로드 완료, 나머지는 미완료: ${(err as Error).message}`);
      setFiles(old => old.slice(done));
    } finally { setSaving(false); }
  };
  const beginEdit = (item: Attachment) => {
    setEditing(item.id); setEditStage(item.stage || 'executing'); setEditDescription(item.description || ''); setEditVisible(item.visible_to_students); setError('');
  };
  const submitEdit = async (event: FormEvent, item: Attachment) => {
    event.preventDefault(); if (editingBusy) return;
    setEditingBusy(true); setError('');
    try { await onEdit(item, editStage, editDescription.trim(), editVisible); setEditing(null); }
    catch (err) { setError((err as Error).message); }
    finally { setEditingBusy(false); }
  };
  return <section className="content-panel document-section">
    <div className="panel-heading"><div><span className="panel-eyebrow">03 / DOCUMENTS</span><h2>관련 문서 <span className="count-mini">{available.length}</span></h2></div><Paperclip size={22}/></div>
    <p className="panel-hint">사업의 각 추진 단계에 연결된 문서를 확인할 수 있습니다. 관리자 전용 문서는 일반 학생에게 보이지 않습니다.</p>
    {preview && <div className="document-preview-warning"><LockKeyhole size={17}/><div><strong>브라우저 체험용 저장</strong><span>체험용 파일은 이 브라우저의 IndexedDB에만 보관됩니다. 다른 기기와 공유되지 않으며, 브라우저 데이터 삭제 시 사라질 수 있습니다. 실제 공문서나 개인정보는 올리지 마세요.</span></div></div>}
    <div className="document-toolbar"><label htmlFor="document-stage-filter">단계별 문서 보기</label><select id="document-stage-filter" value={filter} onChange={e => setFilter(e.target.value as 'all' | Stage)}><option value="all">전체 단계</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
    {displayed.length ? <div className="attachments document-list">{displayed.map(item => <article className="attachment document-row" key={item.id}>
      <span className="attachment-icon"><FileText size={19}/></span>
      <div className="document-info"><strong title={item.filename}>{item.filename}</strong><div className="document-meta"><span className={`stage-pill stage-${item.stage || 'executing'}`}>{stageName(item.stage || 'executing')}</span><span>{formatSize(item.size_bytes)}</span><span>{formatDate(item.created_at)}</span>{admin && <span className={item.visible_to_students ? 'document-scope-public' : 'document-scope-private'}>{item.visible_to_students ? '학생 공개' : '관리자 전용'}</span>}</div>{item.description && <p className="document-description">{item.description}</p>}
        {admin && editing === item.id && <form className="document-edit" onSubmit={e => void submitEdit(e, item)}><label className="field"><span>연결할 추진 단계</span><select value={editStage} onChange={e => setEditStage(e.target.value as Stage)}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label className="field"><span>문서 설명</span><textarea rows={2} maxLength={500} value={editDescription} onChange={e => setEditDescription(e.target.value)}/></label><label className="check-line"><input type="checkbox" checked={editVisible} onChange={e => setEditVisible(e.target.checked)}/><span>일반 학생에게 공개</span></label><div className="document-edit-actions"><button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>취소</button><button className="btn btn-primary" disabled={editingBusy} type="submit">{editingBusy ? '저장 중…' : '변경 저장'}</button></div></form>}
      </div>
      <div className="document-actions"><button title="다운로드" aria-label={`${item.filename} 다운로드`} onClick={() => void onDownload(item)}><Download size={18}/></button>{admin && <><button title="정보 수정" aria-label={`${item.filename} 정보 수정`} onClick={() => editing === item.id ? setEditing(null) : beginEdit(item)}><Pencil size={16}/></button><button title="삭제" aria-label={`${item.filename} 삭제`} onClick={() => void onRemoveFile(item)}><Trash2 size={16}/></button></>}</div>
    </article>)}</div> : <div className="document-empty"><FolderOpen size={25}/><strong>{available.length ? '이 단계의 문서가 없습니다.' : '첨부된 문서가 없습니다.'}</strong><span>관리자가 사업 자료를 등록하면 이곳에서 확인할 수 있습니다.</span></div>}
    {admin && <form className="upload-form document-upload" onSubmit={e => void submit(e)}>
      <h3><Upload size={18}/> 문서 첨부</h3>
      <div className="document-upload-grid"><label className="field"><span>추진 단계</span><select value={stage} onChange={e => setStage(e.target.value as Stage)}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label className="field"><span>공개 범위</span><select value={visible ? 'students' : 'admins'} onChange={e => setVisible(e.target.value === 'students')}><option value="students">GIST 학생 공개</option><option value="admins">관리자 전용</option></select></label></div>
      <label className="field"><span>문서 설명 (선택)</span><textarea rows={2} maxLength={500} placeholder="예: 예산 검토를 위해 제출한 1차 사업계획서" value={description} onChange={e => setDescription(e.target.value)}/></label>
      <label className="field"><span>파일 선택 (최대 5개)</span><input ref={fileInput} type="file" multiple accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.hwp,.hwpx" onChange={e => handleSelect(e.target.files)}/></label>
      {files.length > 0 && <div className="document-file-queue">{files.map((file,i) => <div key={`${file.name}-${i}`}><FileText size={14}/><span>{file.name}</span><small>{formatSize(file.size)}</small><button type="button" aria-label={`${file.name} 선택 해제`} onClick={() => { setFiles(old => old.filter((_, index) => index !== i)); if (fileInput.current) fileInput.current.value = ''; }}><X size={15}/></button></div>)}</div>}
      <p className="form-help">PDF·HWP/HWPX·Word·Excel·PowerPoint·이미지·TXT / 파일당 최대 10MB. {preview ? '체험 모드: 브라우저에만 저장됩니다.' : '실제 업로드는 인증된 관리자만 가능하며 비공개 Storage에 저장됩니다.'}</p>
      {error && <div className="document-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={saving || !files.length}>{saving ? '업로드 중…' : `문서 ${files.length || ''}개 첨부`} <Upload size={16}/></button>
    </form>}
  </section>;
}
