/* A MINIMAL, STRICT IndexedDB, shared by the probes that exercise lib/offline.js.
 *
 * NO NEW DEPENDENCY. There is no fake-indexeddb in node_modules and adding one for two probes is
 * not worth it, so this implements exactly the surface lib/offline.js uses and nothing more — it
 * cannot drift into a second implementation with its own opinions. It is deliberately STRICT
 * where the real API is strict: createObjectStore on an existing name throws, which is the whole
 * point of the v1 -> v2 upgrade test in probe-offline-pack-roundtrip.
 *
 * EXTRACTED rather than copied. It was written inline in that probe; the subtree-search probe
 * needs the same thing, and two hand-maintained IndexedDBs would disagree the first time either
 * grew a method — the four-grade-parsers shape this repo records at length. If you add a method
 * here, re-run BOTH probes: a shim that is wrong in a way one probe does not exercise still
 * reports that probe green.
 *
 * install() resets the stored databases, so a probe importing it starts from nothing.
 */
export function installIdbShim() {
const DBS = new Map();
const soon = (fn) => queueMicrotask(fn);
class Req { constructor() { this.result = undefined; this.error = null; } }

function makeStore(def) {
  return {
    // Reads resolve on a microtask; writes mutate synchronously, so a put issued before a get in
    // the same tick is always visible to it — which is what the real API guarantees within a
    // transaction and what lib/offline.js relies on.
    get: (k) => { const r = new Req(); soon(() => { r.result = def.rows.get(k); r.onsuccess && r.onsuccess(); }); return r; },
    getAll: () => { const r = new Req(); soon(() => { r.result = [...def.rows.values()]; r.onsuccess && r.onsuccess(); }); return r; },
    put: (row) => { def.rows.set(row[def.keyPath], row); const r = new Req(); soon(() => r.onsuccess && r.onsuccess()); return r; },
    delete: (k) => { def.rows.delete(k); const r = new Req(); soon(() => r.onsuccess && r.onsuccess()); return r; },
    createIndex: (name, keyPath) => { def.indexes.set(name, keyPath); },
    index: (name) => {
      const keyPath = def.indexes.get(name);
      if (keyPath === undefined) throw new Error("NotFoundError: no index " + name);
      const match = (range) => [...def.rows.values()].filter((v) => v[keyPath] === range._only);
      return {
        getAll: (range) => { const r = new Req(); soon(() => { r.result = match(range); r.onsuccess && r.onsuccess(); }); return r; },
        openCursor: (range) => {
          const r = new Req();
          const hits = match(range);
          let i = 0;
          const step = () => {
            if (i >= hits.length) { r.result = null; r.onsuccess && r.onsuccess(); return; }
            const row = hits[i++];
            r.result = { value: row, delete: () => def.rows.delete(row[def.keyPath]), continue: () => soon(step) };
            r.onsuccess && r.onsuccess();
          };
          soon(step);
          return r;
        },
      };
    },
  };
}

function openConnection(entry) {
  return {
    objectStoreNames: { contains: (n) => entry.stores.has(n) },
    createObjectStore: (name, opts) => {
      // STRICT ON PURPOSE. The real API throws ConstraintError here; a lenient shim would pass the
      // v1 -> v2 upgrade whatever lib/offline.js did, i.e. test the shim rather than the code.
      if (entry.stores.has(name)) throw new Error("ConstraintError: object store " + name + " already exists");
      const def = { keyPath: opts.keyPath, rows: new Map(), indexes: new Map() };
      entry.stores.set(name, def);
      return makeStore(def);
    },
    transaction: (name) => {
      const t = {
        objectStore: (n) => {
          const def = entry.stores.get(n);
          if (!def) throw new Error("NotFoundError: no object store " + n);
          return makeStore(def);
        },
      };
      // A MACROTASK, so oncomplete lands after every request microtask this transaction issued —
      // including a cursor walking row by row, each `continue()` being another microtask. Firing
      // it on a microtask made deleteByState complete before the cursor had finished.
      setTimeout(() => t.oncomplete && t.oncomplete(), 0);
      return t;
    },
  };
}

globalThis.IDBKeyRange = { only: (v) => ({ _only: v }) };
globalThis.indexedDB = {
  open: (name, version) => {
    const r = new Req();
    if (!DBS.has(name)) DBS.set(name, { version: 0, stores: new Map() });
    const entry = DBS.get(name);
    soon(() => {
      r.result = openConnection(entry);
      try {
        if (version > entry.version) { r.onupgradeneeded && r.onupgradeneeded(); entry.version = version; }
        r.onsuccess && r.onsuccess();
      } catch (e) { r.error = e; r.onerror && r.onerror(); }
    });
    return r;
  },
};
}
