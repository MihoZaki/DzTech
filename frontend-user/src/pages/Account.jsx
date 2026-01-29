// src/pages/Account.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Import useAuth

const Account = () => {
  const { user, logout } = useAuth(); // Get user and logout function

  // If no user is logged in, maybe redirect or show a message
  // For now, let's just render nothing if not logged in, assuming the router handles protection
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">You are not logged in.</p>
          <Link to="/auth" className="btn btn-primary">Go to Login/Signup</Link>
        </div>
      </div>
    );
  }

  // Mock recent orders (you might fetch this based on user ID later)
  const recentOrders = [
    {
      id: "#12345",
      date: "2024-05-15",
      status: "Delivered",
      total: "DZD 249.99",
    },
    { id: "#12344", date: "2024-05-10", status: "Shipped", total: "DZD 89.50" },
    {
      id: "#12343",
      date: "2024-05-05",
      status: "Processing",
      total: "DZD 1,200.00",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">Account Menu</h2>
              <ul className="menu bg-base-100 w-full rounded-box">
                <li>
                  <Link to="/account" className="active">Dashboard</Link>
                </li>
                <li>
                  <Link to="/account/orders">My Orders</Link>
                </li>
                <li>
                  <Link to="/account/settings">Account Settings</Link>
                </li>
                <li>
                  <button
                    onClick={logout}
                    className="btn w-full text-left"
                  >
                    Log Out
                  </button>
                </li>{" "}
                {/* Logout button */}
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Welcome Section */}
          <div className="card bg-base-100 shadow-lg mb-6">
            <div className="card-body">
              <h2 className="card-title">Welcome, {user.name}!</h2>
              <p className="text-gray-600">Member since {user.joinDate}</p>
              <div className="mt-4">
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card bg-base-100 shadow-lg mb-6">
            <div className="card-body">
              <h3 className="card-title text-lg">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.date}</td>
                        <td>
                          <span
                            className={`badge ${
                              order.status === "Delivered"
                                ? "badge-success"
                                : order.status === "Shipped"
                                ? "badge-info"
                                : "badge-warning"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>{order.total}</td>
                        <td>
                          <Link
                            to={`/account/order/${order.id}`}
                            className="btn btn-xs"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-actions justify-end mt-4">
                <Link to="/account/orders" className="btn btn-outline">
                  View All Orders
                </Link>
              </div>
            </div>
          </div>

          {/* Removed Wishlist Preview section */}
        </div>
      </div>
    </div>
  );
};

export default Account;
