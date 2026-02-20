import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategory } from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Define the Zod schema for validation
const addCategorySchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
});

const AddCategory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      name: "",
      type: "",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully!");
      navigate("/admin/categories"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Create Error:", error);
      toast.error(
        `Failed to create category: ${error.message || "Unknown error"}`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Submitting Add Category Data:", data);
    createCategoryMutation.mutate(data);
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <Link to="/admin/categories" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Categories
      </Link>

      <h2 className="text-xl font-bold mb-6">Add New Category</h2>

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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createCategoryMutation.isPending}
          >
            {createCategoryMutation.isPending
              ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2">
                  </span>{" "}
                  Creating...
                </>
              )
              : "Create Category"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCategory;
