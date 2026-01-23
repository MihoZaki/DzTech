// src/views/admin/DeliveryServices.js
import React, { useState } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory for navigation

// Placeholder component using the CardTable's container styles
const CardDeliveryServiceList = ({ color = "light" }) => {
  const history = useHistory(); // Get the history object

  // --- MANAGE DELIVERY SERVICE LIST STATE (Placeholder Data) ---
  // Based on potential DB schema considerations (name, min_price, max_price, estimated_days, active)
  const [deliveryServices, setDeliveryServices] = useState([
    {
      id: "DS-001",
      name: "Standard Delivery",
      minPrice: 0,
      maxPrice: 50000,
      estimatedDays: 7,
      active: true,
    },
    {
      id: "DS-002",
      name: "Express Delivery",
      minPrice: 50001,
      maxPrice: 100000,
      estimatedDays: 3,
      active: true,
    },
    {
      id: "DS-003",
      name: "Overnight Express",
      minPrice: 100001,
      maxPrice: null,
      estimatedDays: 1,
      active: false,
    }, // Max price null means no upper limit
    {
      id: "DS-004",
      name: "Local Pickup",
      minPrice: 0,
      maxPrice: null,
      estimatedDays: 0,
      active: true,
    },
    {
      id: "DS-005",
      name: "International Standard",
      minPrice: 150000,
      maxPrice: 500000,
      estimatedDays: 14,
      active: true,
    },
    {
      id: "DS-006",
      name: "International Express",
      minPrice: 500001,
      maxPrice: null,
      estimatedDays: 7,
      active: true,
    },
    {
      id: "DS-007",
      name: "Economy Delivery",
      minPrice: 0,
      maxPrice: 25000,
      estimatedDays: 10,
      active: true,
    },
    {
      id: "DS-008",
      name: "Heavy Goods Delivery",
      minPrice: 100000,
      maxPrice: null,
      estimatedDays: 14,
      active: true,
    },
    {
      id: "DS-009",
      name: "Same Day Delivery",
      minPrice: 200000,
      maxPrice: null,
      estimatedDays: 0,
      active: false,
    },
    {
      id: "DS-010",
      name: "Weekend Delivery",
      minPrice: 0,
      maxPrice: null,
      estimatedDays: 2,
      active: true,
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

  // --- FILTER AND SORT DELIVERY SERVICES ---
  let filteredDeliveryServices = deliveryServices.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
    // Add more filters if needed (e.g., by minPrice, active status)
  );

  // Apply sorting if a sort key is set
  if (sortConfig.key) {
    filteredDeliveryServices.sort((a, b) => {
      // Special handling for minPrice and maxPrice (which might be null)
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Treat null maxPrice as infinity for sorting purposes
      if (sortConfig.key === "maxPrice") {
        aValue = aValue === null ? Infinity : aValue;
        bValue = bValue === null ? Infinity : bValue;
      }

      // Convert to string for consistent comparison, handling numbers and booleans
      aValue = aValue?.toString().toLowerCase() ?? "";
      bValue = bValue?.toString().toLowerCase() ?? "";

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
  const totalPages = Math.ceil(filteredDeliveryServices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDeliveryServices.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // --- HANDLE PAGINATION ---
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- HANDLE ADD DELIVERY SERVICE BUTTON CLICK (Updated for routing) ---
  const handleAddDeliveryServiceClick = () => {
    // Navigate to the add delivery service page
    history.push("/admin/delivery-services/new"); // Use history.push
  };

  // --- HANDLE EDIT BUTTON CLICK (Updated for routing) ---
  const handleEditClick = (serviceId) => {
    console.log(`Edit delivery service clicked for ID: ${serviceId}`);
    // Navigate to the edit delivery service page for the specific ID
    history.push(`/admin/delivery-services/${serviceId}/edit`); // Use history.push with ID
  };

  // --- HANDLE DELETE BUTTON CLICK ---
  const handleDeleteClick = (serviceId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete delivery service ID: ${serviceId}?`,
    );
    if (confirmed) {
      console.log(`Delete delivery service confirmed for ID: ${serviceId}`);
      setDeliveryServices((prevServices) =>
        prevServices.filter((ds) => ds.id !== serviceId)
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
              Delivery Services List
            </h3>
          </div>
          {/* NEW: Add "Add Delivery Service" button */}
          <div className="relative w-full px-4 max-w-full flex-grow-0 flex-shrink-0 md:max-w-max md:flex-grow md:flex-shrink md:basis-auto">
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white active:bg-indigo-600 text-sm font-bold uppercase px-4 py-2 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 shadow-md"
              type="button"
              onClick={handleAddDeliveryServiceClick} // Handler updated
            >
              <i className="fas fa-plus mr-2"></i>
              Add Delivery Service
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
              placeholder="Search delivery services by name..."
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
                onClick={() => handleSortRequest("minPrice")}
              >
                Min Price
                {sortConfig.key === "minPrice" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("maxPrice")}
              >
                Max Price
                {sortConfig.key === "maxPrice" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("estimatedDays")}
              >
                Est. Days
                {sortConfig.key === "estimatedDays" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("active")}
              >
                Active
                {sortConfig.key === "active" &&
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
            {currentItems.map((service) => (
              <tr key={service.id}>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                  {service.id}
                </th>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {service.name}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {service.minPrice} DZD {/* Assuming DZD currency */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {service.maxPrice !== null
                    ? `${service.maxPrice} DZD`
                    : "No Limit"}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {service.estimatedDays}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <span
                    className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      service.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {service.active ? "Yes" : "No"}
                  </span>
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right flex items-center justify-end space-x-2">
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleEditClick(service.id)} // Handler updated
                  >
                    <i className="fas fa-edit mr-1"></i> Edit
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full shadow-md text-xs ease-linear transition-all duration-150 flex items-center"
                    onClick={() => handleDeleteClick(service.id)}
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
            {Math.min(indexOfLastItem, filteredDeliveryServices.length)}
          </span>{" "}
          of{" "}
          <span className="font-medium">{filteredDeliveryServices.length}</span>
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

export default function DeliveryServices() {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardDeliveryServiceList />
        </div>
      </div>
    </>
  );
}
