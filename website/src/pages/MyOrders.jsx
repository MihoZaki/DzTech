import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext"; // Import useAuth to get user
import { fetchUserOrders } from "../services/api"; // Import the API function
import { toast } from "sonner"; // Import toast for error messages

const MyOrders = () => {
  const { user } = useAuth(); // Get the authenticated user
  const [searchParams, setSearchParams] = useSearchParams(); // For pagination

  // Pagination constants
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 10; // Number of orders per page

  // Get current page from URL params, default to 1
  const currentPage = parseInt(searchParams.get("page")) || DEFAULT_PAGE;
  // Get current limit from URL params, default to 10
  const currentLimit = parseInt(searchParams.get("limit")) || DEFAULT_LIMIT;

  // Define the query key with pagination parameters
  const queryKey = ["user-orders", user?.id, currentPage, currentLimit];

  // Use TanStack Query to fetch orders
  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchUserOrders(currentPage, currentLimit),
    enabled: !!user, // Only run query if user exists
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    onError: (err) => {
      console.error("Error fetching user orders:", err);
      toast.error("Failed to load orders. Please try again later.");
    },
  });

  // Extract data from the query result using the correct structure from your working version
  const orders = ordersData?.data || []; // Use ordersData.data as the array of orders
  const totalPages = ordersData?.total_pages || 1;
  const totalOrders = ordersData?.total || 0;

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  // Handler for changing pages
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSearchParams({
        page: page.toString(),
        limit: currentLimit.toString(),
      }); // Update URL params
    }
  };

  // Handler for changing page size
  const changePageSize = (newLimit) => {
    setSearchParams({ page: "1", limit: newLimit.toString() }); // Reset to page 1 when changing limit
  };

  // Generate page number buttons
  const renderPageNumbers = () => {
    const pageButtons = [];
    const maxVisiblePages = 5; // Maximum number of page buttons to show at once

    let startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust startPage if the range is too small
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`btn btn-sm mx-1 ${
            currentPage === i ? "btn-primary" : "btn-ghost"
          }`}
        >
          {i}
        </button>,
      );
    }

    return pageButtons;
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
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {/* Back Button */}
      <div className="mb-6">
        <Link to="/account" className="btn btn-sm btn-ghost">
          &larr; Back to Account
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="alert alert-error">
          <p>
            {error.message || "Failed to load orders. Please try again later."}
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !isError && (
        <>
          {orders.length === 0
            ? (
              <div className="text-center py-12">
                <p className="text-lg">You have no orders yet.</p>
                <Link to="/" className="btn btn-primary mt-4">
                  Start Shopping
                </Link>
              </div>
            )
            : (
              <>
                {/* Pagination Controls Above Table */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Show:</span>
                      <select
                        value={currentLimit}
                        onChange={(e) => changePageSize(Number(e.target.value))}
                        className="select select-sm select-bordered"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                      <span className="text-sm ml-2">
                        Page {currentPage} of {totalPages} ({totalOrders}{" "}
                        total orders)
                      </span>
                    </div>
                    <div className="flex items-center">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <div className="flex items-center mx-2">
                        {renderPageNumbers()}
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Orders Table */}
                <div className="card bg-base-100 shadow-lg border border-secondary-content">
                  <div className="card-body p-0">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="font-bold">Order #</th>
                            <th className="font-bold">Date</th>
                            <th className="font-bold">Phone Number</th>
                            <th className="font-bold">Status</th>
                            <th className="font-bold">Total</th>
                            <th className="font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id}>
                              <td>{truncateUuid(order.id)}</td>
                              <td>{formatDate(order.created_at)}</td>
                              <td>
                                {order.phone_number_1 || order.phone_number_2 ||
                                  "N/A"}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    order.status.toLowerCase() ===
                                        "delivered" ||
                                      order.status.toLowerCase() === "completed"
                                      ? "badge-success"
                                      : order.status.toLowerCase() === "shipped"
                                      ? "badge-info"
                                      : order.status.toLowerCase() ===
                                          "processing"
                                      ? "badge-warning"
                                      : "badge-neutral" // Default for other statuses
                                  }`}
                                >
                                  {order.status.charAt(0).toUpperCase() +
                                    order.status.slice(1)}{" "}
                                  {/* Capitalize status */}
                                </span>
                              </td>
                              <td>
                                {formatCurrency(order.total_amount_cents)}
                              </td>
                              <td>
                                <Link
                                  to={`/account/order/${order.id}`} // Link to order details page
                                  className="btn btn-xs btn-outline"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination Controls Below Table */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                    <div className="text-sm">
                      Showing {(currentPage - 1) * currentLimit + 1} to{" "}
                      {Math.min(currentPage * currentLimit, totalOrders)} of
                      {" "}
                      {totalOrders} orders
                    </div>
                    <div className="flex items-center">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <div className="flex items-center mx-2">
                        {renderPageNumbers()}
                      </div>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
        </>
      )}
    </div>
  );
};

export default MyOrders;
