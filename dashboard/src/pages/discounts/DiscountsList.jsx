// src/pages/discounts/DiscountsList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDiscount, fetchDiscounts } from "../../services/api";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const DiscountsList = () => {
  const queryClient = useQueryClient();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // State for active filter (boolean)
  const [filterActiveOnly, setFilterActiveOnly] = useState(null); // null = all, true = active only, false = inactive only

  const buildQueryParams = () => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
    };
    // Add filter parameter if it exists
    if (filterActiveOnly !== null) {
      params.is_active = filterActiveOnly.toString(); // Convert boolean to string ("true" or "false")
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
    queryKey: ["discounts", currentPage, itemsPerPage, filterActiveOnly], // Include filter in key
    queryFn: () => fetchDiscounts(buildQueryParams()),
    select: (response) => {
      // Assuming the response structure is {  [...], pagination_info }
      // Adjust based on your actual API response shape for discounts list
      const { data, page, limit, total, total_pages } = response.data;
      return {
        discounts: data,
        pagination: { page, limit, total, totalPages: total_pages },
      };
    },
  });

  const { discounts = [], pagination } = data || {};

  const deleteMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success(`Discount ID ${deletedId} deleted successfully.`);
    },
    onError: (error, deletedId) => {
      console.error("Delete Error:", error);
      toast.error(
        `Failed to delete discount ID ${deletedId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  const handleDelete = (discountId) => {
    if (
      window.confirm(
        `Are you sure you want to delete discount ID: ${discountId}? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(discountId);
    }
  };

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

  // Handler for active filter toggle change
  const handleFilterActiveToggle = (e) => {
    // Toggle between null (all), true (active only), false (inactive only)
    if (filterActiveOnly === null) {
      setFilterActiveOnly(true); // Switch to active only
    } else if (filterActiveOnly === true) {
      setFilterActiveOnly(false); // Switch to inactive only
    } else { // filterActiveOnly is false
      setFilterActiveOnly(null); // Switch to all
    }
    setCurrentPage(1); // Reset to first page when filter changes
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

  // Determine the label for the toggle based on its current state
  let toggleLabel = "All";
  if (filterActiveOnly === true) {
    toggleLabel = "Active Only";
  } else if (filterActiveOnly === false) {
    toggleLabel = "Inactive Only";
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Discounts</h2>
        <Link
          to="/admin/discounts/add"
          className="btn btn-accent flex items-center gap-2"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Add Discount
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="bg-base-100 p-4 rounded-box mb-4 flex flex-wrap items-center gap-4">
        <div className="form-control">
          <label className="label cursor-pointer justify-between gap-2">
            <span className="label-text">Status Filter</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  filterActiveOnly === null ? "font-bold" : ""
                }`}
              >
                All
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={filterActiveOnly === true} // Checked when active only
                onChange={handleFilterActiveToggle}
              />
              <span
                className={`text-xs ${
                  filterActiveOnly === true ? "font-bold" : ""
                }`}
              >
                Active
              </span>
            </div>
          </label>
        </div>
        {/* Add more filters here if needed (e.g., date range, type) */}
      </div>

      {/* Pagination Controls Top */}
      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} discounts
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
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
              <th>Valid From</th>
              <th>Valid Until</th>
              <th>Active</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {discounts.length > 0
              ? (
                discounts.map((discount) => {
                  const statusClass = discount.is_active
                    ? "badge-success"
                    : "badge-error";

                  return (
                    <tr key={discount.id}>
                      <td title={discount.id}>{truncateUuid(discount.id)}</td>
                      <td>{discount.code}</td>
                      <td>{discount.name}</td>
                      <td>{discount.discount_type}</td>
                      <td>{discount.discount_value}</td>
                      <td>{formatDate(discount.valid_from)}</td>
                      <td>{formatDate(discount.valid_until)}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {discount.is_active ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>{new Date(discount.created_at).toLocaleString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            to={`/admin/discounts/${discount.id}/edit`}
                            className="btn btn-xs btn-info"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </Link>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => handleDelete(discount.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending &&
                                deleteMutation.variables === discount.id
                              ? (
                                <span className="loading loading-spinner loading-xs">
                                </span>
                              )
                              : <TrashIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
              : (
                <tr>
                  <td colSpan="14" className="text-center py-4">
                    No discounts found.
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
            {pagination.total} discounts
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

export default DiscountsList;
