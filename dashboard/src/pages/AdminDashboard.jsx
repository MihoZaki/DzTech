import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAverageOrderValueAnalytics,
  fetchLowStockAnalytics,
  fetchNewCustomersAnalytics,
  fetchOrderStatusCountsAnalytics, // Import the new function
  fetchRevenueAnalytics,
  fetchSalesVolumeAnalytics,
  fetchTopCategoriesAnalytics,
  fetchTopProductsAnalytics,
} from "../services/api";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState("month"); // "day", "week", "month", "year"

  // State for low stock threshold
  const [lowStockThreshold, setLowStockThreshold] = useState(10); // Default to 10

  // Calculate start/end dates based on timeRange using useMemo
  const { start, end } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);

    if (timeRange === "day") {
      start.setDate(start.getDate() - 1);
    } else if (timeRange === "week") {
      start.setDate(start.getDate() - 7);
    } else if (timeRange === "month") {
      start.setMonth(start.getMonth() - 1);
    } else if (timeRange === "year") {
      start.setFullYear(start.getFullYear() - 1);
    }
    return { start: start.toISOString(), end: now.toISOString() };
  }, [timeRange]);

  // Fetch revenue, sales volume, average order value, new customers, top products, top categories, AND order status counts data (dependent on time range)
  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsApiError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["dashboardMetrics", timeRange],
    queryFn: async () => {
      const [
        revenueRes,
        volumeRes,
        aovRes,
        newCustomersRes,
        topProductsRes,
        topCategoriesRes,
        orderStatusCountsRes,
      ] = await Promise.all([
        fetchRevenueAnalytics({ start_date: start, end_date: end }),
        fetchSalesVolumeAnalytics({ start_date: start, end_date: end }),
        fetchAverageOrderValueAnalytics({ start_date: start, end_date: end }),
        fetchNewCustomersAnalytics({ start_date: start, end_date: end }),
        fetchTopProductsAnalytics({
          start_date: start,
          end_date: end,
          limit: 5,
        }), // Example: top 5
        fetchTopCategoriesAnalytics({
          start_date: start,
          end_date: end,
          limit: 5,
        }), // Example: top 5
        fetchOrderStatusCountsAnalytics({ start_date: start, end_date: end }), // Fetch status counts
      ]);
      return {
        revenue: revenueRes.data,
        salesVolume: volumeRes.data,
        averageOrderValue: aovRes.data,
        newCustomers: newCustomersRes.data,
        topProducts: topProductsRes.data,
        topCategories: topCategoriesRes.data,
        orderStatusCounts: orderStatusCountsRes.data, // Add order status counts data
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Fetch low stock data separately (independent of time range, dependent on threshold)
  const {
    data: lowStockData,
    isLoading: lowStockLoading,
    isError: lowStockError,
    error: lowStockApiError,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ["analytics", "lowStock", lowStockThreshold],
    queryFn: () => fetchLowStockAnalytics({ threshold: lowStockThreshold }),
    select: (response) => response.data,
    staleTime: 1 * 60 * 1000,
    retry: false,
  });

  // Destructure the time-range dependent metrics data
  const {
    revenue,
    salesVolume,
    averageOrderValue,
    newCustomers,
    topProducts,
    topCategories,
    orderStatusCounts,
  } = metricsData || {};

  // Helper function to format currency from cents
  const formatCurrency = (cents) => {
    if (typeof cents !== "number") return "N/A";
    return (cents / 100).toFixed(2);
  };

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  // Determine the label for the time range
  let timeRangeLabel = "Last Month";
  if (timeRange === "day") {
    timeRangeLabel = "Last Day";
  } else if (timeRange === "week") {
    timeRangeLabel = "Last Week";
  } else if (timeRange === "year") {
    timeRangeLabel = "Last Year";
  }

  // Determine overall loading state for main metrics
  const overallMetricsLoading = metricsLoading;

  // Determine overall error state for main metrics
  const overallMetricsError = metricsError;

  if (overallMetricsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (overallMetricsError) {
    return (
      <div className="alert alert-error shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Error loading dashboard metrics:{" "}
          {metricsApiError.message || "An unknown error occurred"}. Please try
          again.
        </span>
        <button onClick={refetchMetrics} className="btn btn-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="container bg-primary-content mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Time Range Selector */}
      <div className="bg-base-100 p-4 rounded-box mb-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select Time Range</span>
          </label>
          <div className="flex flex-wrap gap-4">
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Day</span>
                <input
                  type="radio"
                  name="timeRange"
                  className="radio radio-primary"
                  checked={timeRange === "day"}
                  onChange={() => setTimeRange("day")}
                />
              </label>
            </div>
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Week</span>
                <input
                  type="radio"
                  name="timeRange"
                  className="radio radio-primary"
                  checked={timeRange === "week"}
                  onChange={() => setTimeRange("week")}
                />
              </label>
            </div>
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Month</span>
                <input
                  type="radio"
                  name="timeRange"
                  className="radio radio-primary"
                  checked={timeRange === "month"}
                  onChange={() => setTimeRange("month")}
                />
              </label>
            </div>
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">Year</span>
                <input
                  type="radio"
                  name="timeRange"
                  className="radio radio-primary"
                  checked={timeRange === "year"}
                  onChange={() => setTimeRange("year")}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="card bg-primary text-primary-content shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <CurrencyDollarIcon className="w-6 h-6" />
              Revenue ({timeRangeLabel})
            </h2>
            <p className="text-3xl font-bold">
              {revenue
                ? `DZD ${formatCurrency(revenue.total_revenue_cents)}`
                : "N/A"}
            </p>
            <p className="text-xs opacity-75">
              {revenue
                ? `${new Date(revenue.start_date).toLocaleDateString()} - ${
                  new Date(revenue.end_date).toLocaleDateString()
                }`
                : "Calculating..."}
            </p>
          </div>
        </div>

        {/* Sales Volume Card */}
        <div className="card bg-secondary text-secondary-content shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <ShoppingCartIcon className="w-6 h-6" />
              Sales Volume ({timeRangeLabel})
            </h2>
            <p className="text-3xl font-bold">
              {salesVolume ? salesVolume.total_orders : "N/A"}
            </p>
            <p className="text-xs opacity-75">Delivered Orders</p>
          </div>
        </div>

        {/* Average Order Value Card */}
        <div className="card bg-accent text-accent-content shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <CurrencyDollarIcon className="w-6 h-6" />
              Avg. Order Value ({timeRangeLabel})
            </h2>
            <p className="text-3xl font-bold">
              {averageOrderValue
                ? `DZD ${formatCurrency(averageOrderValue.aov_cents)}`
                : "N/A"}
            </p>
            <p className="text-xs opacity-75">AOV</p>
          </div>
        </div>

        {/* New Customers Card */}
        <div className="card bg-info text-info-content shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <UserPlusIcon className="w-6 h-6" />
              New Customers ({timeRangeLabel})
            </h2>
            <p className="text-3xl font-bold">
              {newCustomers ? newCustomers.new_customers_count : "N/A"}
            </p>
            <p className="text-xs opacity-75">Registrations</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      <div className="bg-neutral p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Low Stock Alerts</h2>
          {/* Threshold Selector */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Threshold</span>
            </label>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {lowStockLoading && (
          <div className="flex justify-center items-center h-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {lowStockError && (
          <div className="alert alert-error">
            Error loading low stock {lowStockApiError.message}
            <button onClick={refetchLowStock} className="btn btn-sm ml-4">
              Retry
            </button>
          </div>
        )}
        {lowStockData && lowStockData.data && lowStockData.data.length > 0
          ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product ID</th> {/* Column header remains the same */}
                    <th>Name</th>
                    <th>Stock Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockData.data.map((product) => (
                    <tr key={product.id} className="hover:bg-base-200">
                      <td title={product.id}>
                        {/* Wrap the truncated ID in a Link */}
                        <Link
                          to={`/admin/products/${product.id}`} // Navigate to product detail page
                          className="link link-hover link-primary" // Add styling for links
                        >
                          {truncateUuid(product.id)}
                        </Link>
                      </td>
                      <td>{product.name}</td>
                      <td>
                        <span className="badge badge-error">
                          {product.stock_quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : (
            <p>
              No products found with stock below the threshold
              ({lowStockThreshold}).
            </p>
          )}
      </div>

      {/* Top Products Sold Section */}
      <div className="bg-neutral p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">
          Top Products Sold ({timeRangeLabel})
        </h2>
        {metricsLoading && (
          <div className="flex justify-center items-center h-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {metricsError && (
          <div className="alert alert-error">
            Error loading top products {metricsApiError.message}
            <button onClick={refetchMetrics} className="btn btn-sm ml-4">
              Retry
            </button>
          </div>
        )}
        {topProducts?.data && topProducts.data.length > 0
          ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product ID</th> {/* Add column header */}
                    <th>Product Name</th>
                    <th>Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.data.map((product, index) => (
                    <tr key={product.id} className="hover:bg-base-200">
                      <td>{index + 1}</td>
                      <td title={product.id}>
                        {/* Wrap the truncated ID in a Link */}
                        <Link
                          to={`/admin/products/${product.id}`} // Navigate to product detail page
                          className="link link-hover " // Add styling for links
                        >
                          {truncateUuid(product.id)}
                        </Link>
                      </td>
                      <td>{product.name}</td>
                      <td>{product.total_units_sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : <p>No top products data available for the selected time range.</p>}
      </div>

      {/* Top Categories Sold Section */}
      <div className="bg-neutral p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">
          Top Categories Sold ({timeRangeLabel})
        </h2>
        {metricsLoading && (
          <div className="flex justify-center items-center h-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {metricsError && (
          <div className="alert alert-error">
            Error loading top categories {metricsApiError.message}
            <button onClick={refetchMetrics} className="btn btn-sm ml-4">
              Retry
            </button>
          </div>
        )}
        {topCategories?.data && topCategories.data.length > 0
          ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Category Name</th>
                    <th>Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.data.map((category, index) => (
                    <tr key={category.id} className="hover:bg-base-200">
                      <td>{index + 1}</td>
                      <td>{category.name}</td>
                      <td>{category.total_units_sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          : (
            <p>
              No top categories data available for the selected time range.
            </p>
          )}
      </div>

      {/* Order Status Counts Section - New */}
      <div className="bg-neutral p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">
          Order Status Counts ({timeRangeLabel})
        </h2>
        {metricsLoading && (
          <div className="flex justify-center items-center h-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        {metricsError && (
          <div className="alert alert-error">
            Error loading order status counts {metricsApiError.message}
            <button onClick={refetchMetrics} className="btn btn-sm ml-4">
              Retry
            </button>
          </div>
        )}
        {orderStatusCounts?.data && orderStatusCounts.data.length > 0
          ? (
            <div className="flex flex-wrap gap-4">
              {orderStatusCounts.data.map((statusCount) => (
                <div key={statusCount.status} className="stats shadow">
                  <div className="stat">
                    <div className="stat-title capitalize">
                      {statusCount.status}
                    </div>
                    <div className="stat-value">{statusCount.count}</div>
                    <div className="stat-desc">&nbsp;</div>
                  </div>
                </div>
              ))}
            </div>
          )
          : <p>No order status data available for the selected time range.</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;
