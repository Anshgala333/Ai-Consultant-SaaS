const mongoose = require('mongoose');
const Employee = require('./backend/models/Employee');
const Business = require('./backend/models/Business');
const connectDB = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

const testLogin = async () => {
    try {
        await connectDB();
        console.log('MongoDB Connected');

        const email = 'test_employee@example.com'; 
        const password = 'password123';

        // 1. Create a dummy business and employee if not exists
        let business = await Business.findOne({ email: 'test_biz@example.com' });
        if (!business) {
            business = await Business.create({
                businessName: 'Test Biz',
                email: 'test_biz@example.com',
                password: 'password123',
                category: 'Retail'
            });
            console.log('Created test business');
        }

        let employee = await Employee.findOne({ email });
        if (!employee) {
            employee = await Employee.create({
                email,
                name: 'Test Employee',
                password: password,
                businessId: business._id,
                role: 'employee',
                isActive: true
            });
            console.log('Created test employee');
        } else {
            // Update password to ensure we know it
            employee.password = password;
            await employee.save();
            console.log('Updated test employee password');
        }

        // 2. Simulate Login Attempt
        console.log(`\nAttempting login for ${email}...`);
        
        const foundEmployee = await Employee.findOne({ email }).populate('businessId', 'businessName');
        
        if (!foundEmployee) {
            console.error('Login Failed: Employee not found');
            return;
        }
        console.log('Employee found:', foundEmployee.email);
        console.log('Business populated:', foundEmployee.businessId ? 'Yes' : 'No');

        const isMatch = await foundEmployee.comparePassword(password);
        console.log('Password match:', isMatch);

        if (isMatch) {
            console.log('LOGIN SUCCESS!');
             console.log({
                _id: foundEmployee._id,
                role: foundEmployee.role,
                firstLoginCompleted: foundEmployee.firstLoginCompleted,
                requirePasswordChange: foundEmployee.requirePasswordChange
            });
        } else {
            console.error('LOGIN FAILED: Password mismatch');
        }

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

testLogin();
