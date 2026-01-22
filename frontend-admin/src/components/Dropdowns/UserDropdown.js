import React from "react";
import { createPopper } from "@popperjs/core";

// Import the image directly
import profileImage from "assets/img/team-1-800x800.jpg";

const UserDropdown = () => {
  // dropdown props
  const [dropdownPopoverShow, setDropdownPopoverShow] = React.useState(false);
  const btnDropdownRef = React.createRef();
  const popoverDropdownRef = React.createRef();

  // Initialize Popper using useEffect
  React.useEffect(() => {
    let popperInstance = null;

    if (
      dropdownPopoverShow && btnDropdownRef.current &&
      popoverDropdownRef.current
    ) {
      popperInstance = createPopper(
        btnDropdownRef.current,
        popoverDropdownRef.current,
        {
          placement: "bottom-start",
        },
      );
    }

    // Cleanup function to destroy the popper instance when component unmounts or deps change
    return () => {
      if (popperInstance) {
        popperInstance.destroy();
      }
    };
  }, [dropdownPopoverShow]); // Only re-run when dropdownPopoverShow changes

  const openDropdownPopover = () => {
    setDropdownPopoverShow(true);
    // createPopper call is now handled by useEffect
  };

  const closeDropdownPopover = () => {
    setDropdownPopoverShow(false);
  };

  return (
    <>
      <a
        className="text-blueGray-500 block"
        href="#pablo"
        ref={btnDropdownRef}
        onClick={(e) => {
          e.preventDefault();
          dropdownPopoverShow ? closeDropdownPopover() : openDropdownPopover();
        }}
      >
        <div className="items-center flex">
          {/* Use the imported image variable */}
          <span className="w-12 h-12 text-sm text-white bg-blueGray-200 inline-flex items-center justify-center rounded-full">
            <img
              alt="..."
              className="w-full rounded-full align-middle border-none shadow-lg"
              src={profileImage} // Use the imported variable
            />
          </span>
        </div>
      </a>
      {/* Ensure the dropdown div has the correct visibility class */}
      <div
        ref={popoverDropdownRef}
        className={(dropdownPopoverShow ? "block " : "hidden ") + // Toggle visibility based on state
          "bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48"}
      >
        <a
          href="#pablo"
          className={"text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"}
          onClick={(e) => e.preventDefault()}
        >
          Action
        </a>
        <a
          href="#pablo"
          className={"text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"}
          onClick={(e) => e.preventDefault()}
        >
          Another action
        </a>
        <a
          href="#pablo"
          className={"text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"}
          onClick={(e) => e.preventDefault()}
        >
          Something else here
        </a>
        <div className="h-0 my-2 border border-solid border-blueGray-100" />
        <a
          href="#pablo"
          className={"text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent text-blueGray-700"}
          onClick={(e) => e.preventDefault()}
        >
          Seprated link
        </a>
      </div>
    </>
  );
};

export default UserDropdown;
