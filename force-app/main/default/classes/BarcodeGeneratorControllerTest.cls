@IsTest
private class BarcodeGeneratorControllerTest {
    private static Order testOrder;
    private static Product2 prod1;
    private static Pricebook2 stdPb;
    private static PricebookEntry pbe1;
    private static OrderItem oi1;
    private static OrderItem oi2;

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Acc');
        insert acc;

        // Standard pricebook
        stdPb = [SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
        if (!stdPb.IsActive) {
            stdPb.IsActive = true;
            update stdPb;
        }

        prod1 = new Product2(Name = 'Widget A', IsActive = true);
        insert prod1;

        pbe1 = new PricebookEntry(
            Pricebook2Id = stdPb.Id,
            Product2Id = prod1.Id,
            UnitPrice = 12.50,
            IsActive = true
        );
        insert pbe1;

        // Create Order (must be in Draft)
        testOrder = new Order(
            AccountId = acc.Id,
            EffectiveDate = Date.today(),
            Status = 'Draft',
            Pricebook2Id = stdPb.Id
        );
        insert testOrder;

        oi1 = new OrderItem(
            OrderId = testOrder.Id,
            Quantity = 3,
            UnitPrice = 12.50,
            PricebookEntryId = pbe1.Id
        );
        oi2 = new OrderItem(
            OrderId = testOrder.Id,
            Quantity = 5,
            UnitPrice = 12.50,
            PricebookEntryId = pbe1.Id
        );
        insert new List<OrderItem>{ oi1, oi2 };
    }

    @IsTest
    static void testGetOrderItems() {
        Test.startTest();
        List<BarcodeGeneratorController.OrderItemDTO> rows =
            BarcodeGeneratorController.getOrderItems(testOrder.Id);
        Test.stopTest();

        System.assertNotEquals(null, rows, 'Rows should not be null');
        System.assertEquals(2, rows.size(), 'Should return two order items');
        System.assertEquals('Widget A', rows[0].productName, 'Product name should map');
        System.assertEquals(false, rows[0].barcodeGenerated, 'Initially false');
        System.assertEquals(testOrder.OrderNumber, rows[0].orderNumber, 'Order number mapped');
    }

    @IsTest
    static void testGetOrderItems_EmptyWhenNoId() {
        Test.startTest();
        List<BarcodeGeneratorController.OrderItemDTO> rows =
            BarcodeGeneratorController.getOrderItems(null);
        Test.stopTest();
        System.assertEquals(0, rows.size(), 'No order id returns empty list');
    }

    @IsTest
    static void testUpdateBarcodeData_SuccessAndGetItemsWithBarcodes() {
        // Prepare base64 sample (data URL not required; field stores long text)
        String img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

        Test.startTest();
        String res = BarcodeGeneratorController.updateBarcodeData(oi1.Id, img, 'A1-01');
        Test.stopTest();

        System.assertEquals('SUCCESS', res, 'Should return success');

        OrderItem refreshed = [SELECT Id, Barcode_Generated__c, Warehouse_Location__c, Barcode_Image__c
                               FROM OrderItem WHERE Id = :oi1.Id];
        System.assertEquals(true, refreshed.Barcode_Generated__c, 'Checkbox set');
        System.assertEquals('A1-01', refreshed.Warehouse_Location__c, 'Location saved');
        System.assertNotEquals(null, refreshed.Barcode_Image__c, 'Image saved');

        // Now query items with barcodes
        Test.startTest();
        List<BarcodeGeneratorController.OrderItemDTO> withCodes =
            BarcodeGeneratorController.getItemsWithBarcodes(testOrder.Id);
        Test.stopTest();

        System.assertEquals(1, withCodes.size(), 'Only one item has a barcode');
        System.assertEquals('A1-01', withCodes[0].warehouseLocation, 'Location maps through DTO');
        System.assertNotEquals(null, withCodes[0].barcodeImage, 'Image travels through DTO');
    }

    @IsTest
    static void testUpdateBarcodeData_Errors() {
        Boolean threwMissingId = false;
        try {
            BarcodeGeneratorController.updateBarcodeData(null, 'img', 'L');
        } catch (AuraHandledException e) {
            threwMissingId = e.getMessage().contains('Order Item Id is required');
        }
        System.assertEquals(true, threwMissingId, 'Should enforce required id');

        Boolean threwMissingImg = false;
        try {
            BarcodeGeneratorController.updateBarcodeData(oi2.Id, null, 'L');
        } catch (AuraHandledException e) {
            threwMissingImg = e.getMessage().contains('Barcode image data is required');
        }
        System.assertEquals(true, threwMissingImg, 'Should enforce required image');
    }
}
