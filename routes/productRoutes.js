const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController.js');
router.get('/', controller.getProducts);

router.post('/', controller.addProduct);
router.get('/barcode/:barcode', controller.getProductByBarcode);
router.put('/:id/stock', controller.updateStock);
router.put('/:id/stockin', controller.stockIn);
router.put('/:id/stockout', controller.stockOut);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;
