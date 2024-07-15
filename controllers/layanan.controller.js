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
            const response = await axios.get(process.env.BASE_URLSERVER + '/user/layanan/get?limit=1000');
            const data = response.data;

            // Pastikan direktori images ada
            if (!fs.existsSync('public/images/layanan')) {
                fs.mkdirSync('public/images/layanan', { recursive: true }); // Tambahkan opsi recursive
            }

            if (!fs.existsSync('public/data')) {
                fs.mkdirSync('public/data', { recursive: true }); // Tambahkan opsi recursive
            }

            // Download dan simpan setiap gambar
            for (let layanan of data.data) {
                const imageUrl = layanan.image;

                if (imageUrl) {
                    const imageFileName = `public/images/layanan/${imageUrl.split('/').pop()}`;

                    try {
                        const writer = fs.createWriteStream(imageFileName);
                        const imageResponse = await axios({
                            url: imageUrl,
                            method: 'GET',
                            responseType: 'stream'
                        });

                        await pipeline(imageResponse.data, writer);

                        layanan.image = imageFileName;
                    } catch (error) {
                        console.error(`Error downloading image from ${imageUrl}: ${error.message}`);
                        // Hapus atau biarkan kosong field image untuk menunjukkan bahwa gambar tidak dapat diunduh
                        delete layanan.image; // Hapus field image jika tidak dapat diunduh
                    }
                } else {
                    delete layanan.image; // Hapus field image jika tidak ada URL gambar
                }
            }

            fs.writeFileSync('public/data/layanan.json', JSON.stringify(data, null, 2));
            res.status(200).send('Data dan gambar telah disimpan secara lokal.');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error fetching data.');
        }
    },

    getLayananFromJson: async (req, res) => {
        // Membaca file instansi.json
        let nourut = 1;
        fs.readFile(path.join('public', 'data', 'instansi.json'), 'utf8', (err, instansiData) => {
            if (err) {
                return res.status(500).send('Error loading data.');
            }
            const instansiJson = JSON.parse(instansiData);
            const { instansi_id, search } = req.query; // Ambil nilai instansi_id dan search dari query parameter

            // Cari instansi berdasarkan instansi_id jika diberikan
            let instansi = instansiJson.data.find(instansi => instansi.id == instansi_id);

            if (!instansi_id || !instansi) {
                return res.status(404).send('Instansi not found.');
            }

            fs.readFile(path.join('public', 'data', 'layanan.json'), 'utf8', (err, layananData) => {
                if (err) {
                    return res.status(500).send('Error loading data.');
                }
                const layananJson = JSON.parse(layananData);

                // Filter layanan berdasarkan instansi_id
                let filteredLayanan = layananJson.data.filter(layanan => layanan.instansi_id == instansi_id);

                // Jika ada query parameter 'search', filter layanan berdasarkan nama
                if (search) {
                    const searchLower = search.toLowerCase();
                    filteredLayanan = filteredLayanan.filter(layanan => layanan.name.toLowerCase().includes(searchLower));
                }

                // Perbarui jalur gambar ke URL lengkap
                filteredLayanan.forEach(layanan => {
                    layanan.nomor = nourut++;
                    if (layanan.image) {
                        layanan.image = process.env.BASE_URL + '/' + layanan.image;
                    }
                    // Hapus field image jika tidak ada
                    if (!layanan.image) {
                        delete layanan.image;
                    }
                });

                const data = {
                    instansi: instansi,
                    layanan: filteredLayanan
                };

                const responseData = {
                    status: 200,
                    message: 'success get instansi and layanan',
                    data: data,
                    pagination: layananJson.pagination // Memasukkan informasi paginasi dari layanan.json
                };

                res.json(responseData);
            });
        });
    },

    getLayananFromJsonById: async (req, res) => {
        fs.readFile('public/data/layanan.json', 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error loading data.');
            }

            const jsonData = JSON.parse(data);
            const baseUrl = process.env.BASE_URL + '/';
            const { id } = req.params; // Ambil nilai id dari parameter URL

            // Temukan data layanan berdasarkan id jika diberikan
            let layanan = null;
            if (id) {
                layanan = jsonData.data.find(layanan => layanan.id == id);
            }

            if (layanan) {
                // Perbarui jalur gambar ke URL lengkap
                if (layanan.image) {
                    layanan.image = baseUrl + layanan.image;
                } else {
                    // Hapus field image jika tidak ada
                    delete layanan.image;
                }

                res.json(layanan);
            } else {
                res.status(404).send('Layanan not found.');
            }
        });
    }

}
