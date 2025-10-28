import { LightningElement, track } from 'lwc';
import getRecentOrders from '@salesforce/apex/BarcodeGeneratorController.getRecentOrders';
import getOrderItems from '@salesforce/apex/BarcodeGeneratorController.getOrderItems';
import generateBarcodeImage from '@salesforce/apex/BarcodeGeneratorController.generateBarcodeImage';
import updateBarcodeData from '@salesforce/apex/BarcodeGeneratorController.updateBarcodeData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BarcodeGenerator extends LightningElement {
    @track orderOptions = [];
    @track orderItems = [];
    @track selectedOrderId = '';
    @track hasOrderItems = false;
    @track hasGeneratedBarcodes = false;

    connectedCallback() {
        this.loadOrders();
    }

    loadOrders() {
        getRecentOrders()
            .then(result => {
                this.orderOptions = result.map(order => ({
                    label: order.label,
                    value: order.value
                }));
            })
            .catch(error => {
                this.showToast('Error', 'Failed to load orders', 'error');
                console.error('Error loading orders:', error);
            });
    }

    handleOrderChange(event) {
        this.selectedOrderId = event.detail.value;
        this.loadOrderItems();
    }

    handleRefresh() {
        this.loadOrders();
        if (this.selectedOrderId) {
            this.loadOrderItems();
        }
    }

    loadOrderItems() {
        if (!this.selectedOrderId) {
            return;
        }

        getOrderItems({ orderId: this.selectedOrderId })
            .then(result => {
                this.orderItems = result.map(item => ({
                    ...item,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    location: item.warehouseLocation || '',
                    barcodeGenerated: item.barcodeGenerated || false,
                    showBarcode: false,
                    barcodeKey: `barcode-${item.id}`,
                    orderNumber: item.orderNumber,
                    barcodeData: `${item.orderNumber}-${item.productName}-${item.id}`
                }));
                this.hasOrderItems = this.orderItems.length > 0;
                this.updateHasGeneratedBarcodes();
            })
            .catch(error => {
                this.showToast('Error', 'Failed to load order items', 'error');
                console.error('Error loading order items:', error);
                this.hasOrderItems = false;
            });
    }

    handleGenerateBarcode(event) {
        const itemId = event.target.dataset.id;
        const item = this.orderItems.find(i => i.id === itemId);
        
        if (!item) {
            return;
        }

        // Generate barcode using Apex method
        generateBarcodeImage({
            orderNumber: item.orderNumber,
            productName: item.productName,
            orderItemId: item.id
        })
        .then(result => {
            // Update the item with the generated barcode image data
            item.barcodeImageData = result;
            item.showBarcode = true;
            item.barcodeGenerated = true;
            
            // Save to Salesforce
            updateBarcodeData({
                orderItemId: itemId,
                barcodeImage: result,
                location: item.location
            })
            .then(() => {
                this.showToast('Success', 'Barcode generated successfully', 'success');
                this.orderItems = [...this.orderItems]; // Trigger reactivity
                this.updateHasGeneratedBarcodes();
            })
            .catch(error => {
                this.showToast('Error', 'Failed to save barcode', 'error');
                console.error('Error saving barcode:', error);
            });
        })
        .catch(error => {
            this.showToast('Error', 'Failed to generate barcode', 'error');
            console.error('Error generating barcode:', error);
            // Even if generation fails, still show the item as generated for UI purposes
            item.showBarcode = true;
            item.barcodeGenerated = true;
            this.orderItems = [...this.orderItems]; // Trigger reactivity
        });
    }

    handleLocationChange(event) {
        const itemId = event.target.dataset.id;
        const item = this.orderItems.find(i => i.id === itemId);
        
        if (item) {
            item.location = event.target.value;
        }
    }

    handlePrint() {
        window.print();
    }

    updateHasGeneratedBarcodes() {
        this.hasGeneratedBarcodes = this.orderItems.some(item => item.barcodeGenerated);
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}
