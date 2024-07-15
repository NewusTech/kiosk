const baseConfig =  require('./config/base.config');

const path = require('path');
const express = require('express')
const cors = require('cors');
const error = require('./errorHandler/errorHandler')

const app = express();
const port = 3001;
const urlApi = "/api";

app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//memanggil route pada routes\api.route.js
require('./routes/api.route')(app,urlApi);
app.use(error)

app.use('/public', express.static(path.join(__dirname, 'public')));

//listen
app.listen(port, () => {
    console.log(`server is running on port ${port} and url ${baseConfig.base_url}`);
});