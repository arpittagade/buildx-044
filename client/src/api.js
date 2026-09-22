const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const DEMO_ADMIN = { email: 'admin@civicconnect.local', password: 'Admin@123' };
export const DEMO_CITIZEN = { email: 'citizen@civicconnect.local', password: 'Citizen@123' };

const demoUser = { id: 'demo-citizen', name: 'Sunita Patil', email: DEMO_CITIZEN.email, role: 'citizen', ward: 'Ashi Nagar', preferredLanguage: 'Hindi' };
const demoAdmin = { id: 'demo-admin', name: 'CivicConnect Administrator', email: DEMO_ADMIN.email, role: 'admin', department: 'Municipal Coordination', ward: 'All wards' };
const demoComplaints = [
  { id: 'demo-1042', _id: 'demo-1042', complaintNumber: 'NC-2026-1042', title: 'Water pipe leaking outside my home', category: 'Water & drainage', description: 'A public pipeline has been leaking for four days and water is collecting near the entrance.', location: 'Ashi Nagar, Lane 4', ward: 'Ashi Nagar', department: 'Water Supply', priority: 'High', status: 'In progress', citizen: demoUser, createdAt: '2026-09-20T09:30:00Z', dueAt: '2026-09-23T09:30:00Z', updates: [{ status: 'Submitted', note: 'Complaint received through CivicConnect.', createdAt: '2026-09-20T09:30:00Z' }, { status: 'Assigned', note: 'Water Supply team assigned by admin.', createdAt: '2026-09-20T12:30:00Z' }, { status: 'In progress', note: 'Field visit scheduled for today.', createdAt: '2026-09-21T08:30:00Z' }] },
  { id: 'demo-1039', _id: 'demo-1039', complaintNumber: 'NC-2026-1039', title: 'Streetlight out near bus stop', category: 'Streetlights', description: 'The light has been out for 12 days near the Wadi bus stop.', location: 'Wadi bus stop', ward: 'Wadi', department: 'Electrical Department', priority: 'Medium', status: 'Resolved', citizen: demoUser, createdAt: '2026-09-18T08:30:00Z', dueAt: '2026-09-21T08:30:00Z', updates: [{ status: 'Submitted', note: 'Complaint received.', createdAt: '2026-09-18T08:30:00Z' }, { status: 'Resolved', note: 'Fixture replaced and tested.', createdAt: '2026-09-19T15:20:00Z' }] },
  { id: 'demo-1031', _id: 'demo-1031', complaintNumber: 'NC-2026-1031', title: 'Overflowing community bin', category: 'Waste management', description: 'The bin beside the school gate has not been cleared and is attracting stray animals.', location: 'Manish Nagar school gate', ward: 'Manish Nagar', department: 'Solid Waste Management', priority: 'Critical', status: 'Submitted', citizen: demoUser, createdAt: '2026-09-17T06:45:00Z', dueAt: '2026-09-20T06:45:00Z', updates: [{ status: 'Submitted', note: 'Repeated reports detected from this locality.', createdAt: '2026-09-17T06:45:00Z' }] }
];

function readStore() {
  try { return JSON.parse(localStorage.getItem('civicconnect_demo_store')) || { complaints: demoComplaints }; } catch { return { complaints: demoComplaints }; }
}
function writeStore(store) { localStorage.setItem('civicconnect_demo_store', JSON.stringify(store)); }
function currentUser() { try { return JSON.parse(localStorage.getItem('civicconnect_user')); } catch { return null; } }
function token() { return localStorage.getItem('civicconnect_token'); }
function isNetworkFailure(error) { return error instanceof TypeError || /failed to fetch|fetch failed|network error|network request/i.test(error?.message || ''); }

async function request(path, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong.');
  return body;
}

function persistSession(data) { localStorage.setItem('civicconnect_token', data.token || 'demo-token'); localStorage.setItem('civicconnect_user', JSON.stringify(data.user)); }

export const api = {
  async login(payload) {
    try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }); persistSession(result); return result; } catch (error) {
      // Demo credentials are a local fallback only. If the API is reachable, its
      // response must win so real MongoDB users and complaints stay in one store.
      if (isNetworkFailure(error) && payload.email === DEMO_ADMIN.email && payload.password === DEMO_ADMIN.password) { persistSession({ token: 'demo-admin-token', user: demoAdmin }); return { user: demoAdmin }; }
      if (isNetworkFailure(error) && payload.email === DEMO_CITIZEN.email && payload.password === DEMO_CITIZEN.password) { persistSession({ token: 'demo-citizen-token', user: demoUser }); return { user: demoUser }; }
      throw error;
    }
  },
  async register(payload) {
    try { const result = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }); persistSession(result); return result; } catch (error) { throw error; }
  },
  logout() { localStorage.removeItem('civicconnect_token'); localStorage.removeItem('civicconnect_user'); },
  user: currentUser,
  async listComplaints() {
    if (token()?.startsWith('demo-')) { const user = currentUser(); return { complaints: readStore().complaints.filter(c => user?.role === 'admin' ? true : c.citizen?.email === user?.email) }; }
    return request('/complaints');
  },
  async getComplaint(id) {
    if (token()?.startsWith('demo-')) return { complaint: readStore().complaints.find(c => c.id === id || c._id === id) || demoComplaints[0] };
    return request(`/complaints/${id}`);
  },
  async createComplaint(payload) {
    const localUser = currentUser();
    if (token()?.startsWith('demo-')) {
      const store = readStore();
      const created = { ...payload, id: `demo-${Date.now()}`, _id: `demo-${Date.now()}`, complaintNumber: `NC-2026-${Math.floor(1000 + Math.random() * 9000)}`, status: 'Submitted', department: 'Unassigned', priority: payload.priority || 'Medium', citizen: localUser || demoUser, createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 72 * 3600000).toISOString(), updates: [{ status: 'Submitted', note: 'Complaint received and added to the civic coordination queue.', createdAt: new Date().toISOString() }] };
      store.complaints = [created, ...store.complaints]; writeStore(store); return { complaint: created };
    }
    const form = new FormData(); Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== null) form.append(key, value); });
    return request('/complaints', { method: 'POST', body: form });
  },
  async feedback(id, payload) {
    if (token()?.startsWith('demo-')) { const store = readStore(); const complaint = store.complaints.find(c => c.id === id || c._id === id); if (complaint) { complaint.status = payload.confirmed ? 'Resolved' : 'Reopened'; complaint.citizenFeedback = { ...payload, createdAt: new Date().toISOString() }; complaint.updates.push({ status: complaint.status, note: payload.confirmed ? 'Citizen confirmed that the issue was resolved.' : 'Citizen reopened the complaint because the issue remains.', createdAt: new Date().toISOString() }); writeStore(store); } return { complaint }; }
    return request(`/complaints/${id}/feedback`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async adminOverview() {
    if (token()?.startsWith('demo-')) { const complaints = readStore().complaints; const counts = complaints.reduce((all, item) => { all[item.status] = (all[item.status] || 0) + 1; return all; }, {}); return { complaints, counts, byDepartment: Object.entries(complaints.reduce((all, item) => { all[item.department] = (all[item.department] || 0) + 1; return all; }, {})).map(([id, count]) => ({ _id: id, count })), byWard: Object.entries(complaints.reduce((all, item) => { all[item.ward] = (all[item.ward] || 0) + 1; return all; }, {})).map(([id, count]) => ({ _id: id, count })) }; }
    return request('/admin/overview');
  },
  async assign(id, payload) {
    if (token()?.startsWith('demo-')) { const store = readStore(); const complaint = store.complaints.find(c => c.id === id || c._id === id); if (complaint) { complaint.department = payload.department; complaint.priority = payload.priority; complaint.status = 'Assigned'; complaint.updates.push({ status: 'Assigned', note: `Task assigned to ${payload.department} for authority action.`, createdAt: new Date().toISOString() }); writeStore(store); } return { complaint }; }
    return request(`/admin/complaints/${id}/assign`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  async updateStatus(id, payload) {
    if (token()?.startsWith('demo-')) { const store = readStore(); const complaint = store.complaints.find(c => c.id === id || c._id === id); if (complaint) { complaint.status = payload.status; complaint.updates.push({ status: payload.status, note: payload.note, createdAt: new Date().toISOString() }); writeStore(store); } return { complaint }; }
    return request(`/authority/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
};
