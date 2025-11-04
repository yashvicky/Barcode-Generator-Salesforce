/**
 * @description Controller for Barcode Generator Lightning Web Component
 * @author [Yashwanth Doraswamy]
 * @date 2025-10-28
 * @group Inventory Management
 * 
 * Provides methods to:
 * - Fetch activated orders for selection
 * - Retrieve order line items with product details
 * - Save barcode data and warehouse locations
 * 
 * Security: Uses 'with sharing' for record-level security
 * Performance: Cacheable methods for efficiency
 */

public with sharing class BarcodeGeneratorController {
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getRecentOrders() {
        List<Map<String, String>> orderOptions = new List<Map<String, String>>();
        
        try {
            List<Order> orders = [
                SELECT Id, OrderNumber, Account.Name 
                FROM Order 
                WHERE Status = 'Activated'
                ORDER BY CreatedDate DESC 
                
                LIMIT 50
            ];
            
            for (Order ord : orders) {
                Map<String, String> option = new Map<String, String>();
                option.put('label', 'Order #' + ord.OrderNumber + ' - ' + ord.Account.Name);
                option.put('value', ord.Id);
                orderOptions.add(option);
            }
        } catch (Exception e) {
            System.debug('Error in getRecentOrders: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving orders: ' + e.getMessage());
        }
        
        return orderOptions;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<OrderItem> getOrderItems(String orderId) {
        try {
            List<OrderItem> items = [
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
            ];
            
            return items;
        } catch (Exception e) {
            System.debug('Error in getOrderItems: ' + e.getMessage());
            throw new AuraHandledException('Error retrieving order items: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateBarcodeData(String orderItemId, String barcodeImage, String location) {
        try {
            OrderItem item = new OrderItem(
                Id = orderItemId,
                Barcode_Image__c = barcodeImage,
                Warehouse_Location__c = location,
                Barcode_Generated__c = true
            );
            
            update item;
        } catch (Exception e) {
            System.debug('Error in updateBarcodeData: ' + e.getMessage());
            throw new AuraHandledException('Error updating barcode: ' + e.getMessage());
        }
    }
}