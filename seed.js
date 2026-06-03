require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create Admin
    const adminEmail = 'admin@example.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'password123',
        role: 'admin',
      });
      console.log('✅ Admin user created: admin@example.com / password123');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }

    // 2. Create Teacher
    const teacherEmail = 'teacher@example.com';
    let teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      teacher = await User.create({
        name: 'Math Teacher',
        email: teacherEmail,
        password: 'password123',
        role: 'teacher',
      });
      console.log('✅ Teacher user created: teacher@example.com / password123');
    } else {
      console.log('ℹ️ Teacher user already exists.');
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
