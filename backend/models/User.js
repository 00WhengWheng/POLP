const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  walletAddress: {
    type: DataTypes.STRING(42),
    allowNull: false,
    unique: true,
    validate: {
      isEthereumAddress(value) {
        const { ethers } = require('ethers');
        if (!ethers.isAddress(value)) {
          throw new Error('Invalid Ethereum address format');
        }
      }
    },
    set(value) {
      // Always store addresses in lowercase for consistency
      this.setDataValue('walletAddress', value.toLowerCase());
    }
  },

  username: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true,
    validate: {
      len: [3, 30],
      isAlphanumeric: {
        args: true,
        msg: 'Username can only contain letters, numbers, underscores, and hyphens'
      }
    }
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },

  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Profile information
  profileData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional profile information stored as JSON'
  },

  // Privacy settings
  privacySettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      showPublicProfile: true,
      showVisitHistory: false,
      showBadgeCollection: true
    }
  },

  // User preferences
  preferences: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      notifications: true,
      emailUpdates: false,
      language: 'en'
    }
  },

  // Statistics (computed fields)
  totalVisits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },

  totalBadges: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },

  // Reputation/ranking
  reputationScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },

  // Account verification
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },

  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'users',
  timestamps: true,
  
  indexes: [
    {
      unique: true,
      fields: ['walletAddress']
    },
    {
      unique: true,
      fields: ['username'],
      where: {
        username: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['lastLoginAt']
    },
    {
      fields: ['totalVisits']
    },
    {
      fields: ['totalBadges']
    },
    {
      fields: ['reputationScore']
    }
  ],

  // Hooks
  hooks: {
    beforeCreate: (user) => {
      // Ensure wallet address is lowercase
      if (user.walletAddress) {
        user.walletAddress = user.walletAddress.toLowerCase();
      }
    },

    beforeUpdate: (user) => {
      // Ensure wallet address is lowercase
      if (user.walletAddress) {
        user.walletAddress = user.walletAddress.toLowerCase();
      }
    }
  },

  // Scopes
  scopes: {
    active: {
      where: {
        isActive: true
      }
    },
    
    verified: {
      where: {
        isVerified: true
      }
    },

    withPublicProfile: {
      where: {
        'privacySettings.showPublicProfile': true
      }
    },

    recentlyActive: {
      where: {
        lastLoginAt: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      }
    }
  }
});

// Instance methods
User.prototype.toPublicJSON = function() {
  const publicData = {
    id: this.id,
    walletAddress: this.walletAddress,
    username: this.username,
    isVerified: this.isVerified,
    totalVisits: this.totalVisits,
    totalBadges: this.totalBadges,
    reputationScore: this.reputationScore,
    createdAt: this.createdAt
  };

  // Include additional fields based on privacy settings
  if (this.privacySettings?.showPublicProfile) {
    publicData.profileData = this.profileData;
  }

  return publicData;
};

User.prototype.updateStats = async function() {
  const Visit = require('./Visit');
  const Badge = require('./Badge');

  // Update visit count
  const visitCount = await Visit.count({
    where: { userId: this.id }
  });

  // Update badge count
  const badgeCount = await Badge.count({
    where: { userId: this.id }
  });

  // Calculate reputation score (simple algorithm)
  const reputationScore = (visitCount * 10) + (badgeCount * 50);

  // Update the user record
  await this.update({
    totalVisits: visitCount,
    totalBadges: badgeCount,
    reputationScore: reputationScore
  });

  return {
    totalVisits: visitCount,
    totalBadges: badgeCount,
    reputationScore: reputationScore
  };
};

User.prototype.getRecentActivity = async function(limit = 10) {
  const Visit = require('./Visit');
  const Badge = require('./Badge');

  const [recentVisits, recentBadges] = await Promise.all([
    Visit.findAll({
      where: { userId: this.id },
      order: [['createdAt', 'DESC']],
      limit: Math.floor(limit / 2),
      attributes: ['id', 'locationName', 'timestamp', 'createdAt']
    }),
    
    Badge.findAll({
      where: { userId: this.id },
      order: [['mintedAt', 'DESC']],
      limit: Math.floor(limit / 2),
      attributes: ['id', 'tokenId', 'badgeType', 'mintedAt']
    })
  ]);

  return {
    visits: recentVisits,
    badges: recentBadges
  };
};

// Class methods
User.findByWalletAddress = function(walletAddress) {
  return this.findOne({
    where: {
      walletAddress: walletAddress.toLowerCase()
    }
  });
};

User.getLeaderboard = function(limit = 10, orderBy = 'reputationScore') {
  const validOrderFields = ['reputationScore', 'totalVisits', 'totalBadges'];
  const orderField = validOrderFields.includes(orderBy) ? orderBy : 'reputationScore';

  return this.scope('active', 'withPublicProfile').findAll({
    order: [[orderField, 'DESC']],
    limit: limit,
    attributes: ['id', 'walletAddress', 'username', 'totalVisits', 'totalBadges', 'reputationScore', 'isVerified']
  });
};

User.getActiveUsersCount = function() {
  return this.count({
    where: {
      isActive: true,
      lastLoginAt: {
        [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    }
  });
};

// Associations will be defined in a separate associations file or during sync
User.associate = function(models) {
  // User has many Visits
  User.hasMany(models.Visit, {
    foreignKey: 'userId',
    as: 'visits',
    onDelete: 'CASCADE'
  });

  // User has many Badges
  User.hasMany(models.Badge, {
    foreignKey: 'userId',
    as: 'badges',
    onDelete: 'CASCADE'
  });
};

module.exports = User;