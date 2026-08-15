export function createAutosaveStore({
  indexedDBRef = indexedDB,
  databaseName = 'TavernMapperAutosaveDB',
  storeName = 'autosave',
  now = Date.now,
} = {}) {
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDBRef.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function write(data) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put({ data, savedAt: now() }, 'current');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function read() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function remove() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete('current');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  return { read, remove, write };
}

export function createAutosaveScheduler({
  store,
  serialize,
  hasData,
  delay = 1500,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let timer = null;

  return function schedule() {
    clearTimer(timer);
    timer = setTimer(() => {
      if (!hasData()) {
        store.remove().catch(() => {});
        return;
      }
      try {
        store.write(serialize()).catch(() => {});
      } catch (error) {
        // Autosave is best-effort and must not interrupt a live session.
      }
    }, delay);
  };
}