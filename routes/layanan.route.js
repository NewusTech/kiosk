const layananController = require('../controllers/layanan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/layanan/', layananController.fetchData);
route.get('/layanan/get', layananController.getLayananFromJson);
route.get('/layanan/get/:id', layananController.getLayananFromJsonById); 

module.exports = route;