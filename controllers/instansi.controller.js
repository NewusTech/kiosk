const axios = require('axios');
const Validator = require("fastest-validator");
const v = new Validator();
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const pipeline = promisify(stream.pipeline);

module.exports = {
    fetchData: async (req, res) => {
        try {
            const response = await axios.get(process.env.BASE_URLSERVER + '/user/instansi/get?limit=1000');
            const data = response.data;

            // Pastikan direktori images ada
            if (!fs.existsSync('public/images/instansi')) {
                fs.mkdirSync('public/images/instansi', { recursive: true }); // Tambahkan opsi recursive
            }

            if (!fs.existsSync('public/data')) {
                fs.mkdirSync('public/data', { recursive: true }); // Tambahkan opsi recursive
            }

            // Download dan simpan setiap gambar
            for (let instansi of data.data) {
                const imageUrl = instansi.image;

                if (imageUrl) {
                    const imageFileName = `public/images/instansi/${imageUrl.split('/').pop()}`;

                    try {
                        const writer = fs.createWriteStream(imageFileName);
                        const imageResponse = await axios({
                            url: imageUrl,
                            method: 'GET',
                            responseType: 'stream'
                        });

                        await pipeline(imageResponse.data, writer);

                        instansi.image = imageFileName;
                    } catch (error) {
                        console.error(`Error downloading image from ${imageUrl}: ${error.message}`);
                        // Hapus atau biarkan kosong field image untuk menunjukkan bahwa gambar tidak dapat diunduh
                        delete instansi.image; // Hapus field image jika tidak dapat diunduh
                    }
                } else {
                    delete instansi.image; // Hapus field image jika tidak ada URL gambar
                }
            }

            fs.writeFileSync('public/data/instansi.json', JSON.stringify(data, null, 2));
            res.status(200).send('Data dan gambar telah disimpan secara lokal.');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error fetching data.');
        }
    },

    getFromJson: async (req, res) => {
        fs.readFile('public/data/instansi.json', 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error load data.');
            }
            let jsonData = JSON.parse(data);
    
            const baseUrl = process.env.BASE_URL + '/';
    
            // Perbarui jalur gambar ke URL lengkap
            jsonData.data.forEach(instansi => {
                if (instansi.image) {
                    instansi.image = baseUrl + instansi.image;
                }
                // Hapus field image jika tidak ada
                if (!instansi.image) {
                    delete instansi.image;
                }
            });
    
            // Ambil parameter query `search`
            const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    
            // Filter data instansi berdasarkan parameter `search`
            if (searchQuery) {
                jsonData.data = jsonData.data.filter(instansi =>
                    instansi.name.toLowerCase().includes(searchQuery)
                );
            }
    
            res.json(jsonData);
        });
    }
}
