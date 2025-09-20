import { LightningElement, api, track } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import QRCode from "@salesforce/resourceUrl/qr";
import PixCodec from "./pixCodec";

export default class QrCodeDisplay extends LightningElement {
  // Attributes
  @api showQRCode = false;
  @api showPixCode = false;
  @api qrCodeSize = 200;
  @api pixCode;
  _paymentData;
  _lastPixCode; // Track the last generated PIX code to know when to regenerate QR
  value;
  @track qrCodeGenerated = false;
  @track _errorMessage = "";
  @track _isLoading = false;
  qrCodeLibraryEncode;
  qrCodeContainer;

  // Getters and Setters
  // Watcher for paymentData changes
  @api
  set paymentData(value) {
    this._paymentData = value;
    this.generatePixCodeFromPaymentData(this._paymentData);
  }

  get paymentData() {
    return this._paymentData;
  }

  @api
  get errorMessage() {
    return this._errorMessage;
  }

  @api
  get isLoading() {
    return this._isLoading;
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

  // Public Functions (@api)
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

  // Private Functions
  /**
   * Generates PIX code from payment data if provided
   */
  @api
  generatePixCodeFromPaymentData(paymentData) {
    if (
      paymentData &&
      paymentData.key &&
      paymentData.merchantName &&
      paymentData.merchantCity
    ) {
      try {
        // Create payment using PixCodec
        const paymentDataObject = PixCodec.createPayment({
          key: paymentData.key,
          merchantName: paymentData.merchantName,
          merchantCity: paymentData.merchantCity,
          amount: paymentData.amount,
          transactionId: paymentData.transactionId
        });

        // Encode to PIX string
        this.pixCode = PixCodec.encode(paymentDataObject);
        this._errorMessage = "";

        // Reset QR code generation flag so it regenerates
        this.qrCodeGenerated = false;
      } catch (error) {
        this._errorMessage = "Failed to generate PIX code: " + error.message;
        console.error("PIX code generation error:", error);
      }
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
      this._lastPixCode = this.pixCode; // Track the last generated PIX code
      this._errorMessage = "";
    } catch (error) {
      this._errorMessage = "Failed to generate QR code: " + error.message;
      console.error("QR Code generation error:", error);
    }
  }

  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    });
    this.dispatchEvent(event);
  }

  // LWC-specific Functions
  connectedCallback() {
    this.loadQRCodeLibrary();
    this.generatePixCodeFromPaymentData(this._paymentData);
  }

  renderedCallback() {
    if (
      this.qrCodeLibraryEncode &&
      this.pixCode &&
      this.showQRCode &&
      (this._lastPixCode !== this.pixCode || !this.qrCodeGenerated)
    ) {
      this.generateQRCode();
    }
  }
}
