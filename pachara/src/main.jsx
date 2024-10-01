// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Login from './components/Login'
import Logout from './components/Logout'
import Dashboard from './components/dashboard'
import Edit from './components/Edit'
import Add from './components/Add.jsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/logout",
    element: <Logout />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/add",
    element: <Add />,
  }, 
  {
    path: "/update/:id",
    element: <Edit />,
  }
]);

createRoot(document.getElementById('root')).render(
  
  <RouterProvider router={router} />
  
)
