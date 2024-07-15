const { response } = require('../helpers/response.formatter');

const { Antrian, sequelize } = require('../models');

const tts = require('google-tts-api');
const axios = require('axios');
const Validator = require("fastest-validator");
const v = new Validator();
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { generatePagination } = require('../pagination/pagination');

const { Sequelize, Op } = require('sequelize');

function numberToAlphabeticCode(number) {
    let code = '';
    while (number > 0) {
        let remainder = (number - 1) % 26;
        code = String.fromCharCode(65 + remainder) + code;
        number = Math.floor((number - 1) / 26);
    }
    return code;
}

module.exports = {

    // membuat antrian OFFLINE
    createantrian: async (req, res) => {
        try {
            const schema = {
                instansi_id: { type: "number" },
                layanan_id: { type: "number" },
            };

            // Mendapatkan tanggal hari ini
            const today = new Date().toISOString().split('T')[0];

            const existingAntrian = await Antrian.findAll({
                where: {
                    instansi_id: req.body.instansi_id,
                    createdAt: {
                        [Sequelize.Op.gte]: new Date(today)
                    }
                }
            });

            const newNumber = existingAntrian.length + 1;
            const instansiCode = numberToAlphabeticCode(req.body.instansi_id);
            const codeBooking = `${instansiCode}${String(newNumber).padStart(3, '0')}`;

            const antrianCreateObj = {
                code: codeBooking,
                instansi_id: Number(req.body.instansi_id),
                layanan_id: Number(req.body.layanan_id),
                status: 0
            };

            const validate = v.validate(antrianCreateObj, schema);
            if (validate.length > 0) {
                return res.status(400).json({ status: 400, message: 'Validation failed', errors: validate });
            }

            const newAntrian = await Antrian.create(antrianCreateObj);

            res.status(201).json({ status: 201, message: 'Antrian created successfully', data: newAntrian });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    createAntrianFromQRCode: async (req, res) => {
        try {
            const { qr_code } = req.body;

            if (!qr_code) {
                return res.status(400).json({ status: 400, message: 'QR code is required' });
            }

            // Mengurai data dari QR code
            const qrCodeData = JSON.parse(Buffer.from(qr_code, 'base64').toString('utf8'));

            const { instansi_id, layanan_id, userinfo_id } = qrCodeData;

            // Mendapatkan tanggal hari ini
            const today = new Date().toISOString().split('T')[0];

            // const instansi = await Instansi.findByPk(instansi_id);
            // if (!instansi) {
            //     return res.status(404).json({ status: 404, message: 'Instansi not found' });
            // }

            const existingAntrian = await Antrian.findAll({
                where: {
                    instansi_id,
                    createdAt: {
                        [Sequelize.Op.gte]: new Date(today)
                    }
                }
            });

            const newNumber = existingAntrian.length + 1;
            const instansiCode = numberToAlphabeticCode(instansi_id);
            const codeBooking = `${instansiCode}${String(newNumber).padStart(3, '0')}`;

            const antrianCreateObj = {
                code: codeBooking,
                instansi_id,
                layanan_id,
                userinfo_id,
                status: 0
            };

            const newAntrian = await Antrian.create(antrianCreateObj);

            res.status(201).json({ status: 201, message: 'Antrian created successfully from QR code', data: newAntrian });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    panggilAntrianBerikutnya: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { iddinas } = req.params;

            console.log("ibab")

            // Cari antrian berikutnya yang belum dipanggil (statusnya false)
            const antrianBerikutnya = await Antrian.findOne({
                where: {
                    status: false,
                    instansi_id: iddinas
                },
                order: [
                    ['createdAt', 'ASC']
                ],
                transaction
            });

            // console.log("apa", antrianBerikutnya)

            if (!antrianBerikutnya) {
                await transaction.rollback();
                return res.status(404).json({ status: 404, message: 'Tidak ada antrian yang tersedia' });
            }

            // Update status antrian menjadi true (sudah dipanggil)
            antrianBerikutnya.status = true;
            await antrianBerikutnya.save({ transaction });

            // Generate suara panggilan antrian
            const panggilanAntrian = `Antrian ${antrianBerikutnya.code}, silahkan ke loket.`;
            const languageCode = 'id';

            // Fungsi untuk konversi teks menjadi suara
            const generateAndSaveAudio = async (text, language, publicId) => {
                try {
                    const url = await tts.getAudioUrl(text, {
                        lang: language || 'id',
                        slow: false,
                        host: 'https://translate.google.com',
                    });

                    const response = await axios({
                        url,
                        method: 'GET',
                        responseType: 'stream'
                    });

                    return new Promise((resolve, reject) => {
                        const filePath = path.join(__dirname, '../public/antrian_audio', `${publicId}.mp3`);
                        const writer = fs.createWriteStream(filePath);

                        response.data.pipe(writer);

                        writer.on('finish', () => resolve(`/public/antrian_audio/${publicId}.mp3`));
                        writer.on('error', reject);
                    });
                } catch (error) {
                    console.error('Error converting text to speech:', error);
                    throw error;
                }
            };

            const now = new Date();
            const datetime = now.toISOString().replace(/[-:.]/g, ''); // Format: YYYYMMDDTHHMMSS

            const audioUrl = await generateAndSaveAudio(panggilanAntrian, languageCode, `antrian_${antrianBerikutnya.code}_${datetime}`);

            antrianBerikutnya.audio = audioUrl;
            await antrianBerikutnya.save({ transaction });

            await transaction.commit();

            res.status(200).json(response(200, 'Panggilan antrian berhasil', antrianBerikutnya));

        } catch (err) {
            await transaction.rollback();
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    getantrian: async (req, res) => {
        try {
            const { iddinas } = req.params;
            const { startdatefilter, enddatefilter, today } = req.query;

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            let antrianHariIni;
            let totalCount;

            // Read instansi data from JSON file
            const instansiData = JSON.parse(fs.readFileSync('public/data/instansi.json', 'utf8'));

            // Validate if instansi (dinas) exists
            const instansi = instansiData.data.find(inst => inst.id === parseInt(iddinas));
            if (!instansi) {
                return res.status(404).json({ status: 404, message: 'Instansi not found' });
            }

            const whereClause = {};

            if (startdatefilter && enddatefilter) {
                whereClause.createdAt = {
                    [Op.between]: [
                        new Date(startdatefilter),
                        new Date(new Date(enddatefilter).setHours(23, 59, 59, 999))
                    ]
                };
            } else if (startdatefilter) {
                whereClause.createdAt = { [Op.gte]: new Date(startdatefilter) };
            } else if (enddatefilter) {
                whereClause.createdAt = { [Op.lte]: new Date(new Date(enddatefilter).setHours(23, 59, 59, 999)) };
            }

            if (iddinas) {
                whereClause.instansi_id = iddinas;
            }

            if (today) {
                whereClause.createdAt = { [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()] }
            }

            [antrianHariIni, totalCount] = await Promise.all([
                Antrian.findAll({
                    where: whereClause,
                    limit: limit,
                    offset: offset
                }),
                Antrian.count(
                    {
                        where: whereClause,
                    }
                )
            ]);

            const pagination = generatePagination(totalCount, page, limit, `/antrian/get/${iddinas}`);

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: antrianHariIni,
                pagination: pagination
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    dashadmin_antrian: async (req, res) => {
        try {
            const { iddinas } = req.params;

            let permohonanan_bulan = null;
            try {
                const response = await axios.get(process.env.BASE_URLSERVER + `/user/layananform/getperbulan/${iddinas}`);
                permohonanan_bulan = response?.data?.data?.monthlyAntrianCounts;
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.error('Data not found for the specified iddinas:', iddinas);
                } else {
                    throw error; // Re-throw the error if it is not a 404
                }
            }

            const currentYear = moment().year();

            const monthlyPromises = [];

            for (let month = 0; month < 12; month++) {
                const startOfMonth = moment().year(currentYear).month(month).startOf('month').toDate();
                const endOfMonth = moment().year(currentYear).month(month).endOf('month').toDate();
                monthlyPromises.push(
                    Antrian.count({
                        where: {
                            createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                            instansi_id: iddinas
                        }
                    })
                );
            }

            const [AntrianCount, AntrianProsesCount, AntrianNextCount, monthlyCounts] = await Promise.all([
                Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()] },
                        instansi_id: iddinas
                    }
                }),
                Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()] },
                        status: false,
                        instansi_id: iddinas
                    }
                }),
                Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()] },
                        status: true,
                        instansi_id: iddinas
                    }
                }),
                Promise.all(monthlyPromises)
            ]);

            const monthlyAntrianCounts = {};
            for (let month = 0; month < 12; month++) {
                monthlyAntrianCounts[moment().month(month).format('MMMM')] = monthlyCounts[month];
            }

            const data = {
                AntrianCount,
                AntrianProsesCount,
                AntrianNextCount,
                monthlyAntrianCounts,
                permohonanan_bulan
            };

            res.status(200).json({
                status: 200,
                message: permohonanan_bulan ? 'success get' : 'Data permohonan online gagal didapatkan',
                data
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    getcountantrian: async (req, res) => {
        try {

            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
            const count_antrian = await Antrian.count({
                where: {
                    createdAt: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                }
            });

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: count_antrian
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    checkantrian: async (req, res) => {
        try {

            const { iddinas } = req.params;

            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
            const [AntrianCount, AntrianNumber, AntrianClear] = await Promise.all([
                Antrian.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startOfDay, endOfDay]
                        },
                        instansi_id: iddinas
                    }
                }),
                Antrian.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startOfDay, endOfDay]
                        },
                        instansi_id: iddinas,
                        status: true
                    }
                }),
                Antrian.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startOfDay, endOfDay]
                        },
                        instansi_id: iddinas,
                        status: true
                    }
                })
            ]);

            const data = {
                AntrianCount,
                AntrianNumber: AntrianNumber + 1,
                AntrianClear
            };
          
            res.status(200).json({
                status: 200,
                message: 'success get',
                data
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },
}