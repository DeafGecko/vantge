// A stand-in for the Supabase client, used only on the /try/* demo pages.
// Reads and writes stay in this browser (localStorage, demo key only). Nothing is
// sent to the server, so the demo can't change real data. "Reset demo" restores the sample.
import { DEMO_DATA, DEMO_USER } from './demoData'

// Which column links a joined table, e.g. food_claims -> food_items
const JOINS = { food_items: 'food_item_id' }

// Bump this when the sample changes, so browsers drop an old saved copy
const STORAGE_KEY = 'vantge-demo-v2'

function freshData() {
  return JSON.parse(JSON.stringify(DEMO_DATA))
}

function loadStore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* storage blocked or corrupt: fall back to the sample */ }
  return freshData()
}

function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* private window: keep it in memory */ }
}

let store = loadStore()

// Keep other tabs on this browser (e.g. a guest RSVP tab) in step with the host dashboard
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) store = JSON.parse(e.newValue)
  })
}

// Used by the /try start page and the "Reset demo" button.
// eventType and background are optional; when left out, the sample party is kept.
export function resetDemo(eventName, { eventType, background } = {}) {
  store = freshData()
  const event = store.events[0]
  if (eventName?.trim()) {
    event.event_name = eventName.trim()
    event.rsvp_event_name = eventName.trim()
    event.rsvp_host_display_name = eventName.trim()
  }
  if (eventType !== undefined) event.event_type = eventType || null
  if (background) {
    event.background_image = background
    event.background_image_desktop = background
    // Keeps the dashboard from swapping in the event type's default photo on load
    event.demo_background_locked = true
  }
  saveStore()
}

const storageUrls = {}
let idCounter = 1000

const newId = () => `demo-${++idCounter}`
const nowIso = () => new Date().toISOString()

function pickFields(row, fieldList) {
  if (!fieldList || fieldList.trim() === '*') return row
  const out = {}
  fieldList.split(',').map(s => s.trim()).forEach(name => { out[name] = row[name] })
  return out
}

class DemoQuery {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orders = []
    this.limitTo = null
    this.mode = 'select'
    this.payload = null
    this.returning = false
    this.selectCols = '*'
    this.head = false
    this.wantCount = false
    this.wantOne = null
    this.conflict = 'id'
  }

  select(cols = '*', opts = {}) {
    this.selectCols = cols
    this.head = !!opts.head
    this.wantCount = opts.count === 'exact'
    if (this.mode !== 'select') this.returning = true
    return this
  }
  insert(rows) { this.mode = 'insert'; this.payload = rows; return this }
  update(values) { this.mode = 'update'; this.payload = values; return this }
  upsert(rows, opts = {}) { this.mode = 'upsert'; this.payload = rows; this.conflict = opts.onConflict || 'id'; return this }
  delete() { this.mode = 'delete'; return this }

  eq(col, val) { this.filters.push(r => r[col] === val); return this }
  neq(col, val) { this.filters.push(r => r[col] !== val); return this }
  in(col, vals) { this.filters.push(r => vals.includes(r[col])); return this }
  order(col, opts = {}) { this.orders.push([col, opts.ascending !== false]); return this }
  limit(n) { this.limitTo = n; return this }
  maybeSingle() { this.wantOne = 'maybe'; return this }
  single() { this.wantOne = 'single'; return this }

  // Attach the joined row (e.g. food_items) to each returned row
  projectRow(row) {
    const out = { ...row }
    const joinPattern = /(\w+)\(([^)]*)\)/g
    let match
    while ((match = joinPattern.exec(this.selectCols))) {
      const relation = match[1]
      const target = (store[relation] || []).find(t => t.id === row[JOINS[relation]])
      out[relation] = target ? pickFields(target, match[2]) : null
    }
    return out
  }

  run() {
    const rows = store[this.table] || (store[this.table] = [])
    const matches = rows.filter(r => this.filters.every(test => test(r)))
    let data = null
    let count = null

    if (this.mode === 'insert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload])
        .map(r => ({ id: newId(), created_at: nowIso(), ...r }))
      rows.push(...list)
      data = list
    } else if (this.mode === 'upsert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload]
      data = list.map(r => {
        const i = rows.findIndex(x => x[this.conflict] === r[this.conflict])
        if (i >= 0) { rows[i] = { ...rows[i], ...r }; return rows[i] }
        const row = { id: newId(), created_at: nowIso(), ...r }
        rows.push(row)
        return row
      })
    } else if (this.mode === 'update') {
      matches.forEach(r => {
        Object.assign(r, this.payload)
        if ('updated_at' in r) r.updated_at = nowIso()
      })
      data = matches
    } else if (this.mode === 'delete') {
      store[this.table] = rows.filter(r => !matches.includes(r))
      data = matches
    } else {
      let out = [...matches]
      this.orders.forEach(([col, ascending]) => {
        out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1))
      })
      if (this.limitTo != null) out = out.slice(0, this.limitTo)
      count = out.length
      data = this.head ? null : out.map(r => this.projectRow(r))
    }

    if (this.mode !== 'select') saveStore()

    // Writes return rows only when the caller asked with .select()
    if (this.mode !== 'select' && !this.returning) data = null

    let error = null
    if (this.wantOne === 'maybe') {
      data = Array.isArray(data) ? (data[0] ?? null) : data
    } else if (this.wantOne === 'single') {
      if (Array.isArray(data) && data.length === 1) data = data[0]
      else { data = null; error = { message: 'JSON object requested, multiple (or no) rows returned' } }
    }

    return { data, error, count: this.wantCount ? count : undefined }
  }

  then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject) }
  catch(reject) { return this.then(null, reject) }
}

const demoAuth = {
  getSession: async () => ({ data: { session: { user: DEMO_USER } }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  signInWithPassword: async () => ({ data: { session: { user: DEMO_USER } }, error: null }),
  signInWithOAuth: async () => ({ data: null, error: { message: 'Sign-in is not used in the demo.' } }),
  signOut: async () => ({ error: null }),
}

const demoStorage = {
  from: () => ({
    upload: async (path, file) => {
      // Keep the picture itself, so it still shows after a reload (blob links do not survive one)
      storageUrls[path] = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      return { data: { path }, error: null }
    },
    getPublicUrl: (path) => ({ data: { publicUrl: storageUrls[path] || path } }),
    remove: async () => ({ data: [], error: null }),
  }),
}

// Realtime updates are not needed in the demo, so subscriptions do nothing
function demoChannel() {
  const channel = { on() { return channel }, subscribe() { return channel } }
  return channel
}

export function createDemoClient() {
  return {
    from: (table) => new DemoQuery(table),
    auth: demoAuth,
    storage: demoStorage,
    channel: demoChannel,
    removeChannel: () => {},
    rpc: async () => ({ data: null, error: { message: 'Not available in the demo.' } }),
  }
}
