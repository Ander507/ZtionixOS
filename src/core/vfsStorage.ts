const DB_NAME = 'ztionixos-vfs-db'
const DB_VERSION = 1
const META_STORE = 'meta'
const BLOB_STORE = 'blobs'
const LS_KEY = 'ztionixos-vfs'
const META_KEY = 'root'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  }))
}

function idbSet(store: string, key: string, value: unknown): Promise<void> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function idbDeleteAll(store: string): Promise<void> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

export async function loadVfsFromStorage(): Promise<string | null> {
  const meta = await idbGet<string>(META_STORE, META_KEY)
  if (meta) return meta

  const legacy = localStorage.getItem(LS_KEY)
  if (legacy) {
    await saveVfsToStorage(legacy)
    localStorage.removeItem(LS_KEY)
    return legacy
  }
  return null
}

export async function saveVfsToStorage(json: string): Promise<void> {
  await idbSet(META_STORE, META_KEY, json)
}

export async function clearVfsStorage(): Promise<void> {
  await idbDeleteAll(META_STORE)
  await idbDeleteAll(BLOB_STORE)
  localStorage.removeItem(LS_KEY)
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    return { used: est.usage ?? 0, quota: est.quota ?? 0 }
  }
  return { used: 0, quota: 0 }
}
