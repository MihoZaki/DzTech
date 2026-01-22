// src/views/admin/Products.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory

// components
// We'll define the table structure directly here for now, using a simplified CardTable as a wrapper
// or potentially creating a new specific component like CardProductTable.

// Placeholder component using the CardTable's container styles
const CardProductList = ({ color = "light" }) => {
  const history = useHistory(); // Get the history object

  // --- MANAGE PRODUCT LIST STATE (Updated to include image_urls) ---
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Laptop Pro 15",
      sku: "LP15-2024",
      price: "1200.00 DZD",
      stock: 25,
      category: "Electronics",
      status: "Active",
      brand: "TechCorp",
      image_urls: [
        "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 2,
      name: "Wireless Mouse X",
      sku: "WMX-BLU",
      price: "25.00 DZD",
      stock: 150,
      category: "Accessories",
      status: "Active",
      brand: "MouseMakers",
      image_urls: [
        "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
        "https://example.com/mouse-back.jpg",
      ],
    },
    {
      id: 3,
      name: "Office Chair Elite",
      sku: "OCE-GRY",
      price: "150.00 DZD",
      stock: 8,
      category: "Furniture",
      status: "Low Stock",
      brand: "ChairCo",
      image_urls: [
        "https://images.unsplash.com/photo-1592078615290-033ee584e267?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 4,
      name: "Mechanical Keyboard RGB",
      sku: "MKRGB-RED",
      price: "89.99 DZD",
      stock: 0,
      category: "Accessories",
      status: "Out of Stock",
      brand: "KeyBoardz",
      image_urls: [
        "https://images.unsplash.com/photo-1546817982-ea6beebbf6ca?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 5,
      name: "Smartphone Model Y",
      sku: "SM-Y-512GB",
      price: "899.00 DZD",
      stock: 12,
      category: "Electronics",
      status: "Active",
      brand: "Phoney Inc.",
      image_urls: [
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
        "https://example.com/phone-back.jpg",
      ],
    },
    // Add more dummy data if needed for pagination testing, including image_urls
    {
      id: 6,
      name: "Bluetooth Headphones",
      sku: "BH-A2DP",
      price: "75.00 DZD",
      stock: 45,
      category: "Accessories",
      status: "Active",
      brand: "SoundMax",
      image_urls: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 7,
      name: "External SSD 1TB",
      sku: "ESSD-1TB",
      price: "120.00 DZD",
      stock: 20,
      category: "Electronics",
      status: "Active",
      brand: "DriveFast",
      image_urls: [
        "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 8,
      name: "Desk Lamp LED",
      sku: "DL-LED-WHITE",
      price: "30.00 DZD",
      stock: 100,
      category: "Home",
      status: "Active",
      brand: "LightUp",
      image_urls: [
        "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 9,
      name: "USB-C Hub",
      sku: "UCH-7IN1",
      price: "40.00 DZD",
      stock: 75,
      category: "Accessories",
      status: "Active",
      brand: "PortMaster",
      image_urls: [
        "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
    {
      id: 10,
      name: "Fitness Tracker",
      sku: "FT-WATERPROOF",
      price: "95.00 DZD",
      stock: 30,
      category: "Wearables",
      status: "Active",
      brand: "FitLife",
      image_urls: [
        "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&q=80",
      ],
    },
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

  // --- FILTER AND SORT PRODUCTS ---
  let filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply sorting if a sort key is set
  if (sortConfig.key) {
    filteredProducts.sort((a, b) => {
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
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // --- HANDLE PAGINATION ---
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- HANDLE ADD PRODUCT BUTTON CLICK (Updated for routing) ---
  const handleAddProductClick = () => {
    // Navigate to the add product page
    history.push("/admin/products/new"); // Use history.push
  };

  // --- HANDLE EDIT BUTTON CLICK (Updated for routing) ---
  const handleEditClick = (productId) => {
    console.log(`Edit product clicked for ID: ${productId}`);
    // Navigate to the edit product page for the specific ID
    history.push(`/admin/products/${productId}/edit`); // Use history.push with ID
  };

  // --- HANDLE DELETE BUTTON CLICK ---
  const handleDeleteClick = (productId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete product ID: ${productId}?`,
    );
    if (confirmed) {
      console.log(`Delete product confirmed for ID: ${productId}`);
      setProducts((prevProducts) =>
        prevProducts.filter((p) => p.id !== productId)
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
              Products List
            </h3>
          </div>
          <div className="relative w-full px-4 max-w-full flex-grow-0 flex-shrink-0 md:max-w-max md:flex-grow md:flex-shrink md:basis-auto">
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white active:bg-indigo-600 text-sm font-bold uppercase px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 shadow-md"
              type="button"
              onClick={handleAddProductClick} // Handler updated
            >
              <i className="fas fa-plus mr-2"></i>
              Add Product
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
              placeholder="Search products by name or SKU..."
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
              {/* NEW: Add Image Header */}
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
              >
                Image
              </th>
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
              {/* NEW: Add Brand Header */}
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("brand")}
              >
                Brand
                {sortConfig.key === "brand" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("sku")}
              >
                SKU
                {sortConfig.key === "sku" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("price")}
              >
                Price
                {sortConfig.key === "price" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("stock")}
              >
                Stock
                {sortConfig.key === "stock" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("category")}
              >
                Category
                {sortConfig.key === "category" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("status")}
              >
                Status
                {sortConfig.key === "status" &&
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
            {currentItems.map((product) => (
              <tr key={product.id}>
                {/* NEW: Add Image Cell */}
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.image_urls && product.image_urls.length > 0
                    ? (
                      <img
                        src={product.image_urls[0]} // Display the first image URL
                        alt={product.name} // Use product name as alt text
                        className="h-12 w-12 object-cover rounded border border-gray-300 shadow" // Set dimensions, styling
                      />
                    )
                    : (
                      <div className="h-12 w-12 flex items-center justify-center bg-gray-200 text-gray-500 rounded border border-gray-300 shadow">
                        <i className="fas fa-image"></i>{" "}
                        {/* Or any placeholder icon */}
                      </div>
                    )}
                </td>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                  {product.id}
                </th>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.name}
                </td>
                {/* NEW: Add Brand Cell */}
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.brand}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.sku}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.price}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <span
                    className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.stock > 10
                        ? "bg-emerald-100 text-emerald-800"
                        : product.stock > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {product.category}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <span
                    className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : product.status === "Low Stock"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right flex items-center justify-end space-x-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleEditClick(product.id)} // Handler updated
                  >
                    <i className="fas fa-edit mr-1"></i> Edit
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleDeleteClick(product.id)}
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
            {Math.min(indexOfLastItem, filteredProducts.length)}
          </span>{" "}
          of <span className="font-medium">{filteredProducts.length}</span>{" "}
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

// --- RENAMED: Export the main component as Products ---
export default function Products() {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardProductList />
        </div>
      </div>
    </>
  );
}
