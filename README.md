# 📦 Barcode Generator for Salesforce Order Line Items

## 🎯 Overview
A production-ready Salesforce Lightning Web Component that generates barcodes for order line items, enabling warehouse inventory management and item tracking.

## ✨ Features
- **Order Selection**: Dropdown to select from activated orders
- **Line Item Display**: Table view of all products in selected order
- **Barcode Generation**: CSS-based barcode visualization (no external dependencies)
- **Location Assignment**: Assign warehouse locations to each item
- **Print Labels**: Print-friendly barcode labels
- **Status Tracking**: Visual indicators for generated barcodes

## 🏗️ Architecture

### Components
1. **Lightning Web Component**: `barcodeGenerator`
   - HTML: User interface and barcode display
   - JavaScript: Logic and Apex integration
   - CSS: Styling and barcode visualization

2. **Apex Controller**: `BarcodeGeneratorController`
   - `getRecentOrders()`: Fetches activated orders
   - `getOrderItems()`: Retrieves line items for selected order
   - `updateBarcodeData()`: Saves barcode and location data

### Custom Fields (OrderItem object)
- `Barcode_Generated__c` (Checkbox): Tracks if barcode created
- `Barcode_Image__c` (Long Text): Stores barcode data
- `Warehouse_Location__c` (Text): Warehouse location identifier

## 🚀 Installation

### Prerequisites
- Salesforce Dev/Sandbox org
- Salesforce CLI installed
- VS Code with Salesforce extensions (optional)

### Deployment Steps

1. **Clone Repository**
```bash
   git clone <your-repo-url>
   cd Bar-code-Generator
```

2. **Authenticate with Salesforce**
```bash
   sf org login web
```

3. **Deploy to Org**
```bash
   sf project deploy start --source-dir force-app
```

4. **Create Lightning App Page**
   - Setup → Lightning App Builder → New
   - Select "App Page"
   - Template: "Header and Left Sidebar"
   - Add `barcodeGenerator` component to main region
   - Activate and add to Sales app navigation

## 📋 Usage

1. Navigate to **Barcode Generator** tab in Sales app
2. Select an order from the dropdown
3. View all line items in the table
4. Enter warehouse location for each item (optional)
5. Click **Generate** button for each item
6. Barcode appears with visual bars and data
7. Click **Print All Barcodes** to print labels

## 🎨 Barcode Format

**Displayed Information:**
- Product Name
- Order Number
- Order Item ID
- Warehouse Location (if assigned)
- Visual barcode bars (CSS-based)

**Barcode Data String:**
```
{OrderNumber}-{ProductName}-{OrderItemId}
Example: 00000102-F-150 Raptor-8O2OZ00000Lw8B2IAJ
```

## 🧪 Testing

**Test Scenario:**
1. Create Order with activated status
2. Add products (Order Products/Line Items)
3. Open Barcode Generator
4. Generate barcodes
5. Verify barcode display
6. Test print functionality

## 🛠️ Customization

### Change Barcode Visual Style
Edit `barcodeGenerator.css`:
- `.barcode-visual` - Container styling
- `.bar` and `.bar.wide` - Bar dimensions and colors
- `.barcode-container` - Border and layout

### Modify Barcode Data Format
Edit `barcodeGenerator.js` line ~66:
```javascript
barcodeData: `${item.Order.OrderNumber}-${item.Product2.Name}-${item.Id}`
```

### Add More Fields to Display
Update Apex query in `BarcodeGeneratorController.getOrderItems()`

## 🔒 Security

- Uses `with sharing` for Apex security
- Requires proper object/field permissions
- No external API calls
- No external JavaScript libraries
- CSP compliant

## 📊 Performance

- Cacheable Apex methods for efficiency
- Client-side barcode rendering (instant)
- Supports up to 50 orders in dropdown
- No page load on barcode generation

## 🐛 Troubleshooting

**Dropdown Empty:**
- Check Order Status = 'Activated'
- Verify user has Order read permission

**Items Not Loading:**
- Check OrderItem object permissions
- Verify custom fields exist

**Barcode Not Displaying:**
- Clear browser cache (Ctrl+Shift+F5)
- Check console for errors

## 📝 Development Log

**Built using:** Agentforce Vibes AI-assisted development
**Development Time:** ~3 hours (including troubleshooting)
**Date:** October 28, 2025

### Key Decisions:
- ✅ CSS-based barcodes (no external dependencies)
- ✅ Server-side data storage
- ✅ Client-side rendering for speed
- ✅ Print-optimized layout

### Challenges Overcome:
- CSP violations with external QR libraries
- Lightning component field access issues
- Order activation requirements

## 🔮 Future Enhancements

**Phase 2 Possibilities:**
- [ ] QR Code generation (SVG-based, no external libs)
- [ ] Bulk barcode generation
- [ ] Barcode scanning interface (mobile)
- [ ] Export to PDF
- [ ] Email barcode labels
- [ ] Barcode history tracking
- [ ] Custom barcode formats (Code128, EAN, etc.)
- [ ] Integration with shipping systems
- [ ] Multi-language support

## 📄 License

[Your License Here]

## 👤 Author

Built by: [Your Name]
Organization: [Your Company]
Contact: [Your Email]

---

**Status:** ✅ Production Ready
**Last Updated:** October 28, 2025