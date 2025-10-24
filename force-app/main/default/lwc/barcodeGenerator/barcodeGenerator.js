import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOrderItems from '@salesforce/apex/BarcodeGeneratorController.getOrderItems';
import getItemsWithBarcodes from '@salesforce/apex/BarcodeGeneratorController.getItemsWithBarcodes';
import updateBarcodeData from '@salesforce/apex/BarcodeGeneratorController.updateBarcodeData';

// Dynamically load QRCode library from CDN on demand
const QR_LIB_URL = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';

export default class BarcodeGenerator extends LightningElement {
    @track rows = [];
    @track draftValues = [];
    @track isLoading = false;
    @track selectedOrderId;
    @track showModal = false;
    @track currentModal = { orderNumber: '', productName: '', location: '', barcodeDataUrl: '' };
    @track showPrint = false;
    @track printItems = [];

    columns = [
        { label: 'Product Name', fieldName: 'productName', type: 'text', wrapText: true },
        { label: 'Quantity', fieldName: 'quantity', type: 'number' },
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency' },
        {
            label: 'Barcode Status',
            fieldName: 'barcodeGenerated',
            type: 'boolean',
            cellAttributes: {
                iconName: { fieldName: 'statusIcon' },
                iconAlternativeText: 'Status',
                iconPosition: 'left',
                class: { fieldName: 'statusClass' }
            }
        },
        {
            label: 'Warehouse Location',
            fieldName: 'warehouseLocation',
            type: 'text',
            editable: true
        },
        {
            type: 'button',
            typeAttributes: {
                label: 'Generate Barcode',
                name: 'generate',
                title: 'Generate Barcode',
                variant: 'brand',
                disabled: { fieldName: 'disableGenerate' }
            },
            cellAttributes: { alignment: 'left' }
        }
    ];

    get hasRows() {
        return this.rows && this.rows.length > 0;
    }

    get disablePrint() {
        return !this.rows || this.rows.filter(r => r.barcodeGenerated).length === 0;
    }

    connectedCallback() {
        // nothing on load
    }

    // Handle order selection via lightning-record-picker
    handleOrderChange(event) {
        this.selectedOrderId = event.detail && event.detail.value;
        this.draftValues = [];
        if (!this.selectedOrderId) {
            this.rows = [];
            return;
        }
        this.loadRows();
    }

    refresh = () => {
        if (!this.selectedOrderId) {
            this.toast('No Order Selected', 'Please select an Order first.', 'warning');
            return;
        }
        this.loadRows();
    };

    async ensureQrLib() {
        if (window.QRCode || window.qrcode || (window.QRCode && window.QRCode.toDataURL)) {
            return;
        }
        if (!this._qrPromise) {
            this._qrPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = QR_LIB_URL;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load QR library'));
                document.head.appendChild(script);
            });
        }
        return this._qrPromise;
    }

    async loadRows() {
        this.isLoading = true;
        try {
            const data = await getOrderItems({ orderId: this.selectedOrderId });
            this.rows = (data || []).map(r => ({
                ...r,
                statusIcon: r.barcodeGenerated ? 'utility:success' : 'utility:close',
                statusClass: r.barcodeGenerated ? 'slds-text-color_success' : 'slds-text-color_error',
                disableGenerate: !!r.barcodeGenerated
            }));
        } catch (e) {
            this.toast('Error', this.errorMessage(e, 'Failed to load Order Items'), 'error');
            this.rows = [];
        } finally {
            this.isLoading = false;
        }
    }

    // Inline save for Warehouse Location edits
    async handleSaveInline(event) {
        const drafts = event.detail.draftValues || [];
        if (!drafts.length) return;

        // We only persist location upon barcode generation or provide separate save per requirement.
        // Implement separate save to allow updating location without generating barcode: loop rows and if item has barcode, update only location by sending a tiny 1x1 transparent png as no-op is not allowed per Apex validation.
        // Instead, handle: if record already has barcodeGenerated, call Apex with existing image and new location. We need the existing image; so prevent inline save for non-barcoded rows and prompt to generate first.
        const updates = [];
        const blocked = [];

        drafts.forEach(d => {
            const row = this.rows.find(r => r.id === d.id);
            if (!row) return;
            if (!row.barcodeGenerated) {
                blocked.push(row.productName);
            } else {
                updates.push({ id: row.id, location: d.warehouseLocation });
            }
        });

        if (blocked.length) {
            this.toast(
                'Generate Required',
                `Generate a barcode before saving location for: ${blocked.join(', ')}`,
                'warning'
            );
        }

        if (!updates.length) {
            this.draftValues = [];
            return;
        }

        // For updates, we must send the existing barcode image; fetch for print items, then update each.
        try {
            this.isLoading = true;
            const withCodes = await getItemsWithBarcodes({ orderId: this.selectedOrderId });
            const imageMap = new Map(withCodes.map(i => [i.id, i.barcodeImage]));

            for (const u of updates) {
                const image = imageMap.get(u.id);
                if (!image) continue;
                // Reuse updateBarcodeData to also update location
                // eslint-disable-next-line no-await-in-loop
                await updateBarcodeData({ orderItemId: u.id, barcodeImage: image, location: u.location });
            }
            this.toast('Saved', 'Warehouse locations updated.', 'success');
            this.draftValues = [];
            await this.loadRows();
        } catch (e) {
            this.toast('Error', this.errorMessage(e, 'Failed to save locations'), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Datatable row action (button typed column doesn't fire rowaction; intercept via oncellchange? Workaround: use onrowaction if we used type=action. Here we keep button column and listen for cell button clicks with onclick via event delegation.)
    renderedCallback() {
        if (this._bound) return;
        this._bound = true;
        this.template.addEventListener('click', (evt) => {
            const tgt = evt.target;
            if (tgt && tgt.tagName === 'BUTTON' && tgt.title === 'Generate Barcode') {
                // find row by walking DOM to data-row-key-value attribute container
                const rowContainer = tgt.closest('tr');
                if (!rowContainer) return;
                const rowKey = rowContainer.getAttribute('data-row-key-value');
                const row = this.rows.find(r => String(r.id) === String(rowKey));
                if (row) {
                    this.handleGenerate(row);
                }
            }
        });
    }

    async handleGenerate(row) {
        if (!this.selectedOrderId) {
            this.toast('No Order Selected', 'Please select an Order first.', 'warning');
            return;
        }
        if (row.barcodeGenerated) {
            this.toast('Already Generated', 'Barcode already exists for this item.', 'info');
            return;
        }

        // Determine location: if user drafted inline for this row, use it; else use existing warehouseLocation
        const draft = this.draftValues.find(d => d.id === row.id);
        const locationToSave = (draft && draft.warehouseLocation) || row.warehouseLocation || '';

        const content = `${row.orderNumber}-${row.productName}-${row.id}`;

        try {
            this.isLoading = true;
            await this.ensureQrLib();

            // Use qrcode library toDataURL
            const dataUrl = await window.QRCode.toDataURL(content, { errorCorrectionLevel: 'M', width: 256, margin: 1 });

            // Save via Apex
            await updateBarcodeData({ orderItemId: row.id, barcodeImage: dataUrl, location: locationToSave });

            // Show modal preview
            this.currentModal = {
                orderNumber: row.orderNumber,
                productName: row.productName,
                location: locationToSave,
                barcodeDataUrl: dataUrl
            };
            this.showModal = true;

            this.toast('Success', 'Barcode generated and saved.', 'success');
            await this.loadRows();
        } catch (e) {
            this.toast('Error', this.errorMessage(e, 'Failed to generate barcode'), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    closeModal = () => {
        this.showModal = false;
        this.currentModal = { orderNumber: '', productName: '', location: '', barcodeDataUrl: '' };
    };

    async openPrintView() {
        if (!this.selectedOrderId) {
            this.toast('No Order Selected', 'Please select an Order first.', 'warning');
            return;
        }
        try {
            this.isLoading = true;
            const items = await getItemsWithBarcodes({ orderId: this.selectedOrderId });
            this.printItems = (items || []).map(i => ({
                id: i.id,
                productName: i.productName,
                orderNumber: i.orderNumber,
                warehouseLocation: i.warehouseLocation,
                barcodeImage: i.barcodeImage
            }));
            if (!this.printItems.length) {
                this.toast('No Barcodes', 'No barcodes available to print.', 'info');
                return;
            }
            this.showPrint = true;
            // Scroll to top so print grid fills view
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            this.toast('Error', this.errorMessage(e, 'Failed to open print view'), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    closePrintView = () => {
        this.showPrint = false;
        this.printItems = [];
    };

    triggerPrint = () => {
        window.print();
    };

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    errorMessage(error, fallback) {
        let msg = fallback;
        try {
            if (error && error.body && error.body.message) {
                msg = error.body.message;
            } else if (typeof error === 'string') {
                msg = error;
            }
        } catch (e) {
            // ignore
        }
        return msg;
    }
}
