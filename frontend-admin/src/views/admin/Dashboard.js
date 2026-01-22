// src/views/admin/Dashboard.js
import React from "react";

// Example components from the template that could be useful
import CardStats from "components/Cards/CardStats.js";
// Assuming you have chart components, adapt these imports based on your template
// import CardLineChart from "components/Cards/CardLineChart.js";
// import CardBarChart from "components/Cards/CardBarChart.js";
// Or use simple placeholders for now if chart components are complex
import CardLineChart from "components/Cards/CardLineChart.js"; // Use existing if available
import CardBarChart from "components/Cards/CardBarChart.js"; // Use existing if available
// import CardTable from "components/Cards/CardTable.js"; // Could be adapted for recent orders/top products

export default function Dashboard() {
  const statsData = [
    {
      title: "Total Revenue",
      value: "900.897,00 DZD",
      percentage: "+3.48%",
      // Use a color that corresponds to a background class expected by CardStats
      // Common ones are: blue, red, green, orange, indigo, purple, gray, lightBlue, cyan, teal, yellow, lime, amber, emerald, turquoise, sky, violet, fuchsia, pink, rose
      color: "bg-indigo-300", // Using blue as per your updated code
      icon: "fas fa-money-bill-wave", // Use a more specific icon name
    },
    {
      title: "Total Orders",
      value: "2,345",
      percentage: "+12.3%",
      color: "bg-amber-400", // Using orange as per your updated code
      icon: "fas fa-shopping-cart", // Use a more specific icon name
    },
    {
      title: "New Customers",
      value: "1,254",
      percentage: "+5.4%",
      color: "bg-emerald-300", // Using green as per your updated code
      icon: "fas fa-users", // Use a more specific icon name
    },
    {
      title: "Avg. Order Value",
      value: "35.500,00 DZD",
      percentage: "+0.3%",
      color: "bg-red-400", // Using red as per your updated code
      icon: "fas fa-tag", // Use a more specific icon name
    },
  ];

  // Example recent orders data
  const recentOrders = [
    {
      id: "#ORD-001",
      customer: "Muhammed 2",
      amount: "15.000,00 DZD",
      status: "Delivered",
    },
    {
      id: "#ORD-002",
      customer: "Muhammed 1",
      amount: "28.500,00 DZD",
      status: "Shipped",
    },
    {
      id: "#ORD-003",
      customer: "Islam 1",
      amount: "67.900,00 DZD",
      status: "Pending",
    },
    {
      id: "#ORD-004",
      customer: "Akram 4",
      amount: "45.500,00 DZD",
      status: "Processing",
    },
    {
      id: "#ORD-005",
      customer: "Adem 11",
      amount: "32.750,00 DZD",
      status: "Delivered",
    },
  ];

  // Example top products data
  const topProducts = [
    { name: "Product A", sold: 150, stock: 85 },
    { name: "Product B", sold: 120, stock: 200 },
    { name: "Product C", sold: 95, stock: 30 },
    { name: "Product D", sold: 80, stock: 150 },
    { name: "Product E", sold: 75, stock: 50 },
  ];

  return (
    <>
      {/* The main content area inside the Admin layout */}
      <div className="w-full px-4">
        <div className="flex flex-wrap -mx-4">
          {/* Stats Cards Row */}
          <div className="w-full mb-12 px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.map((stat, index) => (
              <CardStats
                key={index}
                statSubtitle={stat.title}
                statTitle={stat.value}
                statArrow={stat.percentage.startsWith("+") ? "up" : "down"} // Simple arrow logic
                statPercent={`${Math.abs(parseFloat(stat.percentage))}%`} // Show absolute percentage value
                statPercentColor={`text-${stat.color}-500`} // Use color for percentage text
                statDescription="Since last month" // Static description for now
                statIconName={stat.icon} // Use the specific icon name
                statIconColor={stat.color} // Use color for icon background - ensure this matches CardStats expectations
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="w-full lg:w-8/12 mb-12 px-4">
            <CardLineChart /> {/* Use the template's chart component */}
          </div>
          <div className="w-full lg:w-4/12 mb-12 px-4">
            <CardBarChart /> {/* Use the template's chart component */}
          </div>

          {/* Tables Row (Recent Orders, Top Products) */}
          <div className="w-full mb-12 px-4">
            <div className="flex flex-wrap -mx-4">
              <div className="w-full lg:w-6/12 mb-12 lg:mb-0 px-4">
                {/* Recent Orders Table Card */}
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
                  {/* Background remains white */}
                  <div className="rounded-t mb-0 px-4 py-3 border-0 border-b border-amber-200">
                    {/* Added bottom border with amber color */}
                    <div className="flex flex-wrap items-center">
                      <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                        <h3 className="font-semibold text-lg text-amber-700">
                          Recent Orders
                        </h3>{" "}
                        {/* Changed header text color to amber */}
                      </div>
                      {/* Optional button: */}
                      {
                        /* <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                        <button className="bg-amber-500 text-white active:bg-amber-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
                          See All
                        </button>
                      </div> */
                      }
                    </div>
                  </div>
                  <div className="block w-full overflow-x-auto">
                    <table className="items-center w-full bg-transparent border-collapse">
                      <thead>
                        <tr>
                          <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Order ID
                          </th>
                          <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Customer
                          </th>
                          {/* FIXED: Changed text color to white for visibility on dark bg */}
                          <th className="px-6 bg-blueGray-500 text-white align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Amount
                          </th>
                          {/* FIXED: Changed text color to white for visibility on dark bg */}
                          <th className="px-6 bg-blueGray-500 text-white align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order, index) => (
                          <tr key={index} className="hover:bg-blueGray-50">
                            {/* Added hover effect */}
                            <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left text-blueGray-700">
                              {/* Changed text color */}
                              {order.id}
                            </th>
                            <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-700">
                              {/* Changed text color */}
                              {order.customer}
                            </td>
                            <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-700">
                              {/* Changed text color */}
                              {order.amount}
                            </td>
                            <td className="border-t-0 px-6 align-center border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                              <span
                                className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  order.status === "Delivered"
                                    ? "bg-emerald-100 text-emerald-800" // Green for success/delivered
                                    : order.status === "Shipped"
                                    ? "bg-amber-100 text-amber-800" // Amber for in-progress/shipped
                                    : order.status === "Pending"
                                    ? "bg-indigo-100 text-indigo-800" // Indigo for pending
                                    : "bg-red-100 text-red-800" // Red for error/processing issues (fallback)
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-6/12 px-4">
                {/* Top Products Table Card */}
                <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
                  {/* Background remains white */}
                  <div className="rounded-t mb-0 px-4 py-3 border-0 border-b border-amber-200">
                    {/* Added bottom border with amber color */}
                    <div className="flex flex-wrap items-center">
                      <div className="relative w-full px-4 max-w-full flex-grow flex-1">
                        <h3 className="font-semibold text-lg text-amber-700">
                          Top Selling Products
                        </h3>{" "}
                        {/* Changed header text color to amber */}
                      </div>
                      {/* Optional button: */}
                      {
                        /* <div className="relative w-full px-4 max-w-full flex-grow flex-1 text-right">
                        <button className="bg-amber-500 text-white active:bg-amber-600 text-xs font-bold uppercase px-3 py-1 rounded outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150" type="button">
                          See All
                        </button>
                      </div> */
                      }
                    </div>
                  </div>
                  <div className="block w-full overflow-x-auto">
                    <table className="items-center w-full bg-transparent border-collapse">
                      <thead>
                        <tr>
                          <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Product Name
                          </th>
                          <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Units Sold
                          </th>
                          {/* FIXED: Changed text color to white for visibility on dark bg */}
                          <th className="px-6 bg-blueGray-500 text-white align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                            Stock Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-blueGray-50">
                            {/* Added hover effect */}
                            <th className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-700">
                              {/* Changed text color */}
                              {product.name}
                            </th>
                            <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-700">
                              {/* Changed text color */}
                              {product.sold}
                            </td>
                            <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                              <span
                                className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.stock > 100
                                    ? "bg-emerald-100 text-emerald-800" // Good stock - emerald
                                    : product.stock > 50
                                    ? "bg-amber-100 text-amber-800" // Medium stock - amber
                                    : "bg-red-100 text-red-800" // Low stock - red
                                }`}
                              >
                                {product.stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
