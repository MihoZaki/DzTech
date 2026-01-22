// src/views/admin/Customers.js
import React, { useEffect, useRef, useState } from "react"; // Add useEffect and useRef
import { createPopper } from "@popperjs/core"; // Import createPopper
import { useHistory } from "react-router-dom"; // Import useHistory

// NEW: Dropdown Component for Customer Actions using Popper
const CustomerActionDropdown = ({ customerId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnDropdownRef = useRef(null);
  const popoverDropdownRef = useRef(null);
  const history = useHistory(); // Get the history object

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
    console.log(`View details for customer ${customerId}`);
    // Navigate to customer details page (not implemented yet)
    // history.push(`/admin/customers/${customerId}`);
    closeDropdownPopover(); // Close after action
  };

  const handleEditCustomer = () => {
    console.log(`Edit customer ${customerId}`);
    // Navigate to customer edit page (not implemented yet)
    // history.push(`/admin/customers/${customerId}/edit`);
    closeDropdownPopover(); // Close after action
  };

  return (
    <>
      {/* Button container */}
      <div className="relative inline-flex align-middle">
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
            "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg mt-1 min-w-48" // Standard dropdown classes from template
          }
        >
          <button
            onClick={handleViewDetails}
            className="text-sm py-2 px-4 font-normal block w-full whitespace-no-wrap bg-transparent text-gray-700 hover:bg-gray-100"
          >
            View Details
          </button>
          <button
            onClick={handleEditCustomer}
            className="text-sm py-2 px-4 font-normal block w-full whitespace-no-wrap bg-transparent text-gray-700 hover:bg-gray-100"
          >
            Edit Customer
          </button>
          {/* Add other potential actions here */}
          {/* <div className="h-0 my-2 border border-solid border-t-0 border-gray-200 opacity-25" /> */}
          {
            /* <button className="text-sm py-2 px-4 font-normal block w-full whitespace-no-wrap bg-transparent text-gray-700 hover:bg-gray-100">
            Message Customer
          </button> */
          }
        </div>
      </div>
    </>
  );
};

// Placeholder component using the CardTable's container styles
const CardCustomerList = ({ color = "light" }) => {
  // --- MANAGE CUSTOMER LIST STATE (Placeholder Data) ---
  const [customers, setCustomers] = useState([
    {
      id: "CUST-001",
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      location: "Algiers",
      registrationDate: "2023-01-15",
      lastOrderDate: "2023-10-20",
      orderCount: 12,
    },
    {
      id: "CUST-002",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+1987654321",
      location: "Oran",
      registrationDate: "2023-02-20",
      lastOrderDate: "2023-10-25",
      orderCount: 8,
    },
    {
      id: "CUST-003",
      name: "Bob Johnson",
      email: "bob.johnson@example.com",
      phone: "+1122334455",
      location: "Constantine",
      registrationDate: "2023-03-10",
      lastOrderDate: "2023-09-15",
      orderCount: 5,
    },
    {
      id: "CUST-004",
      name: "Alice Williams",
      email: "alice.williams@example.com",
      phone: "+15566778899",
      location: "Annaba",
      registrationDate: "2023-04-05",
      lastOrderDate: "2023-10-22",
      orderCount: 15,
    },
    {
      id: "CUST-005",
      name: "Charlie Brown",
      email: "charlie.brown@example.com",
      phone: "+19988776655",
      location: "Batna",
      registrationDate: "2023-05-18",
      lastOrderDate: "2023-08-30",
      orderCount: 3,
    },
    {
      id: "CUST-006",
      name: "Diana Prince",
      email: "diana.prince@example.com",
      phone: "+14455667788",
      location: "Tizi Ouzou",
      registrationDate: "2023-06-12",
      lastOrderDate: "2023-10-26",
      orderCount: 20,
    },
    {
      id: "CUST-007",
      name: "Bruce Wayne",
      email: "bruce.wayne@example.com",
      phone: "+13344556677",
      location: "Bejaia",
      registrationDate: "2023-07-01",
      lastOrderDate: "2023-07-10",
      orderCount: 1,
    },
    {
      id: "CUST-008",
      name: "Clark Kent",
      email: "clark.kent@example.com",
      phone: "+12233445566",
      location: "Setif",
      registrationDate: "2023-08-14",
      lastOrderDate: "2023-09-05",
      orderCount: 7,
    },
    {
      id: "CUST-009",
      name: "Peter Parker",
      email: "peter.parker@example.com",
      phone: "+11122334455",
      location: "Sidi Bel Abbes",
      registrationDate: "2023-09-22",
      lastOrderDate: "2023-10-18",
      orderCount: 9,
    },
    {
      id: "CUST-010",
      name: "Tony Stark",
      email: "tony.stark@example.com",
      phone: "+10011223344",
      location: "Skikda",
      registrationDate: "2023-10-01",
      lastOrderDate: "2023-10-17",
      orderCount: 25,
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

  // --- FILTER AND SORT CUSTOMERS ---
  let filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply sorting if a sort key is set
  if (sortConfig.key) {
    filteredCustomers.sort((a, b) => {
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
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // --- HANDLE PAGINATION ---
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
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
              Customers List
            </h3>
          </div>
          {/* Optional: Add buttons like "Export Customers" here */}
          {
            /* <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
            <button className="bg-indigo-500 text-white active:bg-indigo-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
              Export Customers
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
              placeholder="Search customers by name, email, or location..."
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
                onClick={() => handleSortRequest("email")}
              >
                Email
                {sortConfig.key === "email" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("phone")}
              >
                Phone
                {sortConfig.key === "phone" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("location")}
              >
                Location
                {sortConfig.key === "location" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("registrationDate")}
              >
                Registration Date
                {sortConfig.key === "registrationDate" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("lastOrderDate")}
              >
                Last Order Date
                {sortConfig.key === "lastOrderDate" &&
                  (sortConfig.direction === "asc" ? " ↑" : " ↓")}
              </th>
              <th
                className={"px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left cursor-pointer hover:bg-blueGray-100 " +
                  (color === "light"
                    ? "bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                    : "bg-lightBlue-800 text-lightBlue-300 border-lightBlue-700")}
                onClick={() => handleSortRequest("orderCount")}
              >
                Order Count
                {sortConfig.key === "orderCount" &&
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
            {currentItems.map((customer) => (
              <tr key={customer.id}>
                <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left">
                  {customer.name}
                </th>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {customer.email}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {customer.phone}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {customer.location}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {new Date(customer.registrationDate).toLocaleDateString()}
                  {" "}
                  {/* Format date */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {new Date(customer.lastOrderDate).toLocaleDateString()}{" "}
                  {/* Format date */}
                </td>
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                  {customer.orderCount}
                </td>
                {/* NEW: Actions Column with Dropdown */}
                <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-right">
                  <CustomerActionDropdown customerId={customer.id} />
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
            {Math.min(indexOfLastItem, filteredCustomers.length)}
          </span>{" "}
          of <span className="font-medium">{filteredCustomers.length}</span>
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

export default function Customers() {
  return (
    <>
      <div className="flex flex-wrap mt-4">
        <div className="w-full mb-12 px-4">
          <CardCustomerList />
        </div>
      </div>
    </>
  );
}
