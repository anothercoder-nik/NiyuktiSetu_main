const mongoose = require('mongoose');
require('dotenv').config();

const InterviewCandidate = require('../models/InterviewCandidate');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/niyuktisetu';

const candidates = [
    {
        rfid: 'RFID001234',
        rollNo: 'ROLL2024001',
        name: 'Nikunj Agarwal',
        email: 'nikunjagarwal449@gmail.com',
        dob: new Date('2002-04-15'),
        referenceImagePath: 'uploads/candidates/nikunj_ref.jpg',
    },
    {
        rfid: 'RFID001235',
        rollNo: 'ROLL2024002',
        name: 'Shreya Sharma',
        email: 'shreyasharma@gmail.com',
        dob: new Date('2003-11-22'),
        referenceImagePath: 'uploads/candidates/shreya_ref.jpg',
    },
    {
        rfid: 'RFID001236',
        rollNo: 'ROLL2024003',
        name: 'Rahul Kumar',
        email: 'rahulkumar@gmail.com',
        dob: new Date('2002-08-10'),
        referenceImagePath: 'uploads/candidates/rahul_ref.jpg',
    },
    {
        rfid: 'RFID001237',
        rollNo: 'ROLL2024004',
        name: 'Priya Singh',
        email: 'priyasingh@gmail.com',
        dob: new Date('2003-02-28'),
        referenceImagePath: 'uploads/candidates/priya_ref.jpg',
    },
    {
        rfid: 'RFID001238',
        rollNo: 'ROLL2024005',
        name: 'Amit Verma',
        email: 'amitverma@gmail.com',
        dob: new Date('2002-12-05'),
        referenceImagePath: 'uploads/candidates/amit_ref.jpg',
    },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing candidates
        await InterviewCandidate.deleteMany({});
        console.log('🗑️  Cleared existing candidates');

        // Insert seed data
        const result = await InterviewCandidate.insertMany(candidates);
        console.log(`✅ Inserted ${result.length} candidate records:`);
        result.forEach((c) => {
            console.log(`   - ${c.name} (${c.rfid} / ${c.rollNo})`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Seed complete. MongoDB disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        process.exit(1);
    }
}

seed();
