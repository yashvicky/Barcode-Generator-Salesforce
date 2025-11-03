@isTest
private class BarcodeGeneratorV2ControllerTest {
    
    @TestSetup
    static void setupTestData() {
        Account testAccount = new Account(Name = 'Test Company');
        insert testAccount;
        
        Order testOrder = new Order(
            AccountId = testAccount.Id,
            EffectiveDate = Date.today(),
            Status = 'Activated'
        );
        insert testOrder;
        
        Product2 testProduct = new Product2(
            Name = 'Test Product',
            IsActive = true
        );
        insert testProduct;
        
        Id pricebookId = Test.getStandardPricebookId();
        
        PricebookEntry pbe = new PricebookEntry(
            Pricebook2Id = pricebookId,
            Product2Id = testProduct.Id,
            UnitPrice = 100.00,
            IsActive = true
        );
        insert pbe;
        
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
    static void testSaveOrderBarcode() {
        Order testOrder = [SELECT Id FROM Order LIMIT 1];
        
        Test.startTest();
        BarcodeGeneratorV2Controller.saveOrderBarcode(testOrder.Id, 'ORDER-00001');
        Test.stopTest();
        
        Order updatedOrder = [SELECT Order_Barcode__c FROM Order WHERE Id = :testOrder.Id];
        System.assertEquals('ORDER-00001', updatedOrder.Order_Barcode__c);
    }
    
    @isTest
    static void testGetOrderProducts() {
        Order testOrder = [SELECT Id FROM Order LIMIT 1];
        
        Test.startTest();
        List<OrderItem> products = BarcodeGeneratorV2Controller.getOrderProducts(testOrder.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, products);
        System.assertEquals(1, products.size());
        System.assertEquals('Test Product', products[0].Product2.Name);
    }
}
```

**Save the file:** `Ctrl + S`

---

## **STEP 4: VERIFY FILES IN VS CODE**

**You should now have 4 files:**
```
force-app/main/default/classes/
├── BarcodeGeneratorV2Controller.cls          ✅
├── BarcodeGeneratorV2Controller.cls-meta.xml ✅
├── BarcodeGeneratorV2ControllerTest.cls      ✅
└── BarcodeGeneratorV2ControllerTest.cls-meta.xml ✅