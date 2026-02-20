// src/components/AdminHeader.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore"; // Import the store
import { logout as logoutApiCall } from "../services/api"; // Import the logout API function
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline"; // Import logout icon
import Logo from "../assets/admin.png";

const AdminHeader = () => {
  const navigate = useNavigate(); // Hook for programmatic navigation
  const { logout: logoutAction } = useAuthStore(); // Get the Zustand logout action

  const handleLogout = async () => { // Make function async
    try {
      // Call the API endpoint to revoke the refresh token (uses cookie automatically)
      await logoutApiCall();
    } catch (err) {
      console.error("Logout API call failed:", err);
      // Even if API call fails, clear local state to log user out locally
    } finally {
      // Clear Zustand state and localStorage regardless of API call outcome
      logoutAction();
      // Navigate to login page
      navigate("/auth/login", { replace: true }); // Adjust route as needed
    }
  };

  return (
    <header className="navbar bg-secondary-content border-b border-accent">
      <div className="navbar-start">
        <label
          htmlFor="sidebar-drawer"
          className="btn btn-square btn-ghost lg:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-6 h-6 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            >
            </path>
          </svg>
        </label>
      </div>
      <div className="navbar-center">
        <Link
          to="/admin/dashboard"
          className="btn btn-ghost text-xl normal-case"
        >
          YC-Informatique Admin
        </Link>
      </div>
      <div className="navbar-end">
        <div className="dropdown avatar dropdown-end">
          <label tabIndex={0} className="btn btn-secondary btn-circle avatar">
            <div className="w-24 rounded-full">
              <img src={Logo} />
            </div>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-neutral rounded-box w-52"
          >
            <li>
              <a onClick={handleLogout} className="flex items-center gap-2">
                {/* Add onClick handler */}
                <ArrowRightStartOnRectangleIcon className="w-4 h-4" /> Logout
                {" "}
                {/* Add icon */}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
