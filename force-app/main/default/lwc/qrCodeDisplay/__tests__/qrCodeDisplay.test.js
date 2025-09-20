import { createElement } from "@lwc/engine-dom";
import QrCodeDisplay from "c/qrCodeDisplay";

// Mock the loadScript function
jest.mock("lightning/platformResourceLoader", () => ({
  loadScript: jest.fn()
}));

import { loadScript } from "lightning/platformResourceLoader";

describe("c-qr-code-display", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock console.error to prevent noise in test output
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();

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
});
