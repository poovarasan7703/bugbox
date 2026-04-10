import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Bug from '../models/Bug.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bugbox';

const sampleUsers = [
  { name: 'Test Tester', email: 'tester@bugbox.com', password: 'tester123', role: 'tester' },
  { name: 'Dev Developer', email: 'developer@bugbox.com', password: 'developer123', role: 'developer' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Bug.deleteMany({});

    const users = await User.create(sampleUsers);
    const tester = users.find((u) => u.role === 'tester');
    const developer = users.find((u) => u.role === 'developer');

    await Bug.create([
      {
        bugId: 'BUG-DEMO001',
        title: 'Login button not responding',
        description: 'When clicking the login button on the homepage, nothing happens. The button appears clickable but there is no response.',
        reportedBy: tester._id,
        status: 'Open',
      },
      {
        bugId: 'BUG-DEMO002',
        title: 'Form validation error on registration',
        description: 'The registration form shows an error for valid email addresses. Tested with user@example.com.',
        reportedBy: tester._id,
        status: 'In Progress',
        developerComments: [
          { author: developer._id, text: 'Investigating the regex pattern for email validation.' },
        ],
      },
      {
        bugId: 'BUG-DEMO003',
        title: 'Dashboard layout broken on mobile',
        description: 'On mobile devices, the dashboard layout overlaps and buttons are not tappable.',
        reportedBy: tester._id,
        status: 'Fixed',
        developerComments: [
          { author: developer._id, text: 'Fixed responsive breakpoints. Deployed to staging.' },
        ],
      },
    ]);

    console.log('Sample data seeded successfully!');
    console.log('\nTest accounts:');
    console.log('  Tester:     tester@bugbox.com / tester123');
    console.log('  Developer:  developer@bugbox.com / developer123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
