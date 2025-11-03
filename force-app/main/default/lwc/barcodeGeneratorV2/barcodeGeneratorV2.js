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

export default class BarcodeGeneratorV2 extends LightningElement {
    
    @api recordId;
    
    @track orderNumber = '';
    @track accountName = '';
    @track orderBarcodeGenerated = false;
    
    jsBarcodeLoaded = false;
    
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