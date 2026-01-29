// src/components/FilterPanel.jsx
import React, { useEffect, useState } from "react";
import { fetchCategories } from "../services/api"; // Import fetchCategories

const FilterPanel = ({ filters, onFilterChange }) => { // Removed categories prop as we fetch them here
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); // Optional loading state for categories

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true); // Optional
        const data = await fetchCategories();
        // Map to the format expected by the select (id, name)
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories for filter:", error);
        // Optionally, set an error state or show a message
      } finally {
        setLoading(false); // Optional
      }
    };

    loadCategories();
  }, []);

  if (loading) { // Optional: Show loading state for categories
    return (
      <div className="bg-base-100 p-4 rounded-lg shadow-md">
        <div className="skeleton h-4 w-1/4 mb-4"></div>
        <div className="skeleton h-10 w-full mb-4"></div>
        <div className="skeleton h-10 w-full mb-4"></div>
        <div className="skeleton h-10 w-full mb-4"></div>
        <div className="skeleton h-8 w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 p-4 rounded-lg shadow-md">
      <h3 className="font-bold text-lg mb-4 ">Filters</h3>

      {/* Category Filter - Updated to use fetched categories */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text ">Category</span>
        </label>
        <select
          className="select select-bordered w-full bg-primary-content"
          value={filters.category}
          onChange={(e) => onFilterChange("category", e.target.value)}
        >
          <option value="" className="bg-primary-content">
            All Categories
          </option>
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.name}
              className="bg-primary-content"
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text ">Price Range</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            className="input input-bordered bg-primary-content  border-gray-600"
            value={filters.minPrice}
            onChange={(e) => onFilterChange("minPrice", e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            className="input input-bordered bg-primary-content  border-gray-600"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange("maxPrice", e.target.value)}
          />
        </div>
      </div>

      {/* Brand Filter */}
      <div className="mb-4">
        <label className="label">
          <span className="label-text ">Brand</span>
        </label>
        <select
          className="select select-bordered w-full bg-primary-content  border-gray-600"
          value={filters.brand}
          onChange={(e) => onFilterChange("brand", e.target.value)}
        >
          <option value="" className="bg-primary-content ">
            All Brands
          </option>
          <option value="Intel" className="bg-primary-content ">
            Intel
          </option>
          <option value="AMD" className="bg-primary-content ">AMD</option>
          <option value="NVIDIA" className="bg-primary-content ">
            NVIDIA
          </option>
          <option value="Samsung" className="bg-primary-content ">
            Samsung
          </option>
          <option value="Corsair" className="bg-primary-content ">
            Corsair
          </option>
        </select>
      </div>

      <button
        className="btn btn-secondary text-primary bg-primary-content hover:bg-primary-content/70 w-full"
        onClick={() => onFilterChange("reset")}
      >
        Reset Filters
      </button>
    </div>
  );
};

export default FilterPanel;
