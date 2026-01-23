// src/views/admin/Orders.js
import React, { useEffect, useRef, useState } from "react"; // Add useEffect and useRef
import { createPopper } from "@popperjs/core"; // Import createPopper
import { useHistory } from "react-router-dom"; // Import useHistory

// NEW: Dropdown Component for Order Actions using Popper
const OrderActionDropdown = ({ orderId, currentStatus, onUpdateStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnDropdownRef = useRef(null); // Use useRef instead of createRef
  const popoverDropdownRef = useRef(null); // Use useRef instead of createRef

  // Possible status transitions (example)
  const possibleTransitions = {
    "pending": ["processing", "cancelled"],
    "processing": ["shipped", "cancelled"],
    "shipped": ["delivered"],
    "delivered": ["returned"], // Or maybe 'completed' is final?
    "cancelled": [],
    "returned": ["refunded"],
    "refunded": [],
    "completed": [],
  };

  const allowedTransitions = possibleTransitions[currentStatus.toLowerCase()] ||
    [];

  // Initialize Popper when dropdown opens
  useEffect(() => {
    let popperInstance = null;

    if (isOpen && btnDropdownRef.current && popoverDropdownRef.current) {
      popperInstance = createPopper(
        btnDropdownRef.current,
        popoverDropdownRef.current,
        {
          placement: "bottom-start", // Position below the button, aligned to the start
        },
      );
    }

    // Cleanup function to destroy the popper instance when component unmounts or deps change
    return () => {
      if (popperInstance) {
        popperInstance.destroy();
      }
    };
  }, [isOpen]); // Only re-run when isOpen changes

  const openDropdownPopover = () => {
    setIsOpen(true);
    // createPopper call is now handled by useEffect
  };

  const closeDropdownPopover = () => {
    setIsOpen(false);
  };

  const handleViewDetails = () => {
    // Navigate to order details page (not implemented yet)
    console.log(`View details for order ${orderId}`);
    closeDropdownPopover(); // Close after action
    // history.push(`/admin/orders/${orderId}`); // Enable when OrderDetail page is created
  };

  const handleStatusChange = (newStatus) => {
    console.log(`Change status for order ${orderId} to ${newStatus}`);
    onUpdateStatus(orderId, newStatus); // Call parent function to update state
    closeDropdownPopover(); // Close after action
  };

  return (
    <>
      {/* Button container - no explicit relative needed as Popper handles positioning */}
      <div className="relative inline-flex align-middle">
        {/* Added align-middle for consistency, removed text-left/w-full styling from button container div */}
        <button
          className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
          type="button"
          ref={btnDropdownRef} // Attach ref
          onClick={() => {
            isOpen ? closeDropdownPopover() : openDropdownPopover();
          }} // Toggle open/close
        >
          Actions
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dropdown menu - Popper will position this */}
        <div
          ref={popoverDropdownRef} // Attach ref
          className={
            (isOpen ? "block " : "hidden ") + // Toggle visibility based on state
            "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg mt-1 min-w-48" // Standard dropdown classes from template, adjusted min-w
          }
        >
          <button
            onClick={handleViewDetails}
            className="text-sm py-2 px-4 font-normal block w-full whitespace-no-wrap bg-transparent text-gray-700 hover:bg-gray-100"
          >
            View Details
          </button>
          {allowedTransitions.length > 0 && (
            <div className="h-0 my-2 border border-solid border-t-0 border-gray-200 opacity-25" /> // Separator - Removed comment from here
          )}
          {allowedTransitions.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className="text-sm py-2 px-4 font-normal block w-full whitespace-no-wrap bg-transparent text-gray-700 hover:bg-gray-100"
            >
              Change to {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// ... (rest of the CardOrderList and Orders component remains the same) ...

// Placeholder component using the CardTable's container styles
const CardOrderList = ({ color = "light" }) => {
  // --- MANAGE ORDER LIST STATE (Placeholder Data) ---
  const [orders, setOrders] = useState([
    {
      id: "#ORD-001",
      customerId: "CUST-001",
      customerName: "John Doe",
      date: "2023-10-26",
      status: "completed",
      totalAmount: "150.00 DZD",
      itemsCount: 2,
    },
    {
      id: "#ORD-002",
      customerId: "CUST-002",
      customerName: "Jane Smith",
      date: "2023-10-25",
      status: "shipped",
      totalAmount: "89.50 DZD",
      itemsCount: 1,
    },
    {
      id: "#ORD-003",
      customerId: "CUST-003",
      customerName: "Bob Johnson",
      date: "2023-10-24",
      status: "pending",
      totalAmount: "210.25 DZD",
      itemsCount: 3,
    },
    {
      id: "#ORD-004",
      customerId: "CUST-004",
      customerName: "Alice Williams",
      date: "2023-10-23",
      status: "processing",
      totalAmount: "45.99 DZD",
      itemsCount: 1,
    },
    {
      id: "#ORD-005",
      customerId: "CUST-005",
      customerName: "Charlie Brown",
      date: "2023-10-22",
      status: "completed",
      totalAmount: "320.75 DZD",
      itemsCount: 4,
    },
    {
      id: "#ORD-006",
      customerId: "CUST-006",
      customerName: "Diana Prince",
      date: "2023-10-21",
      status: "cancelled",
      totalAmount: "12.99 DZD",
      itemsCount: 1,
    },
    {
      id: "#ORD-007",
      customerId: "CUST-007",
      customerName: "Bruce Wayne",
      date: "2023-10-20",
      status: "delivered",
      totalAmount: "999.99 DZD",
      itemsCount: 2,
    },
    {
      id: "#ORD-008",
      customerId: "CUST-008",
      customerName: "Clark Kent",
      date: "2023-10-19",
      status: "returned",
      totalAmount: "49.95 DZD",
      itemsCount: 1,
    },
    {
      id: "#ORD-009",
      customerId: "CUST-009",
      customerName: "Peter Parker",
      date: "2023-10-18",
      status: "refunded",
      totalAmount: "25.00 DZD",
      itemsCount: 1,
    },
    {
      id: "#ORD-010",
      customerId: "CUST-010",
      customerName: "Tony Stark",
      date: "2023-10-17",
      status: "completed",
      totalAmount: "1500.00 DZD",
      itemsCount: 5,
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

  // --- FILTER AND SORT ORDERS ---
  let filteredOrders = orders.filter((order) =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply sorting if a sort key is set
  if (sortConfig.key) {
    filteredOrders.sort((a, b) => {
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
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  // --- HANDLE PAGINATION ---
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- HANDLE STATUS UPDATE (Mock) ---
  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      })
    );
  };

  // --- Status Badge Styling Helper ---
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
      case "refunded":
        return "bg-emerald-100 text-emerald-800";
      case "shipped":
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "cancelled":
      case "returned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
              Orders List
            </h3>
          </div>
          {/* Optional: Add buttons like "Export Orders" here */}
          {
            /* <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
            <button className="bg-indigo-500 text-white active:bg-indigo-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
              Export Orders
            </button>
          </div> */
          }
        </div>
        <div className="w-full px-4 mt-4">
          <div className="relative flex w-full flex-wrap items-center">
            <span className="z-10 h-full leading-snug font-normal absolute text-center text-blueGray-300 bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3 pointer-events-none">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              placeholder="Search orders by ID, customer, or status..."
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
                Order ID
                {sortConfig.key === "id" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("customerName")}
              >
                Customer
                {sortConfig.key === "customerName" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("date")}
              >
                Date
                {sortConfig.key === "date" &&
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
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("totalAmount")}
              >
                Total
                {sortConfig.key === "totalAmount" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("itemsCount")}
              >
                Items
                {sortConfig.key === "itemsCount" &&
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
            {currentItems.map((order) => (
              <tr key={order.id}>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                  {order.id}
                </th>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {order.customerName}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {new Date(order.date).toLocaleDateString()}{" "}
                  {/* Format date */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  <span
                    className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${
                      getStatusClass(order.status)
                    }`}
                  >
                    {/* NEW: Add an icon based on status */}
                    {order.status === "completed" && (
                      <i className="fas fa-check-circle mr-1"></i>
                    )}
                    {order.status === "shipped" && (
                      <i className="fas fa-truck mr-1"></i>
                    )}
                    {order.status === "delivered" && (
                      <i className="fas fa-home mr-1"></i>
                    )}
                    {order.status === "processing" && (
                      <i className="fas fa-cog mr-1"></i>
                    )}
                    {order.status === "pending" && (
                      <i className="fas fa-clock mr-1"></i>
                    )}
                    {order.status === "cancelled" && (
                      <i className="fas fa-times-circle mr-1"></i>
                    )}
                    {order.status === "returned" && (
                      <i className="fas fa-undo mr-1"></i>
                    )}
                    {order.status === "refunded" && (
                      <i className="fas fa-credit-card mr-1"></i>
                    )}
                    {/* Capitalize status */}
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </span>
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {order.totalAmount}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {order.itemsCount}
                </td>
                {/* Actions Column with Dropdown - Added 'relative' class to fix positioning */}
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right relative">
                  <OrderActionDropdown
                    orderId={order.id}
                    currentStatus={order.status}
                    onUpdateStatus={handleStatusUpdate} // Pass the handler
                  />
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
            {Math.min(indexOfLastItem, filteredOrders.length)}
          </span>{" "}
          of <span className="font-medium">{filteredOrders.length}</span>{" "}
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

export default function Orders() {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardOrderList />
        </div>
      </div>
    </>
  );
}
