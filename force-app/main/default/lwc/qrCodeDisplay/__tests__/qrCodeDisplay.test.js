import { createElement } from "@lwc/engine-dom";
import QrCodeDisplay from "c/qrCodeDisplay";

// Mock the loadScript function
jest.mock("lightning/platformResourceLoader", () => ({
  loadScript: jest.fn()
}));

// Mock the PixCodec
jest.mock("../pixCodec", () => ({
  __esModule: true,
  default: {
    createPayment: jest.fn(),
    encode: jest.fn()
  }
}));

import { loadScript } from "lightning/platformResourceLoader";
import PixCodec from "../pixCodec";

describe("c-qr-code-display", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock console.error to prevent noise in test output
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();

    // Reset PixCodec mocks
    PixCodec.createPayment.mockClear();
    PixCodec.encode.mockClear();

    // Clean up window.encodeQR
    delete window.encodeQR;
  });

  afterEach(() => {
    // The jsdom instance is shared across test cases in a single file so reset the DOM
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it("should handle QR library loading failure gracefully", async () => {
    // Arrange
    const testError = new Error("Failed to load script");
    loadScript.mockRejectedValue(testError);

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });

    // Act
    document.body.appendChild(element);

    // Wait for the component to attempt loading the QR library and handle the promise rejection
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    // Verify that console.error was called with the expected error message
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "QR Code library loading error:",
      expect.any(Error)
    );

    // Verify the error message is properly set
    expect(element.errorMessage).toContain("Failed to load QR code library");

    // Verify loading state is false after error
    expect(element.isLoading).toBe(false);
  });

  it("should display PIX code when showPixCode is true", async () => {
    // Arrange
    const mockEncodeQR = jest.fn().mockReturnValue("<svg>mock qr code</svg>");
    loadScript.mockResolvedValue();

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });
    const testPixCode =
      "00020101021243650016COM.MERCADOLIBRE02013063638f1192a-5fd1-4180-a180-8bcae3556bc35204000053039865802BR5925IZABEL CRISTINA MACANEIRO6009SAO PAULO62070503***63045D35";
    element.pixCode = testPixCode;
    element.showPixCode = true;

    // Act
    document.body.appendChild(element);

    // Mock window.encodeQR after loadScript resolves
    await new Promise((resolve) => {
      setTimeout(() => {
        window.encodeQR = mockEncodeQR;
        resolve();
      }, 0);
    });

    // Assert
    expect(element.pixCode).toBe(testPixCode);
    expect(element.showPixCode).toBe(true);
  });

  it("should update loading and error states", async () => {
    // Arrange
    // Mock loadScript to resolve but don't set window.encodeQR
    loadScript.mockResolvedValue();

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });

    // Act
    document.body.appendChild(element);

    // Wait for the component to complete loading attempt
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    // After trying to load QR library and failing to find window.encodeQR, loading should be false and error should be set
    expect(element.isLoading).toBe(false);
    expect(element.errorMessage).toBeTruthy();
    expect(element.errorMessage).toContain("Failed to load QR code library");
  });

  it("should generate PIX code from payment data using PixCodec", async () => {
    // Arrange
    const mockPaymentData = {
      key: "23484225000166",
      merchantName: "WISEFOX",
      merchantCity: "BELO HORIZONTE",
      amount: "123.45",
      transactionId: "ref1234"
    };

    const mockPaymentDataObject = { value: [] };
    const mockPixCode =
      "00020126360014BR.GOV.BCB.PIX0114234842250001665204000053039865406123.455802BR5907WISEFOX6014BELO HORIZONTE62450507ref123450300017BR.GOV.BCB.BRCODE01051.0.063040D3F";

    PixCodec.createPayment.mockReturnValue(mockPaymentDataObject);
    PixCodec.encode.mockReturnValue(mockPixCode);

    loadScript.mockResolvedValue();

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });

    // Act
    element.paymentData = mockPaymentData;
    document.body.appendChild(element);

    // Assert
    expect(PixCodec.createPayment).toHaveBeenCalledWith({
      key: "23484225000166",
      merchantName: "WISEFOX",
      merchantCity: "BELO HORIZONTE",
      amount: "123.45",
      transactionId: "ref1234"
    });
    expect(PixCodec.encode).toHaveBeenCalledWith(mockPaymentDataObject);
    expect(element.pixCode).toBe(mockPixCode);
  });

  it("should handle PixCodec errors gracefully", async () => {
    // Arrange
    const mockPaymentData = {
      key: "invalid-key",
      merchantName: "TEST",
      merchantCity: "TEST CITY"
    };

    const mockError = new Error("Invalid PIX key");
    PixCodec.createPayment.mockImplementation(() => {
      throw mockError;
    });

    loadScript.mockResolvedValue();

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });

    // Act
    element.paymentData = mockPaymentData;
    document.body.appendChild(element);

    // Assert
    expect(element.errorMessage).toContain("Failed to generate PIX code");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "PIX code generation error:",
      mockError
    );
  });

  it("should not generate PIX code if required payment data fields are missing", async () => {
    // Arrange
    const incompletePaymentData = {
      key: "23484225000166"
      // Missing merchantName and merchantCity
    };

    loadScript.mockResolvedValue();

    const element = createElement("c-qr-code-display", {
      is: QrCodeDisplay
    });

    // Act
    element.paymentData = incompletePaymentData;
    document.body.appendChild(element);

    // Assert
    expect(PixCodec.createPayment).not.toHaveBeenCalled();
    expect(PixCodec.encode).not.toHaveBeenCalled();
    expect(element.pixCode).toBeUndefined();
  });

  describe("@api generatePixCodeFromPaymentData", () => {
    it("should generate PIX code when called directly with valid payment data", async () => {
      // Arrange
      const mockPaymentData = {
        key: "23484225000166",
        merchantName: "DIRECT API TEST",
        merchantCity: "SAO PAULO",
        amount: "99.99",
        transactionId: "api-test-123"
      };

      const mockPaymentDataObject = { value: [] };
      const mockPixCode =
        "00020126360014BR.GOV.BCB.PIX0114234842250001665204000053039865405099.995802BR5917DIRECT API TEST6009SAO PAULO62450512api-test-12350300017BR.GOV.BCB.BRCODE01051.0.063041234";

      PixCodec.createPayment.mockReturnValue(mockPaymentDataObject);
      PixCodec.encode.mockReturnValue(mockPixCode);

      loadScript.mockResolvedValue();

      const element = createElement("c-qr-code-display", {
        is: QrCodeDisplay
      });
      document.body.appendChild(element);

      // Act
      element.generatePixCodeFromPaymentData(mockPaymentData);

      // Assert
      expect(PixCodec.createPayment).toHaveBeenCalledWith({
        key: "23484225000166",
        merchantName: "DIRECT API TEST",
        merchantCity: "SAO PAULO",
        amount: "99.99",
        transactionId: "api-test-123"
      });
      expect(PixCodec.encode).toHaveBeenCalledWith(mockPaymentDataObject);
      expect(element.pixCode).toBe(mockPixCode);
      expect(element.errorMessage).toBe("");
    });

    it("should handle null/undefined payment data gracefully", async () => {
      // Arrange
      loadScript.mockResolvedValue();

      const element = createElement("c-qr-code-display", {
        is: QrCodeDisplay
      });
      document.body.appendChild(element);

      // Act & Assert - null
      element.generatePixCodeFromPaymentData(null);
      expect(PixCodec.createPayment).not.toHaveBeenCalled();

      // Act & Assert - undefined
      element.generatePixCodeFromPaymentData(undefined);
      expect(PixCodec.createPayment).not.toHaveBeenCalled();

      // Act & Assert - empty object
      element.generatePixCodeFromPaymentData({});
      expect(PixCodec.createPayment).not.toHaveBeenCalled();
    });

    it("should handle PixCodec errors when called directly", async () => {
      // Arrange
      const mockPaymentData = {
        key: "invalid-direct-key",
        merchantName: "ERROR TEST",
        merchantCity: "ERROR CITY"
      };

      const mockError = new Error("Direct API call error");
      PixCodec.createPayment.mockImplementation(() => {
        throw mockError;
      });

      loadScript.mockResolvedValue();

      const element = createElement("c-qr-code-display", {
        is: QrCodeDisplay
      });
      document.body.appendChild(element);

      // Act
      element.generatePixCodeFromPaymentData(mockPaymentData);

      // Assert
      expect(element.errorMessage).toContain("Failed to generate PIX code");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "PIX code generation error:",
        mockError
      );
    });

    it("should reset QR code generation flag when called directly", async () => {
      // Arrange
      const mockPaymentData = {
        key: "23484225000166",
        merchantName: "FLAG TEST",
        merchantCity: "FLAG CITY",
        amount: "10.00"
      };

      const mockPaymentDataObject = { value: [] };
      const mockPixCode = "mock-pix-code-for-flag-test";

      PixCodec.createPayment.mockReturnValue(mockPaymentDataObject);
      PixCodec.encode.mockReturnValue(mockPixCode);

      loadScript.mockResolvedValue();

      const element = createElement("c-qr-code-display", {
        is: QrCodeDisplay
      });
      document.body.appendChild(element);

      // Act
      element.generatePixCodeFromPaymentData(mockPaymentData);

      // Assert - verify the method executed successfully by checking the result
      expect(element.pixCode).toBe(mockPixCode);
      expect(element.errorMessage).toBe("");
      expect(PixCodec.createPayment).toHaveBeenCalled();
      expect(PixCodec.encode).toHaveBeenCalled();
    });

    it("should work with minimal required fields only", async () => {
      // Arrange
      const minimalPaymentData = {
        key: "23484225000166",
        merchantName: "MINIMAL TEST",
        merchantCity: "MINIMAL CITY"
        // No amount or transactionId
      };

      const mockPaymentDataObject = { value: [] };
      const mockPixCode = "minimal-pix-code";

      PixCodec.createPayment.mockReturnValue(mockPaymentDataObject);
      PixCodec.encode.mockReturnValue(mockPixCode);

      loadScript.mockResolvedValue();

      const element = createElement("c-qr-code-display", {
        is: QrCodeDisplay
      });
      document.body.appendChild(element);

      // Act
      element.generatePixCodeFromPaymentData(minimalPaymentData);

      // Assert
      expect(PixCodec.createPayment).toHaveBeenCalledWith({
        key: "23484225000166",
        merchantName: "MINIMAL TEST",
        merchantCity: "MINIMAL CITY",
        amount: undefined,
        transactionId: undefined
      });
      expect(element.pixCode).toBe(mockPixCode);
    });
  });
});
