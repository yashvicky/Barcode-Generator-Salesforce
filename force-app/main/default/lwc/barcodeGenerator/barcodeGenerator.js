import { LightningElement, track } from 'lwc';
import getRecentOrders from '@salesforce/apex/BarcodeGeneratorController.getRecentOrders';
import getOrderItems from '@salesforce/apex/BarcodeGeneratorController.getOrderItems';
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
                    Id: item.Id,
                    productName: item.Product2.Name,
                    quantity: item.Quantity,
                    unitPrice: item.UnitPrice,
                    location: item.Warehouse_Location__c || '',
                    barcodeGenerated: item.Barcode_Generated__c || false,
                    showBarcode: item.Barcode_Generated__c || false,
                    barcodeKey: `barcode-${item.Id}`,
                    orderNumber: item.Order.OrderNumber,
                    barcodeData: `${item.Order.OrderNumber}-${item.Product2.Name}-${item.Id}`
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
        const item = this.orderItems.find(i => i.Id === itemId);
        
        if (!item) {
            return;
        }

        // Show barcode immediately (CSS-based, no server call needed)
        item.showBarcode = true;
        item.barcodeGenerated = true;

        const barcodeText = `${item.orderNumber}-${item.productName}-${item.Id}`;
        
        // Save to Salesforce
        updateBarcodeData({
            orderItemId: itemId,
            barcodeImage: barcodeText,
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
    }

    handleLocationChange(event) {
        const itemId = event.target.dataset.id;
        const item = this.orderItems.find(i => i.Id === itemId);
        
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