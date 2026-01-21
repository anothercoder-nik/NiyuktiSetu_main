// Script to setup candidate reference images directory structure
const fs = require('fs');
const path = require('path');

const directories = [
    'uploads/candidates',
    'uploads/live_captures'
];

console.log('📁 Creating directory structure...\n');

directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created: ${dir}`);
    } else {
        console.log(`✓ Already exists: ${dir}`);
    }
});

console.log('\n✨ Directory structure setup complete!\n');
console.log('📝 Next steps:');
console.log('1. Add candidate reference images to: uploads/candidates/');
console.log('   - nikunj_ref.jpg');
console.log('   - shreya_ref.jpg');
console.log('   - rahul_ref.jpg');
console.log('   - priya_ref.jpg');
console.log('   - amit_ref.jpg');
console.log('\n2. Run the database migration:');
console.log('   mysql -u root -p < database/interview_candidates.sql');
console.log('\n3. Start the server:');
console.log('   npm start\n');
