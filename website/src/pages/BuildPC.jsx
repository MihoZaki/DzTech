// src/pages/BuildPC.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "../stores/useStore";
import BuildGif from "../assets/PcBuild.gif";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkAddToCart,
  fetchCategories,
  searchProducts,
} from "../services/api";
import { toast } from "sonner";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "";

const BuildPC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const { buildPcComponents, setPcComponent, clearBuildPcComponents } =
    useStore();
  const [quantities, setQuantities] = useState({});
  const [currentPage, setCurrentPage] = useState({});

  // Tooltips
  const stepInfoTexts = {
    cpu:
      "The CPU is the PC's brain that handles calculations. It must match your motherboard's CPU socket.",
    motherboard:
      "The motherboard connects all components. Ensure it supports your CPU's socket and RAM type.",
    ram:
      "RAM provides temporary storage. Ensure compatibility with your motherboard (DDR4/DDR5).",
    case:
      "The case houses all components. Check motherboard form factor and GPU/PSU clearance.",
    cooler:
      "A CPU cooler dissipates heat. Ensure socket compatibility and case height clearance.",
    "primary-storage":
      "Primary storage (usually NVMe SSD) holds your OS and main apps for fast boot times.",
    "secondary-storage":
      "Secondary storage (HDD or larger SSD) is for mass storage of files, games, and media.",
    gpu:
      "The GPU processes graphics. Essential for gaming/rendering. Check PSU wattage and case length.",
    psu:
      "The PSU supplies power. Ensure enough wattage for your total system draw and efficiency ratings.",
  };

  // --- UPDATED STEPS ARRAY ---
  // IDs must be unique to prevent state/query collisions between primary and secondary storage
  const steps = [
    { id: "cpu", name: "CPU", title: "Select CPU" },
    { id: "motherboard", name: "Motherboard", title: "Select Motherboard" },
    { id: "ram", name: "RAM", title: "Select RAM" },
    { id: "case", name: "Case", title: "Select Case" },
    { id: "cooler", name: "CPU Cooler", title: "Select CPU Cooler" },
    {
      id: "primary-storage",
      name: "Primary Storage",
      title: "Select Primary Storage",
    },
    {
      id: "secondary-storage",
      name: "Secondary Storage",
      title: "Select Secondary Storage",
    },
    { id: "gpu", name: "GPU", title: "Select GPU" },
    { id: "power-supply", name: "PSU", title: "Select Power Supply" },
  ];

  // --- FETCH CATEGORIES ---
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    isError: categoriesError,
    error: categoriesFetchError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    onError: (error) => {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories.");
    },
  });

  // --- UPDATED CATEGORY MAPPING ---
  const categoryMap = useMemo(() => {
    if (!categoriesData) return {};
    const map = {};

    categoriesData.forEach((cat) => {
      const normalizedCatName = cat.name.toLowerCase().replace(/\s+/g, "-");

      // Direct match (e.g., "CPU" -> "cpu")
      if (steps.some((step) => step.id === normalizedCatName)) {
        map[normalizedCatName] = cat.id;
      }

      // Special handling for Storage: Map both primary and secondary steps to the same backend Category ID
      if (normalizedCatName === "storage") {
        map["primary-storage"] = cat.id;
        map["secondary-storage"] = cat.id;
      }
    });
    return map;
  }, [categoriesData]);

  const currentStepId = steps[currentStep]?.id;
  const currentCategoryId = categoryMap[currentStepId];

  // --- FILTER LOGIC ---
  const getFiltersForStep = () => {
    let filters = { category_id: currentCategoryId, limit: 20 };

    switch (currentStepId) {
      case "motherboard":
        if (buildPcComponents.cpu?.spec_highlights?.socket) {
          filters.spec_filter =
            `socket:${buildPcComponents.cpu.spec_highlights.socket}`;
        }
        break;
      case "case":
        if (buildPcComponents.motherboard?.spec_highlights?.form_factor) {
          filters.spec_filter =
            `form_factor:${buildPcComponents.motherboard.spec_highlights.form_factor}`;
        }
        break;
      case "ram":
        if (buildPcComponents.motherboard?.spec_highlights?.ram_type) {
          filters.spec_filter =
            `type:${buildPcComponents.motherboard.spec_highlights.ram_type}`;
        }
        break;
      case "cooler":
        if (buildPcComponents.cpu?.spec_highlights?.socket) {
          filters.spec_filter =
            `supported_sockets:${buildPcComponents.cpu.spec_highlights.socket}`;
        }
        break;
      case "primary-storage":
      case "secondary-storage":
        // Optional: Add specific filters here if needed (e.g., force HDD for secondary)
        break;
      case "gpu":
        if (buildPcComponents.case?.spec_highlights?.max_gpu_length) {
          // Client-side filtering might be safer here unless backend supports numeric operators
        }
        break;
      default:
        break;
    }
    return filters;
  };

  const filters = getFiltersForStep();

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    error: productsFetchError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", currentStepId, filters],
    queryFn: () => searchProducts(filters),
    enabled: !!currentCategoryId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error(`Error fetching products for ${currentStepId}:`, error);
      toast.error(`Failed to load ${currentStepId} options.`);
    },
  });

  const allFetchedProducts = productsData?.data || [];

  // --- DUPLICATE PREVENTION LOGIC FOR STORAGE ---
  const filteredProducts = useMemo(() => {
    // Only apply this filter if we are on a storage step
    if (
      currentStepId !== "primary-storage" &&
      currentStepId !== "secondary-storage"
    ) {
      return allFetchedProducts;
    }

    // Determine the ID of the component selected in the *other* storage slot
    const otherStorageSlot = currentStepId === "primary-storage"
      ? "secondary-storage"
      : "primary-storage";
    const otherSelectedComponent = buildPcComponents[otherStorageSlot];

    // If nothing is selected in the other slot, show all products
    if (!otherSelectedComponent) {
      return allFetchedProducts;
    }

    // Filter out the product that matches the ID of the other selected component
    return allFetchedProducts.filter(
      (product) => product.id !== otherSelectedComponent.id,
    );
  }, [allFetchedProducts, currentStepId, buildPcComponents]);

  // --- PAGINATION LOGIC ---
  const ITEMS_PER_PAGE = 20;
  const currentPageNumber = currentPage[currentStepId] || 1;

  const startIndex = (currentPageNumber - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  // Use filteredProducts for pagination slicing
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Calculate total pages based on filtered count
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const goToPage = (page) => {
    const validatedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage((prev) => ({
      ...prev,
      [currentStepId]: validatedPage,
    }));
  };

  const nextPage = () => {
    if (currentPageNumber < totalPages) goToPage(currentPageNumber + 1);
  };

  const prevPage = () => {
    if (currentPageNumber > 1) goToPage(currentPageNumber - 1);
  };

  // Reset page to 1 if current page is out of bounds due to filtering changes
  React.useEffect(() => {
    if (currentPageNumber > totalPages && totalPages > 0) {
      goToPage(1);
    }
  }, [totalPages, currentPageNumber]);

  const renderPageNumbers = () => {
    const pageButtons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      currentPageNumber - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`btn btn-sm mx-1 ${
            currentPageNumber === i ? "btn-accent" : "btn-secondary btn-outline"
          }`}
          disabled={productsLoading}
        >
          {i}
        </button>,
      );
    }
    return pageButtons;
  };

  const handleQuantityChange = (category, value) => {
    const numValue = Math.max(1, parseInt(value) || 1);
    setQuantities((prev) => ({ ...prev, [category]: numValue }));
  };

  const handleAddBuildToCart = async () => {
    if (!buildPcComponents || Object.keys(buildPcComponents).length === 0) {
      toast.error("Your build is empty!");
      return;
    }

    try {
      const itemsToAdd = Object.entries(buildPcComponents)
        .map(([category, component]) => {
          if (component) {
            const quantity = quantities[category] || 1;
            return { product_id: component.id, quantity };
          }
          return null;
        })
        .filter(Boolean);

      if (itemsToAdd.length === 0) {
        toast.error("No valid components to add.");
        return;
      }

      await bulkAddToCart(itemsToAdd);
      toast.success("Build added to cart successfully!");
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      clearBuildPcComponents();
      navigate("/cart");
    } catch (error) {
      console.error("Error adding build to cart:", error);
      const errorMessage = error?.response?.data?.message ||
        error.message ||
        "Failed to add build.";
      toast.error(errorMessage);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const isBuildComplete = steps.every(
    (step) => buildPcComponents[step.id] != null,
  );

  if (categoriesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-error mb-4">Error loading categories</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentCategoryId) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-warning mb-4">
            Configuration issue: Category for '{currentStepId}' not found.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          >
            Previous
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Build Your PC</h1>

      {/* Hero Section */}
      <div className="relative w-full h-96 mb-8 rounded-xl overflow-hidden shadow-xl border border-base-300">
        <img
          src={BuildGif}
          alt="Building a PC"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">
            Build Your Dream PC
          </h2>
          <p className="text-xl text-white/90 mb-6 text-center max-w-2xl">
            Customize your perfect computer step-by-step.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Steps Navigation */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg border border-secondary-content">
            <div className="card-body">
              <h3 className="font-bold text-lg mb-4">Build Progress</h3>
              <div className="steps steps-vertical">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`step ${
                      index <= currentStep ? "step-primary" : ""
                    } ${buildPcComponents[step.id] ? "step-success" : ""}`}
                    style={{ cursor: "default" }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{step.name}</span>
                      <button
                        className="badge badge-sm badge-info text-info-content rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-help ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`info_modal_${step.id}`)
                            .showModal();
                        }}
                      >
                        i
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Component Selection */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-lg border border-secondary-content">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">
                {steps[currentStep]?.title}
              </h2>

              {productsLoading && (
                <div className="flex justify-center items-center h-48">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              )}

              {productsError && !productsLoading && (
                <div className="alert alert-error">
                  <p>
                    Error loading options: {productsFetchError?.message}
                  </p>
                  <button
                    className="btn btn-sm"
                    onClick={() => refetchProducts()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!productsLoading &&
                !productsError &&
                totalPages > 1 && (
                <div className="flex items-center justify-between mb-4">
                  <button
                    className="btn btn-sm btn-secondary btn-outline"
                    onClick={prevPage}
                    disabled={currentPageNumber === 1 || productsLoading}
                  >
                    Previous
                  </button>
                  <div className="flex items-center">
                    {renderPageNumbers()}
                  </div>
                  <button
                    className="btn btn-sm btn-accent btn-outline"
                    onClick={nextPage}
                    disabled={currentPageNumber === totalPages ||
                      productsLoading}
                  >
                    Next
                  </button>
                </div>
              )}

              {!productsLoading && !productsError && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {paginatedProducts.map((component) => {
                    const isSelected =
                      buildPcComponents[currentStepId]?.id === component.id;
                    return (
                      <div
                        key={component.id}
                        className={`card bg-base-100 shadow-md rounded-lg border border-secondary-content cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-primary/10 border-2 border-primary shadow-lg"
                            : "hover:shadow-lg"
                        }`}
                        onClick={() => setPcComponent(currentStepId, component)}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-center gap-4">
                            <div className="rounded-md overflow-hidden bg-base-200 p-1">
                              <img
                                src={component.image_urls?.[0] ||
                                  "https://placehold.co/100x100?text=No+Image"}
                                alt={component.name}
                                className="w-16 h-16 object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="card-title font-bold text-sm truncate">
                                {component.name}
                              </h3>
                              <p className="text-lg font-bold text-primary bg-primary/10 px-2 py-1 rounded inline-block mb-1">
                                DZD {component.price_cents / 100}
                              </p>
                              <div className="text-xs opacity-75 mt-1">
                                {Object.entries(
                                  component.spec_highlights || {},
                                )
                                  .slice(0, 3)
                                  .map(([key, value]) => (
                                    <div key={key} className="truncate">
                                      <span className="font-medium capitalize">
                                        {key}:
                                      </span>{" "}
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : value}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary Section with Quantity Steppers */}
              <div className="card bg-inherit shadow-inner mt-6 border border-secondary-content">
                <div className="card-body">
                  <h3 className="card-title text-lg">Current Build</h3>
                  <div className="space-y-2">
                    {Object.entries(buildPcComponents).map(
                      ([category, component]) => {
                        const currentQty = quantities[category] || 1;

                        return (
                          <div
                            key={category}
                            className="flex justify-between items-center"
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <span className="font-medium text-base-content capitalize">
                                {category.replace(/-/g, " ")}:
                              </span>
                              <span className="text-sm ml-2 truncate block sm:inline sm:truncate">
                                {component?.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Price Display */}
                              <span className="font-bold text-sm w-24 text-right hidden sm:block">
                                {(component?.price_cents / 100).toFixed(2)} DA
                              </span>

                              {/* Quantity Stepper */}
                              <div className="flex items-center border border-base-300 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      category,
                                      currentQty - 1,
                                    )}
                                  disabled={currentQty <= 1}
                                  className="btn btn-xs btn-ghost h-8 w-8 p-0 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  value={currentQty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      category,
                                      e.target.value,
                                    )}
                                  className="input input-ghost w-12 h-8 p-0 text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  style={{ minWidth: "2.5rem" }}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      category,
                                      currentQty + 1,
                                    )}
                                  className="btn btn-xs btn-ghost h-8 w-8 p-0 hover:bg-base-200"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="divider"></div>

                  {/* Total Calculation */}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">
                      DZD {Object.entries(buildPcComponents).reduce(
                        (sum, [category, component]) => {
                          const quantity = quantities[category] || 1;
                          return (
                            sum +
                            ((component?.price_cents || 0) / 100) * quantity
                          );
                        },
                        0,
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-4">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  Previous
                </button>

                {isLastStep
                  ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleAddBuildToCart}
                    >
                      Add Build to Cart
                    </button>
                  )
                  : (
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setCurrentStep(
                          Math.min(steps.length - 1, currentStep + 1),
                        )}
                    >
                      Next
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {steps.map((step) => (
        <dialog
          key={step.id}
          id={`info_modal_${step.id}`}
          className="modal"
        >
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-2">{step.name} Information</h3>
            <p className="py-2">{stepInfoTexts[step.id]}</p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      ))}
    </div>
  );
};

export default BuildPC;
