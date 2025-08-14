const isArray = (value) => Array.isArray(value);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFunction = (value) => typeof value === "function";

const isNull = (value) => value === null;

export const isNotEmptyStringAndNull = (value) => value !== null && value.trim() !== "";


const isUndefined = (value) => typeof value === "undefined";

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const capitalizeFirstLetter = (word = "") =>
  word.charAt(0).toUpperCase() + word.toLowerCase().slice(1);

const formatArrayToSentence = (stringArr = []) => {
  if (stringArr.length === 0) return "";
  return stringArr.join(", ").replace(/, ([^,]*)$/, " and $1.");
};

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const generateRandomString = (length) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

const deepMerge = (target, source) => {
  const isObject = (obj) => obj && typeof obj === "object";

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = deepMerge({ ...targetValue }, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function bigIntReplacer(key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function findModifiedKeys(obj1, obj2, prefix = "") {
  const modifiedKeys = [];

  for (const key in obj2) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (!(key in obj1)) {
      // New key added
      modifiedKeys.push(fullKey);
    } else if (Array.isArray(obj2[key]) && Array.isArray(obj1[key])) {
      // ✅ Check entire array for modifications
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        modifiedKeys.push(fullKey); // Treat the whole array as modified
      }
    } else if (
      typeof obj2[key] === "object" &&
      obj2[key] !== null &&
      typeof obj1[key] === "object" &&
      obj1[key] !== null
    ) {
      // Recursive check for nested objects
      const nestedModified = findModifiedKeys(obj1[key], obj2[key], fullKey);
      modifiedKeys.push(...nestedModified);
    } else if (obj2[key] !== obj1[key]) {
      // Modified value
      modifiedKeys.push(fullKey);
    }
  }

  return modifiedKeys;
}

// Get value from object by dot notation key
export function getDeepValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

// Set value in object by dot notation key (builds nested objects if needed)
export function setDeepValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  keys.forEach((key, index) => {
    const isLastKey = index === keys.length - 1;

    if (isLastKey) {
      // ✅ Ensure arrays are copied properly, preventing 'empty' or 'null' values
      if (Array.isArray(value)) {
        current[key] = [...value]; // Clone array to avoid mutation issues
      } else {
        current[key] = value;
      }
    } else {
      const nextKeyIsArrayIndex = !isNaN(keys[index + 1]); // Check if next key is a number (array index)

      if (!(key in current)) {
        current[key] = nextKeyIsArrayIndex ? [] : {}; // Initialize array if next key is a number
      }

      current = current[key];
    }
  });
}

// Check if a value is an empty
export const isEmpty = (value) => {
  let isEmpty = false;
  if (isArray(value)) isEmpty = value.length === 0;
  if (isObject(value)) isEmpty = Object.keys(value).length === 0;
  if (value) isEmpty = value.trim() === "";
  return isNull(value) || isUndefined(value);
};

export const convertStringListToArray = (stringList) => {
  if (!stringList) return [];
  return stringList.split(",").map((item) => item.trim());
}


