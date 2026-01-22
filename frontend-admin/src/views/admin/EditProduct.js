// src/views/admin/EditProduct.js
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom"; // Import useParams and useHistory

const EditProduct = () => {
  const { id } = useParams(); // Get the product ID from the URL
  const history = useHistory(); // Get the history object

  // --- State for Form Fields (Updated for DB Schema) ---
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDescription: "", // Added
    price: "", // String initially (convert from cents on load)
    sku: "", // Added
    stock: "", // String initially
    status: "draft", // String initially
    brand: "", // Added
    categoryId: "", // Added (string initially)
  });

  // --- State for Image URLs (Array) ---
  const [imageUrls, setImageUrls] = useState([""]); // Initialize with one empty field, will be replaced by fetched data

  // --- State for Spec Highlights (Object) ---
  const [specHighlights, setSpecHighlights] = useState([{
    key: "",
    value: "",
  }]); // Initialize with one pair, will be replaced by fetched data

  // --- State for Loading (Optional, for API fetch) ---
  const [loading, setLoading] = useState(true); // Simulate loading state

  // --- State for Validation Errors ---
  const [errors, setErrors] = useState({});

  // --- Simulate fetching product data by ID (including new fields) ---
  // In a real app, you'd likely use useEffect to fetch data from an API
  // using the 'id' obtained from useParams.
  // For now, let's simulate finding the product data.
  const findProductById = (productId) => {
    // Simulate fetching from a list (in reality, this comes from state or API)
    // Let's use the same placeholder data as in Products.js for demonstration, adding new fields
    const products = [
      {
        id: 1,
        name: "Laptop Pro 15",
        description: "High-performance laptop.",
        short_description: "Powerful laptop",
        price_cents: 120000,
        sku: "LP15-2024",
        stock_quantity: 25,
        status: "active",
        brand: "TechCorp",
        category_id: "cat-uuid-1",
        image_urls: ["https://example.com/laptop.jpg"],
        spec_highlights: { "cores": 16, "memory_gb": 32 },
      },
      {
        id: 2,
        name: "Wireless Mouse X",
        description: "Ergonomic mouse.",
        short_description: "Ergonomic wireless mouse",
        price_cents: 2500,
        sku: "WMX-BLU",
        stock_quantity: 150,
        status: "active",
        brand: "MouseMakers",
        category_id: "cat-uuid-2",
        image_urls: [
          "https://example.com/mouse.jpg",
          "https://example.com/mouse-back.jpg",
        ],
        spec_highlights: {
          "connectivity": "Bluetooth",
          "battery_life_hours": 100,
        },
      },
      {
        id: 3,
        name: "Office Chair Elite",
        description: "Comfortable chair.",
        short_description: "Ergonomic office chair",
        price_cents: 15000,
        sku: "OCE-GRY",
        stock_quantity: 8,
        status: "active",
        brand: "ChairCo",
        category_id: "cat-uuid-3",
        image_urls: ["https://example.com/chair.jpg"],
        spec_highlights: { "material": "Leather", "weight_capacity_kg": 120 },
      },
      {
        id: 4,
        name: "Mechanical Keyboard RGB",
        description: "Backlit keyboard.",
        short_description: "RGB mechanical keyboard",
        price_cents: 8999,
        sku: "MKRGB-RED",
        stock_quantity: 0,
        status: "discontinued",
        brand: "KeyBoardz",
        category_id: "cat-uuid-2",
        image_urls: ["https://example.com/keyboard.jpg"],
        spec_highlights: {
          "switch_type": "Cherry MX Red",
          "layout": "Tenkeyless",
        },
      },
      {
        id: 5,
        name: "Smartphone Model Y",
        description: "Latest model.",
        short_description: "Flagship smartphone",
        price_cents: 89900,
        sku: "SM-Y-512GB",
        stock_quantity: 12,
        status: "active",
        brand: "Phoney Inc.",
        category_id: "cat-uuid-1",
        image_urls: [
          "https://example.com/phone-front.jpg",
          "https://example.com/phone-back.jpg",
        ],
        spec_highlights: { "storage_gb": 512, "camera_mp": 108 },
      },
      // Add more dummy data if needed, ensuring the ID exists and includes new fields
      {
        id: 6,
        name: "Bluetooth Headphones",
        description: "Noise cancelling.",
        short_description: "Wireless NC headphones",
        price_cents: 7500,
        sku: "BH-A2DP",
        stock_quantity: 45,
        status: "active",
        brand: "SoundMax",
        category_id: "cat-uuid-2",
        image_urls: ["https://example.com/headphones.jpg"],
        spec_highlights: { "driver_size_mm": 40, "battery_life_hours": 30 },
      },
      {
        id: 7,
        name: "External SSD 1TB",
        description: "Fast storage.",
        short_description: "Portable SSD",
        price_cents: 12000,
        sku: "ESSD-1TB",
        stock_quantity: 20,
        status: "active",
        brand: "DriveFast",
        category_id: "cat-uuid-1",
        image_urls: ["https://example.com/ssd.jpg"],
        spec_highlights: {
          "interface": "USB 3.2 Gen 2",
          "read_speed_mbps": 1050,
        },
      },
      {
        id: 8,
        name: "Desk Lamp LED",
        description: "Adjustable brightness.",
        short_description: "Touch-controlled lamp",
        price_cents: 3000,
        sku: "DL-LED-WHITE",
        stock_quantity: 100,
        status: "active",
        brand: "LightUp",
        category_id: "cat-uuid-4",
        image_urls: ["https://example.com/lamp.jpg"],
        spec_highlights: { "color_temp_range_k": "2700-6500", "power_w": 15 },
      },
      {
        id: 9,
        name: "USB-C Hub",
        description: "7-in-1 adapter.",
        short_description: "Multi-port hub",
        price_cents: 4000,
        sku: "UCH-7IN1",
        stock_quantity: 75,
        status: "active",
        brand: "PortMaster",
        category_id: "cat-uuid-2",
        image_urls: ["https://example.com/hub.jpg"],
        spec_highlights: { "ports": "USB-A x4, HDMI, USB-C PD, Ethernet" },
      },
      {
        id: 10,
        name: "Fitness Tracker",
        description: "Waterproof tracker.",
        short_description: "Activity tracker",
        price_cents: 9500,
        sku: "FT-WATERPROOF",
        stock_quantity: 30,
        status: "active",
        brand: "FitLife",
        category_id: "cat-uuid-5",
        image_urls: ["https://example.com/tracker.jpg"],
        spec_highlights: {
          "heart_rate_monitor": true,
          "water_resistance_rating": "5ATM",
        },
      },
    ];
    // Find the product with the given ID
    const found = products.find((p) => p.id == productId); // Use == to handle string vs number comparison from URL params
    if (found) {
      // Convert price from cents back to dollars for the form
      return {
        ...found,
        price: (found.price_cents / 100).toFixed(2), // Convert cents to string formatted as price
      };
    }
    return null;
  };

  // --- Fetch Data on Mount (Simulated) ---
  useEffect(() => {
    const productToEdit = findProductById(id);
    if (productToEdit) {
      // Pre-populate the form fields with the product data
      setFormData({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        shortDescription: productToEdit.short_description || "", // Map DB field to frontend field name
        price: productToEdit.price?.toString() || "", // Convert number to string for input (already converted from cents in findProductById)
        sku: productToEdit.sku || "",
        stock: productToEdit.stock_quantity?.toString() || "", // Convert number to string for input
        status: productToEdit.status || "draft", // Map DB field to frontend field name
        brand: productToEdit.brand || "", // Map DB field to frontend field name
        categoryId: productToEdit.category_id || "", // Map DB field to frontend field name
      });
      // Pre-populate the image URLs array
      setImageUrls(
        productToEdit.image_urls?.length > 0
          ? [...productToEdit.image_urls]
          : [""],
      ); // Ensure at least one empty field if array is empty
      // Pre-populate the spec highlights object
      const specArray = Object.entries(productToEdit.spec_highlights || {}).map(
        ([key, value]) => ({ key, value })
      );
      setSpecHighlights(
        specArray.length > 0 ? specArray : [{ key: "", value: "" }],
      ); // Ensure at least one pair if object is empty
    } else {
      // Handle case where product ID is not found
      console.error(`Product with ID ${id} not found.`);
      // Maybe redirect to 404 or product list?
      // history.push('/admin/products'); // Example redirect
    }
    setLoading(false); // Stop loading simulation
  }, [id]); // Run effect when 'id' changes

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
    const updatedProductData = {
      id: parseInt(id), // Use the ID from the URL (or keep as string if UUID)
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
      updated_at: new Date().toISOString(), // Mock timestamp
      // created_at, deleted_at are managed by the backend
    };

    console.log(
      "Submitted Updated Product Data (Mock Backend Format):",
      updatedProductData,
    );

    // --- Navigate back to the product list ---
    history.push("/admin/products"); // Use history.push to navigate

    // Optional: Show a success message
    alert(
      `Product ID ${id} updated successfully (mocked backend)! Check the console.`,
    );
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

  // --- Show loading message while fetching data (simulated) ---
  if (loading) {
    return (
      <div className="w-full px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div className="block w-full overflow-x-auto p-4 text-center">
            <p>Loading product data...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Show error if product not found (simulated) ---
  const productToEdit = findProductById(id);
  if (!productToEdit) {
    return (
      <div className="w-full px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div className="block w-full overflow-x-auto p-4 text-center">
            <p className="text-red-500">Product with ID {id} not found.</p>
            <button
              onClick={handleCancel}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            >
              Back to Product List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-lg text-blueGray-700">
                Edit Product ID: {id}
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
                  step="0.01"
                  min="0"
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
                  min="0"
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
                Update Product
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

export default EditProduct;
