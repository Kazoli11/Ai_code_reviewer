import axios from 'axios';

async function testPython() {
  try {
    const response = await axios.post('http://localhost:3000/api/run', {
      code: 'print("Hello from Python integration test!")\nprint(2 + 2)',
      language: 'python'
    });
    console.log('Python Response:', response.data);
  } catch (error) {
    console.error('Python Test failed:', error.response?.data || error.message);
  }
}

async function testJava() {
  try {
    const response = await axios.post('http://localhost:3000/api/run', {
      code: 'public class HelloWorld { public static void main(String[] args) { System.out.println("Hello from Java integration test!"); } }',
      language: 'java'
    });
    console.log('Java Response:', response.data);
  } catch (error) {
    console.error('Java Test failed:', error.response?.data || error.message);
  }
}

testPython().then(testJava);
