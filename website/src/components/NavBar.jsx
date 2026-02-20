import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ComputerDesktopIcon,
  CubeIcon, // Added
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  ShoppingCartIcon,
  UserCircleIcon, // Added
} from "@heroicons/react/24/outline";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext"; // Import useAuth
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { fetchCategories } from "../services/api"; // Import fetchCategories
import ThemeSwitcher from "./ThemeSwitcher"; // Import the new component

// Import the logo image
import logoImage from "../assets/logo.jpg"; // Adjust the filename if needed (e.g., logo.svg, logo.jpg)

const Navbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false); // State for mini-cart
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, subtotal } = useCart(); // Get cart items and subtotal
  const { user, isLoading } = useAuth(); // Get user and loading state from auth context

  // Fetch categories using useQuery
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ["navbar-categories"],
    queryFn: fetchCategories,
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });

  const handleSearch = (e) => {
    e.preventDefault();
    let queryParams = new URLSearchParams();

    if (searchTerm.trim()) {
      queryParams.append("q", searchTerm.trim());
    }
    if (selectedCategory) {
      queryParams.append("category", selectedCategory);
    }

    navigate(`/products?${queryParams.toString()}`);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isBuildPCPage = location.pathname === "/build-pc";

  // State for the category dropdown - initialize to empty string
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    // Optionally, trigger a filter action here if needed globally
    // .setSearchParams({ ...params, category: newCategory === 'All Categories' ? '' : newCategory });
  };

  let phoneNumber = "+0791781303";
  let address = "TAHER, Jijel, Algeria";
  let currency = "DZD";
  // Determine the account link destination based on auth state
  let accountLinkDestination = "/auth"; // Default to auth page
  if (isLoading) {
    accountLinkDestination = "#"; // Or maybe don't render the link at all temporarily
  } else if (user) {
    accountLinkDestination = "/account";
  } else {
    accountLinkDestination = "/auth";
  }

  // Improved hover handlers
  const handleCartHover = () => {
    setIsMiniCartOpen(true);
  };

  const handleCartLeave = () => {
    // Use a timeout to allow for brief movement to the dropdown
    setTimeout(() => {
      if (!document.querySelector(".mini-cart-dropdown:hover")) {
        setIsMiniCartOpen(false);
      }
    }, 100); // 100ms delay before closing
  };

  const handleDropdownHover = () => {
    setIsMiniCartOpen(true); // Keep it open if hovering dropdown
  };

  const handleDropdownLeave = () => {
    setIsMiniCartOpen(false); // Close when leaving dropdown
  };

  return (
    <React.Fragment>
      {/* Top Info Bar — Desktop Only - Using daisyUI semantic classes */}
      <div className="bg-base-300 text-base-content text-sm py-1 px-4 flex justify-between items-center hidden md:flex">
        {/* Changed bg-gray-900 to bg-base-300 */}
        <div className="flex items-center space-x-6">
          <a className="flex items-center hover:text-primary transition">
            {/* Changed hover:text-white to hover:text-primary */}
            <PhoneIcon className="h-4 w-4 mr-1" />
            {phoneNumber}
          </a>
          <a
            href="mailto:ycinfo2026@gmail.com"
            className="flex items-center hover:text-primary transition"
          >
            {/* Changed hover:text-white to hover:text-primary */}
            <EnvelopeIcon className="h-4 w-4 mr-1" />
            ycinfo2026@gmail.com
          </a>
          <span className="flex items-center">
            <MapPinIcon className="h-4 w-4 mr-1" />
            {address}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="font-medium">{currency}</span>
          {/* Dynamic Link */}
          <Link
            to={accountLinkDestination}
            className="hover:text-primary transition"
          >
            {/* Changed hover:text-white to hover:text-primary */}
            {user ? `Hello, ${user.full_name}` : "My Account"}{" "}
            {/* Show username if logged in */}
          </Link>
        </div>
      </div>

      {/* Main Navbar - Using daisyUI semantic classes */}
      <nav className="bg-base-100 border-b border-base-300 py-3 px-4">
        {/* Changed bg-gray-900 to bg-base-100, border-gray-800 to border-base-300 */}
        <div className="container mx-auto flex items-center justify-between">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center space-x-2">
            {/* Added space-x-2 for gap between logo and text */}
            {/* Imported Logo Image - Rounded */}
            <img
              src={logoImage} // Use the imported variable
              alt="ALM Informatique Logo"
              className="h-8 w-8 rounded-full" // Added rounded-full for rounded corners
            />
            <span className="text-xl md:text-2xl font-bold text-base-content">
              {/* Changed text-white to text-base-content */}
              YC<span className="text-primary">.</span> Informatique
            </span>
          </Link>

          {/* Centered Search Bar (Desktop) - Updated to use native select dropdown with arrow and separator */}
          <div className="hidden md:flex justify-center flex-1 max-w-2xl">
            <form
              onSubmit={handleSearch}
              className="w-full max-w-lg border border-secondary-content rounded-lg"
            >
              <div className="flex rounded-lg overflow-hidden bg-base-200">
                {/* Changed bg-gray-800 to bg-base-200 */}
                {/* Category Select with Custom Arrow */}
                <div className="relative">
                  {/* Wrapper for arrow positioning */}
                  <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="bg-base-200 text-base-content px-4 py-3 border-none focus:outline-none min-w-[120px] appearance-none pl-4 pr-8 cursor-pointer"
                    disabled={categoriesLoading}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.name}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>{" "}
                  {/* Custom Arrow SVG */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-base-content">
                    {/* Changed text-gray-300 to text-base-content */}
                    <svg
                      width="12px"
                      height="12px"
                      className="h-3 w-3 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 2048 2048"
                    >
                      <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z">
                      </path>
                    </svg>
                  </div>
                </div>
                {/* Separator Bar */}
                <div className="self-stretch w-px bg-base-300"></div>{" "}
                {/* Changed bg-gray-700 to bg-base-300 */}
                <input
                  type="text"
                  placeholder="Search here"
                  className="flex-1 px-4 py-3 bg-base-200 text-base-content focus:outline-none focus:ring-2 focus:ring-primary" // Changed bg-gray-800 to bg-base-200, text-white to text-base-content, focus:ring-red-500 to focus:ring-primary
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-focus text-primary-content px-5 py-3 font-medium transition"
                  disabled={categoriesLoading}
                >
                  {categoriesLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Icons - Desktop - Added Theme Switcher */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Reduced space-x from 6 to 4 */}
            <ThemeSwitcher /> {/* Add the ThemeSwitcher component */}
            <Link
              to="/build-pc"
              className={`flex flex-col items-center ${
                isBuildPCPage
                  ? "text-primary"
                  : "text-base-content hover:text-primary"
              } transition`} // Changed text-red-500 to text-primary, text-gray-300 to text-base-content, hover:text-white to hover:text-primary
            >
              <ComputerDesktopIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Build PC</span>
            </Link>
            {/* Mini-Cart Dropdown Container - Added relative */}
            <div
              className="relative group" // Added relative for dropdown positioning
              onMouseEnter={handleCartHover} // Hover handler for the container
              onMouseLeave={handleCartLeave} // Leave handler for the container
            >
              {/* Cart Link with Badge - Removed hover triggers from here */}
              <Link
                to="/cart"
                className="flex flex-col items-center text-base-content hover:text-primary transition relative" // Changed text-gray-300 to text-base-content, hover:text-white to hover:text-primary
              >
                <ShoppingCartIcon className="h-6 w-6" />
                <span className="text-xs mt-1">Your Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {/* Changed bg-red-500 to bg-primary, text-white to text-primary-content */}
                    {cart.length}
                  </span>
                )}
              </Link>

              {/* Mini-Cart Dropdown - Conditionally Rendered */}
              {isMiniCartOpen &&
                cart.length > 0 && ( // Show only if open and cart has items
                  <div
                    className="mini-cart-dropdown absolute right-0 mt-2 w-80 bg-base-100 shadow-xl z-[1] rounded-box border border-base-300" // Used bg-base-100 for dropdown
                    onMouseEnter={handleDropdownHover} // Keep open if hovering dropdown
                    onMouseLeave={handleDropdownLeave} // Close when leaving dropdown
                  >
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">Your Cart</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {/* Scrollable if many items */}
                        {cart.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center space-x-3 p-2 bg-inherit rounded"
                          >
                            {/* Used bg-base-200 for item background */}
                            <img
                              src={item.image} // <-- Ensure it uses item.image
                              alt={item.title}
                              className="w-12 h-12 object-contain bg-inherit p-1 rounded" // Added bg-base-200 and padding
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">
                                {item.title}
                              </p>
                              <p className="text-primary font-bold text-sm">
                                DZD {item.price}
                              </p>
                              <p className="text-base-content/70 text-xs">
                                Qty: {item.quantity}
                              </p>{" "}
                              {/* Changed text-gray-500 to text-base-content/70 */}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="divider my-2"></div>{" "}
                      {/* Changed divider color */}
                      <div className="flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span>DZD {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link
                          to="/cart"
                          className="btn btn-primary btn-outline flex-1"
                          onClick={() => setIsMiniCartOpen(false)} // Close dropdown on click
                        >
                          View Cart
                        </Link>
                        {/* Updated Checkout button to link to /checkout */}
                        <Link
                          to="/checkout"
                          className="btn btn-secondary flex-1"
                          onClick={() => setIsMiniCartOpen(false)} // Close dropdown on click
                        >
                          Checkout
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

              {/* Empty Cart Message - Shown when dropdown is open but cart is empty */}
              {isMiniCartOpen && cart.length === 0 && (
                <div
                  className="mini-cart-dropdown absolute right-0 mt-2 w-80 bg-base-100 shadow-xl z-[1] rounded-box border border-base-300"
                  onMouseEnter={handleDropdownHover} // Keep open if hovering dropdown
                  onMouseLeave={handleDropdownLeave} // Close when leaving dropdown
                >
                  <div className="p-4 text-center">
                    <p>Your cart is empty.</p>
                    <Link
                      to="/products"
                      className="btn btn-primary mt-2"
                      onClick={() => setIsMiniCartOpen(false)} // Close dropdown on click
                    >
                      Browse Products
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-base-content hover:text-primary" // Changed text-gray-300 to text-base-content, hover:text-white to hover:text-primary
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-base-200 py-4 px-4 border-t border-base-300">
            {/* Changed bg-gray-800 to bg-base-200, border-gray-700 to border-base-300 */}
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="mb-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full px-4 py-3 bg-base-300 text-base-content rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-primary" // Changed bg-gray-700 to bg-base-300, text-white to text-base-content, focus:ring-red-500 to focus:ring-primary
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
              <ThemeSwitcher /> {/* Add the ThemeSwitcher component */}
              <Link
                to="/build-pc"
                className={`flex items-center px-4 py-2 rounded-lg ${
                  isBuildPCPage
                    ? "bg-primary text-primary-content"
                    : "text-base-content hover:bg-base-300"
                }`} // Changed bg-red-500 to bg-primary, text-white to text-primary-content, text-gray-300 to text-base-content, hover:bg-gray-700 to hover:bg-base-300
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ComputerDesktopIcon className="h-5 w-5 mr-3" />
                Build Your PC
              </Link>
              <Link
                to="/cart"
                className="flex items-center px-4 py-2 text-base-content hover:bg-base-300 rounded-lg" // Changed text-gray-300 to text-base-content, hover:bg-gray-700 to hover:bg-base-300
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingCartIcon className="h-5 w-5 mr-3" />
                Your Cart ({cart.length})
              </Link>
              {/* Dynamic Link for Mobile */}
              <Link
                to={accountLinkDestination}
                className="flex items-center px-4 py-2 text-base-content hover:bg-base-300 rounded-lg" // Changed text-gray-300 to text-base-content, hover:bg-gray-700 to hover:bg-base-300
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserCircleIcon className="h-5 w-5 mr-3" />
                {user ? `Account (${user.name})` : "Log In / Sign Up"}
              </Link>
              <Link
                to="/products"
                className="flex items-center px-4 py-2 text-base-content hover:bg-base-300 rounded-lg" // Changed text-gray-300 to text-base-content, hover:bg-gray-700 to hover:bg-base-300
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <CubeIcon className="h-5 w-5 mr-3" />
                All Products
              </Link>
            </div>
          </div>
        )}
      </nav>
    </React.Fragment>
  );
};

export default Navbar;
