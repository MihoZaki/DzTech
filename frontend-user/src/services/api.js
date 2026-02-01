const API_BASE_URL = "http://localhost:8080/api/v1";

let categoriesCache = null;

export const fetchCategories = async () => {
  if (categoriesCache) {
    return categoriesCache;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/products/categories`);
    if (!response.ok) {
      throw new Error(
        `HTTP error fetching categories! Status: ${response.status}`,
      );
    }
    const data = await response.json();
    // console.log("Raw Categories Response:", data); // Log the raw response
    categoriesCache = data; // Cache the result
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

// Function to get category name by ID
const getCategoryNameById = async (categoryId) => {
  const categories = await fetchCategories();
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? category.name : "Unknown Category"; // Fallback if ID not found
};

// Transform API product to frontend product shape
const transformProduct = async (apiProduct) => {
  const categoryName = await getCategoryNameById(apiProduct.category_id);

  return {
    id: apiProduct.id,
    title: apiProduct.name, // Map 'name' to 'title'
    description: apiProduct.spec_highlights?.type || apiProduct.description ||
      "", // Use spec highlight, or description, or empty string as fallback
    price: apiProduct.price_cents / 100, // Convert cents to dollars
    image: apiProduct.image_urls[0], // Take the first image URL
    category: categoryName, // Use the resolved category name
    brand: apiProduct.brand,
    stock: apiProduct.stock_quantity,
    status: apiProduct.status,
    // Include other fields if needed, e.g., spec_highlights, created_at, updated_at
  };
};

export const fetchProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json(); // Get the full response object
    // console.log("Raw Products Response:", responseData.data); // Log the raw response
    console.log("-----------------------------");
    // Extract the 'data' array from the response object
    const dataArray = responseData.data;
    console.log("data array content:", dataArray);
    // Check if the extracted data is an array
    if (!Array.isArray(dataArray)) {
      throw new Error(
        'Expected an array of products inside the "data" property of the response.',
      );
    }

    // Transform each product in the extracted array
    const transformedProducts = await Promise.all(
      dataArray.map(async (apiProduct) => await transformProduct(apiProduct)),
    );

    return transformedProducts;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error; // Re-throw to be handled by callers
  }
};

// Update fetchProductById to also use the async transform
export const fetchProductById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const apiProduct = await response.json();
    // console.log("Raw Single Product Response:", apiProduct); // Log the raw response
    return await transformProduct(apiProduct); // Transform the single product asynchronously
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }
};
