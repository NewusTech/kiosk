const bukutamuController = require('../controllers/bukutamu.controller');

const express = require('express');
const route = express.Router();

route.post('/bukutamu/create', bukutamuController.createbukutamu);
route.get('/bukutamu/get', bukutamuController.getbukutamu);
route.get('/bukutamu/get/:id', bukutamuController.getBukutamuByid);

module.exports = route;