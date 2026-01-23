// src/views/admin/Categories.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory for navigation

// Placeholder component using the CardTable's container styles
const CardCategoryList = ({ color = "light" }) => {
  const history = useHistory(); // Get the history object

  // --- MANAGE CATEGORY LIST STATE (Updated to match DB Schema) ---
  const [categories, setCategories] = useState([
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
    // Add seeded categories
    {
      id: "CAT-011",
      name: "CPU",
      slug: "cpu",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-01",
    },
    {
      id: "CAT-012",
      name: "GPU",
      slug: "gpu",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-02",
    },
    {
      id: "CAT-013",
      name: "Motherboard",
      slug: "motherboard",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-03",
    },
    {
      id: "CAT-014",
      name: "RAM",
      slug: "ram",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-04",
    },
    {
      id: "CAT-015",
      name: "Storage",
      slug: "storage",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-05",
    },
    {
      id: "CAT-016",
      name: "Power Supply",
      slug: "psu",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-06",
    },
    {
      id: "CAT-017",
      name: "Case",
      slug: "case",
      type: "component",
      parentId: "CAT-001",
      createdAt: "2023-06-07",
    },
    {
      id: "CAT-018",
      name: "Laptop",
      slug: "laptop",
      type: "laptop",
      parentId: null,
      createdAt: "2023-06-08",
    },
    {
      id: "CAT-019",
      name: "Accessories",
      slug: "accessories",
      type: "accessory",
      parentId: null,
      createdAt: "2023-06-09",
    }, // Duplicate name example, different slug/type might be better
  ]);

  // --- MANAGE SORTING STATE ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // --- HANDLE HEADER CLICK FOR SORTING ---
  const handleSortRequest = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // --- MANAGE PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Define how many items to show per page

  // --- MANAGE SEARCH TERM STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // --- FILTER AND SORT CATEGORIES ---
  let filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.slug.toLowerCase().includes(searchTerm.toLowerCase()) // Search by slug too
    // category.description.toLowerCase().includes(searchTerm.toLowerCase()) // Removed description
  );

  // Apply sorting if a sort key is set
  if (sortConfig.key) {
    filteredCategories.sort((a, b) => {
      const aValue = a[sortConfig.key]?.toString().toLowerCase() ?? "";
      const bValue = b[sortConfig.key]?.toString().toLowerCase() ?? "";

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // --- HANDLE PAGINATION ---
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- HANDLE ADD CATEGORY BUTTON CLICK (Updated for routing) ---
  const handleAddCategoryClick = () => {
    // Navigate to the add category page
    history.push("/admin/categories/new"); // Use history.push
  };

  // --- HANDLE EDIT BUTTON CLICK (Updated for routing) ---
  const handleEditClick = (categoryId) => {
    console.log(`Edit category clicked for ID: ${categoryId}`);
    // Navigate to the edit category page for the specific ID
    history.push(`/admin/categories/${categoryId}/edit`); // Use history.push with ID
  };

  // --- HANDLE DELETE BUTTON CLICK ---
  const handleDeleteClick = (categoryId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete category ID: ${categoryId}?`,
    );
    if (confirmed) {
      console.log(`Delete category confirmed for ID: ${categoryId}`);
      setCategories((prevCategories) =>
        prevCategories.filter((c) => c.id !== categoryId)
      );
    } else {
      console.log("Delete cancelled.");
    }
  };

  return (
    <div
      className={"relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded " +
        (color === "light" ? "bg-white" : "bg-lightBlue-900 text-white")}
    >
      <div className="rounded-t mb-0 px-4 py-3 border-0">
        <div className="flex flex-wrap items-center justify-between">
          <div className="relative w-full px-4 max-w-full flex-grow flex-1">
            <h3
              className={"font-semibold text-lg " +
                (color === "light" ? "text-blueGray-700" : "text-white")}
            >
              Categories List
            </h3>
          </div>
          {/* NEW: Add "Add Category" button */}
          <div className="relative w-full px-4 max-w-full flex-grow-0 flex-shrink-0 md:max-w-max md:flex-grow md:flex-shrink md:basis-auto">
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white active:bg-indigo-600 text-sm font-bold uppercase px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 shadow-md"
              type="button"
              onClick={handleAddCategoryClick} // Handler updated
            >
              <i className="fas fa-plus mr-2"></i>
              Add Category
            </button>
          </div>
        </div>
        <div className="w-full px-4 mt-4">
          <div className="relative flex w-full flex-wrap items-center">
            <span className="z-10 h-full leading-snug font-normal absolute text-center text-blueGray-300 bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3 pointer-events-none">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              placeholder="Search categories by name or slug..."
              className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 relative bg-white bg-white rounded text-sm shadow outline-none focus:outline-none focus:ring w-full"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>
      <div className="block w-full overflow-x-auto">
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("id")}
              >
                ID
                {sortConfig.key === "id" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("name")}
              >
                Name
                {sortConfig.key === "name" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("slug")}
              >
                Slug
                {sortConfig.key === "slug" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("type")}
              >
                Type
                {sortConfig.key === "type" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("parentId")}
              >
                Parent ID
                {sortConfig.key === "parentId" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("createdAt")}
              >
                Created At
                {sortConfig.key === "createdAt" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((category) => (
              <tr key={category.id}>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                  {category.id}
                </th>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {category.name}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {category.slug}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {category.type}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {category.parentId || "-"} {/* Show '-' if no parent */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {new Date(category.createdAt).toLocaleDateString()}{" "}
                  {/* Format date */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right flex items-center justify-end space-x-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleEditClick(category.id)} // Handler updated
                  >
                    <i className="fas fa-edit mr-1"></i> Edit
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleDeleteClick(category.id)}
                  >
                    <i className="fas fa-trash mr-1"></i> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to
          {" "}
          <span className="font-medium">
            {Math.min(indexOfLastItem, filteredCategories.length)}
          </span>{" "}
          of <span className="font-medium">{filteredCategories.length}</span>
          {" "}
          results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
            }`}
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  currentPage === pageNum
                    ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                } border`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Categories() {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardCategoryList />
        </div>
      </div>
    </>
  );
}
