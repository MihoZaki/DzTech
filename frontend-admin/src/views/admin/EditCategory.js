// src/views/admin/EditCategory.js
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom"; // Import useParams and useHistory

const EditCategory = () => {
  const { id } = useParams(); // Get the category ID from the URL
  const history = useHistory(); // Get the history object

  // --- State for Form Fields (Updated for DB Schema) ---
  const [formData, setFormData] = useState({
    name: "",
    // description: '', // Removed as it's not in the DB
    type: "", // Added (will be a dropdown)
    parentId: "", // Added (will be a dropdown, optional)
  });

  // --- State for Loading (Optional, for API fetch) ---
  const [loading, setLoading] = useState(true); // Simulate loading state

  // --- State for Validation Errors ---
  const [errors, setErrors] = useState({});

  // --- Simulate fetching category data by ID (including new fields) ---
  // In a real app, you'd likely use useEffect to fetch data from an API
  // using the 'id' obtained from useParams.
  // For now, let's simulate finding the category data.
  const findCategoryById = (categoryId) => {
    // Simulate fetching from a list (in reality, this comes from state or API)
    // Let's use the same placeholder data as in Categories.js for demonstration
    // Adding 'type' and 'parentId' to the mock data
    const categories = [
      {
        id: "CAT-001",
        name: "Electronics",
        slug: "electronics",
        type: "component",
        parentId: null,
        createdAt: "2023-01-10",
      },
      {
        id: "CAT-002",
        name: "Accessories",
        slug: "accessories",
        type: "accessory",
        parentId: null,
        createdAt: "2023-01-12",
      },
      {
        id: "CAT-003",
        name: "Furniture",
        slug: "furniture",
        type: "furniture",
        parentId: null,
        createdAt: "2023-02-01",
      },
      {
        id: "CAT-004",
        name: "Home",
        slug: "home",
        type: "home",
        parentId: null,
        createdAt: "2023-02-15",
      },
      {
        id: "CAT-005",
        name: "Wearables",
        slug: "wearables",
        type: "wearable",
        parentId: null,
        createdAt: "2023-03-05",
      },
      {
        id: "CAT-006",
        name: "Books",
        slug: "books",
        type: "book",
        parentId: null,
        createdAt: "2023-03-20",
      },
      {
        id: "CAT-007",
        name: "Clothing",
        slug: "clothing",
        type: "clothing",
        parentId: null,
        createdAt: "2023-04-10",
      },
      {
        id: "CAT-008",
        name: "Sports",
        slug: "sports",
        type: "sport",
        parentId: null,
        createdAt: "2023-04-25",
      },
      {
        id: "CAT-009",
        name: "Toys",
        slug: "toys",
        type: "toy",
        parentId: null,
        createdAt: "2023-05-10",
      },
      {
        id: "CAT-010",
        name: "Beauty",
        slug: "beauty",
        type: "beauty",
        parentId: null,
        createdAt: "2023-05-25",
      },
      // Add more categories if needed, including the seeded ones
      {
        id: "CAT-011",
        name: "CPU",
        slug: "cpu",
        type: "component",
        parentId: "CAT-001",
        createdAt: "2023-06-01",
      }, // Example sub-category
    ];
    // Find the category with the given ID
    return categories.find((c) => c.id === categoryId);
  };

  // --- Fetch Data on Mount (Simulated) ---
  useEffect(() => {
    const categoryToEdit = findCategoryById(id);
    if (categoryToEdit) {
      // Pre-populate the form fields with the category data
      setFormData({
        name: categoryToEdit.name || "",
        // description: categoryToEdit.description || '', // Removed
        type: categoryToEdit.type || "", // Map DB field to frontend field name
        parentId: categoryToEdit.parentId || "", // Map DB field to frontend field name
      });
    } else {
      // Handle case where category ID is not found
      console.error(`Category with ID ${id} not found.`);
      // Maybe redirect to 404 or category list?
      // history.push('/admin/categories'); // Example redirect
    }
    setLoading(false); // Stop loading simulation
  }, [id]); // Run effect when 'id' changes

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

  // --- Validate Form Data (Updated for new fields) ---
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.type.trim()) {
      newErrors.type = "Type is required."; // Added validation
    }
    // parentId is optional, no validation needed here unless it must reference a valid existing ID

    return newErrors;
  };

  // --- Handle Form Submission (Mock Backend - Slug Generated by Backend) ---
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Stop if validation fails
    }

    // --- Prepare data for submission (Mock Backend Format) ---
    // Note: In a real app, the backend generates the slug.
    // The frontend sends id, name, type, parentId.
    // The backend returns the full object including the potentially updated slug.
    const updatedCategoryData = {
      id: id, // Use the ID from the URL
      name: formData.name,
      // slug: ... // Backend might regenerate slug from name, or keep existing if name didn't change
      type: formData.type,
      parentId: formData.parentId || null, // Send null if no parent selected
      // updatedAt: new Date().toISOString(), // Backend sets this
    };

    console.log(
      "Submitted Updated Category Data (Sent to Backend):",
      updatedCategoryData,
    );

    // --- Simulate receiving updated data from backend ---
    // In a real app, you'd get this from the API response.
    const receivedUpdatedCategoryData = {
      ...updatedCategoryData,
      // slug: ... // Backend might send back the updated slug
      updatedAt: new Date().toISOString(), // Simulate backend timestamp
    };

    console.log(
      "Received Updated Category Data (From Backend):",
      receivedUpdatedCategoryData,
    );

    // --- Navigate back to the category list ---
    history.push("/admin/categories"); // Use history.push to navigate

    // Optional: Show a success message
    alert(
      `Category ID ${id} updated successfully (mocked backend)! Check the console.`,
    );
  };

  // --- Handle Cancel Button ---
  const handleCancel = () => {
    // Navigate back to the category list
    history.push("/admin/categories");
  };

  // --- Options for Type Dropdown (Mock) ---
  const typeOptions = [
    { value: "", label: "Select a type..." },
    { value: "component", label: "Component" },
    { value: "laptop", label: "Laptop" },
    { value: "accessory", label: "Accessory" },
    { value: "furniture", label: "Furniture" }, // Example, add others as needed
    { value: "home", label: "Home" },
    { value: "wearable", label: "Wearable" },
    { value: "book", label: "Book" },
    { value: "clothing", label: "Clothing" },
    { value: "sport", label: "Sport" },
    { value: "toy", label: "Toy" },
    { value: "beauty", label: "Beauty" },
  ];

  // --- Options for Parent Dropdown (Mock) ---
  // In a real app, this would be fetched from the backend API (GET /api/v1/categories)
  const parentOptions = [
    { value: "", label: "No Parent (Top-Level)" },
    { value: "CAT-001", label: "Electronics" },
    { value: "CAT-002", label: "Accessories" },
    // Add more categories as they are created/fetched
  ];

  // --- Show loading message while fetching data (simulated) ---
  if (loading) {
    return (
      <div className="w-full px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div className="block w-full overflow-x-auto p-4 text-center">
            <p>Loading category data...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Show error if category not found (simulated) ---
  const categoryToEdit = findCategoryById(id);
  if (!categoryToEdit) {
    return (
      <div className="w-full px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded bg-white">
          <div className="block w-full overflow-x-auto p-4 text-center">
            <p className="text-red-500">Category with ID {id} not found.</p>
            <button
              onClick={handleCancel}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            >
              Back to Category List
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
                Edit Category ID: {id}
              </h3>
            </div>
          </div>
        </div>
        <div className="block w-full overflow-x-auto p-4">
          <form onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-blueGray-600 mb-4">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="relative z-0 w-full mb-6 group">
                  <label
                    htmlFor="name"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Category Name *
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

                {/* Type Field (Added) */}
                <div className="relative z-0 w-full mb-6 group">
                  <label
                    htmlFor="type"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Type * {/* Added */}
                  </label>
                  <select
                    name="type"
                    id="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={`block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 ${
                      errors.type ? "border-red-600" : "border-gray-300"
                    } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="mt-2 text-xs text-red-600">{errors.type}</p>
                  )}
                </div>

                {/* Parent ID Field (Added - Optional) */}
                <div className="relative z-0 w-full mb-6 group">
                  <label
                    htmlFor="parentId"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Parent Category
                  </label>
                  <select
                    name="parentId"
                    id="parentId"
                    value={formData.parentId}
                    onChange={handleChange}
                    className={`block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 ${
                      errors.parentId ? "border-red-600" : "border-gray-300"
                    } appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer`}
                  >
                    {parentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.parentId && (
                    <p className="mt-2 text-xs text-red-600">
                      {errors.parentId}
                    </p>
                  )}
                </div>

                {/* Placeholder for future fields if needed */}
                <div className="relative z-0 w-full mb-6 group invisible">
                  {/* This div acts as a placeholder to maintain the grid layout if needed */}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
              >
                Update Category
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

export default EditCategory;
