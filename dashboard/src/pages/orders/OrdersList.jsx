// src/pages/orders/OrdersList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "../../services/api";
import { EyeIcon } from "@heroicons/react/24/outline";

const OrdersList = () => {
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // State for filters
  const [filterStatus, setFilterStatus] = useState(""); // e.g., "", "pending", "confirmed", "shipped", "delivered", "cancelled"
  const [filterUserId, setFilterUserId] = useState(""); // State for user_id filter

  const buildQueryParams = () => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
    };
    // Add filter parameters if they exist
    if (filterStatus) {
      params.status = filterStatus;
    }
    if (filterUserId) {
      params.user_id = filterUserId; // Add user_id filter parameter
    }
    return params;
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", currentPage, itemsPerPage, filterStatus, filterUserId], // Include user_id filter in key
    queryFn: () => fetchOrders(buildQueryParams()),
    select: (response) => {
      const { data, page, limit, total, total_pages } = response.data;
      return {
        orders: data,
        pagination: { page, limit, total, totalPages: total_pages },
      };
    },
  });

  const { orders = [], pagination } = data || {};

  // Handler for changing pages
  const goToPage = (newPage) => {
    if (pagination) {
      const { page: currentPageFromMeta, totalPages } = pagination;
      if (newPage >= 1 && (!totalPages || newPage <= totalPages)) {
        setCurrentPage(newPage);
      }
    } else {
      if (newPage >= 1) {
        setCurrentPage(newPage);
      }
    }
  };

  // Handler for changing items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page when limit changes
  };

  // Handler for status filter change
  const handleFilterStatusChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleFilterByUserId = (userId) => {
    setFilterUserId(userId);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleClearUserIdFilter = () => {
    setFilterUserId("");
    setCurrentPage(1); // Reset to first page when clearing filter
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Error: {error.message}</span>
        <button onClick={() => refetch()} className="btn btn-sm">Retry</button>
      </div>
    );
  }

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Orders</h2>
        {/* Add any potential global order actions here if needed, e.g., bulk export */}
      </div>

      {/* Filter Controls */}
      <div className="bg-base-100 p-4 rounded-box mb-4 flex flex-wrap gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status</span>
          </label>
          <select
            className="select select-bordered select-sm w-full max-w-xs"
            value={filterStatus}
            onChange={handleFilterStatusChange}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filterUserId && (
          <div className="form-control flex flex-row items-center">
            <label className="label">
              <span className="label-text">User Filter:</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="badge badge-info">
                {truncateUuid(filterUserId)}
              </span>
              <button
                className="btn btn-xs btn-outline"
                onClick={handleClearUserIdFilter}
              >
                Clear
              </button>
            </div>
          </div>
        )}
        {/* --- END NEW --- */}

        {/* Add more filters here if needed (e.g., date range) */}
      </div>

      {/* Pagination Controls Top */}
      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} orders
          </div>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              « Prev
            </button>
            <button className="join-item btn btn-xs">
              Page {pagination.page} of {pagination.totalPages}
            </button>
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next »
            </button>
          </div>
          <select
            className="select select-bordered select-xs w-24"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10/page</option>
            <option value={20}>20/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>User ID</th>
              <th>User Name</th>
              <th>Phone Number</th>
              <th>Total (DZD)</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0
              ? (
                orders.map((order) => {
                  const totalPriceDZD = order.total_amount_cents
                    ? (order.total_amount_cents / 100).toFixed(2)
                    : "Calculating...";

                  let statusClass = "badge-ghost";
                  if (order.status === "pending") {
                    statusClass = "badge-warning";
                  } else if (order.status === "confirmed") {
                    statusClass = "badge-info";
                  } else if (order.status === "shipped") {
                    statusClass = "badge-primary";
                  } else if (order.status === "delivered") {
                    statusClass = "badge-success";
                  } else if (order.status === "cancelled") {
                    statusClass = "badge-error";
                  }

                  return (
                    <tr key={order.id}>
                      <td title={order.id}>{truncateUuid(order.id)}</td>
                      <td>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleFilterByUserId(order.user_id)}
                          title="Filter orders by this user"
                        >
                          {truncateUuid(order.user_id)}
                        </button>
                      </td>
                      <td>
                        {order.user_email || order.user_full_name || "N/A"}
                      </td>
                      <td>
                        {order.phone_number_1 || order.phone_number_2 || "N/A"}
                      </td>
                      <td>{totalPriceDZD}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
                      <td>
                        <Link
                          to={`/admin/orders/${order.id}`} // Navigate to details page
                          className="btn btn-xs btn-info"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )
              : (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    No orders found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Bottom */}
      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} orders
          </div>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              « Prev
            </button>
            <button className="join-item btn btn-xs">
              Page {pagination.page} of {pagination.totalPages}
            </button>
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next »
            </button>
          </div>
          <select
            className="select select-bordered select-xs w-24"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10/page</option>
            <option value={20}>20/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
