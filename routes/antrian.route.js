const antrianController = require('../controllers/antrian.controller');

const express = require('express');
const route = express.Router();

route.post('/antrian/create', antrianController.createantrian);
route.post('/antrian/createfrombarcode', antrianController.createAntrianFromQRCode);
route.get('/antrian/get/:iddinas', antrianController.getantrian); 
// route.delete('/antrian/delete', [mid.checkRolesAndLogout(['Admin Instansi'])], antrianController.deleteantrian);

route.get('/panggilantrian/get/:iddinas', antrianController.panggilAntrianBerikutnya); 

route.get('/dashboard_antrian/:iddinas', antrianController.dashadmin_antrian);
route.get('/antrian/count', antrianController.getcountantrian); 
route.get('/antrian/check/:iddinas', antrianController.checkantrian); 

module.exports = route;