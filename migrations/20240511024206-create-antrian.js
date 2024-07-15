'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Antrians', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      instansi_id: {
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      userinfo_id: {
        type: Sequelize.INTEGER
      },
      qrcode: {
        type: Sequelize.STRING,
      },
      audio: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // await queryInterface.addConstraint('Antrians', {
    //   fields: ['layanan_id'],
    //   type: 'foreign key',
    //   name: 'custom_fkey_layanan_id2',
    //   references: {
    //     table: 'Layanans',
    //     schema: 'dbmpp',
    //     field: 'id'
    //   }
    // });

    // await queryInterface.addConstraint('Antrians', {
    //   fields: ['instansi_id'],
    //   type: 'foreign key',
    //   name: 'custom_fkey_instansi_id2',
    //   references: {
    //     table: 'Instansis',
    //     schema: 'dbmpp',
    //     field: 'id'
    //   }
    // });

    // await queryInterface.addConstraint('Antrians', {
    //   fields: ['userinfo_id'],
    //   type: 'foreign key',
    //   name: 'custom_fkey_userinfo_id2',
    //   references: {
    //     table: 'Userinfos',
    //     schema: 'dbmpp',
    //     field: 'id'
    //   }
    // });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Antrians');
  }
};