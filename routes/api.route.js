const antrianRoute = require('./antrian.route');
const instansiRoute = require('./instansi.route');
const layananRoute = require('./layanan.route');
const bukutamuRoute = require('./bukutamu.route');

module.exports = function (app, urlApi) {
    app.use(urlApi, antrianRoute);
    app.use(urlApi, instansiRoute);
    app.use(urlApi, layananRoute);
    app.use(urlApi, bukutamuRoute);
}