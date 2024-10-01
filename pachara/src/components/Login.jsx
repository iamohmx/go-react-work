import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = 'http://localhost:8080/';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // เช็คว่า user ได้ล็อกอินแล้วหรือยัง
  useEffect(() => {
    const isLoggedIn = !!localStorage.getItem('user');
    if (isLoggedIn) {
      // ถ้า user ล็อกอินแล้ว จะ redirect ไปหน้า dashboard
      navigate('/dashboard');
      console.log(isLoggedIn);
    }
  }, [navigate]);

  const handleLogin = async () => {
    const response = await fetch(`${BASE_URL}login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }), // ต้องตรงกับโครงสร้างข้อมูลใน backend
      credentials: 'include', // ใช้เพื่อรวม session cookies
    });

    if (response.ok) {
      // ล็อกอินสำเร็จ
      const data = await response.json();
      localStorage.setItem('user', data.username);  // บันทึกชื่อผู้ใช้ใน localStorage
      navigate('/dashboard');
    } else {
      alert('Invalid credentials'); // ล็อกอินไม่สำเร็จ
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card shadow p-4">
            <h2 className="text-center mb-4">Login</h2>

            <div className="form-group mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group mb-4">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="d-grid">
              <button className="btn btn-success" onClick={handleLogin}>
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;