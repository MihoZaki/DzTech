import React from "react";

import UserDropdown from "components/Dropdowns/UserDropdown.js";

export default function Navbar() {
  return (
    <>
      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full z-10 bg-emerald-600 md:flex-row md:flex-nowrap md:justify-start flex items-center p-4">
        {/* Changed bg to indigo-900 */}
        <div className="w-full mx-autp items-center flex justify-between md:flex-nowrap flex-wrap md:px-10 px-4">
          {/* Brand */}
          <a
            className="text-white text-sm uppercase hidden lg:inline-block font-semibold" // Kept text-white for contrast on indigo-900
            href="#pablo"
            onClick={(e) => e.preventDefault()}
          >
            Admin Dashboard
          </a>
          {/* Form */}
          <form className="md:flex hidden flex-row flex-wrap items-center lg:ml-auto mr-3">
            <div className="relative flex w-full flex-wrap items-stretch">
              <span className="z-10 h-full leading-snug font-normal absolute text-center text-indigo-200 absolute bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3">
                {/* Changed icon color to indigo-200 for contrast */}
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                placeholder="Search here..." // Consider changing placeholder color too
                className="border-0 px-3 py-3 placeholder-indigo-300 text-indigo-700 relative bg-indigo-100 bg-indigo-100 rounded text-sm shadow outline-none focus:outline-none focus:ring w-full pl-10" // Changed bg to indigo-100, text to indigo-700, placeholder to indigo-300
              />
            </div>
          </form>
          {/* User */}
          <ul className="flex-col md:flex-row list-none items-center hidden md:flex">
            <UserDropdown />
          </ul>
        </div>
      </nav>
      {/* End Navbar */}
    </>
  );
}
