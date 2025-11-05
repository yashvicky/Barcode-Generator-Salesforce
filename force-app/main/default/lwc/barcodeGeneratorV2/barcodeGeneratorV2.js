import { LightningElement, api, track, wire } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import JSBARCODE from '@salesforce/resourceUrl/JsBarcode';

// Import Order fields
import ORDER_NUMBER_FIELD from '@salesforce/schema/Order.OrderNumber';
import ACCOUNT_NAME_FIELD from '@salesforce/schema/Order.Account.Name';
import ORDER_BARCODE_FIELD from '@salesforce/schema/Order.Order_Barcode__c';
// Import Product field
import PRODUCT_BARCODE_FIELD from '@salesforce/schema/Product2.Product_Barcode__c';

// Import Apex methods
import getOrderProducts from '@salesforce/apex/BarcodeGeneratorV2Controller.getOrderProducts';
import getOrderLineItems from '@salesforce/apex/BarcodeGeneratorV2Controller.getOrderLineItems';
export default class BarcodeGeneratorV2 extends LightningElement {
    
    @api recordId;
    
    @track orderNumber = '';
    @track accountName = '';
    @track orderBarcodeGenerated = false;
    
    @track products = [];
    @track productsLoaded = false;
    @track productCount = 0;

    @track lineItems = [];
    @track lineItemsLoaded = false;
    @track lineItemCount = 0; 
    
    @track isGeneratingInvoice = false;
    @track showInvoiceSuccess = false;

    jsBarcodeLoaded = false;

    // Computed properties
    get hasProducts() {
        return this.products && this.products.length > 0;
    }

    get hasLineItems() {
        return this.lineItems && this.lineItems.length > 0;
    }
    
    // Wire service to get Order data
    @wire(getRecord, { 
        recordId: '$recordId', 
        fields: [ORDER_NUMBER_FIELD, ACCOUNT_NAME_FIELD, ORDER_BARCODE_FIELD]
    })
    wiredOrder({ error, data }) {
        if (data) {
            this.orderNumber = getFieldValue(data, ORDER_NUMBER_FIELD);
            this.accountName = getFieldValue(data, ACCOUNT_NAME_FIELD);
            const existingBarcode = getFieldValue(data, ORDER_BARCODE_FIELD);
            
            console.log('Order loaded:', this.orderNumber);
            console.log('Account:', this.accountName);
            
            // Check if barcode already generated
            if (existingBarcode && existingBarcode.length > 0) {
                this.orderBarcodeGenerated = true;
                // Regenerate barcode display
                this.loadJsBarcodeAndGenerate();
            }
            
        } else if (error) {
            console.error('Error loading order:', error);
            this.showToast('Error', 'Failed to load order data', 'error');
        }
    }
    
    // Generate Order Barcode
    handleGenerateOrderBarcode() {
        console.log('Generating order barcode for:', this.orderNumber);
        
        if (!this.orderNumber) {
            this.showToast('Error', 'Order number not available', 'error');
            return;
        }
        
        // Mark as generated
        this.orderBarcodeGenerated = true;
        
        // Load JsBarcode library and generate barcode
        this.loadJsBarcodeAndGenerate();
        
        this.showToast('Success', 'Order barcode generated!', 'success');
    }
    
    // Load JsBarcode library from Static Resource
    loadJsBarcodeAndGenerate() {
        if (this.jsBarcodeLoaded) {
            // Library already loaded, just generate
            this.generateBarcodeImage();
            return;
        }
        
        // Load library from Salesforce Static Resource
        loadScript(this, JSBARCODE)
            .then(() => {
                console.log('JsBarcode library loaded successfully from Static Resource');
                this.jsBarcodeLoaded = true;
                this.generateBarcodeImage();
            })
            .catch(error => {
                console.error('Error loading JsBarcode library:', error);
                this.showToast('Error', 'Failed to load barcode library', 'error');
                this.orderBarcodeGenerated = false;
            });
    }
    
    // Generate barcode using JsBarcode
    generateBarcodeImage() {
        // Wait for DOM to update
        setTimeout(() => {
            try {
                const svgElement = this.template.querySelector('.barcode-svg');
                
                if (!svgElement) {
                    console.error('SVG element not found');
                    return;
                }
                
                // Generate barcode using JsBarcode
                // Format: Code128 (standard barcode format)
                window.JsBarcode(svgElement, this.orderNumber, {
                    format: "CODE128",
                    width: 2,
                    height: 100,
                    displayValue: false,
                    margin: 10,
                    background: "#ffffff",
                    lineColor: "#000000"
                });
                
                console.log('Barcode generated successfully');
                
            } catch (error) {
                console.error('Error generating barcode:', error);
                this.showToast('Error', 'Failed to generate barcode image', 'error');
            }
        }, 100);
    }
    // Generate Product Barcodes
handleGenerateProductBarcodes() {
    console.log('Generating product barcodes for order:', this.recordId);
    
    if (!this.recordId) {
        this.showToast('Error', 'Order ID not available', 'error');
        return;
    }
    
    // Call Apex to get products
    getOrderProducts({ orderId: this.recordId })
        .then(result => {
            console.log('Products retrieved:', result);
            
            if (result && result.length > 0) {
                // Map products with unique keys
                this.products = result.map(item => {
                    return {
                        productId: item.Product2Id,
                        productName: item.Product2.Name,
                        orderItemId: item.Id
                    };
                });
                
                this.productCount = this.products.length;
                this.productsLoaded = true;
                
                // Generate barcodes for all products
                this.generateAllProductBarcodes();
                
                this.showToast('Success', `${this.productCount} product barcode(s) generated!`, 'success');
            } else {
                this.productsLoaded = true;
                this.showToast('Warning', 'No products found in this order', 'warning');
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
            this.showToast('Error', 'Failed to load products: ' + error.body.message, 'error');
        });
}

// Generate barcodes for all products
generateAllProductBarcodes() {
    if (!this.jsBarcodeLoaded) {
        // Load library first
        loadScript(this, JSBARCODE)
            .then(() => {
                console.log('JsBarcode loaded for products');
                this.jsBarcodeLoaded = true;
                this.renderProductBarcodes();
            })
            .catch(error => {
                console.error('Error loading JsBarcode:', error);
                this.showToast('Error', 'Failed to load barcode library', 'error');
            });
    } else {
        // Library already loaded
        this.renderProductBarcodes();
    }
}

// Render barcode for each product
renderProductBarcodes() {
    setTimeout(() => {
        this.products.forEach(product => {
            try {
                // Find SVG element for this product
                const svgElement = this.template.querySelector(`svg[data-product-id="${product.productId}"]`);
                
                if (!svgElement) {
                    console.error('SVG element not found for product:', product.productId);
                    return;
                }
                
                // Generate barcode using product ID
                window.JsBarcode(svgElement, product.productId, {
                    format: "CODE128",
                    width: 2,
                    height: 60,
                    displayValue: false,
                    margin: 5,
                    background: "#ffffff",
                    lineColor: "#000000"
                });
                
                console.log('Product barcode generated for:', product.productName);
                
            } catch (error) {
                console.error('Error generating product barcode:', error);
            }
        });
    }, 200); // Longer timeout to ensure DOM is ready
}
// Generate Line Item Barcodes
handleGenerateLineItemBarcodes() {
    console.log('Generating line item barcodes for order:', this.recordId);
    
    if (!this.recordId) {
        this.showToast('Error', 'Order ID not available', 'error');
        return;
    }
    
    // Call Apex to get line items
    getOrderLineItems({ orderId: this.recordId })
        .then(result => {
            console.log('Line items retrieved:', result);
            
            if (result && result.length > 0) {
                // Map line items with formatted data
                this.lineItems = result.map(item => {
                    return {
                        Id: item.Id,
                        shortId: this.getShortId(item.Id),
                        Product2: item.Product2,
                        Quantity: item.Quantity,
                        UnitPrice: item.UnitPrice,
                        formattedPrice: this.formatCurrency(item.UnitPrice),
                        TotalPrice: item.TotalPrice
                    };
                });
                
                this.lineItemCount = this.lineItems.length;
                this.lineItemsLoaded = true;
                
                // Generate barcodes for all line items
                this.generateAllLineItemBarcodes();
                
                this.showToast('Success', `${this.lineItemCount} line item barcode(s) generated!`, 'success');
            } else {
                this.lineItemsLoaded = true;
                this.showToast('Warning', 'No line items found in this order', 'warning');
            }
        })
        .catch(error => {
            console.error('Error loading line items:', error);
            this.showToast('Error', 'Failed to load line items: ' + error.body.message, 'error');
        });
}

// Generate barcodes for all line items
generateAllLineItemBarcodes() {
    if (!this.jsBarcodeLoaded) {
        // Load library first
        loadScript(this, JSBARCODE)
            .then(() => {
                console.log('JsBarcode loaded for line items');
                this.jsBarcodeLoaded = true;
                this.renderLineItemBarcodes();
            })
            .catch(error => {
                console.error('Error loading JsBarcode:', error);
                this.showToast('Error', 'Failed to load barcode library', 'error');
            });
    } else {
        // Library already loaded
        this.renderLineItemBarcodes();
    }
}

// Render barcode for each line item
renderLineItemBarcodes() {
    setTimeout(() => {
        this.lineItems.forEach(lineItem => {
            try {
                // Find SVG element for this line item
                const svgElement = this.template.querySelector(`svg[data-lineitem-id="${lineItem.Id}"]`);
                
                if (!svgElement) {
                    console.error('SVG element not found for line item:', lineItem.Id);
                    return;
                }
                
                // Generate barcode using line item ID
                window.JsBarcode(svgElement, lineItem.Id, {
                    format: "CODE128",
                    width: 1.5,
                    height: 50,
                    displayValue: false,
                    margin: 5,
                    background: "#ffffff",
                    lineColor: "#000000"
                });
                
                console.log('Line item barcode generated for:', lineItem.Product2.Name);
                
            } catch (error) {
                console.error('Error generating line item barcode:', error);
            }
        });
    }, 300); // Longer timeout for table rendering
}

// Helper: Get short ID for display
getShortId(fullId) {
    if (!fullId) return '';
    return fullId.substring(0, 8) + '...';
}

// Helper: Format currency
formatCurrency(value) {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}
 
// Generate Invoice
handleGenerateInvoice() {
    console.log('Generating invoice for order:', this.recordId);
    
    // Validation
    if (!this.orderBarcodeGenerated) {
        this.showToast('Warning', 'Please generate Order barcode first', 'warning');
        return;
    }
    
    // Show loading state
    this.isGeneratingInvoice = true;
    this.showInvoiceSuccess = false;
    
    // Build Visualforce PDF URL
    const baseUrl = window.location.origin;
    const pdfUrl = `${baseUrl}/apex/OrderInvoicePDF?id=${this.recordId}`;
    
    // Open PDF in new tab
    window.open(pdfUrl, '_blank');
    
    // Update UI after short delay
    setTimeout(() => {
        this.isGeneratingInvoice = false;
        this.showInvoiceSuccess = true;
        this.showToast('Success', 'Invoice opened in new tab!', 'success');
    }, 1000);
}


    // Close modal
    handleClose() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
    
    // Show toast notification
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}
