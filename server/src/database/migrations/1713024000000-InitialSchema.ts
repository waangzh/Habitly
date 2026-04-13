import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1713024000000 implements MigrationInterface {
  name = 'InitialSchema1713024000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        openid VARCHAR(64) NOT NULL,
        unionid VARCHAR(64) NULL,
        status TINYINT NOT NULL DEFAULT 1,
        last_login_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_openid (openid),
        KEY idx_unionid (unionid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE user_profiles (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        nickname VARCHAR(50) NOT NULL DEFAULT 'Habitly 用户',
        avatar_url VARCHAR(255) NOT NULL DEFAULT '',
        bio VARCHAR(255) NOT NULL DEFAULT '',
        cover_theme VARCHAR(32) NOT NULL DEFAULT 'sky',
        timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
        locale VARCHAR(32) NOT NULL DEFAULT 'zh-CN',
        vip_status VARCHAR(16) NOT NULL DEFAULT 'free',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_id (user_id),
        CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE habit_projects (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(50) NOT NULL,
        icon VARCHAR(16) NOT NULL,
        slogan VARCHAR(100) NOT NULL DEFAULT '',
        color_theme VARCHAR(32) NOT NULL DEFAULT 'blue',
        status ENUM('active','paused','archived') NOT NULL DEFAULT 'active',
        schedule_type ENUM('daily','weekly-custom') NOT NULL DEFAULT 'daily',
        schedule_days JSON NOT NULL,
        target_type ENUM('forever','days','times') NOT NULL DEFAULT 'forever',
        target_value INT NOT NULL DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        reminder_enabled TINYINT NOT NULL DEFAULT 1,
        reminder_times JSON NOT NULL,
        mood_enabled TINYINT NOT NULL DEFAULT 0,
        score_enabled TINYINT NOT NULL DEFAULT 0,
        metric_enabled TINYINT NOT NULL DEFAULT 0,
        metric_unit VARCHAR(32) NOT NULL DEFAULT '',
        paused_at DATETIME NULL,
        archived_at DATETIME NULL,
        deleted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_user_status (user_id, status),
        KEY idx_user_updated (user_id, updated_at),
        CONSTRAINT fk_project_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE habit_checkins (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        project_id BIGINT UNSIGNED NOT NULL,
        checkin_date DATE NOT NULL,
        status ENUM('done','supplemented','missed') NOT NULL DEFAULT 'done',
        checked_at DATETIME NOT NULL,
        mood_value VARCHAR(32) NOT NULL DEFAULT '',
        score_value TINYINT NOT NULL DEFAULT 0,
        metric_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        metric_unit VARCHAR(32) NOT NULL DEFAULT '',
        note VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_project_date (user_id, project_id, checkin_date),
        KEY idx_project_date (project_id, checkin_date),
        KEY idx_user_date (user_id, checkin_date),
        CONSTRAINT fk_checkin_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_checkin_project FOREIGN KEY (project_id) REFERENCES habit_projects(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expired_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_user_expired (user_id, expired_at),
        UNIQUE KEY uk_token_hash (token_hash),
        CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE ai_call_logs (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NULL,
        scene VARCHAR(50) NOT NULL,
        request_id VARCHAR(64) NOT NULL,
        model_name VARCHAR(50) NOT NULL,
        cache_hit TINYINT NOT NULL DEFAULT 0,
        input_tokens INT NOT NULL DEFAULT 0,
        output_tokens INT NOT NULL DEFAULT 0,
        latency_ms INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        prompt_hash CHAR(64) NOT NULL,
        result_preview TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_scene_created (scene, created_at),
        KEY idx_user_created (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS ai_call_logs;');
    await queryRunner.query('DROP TABLE IF EXISTS refresh_tokens;');
    await queryRunner.query('DROP TABLE IF EXISTS habit_checkins;');
    await queryRunner.query('DROP TABLE IF EXISTS habit_projects;');
    await queryRunner.query('DROP TABLE IF EXISTS user_profiles;');
    await queryRunner.query('DROP TABLE IF EXISTS users;');
  }
}
