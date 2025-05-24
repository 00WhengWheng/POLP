'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      nfcTagId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Unique identifier from the NFC tag'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      locationName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Human-readable location name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User description of the visit'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the visit occurred'
      },
      visitHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 hash of visit data for integrity verification'
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the visit has been verified for NFT minting'
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the visit was verified'
      },
      ipfsCid: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'IPFS Content Identifier for stored visit data'
      },
      ipnsKey: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'IPNS key for updatable content'
      },
      semanticVector: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Vector representation for semantic similarity search'
      },
      accuracy: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'GPS accuracy in meters'
      },
      altitude: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Altitude in meters'
      },
      speed: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Speed at time of visit in m/s'
      },
      heading: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Compass heading in degrees'
      },
      deviceInfo: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Device and browser information'
      },
      validationData: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional validation information'
      },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected', 'flagged'),
        allowNull: false,
        defaultValue: 'pending'
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Administrative notes about this visit'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Indici
    await queryInterface.addIndex('visits', ['userId']);
    await queryInterface.addIndex('visits', ['nfcTagId']);
    await queryInterface.addIndex('visits', ['timestamp']);
    await queryInterface.addIndex('visits', ['isVerified']);
    await queryInterface.addIndex('visits', ['status']);
    await queryInterface.addIndex('visits', ['visitHash'], { unique: true });
    await queryInterface.addIndex('visits', ['latitude', 'longitude']);
    await queryInterface.addIndex('visits', ['locationName']);
    await queryInterface.addIndex('visits', ['createdAt']);
    await queryInterface.addIndex('visits', ['ipfsCid']);
    await queryInterface.addIndex('visits', ['userId', 'timestamp']);
    await queryInterface.addIndex('visits', ['userId', 'isVerified']);
    await queryInterface.addIndex('visits', ['nfcTagId', 'timestamp']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visits');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_visits_status"');
  }
};