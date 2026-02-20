// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, searchProducts } from "../services/api"; // Added fetchCategories
import { toast } from "sonner";
// Import Heroicons
import {
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "@heroicons/react/24/outline"; // Import outline icons

// Import the hero background image
import heroBackgroundImage from "../assets/heroBackgroundImage.png";

// Import category images
import cpuImage from "../assets/categoryCpu.jpg";
import gpuImage from "../assets/categoryGpu.jpg";
import ramImage from "../assets/categoryRam.jpg";
import storageImage from "../assets/categoryStorage.jpg";
import motherboardImage from "../assets/categoryMotherboard.jpg";
import caseImage from "../assets/categoryCase.jpg";
import psuImage from "../assets/categoryPsu.jpg";
import peripheralImage from "../assets/categoryPeripherals.jpg";

import intelLogo from "../assets/intel-logo.png";
import amdLogo from "../assets/amd-logo.png";
import nvidiaLogo from "../assets/nvidia-logo.png";
import corsairLogo from "../assets/corsair-logo.png";
import samsungLogo from "../assets/samsung-logo.png";
import asusLogo from "../assets/asus-logo.png";
import gskillLogo from "../assets/gskill-logo.png";

// Direct mapping based on the actual backend response
const CATEGORY_NAME_MAPPING = {
  cpus: "CPU",
  gpus: "GPU",
  ram: "RAM",
  storage: "Storage",
  motherboards: "Motherboard",
  cases: "Case",
  psus: "Power Supply",
  peripherals: "Accessories", // Correctly maps to Accessories
  coolers: "Cooler", // Added cooler mapping
  laptops: "Laptop", // Added laptop mapping
};

const Home = () => {
  // Fetch both featured products and categories
  const {
    data: featuredProducts = [],
    isLoading: loadingProducts,
    isError: isProductError,
    error: productError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      try {
        // Use searchProducts with limit of 8 instead of fetchProducts
        const response = await searchProducts({
          page: 1,
          limit: 8,
        });
        return response?.data || []; // Adjust based on your API response structure
      } catch (err) {
        console.error("Error fetching featured products:", err);
        toast.error(
          "Failed to load featured products. Please try again later.",
        );
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch categories to get actual IDs
  const {
    allCategories = [],
    isLoading: loadingCategories,
    isError: isCategoryError,
    error: categoryError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const response = await fetchCategories();
        return response || [];
      } catch (err) {
        console.error("Error fetching categories:", err);
        toast.error("Failed to load categories. Please try again later.");
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });

  // Function to find the backend category ID based on our display name
  const findCategoryId = (displayName) => {
    if (!allCategories.length) return displayName; // Fallback if categories haven't loaded yet

    const targetName = CATEGORY_NAME_MAPPING[displayName];
    if (!targetName) return displayName; // Return the display name if no mapping exists

    // Find the category with the exact name match
    const category = allCategories.find((cat) =>
      cat.name &&
      typeof cat.name === "string" &&
      cat.name.toLowerCase() === targetName.toLowerCase()
    );

    if (category) {
      return category.id; // Return the actual backend ID
    }

    // If no match found, return the display name as fallback
    return displayName;
  };

  // Loading states
  const loading = loadingProducts || loadingCategories;
  const isError = isProductError || isCategoryError;
  const error = productError || categoryError;
  const refetch = () => {
    refetchProducts();
    refetchCategories();
  };

  // Define the brands for the carousel
  const brands = [
    { id: "intel", name: "Intel", image: intelLogo },
    { id: "amd", name: "AMD", image: amdLogo },
    { id: "nvidia", name: "NVIDIA", image: nvidiaLogo },
    { id: "corsair", name: "Corsair", image: corsairLogo },
    { id: "samsung", name: "Samsung", image: samsungLogo },
    { id: "asus", name: "ASUS", image: asusLogo },
    { id: "gskill", name: "G.Skill", image: gskillLogo },
  ];

  // Define the services
  const services = [
    {
      id: "cash-on-delivery",
      title: "Cash on Delivery",
      icon: <CurrencyDollarIcon className="h-8 w-8 text-primary" />,
    },
    {
      id: "fast-delivery",
      title: "Fast Delivery",
      icon: <TruckIcon className="h-8 w-8 text-primary" />,
    },
    {
      id: "province-delivery",
      title: "Ship to all Willayas",
      icon: <TruckIcon className="h-8 w-8 text-primary" />, // Reusing Truck icon
    },
    {
      id: "support",
      title: "24/7 Support",
      icon: <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-primary" />,
    },
    {
      id: "products",
      title: "Fresh Products",
      icon: <CubeIcon className="h-8 w-8 text-primary" />,
    },
    {
      id: "warranty",
      title: "Guaranteed Warranty",
      icon: <ShieldCheckIcon className="h-10 w-10 text-primary" />, // Added new service with icon
    },
  ];

  // Updated hardcoded categories with dynamic category ID lookup
  const hardcodedCategories = [
    // [0] Big card: CPUs (spans 2 cols × 2 rows)
    {
      id: "cpus",
      name: "CPUs",
      image: cpuImage,
      isBig: true,
      categoryId: findCategoryId("cpus"),
    },
    // [1] Top-right
    {
      id: "gpus",
      name: "GPUs",
      image: gpuImage,
      isBig: false,
      categoryId: findCategoryId("gpus"),
    },
    // [2] Below GPUs
    {
      id: "ram",
      name: "RAM",
      image: ramImage,
      isBig: false,
      categoryId: findCategoryId("ram"),
    },
    // [3] Below RAM
    {
      id: "storage",
      name: "Storage",
      image: storageImage,
      isBig: false,
      categoryId: findCategoryId("storage"),
    },
    // [4] Right of big card (row 1, col 3)
    {
      id: "motherboards",
      name: "Motherboards",
      image: motherboardImage,
      isBig: false,
      categoryId: findCategoryId("motherboards"),
    },
    // [5] Below motherboards
    {
      id: "cases",
      name: "Cases",
      image: caseImage,
      isBig: false,
      categoryId: findCategoryId("cases"),
    },
    // [6] Below cases
    {
      id: "psus",
      name: "PSUs",
      image: psuImage,
      isBig: false,
      categoryId: findCategoryId("psus"),
    },
    // [7] Bottom-right (last slot)
    {
      id: "peripherals",
      name: "Peripherals",
      image: peripheralImage,
      isBig: false,
      categoryId: findCategoryId("Accessories"),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - With Imported Background Image */}
      <section
        className="hero min-h-[550px] text-base-content"
        style={{
          backgroundImage: `url(${heroBackgroundImage})`, // Use the imported variable
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="hero-overlay bg-opacity-35 bg-base-100"></div>{" "}
        {/* Optional overlay for contrast */}
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Welcome to YC Informatique
            </h1>
            <p className="text-xl mb-8 text-base-content/80">
              Your trusted partner for all your tech needs.
            </p>
            <div className=" w-full flex flex-row items-center justify-center gap-4">
              <Link to="/products" className="btn btn-secondary">Shop Now</Link>
              <Link to="/build-pc" className="btn btn-primary">
                Build Your PC
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 bg-inherit">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Why Choose Us?
          </h2>{" "}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col items-center justify-center p-4 bg-base-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-accent"
              >
                <div className="mb-4">
                  {service.icon}
                </div>
                <h3 className="text-center text-xl font-black text-base-content">
                  {service.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section — Image with Name Button in Corner */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold my-12 text-center">
            Shop by Category
          </h2>

          {/* Fixed 4-column grid, explicit placement using hardcoded categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 0: Big CPU card — spans col 1-2, row 1-2 */}
            <Link
              key={hardcodedCategories[0].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[0].categoryId)
              }`}
              className="lg:col-span-2 lg:row-span-2 flex flex-col"
            >
              <div className="relative flex-grow overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[0].image}
                  alt={hardcodedCategories[0].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-6xl font-bold">
                  {hardcodedCategories[0].name}
                </p>
              </div>
            </Link>

            {/* Cards 1–7: Fixed positions using hardcoded categories */}
            {/* Row 1, Col 3 */}
            <Link
              key={hardcodedCategories[1].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[1].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-full w-full overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[1].image}
                  alt={hardcodedCategories[1].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[1].name}
                </p>
              </div>
            </Link>

            {/* Row 2, Col 3 */}
            <Link
              key={hardcodedCategories[2].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[2].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[2].image}
                  alt={hardcodedCategories[2].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[2].name}
                </p>
              </div>
            </Link>

            {/* Row 3, Col 3 */}
            <Link
              key={hardcodedCategories[3].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[3].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[3].image}
                  alt={hardcodedCategories[3].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[3].name}
                </p>
              </div>
            </Link>

            {/* Row 1, Col 4 */}
            <Link
              key={hardcodedCategories[4].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[4].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[4].image}
                  alt={hardcodedCategories[4].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[4].name}
                </p>
              </div>
            </Link>

            {/* Row 2, Col 4 */}
            <Link
              key={hardcodedCategories[5].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[5].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[5].image}
                  alt={hardcodedCategories[5].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[5].name}
                </p>
              </div>
            </Link>

            {/* Row 3, Col 4 */}
            <Link
              key={hardcodedCategories[6].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[6].categoryId)
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[6].image}
                  alt={hardcodedCategories[6].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[6].name}
                </p>
              </div>
            </Link>

            {/* Row 4, Col 4 (bottom-right) */}
            <Link
              key={hardcodedCategories[7].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[7].categoryId)
              }`}
              className="lg:col-span-2 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[7].image}
                  alt={hardcodedCategories[7].name}
                  className="w-full h-full object-cover"
                />
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-primary text-white">Shop Now</span>
                </div>
                <p className="absolute bottom-4 left-4 text-white px-2 py-1 rounded-md text-3xl font-bold">
                  {hardcodedCategories[7].name}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Carousel Section */}
      <section className="py-12 bg-inherit">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold my-8 text-center">
            Trusted Brands
          </h2>
          {/* Wrap carousel in a flex container for centering */}
          <div className="flex justify-center">
            <div className="carousel rounded-box carousel-center bg-base-100 shadow-md p-6 w-full max-w-7xl border border-info">
              {/* Added max-w-6xl or adjust as needed */}
              {brands.map((brand, index) => (
                <div
                  key={brand.id}
                  className="carousel-item flex justify-center items-center p-4"
                >
                  {/* Adjust width/height and styling as needed */}
                  <img
                    src={brand.image}
                    alt={brand.name}
                    className="object-contain h-24 w-auto max-w-full" // Adjust height (h-24) as needed
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 px-4 bg-inherit">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold my-12 text-center">
            Featured Products
          </h2>

          {loading
            ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card bg-base-100 shadow-xl">
                    <div className="skeleton h-48 w-full"></div>
                    <div className="card-body">
                      <div className="skeleton h-4 w-3/4 mb-2"></div>
                      <div className="skeleton h-4 w-full mb-2"></div>
                      <div className="skeleton h-4 w-1/2 mb-4"></div>
                      <div className="skeleton h-8 w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            )
            : isError
            ? ( // Show error state if error occurred
              <div className="text-center py-12">
                <p className="text-xl mb-4 text-error">
                  Error loading :{" "}
                  {error?.message || "An unknown error occurred"}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => refetch()} // Use combined refetch
                >
                  Retry
                </button>
              </div>
            )
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

          <div className="text-center mt-8">
            <Link to="/products" className="btn btn-outline">
              View All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
