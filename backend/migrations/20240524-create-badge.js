const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Badge = sequelize.define('Badge', {
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

  // Visit reference
  visitId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'visits',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },

  // NFT token information
  tokenId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Blockchain token ID'
  },

  badgeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Badge category ID used in smart contract'
  },

  badgeType: {
    type: DataTypes.ENUM('location', 'achievement', 'special', 'milestone'),
    defaultValue: 'location',
    allowNull: false,
    comment: 'Type of badge earned'
  },

  // Blockchain information
  contractAddress: {
    type: DataTypes.STRING(42),
    allowNull: false,
    comment: 'Smart contract address'
  },

  txHash: {
    type: DataTypes.STRING(66),
    allowNull: false,
    unique: true,
    comment: 'Transaction hash of the minting transaction'
  },

  blockNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Block number where the transaction was mined'
  },

  // Metadata
  metadataUri: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'IPFS URI for NFT metadata'
  },

  ipfsCid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'IPFS Content Identifier for metadata'
  },

  // Badge properties
  name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Badge display name'
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Badge description'
  },

  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Badge image URL (IPFS or external)'
  },

  // Badge attributes
  attributes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'NFT attributes array'
  },

  properties: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional badge properties'
  },

  // Rarity and value
  rarity: {
    type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
    defaultValue: 'common',
    allowNull: false
  },

  rarityScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Computed rarity score'
  },

  // Transfer information
  transferHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of transfer events'
  },

  transferredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last transfer timestamp'
  },

  // Badge status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether the badge is active/visible'
  },

  isBurned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether the badge has been burned'
  },

  burnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the badge was burned'
  },

  // Timestamps
  mintedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the badge was minted'
  },

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
  tableName: 'badges',
  timestamps: true,

  indexes: [
    {
      unique: true,
      fields: ['tokenId']
    },
    {
      unique: true,
      fields: ['txHash']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['visitId']
    },
    {
      fields: ['badgeId']
    },
    {
      fields: ['badgeType']
    },
    {
      fields: ['contractAddress']
    },
    {
      fields: ['rarity']
    },
    {
      fields: ['rarityScore']
    },
    {
      fields: ['mintedAt']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isBurned']
    },
    // Composite indexes for common queries
    {
      fields: ['userId', 'badgeType']
    },
    {
      fields: ['userId', 'mintedAt']
    },
    {
      fields: ['badgeId', 'userId']
    },
    {
      fields: ['contractAddress', 'tokenId']
    }
  ],

  // Hooks
  hooks: {
    beforeCreate: async (badge) => {
      // Calculate rarity score
      badge.rarityScore = Badge.calculateRarityScore(badge);
    },

    afterCreate: async (badge) => {
      // Update user badge count
      const User = require('./User');
      const user = await User.findByPk(badge.userId);
      if (user) {
        await user.increment('totalBadges');
      }
    },

    afterDestroy: async (badge) => {
      // Update user badge count
      const User = require('./User');
      const user = await User.findByPk(badge.userId);
      if (user) {
        await user.decrement('totalBadges');
      }
    }
  },

  // Scopes
  scopes: {
    active: {
      where: {
        isActive: true,
        isBurned: false
      }
    },

    byType: (badgeType) => ({
      where: {
        badgeType: badgeType
      }
    }),

    byRarity: (rarity) => ({
      where: {
        rarity: rarity
      }
    }),

    recent: {
      where: {
        mintedAt: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      }
    },

    transferred: {
      where: {
        transferredAt: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  }
});

// Instance methods
Badge.prototype.toPublicJSON = function() {
  return {
    id: this.id,
    tokenId: this.tokenId,
    badgeType: this.badgeType,
    name: this.name,
    description: this.description,
    imageUrl: this.imageUrl,
    attributes: this.attributes,
    rarity: this.rarity,
    rarityScore: this.rarityScore,
    mintedAt: this.mintedAt,
    isActive: this.isActive,
    contractAddress: this.contractAddress,
    metadataUri: this.metadataUri
  };
};

Badge.prototype.getMetadata = async function() {
  if (!this.ipfsCid) {
    return null;
  }

  const ipfsService = require('../services/ipfsService');
  return await ipfsService.getMetadata(this.ipfsCid);
};

Badge.prototype.addTransferEvent = async function(fromAddress, toAddress, txHash) {
  const transferEvent = {
    from: fromAddress,
    to: toAddress,
    txHash: txHash,
    timestamp: new Date().toISOString(),
    blockNumber: null // Could be filled in later
  };

  const currentHistory = this.transferHistory || [];
  currentHistory.push(transferEvent);

  return await this.update({
    transferHistory: currentHistory,
    transferredAt: new Date()
  });
};

Badge.prototype.burn = async function() {
  return await this.update({
    isBurned: true,
    burnedAt: new Date(),
    isActive: false
  });
};

Badge.prototype.getOwnershipHistory = function() {
  const history = this.transferHistory || [];
  return history.map(event => ({
    from: event.from,
    to: event.to,
    timestamp: event.timestamp,
    txHash: event.txHash
  }));
};

// Class methods
Badge.calculateRarityScore = function(badge) {
  let score = 0;

  // Base score by badge type
  const typeScores = {
    'location': 10,
    'achievement': 25,
    'special': 50,
    'milestone': 100
  };
  score += typeScores[badge.badgeType] || 10;

  // Rarity multiplier
  const rarityMultipliers = {
    'common': 1,
    'uncommon': 2,
    'rare': 5,
    'epic': 10,
    'legendary': 25
  };
  score *= rarityMultipliers[badge.rarity] || 1;

  return score;
};

Badge.findByTokenId = function(tokenId) {
  return this.findOne({
    where: { tokenId }
  });
};

Badge.findByTxHash = function(txHash) {
  return this.findOne({
    where: { txHash }
  });
};

Badge.getCollectionStats = async function() {
  const { fn, col } = sequelize;

  const stats = await this.findAll({
    attributes: [
      [fn('COUNT', col('id')), 'totalBadges'],
      [fn('COUNT', fn('DISTINCT', col('userId'))), 'uniqueHolders'],
      [fn('COUNT', fn('DISTINCT', col('badgeType'))), 'badgeTypes'],
      [fn('AVG', col('rarityScore')), 'avgRarityScore']
    ],
    where: {
      isActive: true,
      isBurned: false
    },
    raw: true
  });

  const rarityDistribution = await this.findAll({
    attributes: [
      'rarity',
      [fn('COUNT', col('id')), 'count']
    ],
    where: {
      isActive: true,
      isBurned: false
    },
    group: ['rarity'],
    raw: true
  });

  const typeDistribution = await this.findAll({
    attributes: [
      'badgeType',
      [fn('COUNT', col('id')), 'count']
    ],
    where: {
      isActive: true,
      isBurned: false
    },
    group: ['badgeType'],
    raw: true
  });

  return {
    ...stats[0],
    rarityDistribution: rarityDistribution.reduce((acc, item) => {
      acc[item.rarity] = parseInt(item.count);
      return acc;
    }, {}),
    typeDistribution: typeDistribution.reduce((acc, item) => {
      acc[item.badgeType] = parseInt(item.count);
      return acc;
    }, {})
  };
};

Badge.getLeaderboard = async function(limit = 10, orderBy = 'totalRarityScore') {
  const { fn, col } = sequelize;

  if (orderBy === 'totalRarityScore') {
    return await this.findAll({
      attributes: [
        'userId',
        [fn('SUM', col('rarityScore')), 'totalRarityScore'],
        [fn('COUNT', col('id')), 'badgeCount']
      ],
      where: {
        isActive: true,
        isBurned: false
      },
      group: ['userId'],
      order: [[fn('SUM', col('rarityScore')), 'DESC']],
      limit: limit,
      include: [{
        model: require('./User'),
        as: 'user',
        attributes: ['id', 'username', 'walletAddress']
      }]
    });
  }

  // Default to badge count
  return await this.findAll({
    attributes: [
      'userId',
      [fn('COUNT', col('id')), 'badgeCount'],
      [fn('SUM', col('rarityScore')), 'totalRarityScore']
    ],
    where: {
      isActive: true,
      isBurned: false
    },
    group: ['userId'],
    order: [[fn('COUNT', col('id')), 'DESC']],
    limit: limit,
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'walletAddress']
    }]
  });
};

Badge.findRareBadges = async function(minRarityScore = 100) {
  return await this.scope('active').findAll({
    where: {
      rarityScore: {
        [sequelize.Sequelize.Op.gte]: minRarityScore
      }
    },
    order: [['rarityScore', 'DESC']],
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'username', 'walletAddress']
    }, {
      model: require('./Visit'),
      as: 'visit',
      attributes: ['id', 'locationName', 'timestamp']
    }]
  });
};

// Associations
Badge.associate = function(models) {
  // Badge belongs to User
  Badge.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });

  // Badge belongs to Visit
  Badge.belongsTo(models.Visit, {
    foreignKey: 'visitId',
    as: 'visit',
    onDelete: 'CASCADE'
  });
};

module.exports = Badge;