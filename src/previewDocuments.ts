/** Local-only document blobs for the public preview. No network writes, no production data. */
const DATABASE = 'gist-project-tracker-preview-documents-v12';
const STORE = 'files';
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('이 브라우저에서는 파일 임시 저장을 지원하지 않습니다.')); return; }
    const req = window.indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('브라우저 파일 저장소를 열 수 없습니다.'));
    req.onblocked = () => reject(new Error('다른 탭에서 체험 저장소를 사용 중입니다.'));
  });
}
function writeTransaction(action: (store: IDBObjectStore) => void): Promise<void> {
  return openDatabase().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('파일 저장이 취소되었습니다.')); };
    tx.onerror = () => { /* onabort handles final failure */ };
    try { action(tx.objectStore(STORE)); } catch (error) { tx.abort(); reject(error); }
  }));
}
export function putPreviewDocument(id: string, file: File): Promise<void> {
  return writeTransaction(store => { store.put(file, id); });
}
export function removePreviewDocument(id: string): Promise<void> {
  return writeTransaction(store => { store.delete(id); });
}
export function clearPreviewDocuments(): Promise<void> {
  return writeTransaction(store => { store.clear(); });
}
export async function getPreviewDocument(id: string): Promise<Blob> {
  const db = await openDatabase();
  return new Promise<Blob>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => {
      const value: unknown = request.result;
      if (value instanceof Blob) resolve(value);
      else reject(new Error('로컬 문서 파일이 없습니다. 브라우저 데이터를 삭제했을 수 있습니다.'));
    };
    request.onerror = () => reject(request.error || new Error('파일을 읽지 못했습니다.'));
    tx.oncomplete = () => db.close();
    tx.onabort = () => { db.close(); reject(tx.error || new Error('파일 읽기가 중단되었습니다.')); };
  });
}
