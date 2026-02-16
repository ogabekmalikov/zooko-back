import fetch from 'node-fetch';

const API_URL = 'http://localhost:8080/api';

async function test() {
  try {
    // 1. Register
    const uniqueId = Date.now();
    const user = {
      firstName: 'Test',
      lastName: 'User',
      userName: `testuser${uniqueId}`,
      email: `test${uniqueId}@example.com`,
      password: 'password123'
    };

    console.log('Registering user...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const regData = await regRes.json();
    console.log('Register response:', regRes.status, regData);

    if (!regRes.ok) throw new Error('Registration failed');
    const token = regData.token;

    // 2. Create Course
    console.log('Creating course...');
    const courseRes = await fetch(`${API_URL}/courses`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: `Test Course ${uniqueId}`,
        description: 'Description',
        price: 10,
        category: 'Test',
        level: 'Beginner'
      })
    });
    const courseData = await courseRes.json();
    console.log('Create Course response:', courseRes.status, courseData);

    if (!courseRes.ok) throw new Error('Course creation failed');
    const courseId = courseData._id;

    // 3. Add Section
    console.log('Adding section to course:', courseId);
    const sectionRes = await fetch(`${API_URL}/courses/${courseId}/sections`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Section 1',
        description: 'Intro',
        order: 1
      })
    });
    const sectionData = await sectionRes.json();
    console.log('Add Section response:', sectionRes.status, sectionData);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
