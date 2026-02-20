// src/pages/products/EditProduct.jsx
import React, { useEffect, useRef } from "react"; // Add useRef
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  MinusIcon,
  PhotoIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import FileUploadField from "../../components/FileUploadField";
// --- CORRECTED IMPORT ---
import {
  fetchProductById,
  updateProductDetailsAndImages, // Import the new function
} from "../../services/api";

// Define a schema for individual spec pairs
const specPairSchema = z.object({
  key: z.string().min(1, { message: "Key is required." }),
  value: z.string().min(1, { message: "Value is required." }),
});

// Schema for editing product details (excluding image file objects themselves, as they are handled separately for updates)
const editProductSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price_cents: z.number().int().positive({
    message: "Price (in cents) must be a positive integer.",
  }),
  stock_quantity: z.number().int().gte(0, {
    message: "Stock quantity cannot be negative.",
  }),
  status: z.enum(["active", "draft", "discontinued"], {
    message: "Status must be active, draft, or discontinued.",
  }),
  brand: z.string().min(1, { message: "Brand is required." }),
  category_id: z.string().uuid({
    message: "Category ID must be a valid UUID.",
  }),
  spec_highlights: z.array(specPairSchema).optional(), // Optional array of pairs
  images: z.array(z.instanceof(File)).optional(),
});

const EditProduct = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileUploadRef = useRef(); // Create ref for FileUploadField

  // In EditProduct.jsx, update the useQuery hook
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
    error: productFetchError,
    isFetching,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProductById(productId),
    select: (response) => {
      return response.data; // Keep the original return
    },
    enabled: !!productId,
  });
  // Define the update mutation for product details AND images using PATCH
  const updateProductMutation = useMutation({
    mutationFn: ({ id, formData }) =>
      updateProductDetailsAndImages(id, formData), // Use the new function
    onSuccess: (updatedData) => {
      console.log("Product updated successfully:", updatedData);
      toast.success("Product updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/admin/products");
    },
    onError: (error) => {
      console.error("Update Product Error:", error);
      let errorMessage = "Failed to update product.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      price_cents: 0,
      stock_quantity: 0,
      status: "draft",
      brand: "",
      category_id: "",
      spec_highlights: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "spec_highlights",
  });

  // Pre-populate the form when product data is loaded
  useEffect(() => {
    if (product) {
      console.log("Pre-populating form with product ", product);
      reset({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        price_cents: product.price_cents,
        stock_quantity: product.stock_quantity,
        status: product.status,
        brand: product.brand,
        category_id: product.category_id,
        spec_highlights: Object.entries(product.spec_highlights || {}).map((
          [key, value],
        ) => ({ key, value })),
      });
    }
  }, [product, reset]);

  const onSubmit = async (data) => {
    console.log("Submitting Edit Product Data (from RHF):", data); // Log the whole data object

    const formData = new FormData();

    // Append updated details fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      // IMPORTANT: Exclude the file array field ('new_images') from this loop
      // as it needs special handling below.
      if (key !== "spec_highlights" && key !== "images") {
        formData.append(key, value);
      }
    });

    // Append spec_highlights as a JSON string to FormData
    if (data.spec_highlights && data.spec_highlights.length > 0) {
      const specHighlightsObj = data.spec_highlights.reduce((obj, pair) => {
        obj[pair.key] = pair.value;
        return obj;
      }, {});
      formData.append("spec_highlights", JSON.stringify(specHighlightsObj));
    }

    // --- GET NEW IMAGES FROM THE RHF DATA OBJECT ---
    const newImageFiles = data.images; // Get files directly from the RHF data object

    if (
      newImageFiles && Array.isArray(newImageFiles) && newImageFiles.length > 0
    ) {
      newImageFiles.forEach((file, index) => {
        // Append using the field name expected by the backend ('images')
        formData.append("images", file, file.name); // Append each file individually under the 'images' key
      });
    } else {
    }

    // Submit the combined FormData using the PATCH mutation
    updateProductMutation.mutate({ id: productId, formData });

    // No need for separate details/images promises as it's one request now
  };

  // --- STATE CHECKS AND RENDERING ---
  // Check if the ID was provided in the URL
  if (!productId) {
    return (
      <div className="alert alert-warning">
        <p>Error: Product ID not found in URL.</p>
        <button onClick={() => navigate(-1)} className="btn btn-sm mt-2">
          Go Back
        </button>
      </div>
    );
  }

  // Check loading state - this handles the initial fetch
  if (productLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Check error state after loading attempt
  if (productError) {
    console.error("Error fetching product:", productFetchError); // Log the error object
    return (
      <div className="alert alert-error">
        <p>Error loading product: {productFetchError.message}</p>
        <button onClick={() => navigate(-1)} className="btn btn-sm mt-2">
          Go Back
        </button>
      </div>
    );
  }

  // If the query ran successfully but returned no data (e.g., 404 from server), product might be undefined
  // Check if product data exists after loading and error checks
  if (!product) {
    // This case might occur if the query succeeded (status 200) but returned an empty response,
    // or if the select function returned undefined.
    // More commonly, a 404 would trigger the error state above.
    // But let's handle it just in case.
    console.warn("Product data is undefined after successful fetch attempt.");
    return (
      <div className="alert alert-warning">
        <p>Product not found or data unavailable.</p>
        <button onClick={() => navigate(-1)} className="btn btn-sm mt-2">
          Go Back
        </button>
      </div>
    );
  }

  // Construct the backend base URL for displaying existing images
  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
    "http://localhost:8080";

  // Render the form once data is loaded
  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-4xl mx-auto border border-secondary">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold ml-2">
          Edit Product: {product?.name}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.name ? "input-error" : ""
            }`}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-red-500 text-xs">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            className={`textarea textarea-bordered ${
              errors.description ? "textarea-error" : ""
            }`}
            rows="3"
            {...register("description")}
          >
          </textarea>
          {errors.description && (
            <p className="text-red-500 text-xs">{errors.description.message}</p>
          )}
        </div>

        {/* Short Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Short Description</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.short_description ? "input-error" : ""
            }`}
            {...register("short_description")}
          />
          {errors.short_description && (
            <p className="text-red-500 text-xs">
              {errors.short_description.message}
            </p>
          )}
        </div>

        {/* Price (in cents) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Price (in cents) *</span>
          </label>
          <input
            type="number"
            min="0"
            className={`input input-bordered ${
              errors.price_cents ? "input-error" : ""
            }`}
            {...register("price_cents", { valueAsNumber: true })}
          />
          {errors.price_cents && (
            <p className="text-red-500 text-xs">{errors.price_cents.message}</p>
          )}
        </div>

        {/* Stock Quantity */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Stock Quantity *</span>
          </label>
          <input
            type="number"
            min="0"
            className={`input input-bordered ${
              errors.stock_quantity ? "input-error" : ""
            }`}
            {...register("stock_quantity", { valueAsNumber: true })}
          />
          {errors.stock_quantity && (
            <p className="text-red-500 text-xs">
              {errors.stock_quantity.message}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status *</span>
          </label>
          <select
            className={`select select-bordered ${
              errors.status ? "select-error" : ""
            }`}
            {...register("status")}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="discontinued">Discontinued</option>
          </select>
          {errors.status && (
            <p className="text-red-500 text-xs">{errors.status.message}</p>
          )}
        </div>

        {/* Brand */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Brand *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.brand ? "input-error" : ""
            }`}
            {...register("brand")}
          />
          {errors.brand && (
            <p className="text-red-500 text-xs">{errors.brand.message}</p>
          )}
        </div>

        {/* Category ID */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Category *</span>
          </label>
          <select
            className={`select select-bordered ${
              errors.category_id ? "select-error" : ""
            }`}
            {...register("category_id")}
          >
            <option value={product?.category_id}>
              {product?.category_name || "Loading..."}
            </option>
          </select>
          {errors.category_id && (
            <p className="text-red-500 text-xs">{errors.category_id.message}</p>
          )}
        </div>

        {/* Spec Highlights (Dynamic Form) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Specification Highlights</span>
          </label>
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-xs btn-outline btn-secondary mb-2"
              onClick={() => append({ key: "", value: "" })}
            >
              <PlusIcon className="w-4 h-4 mr-1" /> Add Spec
            </button>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Key (e.g., Processor)"
                  className={`input input-bordered input-sm flex-1 ${
                    errors.spec_highlights?.[index]?.key ? "input-error" : ""
                  }`}
                  {...register(`spec_highlights.${index}.key`)}
                />
                <input
                  type="text"
                  placeholder="Value (e.g., Intel i7)"
                  className={`input input-bordered input-sm flex-1 ${
                    errors.spec_highlights?.[index]?.value ? "input-error" : ""
                  }`}
                  {...register(`spec_highlights.${index}.value`)}
                />
                <button
                  type="button"
                  className="btn btn-xs btn-outline btn-error"
                  onClick={() =>
                    remove(index)}
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {errors.spec_highlights && (
              <p className="text-red-500 text-xs">
                At least one spec is required and keys/values cannot be blank.
              </p>
            )}
          </div>
        </div>

        {/* Existing Images Display */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Current Images</span>
          </label>
          <div className="bg-base-200 p-4 rounded">
            {product?.image_urls && product.image_urls.length > 0
              ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Grid for thumbnails */}
                  {product.image_urls.map((url, idx) => {
                    const fullUrl = `${BACKEND_BASE_URL}${url}`;
                    return (
                      <div key={idx} className="avatar">
                        <div className="mask mask-squircle w-16 h-16">
                          {/* Smaller thumbnail size */}
                          <img
                            src={fullUrl}
                            alt={`Current product image ${idx + 1}`}
                            className="object-cover w-full h-full" // Cover the avatar area
                            onError={(e) => {
                              e.target.src =
                                "https://placehold.co/60x60?text=Err  "; // Fallback on error
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
              : (
                <p className="text-sm text-gray-500 italic">
                  No images currently uploaded.
                </p>
              )}
          </div>
        </div>

        {/* Image Replacement Field */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              Replace Images (Multiple allowed)
            </span>
          </label>
          <FileUploadField
            name="images"
            control={control}
            accept="image/*"
            multiple={true}
          />
          <p className="text-sm text-gray-500 mt-1">
            Select new images to replace the current set.
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="form-control mt-6">
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={updateProductMutation.isPending} // Disable based on the single mutation
            >
              {updateProductMutation.isPending
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
              onClick={() => navigate(-1)} // Go back without saving
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
