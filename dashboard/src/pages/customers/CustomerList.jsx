import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  deactivateUser,
  fetchUserById,
  fetchUsers,
} from "../../services/api";
import { toast } from "sonner";

const CustomersList = () => {
  const queryClient = useQueryClient();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // State for active_only filter
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // State for user details modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserData, setModalUserData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const buildQueryParams = () => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (filterActiveOnly) {
      params.active_only = "true"; // API expects string "true"
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
    queryKey: ["users", currentPage, itemsPerPage, filterActiveOnly], // Include filter in key
    queryFn: () => fetchUsers(buildQueryParams()),
    select: (response) => {
      const { data, page, limit, total, total_pages } = response.data;
      return {
        users: data,
        pagination: { page, limit, total, totalPages: total_pages },
      };
    },
  });

  const { users = [], pagination } = data || {};

  // Fetch user details for modal
  const fetchUserDetails = async (userId) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const response = await fetchUserById(userId);
      // Assuming the response structure is { success: true, data: { ...user_details... } }
      // Adjust based on your actual API response shape for user details
      const userDetails = response.data;
      setModalUserData(userDetails);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setModalError(err.message || "Failed to load user details.");
      setModalUserData(null); // Clear any old data on error
    } finally {
      setModalLoading(false);
    }
  };

  // Mutation for activating user
  const activateUserMutation = useMutation({
    mutationFn: activateUser, // Pass ID directly
    onSuccess: (data, activatedUserId) => {
      // Invalidate and refetch the specific user and the list
      queryClient.invalidateQueries({ queryKey: ["user", activatedUserId] }); // If you had a query for individual user
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User activated successfully!");
    },
    onError: (error, activatedUserId) => {
      console.error("Activate User Error:", error);
      toast.error(
        `Failed to activate user ID ${activatedUserId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  // Mutation for deactivating user
  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser, // Pass ID directly
    onSuccess: (data, deactivatedUserId) => {
      // Invalidate and refetch the specific user and the list
      queryClient.invalidateQueries({ queryKey: ["user", deactivatedUserId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated successfully!");
    },
    onError: (error, deactivatedUserId) => {
      console.error("Deactivate User Error:", error);
      toast.error(
        `Failed to deactivate user ID ${deactivatedUserId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

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

  // Handler for active_only filter change
  const handleFilterActiveOnlyChange = (e) => {
    setFilterActiveOnly(e.target.checked);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handler for opening the user details modal
  const handleOpenModal = async (userId) => {
    setIsModalOpen(true);
    // Fetch details when modal opens
    await fetchUserDetails(userId);
  };

  // Handler for closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalUserData(null); // Clear data when closing
    setModalError(null); // Clear error when closing
  };

  // Handler for activate user action
  const handleActivateUser = (userId) => {
    if (
      window.confirm(`Are you sure you want to activate user ID: ${userId}?`)
    ) {
      console.log(`Attempting to activate user: ${userId}`);
      activateUserMutation.mutate(userId);
    }
  };

  // Handler for deactivate user action
  const handleDeactivateUser = (userId) => {
    if (
      window.confirm(`Are you sure you want to deactivate user ID: ${userId}?`)
    ) {
      console.log(`Attempting to deactivate user: ${userId}`);
      deactivateUserMutation.mutate(userId);
    }
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

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Customers</h2>
        {/* Add any potential global customer actions here if needed */}
      </div>

      {/* Filter Controls */}
      <div className="bg-base-100 p-4 rounded-box mb-4 flex flex-wrap items-center gap-4">
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2">
            <span className="label-text">Active Only</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={filterActiveOnly}
              onChange={handleFilterActiveOnlyChange}
            />
          </label>
        </div>
        {/* Add more filters here if needed (e.g., date range, name/email search) */}
      </div>

      {/* Pagination Controls Top */}
      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} customers
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
              <th>ID (Truncated)</th>
              <th>Name</th>
              <th>Email</th>
              <th>Registration Date</th>
              <th>Order Count</th>
              <th>Activity Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0
              ? (
                users.map((user) => {
                  const statusClass = user.activity_status === "Active"
                    ? "badge-success"
                    : "badge-error";

                  return (
                    <tr key={user.id}>
                      <td>
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleOpenModal(user.id)}
                          title="View user details"
                        >
                          {truncateUuid(user.id)}
                        </button>
                      </td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{formatDate(user.registration_date)}</td>
                      <td>{user.order_count}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {user.activity_status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {user.activity_status === "Active"
                            ? (
                              <button
                                className="btn btn-xs btn-error"
                                onClick={() => handleDeactivateUser(user.id)}
                                disabled={deactivateUserMutation.isPending}
                                title="Deactivate user"
                              >
                                {deactivateUserMutation.isPending &&
                                    deactivateUserMutation.variables === user.id
                                  ? (
                                    <span className="loading loading-spinner loading-xs">
                                    </span>
                                  )
                                  : "Deactivate"}
                              </button>
                            )
                            : (
                              <button
                                className="btn btn-xs btn-success"
                                onClick={() => handleActivateUser(user.id)}
                                disabled={activateUserMutation.isPending}
                                title="Activate user"
                              >
                                {activateUserMutation.isPending &&
                                    activateUserMutation.variables === user.id
                                  ? (
                                    <span className="loading loading-spinner loading-xs">
                                    </span>
                                  )
                                  : "Activate"}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
              : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No customers found.
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
            {pagination.total} customers
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

      {/* User Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">User Details</h3>

            {modalLoading && (
              <div className="flex justify-center items-center h-24">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            )}

            {modalError && (
              <div className="alert alert-error mb-4">
                <p>Error loading details: {modalError}</p>
              </div>
            )}

            {!modalLoading && !modalError && modalUserData && (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>ID:</strong> {truncateUuid(modalUserData.id)}
                </p>
                <p>
                  <strong>Name:</strong> {modalUserData.name}
                </p>
                <p>
                  <strong>Email:</strong> {modalUserData.email}
                </p>
                <p>
                  <strong>Registration Date:</strong>{" "}
                  {formatDate(modalUserData.registration_date)}
                </p>
                <p>
                  <strong>Last Order Date:</strong>{" "}
                  {formatDate(modalUserData.last_order_date)}
                </p>
                <p>
                  <strong>Order Count:</strong> {modalUserData.order_count}
                </p>
                <p>
                  <strong>Activity Status:</strong>{" "}
                  <span
                    className={`badge ${
                      modalUserData.activity_status === "Active"
                        ? "badge-success"
                        : "badge-error"
                    }`}
                  >
                    {modalUserData.activity_status}
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                className="btn btn-primary"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
