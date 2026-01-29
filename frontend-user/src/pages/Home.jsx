// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { fetchCategories, fetchProducts } from "../services/api"; // Import the new API functions

// Import the hero background image
import heroBackgroundImage from "../assets/heroBackgroundImage.png";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Fetch products (this internally fetches categories if needed)
        const products = await fetchProducts();
        setFeaturedProducts(products.slice(0, 8)); // Get first 8 products
      } catch (error) {
        console.error("Error fetching products:", error);
        // Optionally, set an error state or show a message to the user
      } finally {
        setLoading(false); // Stop loading indicator regardless of success/error
      }
    };
    loadProducts();
  }, []); // Empty dependency array means this runs once on mount

  const hardcodedCategories = [
    // [0] Big card: CPUs (spans 2 cols × 2 rows)
    {
      id: "cpus",
      name: "CPUs",
      image: "https://placehold.co/800x600/1e293b/ffffff?text=CPUs",
      isBig: true,
    },
    // [1] Top-right
    {
      id: "gpus",
      name: "GPUs",
      image: "https://placehold.co/600x400/1e293b/ffffff?text=GPUs",
      isBig: false,
    },
    // [2] Below GPUs
    {
      id: "ram",
      name: "RAM",
      image: "https://placehold.co/500x400/1e293b/ffffff?text=RAM",
      isBig: false,
    },
    // [3] Below RAM
    {
      id: "storage",
      name: "Storage",
      image: "https://placehold.co/700x500/1e293b/ffffff?text=Storage",
      isBig: false,
    },
    // [4] Right of big card (row 1, col 3)
    {
      id: "motherboards",
      name: "Motherboards",
      image: "https://placehold.co/600x450/1e293b/ffffff?text=Mobo",
      isBig: false,
    },
    // [5] Below motherboards
    {
      id: "cases",
      name: "Cases",
      image: "https://placehold.co/550x350/1e293b/ffffff?text=Cases",
      isBig: false,
    },
    // [6] Below cases
    {
      id: "psus",
      name: "PSUs",
      image: "https://placehold.co/450x400/1e293b/ffffff?text=PSU",
      isBig: false,
    },
    // [7] Bottom-right (last slot)
    {
      id: "peripherals",
      name: "Peripherals",
      image: "https://placehold.co/650x450/1e293b/ffffff?text=Peripherals",
      isBig: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - With Imported Background Image */}
      <section
        className="hero min-h-96 text-base-content"
        style={{
          backgroundImage: `url(${heroBackgroundImage})`, // Use the imported variable
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="hero-overlay bg-opacity-60 bg-base-100"></div>{" "}
        {/* Optional overlay for contrast */}
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Welcome to ALM Informatique
            </h1>
            <p className="text-xl mb-8 text-base-content/80">
              Your trusted partner for all your tech needs.
            </p>
            <Link to="/products" className="btn btn-primary">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section — Image with Name Button in Corner */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Shop by Category
          </h2>

          {/* Fixed 4-column grid, explicit placement using hardcoded categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 0: Big CPU card — spans col 1-2, row 1-2 */}
            <Link
              key={hardcodedCategories[0].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[0].name.toLowerCase())
              }`}
              className="lg:col-span-2 lg:row-span-2 flex flex-col" // Add flex properties to the link
            >
              <div className="relative flex-grow overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col">
                <img
                  src={hardcodedCategories[0].image}
                  alt={hardcodedCategories[0].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[0].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Cards 1–7: Fixed positions using hardcoded categories */}
            {/* Row 1, Col 3 */}
            <Link
              key={hardcodedCategories[1].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[1].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-full w-full overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[1].image}
                  alt={hardcodedCategories[1].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[1].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 2, Col 3 */}
            <Link
              key={hardcodedCategories[2].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[2].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[2].image}
                  alt={hardcodedCategories[2].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[2].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 3, Col 3 */}
            <Link
              key={hardcodedCategories[3].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[3].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[3].image}
                  alt={hardcodedCategories[3].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[3].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 1, Col 4 */}
            <Link
              key={hardcodedCategories[4].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[4].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[4].image}
                  alt={hardcodedCategories[4].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[4].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 2, Col 4 */}
            <Link
              key={hardcodedCategories[5].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[5].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[5].image}
                  alt={hardcodedCategories[5].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[5].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 3, Col 4 */}
            <Link
              key={hardcodedCategories[6].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[6].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[6].image}
                  alt={hardcodedCategories[6].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[6].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>

            {/* Row 4, Col 4 (bottom-right) */}
            <Link
              key={hardcodedCategories[7].id}
              to={`/products?category=${
                encodeURIComponent(hardcodedCategories[7].name.toLowerCase())
              }`}
              className="lg:col-span-1 lg:row-span-1"
            >
              <div className="relative h-64 overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <img
                  src={hardcodedCategories[7].image}
                  alt={hardcodedCategories[7].name}
                  className="w-full h-full object-cover"
                />
                {/* Name Button in Top-Left Corner */}
                <button className="btn btn-primary absolute top-4 left-4 z-10 text-white">
                  {hardcodedCategories[7].name}
                </button>
                {/* Shop Now Button Overlay (Center) */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="btn btn-secondary text-white">Shop Now</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 px-4 bg-base-200">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">
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
