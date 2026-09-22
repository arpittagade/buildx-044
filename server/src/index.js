import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import { Complaint, User } from './models.js';
import { comparePassword, emailPattern, ensureAdmin, hashPassword, requireAuth, requireRole, signUser } from './auth.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin === '*' ? true : clientOrigin.split(',')[0].trim(), credentials: false }));
app.use(express.json({ limit: '1mb' }));

const categories = ['Water & drainage', 'Waste management', 'Streetlights', 'Roads & footpaths', 'Public sanitation', 'Other'];
const departments = ['Water Supply', 'Solid Waste Management', 'Electrical Department', 'Roads & Works', 'Public Health', 'Municipal Coordination'];

function publicUser(user) { return { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, ward: user.ward, preferredLanguage: user.preferredLanguage }; }
function publicComplaint(c) { return { ...c.toObject(), citizen: c.citizen ? publicUser(c.citizen) : c.citizen, assignedTo: c.assignedTo ? publicUser(c.assignedTo) : null }; }
function complaintNumber() { return `NC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`; }

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'civicconnect-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, ward = 'Ashi Nagar', preferredLanguage = 'English' } = req.body;
    if (!name?.trim() || !emailPattern.test(email || '') || !password || password.length < 8) return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash: await hashPassword(password), role: 'citizen', ward, preferredLanguage });
    res.status(201).json({ token: signUser(user), user: publicUser(user) });
  } catch (error) { res.status(500).json({ message: 'Unable to create account right now.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!emailPattern.test(email || '') || !password) return res.status(400).json({ message: 'Enter a valid email and password.' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User does not exist. Create an account first.' });
    if (!(await comparePassword(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: signUser(user), user: publicUser(user) });
  } catch { res.status(500).json({ message: 'Unable to sign in right now.' }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: publicUser(user) });
});

app.get('/api/meta', (_req, res) => res.json({ categories, departments, wards: ['Ashi Nagar', 'Dharampeth', 'Laxmi Nagar', 'Manish Nagar', 'Wadi', 'Sakkardara', 'Pratap Nagar'] }));

app.post('/api/complaints', requireAuth, upload.single('evidence'), async (req, res) => {
  try {
    if (req.auth.role !== 'citizen') return res.status(403).json({ message: 'Only citizens can submit a new complaint.' });
    const { title, category, description, location, ward, priority = 'Medium' } = req.body;
    if (!title || !category || !description || !location || !ward) return res.status(400).json({ message: 'Please complete every required issue field.' });
    const complaint = await Complaint.create({ complaintNumber: complaintNumber(), title, category, description, location, ward, priority, citizen: req.auth.id, updates: [{ status: 'Submitted', note: 'Complaint received and added to the civic coordination queue.', by: req.auth.id }] });
    await complaint.populate('citizen assignedTo');
    res.status(201).json({ complaint: publicComplaint(complaint) });
  } catch (error) { res.status(500).json({ message: 'Unable to submit the complaint.' }); }
});

app.get('/api/complaints', requireAuth, async (req, res) => {
  const query = req.auth.role === 'citizen' ? { citizen: req.auth.id } : {};
  const complaints = await Complaint.find(query).populate('citizen assignedTo').sort({ createdAt: -1 });
  res.json({ complaints: complaints.map(publicComplaint) });
});

app.get('/api/complaints/:id', requireAuth, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('citizen assignedTo');
  if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
  if (req.auth.role === 'citizen' && complaint.citizen._id.toString() !== req.auth.id) return res.status(403).json({ message: 'You cannot view this complaint.' });
  res.json({ complaint: publicComplaint(complaint) });
});

app.patch('/api/complaints/:id/feedback', requireAuth, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.citizen.toString() !== req.auth.id) return res.status(404).json({ message: 'Complaint not found.' });
  const { confirmed, rating, note } = req.body;
  complaint.citizenFeedback = { confirmed: Boolean(confirmed), rating: Number(rating) || undefined, note: note || '', createdAt: new Date() };
  complaint.status = confirmed ? 'Resolved' : 'Reopened';
  complaint.updates.push({ status: complaint.status, note: confirmed ? 'Citizen confirmed that the issue was resolved.' : 'Citizen reopened the complaint because the issue remains.', by: req.auth.id });
  await complaint.save();
  await complaint.populate('citizen assignedTo');
  res.json({ complaint: publicComplaint(complaint) });
});

app.get('/api/admin/overview', requireAuth, requireRole('admin'), async (_req, res) => {
  const [complaints, byDepartment, byWard] = await Promise.all([
    Complaint.find().populate('citizen assignedTo').sort({ createdAt: -1 }),
    Complaint.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.aggregate([{ $group: { _id: '$ward', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  ]);
  const counts = complaints.reduce((all, item) => { all[item.status] = (all[item.status] || 0) + 1; return all; }, {});
  res.json({ complaints: complaints.map(publicComplaint), counts, byDepartment, byWard });
});

app.patch('/api/admin/complaints/:id/assign', requireAuth, requireRole('admin'), async (req, res) => {
  const { department, priority = 'Medium' } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
  complaint.department = department || 'Municipal Coordination';
  complaint.priority = priority;
  complaint.status = 'Assigned';
  complaint.updates.push({ status: 'Assigned', note: `Task assigned to ${complaint.department} for authority action.`, by: req.auth.id });
  await complaint.save();
  await complaint.populate('citizen assignedTo');
  res.json({ complaint: publicComplaint(complaint) });
});

app.patch('/api/authority/complaints/:id/status', requireAuth, requireRole('admin', 'officer'), async (req, res) => {
  const { status, note = 'Authority updated the task.' } = req.body;
  const allowed = ['Under review', 'In progress', 'Resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid task status.' });
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
  complaint.status = status;
  complaint.updates.push({ status, note, by: req.auth.id });
  await complaint.save();
  await complaint.populate('citizen assignedTo');
  res.json({ complaint: publicComplaint(complaint) });
});

async function seedDemo() {
  const admin = await ensureAdmin();
  const existingCount = await Complaint.countDocuments();
  if (existingCount > 0) return;
  const citizen = await User.findOne({ email: 'citizen@civicconnect.local' }) || await User.create({ name: 'Sunita Patil', email: 'citizen@civicconnect.local', passwordHash: await hashPassword('Citizen@123'), role: 'citizen', ward: 'Ashi Nagar', preferredLanguage: 'Hindi' });
  const demos = [
    { complaintNumber: 'NC-2026-1042', title: 'Water pipe leaking outside my home', category: 'Water & drainage', description: 'A public pipeline has been leaking for four days and water is collecting near the entrance.', location: 'Ashi Nagar, Lane 4', ward: 'Ashi Nagar', citizen: citizen._id, department: 'Water Supply', priority: 'High', status: 'In progress', updates: [{ status: 'Submitted', note: 'Complaint received through CivicConnect.', by: citizen._id }, { status: 'Assigned', note: 'Water Supply team assigned by admin.', by: admin._id }, { status: 'In progress', note: 'Field visit scheduled for today.', by: admin._id }] },
    { complaintNumber: 'NC-2026-1039', title: 'Streetlight out near bus stop', category: 'Streetlights', description: 'The light has been out for 12 days near the Wadi bus stop.', location: 'Wadi bus stop', ward: 'Wadi', citizen: citizen._id, department: 'Electrical Department', priority: 'Medium', status: 'Resolved', citizenFeedback: { confirmed: false }, updates: [{ status: 'Submitted', note: 'Complaint received.', by: citizen._id }, { status: 'Resolved', note: 'Fixture replaced and tested.', by: admin._id }] },
    { complaintNumber: 'NC-2026-1031', title: 'Overflowing community bin', category: 'Waste management', description: 'The bin beside the school gate has not been cleared and is attracting stray animals.', location: 'Manish Nagar school gate', ward: 'Manish Nagar', citizen: citizen._id, department: 'Solid Waste Management', priority: 'Critical', status: 'Submitted', updates: [{ status: 'Submitted', note: 'Repeated reports detected from this locality.', by: citizen._id }] }
  ];
  await Complaint.insertMany(demos);
}

async function start() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    await seedDemo();
    console.log('MongoDB connected and CivicConnect demo data ready.');
  } else {
    console.warn('MONGO_URI is missing. API will start but database routes will fail until configured.');
  }
  app.listen(port, () => console.log(`CivicConnect API listening on ${port}`));
}

start().catch(error => { console.error(error); process.exit(1); });
