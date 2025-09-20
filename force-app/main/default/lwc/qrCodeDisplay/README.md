# QR Code Display Component

A Lightning Web Component for displaying PIX payment QR codes with customizable display options.

## Features

- **QR Code Generation**: Uses the paulmillr/qr library to generate high-quality QR codes
- **PIX Code Display**: Shows the copiable PIX payment code
- **Copy to Clipboard**: One-click copying of PIX codes
- **Customizable Display**: Toggle QR code and PIX code visibility independently
- **SLDS Styling**: Built with Salesforce Lightning Design System
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on desktop and mobile devices

## Properties

| Property      | Type    | Default | Description                                |
| ------------- | ------- | ------- | ------------------------------------------ |
| `pixCode`     | String  | `""`    | The PIX payment code to display (required) |
| `showQRCode`  | Boolean | `false` | Whether to display the QR code             |
| `showPixCode` | Boolean | `false` | Whether to display the copiable PIX code   |
| `qrCodeSize`  | Integer | `200`   | Size of the QR code in pixels (100-500)    |

## Usage

### Basic Usage

```html
<c-qr-code-display
  pix-code="00020126580014br.gov.bcb.pix01361234567890-abcdef-1234-5678-90abcdef123452040000530398654010.005802BR5913Test Merchant6009Sao Paulo62070503***6304ABCD"
  show-q-r-code="true"
  show-pix-code="true"
>
</c-qr-code-display>
```

### QR Code Only

```html
<c-qr-code-display
  pix-code="00020126580014br.gov.bcb.pix01361234567890-abcdef-1234-5678-90abcdef123452040000530398654010.005802BR5913Test Merchant6009Sao Paulo62070503***6304ABCD"
  show-q-r-code="true"
  show-pix-code="false"
>
</c-qr-code-display>
```

### PIX Code Only

```html
<c-qr-code-display
  pix-code="00020126580014br.gov.bcb.pix01361234567890-abcdef-1234-5678-90abcdef123452040000530398654010.005802BR5913Test Merchant6009Sao Paulo62070503***6304ABCD"
  show-q-r-code="false"
  show-pix-code="true"
>
</c-qr-code-display>
```

### Custom QR Code Size

```html
<c-qr-code-display
  pix-code="00020126580014br.gov.bcb.pix01361234567890-abcdef-1234-5678-90abcdef123452040000530398654010.005802BR5913Test Merchant6009Sao Paulo62070503***6304ABCD"
  show-q-r-code="true"
  show-pix-code="true"
  qr-code-size="300"
>
</c-qr-code-display>
```

## Integration with PIX Codec

This component works seamlessly with the PIX Codec library to generate PIX codes:

```javascript
import { PixCodec } from "c/pixCodec";

// Generate PIX code
const pixData = PixCodec.createPayment({
  key: "user@example.com",
  merchantName: "My Store",
  merchantCity: "São Paulo",
  amount: "10.00",
  transactionId: "TXN123"
});

const pixCode = PixCodec.encode(pixData);

// Use in component
this.pixCode = pixCode;
```

## Error Handling

The component includes comprehensive error handling:

- **Library Loading Errors**: Shows error message if QR library fails to load
- **QR Generation Errors**: Displays error if QR code generation fails
- **Copy Errors**: Shows toast notification if clipboard copy fails
- **Missing PIX Code**: Displays helpful message when no PIX code is provided

## Styling

The component uses Salesforce Lightning Design System (SLDS) classes:

- `slds-card`: Main container styling
- `slds-text-align_center`: Centers QR code and content
- `slds-button`: Styled buttons for copy functionality
- `slds-input`: Styled input field for PIX code display

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `navigator.clipboard` API for copy functionality
- SVG support required for QR code display

## Dependencies

- **paulmillr/qr**: QR code generation library (included as static resource)
- **Salesforce Lightning Design System**: For styling
- **Lightning Web Components**: Framework

## Testing

The component includes comprehensive Jest tests covering:

- Component rendering
- Property handling
- QR code generation
- Copy functionality
- Error handling
- Library loading

Run tests with:

```bash
npm test
```

## Security

- Uses DOMParser for safe SVG parsing
- No innerHTML usage for security
- Validates all inputs
- Follows LWC security best practices
