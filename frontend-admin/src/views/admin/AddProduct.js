// src/views/admin/AddProduct.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory for navigation

const AddProduct = () => {
  const history = useHistory(); // Get the history object

  // --- State for Form Fields (Updated for DB Schema) ---
  const [formData, setFormData] = useState({
    name: "",
    description: "", // Optional
    shortDescription: "", // Added
    price: "", // String initially, parse to number (cents) on submit
    sku: "", // Added (assuming it's separate from slug)
    stock: "", // String initially, parse to number on submit
    status: "draft", // Use default value from schema
    brand: "", // Added
    categoryId: "", // Added (will be a dropdown)
    // imageUrls: [], // Will be handled separately as an array
    // specHighlights: {}, // Will be handled separately as an object
  });

  // --- State for Image URLs (Array) ---
  const [imageUrls, setImageUrls] = useState([""]); // Start with one empty input field

  // --- State for Spec Highlights (Object) ---
  const [specHighlights, setSpecHighlights] = useState([{
    key: "",
    value: "",
  }]); // Start with one key-value pair

  // --- State for Validation Errors ---
  const [errors, setErrors] = useState({});

  // --- Handle Input Changes for basic fields ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // --- Handle Image URL Changes ---
  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);

    // Clear error if it was related to imageUrls
    if (errors.imageUrls) {
      setErrors((prev) => ({
        ...prev,
        imageUrls: "",
      }));
    }
  };

  // --- Add/Remove Image URL Fields ---
  const addImageUrlField = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const removeImageUrlField = (index) => {
    if (imageUrls.length > 1) { // Don't remove the last one
      const newUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newUrls);
    }
  };

  // --- Handle Spec Highlights Changes ---
  const handleSpecHighlightChange = (index, field, value) => {
    const newSpecs = [...specHighlights];
    newSpecs[index][field] = value;
    setSpecHighlights(newSpecs);

    // Clear error if it was related to specHighlights
    if (errors.specHighlights) {
      setErrors((prev) => ({
        ...prev,
        specHighlights: "",
      }));
    }
  };

  // --- Add/Remove Spec Highlight Fields ---
  const addSpecHighlightField = () => {
    setSpecHighlights([...specHighlights, { key: "", value: "" }]);
  };

  const removeSpecHighlightField = (index) => {
    if (specHighlights.length > 1) { // Don't remove the last one
      const newSpecs = specHighlights.filter((_, i) => i !== index);
      setSpecHighlights(newSpecs);
    }
  };

  // --- Validate Form Data (Updated for new fields) ---
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.price.trim()) {
      newErrors.price = "Price is required.";
    } else if (
      isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0
    ) {
      newErrors.price = "Price must be a valid non-negative number.";
    }
    if (!formData.sku.trim()) {
      newErrors.sku = "SKU is required."; // Added validation
    }
    if (!formData.stock.trim()) {
      newErrors.stock = "Stock quantity is required.";
    } else if (
      isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0
    ) {
      newErrors.stock = "Stock must be a valid non-negative integer.";
    }
    if (!formData.brand.trim()) {
      newErrors.brand = "Brand is required."; // Added validation
    }
    if (!formData.categoryId.trim()) { // Added validation
      newErrors.categoryId = "Category is required.";
    }
    if (imageUrls.some((url) => !url.trim())) {
      newErrors.imageUrls = "All image URL fields must be filled.";
    }
    if (specHighlights.some((spec) => !spec.key.trim() || !spec.value.trim())) {
      newErrors.specHighlights =
        "All spec highlight keys and values must be filled.";
    }

    return newErrors;
  };

  // --- Handle Form Submission (Mock Backend) ---
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Stop if validation fails
    }

    // --- Prepare data for submission (Mock Backend Format) ---
    const productData = {
      id: Date.now().toString(), // Simple temporary ID generation for simulation (should be UUID from backend)
      name: formData.name,
      description: formData.description,
      short_description: formData.shortDescription, // Map frontend field to DB field name
      price_cents: Math.round(parseFloat(formData.price) * 100), // Convert price to cents
      sku: formData.sku, // Include SKU
      stock_quantity: parseInt(formData.stock),
      status: formData.status,
      brand: formData.brand,
      category_id: formData.categoryId, // Map frontend field to DB field name
      image_urls: imageUrls.filter((url) => url.trim() !== ""), // Send only non-empty URLs as array
      spec_highlights: specHighlights.reduce((acc, curr) => {
        if (curr.key.trim() && curr.value.trim()) { // Only add if both key and value are filled
          acc[curr.key] = curr.value;
        }
        return acc;
      }, {}), // Convert array of {key, value} to object
      created_at: new Date().toISOString(), // Mock timestamp
      updated_at: new Date().toISOString(), // Mock timestamp
      // deleted_at: null // Not applicable on create
    };

    console.log("Submitted Product Data (Mock Backend Format):", productData);

    // --- Navigate back to the product list ---
    history.push("/admin/products"); // Use history.push to navigate

    // Optional: Show a success message
    alert("Product added successfully (mocked backend)! Check the console.");
  };

  // --- Handle Cancel Button ---
  const handleCancel = () => {
    // Navigate back to the product list
    history.push("/admin/products");
  };

  // --- Options for Category Dropdown (Mock) ---
  const categoryOptions = [
    { value: "", label: "Select a category..." },
    { value: "cat-uuid-1", label: "Electronics" },
    { value: "cat-uuid-2", label: "Accessories" },
    { value: "cat-uuid-3", label: "Furniture" },
    { value: "cat-uuid-4", label: "Home" },
    { value: "cat-uuid-5", label: "Wearables" },
    // Add more categories as needed, using mock UUIDs
  ];

  // --- Options for Status Dropdown (Mock) ---
  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "discontinued", label: "Discontinued" },
  ];

  return (
    <div className="w-full px-4">
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-lg text-blueGray-700">
                Add New Product
              </h3>
            </div>
          </div>
        </div>
        <div className="block w-full overflow-x-auto p-4">
          <form onSubmit={handleSubmit}>
            {/* Name Field */}
            <div className="relative z-0 w-full mb-6 group">
              <label
                htmlFor="name"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                  errors.name ? "border-red-600" : "border-gray-300"
                } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                placeholder=" "
              />
              {errors.name && (
                <p className="mt-2 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description Field (Optional) */}
            <div className="relative z-0 w-full mb-6 group">
              <label
                htmlFor="description"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Description
              </label>
              <textarea
                name="description"
                id="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className={`block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border ${
                  errors.description ? "border-red-600" : "border-gray-300"
                } focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Enter product description..."
              >
              </textarea>
              {errors.description && (
                <p className="mt-2 text-xs text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Short Description Field (Added) */}
            <div className="relative z-0 w-full mb-6 group">
              <label
                htmlFor="shortDescription"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Short Description
              </label>
              <input
                type="text"
                name="shortDescription"
                id="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                  errors.shortDescription ? "border-red-600" : "border-gray-300"
                } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                placeholder=" "
              />
              {errors.shortDescription && (
                <p className="mt-2 text-xs text-red-600">
                  {errors.shortDescription}
                </p>
              )}
            </div>

            {/* Price and SKU Fields (Inline) */}
            <div className="grid md:grid-cols-2 md:gap-6">
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="price"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Price (DZD) *
                </label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01" // Allow decimal prices
                  min="0" // Ensure non-negative
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.price ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.price && (
                  <p className="mt-2 text-xs text-red-600">{errors.price}</p>
                )}
              </div>
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="sku"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  SKU * {/* Changed label */}
                </label>
                <input
                  type="text"
                  name="sku"
                  id="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.sku ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.sku && (
                  <p className="mt-2 text-xs text-red-600">{errors.sku}</p>
                )}
              </div>
            </div>

            {/* Stock and Category Fields (Inline) */}
            <div className="grid md:grid-cols-2 md:gap-6">
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="stock"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock"
                  id="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0" // Ensure non-negative
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.stock ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.stock && (
                  <p className="mt-2 text-xs text-red-600">{errors.stock}</p>
                )}
              </div>
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="categoryId"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Category * {/* Changed label */}
                </label>
                <select
                  name="categoryId"
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className={`block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 ${
                    errors.categoryId ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-2 text-xs text-red-600">
                    {errors.categoryId}
                  </p>
                )}
              </div>
            </div>

            {/* Brand and Status Fields (Inline) */}
            <div className="grid md:grid-cols-2 md:gap-6">
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="brand"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Brand * {/* Added */}
                </label>
                <input
                  type="text"
                  name="brand"
                  id="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.brand ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.brand && (
                  <p className="mt-2 text-xs text-red-600">{errors.brand}</p>
                )}
              </div>
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="status"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Status * {/* Added */}
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={`block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 ${
                    errors.status ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-2 text-xs text-red-600">{errors.status}</p>
                )}
              </div>
            </div>

            {/* Image URLs Section */}
            <div className="relative z-0 w-full mb-6 group">
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Image URLs *
              </label>
              {imageUrls.map((url, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) =>
                      handleImageUrlChange(index, e.target.value)}
                    className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                      errors.imageUrls ? "border-red-600" : "border-gray-300"
                    } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                    placeholder="Enter image URL..."
                  />
                  {imageUrls.length > 1 && ( // Show remove button if more than one
                    <button
                      type="button"
                      onClick={() =>
                        removeImageUrlField(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addImageUrlField}
                className="text-blue-500 hover:text-blue-700"
              >
                <i className="fas fa-plus mr-1"></i> Add Image URL
              </button>
              {errors.imageUrls && (
                <p className="mt-2 text-xs text-red-600">{errors.imageUrls}</p>
              )}
            </div>

            {/* Spec Highlights Section */}
            <div className="relative z-0 w-full mb-6 group">
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Specification Highlights
              </label>
              {specHighlights.map((spec, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) =>
                      handleSpecHighlightChange(index, "key", e.target.value)}
                    className={`block py-2.5 px-0 w-1/2 text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                      errors.specHighlights
                        ? "border-red-600"
                        : "border-gray-300"
                    } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer mr-2`}
                    placeholder="Key (e.g., Cores)..."
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) =>
                      handleSpecHighlightChange(index, "value", e.target.value)}
                    className={`block py-2.5 px-0 w-1/2 text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                      errors.specHighlights
                        ? "border-red-600"
                        : "border-gray-300"
                    } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                    placeholder="Value (e.g., 16)..."
                  />
                  {specHighlights.length > 1 && ( // Show remove button if more than one
                    <button
                      type="button"
                      onClick={() => removeSpecHighlightField(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSpecHighlightField}
                className="text-blue-500 hover:text-blue-700"
              >
                <i className="fas fa-plus mr-1"></i> Add Spec Highlight
              </button>
              {errors.specHighlights && (
                <p className="mt-2 text-xs text-red-600">
                  {errors.specHighlights}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
              >
                Add Product
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-900 bg-white border border-gray-300 focus:outline-none focus:ring-4 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
