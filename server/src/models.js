import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
  department: { type: String, default: 'Water Supply' },
  ward: { type: String, default: 'Ashi Nagar' },
  preferredLanguage: { type: String, enum: ['English', 'Hindi', 'Marathi', 'Telugu'], default: 'English' }
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  complaintNumber: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  ward: { type: String, required: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, default: 'Unassigned' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  isEmergency: { type: Boolean, default: false, index: true },
  emergencyType: { type: String, default: '' },
  vulnerableGroup: { type: String, default: 'None' },
  status: { type: String, enum: ['Submitted', 'Under review', 'Assigned', 'In progress', 'Resolved', 'Reopened'], default: 'Submitted' },
  evidenceUrl: { type: String, default: '' },
  updates: [{
    status: String,
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  citizenFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    note: String,
    confirmed: Boolean,
    createdAt: Date
  },
  dueAt: { type: Date, default: () => new Date(Date.now() + 72 * 60 * 60 * 1000) }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Complaint = mongoose.model('Complaint', complaintSchema);
