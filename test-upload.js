const fs = require('fs');

async function testUploadStudent() {
  try {
    console.log('Logging in to get student token...');
    // Create student first if not exists
    await fetch('https://d38e5yq9jcxjxc.cloudfront.net/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: 'student_test_1@example.com',
        password: 'password123',
        role: 'student'
      })
    });

    const loginRes = await fetch('https://d38e5yq9jcxjxc.cloudfront.net/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'student_test_1@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.log('Login failed', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('Got student token:', token.substring(0, 15) + '...');

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="title"\r\n\r\n';
    body += 'Test Upload\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="type"\r\n\r\n';
    body += 'document\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="file"; filename="test.docx"\r\n';
    body += 'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n';
    body += 'test content\r\n';
    body += '--' + boundary + '--\r\n';

    console.log('Uploading file as student...');
    const uploadRes = await fetch('https://d38e5yq9jcxjxc.cloudfront.net/api/materials/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Authorization': `Bearer ${token}`
      },
      body: Buffer.from(body)
    });

    console.log('Upload status:', uploadRes.status);
    console.log('Upload success:', await uploadRes.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

testUploadStudent();
