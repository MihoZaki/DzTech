// src/views/admin/AddDeliveryService.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory for navigation

const AddDeliveryService = () => {
  const history = useHistory(); // Get the history object

  // --- State for Form Fields (Based on potential DB Schema) ---
  const [formData, setFormData] = useState({
    name: "",
    minPrice: "", // String initially, parse to number on submit
    maxPrice: "", // String initially, parse to number on submit (can be null)
    estimatedDays: "", // String initially, parse to number on submit
    active: true, // Boolean
  });

  // --- State for Validation Errors ---
  const [errors, setErrors] = useState({});

  // --- Handle Input Changes ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value, // Handle checkbox differently
    }));

    // Clear error for this field when user starts typing or toggling
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // --- Validate Form Data ---
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.minPrice.trim()) {
      newErrors.minPrice = "Minimum Price is required.";
    } else if (
      isNaN(parseFloat(formData.minPrice)) || parseFloat(formData.minPrice) < 0
    ) {
      newErrors.minPrice = "Minimum Price must be a valid non-negative number.";
    }
    // maxPrice is optional, but if provided, it must be greater than minPrice
    if (formData.maxPrice.trim() && !isNaN(parseFloat(formData.maxPrice))) {
      if (parseFloat(formData.maxPrice) < parseFloat(formData.minPrice)) {
        newErrors.maxPrice =
          "Maximum Price must be greater than or equal to Minimum Price.";
      }
    } else if (
      formData.maxPrice.trim() && isNaN(parseFloat(formData.maxPrice))
    ) {
      newErrors.maxPrice =
        "Maximum Price must be a valid number or left blank.";
    }
    if (!formData.estimatedDays.trim()) {
      newErrors.estimatedDays = "Estimated Days is required.";
    } else if (
      isNaN(parseInt(formData.estimatedDays)) ||
      parseInt(formData.estimatedDays) < 0
    ) {
      newErrors.estimatedDays =
        "Estimated Days must be a valid non-negative integer.";
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
    const serviceData = {
      id: `DS-${Date.now()}`, // Simple temporary ID generation for simulation
      name: formData.name,
      minPrice: parseFloat(formData.minPrice), // Convert string to number
      maxPrice: formData.maxPrice.trim() ? parseFloat(formData.maxPrice) : null, // Convert to number or null
      estimatedDays: parseInt(formData.estimatedDays), // Convert string to number
      active: formData.active, // Boolean value
      // createdAt: new Date().toISOString(), // Mock timestamp (managed by backend)
    };

    console.log(
      "Submitted Delivery Service Data (Mock Backend Format):",
      serviceData,
    );

    // --- Navigate back to the delivery service list ---
    history.push("/admin/delivery-services"); // Use history.push to navigate

    // Optional: Show a success message
    alert(
      "Delivery Service added successfully (mocked backend)! Check the console.",
    );
  };

  // --- Handle Cancel Button ---
  const handleCancel = () => {
    // Navigate back to the delivery service list
    history.push("/admin/delivery-services");
  };

  return (
    <div className="w-full px-4">
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
        <div className="rounded-t mb-0 px-4 py-3 border-0">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full px-4 max-w-full flex-grow flex-1">
              <h3 className="font-semibold text-lg text-blueGray-700">
                Add New Delivery Service
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
                Service Name *
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

            {/* Min Price and Estimated Days Fields (Inline) */}
            <div className="grid md:grid-cols-2 md:gap-6">
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="minPrice"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Minimum Price (DZD) *
                </label>
                <input
                  type="number"
                  name="minPrice"
                  id="minPrice"
                  value={formData.minPrice}
                  onChange={handleChange}
                  step="0.01" // Allow decimal prices
                  min="0" // Ensure non-negative
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.minPrice ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.minPrice && (
                  <p className="mt-2 text-xs text-red-600">{errors.minPrice}</p>
                )}
              </div>
              <div className="relative z-0 w-full mb-6 group">
                <label
                  htmlFor="estimatedDays"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Estimated Delivery Days *
                </label>
                <input
                  type="number"
                  name="estimatedDays"
                  id="estimatedDays"
                  value={formData.estimatedDays}
                  onChange={handleChange}
                  min="0" // Ensure non-negative
                  className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                    errors.estimatedDays ? "border-red-600" : "border-gray-300"
                  } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  placeholder=" "
                />
                {errors.estimatedDays && (
                  <p className="mt-2 text-xs text-red-600">
                    {errors.estimatedDays}
                  </p>
                )}
              </div>
            </div>

            {/* Max Price Field (Optional) */}
            <div className="relative z-0 w-full mb-6 group">
              <label
                htmlFor="maxPrice"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Maximum Price (DZD) (Optional)
              </label>
              <input
                type="number"
                name="maxPrice"
                id="maxPrice"
                value={formData.maxPrice}
                onChange={handleChange}
                step="0.01" // Allow decimal prices
                min="0" // Ensure non-negative if entered
                className={`block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 ${
                  errors.maxPrice ? "border-red-600" : "border-gray-300"
                } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                placeholder="Leave blank for no upper limit"
              />
              {errors.maxPrice && (
                <p className="mt-2 text-xs text-red-600">{errors.maxPrice}</p>
              )}
            </div>

            {/* Active Status Field (Checkbox) */}
            <div className="flex items-start mb-6">
              <div className="flex items-center h-5">
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
              <label
                htmlFor="active"
                className="ms-2 text-sm font-medium text-gray-900"
              >
                Active
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
              >
                Add Delivery Service
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

export default AddDeliveryService;
