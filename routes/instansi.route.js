const instansiController = require('../controllers/instansi.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/instansi/', instansiController.fetchData); 
route.get('/instansi/get', instansiController.getFromJson); 

module.exports = route;