async function testRegistration() {
  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user.simple@example.com',
        password: 'password123',
        phone: '1234567890'
      })
    });
    
    const data = await response.json();
    console.log('Registration response:', data);
    
    if (!response.ok) {
      console.error('Registration failed:', data);
    } else {
      console.log('Registration successful:', data);
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

testRegistration();