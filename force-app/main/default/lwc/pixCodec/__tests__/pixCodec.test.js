/**
 * PIX Codec Library Tests and Examples
 *
 * This file demonstrates how to use the PIX codec library
 * and includes test cases for validation.
 */

import { PixCodec } from "../pixCodec.js";

const FINAL_KEY =
  "00020126360014BR.GOV.BCB.PIX0114234842250001665204000053039865406123.455802BR5907WISEFOX6014BELO HORIZONTE62450507ref123450300017BR.GOV.BCB.BRCODE01051.0.063040D3F";

describe("PIX Codec Library", () => {
  it("should create PIX payment from parameters", () => {
    const paymentData = PixCodec.createPayment({
      key: "23484225000166", // CNPJ
      merchantName: "WISEFOX",
      merchantCity: "BELO HORIZONTE",
      amount: "123.45",
      transactionId: "ref1234"
    });

    expect(paymentData).toBeDefined();
    expect(paymentData.value).toBeInstanceOf(Array);

    // Encode to PIX string
    const pixString = PixCodec.encode(paymentData);
    expect(pixString).toBe(FINAL_KEY);
  });

  it("should decode PIX string to payment data", () => {
    const pixString = FINAL_KEY;
    const paymentData = PixCodec.decode(pixString);

    expect(paymentData).toBeDefined();
    expect(paymentData.value).toBeInstanceOf(Array);

    const amountField = paymentData.value.find((field) => field.id === "54");
    expect(amountField).toBeDefined();
    expect(amountField.value).toBe("123.45");

    const merchantNameField = paymentData.value.find(
      (field) => field.id === "59"
    );
    expect(merchantNameField).toBeDefined();
    expect(merchantNameField.value).toBe("WISEFOX");
  });
});
