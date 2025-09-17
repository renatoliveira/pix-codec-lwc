/**
 * PIX Payment Code Library
 *
 * A JavaScript library for encoding and decoding PIX payment codes
 * according to the Brazilian Central Bank (BCB) specification.
 *
 * @author Generated for SimPQ
 * @version 1.0.0
 */

/**
 * CRC16-CCITT implementation for PIX validation
 * @param {string} data - The data to calculate CRC for
 * @returns {string} - 4-character hex CRC
 */
function calculateCRC16(data) {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Formats a number to ensure it has the correct length
 * @param {string|number} value - The value to format
 * @param {number} length - Target length
 * @returns {string} - Formatted string
 */
function formatLength(value, length) {
  return value.toString().padStart(length, "0");
}

/**
 * Encodes a single field into PIX format
 * @param {string} id - Field ID
 * @param {string|Array} value - Field value (string or array for nested fields)
 * @returns {string} - Encoded field
 */
function encodeField(id, value) {
  if (Array.isArray(value)) {
    // Handle nested fields
    let nestedData = "";
    value.forEach((subField) => {
      if (subField.id && subField.value !== undefined) {
        const subValue = Array.isArray(subField.value)
          ? subField.value.map((v) => encodeField(v.id, v.value)).join("")
          : subField.value;
        const subLength = formatLength(subValue.length, 2);
        nestedData += subField.id + subLength + subValue;
      }
    });
    const length = formatLength(nestedData.length, 2);
    return id + length + nestedData;
  } else {
    const length = formatLength(value.length, 2);
    return id + length + value;
  }
}

/**
 * Decodes a PIX string into individual fields
 * @param {string} pixString - The PIX string to decode
 * @returns {Array} - Array of decoded fields
 */
function decodeFields(pixString) {
  const fields = [];
  let position = 0;

  while (position < pixString.length - 4) {
    // -4 for CRC at the end
    const id = pixString.substr(position, 2);
    const length = parseInt(pixString.substr(position + 2, 2), 10);
    const value = pixString.substr(position + 4, length);

    // Check if this field contains nested data
    if (["26", "62"].includes(id)) {
      fields.push({
        id,
        length: length.toString().padStart(2, "0"),
        value: decodeFields(value)
      });
    } else {
      fields.push({
        id,
        length: length.toString().padStart(2, "0"),
        value
      });
    }

    position += 4 + length;
  }

  // Add CRC field
  if (position < pixString.length) {
    fields.push({
      id: "63",
      length: "04",
      value: pixString.substr(position + 4, 4)
    });
  }

  return fields;
}

/**
 * PIX Code Generator and Parser
 */
export class PixCodec {
  /**
   * Generates a PIX payment string from JSON data
   * @param {Object} pixData - PIX data object with value array
   * @returns {string} - PIX payment string ready for QR code
   */
  static encode(pixData) {
    if (!pixData || !pixData.value || !Array.isArray(pixData.value)) {
      throw new Error(
        "Invalid PIX data format. Expected object with value array."
      );
    }

    let pixString = "";

    // Process all fields except CRC (63)
    const fieldsWithoutCRC = pixData.value.filter((field) => field.id !== "63");

    fieldsWithoutCRC.forEach((field) => {
      if (field.id && field.value !== undefined) {
        pixString += encodeField(field.id, field.value);
      }
    });

    // Add CRC field ID and length
    pixString += "6304";

    // Calculate and append CRC
    const crc = calculateCRC16(pixString);
    pixString += crc;

    return pixString;
  }

  /**
   * Parses a PIX payment string into JSON format
   * @param {string} pixString - PIX payment string
   * @returns {Object} - PIX data object with value array
   */
  static decode(pixString) {
    if (!pixString || typeof pixString !== "string") {
      throw new Error("Invalid PIX string. Expected non-empty string.");
    }

    // Validate CRC
    const dataWithoutCRC = pixString.slice(0, -4);
    const providedCRC = pixString.slice(-4);
    const calculatedCRC = calculateCRC16(dataWithoutCRC);

    if (providedCRC !== calculatedCRC) {
      throw new Error(
        `Invalid CRC. Expected: ${calculatedCRC}, Got: ${providedCRC}`
      );
    }

    const fields = decodeFields(pixString);

    // Add descriptions based on field IDs
    const descriptionsMap = {
      "00": "Payload Format Indicator",
      26: "Merchant Account Information",
      52: "Merchant Category Code (MCC)",
      53: "Transaction Currency",
      54: "Transaction Amount",
      58: "Country Code",
      59: "Merchant Name",
      60: "Merchant City",
      62: "Additional Data Field Template",
      63: "CRC16 - result's 4 nibbles"
    };

    fields.forEach((field) => {
      if (descriptionsMap[field.id]) {
        field.description = descriptionsMap[field.id];
      }

      // Add descriptions for nested fields
      if (Array.isArray(field.value)) {
        field.value.forEach((subField) => {
          if (field.id === "26") {
            if (subField.id === "00") subField.description = "GUI";
            if (subField.id === "01") subField.description = "Key";
          } else if (field.id === "62") {
            if (subField.id === "05") subField.description = "Transaction ID";
            if (subField.id === "50")
              subField.description = "Payment system specific template";
          }
        });
      }
    });

    return { value: fields };
  }

  /**
   * Creates a PIX payment data structure with common defaults
   * @param {Object} params - Payment parameters
   * @param {string} params.key - PIX key (CPF, CNPJ, email, phone, or random key)
   * @param {string} params.merchantName - Merchant name
   * @param {string} params.merchantCity - Merchant city
   * @param {string} [params.amount] - Transaction amount (optional for dynamic QR codes)
   * @param {string} [params.transactionId] - Transaction ID (optional)
   * @param {string} [params.description] - Payment description (optional)
   * @returns {Object} - PIX data structure ready for encoding
   */
  static createPayment(params) {
    const {
      key,
      merchantName,
      merchantCity,
      amount,
      transactionId,
      description
    } = params;

    if (!key || !merchantName || !merchantCity) {
      throw new Error(
        "Missing required parameters: key, merchantName, and merchantCity are required"
      );
    }

    const pixData = {
      value: [
        {
          id: "00",
          description: "Payload Format Indicator",
          length: "02",
          value: "01"
        },
        {
          id: "26",
          description: "Merchant Account Information",
          length: "variable",
          value: [
            {
              id: "00",
              description: "GUI",
              length: "14",
              value: "BR.GOV.BCB.PIX"
            },
            {
              id: "01",
              description: "Key",
              length: "variable",
              value: key
            }
          ]
        },
        {
          id: "52",
          description: "Merchant Category Code (MCC)",
          length: "04",
          value: "0000"
        },
        {
          id: "53",
          description: "Transaction Currency",
          length: "03",
          value: "986" // BRL
        },
        {
          id: "58",
          description: "Country Code",
          length: "02",
          value: "BR"
        },
        {
          id: "59",
          description: "Merchant Name",
          length: "variable",
          value: merchantName.toUpperCase()
        },
        {
          id: "60",
          description: "Merchant City",
          length: "variable",
          value: merchantCity.toUpperCase()
        }
      ]
    };

    // Add amount if provided
    if (amount) {
      pixData.value.splice(-3, 0, {
        id: "54",
        description: "Transaction Amount",
        length: "variable",
        value: parseFloat(amount).toFixed(2)
      });
    }

    // Add additional data if provided
    if (transactionId || description) {
      const additionalData = {
        id: "62",
        description: "Additional Data Field Template",
        length: "variable",
        value: []
      };

      if (transactionId) {
        additionalData.value.push({
          id: "05",
          description: "Transaction ID",
          length: "variable",
          value: transactionId
        });
      }

      if (description) {
        additionalData.value.push({
          id: "02",
          description: "Description",
          length: "variable",
          value: description
        });
      }

      // Add BR Code specific template
      additionalData.value.push({
        id: "50",
        description: "Payment system specific template",
        length: "variable",
        value: [
          {
            id: "00",
            description: "GUI",
            length: "17",
            value: "BR.GOV.BCB.BRCODE"
          },
          {
            id: "01",
            description: "version",
            length: "05",
            value: "1.0.0"
          }
        ]
      });

      pixData.value.push(additionalData);
    }

    return pixData;
  }

  /**
   * Validates a PIX key format
   * @param {string} key - PIX key to validate
   * @returns {Object} - Validation result with isValid boolean and type
   */
  static validateKey(key) {
    if (!key || typeof key !== "string") {
      return {
        isValid: false,
        type: null,
        error: "Key must be a non-empty string"
      };
    }

    const cleanKey = key.replace(/\D/g, ""); // Remove non-digits for CPF/CNPJ validation

    // CPF validation (11 digits)
    if (/^\d{11}$/.test(cleanKey)) {
      return { isValid: true, type: "CPF" };
    }

    // CNPJ validation (14 digits)
    if (/^\d{14}$/.test(cleanKey)) {
      return { isValid: true, type: "CNPJ" };
    }

    // Email validation
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      return { isValid: true, type: "EMAIL" };
    }

    // Phone validation (Brazilian format)
    if (/^\+55\d{10,11}$/.test(key)) {
      return { isValid: true, type: "PHONE" };
    }

    // Random key validation (UUID format)
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key
      )
    ) {
      return { isValid: true, type: "RANDOM" };
    }

    return { isValid: false, type: null, error: "Invalid PIX key format" };
  }
}

// For CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PixCodec };
}

// Default export for ES6 modules
export default PixCodec;
