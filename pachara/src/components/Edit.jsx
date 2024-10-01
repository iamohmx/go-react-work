import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
const BASE_URL = 'http://localhost:8080/';

function Edit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState({
        pro_name: '',
        pro_price: '',
        pro_desc: ''
    });
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [loginChecked, setLoginChecked] = useState(false); // เพิ่มสถานะนี้เพื่อป้องกันการเข้าถึงก่อนตรวจสอบ
    
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

    async function getProduct(proId) {
        try {
            const response = await axios.get(`${BASE_URL}product/?id=${proId}`);
            if (response.status === 200) {
                setProduct(response.data);
            } else {
                setError('Error fetching product data');
            }
        } catch (error) {
            setError('Error connecting to server');
            console.error('Error fetching product:', error);
        }
    }

    useEffect(() => {
        checkLogin();
        getProduct(id);
    }, [id]);

    function handleChange(e) {
        setProduct({
            ...product,
            [e.target.name]: e.target.value,
        });
    }

    async function updateProduct(e) {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.put(`${BASE_URL}product/update?id=${id}`, {
                pro_name: product.pro_name,
                pro_price: parseFloat(product.pro_price), // Ensure price is sent as a number
                pro_desc: product.pro_desc
            });
            
            if (response.status === 200) {
                alert('Product updated successfully');
                navigate('/dashboard'); // Redirect to dashboard after successful update
            } else {
                setError('Error updating product');
            }
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(`Error: ${error.response.data}`);
            } else if (error.request) {
                // The request was made but no response was received
                setError('No response received from server');
            } else {
                // Something happened in setting up the request that triggered an Error
                setError('Error updating product');
            }
            console.error('Error updating product:', error);
        }
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow p-4">
                        <h2 className="text-center mb-4">Edit Product</h2>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <form onSubmit={updateProduct}>
                            <div className="mb-3">
                                <label htmlFor="pro_name" className="form-label">Product Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    id="pro_name" 
                                    name="pro_name" 
                                    value={product.pro_name} 
                                    onChange={handleChange} 
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="pro_price" className="form-label">Product Price</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    id="pro_price" 
                                    name="pro_price" 
                                    min="0" 
                                    max="100000" step="0.01"
                                    value={product.pro_price} 
                                    onChange={handleChange} 
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="pro_desc" className="form-label">Product Description</label>
                                <textarea 
                                    className="form-control" 
                                    id="pro_desc" 
                                    name="pro_desc" 
                                    rows="3" 
                                    value={product.pro_desc} 
                                    onChange={handleChange} 
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary">Update Product</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Edit;