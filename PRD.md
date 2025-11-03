# 📋 Complete PRD for Agentforce Vibes - Barcode Generator (One-Shot)

## **Copy this entire document and paste into Agentforce Vibes**

---

```markdown
# PRODUCT REQUIREMENTS DOCUMENT
# Barcode Generator for Salesforce Order Line Items

## VERSION: 1.0
## DATE: 2025-10-30
## PLATFORM: Salesforce Lightning (API v65.0)
## DEVELOPMENT TOOL: Agentforce Vibes

---

## EXECUTIVE SUMMARY

Build a native Salesforce Lightning Web Component that generates print-ready barcodes for Order Line Items to enable warehouse inventory tracking. The solution must work within Salesforce Content Security Policy constraints with ZERO external dependencies.

**Key Constraints:**
- ❌ NO external JavaScript libraries (no CDN imports)
- ❌ NO external QR code generation APIs
- ❌ NO external fonts (no Google Fonts, no Font Awesome)
- ✅ Pure Salesforce Lightning Web Components
- ✅ Pure CSS for barcode visualization
- ✅ Browser-native print functionality only

---

## 1. BUSINESS REQUIREMENTS

### 1.1 Problem Statement
Warehouse employees manually create barcode labels for inventory items, spending 15+ hours/week with 30% error rate in item placement, costing $25,000 annually.

### 1.2 Solution Overview
A Lightning Web Component that:
1. Displays activated orders in a dropdown
2. Shows order line items in a data table
3. Generates CSS-based barcode visualization for each item
4. Allows warehouse location assignment
5. Provides print-optimized barcode labels
6. Saves barcode data to Salesforce

### 1.3 Success Metrics
- Time per order: 15 min → 2 min (87% reduction)
- Annual savings: $24,960
- Error reduction: 30% → 5%
- User adoption: 95%+

---

## 2. SALESFORCE DATA MODEL

### 2.1 Standard Objects Used

**Order (Standard Object)**
- API Name: `Order`
- Fields Used: `Id`, `OrderNumber`, `AccountId`, `Status`
- Query Filter: `Status = 'Activated'`

**OrderItem (Standard Object)**
- API Name: `OrderItem`
- Fields Used: `Id`, `OrderId`, `Product2Id`, `Quantity`, `UnitPrice`
- Relationship: Order (via `OrderId`), Product2 (via `Product2Id`)

**Product2 (Standard Object)**
- API Name: `Product2`
- Fields Used: `Id`, `Name`
- Access: Via relationship from OrderItem

**Account (Standard Object)**
- API Name: `Account`
- Fields Used: `Name`
- Access: Via relationship from Order

### 2.2 Custom Fields Required on OrderItem

**IMPORTANT:** Create these custom fields BEFORE development:

**Field 1: Barcode Generated Status**
```
Object: OrderItem
Field Label: Barcode Generated
API Name: Barcode_Generated__c
Data Type: Checkbox
Default Value: Unchecked (false)
Description: Indicates if barcode has been generated for this line item
```

**Field 2: Barcode Data Storage**
```
Object: OrderItem
Field Label: Barcode Image
API Name: Barcode_Image__c
Data Type: Long Text Area
Length: 131,072 characters
Visible Lines: 3
Description: Stores the barcode data string (Order-Product-ItemID format)
```

**Field 3: Warehouse Location**
```
Object: OrderItem
Field Label: Warehouse Location
API Name: Warehouse_Location__c
Data Type: Text
Length: 255
Description: Physical warehouse location code (e.g., "Zone-A-12", "Shelf-B-03")
```

---

## 3. TECHNICAL ARCHITECTURE

### 3.1 Component Structure

**Lightning Web Component Name:** `barcodeGenerator`

**Files to Create:**
1. `barcodeGenerator.html` - User interface
2. `barcodeGenerator.js` - Business logic
3. `barcodeGenerator.css` - Styling (including print styles)
4. `barcodeGenerator.js-meta.xml` - Component metadata
5. `BarcodeGeneratorController.cls` - Apex controller
6. `BarcodeGeneratorControllerTest.cls` - Apex test class

### 3.2 Apex Controller Requirements

**Class Name:** `BarcodeGeneratorController`
**Sharing:** `with sharing` (enforce record-level security)

**Required Methods:**

**Method 1: Get Recent Orders**
```apex
@AuraEnabled(cacheable=true)
public static List<Map<String, String>> getRecentOrders()
```
**Purpose:** Return list of activated orders for dropdown
**Query:**
```apex
SELECT Id, OrderNumber, Account.Name 
FROM Order 
WHERE Status = 'Activated' 
  AND Account.Name != null
ORDER BY CreatedDate DESC 
LIMIT 50
```
**Return Format:**
```apex
List<Map<String, String>> where each Map contains:
  - 'label': 'Order #' + OrderNumber + ' - ' + Account.Name
  - 'value': Order.Id
```

**Method 2: Get Order Items**
```apex
@AuraEnabled(cacheable=true)
public static List<OrderItem> getOrderItems(String orderId)
```
**Purpose:** Return all line items for selected order
**Query:**
```apex
SELECT Id, 
       Product2.Name,
       Product2Id,
       Quantity, 
       UnitPrice,
       Order.OrderNumber,
       OrderId,
       Warehouse_Location__c,
       Barcode_Generated__c,
       Barcode_Image__c
FROM OrderItem 
WHERE OrderId = :orderId 
ORDER BY CreatedDate DESC
```
**Return:** `List<OrderItem>`
**Error Handling:** Try-catch with AuraHandledException

**Method 3: Update Barcode Data**
```apex
@AuraEnabled
public static void updateBarcodeData(String orderItemId, String barcodeImage, String location)
```
**Purpose:** Save barcode data and location to database
**DML Operation:**
```apex
OrderItem item = new OrderItem(
    Id = orderItemId,
    Barcode_Image__c = barcodeImage,
    Warehouse_Location__c = location,
    Barcode_Generated__c = true
);
update item;
```
**Error Handling:** Try-catch with AuraHandledException
**Return:** void

---

## 4. USER INTERFACE REQUIREMENTS

### 4.1 Component Layout Structure

**Layout Type:** Lightning Card with sections

**Section 1: Order Selection**
- Lightning combobox for order selection
- Label: "Select Order"
- Placeholder: "Choose an order"
- Options populated from `getRecentOrders()`
- Refresh button with icon `utility:refresh`

**Section 2: Line Items Data Table**
- Display ONLY when order is selected
- HTML `<table>` with SLDS classes: `slds-table slds-table_bordered slds-table_cell-buffer`

**Table Columns:**
1. **Product Name** - Display `item.Product2.Name`
2. **Quantity** - Display `item.Quantity`
3. **Unit Price** - Use `<lightning-formatted-number>` with currency formatting USD
4. **Location** - `<lightning-input type="text">` with inline editing
5. **Barcode Status** - Badge showing "Generated" (green) or "Not Generated" (gray)
6. **Action** - `<lightning-button label="Generate" variant="brand">`

**Section 3: Barcode Display Row**
- Appears BELOW each line item row when barcode is generated
- Spans all columns (`colspan="6"`)
- Contains barcode container with:
  - Product name (header)
  - Order number and Item ID (text)
  - **PURE CSS BARCODE BARS** (see Section 4.2)
  - Barcode data string
  - Warehouse location (if assigned)

**Section 4: Print Button**
- Display ONLY when at least one barcode is generated
- `<lightning-button label="Print All Barcodes" variant="success" icon-name="utility:print">`
- Onclick: `window.print()`

### 4.2 CSS Barcode Visualization (CRITICAL)

**IMPORTANT:** Barcode MUST be pure CSS using HTML div elements. NO external libraries, NO SVG generation, NO canvas.

**HTML Structure for Barcode:**
```html
<div class="barcode-visual">
    <div class="bar"></div>
    <div class="space"></div>
    <div class="bar wide"></div>
    <div class="space"></div>
    <div class="bar"></div>
    <div class="space"></div>
    <div class="bar wide"></div>
    <div class="space"></div>
    <div class="bar"></div>
    <div class="space"></div>
    <div class="bar wide"></div>
    <div class="space"></div>
    <div class="bar"></div>
    <div class="space"></div>
    <div class="bar wide"></div>
    <div class="space"></div>
    <div class="bar"></div>
    <div class="space"></div>
    <div class="bar wide"></div>
    <div class="space"></div>
    <div class="bar"></div>
</div>
```

**CSS Requirements:**
```css
.barcode-visual {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    height: 100px;
    margin: 15px 0;
    background: white;
}

.barcode-visual .bar {
    background-color: #000;
    width: 3px;
    height: 80px;
    flex-shrink: 0;
}

.barcode-visual .bar.wide {
    background-color: #000;
    width: 6px;
    height: 80px;
    flex-shrink: 0;
}

.barcode-visual .space {
    width: 3px;
    height: 80px;
    background: white;
    flex-shrink: 0;
}
```

---

## 5. JAVASCRIPT LOGIC REQUIREMENTS

### 5.1 Imports Required
```javascript
import { LightningElement, track } from 'lwc';
import getRecentOrders from '@salesforce/apex/BarcodeGeneratorController.getRecentOrders';
import getOrderItems from '@salesforce/apex/BarcodeGeneratorController.getOrderItems';
import updateBarcodeData from '@salesforce/apex/BarcodeGeneratorController.updateBarcodeData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
```

**DO NOT IMPORT:**
- ❌ Any external libraries
- ❌ Any non-existent Apex methods
- ❌ Any methods named `generateBarcodeImage` or similar

### 5.2 Component Properties

```javascript
@track orderOptions = [];           // Array of {label, value} for dropdown
@track orderItems = [];              // Array of OrderItem objects with computed properties
@track selectedOrderId = '';         // Currently selected order ID
@track hasOrderItems = false;        // Boolean to show/hide table
@track hasGeneratedBarcodes = false; // Boolean to show/hide print button
```

### 5.3 Data Mapping Logic

**When getOrderItems returns data, map each item to include:**

```javascript
{
    Id: item.Id,                                              // MUST be capital 'I'
    productName: item.Product2.Name,
    quantity: item.Quantity,
    unitPrice: item.UnitPrice,
    location: item.Warehouse_Location__c || '',
    barcodeGenerated: item.Barcode_Generated__c || false,
    showBarcode: item.Barcode_Generated__c || false,         // Controls barcode visibility
    barcodeKey: `barcode-${item.Id}`,                        // Unique key for barcode row
    orderNumber: item.Order.OrderNumber,
    barcodeData: `${item.Order.OrderNumber}-${item.Product2.Name}-${item.Id}`  // Formatted string
}
```

**CRITICAL:** Use `item.Id` (capital I) NOT `item.id` (lowercase). Salesforce API uses capital letters.

### 5.4 Event Handlers

**handleOrderChange(event)**
- Get selected order ID from `event.detail.value`
- Store in `selectedOrderId`
- Call `loadOrderItems()`

**handleRefresh()**
- Call `loadOrders()`
- If order is selected, call `loadOrderItems()`

**handleGenerateBarcode(event)**
- Get item ID from `event.target.dataset.id`
- Find item in `orderItems` array
- Set `item.showBarcode = true`
- Set `item.barcodeGenerated = true`
- Call `updateBarcodeData()` Apex method
- Show success toast on completion
- Trigger reactivity: `this.orderItems = [...this.orderItems]`

**handleLocationChange(event)**
- Get item ID from `event.target.dataset.id`
- Update `item.location` with `event.target.value`
- Location will be saved when Generate is clicked

**handlePrint()**
- Execute `window.print()`

### 5.5 Error Handling

**All Apex calls must have:**
```javascript
.then(result => {
    // Success logic
})
.catch(error => {
    this.showToast('Error', 'Descriptive error message', 'error');
    console.error('Error:', error);
});
```

**Toast notification method:**
```javascript
showToast(title, message, variant) {
    const event = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant  // 'success', 'error', 'warning', 'info'
    });
    this.dispatchEvent(event);
}
```

---

## 6. PRINT FUNCTIONALITY REQUIREMENTS

### 6.1 Print CSS Media Queries

**CRITICAL:** Barcode must print with black bars visible. Most browsers disable background colors in print by default.

**Required CSS:**

```css
@media print {
    /* Force browsers to print colors */
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }

    /* Hide UI elements in print */
    lightning-card > header,
    .slds-m-around_medium:has(lightning-combobox),
    .slds-m-around_medium:has(lightning-button[label="Refresh"]),
    thead,
    tbody > tr:not(.barcode-row),
    lightning-button[label="Print All Barcodes"] {
        display: none !important;
    }

    /* Ensure barcode row displays */
    .barcode-row {
        display: table-row !important;
        page-break-inside: avoid !important;
    }

    /* Style barcode container for print */
    .barcode-container {
        background: white !important;
        padding: 30px !important;
        border: 3px solid #000 !important;
        page-break-inside: avoid !important;
        margin: 20px 0 !important;
    }

    /* Make bars bigger and darker for print */
    .barcode-visual .bar {
        background-color: #000 !important;
        width: 5px !important;
        height: 100px !important;
    }

    .barcode-visual .bar.wide {
        background-color: #000 !important;
        width: 10px !important;
        height: 100px !important;
    }

    /* Page settings */
    @page {
        margin: 0.5in;
        size: auto;
    }
}
```

### 6.2 Barcode Row HTML Structure

**Add `class="barcode-row"` to the barcode display row:**

```html
<tr key={item.barcodeKey} class="barcode-row">
    <td colspan="6" class="barcode-cell">
        <!-- Barcode content here -->
    </td>
</tr>
```

---

## 7. COMPONENT METADATA

**File:** `barcodeGenerator.js-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>65.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
    <targetConfigs>
        <targetConfig targets="lightning__AppPage, lightning__HomePage">
            <supportedFormFactors>
                <supportedFormFactor type="Large"/>
                <supportedFormFactor type="Small"/>
            </supportedFormFactors>
        </targetConfig>
    </targetConfigs>
</LightningComponentBundle>
```

---

## 8. APEX TEST CLASS REQUIREMENTS

**Class Name:** `BarcodeGeneratorControllerTest`

**Test Coverage Required:** 85%+ for deployment

**Test Methods Required:**

```apex
@isTest
private class BarcodeGeneratorControllerTest {
    
    @TestSetup
    static void setupTestData() {
        // Create test Account
        Account testAccount = new Account(Name = 'Test Company');
        insert testAccount;
        
        // Create test Order
        Order testOrder = new Order(
            AccountId = testAccount.Id,
            EffectiveDate = Date.today(),
            Status = 'Activated'
        );
        insert testOrder;
        
        // Create test Product
        Product2 testProduct = new Product2(
            Name = 'Test Product',
            IsActive = true
        );
        insert testProduct;
        
        // Get standard price book (required for OrderItem)
        Id pricebookId = Test.getStandardPricebookId();
        
        // Create PricebookEntry
        PricebookEntry pbe = new PricebookEntry(
            Pricebook2Id = pricebookId,
            Product2Id = testProduct.Id,
            UnitPrice = 100.00,
            IsActive = true
        );
        insert pbe;
        
        // Create OrderItem
        OrderItem testOrderItem = new OrderItem(
            OrderId = testOrder.Id,
            Product2Id = testProduct.Id,
            PricebookEntryId = pbe.Id,
            Quantity = 1,
            UnitPrice = 100.00
        );
        insert testOrderItem;
    }
    
    @isTest
    static void testGetRecentOrders() {
        // Test getRecentOrders method
        Test.startTest();
        List<Map<String, String>> orders = BarcodeGeneratorController.getRecentOrders();
        Test.stopTest();
        
        System.assertNotEquals(null, orders);
        System.assertEquals(1, orders.size());
        System.assert(orders[0].get('label').contains('Test Company'));
    }
    
    @isTest
    static void testGetOrderItems() {
        // Get test order
        Order testOrder = [SELECT Id FROM Order LIMIT 1];
        
        Test.startTest();
        List<OrderItem> items = BarcodeGeneratorController.getOrderItems(testOrder.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, items);
        System.assertEquals(1, items.size());
        System.assertEquals('Test Product', items[0].Product2.Name);
    }
    
    @isTest
    static void testUpdateBarcodeData() {
        // Get test order item
        OrderItem testItem = [SELECT Id FROM OrderItem LIMIT 1];
        
        Test.startTest();
        BarcodeGeneratorController.updateBarcodeData(
            testItem.Id, 
            '00001-TestProduct-12345', 
            'Warehouse-A-12'
        );
        Test.stopTest();
        
        // Verify update
        OrderItem updatedItem = [
            SELECT Barcode_Generated__c, Barcode_Image__c, Warehouse_Location__c 
            FROM OrderItem 
            WHERE Id = :testItem.Id
        ];
        System.assertEquals(true, updatedItem.Barcode_Generated__c);
        System.assertEquals('00001-TestProduct-12345', updatedItem.Barcode_Image__c);
        System.assertEquals('Warehouse-A-12', updatedItem.Warehouse_Location__c);
    }
    
    @isTest
    static void testGetOrderItemsError() {
        Test.startTest();
        try {
            BarcodeGeneratorController.getOrderItems(null);
            System.assert(false, 'Should have thrown exception');
        } catch (Exception e) {
            System.assert(true, 'Exception caught as expected');
        }
        Test.stopTest();
    }
}
```

---

## 9. STYLING REQUIREMENTS

### 9.1 Screen Styles

```css
/* Barcode cell styling */
.barcode-cell {
    background-color: #f3f3f3;
    padding: 20px !important;
}

/* Barcode container */
.barcode-container {
    background: white;
    padding: 20px;
    border: 2px solid #000;
    text-align: center;
    max-width: 400px;
    margin: 0 auto;
}

/* Barcode header */
.barcode-header {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #000;
}

/* Barcode text */
.barcode-text {
    font-size: 12px;
    margin: 10px 0;
    color: #444;
    font-family: monospace;
}

/* Location badge */
.barcode-location {
    font-size: 14px;
    font-weight: bold;
    color: #0070d2;
    margin-top: 10px;
    padding: 5px;
    background: #e8f4ff;
    border-radius: 3px;
}
```

### 9.2 SLDS Classes to Use

**Lightning Card:** `icon-name="custom:custom14"`

**Table:** 
- `slds-table`
- `slds-table_bordered`
- `slds-table_cell-buffer`

**Badges:**
- Success: `slds-badge slds-badge_success`
- Default: `slds-badge`

**Buttons:**
- Generate: `variant="brand"`
- Print: `variant="success"`
- Refresh: `icon-name="utility:refresh"`

---

## 10. USER WORKFLOW

**Step-by-Step User Journey:**

1. User opens Barcode Generator page in Salesforce
2. User sees dropdown with activated orders (Order # - Account Name)
3. User selects an order from dropdown
4. Table appears showing all line items (products) from that order
5. For each line item, user:
   a. Enters warehouse location in text field (optional)
   b. Clicks "Generate" button
6. Barcode appears below the line item with:
   - Product name
   - Order number and Item ID
   - CSS barcode bars
   - Barcode data string
   - Warehouse location (if entered)
7. Badge changes from "Not Generated" to "Generated" (green)
8. User repeats for all items
9. User clicks "Print All Barcodes" button
10. Browser print dialog opens with only barcodes visible
11. User prints to label printer or PDF

---

## 11. ERROR HANDLING REQUIREMENTS

**All Apex methods must:**
1. Use try-catch blocks
2. Throw `AuraHandledException` on errors
3. Include descriptive error messages
4. Log errors to System.debug()

**Example:**
```apex
public static List<OrderItem> getOrderItems(String orderId) {
    try {
        if (String.isBlank(orderId)) {
            throw new AuraHandledException('Order ID is required');
        }
        return [SELECT ... FROM OrderItem WHERE OrderId = :orderId];
    } catch (Exception e) {
        System.debug('Error in getOrderItems: ' + e.getMessage());
        throw new AuraHandledException('Error retrieving order items: ' + e.getMessage());
    }
}
```

**JavaScript must:**
1. Use .catch() on all promises
2. Show toast notifications on errors
3. Log to console.error()
4. Gracefully handle null/undefined values

---

## 12. PERFORMANCE REQUIREMENTS

**Apex Performance:**
- Use `@AuraEnabled(cacheable=true)` for read-only methods
- LIMIT queries to 50 records for dropdown
- Use selective SOQL (only query needed fields)
- Bulkify for future enhancements

**JavaScript Performance:**
- Minimize DOM manipulation
- Use reactive properties (@track)
- Avoid unnecessary loops
- Client-side barcode generation (no server calls)

**Expected Load Times:**
- Order dropdown: < 1 second
- Order items load: < 2 seconds
- Barcode generation: Instant (< 100ms)
- Print preview: < 1 second

---

## 13. SECURITY REQUIREMENTS

**Apex Security:**
- Use `with sharing` keyword
- Respect field-level security
- Respect object-level security
- No SOQL injection vulnerabilities

**Field Access:**
- User must have Read access to: Order, OrderItem, Product2, Account
- User must have Edit access to: OrderItem (for barcode fields)

**Permissions:**
- Create permission set if needed: "Barcode Generator Users"
- Grant access to custom fields

---

## 14. VALIDATION RULES

**Order Selection:**
- Must select order before showing items
- Show message: "Select an Order to view line items" when no order selected

**Barcode Generation:**
- Cannot generate if item has no product name
- Cannot save without order item ID
- Location field is optional (can be blank)

**Data Integrity:**
- Barcode data format: `{OrderNumber}-{ProductName}-{ItemId}`
- All fields trimmed of whitespace
- No special characters that break printing

---

## 15. ACCESSIBILITY REQUIREMENTS

**ARIA Labels:**
- Add `aria-label` to buttons
- Use semantic HTML (`<table>`, `<th>`, `<td>`)
- Proper heading hierarchy

**Keyboard Navigation:**
- All buttons must be keyboard accessible
- Tab order must be logical
- Enter key should work on buttons

**Screen Reader:**
- Table headers must be properly labeled
- Status changes should be announced
- Error messages should be clear

---

## 16. DEPLOYMENT CHECKLIST

**Before Deployment:**
- [ ] Create 3 custom fields on OrderItem
- [ ] Verify user permissions
- [ ] Test with real order data
- [ ] Test print functionality
- [ ] Verify no console errors
- [ ] Run Apex tests (85%+ coverage)
- [ ] Check CSP compliance

**Deployment Steps:**
1. Deploy Apex class and test class
2. Deploy Lightning Web Component
3. Create Lightning App page
4. Add component to page
5. Activate page
6. Add to Sales app navigation

---

## 17. KNOWN CONSTRAINTS & LIMITATIONS

**Technical Constraints:**
1. ❌ Cannot use external JavaScript libraries (CSP)
2. ❌ Cannot import from CDNs
3. ❌ Cannot use Google Fonts
4. ✅ Must use pure CSS for barcode
5. ✅ Must use browser-native print

**Business Constraints:**
1. Only shows Activated orders (by design)
2. Limited to 50 orders in dropdown (performance)
3. Requires manual order activation
4. Barcode format is fixed (cannot customize per user)

**Browser Constraints:**
1. Print CSS may vary by browser
2. Tested on Chrome (primary)
3. Should work on Firefox, Safari, Edge
4. Print color settings must allow background graphics

---

## 18. FUTURE ENHANCEMENTS (OUT OF SCOPE)

**Phase 2 Possibilities:**
- QR code generation (SVG-based)
- Bulk barcode generation
- Mobile scanning interface
- PDF export
- Email functionality
- Custom barcode formats
- Barcode history tracking

**DO NOT IMPLEMENT THESE IN VERSION 1.0**

---

## 19. CRITICAL REMINDERS FOR AI

**DO:**
✅ Use capital 'I' in `item.Id` (not lowercase 'id')
✅ Use pure CSS for barcode (NO external libraries)
✅ Add `class="barcode-row"` to barcode display row
✅ Use `print-color-adjust: exact` in print CSS
✅ Import only Apex methods that exist in controller
✅ Use `with sharing` in Apex
✅ Test with try-catch blocks everywhere
✅ Use `@track` for reactive properties
✅ Force reactivity with `this.orderItems = [...this.orderItems]`

**DO NOT:**
❌ Import external libraries
❌ Use `generateBarcodeImage` method (doesn't exist)
❌ Use lowercase 'id' (use 'Id')
❌ Forget `class="barcode-row"`
❌ Forget print CSS color-adjust
❌ Create methods not specified in this PRD
❌ Use complicated abstractions
❌ Add unnecessary code

---

## 20. SUCCESS CRITERIA

**The component is complete when:**
1. ✅ Order dropdown loads 50 activated orders
2. ✅ Selecting order shows line items in table
3. ✅ Clicking Generate shows CSS barcode bars
4. ✅ Barcode contains order/product/item data
5. ✅ Location field saves to database
6. ✅ Badge updates to "Generated" status
7. ✅ Print button appears after generation
8. ✅ Print preview shows barcodes (not blank)
9. ✅ No console errors
10. ✅ Apex tests achieve 85%+ coverage
11. ✅ Zero CSP violations
12. ✅ Deploys without errors

---

## 21. AGENTFORCE GENERATION COMMAND

**After reading this entire PRD, generate:**

1. `barcodeGenerator.html` - Complete HTML with all sections
2. `barcodeGenerator.js` - Complete JavaScript with all methods
3. `barcodeGenerator.css` - Complete CSS with print styles
4. `barcodeGenerator.js-meta.xml` - Component metadata
5. `BarcodeGeneratorController.cls` - Complete Apex controller
6. `BarcodeGeneratorControllerTest.cls` - Complete test class with 85%+ coverage

**Remember:**
- Follow EVERY specification in this PRD
- Do NOT add features not specified
- Do NOT use external libraries
- Use capital 'I' in Id fields
- Add print CSS properly
- Test everything with try-catch

**END OF PRD**
```

---

## **How to Use This PRD:**

1. **Create custom fields FIRST** (section 2.2)
2. **Copy entire PRD above**
3. **Paste into Agentforce Vibes**
4. **Add:** "Generate all 6 files as specified in this PRD. Follow every specification exactly."
5. **Click "Act"**
6. **Review and deploy generated code**

---

**This PRD eliminates 90% of the debugging we did by being extremely specific about:**
- ✅ Exact field names (Id not id)
- ✅ No external libraries
- ✅ Print CSS requirements
- ✅ Exact data structure
- ✅ What NOT to generate
- ✅ Error handling patterns

**Result: One-shot generation with minimal refinement needed!** 🎯