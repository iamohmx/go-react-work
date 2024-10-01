import { useNavigate } from 'react-router-dom';
function Logout() {
    const navigate = useNavigate();
  
    const handleLogout = () => {
      localStorage.removeItem('user'); // ลบสถานะการล็อกอิน
      navigate('/login'); // กลับไปยังหน้าล็อกอิน
    };
  
    return (
      <div>
        <h2>You have been logged out</h2>
        <button onClick={handleLogout}>Login again</button>
      </div>
    );
  }
  
  export default Logout;
  