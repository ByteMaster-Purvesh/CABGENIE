async function debugRegistration() {
  try {
    console.log('Testing registration with minimal data...');
    
    // Test 1: Minimal required fields
    const minimalData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user.minimal@example.com',
      password: 'password123',
      phone: '1234567890'
    };
    
    console.log('Sending minimal data:', minimalData);
    
    const response = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalData)
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    // Test 2: With address
    console.log('\nTesting with address...');
    const withAddress = {
      ...minimalData,
      email: 'test.user.address@example.com',
      address: '123 Test Street'
    };
    
    const response2 = await fetch('http://localhost:5000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(withAddress)
    });
    
    const data2 = await response2.json();
    console.log('Response with address:', data2);
    
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

debugRegistration();