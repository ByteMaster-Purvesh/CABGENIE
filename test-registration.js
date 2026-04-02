async function testRegistration() {
  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith.unique@example.com',
        password: 'password123',
        phone: '+1-234-567-8901',
        address: '456 Oak Avenue, Los Angeles, CA 90001',
        dateOfBirth: '1992-05-15',
        gender: 'female'
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