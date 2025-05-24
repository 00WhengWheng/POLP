/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // Create extensions
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  pgm.createExtension('postgis', { ifNotExists: true });
  pgm.createExtension('pg_trgm', { ifNotExists: true }); // For text search

  // Create users table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    wallet_address: { type: 'varchar(42)', notNull: true, unique: true },
    username: { type: 'varchar(30)', unique: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    last_login_at: { type: 'timestamp' },
    profile_data: { type: 'jsonb', default: '{}' },
    privacy_settings: { type: 'jsonb', default: '{"showPublicProfile": true, "showVisitHistory": false, "showBadgeCollection": true}' },
    preferences: { type: 'jsonb', default: '{"notifications": true, "emailUpdates": false, "language": "en"}' },
    total_visits: { type: 'integer', notNull: true, default: 0 },
    total_badges: { type: 'integer', notNull: true, default: 0 },
    reputation_score: { type: 'integer', notNull: true, default: 0 },
    is_verified: { type: 'boolean', notNull: true, default: false },
    verified_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  }, {
    ifNotExists: true,
    comment: 'Stores user account information'
  });

  // Create badges table with improved schema
  pgm.createTable('badges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users' },
    badge_type: { type: 'varchar(50)', notNull: true },
    token_id: { type: 'bigint' },
    metadata: { type: 'jsonb', default: '{}' },
    ipfs_hash: { type: 'text' },
    claimed: { type: 'boolean', notNull: true, default: false },
    claimed_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  }, {
    ifNotExists: true,
    comment: 'Stores badge information'
  });

  // Create visits table
  pgm.createTable('visits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'users' },
    nfc_tag_id: { type: 'text', notNull: true },
    location: { type: 'point', notNull: true },
    visit_time: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    metadata: { type: 'jsonb', default: '{}' },
    verified: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  }, {
    ifNotExists: true,
    comment: 'Stores visit records'
  });

  // Create indexes
  pgm.createIndex('users', 'wallet_address');
  pgm.createIndex('users', 'username');
  pgm.createIndex('users', ['is_active', 'is_verified']);
  pgm.createIndex('users', 'reputation_score');
  
  pgm.createIndex('badges', 'user_id');
  pgm.createIndex('badges', ['badge_type', 'claimed']);
  pgm.createIndex('badges', 'token_id');
  
  pgm.createIndex('visits', 'user_id');
  pgm.createIndex('visits', 'nfc_tag_id');
  pgm.createIndex('visits', 'visit_time');
  pgm.createIndex('visits', 'location', { method: 'gist' });

  // Add triggers for updating updated_at
  const tables = ['users', 'badges', 'visits'];
  tables.forEach(table => {
    pgm.createTrigger(table, 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      language: 'plpgsql',
      replace: true,
      function: `
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = current_timestamp;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `
    });
  });
};

exports.down = pgm => {
  // Drop tables in reverse order
  pgm.dropTable('visits', { cascade: true });
  pgm.dropTable('badges', { cascade: true });
  pgm.dropTable('users', { cascade: true });

  // Drop extensions
  pgm.dropExtension('pg_trgm');
  pgm.dropExtension('postgis');
  pgm.dropExtension('uuid-ossp');
};
