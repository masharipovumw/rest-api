const fs = require('fs');

async function testUploadMalformed() {
  try {
    console.log('Logging in to get teacher token...');
    const loginRes = await fetch('https://d38e5yq9jcxjxc.cloudfront.net/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@example.com', password: 'password123' })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.data.token;

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="title"\r\n\r\nTest\r\n';
    body += '--' + boundary + '--\r\n';

    console.log('Uploading file with malformed Content-Type...');
    const uploadRes = await fetch('https://d38e5yq9jcxjxc.cloudfront.net/api/materials/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data', // Missing boundary!
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

testUploadMalformed();
