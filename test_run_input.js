import axios from 'axios';

async function testPythonInput() {
  try {
    const response = await axios.post('http://localhost:3000/api/run', {
      code: 'name = input()\nprint(f"Hello, {name}!")',
      language: 'python',
      input: 'Kaviyarasan'
    });
    console.log('Python Input Response:', response.data);
  } catch (error) {
    console.error('Python Input Test failed:', error.response?.data || error.message);
  }
}

async function testJavaInput() {
  try {
    const response = await axios.post('http://localhost:3000/api/run', {
      code: 'import java.util.Scanner;\npublic class InputTest { public static void main(String[] args) { Scanner sc = new Scanner(System.in); String name = sc.nextLine(); System.out.println("Hello, " + name + "!"); } }',
      language: 'java',
      input: 'Kaviyarasan'
    });
    console.log('Java Input Response:', response.data);
  } catch (error) {
    console.error('Java Input Test failed:', error.response?.data || error.message);
  }
}

testPythonInput().then(testJavaInput);
