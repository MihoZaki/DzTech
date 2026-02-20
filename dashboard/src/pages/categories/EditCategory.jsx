import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCategoryById, updateCategory } from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

const editCategorySchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
});

const EditCategory = () => {
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
    error: categoryFetchError,
  } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: () => fetchCategoryById(categoryId),
    select: (response) => response.data.data,
    enabled: !!categoryId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset, // Use reset to populate form with fetched data
  } = useForm({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      name: "",
      type: "",
    },
  });

  // Prefill form when data is loaded
  React.useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        type: category.type,
      });
    }
  }, [category, reset]);

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data), // Adjust mutation function signature
    onSuccess: (data, variables) => { // Use variables to get the ID
      queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated successfully!");
      navigate("/admin/categories"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Update Error:", error);
      toast.error(
        `Failed to update category: ${error.message || "Unknown error"}`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Submitting Edit Category Data:", data);
    updateCategoryMutation.mutate({ id: categoryId, data }); // Pass id and data object
  };

  if (categoryLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (categoryError) {
    return (
      <div className="alert alert-error">
        Error loading category: {categoryFetchError.message}
        <Link to="/admin/categories" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="alert alert-warning">
        Category not found.
        <Link to="/admin/categories" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <Link to="/admin/categories" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Categories
      </Link>

      <h2 className="text-xl font-bold mb-6">Edit Category: {category.name}</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.name ? "input-error" : ""
            }`}
            placeholder="Enter category name..."
            {...register("name")}
          />
          {errors.name && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.name.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Type *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.type ? "input-error" : ""
            }`}
            placeholder="Enter category type..."
            {...register("type")}
          />
          {errors.type && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.type.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control mt-6">
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={updateCategoryMutation.isPending}
            >
              {updateCategoryMutation.isPending
                ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2">
                    </span>{" "}
                    Saving...
                  </>
                )
                : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(-1)} // Go back
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditCategory;
