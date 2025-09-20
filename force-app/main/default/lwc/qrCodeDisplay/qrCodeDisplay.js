import { LightningElement, api, track } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import QRCode from "@salesforce/resourceUrl/qr";

export default class QrCodeDisplay extends LightningElement {
  @api showQRCode = false;
  @api showPixCode = false;
  @api qrCodeSize = 200;
  @api pixCode;
  value;

  @track qrCodeGenerated = false;
  @track _errorMessage = "";
  @track _isLoading = false;

  @api
  get errorMessage() {
    return this._errorMessage;
  }

  @api
  get isLoading() {
    return this._isLoading;
  }

  qrCodeLibraryEncode;
  qrCodeContainer;

  connectedCallback() {
    this.loadQRCodeLibrary();
  }

  renderedCallback() {
    if (
      this.qrCodeLibraryEncode &&
      this.pixCode &&
      this.showQRCode &&
      !this.qrCodeGenerated
    ) {
      this.generateQRCode();
    }
  }

  async loadQRCodeLibrary() {
    try {
      this._isLoading = true;
      await loadScript(this, QRCode);
      // QR code library loaded successfully
      this.qrCodeLibraryEncode = window.encodeQR;
      if (!this.qrCodeLibraryEncode) {
        throw new Error(
          "QR Code library not found in global scope after loading. Please ensure the QR library is properly loaded."
        );
      }
      this._errorMessage = "";

      this.value = this.pixCode;
    } catch (error) {
      this._errorMessage = "Failed to load QR code library: " + error.message;
      console.error("QR Code library loading error:", error);
    } finally {
      this._isLoading = false;
    }
  }

  generateQRCode() {
    if (!this.qrCodeLibraryEncode || !this.pixCode) {
      console.warn("QR Code library not loaded or PIX code is empty");
      return;
    }

    try {
      let svgString;

      // Try calling as an object method (for other QR libraries)
      if (this.qrCodeLibraryEncode) {
        svgString = this.qrCodeLibraryEncode(this.pixCode, "svg", {
          scale: Math.floor(this.qrCodeSize / 25),
          border: 2,
          ecc: "medium"
        });
      } else {
        throw new Error(
          "QR library does not have expected encodeQR method or is not callable"
        );
      }

      // Try to find and update the container if it exists
      this.qrCodeContainer = this.template.querySelector(".qr-code-container");

      if (this.qrCodeContainer) {
        // Clear any existing QR code
        this.qrCodeContainer.textContent = "";

        const svgElementContainer = this.template.querySelector(
          'div[data-id="qrCode"]'
        );

        // Instead of using DOMParser and appendChild, directly set innerHTML
        // This works better with Lightning Locker Service
        if (svgElementContainer) {
          svgElementContainer.innerHTML = svgString;
        }
      }

      this.qrCodeGenerated = true;
      this._errorMessage = "";
    } catch (error) {
      this._errorMessage = "Failed to generate QR code: " + error.message;
      console.error("QR Code generation error:", error);
    }
  }

  @api copyPixCode() {
    if (!this.pixCode) {
      this.showToast("Error", "No PIX code to copy", "error");
      return;
    }

    navigator.clipboard
      .writeText(this.pixCode)
      .then(() => {
        this.showToast("Success", "PIX code copied to clipboard", "success");
      })
      .catch((error) => {
        console.error("Copy failed:", error);
        this.showToast("Error", "Failed to copy PIX code", "error");
      });
  }

  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(event);
  }

  // Getters for conditional rendering
  get shouldShowQRCode() {
    return this.showQRCode && this.pixCode && !this._isLoading;
  }

  get shouldShowPixCode() {
    return this.showPixCode && this.pixCode;
  }

  get hasError() {
    return this._errorMessage !== "";
  }
}
