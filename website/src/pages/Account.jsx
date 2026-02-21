import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom"; // Added useLocation
import { useAuth } from "../contexts/AuthContext"; // Import useAuth
import { fetchUserOrders } from "../services/api"; // Import the API function
import { toast } from "sonner"; // Import toast for error handling

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
  "";

const Account = () => {
  const { user, logout } = useAuth(); // Get user and logout function
  const location = useLocation(); // Get current location
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };
  // Function to construct full image URL
  const constructImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // If it's already a full URL, return as is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Otherwise, prepend the backend base URL
    return `${imageUrl}`;
  };

  // Fetch recent orders (limit 3)
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user) return; // Don't fetch if user is not logged in

      setLoading(true);
      try {
        // Fetch first page with limit of 3 for recent orders
        const response = await fetchUserOrders(1, 3);

        // Process the orders to ensure image URLs are properly formatted if needed
        const processedOrders = response.data?.map((order) => ({
          ...order,
          // If there are product images in the order, format them here
        })) || [];

        setRecentOrders(processedOrders);
      } catch (error) {
        console.error("Error fetching recent orders:", error);

        // Handle unauthorized error specifically
        if (error.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          // Optionally trigger logout
          logout();
        } else {
          toast.error("Failed to load recent orders. Please try again.");
        }
        setRecentOrders([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadRecentOrders();
  }, [user, logout]);

  // If no user is logged in, maybe redirect or show a message
  // For now, let's just render nothing if not logged in, assuming the router handles protection
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">You are not logged in.</p>
          <Link to="/auth" className="btn btn-primary">
            Go to Login/Signup
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to check if the current link is active
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency helper function
  const formatCurrency = (cents) => {
    if (!cents) return "DZD 0.00";
    return `DZD ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg border border-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg mb-4">Account Menu</h2>
              <ul className="menu bg-base-100 w-full rounded-box">
                <li>
                  <Link
                    to="/account"
                    className={isActiveLink("/account") ? "active" : ""}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/orders"
                    className={isActiveLink("/account/orders") ? "active" : ""}
                  >
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/settings"
                    className={isActiveLink("/account/settings")
                      ? "active"
                      : ""}
                  >
                    Account Settings
                  </Link>
                </li>

                <li>
                  <button onClick={logout} className="btn w-full text-left">
                    Log Out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Welcome Section */}
          <div className="card bg-base-100 shadow-lg mb-6 border border-base-200">
            <div className="card-body">
              <h2 className="card-title">
                Welcome, {user.full_name || user.name}!
              </h2>
              <p className="text-gray-600">
                Member since {formatDate(user.created_at)}
              </p>
              <div className="mt-4">
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card bg-base-100 shadow-lg mb-6 border border-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">Recent Orders</h3>

              {loading
                ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                )
                : recentOrders.length === 0
                ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent orders found.</p>
                  </div>
                )
                : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="font-bold">Order #</th>
                          <th className="font-bold">Date</th>
                          <th className="font-bold">Recent Update</th>
                          <th className="font-bold">Status</th>
                          <th className="font-bold">Total</th>
                          <th className="font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td>{truncateUuid(order.id)}</td>
                            <td>{formatDate(order.created_at)}</td>
                            <td>{formatDate(order.updated_at)}</td>
                            <td>
                              <span
                                className={`badge ${
                                  order.status === "delivered" ||
                                    order.status === "Delivered"
                                    ? "badge-success"
                                    : order.status === "shipped" ||
                                        order.status === "Shipped"
                                    ? "badge-info"
                                    : order.status === "processing" ||
                                        order.status === "Processing"
                                    ? "badge-warning"
                                    : "badge-neutral"
                                }`}
                              >
                                {order.status.charAt(0).toUpperCase() +
                                  order.status.slice(1)}
                              </span>
                            </td>
                            <td>{formatCurrency(order.total_amount_cents)}</td>
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
                )}

              <div className="card-actions justify-end mt-4">
                <Link to="/account/orders" className="btn btn-outline">
                  View All Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
