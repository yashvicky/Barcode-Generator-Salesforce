public with sharing class BarcodeGeneratorV2Controller {
    
    @AuraEnabled
    public static void saveOrderBarcode(String orderId, String barcodeValue) {
        try {
            if (String.isBlank(orderId)) {
                throw new AuraHandledException('Order ID is required');
            }
            
            Order orderToUpdate = new Order(
                Id = orderId,
                Order_Barcode__c = barcodeValue
            );
            
            update orderToUpdate;
            
            System.debug('Order barcode saved: ' + barcodeValue);
            
        } catch (Exception e) {
            System.debug('Error saving order barcode: ' + e.getMessage());
            throw new AuraHandledException('Error saving barcode: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<OrderItem> getOrderProducts(String orderId) {
        try {
            if (String.isBlank(orderId)) {
                throw new AuraHandledException('Order ID is required');
            }
            
            List<OrderItem> orderItems = [
                SELECT Id, 
                       Product2Id,
                       Product2.Name,
                       Product2.Product_Barcode__c,
                       Quantity,
                       UnitPrice
                FROM OrderItem 
                WHERE OrderId = :orderId 
                ORDER BY Product2.Name ASC
            ];
            
            System.debug('Found ' + orderItems.size() + ' products for order: ' + orderId);
            
            return orderItems;
            
        } catch (Exception e) {
            System.debug('Error in getOrderProducts: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving products: ' + e.getMessage());
        }
    }
}