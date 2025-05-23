const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // User reference
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },

  // NFC Tag information
  nfcTagId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique identifier from the NFC tag'
  },

  // GPS coordinates
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    validate: {
      min: -90,
      max: 90,
      isDecimal: true
    }
  },

  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    validate: {
      min: -180,
      max: 180,
      isDecimal: true
    }
  },

  // Location details
  locationName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Human-readable location name'
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User description of the visit'
  },

  // Visit metadata
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the visit occurred'
  },

  // Verification and integrity
  visitHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'SHA-256 hash of visit data for integrity verification'
  },

  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether the visit has been verified for NFT minting'
  },

  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the visit was verified'
  },

  // IPFS storage
  ipfsCid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'IPFS Content Identifier for stored visit data'
  },

  ipnsKey: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'IPNS key for updatable content'
  },

  // Semantic analysis
  semanticVector: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Vector representation for semantic similarity search'
  },

  // Visit context
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'GPS accuracy in meters'
  },

  altitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Altitude in meters'
  },

  speed: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Speed at time of visit in m/s'
  },

  heading: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Compass heading in degrees'
  },

  // Device information
  deviceInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Device and browser information'
  },

  // Visit validation
  validationData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional validation information'
  },

  // Visit status
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'flagged'),
    defaultValue: 'pending',
    allowNull: false
  },

  // Admin notes
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Administrative notes about this visit'
  },

  // Creation and update timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },

  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  // Model options
  tableName: 'visits',
  timestamps: true,

  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['nfcTagId']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['isVerified']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['visitHash']
    },
    {
      fields: ['latitude', 'longitude']
    },
    {
      fields: ['locationName']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['ipfsCid']
    },
    // Composite indexes for common queries
    {
      fields: ['userId', 'timestamp']
    },
    {
      fields: ['userId', 'isVerified']
    },
    {
      fields: ['nfcTagId', 'timestamp']
    }
  ],

  // Hooks
  hooks: {
    beforeCreate: async (visit) => {
      // Generate visit hash if not provided
      if (!visit.visitHash) {
        const { hashUtils } = require('../utils/hashUtils');
        visit.visitHash = hashUtils.createVisitHash({
          userId: visit.userId,
          nfcTagId: visit.nfcTagId,
          latitude: visit.latitude,
          longitude: visit.longitude,
          timestamp: visit.timestamp
        });
      }
    }
  },

  // Scopes
  scopes: {
    verified: {
      where: {
        isVerified: true
      }
    },

    pending: {
      where: {
        status: 'pending'
      }
    },

    recent: {
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
        }
      }
    },

    byLocation: (nfcTagId) => ({
      where: {
        nfcTagId: nfcTagId
      }
    }),

    withinRadius: (lat, lng, radiusKm) => {
      // Using Haversine formula approximation
      const latRad = lat * Math.PI / 180;
      const degreeDistance = radiusKm / 111.12; // Approximate km per degree
      
      return {
        where: {
          latitude: {
            [sequelize.Sequelize.Op.between]: [lat - degreeDistance, lat + degreeDistance]
          },
          longitude: {
            [sequelize.Sequelize.Op.between]: [
              lng - degreeDistance / Math.cos(latRad),
              lng + degreeDistance / Math.cos(latRad)
            ]
          }
        }
      };
    }
  }
});

// Instance methods
Visit.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    nfcTagId: this.nfcTagId,
    latitude: parseFloat(this.latitude),
    longitude: parseFloat(this.longitude),
    locationName: this.locationName,
    description: this.description,
    timestamp: this.timestamp,
    isVerified: this.isVerified,
    status: this.status,
    createdAt: this.createdAt
  };
};

Visit.prototype.calculateDistance = function(targetLat, targetLng) {
  const geolib = require('geolib');
  return geolib.getDistance(
    { latitude: this.latitude, longitude: this.longitude },
    { latitude: targetLat, longitude: targetLng }
  );
};

Visit.prototype.verifyIntegrity = async function() {
  const { hashUtils } = require('../utils/hashUtils');
  
  const computedHash = hashUtils.createVisitHash({
    userId: this.userId,
    nfcTagId: this.nfcTagId,
    latitude: this.latitude,
    longitude: this.longitude,
    timestamp: this.timestamp
  });

  return computedHash === this.visitHash;
};

Visit.prototype.markAsVerified = async function() {
  return await this.update({
    isVerified: true,
    verifiedAt: new Date(),
    status: 'verified'
  });
};

Visit.prototype.getIPFSData = async function() {
  if (!this.ipfsCid) {
    return null;
  }

  const ipfsService = require('../services/ipfsService');
  return await ipfsService.getVisitData(this.ipfsCid);
};

// Class methods
Visit.findByLocationRadius = async function(lat, lng, radiusKm, options = {}) {
  const { Op } = sequelize.Sequelize;
  
  // Simple bounding box approximation
  const latRad = lat * Math.PI / 180;
  const degreeDistance = radiusKm / 111.12;
  
  return await this.findAll({
    where: {
      latitude: {
        [Op.between]: [lat - degreeDistance, lat + degreeDistance]
      },
      longitude: {
        [Op.between]: [
          lng - degreeDistance / Math.cos(latRad),
          lng + degreeDistance / Math.cos(latRad)
        ]
      },
      ...options.where
    },
    ...options
  });
};

Visit.findDuplicates = async function(userId, nfcTagId, timeWindowMinutes = 30) {
  const { Op } = sequelize.Sequelize;
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  return await this.findAll({
    where: {
      userId: userId,
      nfcTagId: nfcTagId,
      createdAt: {
        [Op.gte]: timeWindow
      }
    },
    order: [['createdAt', 'DESC']]
  });
};

Visit.getLocationStats = async function(nfcTagId) {
  const { fn, col } = sequelize;

  return await this.findAll({
    where: { nfcTagId },
    attributes: [
      [fn('COUNT', col('id')), 'totalVisits'],
      [fn('COUNT', fn('DISTINCT', col('userId'))), 'uniqueVisitors'],
      [fn('MIN', col('createdAt')), 'firstVisit'],
      [fn('MAX', col('createdAt')), 'lastVisit']
    ],
    raw: true
  });
};

Visit.getUserLocationHistory = async function(userId, limit = 50) {
  return await this.findAll({
    where: { userId },
    order: [['timestamp', 'DESC']],
    limit: limit,
    attributes: { exclude: ['semanticVector', 'deviceInfo', 'validationData'] }
  });
};

// Associations
Visit.associate = function(models) {
  // Visit belongs to User
  Visit.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });

  // Visit has one Badge
  Visit.hasOne(models.Badge, {
    foreignKey: 'visitId',
    as: 'badge',
    onDelete: 'SET NULL'
  });
};

module.exports = Visit;