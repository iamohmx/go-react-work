import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
const BASE_URL = 'http://localhost:8080/';
function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loginChecked, setLoginChecked] = useState(false); // เพิ่มสถานะนี้เพื่อป้องกันการเข้าถึงก่อนตรวจสอบ

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${BASE_URL}products`);
            setProducts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const checkLogin = async () => {
        try {
            const response = await axios.get(`${BASE_URL}check-login`, {
                withCredentials: true,
            });
            if (response.status === 200) {
                setUser(response.data.user);
            } else {
                navigate('/login');
            }
        } catch (error) {
            console.error('Error checking login:', error);
            navigate('/login');
        } finally {
            setLoginChecked(true); // ตั้งค่าเพื่อแสดงว่าได้ทำการตรวจสอบแล้ว
        }
    };

    useEffect(() => {
        checkLogin();
        fetchProducts();
    }, []);

    if (!loginChecked) {
        return <div>Checking authentication...</div>; // เพิ่มหน้ารอขณะตรวจสอบการล็อกอิน
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <div>Please log in to view this page.</div>;
    }

    const handleLogout = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You will be logged out!",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, logout!',
        }).then((result) => {
            if (result.isConfirmed) {
                // เรียก API ล็อกเอาท์
                axios.post(`${BASE_URL}logout`, {}, { withCredentials: true })
                    .then(() => {
                        // ลบ user จาก localStorage
                        localStorage.removeItem('user');
                        // นำผู้ใช้ไปที่หน้า login
                        navigate('/login');
                    })
                    .catch((error) => {
                        console.error('Logout failed:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Oops...',
                            text: 'Something went wrong with the logout process!',
                        });
                    });
            }
        });
    };
    

    const handleDelete = async (productId) => {
        try {
            await axios.delete(`${BASE_URL}product/delete?id=${productId}`);
            setProducts(products.filter(product => product.id !== productId));
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    axios.delete(`${BASE_URL}product/delete?id=${productId}`)
                        .then(() => {
                            setProducts(products.filter(product => product.id !== productId));
                            Swal.fire(
                                'Deleted!',
                                'Product has been deleted.',
                                'success'
                            );
                        })
                        .catch((error) => {
                            console.error('Error deleting product:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Oops...',
                                text: 'Something went wrong with the delete process!',
                            });
                        });
                }
            });
        } catch (error) {
            console.error('Error deleting product:', error);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong with the delete process!',
            });
        }
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container">
                    <a className="navbar-brand" href="#">Dashboard</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                        <a className="nav-link active" aria-current="page" href="#">Home</a>
                        </li>
                        <li className="nav-item">
                        <a className="nav-link" href="#">Link</a>
                        </li>
                        
                        <li className="nav-item">
                        <a className="nav-link disabled" aria-disabled="true">Disabled</a>
                        </li>
                    </ul>
                    <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Hello, {user.username}!
                            </a>
                            <ul className="dropdown-menu">
                                <li><a className="dropdown-item" href="#">Another action</a></li>
                                <li><a className="dropdown-item" href="#">Something else here</a></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><a className="dropdown-item" href="#" onClick={() => {
                                    handleLogout();
                                }}>logout</a></li>
                            </ul>
                        </li>
                    </ul>
                    </div>
                </div>
            </nav>
            <div className="container mt-5">
                <h2>Product List</h2>
                <Link to={'/add'}>
                    <button className='btn btn-success'>Add</button>
                </Link>
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product Name</th>
                            <th>Price</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product, index) => (
                            <tr key={index}>
                                <td>{product.id}</td>
                                <td>{product.pro_name}</td>
                                <td>{product.pro_price}</td>
                                <td>{product.pro_desc}</td>
                                <td>
                                <Link to={`/update/${product.id}`}>
                                    <button className="btn btn-warning mr-2">Edit</button> &nbsp;
                                </Link>
                                    <button className="btn btn-danger" onClick={() => handleDelete(product.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default Dashboard;
