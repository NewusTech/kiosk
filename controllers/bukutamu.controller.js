const { response } = require('../helpers/response.formatter');

const { Bukutamu, sequelize } = require('../models');

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

    // membuat bukutamu OFFLINE
    createbukutamu: async (req, res) => {
        try {
            const schema = {
                name: { type: "string" },
                instansi_id: { type: "number" },
                pekerjaan: { type: "string", optional: true },
                alamat: { type: "string", optional: true },
                tujuan: { type: "string", optional: true },
                tanggal: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/, optional: true },
                waktu: { type: "string", optional: true },
            };

            const bukutamuCreateObj = {
                name: req.body.name,
                instansi_id: Number(req.body.instansi_id),
                pekerjaan: req.body.pekerjaan,
                alamat: req.body.alamat,
                tujuan: req.body.tujuan,
                tanggal: req.body.tanggal,
                waktu: req.body.waktu
            };

            const validate = v.validate(bukutamuCreateObj, schema);
            if (validate.length > 0) {
                return res.status(400).json({ status: 400, message: 'Validation failed', errors: validate });
            }

            const newBukutamu = await Bukutamu.create(bukutamuCreateObj);

            res.status(201).json({ status: 201, message: 'Bukutamu created successfully', data: newBukutamu });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'Internal server error', error: err });
        }
    },

    getbukutamu: async (req, res) => {
        try {
            const { instansi_id, start_date, end_date } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let BukutamuGets;
            let totalCount;

            const WhereClause = {};
            if (instansi_id) {
                WhereClause.instansi_id = instansi_id;
            }
            if (start_date && end_date) {
                WhereClause.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
            } else if (start_date) {
                WhereClause.createdAt = { [Op.gte]: new Date(start_date) };
            } else if (end_date) {
                WhereClause.createdAt = { [Op.lte]: new Date(end_date) };
            }

            [BukutamuGets, totalCount] = await Promise.all([
                Bukutamu.findAll({
                    where: WhereClause,
                    limit: limit,
                    offset: offset
                }),
                Bukutamu.count({
                    where: WhereClause,
                })
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/bukutamu/get');

            res.status(200).json({
                status: 200,
                message: 'success get Bukutamu',
                data: BukutamuGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    getBukutamuByid: async (req, res) => {
        try {
            //mendapatkan data Bukutamu berdasarkan id
            let BukutamuGet = await Bukutamu.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika Bukutamu tidak ada
            if (!BukutamuGet) {
                res.status(404).json(response(404, 'Bukutamu not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get Bukutamu by id', BukutamuGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

}