const API_BASE_URL = "http://localhost:8080/api/v1";

let categoriesCache = null;

// Fetch categories from the API
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
    console.log("Raw Categories Response:", data); // Log the raw response
    categoriesCache = data; // Cache the result
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

const createCategoryMap = (categories) => {
  const categoryMap = new Map();
  categories.forEach((cat) => {
    categoryMap.set(cat.id, cat.name);
  });
  return categoryMap;
};

const transformProduct = (apiProduct, categoryMap) => {
  const categoryName = categoryMap.get(apiProduct.category_id) ||
    "Unknown Category";

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
    const categories = await fetchCategories();
    const categoryMap = createCategoryMap(categories);
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json(); // Get the full response object
    console.log("Raw Products Response:", responseData); // Log the raw response

    const dataArray = responseData.data;

    if (!Array.isArray(dataArray)) {
      throw new Error(
        'Expected an array of products inside the "data" property of the response.',
      );
    }

    const transformedProducts = dataArray.map((apiProduct) =>
      transformProduct(apiProduct, categoryMap)
    );
    console.log("transformed data:", transformedProducts);
    return transformedProducts;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error; // Re-throw to be handled by callers
  }
};

export const fetchProductById = async (id) => {
  try {
    const categories = await fetchCategories();
    const categoryMap = createCategoryMap(categories);

    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const apiProduct = await response.json();
    console.log("Raw Single Product Response:", apiProduct); // Log the raw response
    return transformProduct(apiProduct, categoryMap); // Transform using the map
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }
};
