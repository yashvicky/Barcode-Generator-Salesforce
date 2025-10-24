public with sharing class BarcodeGeneratorController {
    public class OrderItemDTO {
        @AuraEnabled public Id id;
        @AuraEnabled public String productName;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal unitPrice;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public Boolean barcodeGenerated;
        @AuraEnabled public String warehouseLocation;
        @AuraEnabled public String barcodeImage; // optional when returning, used for print-all if needed
    }

    @AuraEnabled(cacheable=true)
    public static List<OrderItemDTO> getOrderItems(String orderId) {
        if (String.isBlank(orderId)) {
            return new List<OrderItemDTO>();
        }
        try {
            List<OrderItem> items = [
                SELECT Id,
                       Quantity,
                       UnitPrice,
                       Order.OrderNumber,
                       Product2.Name,
                       Barcode_Generated__c,
                       Warehouse_Location__c,
                       Barcode_Image__c
                FROM OrderItem
                WHERE OrderId = :orderId
                ORDER BY CreatedDate ASC
                LIMIT 2000
            ];
            List<OrderItemDTO> result = new List<OrderItemDTO>();
            for (OrderItem oi : items) {
                OrderItemDTO dto = new OrderItemDTO();
                dto.id = oi.Id;
                dto.productName = (oi.Product2 != null) ? oi.Product2.Name : null;
                dto.quantity = oi.Quantity;
                dto.unitPrice = oi.UnitPrice;
                dto.orderNumber = (oi.Order != null) ? oi.Order.OrderNumber : null;
                dto.barcodeGenerated = oi.Barcode_Generated__c;
                dto.warehouseLocation = oi.Warehouse_Location__c;
                // Do not send image by default to keep payload small; send only when needed for print view if desired
                // dto.barcodeImage = oi.Barcode_Image__c;
                result.add(dto);
            }
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load Order Items: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static String updateBarcodeData(String orderItemId, String barcodeImage, String location) {
        if (String.isBlank(orderItemId)) {
            throw new AuraHandledException('Order Item Id is required.');
        }
        if (String.isBlank(barcodeImage)) {
            throw new AuraHandledException('Barcode image data is required.');
        }
        try {
            OrderItem oi = new OrderItem(
                Id = orderItemId,
                Barcode_Image__c = barcodeImage,
                Warehouse_Location__c = location,
                Barcode_Generated__c = true
            );
            update oi;
            return 'SUCCESS';
        } catch (DmlException d) {
            throw new AuraHandledException('Failed to save barcode: ' + d.getDmlMessage(0));
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<OrderItemDTO> getItemsWithBarcodes(String orderId) {
        if (String.isBlank(orderId)) {
            return new List<OrderItemDTO>();
        }
        try {
            List<OrderItem> items = [
                SELECT Id,
                       Quantity,
                       UnitPrice,
                       Order.OrderNumber,
                       Product2.Name,
                       Barcode_Generated__c,
                       Warehouse_Location__c,
                       Barcode_Image__c
                FROM OrderItem
                WHERE OrderId = :orderId AND Barcode_Generated__c = true
                ORDER BY CreatedDate ASC
                LIMIT 2000
            ];
            List<OrderItemDTO> result = new List<OrderItemDTO>();
            for (OrderItem oi : items) {
                OrderItemDTO dto = new OrderItemDTO();
                dto.id = oi.Id;
                dto.productName = (oi.Product2 != null) ? oi.Product2.Name : null;
                dto.quantity = oi.Quantity;
                dto.unitPrice = oi.UnitPrice;
                dto.orderNumber = (oi.Order != null) ? oi.Order.OrderNumber : null;
                dto.barcodeGenerated = oi.Barcode_Generated__c;
                dto.warehouseLocation = oi.Warehouse_Location__c;
                dto.barcodeImage = oi.Barcode_Image__c;
                result.add(dto);
            }
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to load barcodes: ' + e.getMessage());
        }
    }
}
