export const logError = (error) => {
  console.error("Error:", error);
};

export const logInfo = (message) => {
  console.log("Info:", message);
};

export const parseJSON = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    logError("Failed to parse JSON response");
    throw error;
  }
};