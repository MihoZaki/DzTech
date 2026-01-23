/*eslint-disable*/
import React from "react";
import { Link, useLocation } from "react-router-dom"; // Import useLocation hook

import NotificationDropdown from "components/Dropdowns/NotificationDropdown.js";
import UserDropdown from "components/Dropdowns/UserDropdown.js";

// Define navigation items in a structured way
const storeManagementItems = [
  {
    path: "/admin/products",
    label: "Products",
    icon: "fas fa-box-open", // Using a box icon for products
  },
  {
    path: "/admin/categories",
    label: "Categories",
    icon: "fas fa-tags", // Using a tags icon for categories
  },
  {
    path: "/admin/delivery-services", // Placeholder for future
    label: "Delivery Services", // Placeholder for future
    icon: "fas fa-truck", // Using a truck icon for delivery
    disabled: true, // Disable for now
  },
];

const salesManagementItems = [
  {
    path: "/admin/orders",
    label: "Orders",
    icon: "fas fa-shopping-cart",
  },
  {
    path: "/admin/customers",
    label: "Customers",
    icon: "fas fa-user-friends",
  },
];

const dashboardItems = [
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    icon: "fas fa-tachometer-alt", // Using a dashboard icon
  },
];

// Helper function to determine active link styles
const getNavLinkClasses = (locationPath, itemPath) => {
  const isActive = locationPath === itemPath;
  return `text-xs uppercase py-3 font-bold block ${
    isActive
      ? "text-lightBlue-500 hover:text-lightBlue-600"
      : "text-blueGray-700 hover:text-blueGray-500"
  }`;
};

// Helper function to determine active icon styles and combine with icon class
const getNavIconElement = (locationPath, itemPath, iconClass) => {
  const isActive = locationPath === itemPath;
  const baseIconClass = "mr-2 text-sm ";
  const activeInactiveClass = isActive ? "opacity-75" : "text-blueGray-300";
  const fullIconClass = baseIconClass + activeInactiveClass;

  return (
    <i className={fullIconClass}>
      <i className={iconClass}></i>
    </i>
  );
};

export default function Sidebar() {
  const [collapseShow, setCollapseShow] = React.useState("hidden");
  const location = useLocation(); // Get the current location using the hook

  return (
    <>
      <nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6">
        <div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto">
          {/* Toggler */}
          <button
            className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
            type="button"
            onClick={() => setCollapseShow("bg-white m-2 py-3 px-6")}
          >
            <i className="fas fa-bars"></i>
          </button>
          {/* Brand */}
          <Link
            className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
            to="/"
          >
            DzTech Admin
          </Link>
          {/* User */}
          <ul className="md:hidden items-center flex flex-wrap list-none">
            <li className="inline-block relative">
              <NotificationDropdown />
            </li>
            <li className="inline-block relative">
              <UserDropdown />
            </li>
          </ul>
          {/* Collapse */}
          <div
            className={"md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " +
              collapseShow}
          >
            {/* Collapse header */}
            <div className="md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-blueGray-200">
              <div className="flex flex-wrap">
                <div className="w-6/12">
                  <Link
                    className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
                    to="/"
                  >
                    Notus React
                  </Link>
                </div>
                <div className="w-6/12 flex justify-end">
                  <button
                    type="button"
                    className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                    onClick={() => setCollapseShow("hidden")}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            {/* Form */}
            <form className="mt-6 mb-4 md:hidden">
              <div className="mb-3 pt-0">
                <input
                  type="text"
                  placeholder="Search"
                  className="border-0 px-3 py-2 h-12 border border-solid  border-blueGray-500 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-base leading-snug shadow-none outline-none focus:outline-none w-full font-normal"
                />
              </div>
            </form>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />

            {/* Dashboard Section */}
            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              {dashboardItems.map((item) => (
                <li key={item.path} className="items-center">
                  <Link
                    className={getNavLinkClasses(location.pathname, item.path)} // Use helper function
                    to={item.path}
                  >
                    {getNavIconElement(location.pathname, item.path, item.icon)}
                    {" "}
                    {/* Use helper function for icon */}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />

            {/* Store Management Heading */}
            <h6 className="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
              Store Management
            </h6>
            {/* Store Management Navigation */}
            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              {storeManagementItems.map((item) => (
                <li
                  key={item.path}
                  className={`items-center ${
                    item.disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {item.disabled
                    ? (
                      <span
                        className={getNavLinkClasses(
                          location.pathname,
                          item.path,
                        ) + " pointer-events-none"}
                      >
                        {/* Disable pointer events */}
                        {getNavIconElement(
                          location.pathname,
                          item.path,
                          item.icon,
                        )}
                        {item.label}
                      </span>
                    )
                    : (
                      <Link
                        className={getNavLinkClasses(
                          location.pathname,
                          item.path,
                        )}
                        to={item.path}
                      >
                        {getNavIconElement(
                          location.pathname,
                          item.path,
                          item.icon,
                        )}
                        {item.label}
                      </Link>
                    )}
                </li>
              ))}
            </ul>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />

            {/* Sales Management Heading */}
            <h6 className="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
              Sales Management
            </h6>
            {/* Sales Management Navigation */}
            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              {salesManagementItems.map((item) => (
                <li key={item.path} className="items-center">
                  <Link
                    className={getNavLinkClasses(location.pathname, item.path)}
                    to={item.path}
                  >
                    {getNavIconElement(location.pathname, item.path, item.icon)}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Divider - Removed Auth section, so this might be the last divider */}
            <hr className="my-4 md:min-w-full" />
          </div>
        </div>
      </nav>
    </>
  );
}
