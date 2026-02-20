import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCategory, fetchCategories } from "../../services/api";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const CategoriesList = () => {
  const queryClient = useQueryClient();

  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    select: (response) => response.data.data.data,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Category ID ${deletedId} deleted successfully.`);
    },
    onError: (error, deletedId) => {
      console.error("Delete Error:", error);
      toast.error(
        `Failed to delete category ID ${deletedId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });
  console.log(categories);
  const handleDelete = (categoryId) => {
    if (
      window.confirm(
        `Are you sure you want to delete category ID: ${categoryId}? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(categoryId);
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

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Categories</h2>
        <Link
          to="/admin/categories/add"
          className="btn btn-accent flex items-center gap-2"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Add Category
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID (Truncated)</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Type</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories && categories.length > 0
              ? (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td title={category.id}>{truncateUuid(category.id)}</td>
                    <td>{category.name}</td>
                    <td className="font-mono">{category.slug}</td>
                    <td>{category.type}</td>
                    <td>{new Date(category.created_at).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/categories/${category.id}/edit`}
                          className="btn btn-xs btn-info"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() => handleDelete(category.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending &&
                              deleteMutation.variables === category.id
                            ? (
                              <span className="loading loading-spinner loading-xs">
                              </span>
                            )
                            : <TrashIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
              : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No categories found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoriesList;
