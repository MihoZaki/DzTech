// src/components/Headers/HeaderStats.js
import React from "react";

// components
import CardStats from "components/Cards/CardStats.js";

export default function HeaderStats() {
  return (
    <>
      {/* Header */}
      {/* Changed background color to indigo-800 for consistency */}
      <div className="relative bg-lightBlue-700 md:pt-32 pb-32 pt-12">
        <div className="px-4 md:px-10 mx-auto w-full">
          <div>
            {/* Card stats */}
            <div className="flex flex-wrap">
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardStats
                  statSubtitle="TRAFFIC"
                  statTitle="350,897"
                  statArrow="up"
                  statPercent="3.48"
                  statPercentColor="text-emerald-500" // Kept emerald for positive trend
                  statDescripiron="Since last month"
                  statIconName="far fa-chart-bar"
                  statIconColor="bg-amber-500" // Changed icon color to amber
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardStats
                  statSubtitle="NEW USERS"
                  statTitle="2,356"
                  statArrow="down"
                  statPercent="3.48"
                  statPercentColor="text-red-500" // Kept red for negative trend
                  statDescripiron="Since last week"
                  statIconName="fas fa-chart-pie"
                  statIconColor="bg-emerald-500" // Changed icon color to emerald
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardStats
                  statSubtitle="SALES"
                  statTitle="924"
                  statArrow="down"
                  statPercent="1.10"
                  statPercentColor="text-orange-500" // Kept orange (could change to amber if preferred)
                  statDescripiron="Since yesterday"
                  statIconName="fas fa-users"
                  statIconColor="bg-indigo-500" // Changed icon color to indigo
                />
              </div>
              <div className="w-full lg:w-6/12 xl:w-3/12 px-4">
                <CardStats
                  statSubtitle="PERFORMANCE"
                  statTitle="49,65%"
                  statArrow="up"
                  statPercent="12"
                  statPercentColor="text-emerald-500" // Kept emerald for positive trend
                  statDescripiron="Since last month"
                  statIconName="fas fa-percent"
                  statIconColor="bg-amber-500" // Changed icon color to amber
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
