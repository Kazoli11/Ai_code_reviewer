import axios from 'axios';

async function testRun() {
  try {
    const response = await axios.post('http://localhost:3000/api/run', {
      code: 'console.log("Hello from Node integration test!");',
      language: 'javascript'
    });
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Test failed:', error.response.data);
    } else {
      console.error('Test failed:', error.message);
    }
  }
}

testRun();
